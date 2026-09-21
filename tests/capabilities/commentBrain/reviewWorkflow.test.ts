import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../src/agent/bus.js', () => ({ emit: vi.fn() }));

import {
  approveReview,
  markHandled,
  rejectReview,
  type ActionDeps,
} from '../../../src/capabilities/commentBrain/reviewActions.js';
import {
  configureDecisionStore,
  evaluateGraduation,
  GRADUATION_THRESHOLDS,
  listDecisions,
  recordDecision,
  summarizeDecisions,
  type DecisionRecord,
} from '../../../src/capabilities/commentBrain/reviewDecisions.js';
import {
  configureReviewStore,
  enqueueReview,
  getRecentReplies,
  listReviewQueue,
  resetBrainMemory,
  type ReviewItem,
} from '../../../src/capabilities/commentBrain/reviewQueue.js';
import { cls, makeBrand } from './helpers.js';

const DRAFT = 'Nos declaramos culpables de tener zapatillas lindas';

const seed = (over: Partial<Omit<ReviewItem, 'id' | 'createdAt'>> = {}): ReviewItem =>
  enqueueReview({
    accountKey: 'brand-test',
    commentId: 'c-1',
    handle: 'vecina_23',
    commentText: 'Uy sí, re difícil comprar zapatillas lindas 😏',
    action: 'draft-for-review',
    mode: 'witty-comeback',
    draft: DRAFT,
    reasons: ['modo sugerencia'],
    classification: cls({ kind: 'banter', sarcasm: { present: true, stance: 'playful' } }),
    wouldHaveReplied: true,
    ...over,
  });

const okSender = (): NonNullable<ActionDeps['send']> => vi.fn(async () => ({ ok: true }));
const deps = (over: ActionDeps = {}): ActionDeps => ({ send: okSender(), getBrand: makeBrand, dryRun: false, ...over });

beforeEach(() => {
  configureReviewStore(null);
  configureDecisionStore(null);
  resetBrainMemory();
});

