/**
 * Revenue Engine — Conexión engagement → conversión → revenue
 * Predice cuánto dinero generará un post, un follower, una interacción.
 * Optimiza para revenue, no solo para likes.
 */

import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { log } from '../../agent/logger.js';
import * as semantic from '../memory/semanticMemory.js';
import * as causal from '../reasoning/causalEngine.js';

const REVENUE_PATH = resolve('data/runtime/brain/revenue-engine.json');

export interface RevenueModel {
  niche: string;
  avgConversionRate: number; // %
  avgOrderValue: number;
  customerLifetimeValue: number;
  touchpointsToSale: number;
  revenuePerFollower: number;
  revenuePerEngagement: number;
  revenuePerDM: number;
  seasonalMultiplier: Record<number, number>; // month -> multiplier
  updatedAt: string;
}

export interface ContentRevenuePrediction {
  contentId: string;
  predictedReach: number;
  predictedEngagement: number;
  predictedClicks: number;
  predictedConversions: number;
  predictedRevenue: number;
  confidence: number;
  levers: { variable: string; impact: number; suggestion: string }[];
}

interface RevenueStore {
  models: RevenueModel[];
  predictions: ContentRevenuePrediction[];
  actuals: { contentId: string; actualRevenue: number; predictedRevenue: number; delta: number }[];
}

const ensureDir = (): void => {
  mkdirSync(resolve('data/runtime/brain'), { recursive: true });
};

const loadStore = (): RevenueStore => {
  try {
    ensureDir();
    if (!existsSync(REVENUE_PATH)) return { models: [], predictions: [], actuals: [] };
    return JSON.parse(readFileSync(REVENUE_PATH, 'utf-8')) as RevenueStore;
  } catch {
    return { models: [], predictions: [], actuals: [] };
  }
};

const saveStore = (store: RevenueStore): void => {
  ensureDir();
  writeFileSync(REVENUE_PATH, JSON.stringify(store, null, 2), 'utf-8');
};

// ── Default models by niche ────────────────────────────────────────────────

const DEFAULT_MODELS: Partial<RevenueModel>[] = [
  {
    niche: 'fitness',
    avgConversionRate: 2.5,
    avgOrderValue: 50,
    customerLifetimeValue: 300,
    touchpointsToSale: 4,
    revenuePerFollower: 0.15,
    revenuePerEngagement: 0.05,
    revenuePerDM: 2.5,
    seasonalMultiplier: { 1: 1.5, 6: 1.3, 9: 1.2 },
  },
  {
    niche: 'beauty',
    avgConversionRate: 3.0,
    avgOrderValue: 45,
    customerLifetimeValue: 250,
    touchpointsToSale: 3,
    revenuePerFollower: 0.2,
    revenuePerEngagement: 0.08,
    revenuePerDM: 3.0,
    seasonalMultiplier: { 2: 1.3, 11: 1.5, 12: 1.4 },
  },
  {
    niche: 'business',
    avgConversionRate: 1.5,
    avgOrderValue: 500,
    customerLifetimeValue: 2000,
    touchpointsToSale: 7,
    revenuePerFollower: 0.5,
    revenuePerEngagement: 0.15,
    revenuePerDM: 15,
    seasonalMultiplier: { 1: 1.4, 5: 1.2, 9: 1.3 },
  },
  {
    niche: 'tech',
    avgConversionRate: 1.0,
    avgOrderValue: 100,
    customerLifetimeValue: 400,
    touchpointsToSale: 5,
    revenuePerFollower: 0.25,
    revenuePerEngagement: 0.1,
    revenuePerDM: 5,
    seasonalMultiplier: { 3: 1.2, 9: 1.3, 11: 1.4 },
  },
];

// ── Get or create revenue model ────────────────────────────────────────────

export const getModel = (niche: string): RevenueModel => {
  const store = loadStore();
  let model = store.models.find((m) => m.niche.toLowerCase() === niche.toLowerCase());

  if (!model) {
    const defaults = DEFAULT_MODELS.find((m) => m.niche?.toLowerCase() === niche.toLowerCase());
    model = {
      niche,
      avgConversionRate: defaults?.avgConversionRate ?? 2.0,
      avgOrderValue: defaults?.avgOrderValue ?? 50,
      customerLifetimeValue: defaults?.customerLifetimeValue ?? 200,
      touchpointsToSale: defaults?.touchpointsToSale ?? 4,
      revenuePerFollower: defaults?.revenuePerFollower ?? 0.1,
      revenuePerEngagement: defaults?.revenuePerEngagement ?? 0.03,
      revenuePerDM: defaults?.revenuePerDM ?? 1.5,
      seasonalMultiplier: defaults?.seasonalMultiplier ?? {},
      updatedAt: new Date().toISOString(),
    };
    store.models.push(model);
    saveStore(store);
  }

  return model;
};

// ── Predict revenue for content ────────────────────────────────────────────

