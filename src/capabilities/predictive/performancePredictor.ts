/**
 * Performance Predictor — Predice performance de contenido antes de publicar.
 * Usa features del contenido + histórico de la marca para estimar reach, engagement, saves.
 */

import { log } from '../../agent/logger.js';

export interface ContentFeatures {
  format: 'reel' | 'carousel' | 'post' | 'story' | 'tiktok';
  hookStrength: number; // 0-1
  hasCta: boolean;
  videoLengthSec?: number;
  hashtagCount: number;
  mentionsCount?: number;
  aestheticScore?: number;
  audioType?: 'music' | 'voiceover' | 'trending' | 'none';
  timeOfDay?: string; // HH:MM
}

export interface PerformancePrediction {
  estimatedReach: number;
  estimatedEngagementRate: number;
  estimatedSaves: number;
  estimatedShares: number;
  confidence: number; // 0-1
  factors: Array<{ name: string; impact: number; direction: 'positive' | 'negative' | 'neutral' }>;
}

const HISTORICAL_AVG: Record<string, { reach: number; engagementRate: number }> = {
  reel: { reach: 5000, engagementRate: 0.08 },
  carousel: { reach: 3000, engagementRate: 0.06 },
  post: { reach: 2000, engagementRate: 0.04 },
  story: { reach: 1500, engagementRate: 0.05 },
  tiktok: { reach: 8000, engagementRate: 0.1 },
};

export const predictPerformance = (features: ContentFeatures): PerformancePrediction => {
  const base = HISTORICAL_AVG[features.format] ?? { reach: 2000, engagementRate: 0.05 };

  let reachMultiplier = 1;
  let engagementMultiplier = 1;
  const factors: Array<{ name: string; impact: number; direction: 'positive' | 'negative' | 'neutral' }> = [];

  // Hook strength
  if (features.hookStrength > 0.7) {
    reachMultiplier *= 1.3;
    engagementMultiplier *= 1.2;
    factors.push({ name: 'Hook fuerte', impact: 0.15, direction: 'positive' });
  } else if (features.hookStrength < 0.3) {
    reachMultiplier *= 0.7;
    engagementMultiplier *= 0.8;
    factors.push({ name: 'Hook débil', impact: -0.1, direction: 'negative' });
  }

  // CTA
  if (features.hasCta) {
    engagementMultiplier *= 1.15;
    factors.push({ name: 'CTA presente', impact: 0.08, direction: 'positive' });
  }

  // Video length
  if (features.format === 'reel' || features.format === 'tiktok') {
    const optimal = features.format === 'tiktok' ? 15 : 30;
    if (features.videoLengthSec && Math.abs(features.videoLengthSec - optimal) <= 5) {
      reachMultiplier *= 1.1;
      factors.push({ name: 'Duración óptima', impact: 0.05, direction: 'positive' });
    }
  }

  // Hashtags
  if (features.hashtagCount > 10) {
    reachMultiplier *= 0.9;
    factors.push({ name: 'Demasiados hashtags', impact: -0.05, direction: 'negative' });
  } else if (features.hashtagCount >= 3 && features.hashtagCount <= 8) {
    reachMultiplier *= 1.05;
    factors.push({ name: 'Hashtags balanceados', impact: 0.03, direction: 'positive' });
  }

  // Aesthetic
  if (features.aestheticScore && features.aestheticScore > 0.7) {
    reachMultiplier *= 1.1;
    factors.push({ name: 'Alta estética', impact: 0.06, direction: 'positive' });
  }

  // Audio
  if (features.audioType === 'trending') {
    reachMultiplier *= 1.2;
    factors.push({ name: 'Audio trending', impact: 0.12, direction: 'positive' });
  }

  const estimatedReach = Math.round(base.reach * reachMultiplier);
  const estimatedEngagementRate = Math.round(base.engagementRate * engagementMultiplier * 1000) / 1000;
  const estimatedSaves = Math.round(estimatedReach * estimatedEngagementRate * 0.15);
  const estimatedShares = Math.round(estimatedReach * estimatedEngagementRate * 0.08);

  // Confidence based on number of known features
  const knownFeatures = Object.values(features).filter((v) => v !== undefined && v !== null).length;
  const confidence = Math.min(1, Math.round((knownFeatures / 8) * 100) / 100);

  log.info(
    `[Predictor] ${features.format} → reach ${estimatedReach}, engagement ${(estimatedEngagementRate * 100).toFixed(1)}%, confidence ${confidence}`,
  );

  return {
    estimatedReach,
    estimatedEngagementRate,
    estimatedSaves,
    estimatedShares,
    confidence,
    factors,
  };
};

export const predictBatch = (items: ContentFeatures[]): PerformancePrediction[] => items.map(predictPerformance);