describe('approveReview', () => {
  it('aprobar tal cual: envía el borrador al comentario correcto, lo saca de la cola y registra la decisión', async () => {
    const item = seed();
    const d = deps();
    const r = await approveReview(item.id, {}, d);

    expect(r).toMatchObject({ ok: true, outcome: 'approved-as-is', sent: true, dryRun: false, finalText: DRAFT });
    expect(d.send).toHaveBeenCalledWith('c-1', DRAFT);
    expect(listReviewQueue()).toHaveLength(0);

    const [dec] = listDecisions();
    expect(dec).toMatchObject({
      outcome: 'approved-as-is',
      itemId: item.id,
      kind: 'banter',
      sarcasm: 'playful',
      mode: 'witty-comeback',
      wouldHaveReplied: true,
      draft: DRAFT,
      finalText: DRAFT,
      sent: true,
    });
  });

  it('el envío alimenta el anti-repetición: la respuesta enviada queda recordada', async () => {
    const item = seed();
    await approveReview(item.id, {}, deps());
    expect(getRecentReplies('brand-test')).toContain(DRAFT);
  });

  it('editar antes de enviar: se manda el texto editado y queda el par borrador → final (material para mejorar los prompts)', async () => {
    const item = seed();
    const d = deps();
    const edited = 'Culpables, sí, y sin arrepentimiento alguno';
    const r = await approveReview(item.id, { text: `  ${edited}  ` }, d);

    expect(r).toMatchObject({ ok: true, outcome: 'approved-edited', finalText: edited });
    expect(d.send).toHaveBeenCalledWith('c-1', edited);
    expect(listDecisions()[0]).toMatchObject({ outcome: 'approved-edited', draft: DRAFT, finalText: edited });
  });

  it('un "editado" idéntico al borrador (solo espacios) cuenta como aprobado tal cual', async () => {
    const item = seed();
    const r = await approveReview(item.id, { text: ` ${DRAFT} ` }, deps());
    expect(r).toMatchObject({ ok: true, outcome: 'approved-as-is' });
  });

  it('con DRY_RUN activo NO se envía de verdad y la respuesta lo dice (sent=false, dryRun=true)', async () => {
    const item = seed();
    const r = await approveReview(item.id, {}, deps({ dryRun: true }));
    expect(r).toMatchObject({ ok: true, sent: false, dryRun: true });
    expect(listDecisions()[0]?.sent).toBe(false);
    expect(listReviewQueue()).toHaveLength(0); // igual se resuelve: la decisión humana ya está tomada
  });

  describe('validación del texto final', () => {
    it('un texto editado con link se BLOQUEA: no se envía, el item sigue en la cola y no se registra nada', async () => {
      const item = seed();
      const d = deps();
      const r = await approveReview(item.id, { text: 'Mirá www.zapatosnorte.com para ver todo' }, d);

      expect(r.ok).toBe(false);
      if (!r.ok) {
        expect(r.code).toBe('validation');
        expect(r.issues?.some((i) => i.code === 'contacto-o-link')).toBe(true);
      }
      expect(d.send).not.toHaveBeenCalled();
      expect(listReviewQueue()).toHaveLength(1);
      expect(listDecisions()).toHaveLength(0);
    });

    it('un borrador que ya traía un problema (palabra prohibida) también se bloquea al aprobarlo tal cual', async () => {
      const item = seed({ draft: 'Es barato para lo que ofrece' });
      const r = await approveReview(item.id, {}, deps());
      expect(r).toMatchObject({ ok: false, code: 'validation' });
    });

    it('con force la persona decide: se envía y queda anotado que fue forzado y por qué', async () => {
      const item = seed();
      const d = deps();
      const r = await approveReview(item.id, { text: 'Mirá www.zapatosnorte.com', force: true }, d);

      expect(r.ok).toBe(true);
      expect(d.send).toHaveBeenCalledTimes(1);
      expect(listDecisions()[0]?.reason).toMatch(/forzado pese a: .*contacto-o-link/);
    });

    it('un precio escrito por la persona se bloquea salvo force (nadie verificó el dato)', async () => {
      const item = seed();
      const r = await approveReview(item.id, { text: 'Están $45.000 hoy' }, deps());
      expect(r).toMatchObject({ ok: false, code: 'validation' });
    });

    it('una respuesta calcada a una reciente se bloquea (patrón de bot)', async () => {
      const a = seed({ commentId: 'c-a' });
      await approveReview(a.id, {}, deps());
      const b = seed({ commentId: 'c-b', draft: DRAFT });
      const r = await approveReview(b.id, {}, deps());
      expect(r).toMatchObject({ ok: false, code: 'validation' });
      if (!r.ok) expect(r.issues?.some((i) => i.code === 'repetida')).toBe(true);
    });
  });

  describe('fallos', () => {
    it('si el envío falla, el item SIGUE en la cola, no se registra decisión ni se recuerda la respuesta, y se puede reintentar', async () => {
      const item = seed();
      const failing = vi.fn(async () => ({ ok: false, error: 'rate limit' }));
      const r = await approveReview(item.id, {}, deps({ send: failing }));

      expect(r).toEqual({ ok: false, code: 'send-failed', error: 'rate limit' });
      expect(listReviewQueue()).toHaveLength(1);
      expect(listDecisions()).toHaveLength(0);
      expect(getRecentReplies('brand-test')).toEqual([]);

      const retry = await approveReview(item.id, {}, deps());
      expect(retry.ok).toBe(true); // el cerrojo se liberó
    });

    it('doble clic: el segundo intento se rechaza como "busy" y solo se envía UNA vez', async () => {
      const item = seed();
      let release: () => void = () => undefined;
      const slow = vi.fn(
        () =>
          new Promise<{ ok: boolean }>((resolve) => {
            release = (): void => resolve({ ok: true });
          }),
      );
      const first = approveReview(item.id, {}, deps({ send: slow }));
      await Promise.resolve();
      const second = await approveReview(item.id, {}, deps({ send: slow }));

      expect(second).toMatchObject({ ok: false, code: 'busy' });
      release();
      expect((await first).ok).toBe(true);
      expect(slow).toHaveBeenCalledTimes(1);
      expect(listDecisions()).toHaveLength(1);
    });

    it('aprobar dos veces seguidas: la segunda es "not-found" (ya no está en la cola)', async () => {
      const item = seed();
      await approveReview(item.id, {}, deps());
      expect(await approveReview(item.id, {}, deps())).toEqual({ ok: false, code: 'not-found' });
    });

    it('id inexistente, escalamiento, sin id de comentario y texto vacío', async () => {
      expect(await approveReview('nope', {}, deps())).toMatchObject({ ok: false, code: 'not-found' });

      const esc = seed({ action: 'escalate', draft: undefined });
      expect(await approveReview(esc.id, {}, deps())).toMatchObject({ ok: false, code: 'not-reviewable' });

      const noId = seed({ commentId: undefined });
      expect(await approveReview(noId.id, {}, deps())).toMatchObject({ ok: false, code: 'no-comment-id' });

      const ok = seed({ commentId: 'c-9' });
      expect(await approveReview(ok.id, { text: '   ' }, deps())).toMatchObject({ ok: false, code: 'empty-text' });
      const noDraft = seed({ commentId: 'c-10', draft: undefined });
      expect(await approveReview(noDraft.id, {}, deps())).toMatchObject({ ok: false, code: 'empty-text' });
    });

    it('sin perfil de marca no se puede validar → no se envía (falla cerrado)', async () => {
      const item = seed();
      const d = deps({
        getBrand: () => {
          throw new Error('no hay brand.json');
        },
      });
      expect(await approveReview(item.id, {}, d)).toMatchObject({ ok: false, code: 'brand-unavailable' });
      expect(d.send).not.toHaveBeenCalled();
    });

    it('una excepción inesperada del sender libera el cerrojo (no deja el item trabado)', async () => {
      const item = seed();
      const boom = vi.fn(async () => {
        throw new Error('red caída');
      });
      await expect(approveReview(item.id, {}, deps({ send: boom }))).rejects.toThrow('red caída');
      expect((await approveReview(item.id, {}, deps())).ok).toBe(true);
    });
  });
});

