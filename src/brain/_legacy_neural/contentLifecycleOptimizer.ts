// @ts-nocheck
/**
 * Content Lifecycle Optimizer — next-best-action por post en cada fase.
 *
 * Cada post tiene ciclo de vida:
 *   - Pre-publish: optimizar antes de salir
 *   - Hour 0-6: critical window, monitor + boost
 *   - Day 1-3: consolidation, respond comments rapid
 *   - Week 1: repurposing decisions
 *   - Month 1+: long-tail content (evergreen vs decay)
 *
 * Decide qué acción tomar en cada fase para maximizar valor del post.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { log } from '../../agent/logger.js';
import type { BrandProfile } from '../../config/types.js';

const LIFECYCLE_DIR = path.resolve('data/neural/lifecycle');

// ── Tipos ─────────────────────────────────────────────────────────────────────

export type LifecyclePhase =
  | 'pre-publish'
  | 'launch'
  | 'momentum'
  | 'consolidation'
  | 'decay'
  | 'evergreen'
  | 'archived';

export type NextAction =
  | 'optimize-pre-publish'
  | 'boost-now'
  | 'reply-comments-fast'
  | 'share-to-stories'
  | 'pin-to-profile'
  | 'cross-post'
  | 'repurpose'
  | 'archive'
  | 'delete'
  | 'do-nothing';

export interface PostState {
  postId: string;
  publishedAt: string;
  format: 'carousel' | 'reel' | 'story' | 'post';
  currentMetrics: {
    impressions: number;
    reach: number;
    likes: number;
    comments: number;
    saves: number;
    shares: number;
    profileVisits: number;
    websiteClicks: number;
  };
  baseline: {
    expectedImpressions: number;
    expectedEngagement: number;
  };
  velocity: {
    // metrics/hour over last 6h
    impressionsPerHour: number;
    engagementPerHour: number;
  };
  lastUpdated: string;
}

export interface LifecycleDecision {
  postId: string;
  brandId: string;
  phase: LifecyclePhase;
  ageHours: number;
  performanceVsBaseline: number; // -1 to 1+, 0 = on baseline
  nextActions: Array<{
    action: NextAction;
    priority: 'critical' | 'high' | 'medium' | 'low';
    reason: string;
    expectedLift: number;
  }>;
  evergreenPotential: number; // 0-1
  shouldBoostAds: boolean;
  shouldRepurpose: boolean;
  shouldArchive: boolean;
  recommendedRepurposeFormats: string[];
}

// ── Determinación de phase ───────────────────────────────────────────────────

const determinePhase = (ageHours: number, performanceVsBaseline: number, velocity: number): LifecyclePhase => {
  if (ageHours < 0) return 'pre-publish';
  if (ageHours < 6) return 'launch';
  if (ageHours < 24 && velocity > 0.5) return 'momentum';
  if (ageHours < 72 && performanceVsBaseline > -0.3) return 'consolidation';
  if (ageHours > 720 && performanceVsBaseline > 0.5) return 'evergreen'; // 30 días con buen perf
  if (ageHours > 168 && performanceVsBaseline < -0.5) return 'archived';
  return 'decay';
};

// ── Decision engine ──────────────────────────────────────────────────────────

export const decideNextActions = async (brand: BrandProfile, postState: PostState): Promise<LifecycleDecision> => {
  const brandId = brand.id ?? brand.name.toLowerCase().replace(/\s+/g, '-');
  const ageHours = (Date.now() - new Date(postState.publishedAt).getTime()) / (1000 * 60 * 60);

  // Performance vs baseline
  const expectedImpressions = postState.baseline.expectedImpressions || 1;
  const performanceVsBaseline = (postState.currentMetrics.impressions - expectedImpressions) / expectedImpressions;

  // Velocity normalizada (vs expected)
  const expectedHourlyImpressions = expectedImpressions / 24;
  const velocity =
    expectedHourlyImpressions > 0 ? postState.velocity.impressionsPerHour / expectedHourlyImpressions : 0;

  const phase = determinePhase(ageHours, performanceVsBaseline, velocity);

  const nextActions: LifecycleDecision['nextActions'] = [];

  switch (phase) {
    case 'pre-publish':
      nextActions.push({
        action: 'optimize-pre-publish',
        priority: 'critical',
        reason: 'Aplicar optimizaciones antes de publicar',
        expectedLift: 0.2,
      });
      break;

    case 'launch':
      if (velocity > 1.5) {
        nextActions.push({
          action: 'boost-now',
          priority: 'critical',
          reason: 'Velocidad >150% de baseline en launch window — pour gas',
          expectedLift: 0.5,
        });
        nextActions.push({
          action: 'share-to-stories',
          priority: 'high',
          reason: 'Cross-promote en stories propias amplifica window',
          expectedLift: 0.2,
        });
      } else if (velocity < 0.5) {
        nextActions.push({
          action: 'share-to-stories',
          priority: 'high',
          reason: 'Launch lento — necesita boost orgánico',
          expectedLift: 0.3,
        });
      }
      nextActions.push({
        action: 'reply-comments-fast',
        priority: 'critical',
        reason: 'Primeros 6h críticos para ranking algoritmo',
        expectedLift: 0.3,
      });
      break;

    case 'momentum':
      nextActions.push({
        action: 'reply-comments-fast',
        priority: 'high',
        reason: 'Conversación activa — mantener velocity',
        expectedLift: 0.2,
      });
      if (velocity > 2) {
        nextActions.push({
          action: 'boost-now',
          priority: 'high',
          reason: 'Performance excepcional — invertir en boost',
          expectedLift: 0.6,
        });
      }
      if (performanceVsBaseline > 1) {
        nextActions.push({
          action: 'pin-to-profile',
          priority: 'medium',
          reason: 'Top performer — pin para new visitors',
          expectedLift: 0.1,
        });
      }
      break;

    case 'consolidation':
      if (performanceVsBaseline > 0.5) {
        nextActions.push({
          action: 'cross-post',
          priority: 'medium',
          reason: 'Performance sólido — cross-platform amplificación',
          expectedLift: 0.3,
        });
        nextActions.push({
          action: 'repurpose',
          priority: 'medium',
          reason: 'Top tier — repurpose en otros formatos',
          expectedLift: 0.4,
        });
      }
      nextActions.push({
        action: 'reply-comments-fast',
        priority: 'low',
        reason: 'Mantener engagement responder',
        expectedLift: 0.1,
      });
      break;

    case 'decay':
      if (performanceVsBaseline < -0.7) {
        nextActions.push({
          action: 'archive',
          priority: 'low',
          reason: 'Performance bajo — no aporta',
          expectedLift: 0,
        });
      } else {
        nextActions.push({
          action: 'do-nothing',
          priority: 'low',
          reason: 'Phase normal, dejar correr',
          expectedLift: 0,
        });
      }
      break;

    case 'evergreen':
      nextActions.push({
        action: 'repurpose',
        priority: 'high',
        reason: 'Evergreen detectado — repurpose múltiples formatos',
        expectedLift: 0.5,
      });
      nextActions.push({
        action: 'pin-to-profile',
        priority: 'medium',
        reason: 'Evergreen merece visibilidad permanente',
        expectedLift: 0.2,
      });
      break;

    case 'archived':
      nextActions.push({ action: 'archive', priority: 'low', reason: 'Performance crónico bajo', expectedLift: 0 });
      break;
  }

  // Repurpose suggestions por formato origen
  const repurposeMap: Record<PostState['format'], string[]> = {
    carousel: ['reel-tutorial', 'multiple-stories', 'static-post-quote', 'twitter-thread'],
    reel: ['carousel-recap', 'stories-series', 'youtube-short', 'tiktok'],
    story: ['highlight-permanent', 'carousel-compilation', 'reel-bts'],
    post: ['reel-explainer', 'carousel-expand', 'stories-question'],
  };

  const decision: LifecycleDecision = {
    postId: postState.postId,
    brandId,
    phase,
    ageHours: Math.round(ageHours * 10) / 10,
    performanceVsBaseline,
    nextActions: nextActions.sort((a, b) => {
      const order = { critical: 0, high: 1, medium: 2, low: 3 };
      return order[a.priority] - order[b.priority];
    }),
    evergreenPotential: phase === 'evergreen' ? 0.9 : performanceVsBaseline > 0.5 ? 0.6 : 0.2,
    shouldBoostAds: (phase === 'launch' && velocity > 1.5) || (phase === 'momentum' && performanceVsBaseline > 1),
    shouldRepurpose: performanceVsBaseline > 0.5,
    shouldArchive: phase === 'archived' || performanceVsBaseline < -0.7,
    recommendedRepurposeFormats: repurposeMap[postState.format] ?? [],
  };

  await fs.mkdir(LIFECYCLE_DIR, { recursive: true });
  await fs.writeFile(
    path.join(LIFECYCLE_DIR, `${brandId}-${postState.postId}-decision.json`),
    JSON.stringify(decision, null, 2),
    'utf-8',
  );
  log.info('[contentLifecycle] decided', { postId: postState.postId, phase, actions: nextActions.length });
  return decision;
};

/** Batch: analiza N posts en distintos lifecycle states. */
export const batchAnalyzeLifecycle = async (brand: BrandProfile, posts: PostState[]): Promise<LifecycleDecision[]> => {
  return Promise.all(posts.map((p) => decideNextActions(brand, p)));
};

/** Identifica top posts a repurposear. */
export const identifyRepurposeCandidates = async (
  brand: BrandProfile,
  posts: PostState[],
  limit = 5,
): Promise<LifecycleDecision[]> => {
  const decisions = await batchAnalyzeLifecycle(brand, posts);
  return decisions
    .filter((d) => d.shouldRepurpose)
    .sort((a, b) => b['evergreenPotential'] - a['evergreenPotential'])
    .slice(0, limit);
};
