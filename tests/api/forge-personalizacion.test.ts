import { describe, expect, it } from 'vitest';
import { simularAlcanceReal } from '../../api/_alcanceSimulado.js';
import { buildStrategicPlan } from '../../api/_strategist.js';
import { extractWinningPatterns, loadLearnings } from '../../api/_feedbackLoop.js';
import * as store from '../../api/_store.js';

const metricas = (reaches: number[]) =>
  reaches.map((reach, i) => ({ topic: `post ${i}`, format: 'reel', reach, ts: '2026-10-01T15:00:00.000Z' }));

describe('simularAlcanceReal', () => {
  it('no inventa números si hay menos de 5 posts con alcance', () => {
    const r = simularAlcanceReal({ metrics: metricas([1000, 2000]) });
    expect(r.available).toBe(false);
    expect(r.basedOnPosts).toBe(2);
    expect(r).not.toHaveProperty('distribution');
  });

  it('ignora posts sin alcance o con alcance inválido', () => {
    const r = simularAlcanceReal({
      metrics: [...metricas([1000, 2000, 3000, 4000, 5000]), { reach: null }, { reach: 0 }],
    });
    expect(r.available).toBe(true);
    expect(r.basedOnPosts).toBe(5);
  });

  it('con datos, percentiles ordenados y baseline = mediana histórica', () => {
    const r = simularAlcanceReal({ metrics: metricas([1000, 2000, 3000, 4000, 5000, 6000]), trials: 500 });
    expect(r.available).toBe(true);
    expect(r.baseline).toBe(4000);
    expect(r.distribution.p10).toBeLessThanOrEqual(r.distribution.p50);
    expect(r.distribution.p50).toBeLessThanOrEqual(r.distribution.p90);
    expect(r.trials).toBe(500);
  });

  it('acota la cantidad de trials entre 100 y 1000', () => {
    expect(simularAlcanceReal({ metrics: metricas([1, 2, 3, 4, 5]), trials: 5 }).trials).toBe(100);
    expect(simularAlcanceReal({ metrics: metricas([1, 2, 3, 4, 5]), trials: 99999 }).trials).toBe(1000);
  });
});

describe('buildStrategicPlan con memoria de cuenta', () => {
  const formatoTop = (plan: ReturnType<typeof buildStrategicPlan>) => plan.allFormatScores[0]?.format;

  it('el formato que ya rindió en la cuenta recibe un empujón de +0.12 en su fit', () => {
    const base = buildStrategicPlan({ topic: 'x', goal: 'engagement', brandNiche: 'moda' });
    const con = buildStrategicPlan({ topic: 'x', goal: 'engagement', brandNiche: 'moda', bestFormat: 'stories' });
    const fit = (p: typeof base) => p.allFormatScores.find((f) => f.format === 'stories')?.fit ?? 0;
    expect(fit(con)).toBeCloseTo(fit(base) + 0.12, 5);
  });

  it('el empujón no deja a un formato por encima de 0.99', () => {
    const plan = buildStrategicPlan({ topic: 'x', goal: 'awareness', brandNiche: 'moda', bestFormat: 'reel' });
    expect(formatoTop(plan)).toBeDefined();
    expect(Math.max(...plan.allFormatScores.map((f) => f.fit))).toBeLessThanOrEqual(0.99);
  });

  it('traduce el vocabulario de métricas (reel/post) al de formatos del plan', () => {
    const plan = buildStrategicPlan({ topic: 'x', goal: 'awareness', brandNiche: 'moda', bestFormat: 'reel' });
    const reels = plan.allFormatScores.find((f) => f.format === 'reels');
    const base = buildStrategicPlan({ topic: 'x', goal: 'awareness', brandNiche: 'moda' }).allFormatScores.find(
      (f) => f.format === 'reels',
    );
    expect(reels?.fit).toBeGreaterThan(base?.fit ?? 0);
  });

  it('un tema ya publicado recientemente fuerza un ángulo nuevo', () => {
    const plan = buildStrategicPlan({
      topic: 'rutina matutina productiva',
      recentTopics: ['Rutina matutina productiva para creators'],
    });
    expect(plan.differentiationAngles[0]).toMatch(/Ángulo nuevo obligatorio/);
  });

  it('sin tema repetido no agrega el ángulo forzado', () => {
    const plan = buildStrategicPlan({ topic: 'rutina matutina', recentTopics: ['otra cosa completamente distinta'] });
    expect(plan.differentiationAngles.some((a) => /Ángulo nuevo obligatorio/.test(a))).toBe(false);
  });

  it('expone la memoria de la cuenta en el plan', () => {
    const plan = buildStrategicPlan({ topic: 'x', memoryText: 'APRENDIZAJES DE PRUEBA' });
    expect(plan.accountMemory).toBe('APRENDIZAJES DE PRUEBA');
  });
});

describe('extractWinningPatterns', () => {
  it('calcula la hora de publicación desde ts (campo que guarda recordMetrics)', () => {
    const ts = '2026-10-01T15:30:00.000Z';
    const p = extractWinningPatterns([{ topic: 'a', format: 'reel', reach: 100, ts }]);
    const hora = String(new Date(ts).getHours()).padStart(2, '0') + ':00';
    expect(p.bestHour).toBe(hora);
  });
});

describe('loadLearnings', () => {
  it('devuelve null si el feedback loop todavía no corrió para la cuenta', async () => {
    expect(await loadLearnings({ scope: 'test-scope', accountId: 'nadie' })).toBeNull();
  });

  it('lee los learnings que escribe updateNicheCache', async () => {
    await store.set('feedia:intel:test-scope:cuenta-x', {
      summary: { learningsSummary: 'Los reels con pregunta rinden', winningFormat: 'reel', doubleDownOn: 'preguntas' },
      learnings: { builtAt: '2026-10-01T00:00:00.000Z', recommendations: ['r1'], redFlags: ['listas genéricas'] },
    });
    const l = await loadLearnings({ scope: 'test-scope', accountId: 'cuenta-x' });
    expect(l).toMatchObject({
      summary: 'Los reels con pregunta rinden',
      winningFormat: 'reel',
      doubleDownOn: 'preguntas',
      redFlags: ['listas genéricas'],
      recommendations: ['r1'],
    });
  });
});