describe('rejectReview y markHandled', () => {
  it('rechazar: registra el motivo, saca el item y NO envía nada', async () => {
    const item = seed();
    const r = rejectReview(item.id, 'el chiste cae mal');
    expect(r).toMatchObject({ ok: true, outcome: 'rejected', sent: false });
    expect(listReviewQueue()).toHaveLength(0);
    expect(listDecisions()[0]).toMatchObject({ outcome: 'rejected', reason: 'el chiste cae mal', draft: DRAFT });
  });

  it('solo se rechazan borradores; un escalamiento se marca como resuelto', () => {
    const esc = seed({ action: 'escalate', draft: undefined, wouldHaveReplied: false });
    expect(rejectReview(esc.id)).toMatchObject({ ok: false, code: 'not-reviewable' });
    expect(markHandled(esc.id)).toMatchObject({ ok: true, outcome: 'handled-elsewhere' });
    expect(listReviewQueue()).toHaveLength(0);
  });

  it('"ya lo resolví yo" no cuenta para la métrica de aprobación', () => {
    const item = seed();
    markHandled(item.id);
    const s = summarizeDecisions();
    expect(s.handledElsewhere).toBe(1);
    expect(s.shadow.sample).toBe(0);
  });

  it('ids inexistentes → not-found', () => {
    expect(rejectReview('nope')).toMatchObject({ ok: false, code: 'not-found' });
    expect(markHandled('nope')).toMatchObject({ ok: false, code: 'not-found' });
  });
});