export const predictContentRevenue = (
  content: {
    format: string;
    predictedReach: number;
    predictedEngagement: number;
    goal: 'awareness' | 'engagement' | 'conversion';
  },
  niche: string,
): ContentRevenuePrediction => {
  const model = getModel(niche);
  const month = new Date().getMonth() + 1;
  const seasonalMult = model.seasonalMultiplier[month] ?? 1.0;

  // Base calculations
  const reach = content.predictedReach;
  const engagement = content.predictedEngagement;
  const clicks = engagement * 0.15; // 15% of engaged users click
  const conversions =
    clicks *
    (model.avgConversionRate / 100) *
    (content.goal === 'conversion' ? 1.5 : content.goal === 'awareness' ? 0.3 : 0.8);
  const revenue = conversions * model.avgOrderValue * seasonalMult;

  // Confidence
  const confidence = Math.min(
    0.9,
    0.4 + (content.predictedReach > 1000 ? 0.2 : 0) + (content.predictedEngagement > 100 ? 0.2 : 0),
  );

  // Levers
  const levers: ContentRevenuePrediction['levers'] = [];
  if (content.goal === 'awareness') {
    levers.push({
      variable: 'goal',
      impact: revenue * 0.5,
      suggestion: 'Cambiar objetivo a conversión aumentaría revenue',
    });
  }
  if (content.format === 'post') {
    levers.push({
      variable: 'format',
      impact: revenue * 0.3,
      suggestion: 'Usar reel aumentaría reach y revenue potencial',
    });
  }
  if (clicks / engagement < 0.1) {
    levers.push({
      variable: 'cta',
      impact: revenue * 0.4,
      suggestion: 'CTA más fuerte aumentaría clicks y conversiones',
    });
  }

  const prediction: ContentRevenuePrediction = {
    contentId: `pred-${Date.now()}`,
    predictedReach: Math.round(reach),
    predictedEngagement: Math.round(engagement),
    predictedClicks: Math.round(clicks),
    predictedConversions: Math.round(conversions),
    predictedRevenue: Math.round(revenue),
    confidence,
    levers,
  };

  const store = loadStore();
  store.predictions.push(prediction);
  if (store.predictions.length > 200) store.predictions = store.predictions.slice(-200);
  saveStore(store);

  log.info(`[RevenueEngine] Content prediction: $${prediction.predictedRevenue} (conf=${confidence.toFixed(2)})`);
  return prediction;
};

// ── Record actual revenue ──────────────────────────────────────────────────

export const recordActualRevenue = (contentId: string, actualRevenue: number): void => {
  const store = loadStore();
  const pred = store.predictions.find((p) => p.contentId === contentId);
  const predicted = pred?.predictedRevenue ?? 0;
  const delta = actualRevenue - predicted;

  store.actuals.push({ contentId, actualRevenue, predictedRevenue: predicted, delta });
  if (store.actuals.length > 200) store.actuals = store.actuals.slice(-200);
  saveStore(store);

  // Learn from error
  if (Math.abs(delta) > predicted * 0.3) {
    causal.inferCause({
      action: delta > 0 ? 'sobrepredicción de revenue' : 'subpredicción de revenue',
      outcome: `delta de $${delta.toFixed(0)}`,
      before: predicted,
      after: actualRevenue,
      context: 'revenue-prediction',
      niche: 'general',
    });
  }

  semantic.storeMemory(
    `Revenue real: $${actualRevenue} vs predicho: $${predicted} (delta $${delta.toFixed(0)})`,
    'learning',
    { contentId, actualRevenue, predicted, delta },
    0.7,
  );

  log.info(`[RevenueEngine] Actual: $${actualRevenue} vs Predicted: $${predicted} (delta: $${delta.toFixed(0)})`);
};

// ── ROI optimizer ──────────────────────────────────────────────────────────

export const getROIInsights = (
  niche: string,
): {
  bestFormat: string;
  bestGoal: string;
  avgRevenuePerPost: number;
  breakEvenFollowers: number;
  recommendations: string[];
} => {
  const model = getModel(niche);
  const store = loadStore();

  const actualsByFormat = new Map<string, number[]>();
  for (const a of store.actuals) {
    const pred = store.predictions.find((p) => p.contentId === a.contentId);
    if (pred) {
      const arr = actualsByFormat.get('general') ?? [];
      arr.push(a.actualRevenue);
      actualsByFormat.set('general', arr);
    }
  }

  const avgRevenue =
    store.actuals.length > 0
      ? store.actuals.reduce((s, a) => s + a.actualRevenue, 0) / store.actuals.length
      : model.revenuePerEngagement * 1000;

  const breakEven = Math.ceil(model.avgOrderValue / model.revenuePerFollower);

  return {
    bestFormat: 'reel', // Would be calculated from data
    bestGoal: 'conversion',
    avgRevenuePerPost: Math.round(avgRevenue),
    breakEvenFollowers: breakEven,
    recommendations: [
      `Necesitás ~${breakEven} followers para break-even con modelo actual`,
      `Cada DM responde vale ~$${model.revenuePerDM.toFixed(2)} en promedio`,
      `Seasonal boost este mes: ${((model.seasonalMultiplier[new Date().getMonth() + 1] ?? 1) * 100 - 100).toFixed(0)}%`,
    ],
  };
};
