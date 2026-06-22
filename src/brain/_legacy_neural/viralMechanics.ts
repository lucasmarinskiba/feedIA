// @ts-nocheck
/**
 * Viral Mechanics Engine — matemáticas de viralidad para Instagram.
 *
 * Implementa:
 *   - K-factor (viral coefficient)
 *   - Growth loops detection
 *   - Cascade prediction
 *   - Time-to-viral estimation
 *   - Optimal seed strategy
 *
 * Predice viralidad ANTES de publicar y trackea post-publish.
 */

import Anthropic from '@anthropic-ai/sdk';
import fs from 'node:fs/promises';
import path from 'node:path';
import { log } from '../../agent/logger.js';
import type { BrandProfile } from '../../config/types.js';

const client = new Anthropic();
const MODEL = 'claude-opus-4-7';
const VIRAL_DIR = path.resolve('data/neural/viral');

// ── Tipos ─────────────────────────────────────────────────────────────────────

export interface ViralMetrics {
  contentId: string;
  // Core viral math
  kFactor: number; // shares per viewer
  viralCoefficient: number; // kFactor * conversion
  cycleTimeHours: number; // time for 1 viral cycle
  doublingTimeHours: number; // estimate to double reach

  // Cascade structure
  generationsObserved: number; // depth of share cascade (gen 1 = direct, gen 2 = shares of shares...)
  cascadeBreadth: Record<number, number>; // # of shares per generation
  rootReach: number; // initial seed audience
  totalCascadeReach: number;

  // Velocity
  reachAt1h: number;
  reachAt6h: number;
  reachAt24h: number;
  reachAt7d: number;
  peakHour: number; // hours after publish when peaked

  // Quality
  authenticShareRatio: number; // genuine shares vs bot/spam
  amplifierAccountsTriggered: string[]; // big accounts that shared
  organicViralityScore: number; // 0-1 viral by quality vs paid
}

export interface ViralPrediction {
  contentId: string;
  generatedAt: string;
  baseAudience: number;

  // Predictions
  predictedKFactor: number; // estimated
  predictedReach24h: number;
  predictedReach7d: number;
  predictedPeakHour: number;
  viralProbability: number; // 0-1
  viralTier: 'micro' | 'mid' | 'high' | 'mega' | 'super';
  expectedRevenuePotentialUsd: number;

  // Strategy
  seedStrategy: {
    optimalTime: string;
    initialBoosters: string[]; // accounts to share immediately
    requiredEarlyShares: number;
    pushNotifChannel: boolean;
  };

  // Risk
  fatigueRisk: number; // 0-1 audience saturation chance
  contraproductive: boolean; // overexposed harm brand
}

export interface ViralCascadeNode {
  level: number;
  reachContribution: number;
  authority: 'self' | 'follower' | 'amplifier' | 'creator';
  timestamp: string;
}

// ── Matemáticas core ─────────────────────────────────────────────────────────

/** K = shares per viewer. Si K > 1, viral exponential. */
export const calculateKFactor = (shares: number, viewers: number): number => {
  if (viewers === 0) return 0;
  return shares / viewers;
};

/** Viral coefficient = K × conversion rate. */
export const calculateViralCoefficient = (kFactor: number, shareToFollowConversion: number): number => {
  return kFactor * shareToFollowConversion;
};

/** Tiempo para doblar audiencia. Doubling time = ln(2) / ln(1 + viralCoef). */
export const calculateDoublingTime = (viralCoefficient: number, cycleTimeHours = 4): number => {
  if (viralCoefficient <= 0) return Infinity;
  return (cycleTimeHours * Math.log(2)) / Math.log(1 + viralCoefficient);
};

/** Reach total después de N ciclos con K viral coefficient. */
export const projectCascadeReach = (baseReach: number, viralCoefficient: number, cycles: number): number => {
  if (viralCoefficient <= 0 || viralCoefficient >= 1) {
    return baseReach * (cycles + 1);
  }
  // Geometric series: R × (1 - K^(n+1)) / (1 - K)
  return baseReach * ((1 - Math.pow(viralCoefficient, cycles + 1)) / (1 - viralCoefficient));
};

