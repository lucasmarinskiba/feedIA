/**
 * Post Publish Optimizer — cierra el loop de métricas reales post-publicación.
 *
 * 24h, 48h y 7d después de publicar, compara performance real vs predicción
 * y genera variantes de contenido si el post sub-performa.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { z } from 'zod';
import { log } from '../../agent/logger.js';
import { audit } from '../../compliance/auditLog.js';
import { getRecentPosts, type PostRecord, updatePostLessons } from '../analytics/performanceDB.js';
import { getTopPerformers } from '../analytics/performanceDB.js';

const OPTIMIZER_PATH = join(process.cwd(), 'data', 'runtime', 'post-optimizer.json');

export const OptimizationWindowSchema = z.enum(['24h', '48h', '7d']);
export type OptimizationWindow = z.infer<typeof OptimizationWindowSchema>;

export interface OptimizationReview {
  postId: string;
  window: OptimizationWindow;
  checkedAt: string;
  predictedScore?: number;
  actualScore: number;
  delta: number;
  status: 'performing' | 'underperforming' | 'viral';
  action?: 'variant-queued' | 'boost' | 'none';
  lesson?: string;
}

interface OptimizerStore {
  version: number;
  reviews: OptimizationReview[];
  queuedVariants: Array<{
    originalPostId: string;
    suggestedChange: string;
    reason: string;
    createdAt: string;
  }>;
  lastUpdated: string;
}

const DEFAULT_STORE: OptimizerStore = {
  version: 1,
  reviews: [],
  queuedVariants: [],
  lastUpdated: new Date().toISOString(),
};

const ensureDir = (): void => {
  const dir = join(process.cwd(), 'data', 'runtime');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
};

const loadStore = (): OptimizerStore => {
  try {
    ensureDir();
    if (!existsSync(OPTIMIZER_PATH)) return structuredClone(DEFAULT_STORE);
    return JSON.parse(readFileSync(OPTIMIZER_PATH, 'utf8')) as OptimizerStore;
  } catch {
    return structuredClone(DEFAULT_STORE);
  }
};

const saveStore = (store: OptimizerStore): void => {
  ensureDir();
  store.lastUpdated = new Date().toISOString();
  writeFileSync(OPTIMIZER_PATH, JSON.stringify(store, null, 2), 'utf8');
};

const classifyPerformance = (delta: number): OptimizationReview['status'] => {
  if (delta >= 20) return 'viral';
  if (delta <= -20) return 'underperforming';
  return 'performing';
};

export const reviewPost = (
  post: PostRecord,
  predictedScore?: number,
  window: OptimizationWindow = '48h',
): OptimizationReview => {
  const actualScore = post.actualScore;
  const prediction = predictedScore ?? 50;
  const delta = actualScore - prediction;
  const status = classifyPerformance(delta);

  let action: OptimizationReview['action'] = 'none';
  let lesson: string | undefined;

  if (status === 'underperforming') {
    action = 'variant-queued';
    const topPerformers = getTopPerformers(post.format, 3);
    const winnerHook = topPerformers[0]?.hookText;
    lesson = winnerHook
      ? `Sub-performó ${delta.toFixed(0)} pts. Hook ganador reciente: "${winnerHook.slice(0, 60)}..."`
      : `Sub-performó ${delta.toFixed(0)} pts. Sin top performers suficientes para comparar.`;
  } else if (status === 'viral') {
    action = 'boost';
    lesson = `Over-performó ${delta.toFixed(0)} pts. Analizar qué funcionó y replicar.`;
  } else {
    lesson = `Performó según lo esperado (${delta.toFixed(0)} pts).`;
  }

  const review: OptimizationReview = {
    postId: post.id,
    window,
    checkedAt: new Date().toISOString(),
    predictedScore: prediction,
    actualScore,
    delta,
    status,
    action,
    lesson,
  };

  const store = loadStore();
  store.reviews.push(review);
  if (store.reviews.length > 500) store.reviews = store.reviews.slice(-500);

  if (action === 'variant-queued') {
    store.queuedVariants.push({
      originalPostId: post.id,
      suggestedChange: `Probar nuevo hook para: ${post.hookText.slice(0, 80)}`,
      reason: lesson,
      createdAt: new Date().toISOString(),
    });
  }

  saveStore(store);

  if (lesson) {
    updatePostLessons(post.id, [...post.lessons, `[${review.checkedAt}] ${lesson}`]);
  }

  audit({
    action: 'API_REQUEST',
    outcome: 'success',
    reason: `POST_OPTIMIZATION: ${post.id} — ${status} (delta ${delta})`,
  });

  log.info(`[PostPublishOptimizer] ${post.id}: ${status} (delta=${delta}, score=${actualScore})`);
  return review;
};

export const runPostOptimizationRound = (window: OptimizationWindow = '48h'): OptimizationReview[] => {
  const hours = window === '24h' ? 24 : window === '48h' ? 48 : 168;
  const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
  const now = new Date().toISOString();

  const posts = getRecentPosts(30).filter((p) => p.publishedAt >= cutoff && p.publishedAt <= now);

  const store = loadStore();
  const alreadyReviewed = new Set(store.reviews.filter((r) => r.window === window).map((r) => r.postId));

  const reviews: OptimizationReview[] = [];
  for (const post of posts) {
    if (alreadyReviewed.has(post.id)) continue;
    reviews.push(reviewPost(post, undefined, window));
  }

  return reviews;
};

export const getQueuedVariants = (limit = 10): OptimizerStore['queuedVariants'] => {
  return loadStore().queuedVariants.slice(-limit).reverse();
};

export const getOptimizationStats = (): {
  totalReviews: number;
  underperforming: number;
  viral: number;
  performing: number;
  queuedVariants: number;
} => {
  const store = loadStore();
  return {
    totalReviews: store.reviews.length,
    underperforming: store.reviews.filter((r) => r.status === 'underperforming').length,
    viral: store.reviews.filter((r) => r.status === 'viral').length,
    performing: store.reviews.filter((r) => r.status === 'performing').length,
    queuedVariants: store.queuedVariants.length,
  };
};
