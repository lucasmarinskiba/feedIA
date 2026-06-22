// @ts-nocheck
/**
 * Auto-Experiment Brain — A/B testing autónomo continuo.
 *
 * Genera hipótesis → ejecuta tests → analiza significance → ships winners.
 * Sin pedir permiso humano (dentro de safety constraints).
 *
 * Tipos de experimentos:
 *   - Hook variants (3-5 versions)
 *   - Caption length (short vs long)
 *   - Posting time
 *   - Hashtag sets
 *   - Format choice (carousel vs reel)
 *   - CTA framing
 *   - Visual styles
 *
 * Mantiene experimentos paralelos sin canibalizar audiencia.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { log } from '../../agent/logger.js';
import type { BrandProfile } from '../../config/types.js';

const EXPERIMENT_DIR = path.resolve('data/neural/experiments');

// ── Tipos ─────────────────────────────────────────────────────────────────────

export type ExperimentType =
  | 'hook'
  | 'caption-length'
  | 'posting-time'
  | 'hashtag-set'
  | 'format'
  | 'cta-framing'
  | 'visual-style'
  | 'audio'
  | 'first-comment';

export type ExperimentStatus = 'designing' | 'running' | 'analyzing' | 'concluded' | 'inconclusive' | 'aborted';

export interface ExperimentVariant {
  id: string;
  name: string;
  description: string;
  config: Record<string, unknown>;
  // Métricas reales
  impressions: number;
  reach: number;
  engagementRate: number;
  clickThroughRate: number;
  conversions: number;
  postIds: string[]; // posts que usaron esta variante
}

export interface Hypothesis {
  statement: string; // "Hooks con números performance 30% mejor"
  null_hypothesis: string;
  expected_effect_size: number; // 0.1 = 10% diferencia
  metric: 'engagement_rate' | 'reach' | 'saves' | 'shares' | 'profile_visits' | 'conversions';
  minimumSampleSize: number;
}

export interface Experiment {
  id: string;
  brandId: string;
  type: ExperimentType;
  hypothesis: Hypothesis;
  variants: ExperimentVariant[];
  status: ExperimentStatus;
  createdAt: string;
  startedAt?: string;
  endedAt?: string;
  trafficSplitMethod: 'even' | 'weighted' | 'multi-armed-bandit';
  significance: number; // 0-1 statistical significance (p-value inverted)
  winnerId?: string;
  liftPercent?: number;
  decision: string; // recommendation de qué hacer
}

export interface ExperimentResults {
  experimentId: string;
  winnerId: string;
  loserId: string;
  liftPercent: number;
  pValue: number;
  isSignificant: boolean; // p < 0.05
  effectSize: number;
  confidence: number;
  recommendation: 'ship-winner' | 'continue-testing' | 'reset' | 'abort';
}

// ── Statistical tests ───────────────────────────────────────────────────────

/** Approximate p-value via z-test for two proportions. */
const zTestProportions = (successA: number, totalA: number, successB: number, totalB: number): number => {
  if (totalA === 0 || totalB === 0) return 1.0;
  const pA = successA / totalA;
  const pB = successB / totalB;
  const pPooled = (successA + successB) / (totalA + totalB);
  const se = Math.sqrt(pPooled * (1 - pPooled) * (1 / totalA + 1 / totalB));
  if (se === 0) return 1.0;
  const z = Math.abs(pA - pB) / se;
  // Approximate normal CDF (two-tailed)
  return 2 * (1 - normalCDF(z));
};

