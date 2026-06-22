/**
 * Strategy Store
 * ─────────────────────────────────────────────────────────────────────────
 * Persists the auto-optimization recommendations to disk so:
 *   • the scheduler can read them when picking the next posting slot
 *   • the autonomous producer can read them when picking format + hook
 *   • the dashboard can show the history of adjustments and which ones
 *     actually moved KPIs in subsequent windows
 *
 * Storage is intentionally JSON-on-disk to avoid a runtime DB requirement.
 */

import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import type { AutoOptimizationResult, StrategyAdjustment, NextPieceRecommendation } from './successPatterns.js';

export interface StoredAdjustment extends StrategyAdjustment {
  id: string;
  appliedAt: string;
  status: 'propuesto' | 'aprobado' | 'rechazado' | 'aplicado' | 'reverted';
  windowDays: number;
  /** KPI delta observed after this adjustment was applied — measured later. */
  observedDelta?: { metric: string; before: number; after: number; deltaPct: number };
}

export interface StoredRecommendation extends NextPieceRecommendation {
  id: string;
  createdAt: string;
  /** Whether the recommendation produced a published piece. */
  status: 'propuesto' | 'producido' | 'publicado' | 'descartado';
  publishedPostId?: string;
}

interface StoreShape {
  adjustments: StoredAdjustment[];
  recommendations: StoredRecommendation[];
  lastOptimizationRun?: string;
  lastExecutiveSummary?: string;
}

const STORE_PATH = resolve('data/runtime/autoOptimize.json');

const newId = (prefix: string): string =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

const readStore = (): StoreShape => {
  if (!existsSync(STORE_PATH)) return { adjustments: [], recommendations: [] };
  try {
    return JSON.parse(readFileSync(STORE_PATH, 'utf-8')) as StoreShape;
  } catch {
    return { adjustments: [], recommendations: [] };
  }
};

const writeStore = (s: StoreShape): void => {
  mkdirSync(dirname(STORE_PATH), { recursive: true });
  writeFileSync(STORE_PATH, JSON.stringify(s, null, 2), 'utf-8');
};

/** Persist the full result of an auto-optimization run. */
export const recordOptimizationRun = (
  result: AutoOptimizationResult,
): {
  storedAdjustments: StoredAdjustment[];
  storedRecommendations: StoredRecommendation[];
} => {
  const store = readStore();
  const now = new Date().toISOString();

  const storedAdjustments: StoredAdjustment[] = result.strategyAdjustments.map((a) => ({
    ...a,
    id: newId('adj'),
    appliedAt: now,
    status: 'propuesto',
    windowDays: result.extraction.windowDays,
  }));
  const storedRecommendations: StoredRecommendation[] = result.recommendations.map((r) => ({
    ...r,
    id: newId('rec'),
    createdAt: now,
    status: 'propuesto',
  }));

  store.adjustments.push(...storedAdjustments);
  store.recommendations.push(...storedRecommendations);
  store.lastOptimizationRun = now;
  store.lastExecutiveSummary = result.executiveSummary;
  writeStore(store);

  return { storedAdjustments, storedRecommendations };
};

export const listAdjustments = (filter?: {
  status?: StoredAdjustment['status'];
  parameter?: string;
}): StoredAdjustment[] => {
  const all = readStore().adjustments;
  return all.filter(
    (a) => (!filter?.status || a.status === filter.status) && (!filter?.parameter || a.parameter === filter.parameter),
  );
};

export const listRecommendations = (filter?: { status?: StoredRecommendation['status'] }): StoredRecommendation[] => {
  const all = readStore().recommendations;
  return all.filter((r) => !filter?.status || r.status === filter.status);
};

export const updateAdjustmentStatus = (id: string, status: StoredAdjustment['status']): StoredAdjustment | null => {
  const store = readStore();
  const adj = store.adjustments.find((a) => a.id === id);
  if (!adj) return null;
  adj.status = status;
  writeStore(store);
  return adj;
};

export const updateRecommendationStatus = (
  id: string,
  status: StoredRecommendation['status'],
  publishedPostId?: string,
): StoredRecommendation | null => {
  const store = readStore();
  const rec = store.recommendations.find((r) => r.id === id);
  if (!rec) return null;
  rec.status = status;
  if (publishedPostId) rec.publishedPostId = publishedPostId;
  writeStore(store);
  return rec;
};

/** Annotate an adjustment with the observed KPI delta after it was applied. */
export const recordAdjustmentImpact = (
  id: string,
  metric: string,
  before: number,
  after: number,
): StoredAdjustment | null => {
  const store = readStore();
  const adj = store.adjustments.find((a) => a.id === id);
  if (!adj) return null;
  const deltaPct = before > 0 ? +(((after - before) / before) * 100).toFixed(2) : 0;
  adj.observedDelta = { metric, before, after, deltaPct };
  writeStore(store);
  return adj;
};

export const getLastOptimizationSummary = (): {
  ranAt: string | null;
  summary: string | null;
} => {
  const store = readStore();
  return {
    ranAt: store.lastOptimizationRun ?? null,
    summary: store.lastExecutiveSummary ?? null,
  };
};
