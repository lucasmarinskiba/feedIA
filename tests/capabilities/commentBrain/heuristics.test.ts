import { describe, expect, it } from 'vitest';
import {
  detectHardFlags,
  heuristicClassify,
  isSensitiveTopic,
  prefilter,
} from '../../../src/capabilities/commentBrain/heuristics.js';
import { GOLDEN_SET } from './goldenSet.js';

describe('detectHardFlags', () => {
  it.each([
    ['Voy a hablar con mi abogado', 'legal'],
    ['Esto es una estafa', 'legal'],
    ['Siempre estafando gente', 'legal'],
    ['Ya no quiero vivir más', 'autolesion'],
    ['Me quemó la mano', 'salud-seguridad'], // termina en vocal acentuada: falla con \b clásico
    ['Me intoxiqué con esto', 'salud-seguridad'],
    ['Sé dónde vivís', 'amenaza'],
    ['Te voy a buscar', 'amenaza'],
  ])('"%s" → %s', (text, flag) => {
    expect(detectHardFlags(text)).toContain(flag);
  });

  it('no dispara con texto cotidiano', () => {
    expect(detectHardFlags('Hacen envíos a Córdoba? Quiero comprar dos pares')).toEqual([]);
    expect(detectHardFlags('Qué lindo el diseño nuevo')).toEqual([]);
  });
});

describe('isSensitiveTopic', () => {
  it('detecta duelo, tragedia y política, con o sin acento final', () => {
    expect(isSensitiveTopic('Se murió mi abuela')).toBe(true);
    expect(isSensitiveTopic(undefined, 'Fue una tragedia para el equipo')).toBe(true);
    expect(isSensitiveTopic('Voten en las elecciones')).toBe(true);
  });

  it('no dispara con humor cotidiano', () => {
    expect(isSensitiveTopic('Jajaja el gato del fondo se robó el show')).toBe(false);
    expect(isSensitiveTopic(undefined, undefined)).toBe(false);
  });
});

describe('prefilter', () => {
  it('descarta vacíos y solo-emojis sin LLM', () => {
    expect(prefilter('   ')?.kind).toBe('emoji-only');
    expect(prefilter('🔥🔥🔥')?.kind).toBe('emoji-only');
    expect(prefilter('❤️ 👏')?.kind).toBe('emoji-only');
  });

  it('descarta spam claro', () => {
    expect(prefilter('Gana dinero desde casa bit.ly/abc')?.kind).toBe('spam');
    expect(prefilter('sígueme y te sigo f4f')?.kind).toBe('spam');
  });

  it('NO descarta texto real, ni con emojis', () => {
    expect(prefilter('Me encantó 😍')).toBeNull();
    expect(prefilter('¿Tienen link de compra?')).toBeNull();
  });
});

describe('heuristicClassify (red de seguridad sin LLM)', () => {
  it.each([
    ['¿Hacen envíos a Córdoba?', 'purchase-intent'],
    ['Nunca me llegó el pedido', 'complaint'], // "llegó" con acento final
    ['¿Por qué no lo hacen en verde?', 'question'], // "qué" con acento final
    ['Genial el trabajo', 'praise'],
    ['@lucia_gomez 😂', 'tag-friend'],
    ['Primero!', 'other'],
  ])('"%s" → %s', (text, kind) => {
    expect(heuristicClassify(text).kind).toBe(kind);
  });

  it('nunca supera la confianza que permite responder sin revisión', () => {
    for (const c of GOLDEN_SET) {
      const r = heuristicClassify(c.text);
      if (r.source === 'heuristic' && r.kind !== 'spam' && r.kind !== 'emoji-only') {
        expect(r.confidence).toBeLessThanOrEqual(0.4);
      }
      expect(r.sarcasm.present).toBe(false); // no finge detectar sarcasmo
    }
  });
});

describe('set dorado ↔ reglas duras', () => {
  it('las reglas duras se activan en exactamente los casos "hard-*" (sin falsos positivos)', () => {
    for (const c of GOLDEN_SET) {
      const flagged = detectHardFlags(c.text).length > 0;
      expect(flagged, `${c.id}: "${c.text}"`).toBe(c.id.startsWith('hard-'));
    }
  });

  it('el prefiltro atrapa exactamente los casos de ruido trivial', () => {
    const trivial = new Set(['spam-link', 'emoji-only', 'vacio']);
    for (const c of GOLDEN_SET) {
      expect(prefilter(c.text) !== null, `${c.id}`).toBe(trivial.has(c.id));
    }
  });
});
