/**
 * A/B Test Engine — crea y cierra experimentos A/B de contenido en Instagram.
 *
 * Prueba hooks, CTAs y covers visuales del mismo contenido base.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { z } from 'zod';
import { log } from '../../agent/logger.js';
import { audit } from '../../compliance/auditLog.js';
import { getRecentPosts } from '../analytics/performanceDB.js';

const ABTEST_PATH = join(process.cwd(), 'data', 'runtime', 'ab-tests.json');

export const ABTestVariableSchema = z.enum(['hook', 'cta', 'cover', 'hashtags', 'caption']);
export type ABTestVariable = z.infer<typeof ABTestVariableSchema>;

export interface ABVariant {
  id: string;
  name: string; // ej: "Hook A", "Hook B"
  value: string;
  postId?: string;
  trafficSplit: number; // 0-1
  metrics?: {
    reach: number;
    engagementRate: number;
    saves: number;
    shares: number;
    score: number;
  };
}

export interface ABTest {
  id: string;
  idea: string;
  variable: ABTestVariable;
  variants: ABVariant[];
  status: 'design' | 'running' | 'completed';
  startedAt?: string;
  completedAt?: string;
  winnerVariantId?: string;
  winningReason?: string;
  createdAt: string;
}

interface ABTestStore {
  version: number;
  tests: ABTest[];
  lastUpdated: string;
}

const DEFAULT_STORE: ABTestStore = { version: 1, tests: [], lastUpdated: new Date().toISOString() };

const ensureDir = (): void => {
  const dir = join(process.cwd(), 'data', 'runtime');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
};

const loadStore = (): ABTestStore => {
  try {
    ensureDir();
    if (!existsSync(ABTEST_PATH)) return structuredClone(DEFAULT_STORE);
    return JSON.parse(readFileSync(ABTEST_PATH, 'utf8')) as ABTestStore;
  } catch {
    return structuredClone(DEFAULT_STORE);
  }
};

const saveStore = (store: ABTestStore): void => {
  ensureDir();
  store.lastUpdated = new Date().toISOString();
  writeFileSync(ABTEST_PATH, JSON.stringify(store, null, 2), 'utf8');
};

export const createABTest = (
  idea: string,
  variable: ABTestVariable,
  variants: Array<{ name: string; value: string }>,
): ABTest => {
  const store = loadStore();
  const trafficSplit = 1 / variants.length;

  const test: ABTest = {
    id: `abt-${Date.now()}`,
    idea,
    variable,
    variants: variants.map((v, idx) => ({
      id: `var-${idx}-${Date.now()}`,
      name: v.name,
      value: v.value,
      trafficSplit,
    })),
    status: 'design',
    createdAt: new Date().toISOString(),
  };

  store.tests.push(test);
  saveStore(store);
  log.info(`[ABTestEngine] Test creado: ${test.id} (${variable})`);
  return test;
};

export const startABTest = (testId: string): ABTest | null => {
  const store = loadStore();
  const test = store.tests.find((t) => t.id === testId);
  if (!test || test.status !== 'design') return null;
  test.status = 'running';
  test.startedAt = new Date().toISOString();
  saveStore(store);
  log.info(`[ABTestEngine] Test iniciado: ${testId}`);
  return test;
};

export const recordVariantPost = (testId: string, variantId: string, postId: string): ABTest | null => {
  const store = loadStore();
  const test = store.tests.find((t) => t.id === testId);
  if (!test) return null;
  const variant = test.variants.find((v) => v.id === variantId);
  if (!variant) return null;
  variant.postId = postId;
  saveStore(store);
  return test;
};

export const closeABTest = (testId: string): ABTest | null => {
  const store = loadStore();
  const test = store.tests.find((t) => t.id === testId);
  if (!test || test.status !== 'running') return null;

  // Buscar métricas de los posts asociados
  const posts = getRecentPosts(30);
  for (const variant of test.variants) {
    if (!variant.postId) continue;
    const post = posts.find((p) => p.id === variant.postId);
    if (post) {
      variant.metrics = {
        reach: post.metrics.reach,
        engagementRate: post.metrics.engagementRate,
        saves: post.metrics.saves,
        shares: post.metrics.shares,
        score: post.actualScore,
      };
    }
  }

  const scoredVariants = test.variants.filter((v) => v.metrics);
  if (scoredVariants.length > 0) {
    const winner = scoredVariants.reduce((best, current) =>
      (current.metrics?.score ?? 0) > (best.metrics?.score ?? 0) ? current : best,
    );
    test.winnerVariantId = winner.id;
    test.winningReason = `Score ${winner.metrics?.score} vs promedio ${Math.round(scoredVariants.reduce((s, v) => s + (v.metrics?.score ?? 0), 0) / scoredVariants.length)}`;
  }

  test.status = 'completed';
  test.completedAt = new Date().toISOString();
  saveStore(store);

  audit({
    action: 'API_REQUEST',
    outcome: 'success',
    reason: `ABTEST_CLOSED: ${testId} — winner: ${test.winnerVariantId ?? 'none'}`,
  });

  log.info(`[ABTestEngine] Test cerrado: ${testId}. Ganador: ${test.winnerVariantId ?? 'sin datos'}`);
  return test;
};

export const listABTests = (status?: ABTest['status']): ABTest[] => {
  const tests = loadStore().tests;
  return status ? tests.filter((t) => t.status === status) : tests;
};

export const getABTest = (testId: string): ABTest | null => loadStore().tests.find((t) => t.id === testId) ?? null;

export const generateHookVariants = (baseHook: string, count = 2): string[] => {
  const templates = [
    `⚠️ ${baseHook}`,
    `La verdad sobre ${baseHook.toLowerCase()}`,
    `3 cosas que nadie te dice sobre ${baseHook.toLowerCase()}`,
    `Si ${baseHook.toLowerCase()}, hacé esto:`,
    `❌ ${baseHook} ❌`,
  ];
  return templates.slice(0, count);
};