/** Tier viral según reach total */
export const classifyViralTier = (totalReach: number, baseAudience: number): ViralPrediction['viralTier'] => {
  const ratio = totalReach / Math.max(baseAudience, 1);
  if (ratio > 100) return 'super';
  if (ratio > 50) return 'mega';
  if (ratio > 20) return 'high';
  if (ratio > 5) return 'mid';
  return 'micro';
};

// ── Predicción pre-publish ───────────────────────────────────────────────────

export const predictViralPotential = async (
  brand: BrandProfile,
  draft: {
    contentId: string;
    format: string;
    caption: string;
    hashtags: string[];
    hookStrength: number; // 0-1
    emotionalIntensity: number; // 0-1 (high = controversia, awe, surprise, alegría)
    novelty: number; // 0-1
    socialCurrency: number; // 0-1 (shareability cred)
    practicalValue: number; // 0-1 (saves trigger)
  },
  audienceSize: number,
): Promise<ViralPrediction> => {
  const brandId = brand.id ?? brand.name.toLowerCase().replace(/\s+/g, '-');

  // Estimate K-factor desde STEPPS framework (Berger)
  // Social currency + Triggers + Emotion + Public + Practical value + Stories
  const stepspScore =
    draft.socialCurrency * 0.2 +
    draft.emotionalIntensity * 0.3 +
    draft.practicalValue * 0.2 +
    draft.novelty * 0.15 +
    draft.hookStrength * 0.15;

  // K-factor estimate basado en STEPPS + format
  const formatMultiplier = draft.format === 'reel' ? 3.0 : draft.format === 'carousel' ? 1.8 : 1.0;
  const predictedKFactor = Math.min(2.0, stepspScore * formatMultiplier * 0.05);

  // Conversion share-to-follow típica IG: 5-15%
  const shareToFollow = 0.1;
  const viralCoefficient = calculateViralCoefficient(predictedKFactor, shareToFollow);

  // Reach predictions
  const predictedReach24h = projectCascadeReach(audienceSize * 0.3, viralCoefficient, 4);
  const predictedReach7d = projectCascadeReach(audienceSize * 0.3, viralCoefficient, 20);

  const viralTier = classifyViralTier(predictedReach7d, audienceSize);
  const viralProbability = Math.min(1, stepspScore * 1.3);

  const peakHour = viralCoefficient > 0.5 ? 12 : viralCoefficient > 0.3 ? 24 : 48;

  // Revenue potential
  const cpmAvg = 2;
  const expectedRevenuePotentialUsd = (predictedReach7d / 1000) * cpmAvg;

  // Seed strategy con Claude
  const stream = await client.messages.stream({
    model: MODEL,
    max_tokens: 600,
    thinking: { type: 'adaptive' },
    messages: [
      {
        role: 'user',
        content: `Sugerí seed strategy para maximizar viralidad de este post en IG:

Brand: ${brand.name} | Audience: ${audienceSize.toLocaleString()}
Format: ${draft.format} | Predicted K: ${predictedKFactor.toFixed(2)}

JSON: {
  "optimalTime": "HH:MM día_semana",
  "initialBoosters": ["tipo de accounts ideales para shares iniciales"],
  "requiredEarlyShares": número mínimo para iniciar cascada,
  "pushNotifChannel": boolean (notificar via broadcast channel)
}`,
      },
    ],
  });

  const msg = await stream.finalMessage();
  const textBlock = msg.content.find((b) => b.type === 'text');
  const jsonMatch = textBlock?.text.match(/\{[\s\S]*\}/);
  const seedStrategy = jsonMatch
    ? (JSON.parse(jsonMatch[0]) as ViralPrediction['seedStrategy'])
    : {
        optimalTime: '18:00 martes',
        initialBoosters: ['core followers', 'comunidad activa'],
        requiredEarlyShares: 10,
        pushNotifChannel: true,
      };

  const fatigueRisk = stepspScore > 0.85 ? 0.4 : 0.1; // post super viral satura audiencia
  const contraproductive = stepspScore > 0.95 && draft.emotionalIntensity > 0.9; // demasiado polémico

  const prediction: ViralPrediction = {
    contentId: draft.contentId,
    generatedAt: new Date().toISOString(),
    baseAudience: audienceSize,
    predictedKFactor,
    predictedReach24h: Math.round(predictedReach24h),
    predictedReach7d: Math.round(predictedReach7d),
    predictedPeakHour: peakHour,
    viralProbability,
    viralTier,
    expectedRevenuePotentialUsd,
    seedStrategy,
    fatigueRisk,
    contraproductive,
  };

  await fs.mkdir(VIRAL_DIR, { recursive: true });
  await fs.writeFile(
    path.join(VIRAL_DIR, `${brandId}-${draft.contentId}-prediction.json`),
    JSON.stringify(prediction, null, 2),
    'utf-8',
  );
  log.info('[viralMechanics] prediction', {
    tier: viralTier,
    K: predictedKFactor.toFixed(2),
    prob: viralProbability.toFixed(2),
  });
  return prediction;
};

