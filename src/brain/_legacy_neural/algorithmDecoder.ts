// @ts-nocheck
/**
 * Algorithm Decoder — modelo del algoritmo IG.
 *
 * Predicts what content will surface to each audience segment.
 * Combines public knowledge of Meta ranking signals + empirical patterns
 * from postPerformanceAnalyzer + cross-user data.
 *
 * Outputs: probabilistic distribution score per surface (Feed, Reels, Explore, Stories).
 */

import Anthropic from '@anthropic-ai/sdk';
import fs from 'node:fs/promises';
import path from 'node:path';
import { log } from '../../agent/logger.js';
import type { BrandProfile } from '../../config/types.js';

const client = new Anthropic();
const MODEL = 'claude-opus-4-7';
const ALGO_DIR = path.resolve('data/neural/algorithm');

// ── Tipos ─────────────────────────────────────────────────────────────────────

export type IGSurface = 'feed' | 'reels' | 'explore' | 'stories' | 'search' | 'profile' | 'shop';

export interface AlgorithmSignals {
  // Content quality signals
  watchTimeRatio: number; // 0-1 (completion rate)
  saveRatio: number; // saves / impressions
  shareRatio: number; // shares / impressions
  commentReplyDepth: number; // avg replies per comment
  likeVelocity: number; // likes/min in first hour

  // Relationship signals
  closeFriendsLevel: number; // 0-1 strength bond with viewer
  pastInteractionFrequency: number; // 0-1 history
  mutualFollowsCount: number;

  // Recency
  hoursOld: number;
  publishingConsistency: number; // 0-1 cadence regularity

  // Topical
  topicRelevance: number; // 0-1 NLP match with audience interests
  hashtagSaturation: number; // 0-1 (1 = oversaturated)

  // Negative
  reportRate: number;
  hideRate: number;
  unfollowsTriggered: number;
}

export interface SurfacePrediction {
  surface: IGSurface;
  probability: number; // 0-1 to appear here
  estimatedReach: number;
  estimatedDuration: 'hours' | 'days' | 'weeks'; // how long it stays distributed
  ranking: number; // est position in feed/explore (1 = top)
  topAudienceSegments: string[];
}

export interface AlgorithmPrediction {
  contentId: string;
  generatedAt: string;
  surfaces: SurfacePrediction[];
  primarySurface: IGSurface; // where it'll perform best
  expectedFirstHour: { likes: number; comments: number; saves: number; shares: number; reach: number };
  expected24h: { reach: number; engagement: number };
  expected7d: { reach: number; engagement: number };
  viralityScore: number; // 0-1 chance to go viral
  surfaceabilityScore: number; // 0-100 overall algorithm fit
  blockers: string[]; // what reduces distribution
  amplifiers: string[]; // what increases distribution
}

// ── Algorithm rules (Meta public + empirical 2025-2026) ─────────────────────

const SURFACE_WEIGHTS: Record<IGSurface, Partial<Record<keyof AlgorithmSignals, number>>> = {
  feed: {
    closeFriendsLevel: 0.25,
    pastInteractionFrequency: 0.2,
    hoursOld: -0.15,
    likeVelocity: 0.15,
    commentReplyDepth: 0.1,
    topicRelevance: 0.1,
    publishingConsistency: 0.05,
  },
  reels: {
    watchTimeRatio: 0.3,
    shareRatio: 0.2,
    saveRatio: 0.15,
    likeVelocity: 0.15,
    topicRelevance: 0.1,
    hashtagSaturation: -0.1,
  },
  explore: {
    saveRatio: 0.25,
    shareRatio: 0.2,
    topicRelevance: 0.2,
    likeVelocity: 0.15,
    hashtagSaturation: -0.1,
    watchTimeRatio: 0.1,
  },
  stories: {
    closeFriendsLevel: 0.4,
    pastInteractionFrequency: 0.3,
    hoursOld: -0.2,
    publishingConsistency: 0.1,
  },
  search: {
    topicRelevance: 0.35,
    hashtagSaturation: -0.2,
    saveRatio: 0.15,
    publishingConsistency: 0.15,
    watchTimeRatio: 0.15,
  },
  profile: {
    pastInteractionFrequency: 0.5,
    closeFriendsLevel: 0.3,
    publishingConsistency: 0.2,
  },
  shop: {
    saveRatio: 0.4,
    topicRelevance: 0.3,
    watchTimeRatio: 0.15,
    shareRatio: 0.15,
  },
};

