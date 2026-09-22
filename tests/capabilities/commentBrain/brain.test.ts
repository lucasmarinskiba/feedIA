import { beforeEach, describe, expect, it, vi } from 'vitest';

// El bus escribe a disco en cada emit: en tests lo reemplazamos.
vi.mock('../../../src/agent/bus.js', () => ({ emit: vi.fn() }));

import { emit } from '../../../src/agent/bus.js';
import { handleComment, parseAutonomy, type BrainDeps } from '../../../src/capabilities/commentBrain/index.js';
import {
  configureReviewStore,
  listReviewQueue,
  resetBrainMemory,
} from '../../../src/capabilities/commentBrain/reviewQueue.js';
import type { CommentLlm } from '../../../src/capabilities/commentBrain/llm.js';
import { GOLDEN_SET, type GoldenCase } from './goldenSet.js';
import { BALANCED, cleanVerdict, inputFor, scriptedLlm, scriptedReply, type ScriptOverrides } from './helpers.js';

const byId = (id: string): GoldenCase => {
  const found = GOLDEN_SET.find((c) => c.id === id);
  if (!found) throw new Error(`caso ${id} no existe en el set dorado`);
  return found;
};

const deps = (over: ScriptOverrides = {}, extra: Partial<BrainDeps> = {}): BrainDeps => ({
  llm: scriptedLlm(GOLDEN_SET, over),
  config: BALANCED,
  promiseVerdict: cleanVerdict,
  costGuards: null, // los topes de gasto tienen sus propios tests (costGuards.test.ts)
  ...extra,
});

beforeEach(() => {
  configureReviewStore(null); // los tests no escriben en data/
  resetBrainMemory();
  vi.mocked(emit).mockClear();
});

describe('set dorado — política + validadores + flujo, extremo a extremo', () => {
  it.each(GOLDEN_SET.map((c) => [c.id, c] as const))('%s', async (_id, c) => {
    const r = await handleComment(inputFor(c), deps());

    expect(r.action, `${c.id}: ${r.reasons.join(' | ')}`).toBe(c.expect.action);
    if (c.expect.mode) expect(r.plan.mode).toBe(c.expect.mode);

    const queue = listReviewQueue();
    if (c.expect.action === 'reply') {
      expect(r.reply).toBeTruthy();
      expect(queue).toHaveLength(0);
    }
    if (c.expect.action === 'ignore') {
      expect(r.reply).toBeUndefined();
      expect(queue).toHaveLength(0);
    }
    if (c.expect.action === 'escalate') {
      expect(r.reply).toBeUndefined();
      expect(queue).toHaveLength(1);
      expect(queue[0]?.action).toBe('escalate');
      expect(queue[0]?.draft).toBeUndefined(); // no se redacta nada para legal/salud/odio
    }
    if (c.expect.action === 'draft-for-review') {
      expect(queue).toHaveLength(1);
      expect(queue[0]?.action).toBe('draft-for-review');
    }
  });

  it('cubre todos los tipos y las tres posturas de sarcasmo (el set no se degrada sin que se note)', () => {
    const kinds = new Set(GOLDEN_SET.map((c) => c.label.kind));
    for (const k of [
      'praise',
      'banter',
      'question',
      'purchase-intent',
      'complaint',
      'criticism',
      'troll',
      'hate',
      'spam',
      'tag-friend',
      'emoji-only',
      'other',
    ] as const) {
      expect(kinds.has(k), `falta un caso de tipo ${k}`).toBe(true);
    }
    const stances = new Set(GOLDEN_SET.map((c) => c.label.sarcasm));
    for (const s of ['playful', 'critical', 'hostile'] as const)
      expect(stances.has(s), `falta sarcasmo ${s}`).toBe(true);
    expect(GOLDEN_SET.length).toBeGreaterThanOrEqual(30);
  });
});

describe('borrador para revisión humana', () => {
  it('guarda el borrador, el motivo y emite el evento al bus', async () => {
    const c = byId('sarc-critical-servicio');
    const r = await handleComment(inputFor(c), deps());

    expect(r.action).toBe('draft-for-review');
    expect(r.reply).toBe(scriptedReply(c, 0));
    const [item] = listReviewQueue();
    expect(item?.draft).toBe(scriptedReply(c, 0));
    expect(item?.reasons.join(' ')).toMatch(/riesgo medio|sarcasmo/);
    expect(emit).toHaveBeenCalledWith(expect.objectContaining({ type: 'CommentReviewRequired' }));
  });

  it('una pregunta sin dato verificado NO se contesta sola (no inventa)', async () => {
    const r = await handleComment(inputFor(byId('q-sin-dato')), deps());
    expect(r.action).toBe('draft-for-review');
    expect(r.reasons.join(' ')).toMatch(/sin respaldo suficiente/);
  });
});