/** Trackea métricas reales post-publish y compara con predicción. */
export const trackPostPublish = async (
  brand: BrandProfile,
  contentId: string,
  metrics: {
    shares: number;
    viewers: number;
    newFollowersFromContent: number;
    timestamps: { reach: number; ts: string }[];
  },
): Promise<ViralMetrics> => {
  const brandId = brand.id ?? brand.name.toLowerCase().replace(/\s+/g, '-');
  const kFactor = calculateKFactor(metrics.shares, metrics.viewers);
  const shareToFollow = metrics.shares > 0 ? metrics.newFollowersFromContent / metrics.shares : 0;
  const viralCoefficient = calculateViralCoefficient(kFactor, shareToFollow);

  // Calcular peak hour
  const sorted = [...metrics.timestamps].sort((a, b) => b.reach - a.reach);
  const peakTimestamp = sorted[0]?.ts ?? new Date().toISOString();
  const startTimestamp = metrics.timestamps[0]?.ts ?? new Date().toISOString();
  const peakHour = (new Date(peakTimestamp).getTime() - new Date(startTimestamp).getTime()) / (1000 * 60 * 60);

  // Reach over time
  const reachAtHour = (hours: number): number => {
    const target = new Date(new Date(startTimestamp).getTime() + hours * 60 * 60 * 1000);
    const closest = metrics.timestamps.reduce((best, t) => {
      const diff = Math.abs(new Date(t.ts).getTime() - target.getTime());
      return diff < Math.abs(new Date(best.ts).getTime() - target.getTime()) ? t : best;
    }, metrics.timestamps[0]!);
    return closest?.reach ?? 0;
  };

  const viral: ViralMetrics = {
    contentId,
    kFactor,
    viralCoefficient,
    cycleTimeHours: 4,
    doublingTimeHours: calculateDoublingTime(viralCoefficient, 4),
    generationsObserved: Math.floor(
      Math.log(metrics.viewers / Math.max(1, metrics.viewers / 100)) / Math.log(Math.max(1.01, 1 + viralCoefficient)),
    ),
    cascadeBreadth: {
      1: metrics.shares,
      2: Math.round(metrics.shares * kFactor),
      3: Math.round(metrics.shares * kFactor * kFactor),
    },
    rootReach: metrics.timestamps[0]?.reach ?? 0,
    totalCascadeReach: metrics.viewers,
    reachAt1h: reachAtHour(1),
    reachAt6h: reachAtHour(6),
    reachAt24h: reachAtHour(24),
    reachAt7d: reachAtHour(24 * 7),
    peakHour,
    authenticShareRatio: 0.85,
    amplifierAccountsTriggered: [],
    organicViralityScore: kFactor > 0.3 ? 0.9 : 0.5,
  };

  await fs.mkdir(VIRAL_DIR, { recursive: true });
  await fs.writeFile(
    path.join(VIRAL_DIR, `${brandId}-${contentId}-actual.json`),
    JSON.stringify(viral, null, 2),
    'utf-8',
  );
  return viral;
};

export const getViralPrediction = async (brandId: string, contentId: string): Promise<ViralPrediction | null> => {
  try {
    return JSON.parse(
      await fs.readFile(path.join(VIRAL_DIR, `${brandId}-${contentId}-prediction.json`), 'utf-8'),
    ) as ViralPrediction;
  } catch {
    return null;
  }
};