describe('métrica de graduación (suggest → balanced)', () => {
  const dec = (over: Partial<Omit<DecisionRecord, 'id' | 'decidedAt'>> = {}): void => {
    recordDecision({
      itemId: 'i',
      accountKey: 'b',
      handle: 'h',
      commentText: 'c',
      kind: 'banter',
      sarcasm: null,
      mode: 'thank',
      wouldHaveReplied: true,
      outcome: 'approved-as-is',
      ...over,
    });
  };
  const many = (n: number, over: Parameters<typeof dec>[0] = {}): void => {
    for (let i = 0; i < n; i += 1) dec(over);
  };

  it('sin datos: no está listo y dice cuántas revisiones faltan', () => {
    const g = evaluateGraduation();
    expect(g).toMatchObject({ ready: false, sample: 0, needed: GRADUATION_THRESHOLDS.minSample, asIsRate: null });
    expect(g.blockers).toEqual([`faltan revisiones: 0/${GRADUATION_THRESHOLDS.minSample}`]);
  });

  it('con muestra chica NO opina sobre las tasas (1 de 2 sería ruido): solo pide volumen', () => {
    dec();
    dec({ outcome: 'rejected' });
    expect(evaluateGraduation().blockers).toHaveLength(1);
    expect(evaluateGraduation().blockers[0]).toMatch(/faltan revisiones/);
  });

  it('50 aprobados tal cual → listo', () => {
    many(50);
    expect(evaluateGraduation()).toMatchObject({ ready: true, blockers: [], needed: 0, asIsRate: 1, rejectedRate: 0 });
  });

  it('en el borde: 90% sin cambios y 2% rechazado todavía califica', () => {
    many(45); // 45 as-is
    many(4, { outcome: 'approved-edited' });
    many(1, { outcome: 'rejected' }); // 1/50 = 2%
    expect(evaluateGraduation()).toMatchObject({ ready: true, sample: 50 });
  });

  it('89% sin cambios NO califica y el motivo lo explica', () => {
    many(44);
    many(6, { outcome: 'approved-edited' }); // 44/50 = 88%
    const g = evaluateGraduation();
    expect(g.ready).toBe(false);
    expect(g.blockers.join(' ')).toMatch(/88% aprobado sin cambios \(mínimo 90%\)/);
  });

  it('demasiados rechazos bloquean aunque el resto esté perfecto (un rechazo = un error que se habría publicado solo)', () => {
    many(47);
    many(3, { outcome: 'rejected' }); // 6%
    const g = evaluateGraduation();
    expect(g.ready).toBe(false);
    expect(g.blockers.join(' ')).toMatch(/6% rechazado \(máximo 2%\)/);
  });

  it('solo cuenta lo que `balanced` habría enviado SIN supervisión (wouldHaveReplied)', () => {
    many(60, { wouldHaveReplied: false }); // borradores que igual iban a revisión: no dicen nada sobre la autonomía
    const s = summarizeDecisions();
    expect(s.approvedAsIs).toBe(60);
    expect(s.shadow.sample).toBe(0);
    expect(evaluateGraduation().ready).toBe(false);
  });

  it('desglosa por modo de respuesta para ver dónde falla el brain', () => {
    many(3, { mode: 'thank' });
    many(2, { mode: 'witty-comeback' });
    many(1, { mode: 'witty-comeback', outcome: 'rejected' });
    const s = summarizeDecisions();
    expect(s.byMode['thank']).toEqual({ sample: 3, approvedAsIs: 3 });
    expect(s.byMode['witty-comeback']).toEqual({ sample: 3, approvedAsIs: 2 });
  });
});

describe('persistencia de decisiones', () => {
  let dir: string;
  let file: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'decisions-'));
    file = join(dir, 'decisions.jsonl');
    configureDecisionStore(file);
  });
  afterEach(() => {
    configureDecisionStore(null);
    rmSync(dir, { recursive: true, force: true });
  });

  const rec = (handle: string): DecisionRecord =>
    recordDecision({
      itemId: 'i',
      accountKey: 'b',
      handle,
      commentText: 'c',
      kind: 'praise',
      sarcasm: null,
      outcome: 'approved-as-is',
    });

  it('sobrevive a un reinicio: la evidencia de graduación no se pierde', () => {
    rec('a');
    rec('b');
    configureDecisionStore(file); // reinicio
    expect(listDecisions().map((d) => d.handle)).toEqual(['b', 'a']);
  });

  it('tolera líneas corruptas sin perder el resto', () => {
    rec('a');
    writeFileSync(file, `${readFileSync(file, 'utf-8')}{"id":"trunc\n`, 'utf-8');
    configureDecisionStore(file);
    expect(listDecisions().map((d) => d.handle)).toEqual(['a']);
  });

  it('si el disco falla no lanza: la decisión queda en memoria', () => {
    const blocker = join(dir, 'archivo.txt');
    writeFileSync(blocker, 'x', 'utf-8');
    configureDecisionStore(join(blocker, 'hijo', 'decisions.jsonl'));
    expect(() => rec('a')).not.toThrow();
    expect(listDecisions()).toHaveLength(1);
  });

  it('lista las más nuevas primero y respeta el límite', () => {
    for (const h of ['a', 'b', 'c']) rec(h);
    expect(listDecisions(2).map((d) => d.handle)).toEqual(['c', 'b']);
  });
});