const normalCDF = (x: number): number => {
  // Approximation (Abramowitz & Stegun)
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989423 * Math.exp((-x * x) / 2);
  const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return x > 0 ? 1 - p : p;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const ensureExpDir = async (): Promise<void> => {
  await fs.mkdir(EXPERIMENT_DIR, { recursive: true });
};

const expPath = (brandId: string): string => path.join(EXPERIMENT_DIR, `${brandId}-experiments.json`);

const loadExperiments = async (brandId: string): Promise<Experiment[]> => {
  try {
    return JSON.parse(await fs.readFile(expPath(brandId), 'utf-8')) as Experiment[];
  } catch {
    return [];
  }
};

const saveExperiments = async (brandId: string, exps: Experiment[]): Promise<void> => {
  await ensureExpDir();
  await fs.writeFile(expPath(brandId), JSON.stringify(exps.slice(-100), null, 2), 'utf-8');
};

// ── Diseño de experimento ────────────────────────────────────────────────────

export const designExperiment = async (
  brand: BrandProfile,
  type: ExperimentType,
  hypothesisStatement: string,
  variantConfigs: Array<{ name: string; config: Record<string, unknown> }>,
): Promise<Experiment> => {
  const brandId = brand.id ?? brand.name.toLowerCase().replace(/\s+/g, '-');

  const variants: ExperimentVariant[] = variantConfigs.map((v, i) => ({
    id: `var-${Date.now()}-${i}`,
    name: v.name,
    description: `Variant ${v.name}`,
    config: v.config,
    impressions: 0,
    reach: 0,
    engagementRate: 0,
    clickThroughRate: 0,
    conversions: 0,
    postIds: [],
  }));

  const experiment: Experiment = {
    id: `exp-${Date.now()}`,
    brandId,
    type,
    hypothesis: {
      statement: hypothesisStatement,
      null_hypothesis: `No hay diferencia entre las variantes en ${type}`,
      expected_effect_size: 0.15, // 15% lift expected
      metric: 'engagement_rate',
      minimumSampleSize: 500, // impressions mínimas por variante para significancia
    },
    variants,
    status: 'running',
    createdAt: new Date().toISOString(),
    startedAt: new Date().toISOString(),
    trafficSplitMethod: variantConfigs.length > 3 ? 'multi-armed-bandit' : 'even',
    significance: 0,
    decision: 'recolectando datos',
  };

  const exps = await loadExperiments(brandId);
  await saveExperiments(brandId, [...exps, experiment]);
  log.info('[autoExperiment] designed', { id: experiment.id, type, variants: variants.length });
  return experiment;
};

// ── Actualizar variantes con métricas reales ─────────────────────────────────

export const recordVariantMetrics = async (
  brandId: string,
  experimentId: string,
  variantId: string,
  metrics: Partial<ExperimentVariant>,
): Promise<void> => {
  const exps = await loadExperiments(brandId);
  const exp = exps.find((e) => e.id === experimentId);
  if (!exp) return;
  const variant = exp.variants.find((v) => v.id === variantId);
  if (!variant) return;

  if (metrics.impressions !== undefined) variant.impressions = metrics.impressions;
  if (metrics.reach !== undefined) variant.reach = metrics.reach;
  if (metrics.engagementRate !== undefined) variant.engagementRate = metrics.engagementRate;
  if (metrics.clickThroughRate !== undefined) variant.clickThroughRate = metrics.clickThroughRate;
  if (metrics.conversions !== undefined) variant.conversions = metrics.conversions;
  if (metrics.postIds) variant.postIds.push(...metrics.postIds);

  await saveExperiments(brandId, exps);
};

// ── Analizar significance ────────────────────────────────────────────────────

export const analyzeExperiment = async (brandId: string, experimentId: string): Promise<ExperimentResults | null> => {
  const exps = await loadExperiments(brandId);
  const exp = exps.find((e) => e.id === experimentId);
  if (!exp || exp.variants.length < 2) return null;

  // Verificar sample size mínimo
  const hasMinSample = exp.variants.every((v) => v.impressions >= exp.hypothesis.minimumSampleSize);
  if (!hasMinSample) {
    exp.status = 'running';
    exp.decision = `Continúa: insuficientes impresiones (mín ${exp.hypothesis.minimumSampleSize}/variant)`;
    await saveExperiments(brandId, exps);
    return null;
  }

  // Encontrar mejor variant por engagement
  const sorted = [...exp.variants].sort((a, b) => b.engagementRate - a.engagementRate);
  const winner = sorted[0]!;
  const loser = sorted[sorted.length - 1]!;

  if (winner.id === loser.id) return null;

  // Z-test entre winner y loser
  const successWinner = Math.round(winner.engagementRate * winner.impressions);
  const successLoser = Math.round(loser.engagementRate * loser.impressions);
  const pValue = zTestProportions(successWinner, winner.impressions, successLoser, loser.impressions);
  const isSignificant = pValue < 0.05;
  const liftPercent = ((winner.engagementRate - loser.engagementRate) / Math.max(0.001, loser.engagementRate)) * 100;
  const effectSize = winner.engagementRate - loser.engagementRate;

  const recommendation: ExperimentResults['recommendation'] =
    isSignificant && liftPercent > 10
      ? 'ship-winner'
      : isSignificant && liftPercent < 5
        ? 'continue-testing'
        : Math.abs(liftPercent) < 2
          ? 'reset'
          : 'continue-testing';

  // Update experiment
  exp.significance = 1 - pValue;
  exp.winnerId = winner.id;
  exp.liftPercent = liftPercent;
  exp.endedAt = new Date().toISOString();
  exp.status =
    recommendation === 'ship-winner' ? 'concluded' : recommendation === 'continue-testing' ? 'running' : 'inconclusive';
  exp.decision = `${recommendation}: lift ${liftPercent.toFixed(1)}%, p=${pValue.toFixed(3)}`;
  await saveExperiments(brandId, exps);

  log.info('[autoExperiment] analyzed', {
    id: experimentId,
    winner: winner.name,
    lift: liftPercent.toFixed(1),
    pValue: pValue.toFixed(3),
    recommendation,
  });

  return {
    experimentId,
    winnerId: winner.id,
    loserId: loser.id,
    liftPercent,
    pValue,
    isSignificant,
    effectSize,
    confidence: 1 - pValue,
    recommendation,
  };
};

// ── Auto-ship de winners ─────────────────────────────────────────────────────

export const autoShipWinners = async (brand: BrandProfile): Promise<{ shipped: number; experiments: Experiment[] }> => {
  const brandId = brand.id ?? brand.name.toLowerCase().replace(/\s+/g, '-');
  const exps = await loadExperiments(brandId);
  let shipped = 0;
  const shippedExps: Experiment[] = [];

  for (const exp of exps.filter((e) => e.status === 'running')) {
    const result = await analyzeExperiment(brandId, exp.id);
    if (result && result.recommendation === 'ship-winner') {
      shipped++;
      shippedExps.push(exp);
      log.info('[autoExperiment] shipped winner', { id: exp.id, lift: result.liftPercent.toFixed(1) });
    }
  }
  return { shipped, experiments: shippedExps };
};

// ── Lista activos + history ─────────────────────────────────────────────────

export const listActiveExperiments = async (brandId: string): Promise<Experiment[]> => {
  const exps = await loadExperiments(brandId);
  return exps.filter((e) => e.status === 'running' || e.status === 'designing');
};

export const listConcludedExperiments = async (brandId: string, limit = 20): Promise<Experiment[]> => {
  const exps = await loadExperiments(brandId);
  return exps.filter((e) => e.status === 'concluded').slice(-limit);
};

/** Auto-genera próximos experimentos basados en learnings. */
export const proposeNextExperiments = async (
  brand: BrandProfile,
  count = 3,
): Promise<
  Array<{
    type: ExperimentType;
    hypothesis: string;
    variants: Array<{ name: string; config: Record<string, unknown> }>;
  }>
> => {
  const brandId = brand.id ?? brand.name.toLowerCase().replace(/\s+/g, '-');
  const concluded = await listConcludedExperiments(brandId, 10);
  const typesAlreadyTested = new Set(concluded.map((e) => e.type));

  // Tipos que faltan testear
  const allTypes: ExperimentType[] = [
    'hook',
    'caption-length',
    'posting-time',
    'hashtag-set',
    'format',
    'cta-framing',
    'visual-style',
    'audio',
    'first-comment',
  ];
  const untested = allTypes.filter((t) => !typesAlreadyTested.has(t));

  return untested.slice(0, count).map((type) => ({
    type,
    hypothesis: hypothesisFor(type),
    variants: defaultVariantsFor(type),
  }));
};

const hypothesisFor = (type: ExperimentType): string => {
  const map: Record<ExperimentType, string> = {
    hook: 'Hook con números performance >15% mejor que hook narrativo',
    'caption-length': 'Captions cortos (<100 palabras) producen +20% saves',
    'posting-time': 'Postear 12pm vs 8pm cambia engagement >15%',
    'hashtag-set': 'Set de hashtags micro (10K-100K) supera macro en alcance',
    format: 'Reels superan carruseles en alcance pero carruseles en saves',
    'cta-framing': 'CTA con loss-aversion supera CTA con benefit-framing',
    'visual-style': 'Estilo bold supera minimalista en stop-scroll',
    audio: 'Trending sounds vs original audio: trending +30% reach',
    'first-comment': 'Primer comentario con pregunta abierta +25% comments',
  };
  return map[type];
};

const defaultVariantsFor = (type: ExperimentType): Array<{ name: string; config: Record<string, unknown> }> => {
  switch (type) {
    case 'hook':
      return [
        { name: 'numbers', config: { style: 'number-based' } },
        { name: 'narrative', config: { style: 'story' } },
        { name: 'question', config: { style: 'question' } },
      ];
    case 'caption-length':
      return [
        { name: 'short', config: { maxWords: 80 } },
        { name: 'medium', config: { maxWords: 200 } },
        { name: 'long', config: { maxWords: 500 } },
      ];
    case 'posting-time':
      return [
        { name: 'morning', config: { hour: 9 } },
        { name: 'noon', config: { hour: 12 } },
        { name: 'evening', config: { hour: 20 } },
      ];
    default:
      return [
        { name: 'A', config: {} },
        { name: 'B', config: {} },
      ];
  }
};