// ── Predicción ────────────────────────────────────────────────────────────────

const computeSurfaceScore = (signals: AlgorithmSignals, surface: IGSurface): number => {
  const weights = SURFACE_WEIGHTS[surface];
  let score = 0;
  let totalWeight = 0;
  for (const [signalName, weight] of Object.entries(weights)) {
    const value = signals[signalName as keyof AlgorithmSignals];
    if (value === undefined) continue;
    // Negative weights inverse value
    const contribution = weight! * (weight! < 0 ? 1 - value : value);
    score += contribution;
    totalWeight += Math.abs(weight!);
  }
  // Penalize negative signals
  const negPenalty =
    (signals.reportRate ?? 0) * 0.3 + (signals.hideRate ?? 0) * 0.2 + (signals.unfollowsTriggered / 100) * 0.1;
  return Math.max(0, Math.min(1, (totalWeight > 0 ? score / totalWeight : 0) - negPenalty));
};

const detectAmplifiers = (signals: AlgorithmSignals): string[] => {
  const amp: string[] = [];
  if (signals.watchTimeRatio > 0.7) amp.push('Watch time alto (>70%) — Reels amplification activado');
  if (signals.saveRatio > 0.1) amp.push('Saves ratio top 10% — Explore boost');
  if (signals.shareRatio > 0.05) amp.push('Shares ratio fuerte — viral coefficient elevado');
  if (signals.likeVelocity > 50) amp.push('Like velocity primera hora alto — initial boost activado');
  if (signals.publishingConsistency > 0.8) amp.push('Cadencia consistente — algoritmo confía cuenta activa');
  if (signals.commentReplyDepth > 2) amp.push('Comment threads largos — conversational boost');
  return amp;
};

const detectBlockers = (signals: AlgorithmSignals): string[] => {
  const blocks: string[] = [];
  if (signals.hashtagSaturation > 0.7) blocks.push('Hashtags saturados — compite contra millones');
  if (signals.watchTimeRatio < 0.3) blocks.push('Watch time bajo (<30%) — Reels deprioritized');
  if (signals.hoursOld > 48) blocks.push('Post >48h — fuera de recency window');
  if (signals.reportRate > 0.01) blocks.push('Report rate elevado — distribution restringida');
  if (signals.hideRate > 0.02) blocks.push('Hide rate elevado — negative signal fuerte');
  if (signals.topicRelevance < 0.4) blocks.push('Topic relevance baja — no matchea interests audience');
  return blocks;
};

