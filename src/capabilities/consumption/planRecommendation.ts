/**
 * AI Plan Recommendation de FeedIA — recomienda el plan ideal según uso real.
 *
 * Analiza el consumo de los últimos 30-90 días (tokens, costo, llamadas,
 * features usadas) y compara contra los tiers disponibles. Recomienda el plan
 * que minimiza costo + provee headroom (~25%) + cubre todas las features
 * usadas.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { getBudgetHistory, getBudgetStatus } from '../../agent/budget.js';
import { exportAttributionState } from './costAttribution.js';

const PLAN_PATH = join(process.cwd(), 'data', 'consumption', 'plan-recommendation.json');

// ── Tipos ─────────────────────────────────────────────────────────────────────

export interface PlanTier {
  id: string;
  name: string;
  monthlyUsd: number;
  includedCallsPerMonth: number;
  includedTokensPerMonth: number;
  pricePerExtraCallUsd: number;
  features: string[];
  bestFor: string;
  ceilings: {
    workflowsPerDay?: number;
    agentsActive?: number;
    profilesAllowed?: number;
    seatsIncluded?: number;
  };
}

export interface UsageSnapshot {
  windowDays: number;
  totalCallsLastWindow: number;
  totalCostUsd: number;
  totalTokens: number;
  avgCallsPerDay: number;
  avgCostPerDay: number;
  uniqueFeaturesUsed: string[];
  uniqueWorkflowsUsed: string[];
  peakDailyCalls: number;
  peakDailyCostUsd: number;
}

export interface PlanRecommendation {
  recommendedPlan: PlanTier;
  reasoning: string[];
  estimatedMonthlyCostUsd: number;
  headroomPct: number;
  comparison: Array<{
    plan: PlanTier;
    monthlyEstimateUsd: number;
    fits: boolean;
    notes: string[];
    matchScore: number; // 0-100
  }>;
  warnings: string[];
  generatedAt: string;
}

interface RecommendationStore {
  version: number;
  customPlans?: PlanTier[];
  recentRecommendations: PlanRecommendation[];
  lastUpdated: string;
}

// ── Planes default (configurables) ────────────────────────────────────────────

const DEFAULT_PLANS: PlanTier[] = [
  {
    id: 'starter',
    name: 'Starter',
    monthlyUsd: 29,
    includedCallsPerMonth: 5000,
    includedTokensPerMonth: 2_500_000,
    pricePerExtraCallUsd: 0.01,
    features: ['caption', 'hashtags', 'inbox basic', 'analytics basic'],
    bestFor: 'Marca personal recién empezando',
    ceilings: { workflowsPerDay: 3, agentsActive: 3, profilesAllowed: 1, seatsIncluded: 1 },
  },
  {
    id: 'growth',
    name: 'Growth',
    monthlyUsd: 79,
    includedCallsPerMonth: 20_000,
    includedTokensPerMonth: 12_000_000,
    pricePerExtraCallUsd: 0.008,
    features: [
      'caption',
      'hashtags',
      'inbox full',
      'analytics',
      'community basic',
      'stories studio',
      'lead pipeline',
      'canva-to-instagram',
    ],
    bestFor: 'Negocios en crecimiento (1k-10k followers)',
    ceilings: { workflowsPerDay: 10, agentsActive: 6, profilesAllowed: 3, seatsIncluded: 3 },
  },
  {
    id: 'pro',
    name: 'Pro',
    monthlyUsd: 199,
    includedCallsPerMonth: 80_000,
    includedTokensPerMonth: 50_000_000,
    pricePerExtraCallUsd: 0.005,
    features: ['todas growth', 'computer-use', 'brand renewal', 'multi-account', 'API access', 'priority support'],
    bestFor: 'Agencias y marcas con +10k followers',
    ceilings: { workflowsPerDay: 50, agentsActive: 10, profilesAllowed: 10, seatsIncluded: 10 },
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    monthlyUsd: 499,
    includedCallsPerMonth: 250_000,
    includedTokensPerMonth: 200_000_000,
    pricePerExtraCallUsd: 0.003,
    features: ['todas pro', 'whitelabel', 'SLA 99.9%', 'on-prem option', 'dedicated success', 'custom integrations'],
    bestFor: 'Multi-marca, agencias grandes, +50k followers',
    ceilings: { workflowsPerDay: 9999, agentsActive: 9999, profilesAllowed: 9999, seatsIncluded: 999 },
  },
];

const DEFAULT_STORE: RecommendationStore = {
  version: 1,
  recentRecommendations: [],
  lastUpdated: new Date().toISOString(),
};

// ── Persistencia ──────────────────────────────────────────────────────────────

const ensureDir = (): void => {
  const dir = join(process.cwd(), 'data', 'consumption');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
};

const loadStore = (): RecommendationStore => {
  try {
    ensureDir();
    if (!existsSync(PLAN_PATH)) return structuredClone(DEFAULT_STORE);
    return JSON.parse(readFileSync(PLAN_PATH, 'utf8')) as RecommendationStore;
  } catch {
    return structuredClone(DEFAULT_STORE);
  }
};

const saveStore = (store: RecommendationStore): void => {
  ensureDir();
  store.lastUpdated = new Date().toISOString();
  writeFileSync(PLAN_PATH, JSON.stringify(store, null, 2), 'utf8');
};

// ── Snapshot de uso ──────────────────────────────────────────────────────────

export const buildUsageSnapshot = (windowDays = 30): UsageSnapshot => {
  const history = getBudgetHistory();
  const today = getBudgetStatus();
  const cutoff = new Date(Date.now() - windowDays * 86400000).toISOString().slice(0, 10);
  const relevantHistory = history.filter((h) => h.day >= cutoff);

  const totalCalls = relevantHistory.reduce((s, h) => s + h.calls, 0) + today.calls;
  const totalCostUsd = relevantHistory.reduce((s, h) => s + h.spentUsd, 0) + today.spentUsd;
  const totalTokens =
    relevantHistory.reduce((s, h) => s + h.inputTokens + h.outputTokens, 0) + today.inputTokens + today.outputTokens;

  const peakDailyCalls = Math.max(...relevantHistory.map((h) => h.calls), today.calls, 0);
  const peakDailyCostUsd = Math.max(...relevantHistory.map((h) => h.spentUsd), today.spentUsd, 0);

  const events = exportAttributionState().events;
  const cutoffISO = new Date(Date.now() - windowDays * 86400000).toISOString();
  const relevantEvents = events.filter((e) => e.at >= cutoffISO);
  const uniqueFeaturesUsed = [
    ...new Set(relevantEvents.map((e) => e.dimensions.feature).filter((f): f is string => Boolean(f))),
  ];
  const uniqueWorkflowsUsed = [
    ...new Set(relevantEvents.map((e) => e.dimensions.workflow).filter((w): w is string => Boolean(w))),
  ];

  return {
    windowDays,
    totalCallsLastWindow: totalCalls,
    totalCostUsd: Number(totalCostUsd.toFixed(4)),
    totalTokens,
    avgCallsPerDay: Number((totalCalls / Math.max(1, windowDays)).toFixed(2)),
    avgCostPerDay: Number((totalCostUsd / Math.max(1, windowDays)).toFixed(4)),
    uniqueFeaturesUsed,
    uniqueWorkflowsUsed,
    peakDailyCalls,
    peakDailyCostUsd: Number(peakDailyCostUsd.toFixed(4)),
  };
};

// ── Matching plan / usage ────────────────────────────────────────────────────

const estimateMonthlyCost = (plan: PlanTier, projectedCallsMonth: number): number => {
  const extra = Math.max(0, projectedCallsMonth - plan.includedCallsPerMonth);
  return plan.monthlyUsd + extra * plan.pricePerExtraCallUsd;
};

const FEATURE_TO_PLAN_MAP: Record<string, string[]> = {
  'computer-use': ['pro', 'enterprise'],
  'brand renewal': ['pro', 'enterprise'],
  'multi-account': ['pro', 'enterprise'],
  whitelabel: ['enterprise'],
  'canva-to-instagram': ['growth', 'pro', 'enterprise'],
  'lead pipeline': ['growth', 'pro', 'enterprise'],
  'stories studio': ['growth', 'pro', 'enterprise'],
};

export const recommendPlan = (windowDays = 30): PlanRecommendation => {
  const store = loadStore();
  const plans = store.customPlans ?? DEFAULT_PLANS;
  const usage = buildUsageSnapshot(windowDays);
  const projectedCallsMonth = usage.avgCallsPerDay * 30;

  const comparison = plans.map((plan) => {
    const monthlyEstimateUsd = estimateMonthlyCost(plan, projectedCallsMonth);
    const notes: string[] = [];

    const fitsCallVolume = projectedCallsMonth <= plan.includedCallsPerMonth * 1.5;
    if (!fitsCallVolume)
      notes.push(
        `Excedés ${plan.includedCallsPerMonth.toLocaleString('es-AR')} llamadas/mes incluidas (proyectado ${Math.round(projectedCallsMonth).toLocaleString('es-AR')})`,
      );

    const missingFeatures = usage.uniqueFeaturesUsed.filter((f) => {
      const allowed = FEATURE_TO_PLAN_MAP[f];
      return allowed && !allowed.includes(plan.id);
    });
    if (missingFeatures.length > 0) notes.push(`No incluye: ${missingFeatures.join(', ')}`);

    const fits = fitsCallVolume && missingFeatures.length === 0;

    // Match score: penaliza si no fits + premia headroom razonable (25-50%)
    const callsHeadroom = plan.includedCallsPerMonth > 0 ? 1 - projectedCallsMonth / plan.includedCallsPerMonth : 1;
    let matchScore = 50;
    if (fits) {
      matchScore += 30;
      if (callsHeadroom >= 0.2 && callsHeadroom <= 0.6) matchScore += 15;
      else if (callsHeadroom > 0.6) matchScore -= 5; // sobre-pagado
    } else {
      matchScore -= 30;
    }
    matchScore = Math.max(0, Math.min(100, matchScore));

    return {
      plan,
      monthlyEstimateUsd: Number(monthlyEstimateUsd.toFixed(2)),
      fits,
      notes,
      matchScore,
    };
  });

  const sorted = [...comparison].sort((a, b) => {
    if (a.fits !== b.fits) return a.fits ? -1 : 1;
    if (a.fits && b.fits) return a.monthlyEstimateUsd - b.monthlyEstimateUsd;
    return b.matchScore - a.matchScore;
  });
  const best = sorted[0]!;

  const headroomPct =
    best.plan.includedCallsPerMonth > 0
      ? Number(((1 - projectedCallsMonth / best.plan.includedCallsPerMonth) * 100).toFixed(1))
      : 0;

  const reasoning: string[] = [
    `Tu uso actual: ${usage.avgCallsPerDay.toFixed(0)} llamadas/día (~${Math.round(projectedCallsMonth).toLocaleString('es-AR')}/mes).`,
    `Costo proyectado en ${best.plan.name}: $${best.monthlyEstimateUsd}/mes.`,
    `Features que usás: ${usage.uniqueFeaturesUsed.slice(0, 5).join(', ') || '(básicas)'}.`,
    headroomPct > 0
      ? `Headroom: ${headroomPct}% — capacidad para crecer sin cambiar de plan.`
      : `⚠️ Estás al límite del plan. Considerá el siguiente tier para evitar overage.`,
  ];

  const warnings: string[] = [];
  if (usage.peakDailyCalls > usage.avgCallsPerDay * 5) {
    warnings.push(
      `Picos de uso fuertes (${usage.peakDailyCalls} vs ${usage.avgCallsPerDay.toFixed(0)} promedio). El plan debe absorber spikes.`,
    );
  }
  if (best.notes.length > 0) {
    warnings.push(`Plan recomendado todavía tiene gaps: ${best.notes.join(' · ')}`);
  }

  const rec: PlanRecommendation = {
    recommendedPlan: best.plan,
    reasoning,
    estimatedMonthlyCostUsd: best.monthlyEstimateUsd,
    headroomPct,
    comparison: sorted,
    warnings,
    generatedAt: new Date().toISOString(),
  };

  // Persistir últimas 30 recomendaciones
  store.recentRecommendations.push(rec);
  if (store.recentRecommendations.length > 30) store.recentRecommendations = store.recentRecommendations.slice(-30);
  saveStore(store);

  return rec;
};

// ── Custom plans (override) ──────────────────────────────────────────────────

export const setCustomPlans = (plans: PlanTier[]): void => {
  const store = loadStore();
  store.customPlans = plans;
  saveStore(store);
};

export const getAvailablePlans = (): PlanTier[] => {
  const store = loadStore();
  return store.customPlans ?? DEFAULT_PLANS;
};

export const getRecentRecommendations = (): PlanRecommendation[] => loadStore().recentRecommendations.slice().reverse();