describe('modos de falla', () => {
  it('si el LLM devuelve basura, cae a reglas y nunca responde solo', async () => {
    const broken: CommentLlm = { json: async () => 'no soy json', write: async () => 'tampoco' };
    const r = await handleComment(inputFor(byId('praise-trabajo')), { ...deps(), llm: broken });
    expect(r.classification.source).toBe('heuristic');
    expect(r.action).toBe('draft-for-review');
  });

  it('si el LLM lanza excepción, tampoco responde solo', async () => {
    const down: CommentLlm = {
      json: async () => {
        throw new Error('503');
      },
      write: async () => '',
    };
    const r = await handleComment(inputFor(byId('praise-trabajo')), { ...deps(), llm: down });
    expect(r.action).not.toBe('reply');
  });

  it('con el LLM caído, las reglas duras igual escalan', async () => {
    const down: CommentLlm = {
      json: async () => {
        throw new Error('503');
      },
      write: async () => '',
    };
    const r = await handleComment(inputFor(byId('hard-abogado')), { ...deps(), llm: down });
    expect(r.action).toBe('escalate');
  });

  it('las reglas duras mandan aunque el LLM diga "elogio de riesgo bajo"', async () => {
    const liar: CommentLlm = {
      json: async () =>
        JSON.stringify({
          kind: 'praise',
          sarcasm: { present: false, stance: null },
          risk: 'low',
          confidence: 0.99,
          hostility: 0,
          language: 'es',
        }),
      write: async () => '{}',
    };
    const c = byId('hard-abogado');
    const r = await handleComment(inputFor(c), { ...deps(), llm: liar });
    expect(r.action).toBe('escalate');
  });

  it('si el redactor falla, deja constancia y pasa a revisión (sin borrador)', async () => {
    const base = scriptedLlm(GOLDEN_SET);
    const flaky: CommentLlm = {
      json: base.json,
      write: async () => {
        throw new Error('timeout');
      },
    };
    const r = await handleComment(inputFor(byId('praise-trabajo')), { ...deps(), llm: flaky });
    expect(r.action).toBe('draft-for-review');
    expect(r.reply).toBeUndefined();
    expect(r.reasons.join(' ')).toMatch(/redacción falló/);
  });

  it('si el redactor devuelve JSON inválido, pasa a revisión', async () => {
    const base = scriptedLlm(GOLDEN_SET);
    const r = await handleComment(inputFor(byId('praise-trabajo')), {
      ...deps(),
      llm: { json: base.json, write: async () => 'esto no es un objeto json' },
    });
    expect(r.action).toBe('draft-for-review');
  });
});

describe('validación de la respuesta redactada', () => {
  it('descarta la candidata elegida si no pasa y usa otra que sí', async () => {
    const c = byId('praise-trabajo');
    const good = 'Ese elogio se lo llevan a la cocina del equipo, gracias por pasar';
    const r = await handleComment(
      inputFor(c),
      deps({ candidates: () => ['Mirá www.zapatosnorte.com para más', good, 'Otra opción cualquiera más'], pick: 0 }),
    );
    expect(r.action).toBe('reply');
    expect(r.reply).toBe(good);
  });

  it('si ninguna candidata pasa, va a revisión y explica por qué', async () => {
    const c = byId('praise-trabajo');
    const r = await handleComment(
      inputFor(c),
      deps({
        candidates: () => [
          'Visitá www.zapatosnorte.com',
          'Escribinos a hola@zapatosnorte.com',
          'Es barato y gratis #oferta',
        ],
      }),
    );
    expect(r.action).toBe('draft-for-review');
    expect(r.reasons.join(' ')).toMatch(/validación:.*contacto-o-link/);
  });

  it('no repite una respuesta idéntica dos veces seguidas (patrón de bot)', async () => {
    const c = byId('praise-trabajo');
    const fixed: ScriptOverrides = { candidates: () => ['Gracias por el cariño, se lo pasamos al equipo entero'] };
    const first = await handleComment(inputFor(c), deps(fixed));
    const second = await handleComment(inputFor(c), deps(fixed));
    expect(first.action).toBe('reply');
    expect(second.action).toBe('draft-for-review');
    expect(second.reasons.join(' ')).toMatch(/repetida/);
  });
});

describe('humor', () => {
  it('humor que el propio modelo considera flojo no sale solo', async () => {
    const r = await handleComment(inputFor(byId('sarc-playful-zapatillas')), deps({ humorConfidence: 0.3 }));
    expect(r.action).toBe('draft-for-review');
    expect(r.reasons.join(' ')).toMatch(/humor flojo/);
  });

  it('humor bueno y clasificación segura sí sale solo', async () => {
    const r = await handleComment(inputFor(byId('sarc-playful-zapatillas')), deps({ humorConfidence: 0.85 }));
    expect(r.action).toBe('reply');
  });
});

describe('modos de autonomía', () => {
  it('suggest: nada sale solo, todo lo respondible queda como borrador', async () => {
    const shadow = deps({}, { config: { autonomy: 'suggest', minConfidence: 0.7 } });
    const results = await Promise.all(
      ['praise-trabajo', 'q-envio-cordoba', 'sarc-playful-zapatillas'].map((id) => {
        resetBrainMemory();
        return handleComment(inputFor(byId(id)), shadow);
      }),
    );
    for (const r of results) expect(r.action).toBe('draft-for-review');
  });

  it('suggest sigue ignorando spam y escalando lo grave', async () => {
    const shadow = deps({}, { config: { autonomy: 'suggest', minConfidence: 0.7 } });
    expect((await handleComment(inputFor(byId('spam-link')), shadow)).action).toBe('ignore');
    expect((await handleComment(inputFor(byId('hard-salud')), shadow)).action).toBe('escalate');
  });
});

