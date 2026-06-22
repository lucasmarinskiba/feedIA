/**
 * Cross-Brand Learning — Aprendizaje federado entre marcas
 * El cerebro aprende de TODAS las cuentas y transfiere conocimiento:
 * - Qué hooks funcionan en qué nicho
 * - Qué horarios son mejores por región
 * - Qué formatos convierten más por industria
 * Sin filtrar datos sensibles entre marcas
 */

import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { log } from '../../agent/logger.js';
import * as semantic from '../memory/semanticMemory.js';
import * as causal from '../reasoning/causalEngine.js';

const CBL_PATH = resolve('data/runtime/brain/cross-brand-learning.json');

export interface CrossBrandInsight {
  id: string;
  pattern: string;
  category: 'hook' | 'format' | 'timing' | 'cta' | 'visual' | 'tone';
  niche: string;
  region: string;
  confidence: number;
  evidenceCount: number;
  avgPerformance: number;
  transferredTo: string[];
  createdAt: string;
}

interface CBLStore {
  insights: CrossBrandInsight[];
  brandCount: number;
  lastSync: string;
}

const ensureDir = (): void => {
  mkdirSync(resolve('data/runtime/brain'), { recursive: true });
};

const loadStore = (): CBLStore => {
  try {
    ensureDir();
    if (!existsSync(CBL_PATH)) return { insights: [], brandCount: 0, lastSync: new Date().toISOString() };
    return JSON.parse(readFileSync(CBL_PATH, 'utf-8')) as CBLStore;
  } catch {
    return { insights: [], brandCount: 0, lastSync: new Date().toISOString() };
  }
};

const saveStore = (store: CBLStore): void => {
  ensureDir();
  writeFileSync(CBL_PATH, JSON.stringify(store, null, 2), 'utf-8');
};

// ── Extract insight from a brand's success ─────────────────────────────────

export const extractInsight = async (
  pattern: string,
  category: CrossBrandInsight['category'],
  niche: string,
  region: string,
  performance: number,
): Promise<CrossBrandInsight> => {
  const store = loadStore();

  const existing = store.insights.find(
    (i) => i.pattern === pattern && i.category === category && i.niche === niche && i.region === region,
  );

  if (existing) {
    existing.evidenceCount += 1;
    existing.avgPerformance =
      (existing.avgPerformance * (existing.evidenceCount - 1) + performance) / existing.evidenceCount;
    existing.confidence = Math.min(0.98, existing.confidence + 0.02);
    existing.createdAt = new Date().toISOString();
    saveStore(store);
    return existing;
  }

  const insight: CrossBrandInsight = {
    id: `cbl-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
    pattern,
    category,
    niche,
    region,
    confidence: 0.5,
    evidenceCount: 1,
    avgPerformance: performance,
    transferredTo: [],
    createdAt: new Date().toISOString(),
  };

  store.insights.push(insight);
  store.brandCount += 1;
  saveStore(store);

  await semantic.storeMemory(
    `Cross-brand insight: "${pattern}" (${category}) funciona en ${niche}/${region} → performance ${performance.toFixed(0)}`,
    'learning',
    { pattern, category, niche, region, performance },
    0.7,
  );

  causal.inferCause({
    action: `${category}: ${pattern}`,
    outcome: `alto performance en ${niche}`,
    before: 0,
    after: performance,
    context: `region=${region}`,
    niche,
  });

  log.info(`[CrossBrandLearning] New insight: ${pattern} (${category}) in ${niche}/${region}`);
  return insight;
};

// ── Get transferable insights for a brand ──────────────────────────────────

export const getInsightsForBrand = (niche: string, region: string, limit = 10): CrossBrandInsight[] => {
  const store = loadStore();

  return store.insights
    .filter((i) => {
      // Match by niche or related niche
      const nicheMatch = i.niche === niche || i.niche.includes(niche) || niche.includes(i.niche);
      // Region can be different but same language/culture
      const regionMatch = i.region === region || (region && i.region.startsWith(region.split('-')[0] ?? ''));
      return nicheMatch || regionMatch;
    })
    .filter((i) => i.confidence > 0.5)
    .sort((a, b) => b.confidence * b.avgPerformance - a.confidence * a.avgPerformance)
    .slice(0, limit);
};

// ─- Transfer insight to a brand ───────────────────────────────────────────

export const transferInsight = (insightId: string, brandName: string): boolean => {
  const store = loadStore();
  const insight = store.insights.find((i) => i.id === insightId);
  if (!insight) return false;

  if (!insight.transferredTo.includes(brandName)) {
    insight.transferredTo.push(brandName);
    saveStore(store);
    log.info(`[CrossBrandLearning] Transferred "${insight.pattern}" to ${brandName}`);
  }
  return true;
};

// ── Get top patterns across all brands ─────────────────────────────────────

export const getUniversalPatterns = (category?: CrossBrandInsight['category'], limit = 10): CrossBrandInsight[] => {
  const store = loadStore();
  let insights = store.insights;
  if (category) insights = insights.filter((i) => i.category === category);

  return insights
    .filter((i) => i.evidenceCount >= 2)
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, limit);
};

export const getStats = (): { insights: number; brands: number; categories: Record<string, number> } => {
  const store = loadStore();
  const categories: Record<string, number> = {};
  for (const i of store.insights) categories[i.category] = (categories[i.category] ?? 0) + 1;
  return { insights: store.insights.length, brands: store.brandCount, categories };
};
