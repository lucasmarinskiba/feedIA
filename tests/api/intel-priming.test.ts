import { describe, expect, it } from 'vitest';
import { updateNicheCache } from '../../api/_feedbackLoop.js';
import { formatearPrimingIntel, loadIntelligencePriming } from '../../api/_nicheIntelligence.js';
import * as store from '../../api/_store.js';

const nicheCompleto = {
  builtAt: '2026-10-01T10:00:00.000Z',
  niche: { primaryNiche: 'fitness para madres', saturationLevel: 'media', monetizationPotential: 'alta' },
  opportunities: {
    top3Opportunities: [{ opportunity: 'rutinas de 10 minutos' }],
    redFlags: ['dietas extremas', 'promesas de resultados rápidos'],
  },
  summary: {
    mainAngle: 'entrenar sin culpa',
    keyAudienceTrigger: 'falta de tiempo',
    mainContentGap: 'contenido para posparto',
    differentiationPlay: 'humor real',
    winningFormat: 'reel',
    doubleDownOn: 'hooks con pregunta',
    learningsSummary: 'Los reels con pregunta rinden más',
  },
  learnings: { builtAt: '2026-10-02T10:00:00.000Z', redFlags: ['listas genéricas de tips'] },
};

const parciales: unknown[] = [
  { summary: { mainAngle: undefined, keyAudienceTrigger: undefined } },
  { summary: { learningsSummary: 'x' } },
  { summary: { winningFormat: 'carousel' }, learnings: { redFlags: ['a'] } },
  { niche: { primaryNiche: 'x' } },
  { opportunities: { redFlags: [null, 3] } },
  { builtAt: null, summary: null, niche: null, learnings: null },
];

describe('formatearPrimingIntel', () => {
  it('sin datos utilizables devuelve string vacío', () => {
    expect(formatearPrimingIntel(null)).toBe('');
    expect(formatearPrimingIntel({})).toBe('');
    expect(formatearPrimingIntel({ summary: { mainAngle: '   ' } })).toBe('');
  });

  it('registro completo imprime cada línea con su valor', () => {
    const out = formatearPrimingIntel(nicheCompleto);
    expect(out).toContain('analizada el 2026-10-01T10:00:00.000Z');
    expect(out).toContain('Nicho: fitness para madres (saturación media, monetización alta).');
    expect(out).toContain('Posicionamiento: entrenar sin culpa.');
    expect(out).toContain('Oportunidad top: rutinas de 10 minutos.');
    expect(out).toContain('NO HACER: dietas extremas, promesas de resultados rápidos.');
    expect(out).toContain('NO repetir (datos reales): listas genéricas de tips.');
    expect(out).toContain('Formato que más rinde en esta cuenta: reel.');
  });

  it('nunca emite undefined ni null, aunque falten campos', () => {
    for (const parcial of parciales) {
      const out = formatearPrimingIntel(parcial);
      expect(out).not.toMatch(/undefined|null/);
    }
  });

  it('omite las líneas cuyos campos están vacíos', () => {
    const out = formatearPrimingIntel({ summary: { mainAngle: 'x', keyAudienceTrigger: '' } });
    expect(out).toContain('Posicionamiento: x.');
    expect(out).not.toContain('Trigger');
  });
});

describe('feedback loop y pipeline de nicho comparten la clave de intel', () => {
  it('feedback loop sin niche previo no inventa builtAt ni posicionamiento', async () => {
    await updateNicheCache('test-intel-a', 'cuenta-1', {
      summary: 'Patrón central',
      winningFormat: 'reel',
      doubleDownOn: 'preguntas',
      redFlags: ['listas'],
      recommendations: [],
    });
    const raw = (await store.get('feedia:intel:test-intel-a:cuenta-1')) as { builtAt?: string } | null;
    expect(raw?.builtAt).toBeUndefined();

    const priming = await loadIntelligencePriming({ scope: 'test-intel-a', accountId: 'cuenta-1' });
    expect(priming).not.toMatch(/undefined/);
    expect(priming).toContain('Formato que más rinde en esta cuenta: reel.');
    expect(priming).toContain('NO repetir (datos reales): listas.');
    expect(priming).not.toContain('Posicionamiento');
  });

  it('priming sin ningún registro devuelve string vacío', async () => {
    expect(await loadIntelligencePriming({ scope: 'test-intel-b', accountId: 'nadie' })).toBe('');
  });
});