describe('prompt injection', () => {
  it('no se le responde al comentario que intenta dar órdenes al bot', async () => {
    const r = await handleComment(inputFor(byId('injection')), deps());
    expect(r.action).toBe('ignore');
    expect(r.reasons.join(' ')).toMatch(/injection/);
  });

  it('el texto del comentario viaja delimitado y marcado como dato no confiable', async () => {
    const seen: string[] = [];
    const spy: CommentLlm = {
      json: async ({ system, prompt }) => {
        seen.push(system, prompt);
        return scriptedLlm(GOLDEN_SET).json({ system, prompt });
      },
      write: async ({ system, prompt }) => {
        seen.push(system, prompt);
        return scriptedLlm(GOLDEN_SET).write({ system, prompt });
      },
    };
    await handleComment(inputFor(byId('praise-trabajo')), { ...deps(), llm: spy });
    const all = seen.join('\n');
    expect(all).toMatch(/dato no confiable/i);
    expect(all).toContain('<<<');
    expect(all).toContain('>>>');
  });
});

describe('modo sombra (suggest): el arranque por defecto', () => {
  const SUGGEST: BrainDeps['config'] = { autonomy: 'suggest', minConfidence: 0.7 };
  const shadow = (): BrainDeps => deps({}, { config: SUGGEST });

  it('nada se envía solo, pero registra si en balanced SÍ se habría respondido', async () => {
    const r = await handleComment(inputFor(byId('praise-trabajo')), shadow());
    expect(r.action).toBe('draft-for-review');
    expect(r.reply).toBeTruthy(); // el borrador existe para que una persona lo compare
    expect(r.shadow).toEqual({ wouldHaveReplied: true });
    expect(r.reasons.join(' ')).toMatch(/modo sugerencia/);

    const [item] = listReviewQueue();
    expect(item).toMatchObject({ action: 'draft-for-review', wouldHaveReplied: true, mode: 'thank' });
  });

  it('un caso que igual habría ido a revisión queda marcado wouldHaveReplied=false', async () => {
    const r = await handleComment(inputFor(byId('compl-15-dias')), shadow());
    expect(r.action).toBe('draft-for-review');
    expect(r.shadow).toEqual({ wouldHaveReplied: false });
  });

  it('humor flojo o pregunta sin respaldo tampoco cuentan como "se habría respondido"', async () => {
    const weak = await handleComment(
      inputFor(byId('sarc-playful-zapatillas')),
      deps({ humorConfidence: 0.3 }, { config: SUGGEST }),
    );
    expect(weak.shadow?.wouldHaveReplied).toBe(false);
    const ungrounded = await handleComment(inputFor(byId('q-sin-dato')), shadow());
    expect(ungrounded.shadow?.wouldHaveReplied).toBe(false);
  });

  it('audita los ignorados que NO son ruido (donde aparecen los falsos negativos)', async () => {
    const r = await handleComment(inputFor(byId('primero')), shadow());
    expect(r.action).toBe('ignore');
    expect(listReviewQueue()).toHaveLength(1);
    expect(listReviewQueue()[0]).toMatchObject({ action: 'ignore', wouldHaveReplied: false });
  });

  it('el ruido obvio (spam, emojis) NO se encola ni en modo sombra', async () => {
    await handleComment(inputFor(byId('spam-link')), shadow());
    await handleComment(inputFor(byId('emoji-only')), shadow());
    expect(listReviewQueue()).toHaveLength(0);
  });

  it('fuera del modo sombra los ignorados no se encolan y no hay campo shadow', async () => {
    const r = await handleComment(inputFor(byId('primero')), deps());
    expect(r.shadow).toBeUndefined();
    expect(listReviewQueue()).toHaveLength(0);
  });

  it('lo grave se escala igual que siempre', async () => {
    const r = await handleComment(inputFor(byId('hard-salud')), shadow());
    expect(r.action).toBe('escalate');
    expect(listReviewQueue()[0]).toMatchObject({ action: 'escalate', wouldHaveReplied: false });
  });
});

describe('parseAutonomy — fail-safe', () => {
  it.each([
    ['balanced', 'balanced'],
    ['full', 'full'],
    ['suggest', 'suggest'],
    ['', 'suggest'],
    ['balancd', 'suggest'], // typo: nunca sube la autonomía
    ['FULL ', 'suggest'], // el config ya normaliza a minúsculas; lo que llegue distinto se rechaza
    ['true', 'suggest'],
    ['off', 'suggest'],
  ])('"%s" → %s', (raw, expected) => {
    expect(parseAutonomy(raw)).toBe(expected);
  });
});