export const predictAlgorithmReach = async (
  brand: BrandProfile,
  contentId: string,
  signals: AlgorithmSignals,
  audienceSize: number,
): Promise<AlgorithmPrediction> => {
  const brandId = brand.id ?? brand.name.toLowerCase().replace(/\s+/g, '-');

  const surfaces: SurfacePrediction[] = (
    ['feed', 'reels', 'explore', 'stories', 'search', 'profile', 'shop'] as IGSurface[]
  )
    .map((surface) => {
      const probability = computeSurfaceScore(signals, surface);
      let baseReach: number;
      switch (surface) {
        case 'feed':
          baseReach = audienceSize * 0.3;
          break;
        case 'reels':
          baseReach = audienceSize * 0.6;
          break;
        case 'explore':
          baseReach = audienceSize * 5.0;
          break; // viral potential
        case 'stories':
          baseReach = audienceSize * 0.2;
          break;
        case 'search':
          baseReach = audienceSize * 0.1;
          break;
        case 'profile':
          baseReach = audienceSize * 0.05;
          break;
        case 'shop':
          baseReach = audienceSize * 0.08;
          break;
      }
      const estimatedReach = Math.round(baseReach * probability);
      return {
        surface,
        probability,
        estimatedReach,
        estimatedDuration:
          surface === 'stories' ? 'hours' : surface === 'reels' || surface === 'explore' ? 'weeks' : 'days',
        ranking: Math.max(1, Math.round((1 - probability) * 100)),
        topAudienceSegments: probability > 0.5 ? ['core', 'engaged'] : ['lookalike'],
      };
    })
    .sort((a, b) => b.estimatedReach - a.estimatedReach);

  const primarySurface = surfaces[0]?.surface ?? 'feed';
  const totalReach24h = surfaces.reduce((sum, s) => sum + s.estimatedReach * 0.6, 0);
  const totalReach7d = surfaces.reduce((sum, s) => sum + s.estimatedReach, 0);
  const surfaceabilityScore = Math.round(surfaces[0]?.probability ?? 0) * 100;

  const viralityScore = Math.min(
    1,
    signals.shareRatio * 5 + signals.saveRatio * 3 + Math.max(0, (signals.likeVelocity - 30) / 200),
  );

  const prediction: AlgorithmPrediction = {
    contentId,
    generatedAt: new Date().toISOString(),
    surfaces,
    primarySurface,
    expectedFirstHour: {
      likes: Math.round(audienceSize * 0.05 * (surfaces[0]?.probability ?? 0)),
      comments: Math.round(audienceSize * 0.003 * (surfaces[0]?.probability ?? 0)),
      saves: Math.round(audienceSize * 0.008 * signals.saveRatio * 10),
      shares: Math.round(audienceSize * 0.004 * signals.shareRatio * 10),
      reach: Math.round(audienceSize * 0.15 * (surfaces[0]?.probability ?? 0)),
    },
    expected24h: { reach: Math.round(totalReach24h), engagement: totalReach24h * 0.05 },
    expected7d: { reach: Math.round(totalReach7d), engagement: totalReach7d * 0.03 },
    viralityScore,
    surfaceabilityScore,
    blockers: detectBlockers(signals),
    amplifiers: detectAmplifiers(signals),
  };

  // Persist
  await fs.mkdir(ALGO_DIR, { recursive: true });
  await fs.writeFile(
    path.join(ALGO_DIR, `${brandId}-${contentId}-prediction.json`),
    JSON.stringify(prediction, null, 2),
    'utf-8',
  );
  log.info('[algorithmDecoder] prediction', {
    brandId,
    primarySurface,
    virality: viralityScore.toFixed(2),
    surfaceability: surfaceabilityScore,
  });
  return prediction;
};

/** Estima signals desde un draft de contenido sin haberlo publicado. */
export const estimateSignalsFromDraft = async (
  brand: BrandProfile,
  draft: { caption: string; format: string; hashtags: string[]; timeOfDay?: number },
): Promise<AlgorithmSignals> => {
  const stream = await client.messages.stream({
    model: MODEL,
    max_tokens: 800,
    thinking: { type: 'adaptive' },
    system: 'Predictor de algorithm signals para Instagram. Estimás valores 0-1 antes de publicar.',
    messages: [
      {
        role: 'user',
        content: `Estimá signals algorítmicos del siguiente draft para ${brand.name}:

Format: ${draft.format}
Caption (primeras 200 chars): "${draft.caption.slice(0, 200)}"
Hashtags: ${draft.hashtags.slice(0, 10).join(' ')}
${draft.timeOfDay !== undefined ? `Hora publicación: ${draft.timeOfDay}h` : ''}

JSON: {
  "watchTimeRatio": 0-1, "saveRatio": 0-1, "shareRatio": 0-1, "commentReplyDepth": 0-5,
  "likeVelocity": 0-200, "topicRelevance": 0-1, "hashtagSaturation": 0-1,
  "publishingConsistency": 0-1, "closeFriendsLevel": 0-1, "pastInteractionFrequency": 0-1,
  "mutualFollowsCount": número, "hoursOld": 0, "reportRate": 0, "hideRate": 0, "unfollowsTriggered": 0
}`,
      },
    ],
  });

  const msg = await stream.finalMessage();
  const textBlock = msg.content.find((b) => b.type === 'text');
  const jsonMatch = textBlock?.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return {
      watchTimeRatio: 0.5,
      saveRatio: 0.05,
      shareRatio: 0.02,
      commentReplyDepth: 1,
      likeVelocity: 30,
      topicRelevance: 0.6,
      hashtagSaturation: 0.5,
      publishingConsistency: 0.7,
      closeFriendsLevel: 0.4,
      pastInteractionFrequency: 0.4,
      mutualFollowsCount: 0,
      hoursOld: 0,
      reportRate: 0,
      hideRate: 0,
      unfollowsTriggered: 0,
    };
  }
  return JSON.parse(jsonMatch[0]) as AlgorithmSignals;
};
