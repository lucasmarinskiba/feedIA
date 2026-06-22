/**
 * Engagement Model — Modelo simple de predicción de engagement basado en features históricas.
 * Ponderación de features conocidos + reglas de negocio.
 */

import { log } from '../../agent/logger.js';

export interface EngagementFeatures {
  followerCount: number;
  avgLikesLast10: number;
  avgCommentsLast10: number;
  avgSavesLast10: number;
  postFrequency7d: number;
  replyRate: number; // 0-1
  storyFrequency7d: number;
  collaborationCount30d: number;
}

export interface EngagementScore {
  score: number; // 0-100
  health: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
  breakdown: Record<string, number>;
  recommendations: string[];
}

const clamp = (v: number, min: number, max: number): number => Math.max(min, Math.min(max, v));

export const calculateEngagementScore = (features: EngagementFeatures): EngagementScore => {
  const breakdown: Record<string, number> = {};

  // Like rate vs followers (benchmark: 3-6% is good)
  const likeRate = features.followerCount > 0 ? features.avgLikesLast10 / features.followerCount : 0;
  breakdown.likeRate = clamp(likeRate * 2000, 0, 25); // 5% = 25 pts

  // Comment depth
  const commentRatio = features.avgLikesLast10 > 0 ? features.avgCommentsLast10 / features.avgLikesLast10 : 0;
  breakdown.comments = clamp(commentRatio * 500, 0, 20); // 4% = 20 pts

  // Save rate (high intent)
  const saveRate = features.avgLikesLast10 > 0 ? features.avgSavesLast10 / features.avgLikesLast10 : 0;
  breakdown.saves = clamp(saveRate * 800, 0, 20); // 2.5% = 20 pts

  // Consistency
  breakdown.consistency = clamp(features.postFrequency7d * 3, 0, 15); // 5 posts/wk = 15 pts

  // Community care
  breakdown.community = clamp(features.replyRate * 20, 0, 10); // 50% reply = 10 pts

  // Stories (top-of-mind)
  breakdown.stories = clamp(features.storyFrequency7d * 1.5, 0, 10); // 7 stories/wk = 10 pts

  const score = Math.round(Object.values(breakdown).reduce((s, v) => s + v, 0));

  let health: EngagementScore['health'] = 'critical';
  if (score >= 80) health = 'excellent';
  else if (score >= 65) health = 'good';
  else if (score >= 45) health = 'fair';
  else if (score >= 25) health = 'poor';

  const recommendations: string[] = [];
  if (breakdown.likeRate < 10) recommendations.push('Mejorar hooks y visual para aumentar likes');
  if (breakdown.comments < 8) recommendations.push('Hacer preguntas abiertas en captions para más comentarios');
  if (breakdown.saves < 8) recommendations.push('Crear contenido de valor guardable (tips, guías, listas)');
  if (breakdown.consistency < 8) recommendations.push('Aumentar frecuencia de publicación');
  if (breakdown.community < 5) recommendations.push('Responder más comentarios y DMs');
  if (breakdown.stories < 5) recommendations.push('Usar stories diarias para mantener top-of-mind');

  log.info(`[EngagementModel] Score: ${score}/100 (${health})`);

  return { score, health, breakdown, recommendations };
};

export const benchmarkEngagement = (niche: string): { avgScore: number; topPerformersScore: number } => {
  const nicheMultipliers: Record<string, number> = {
    fitness: 1.1,
    food: 1.05,
    fashion: 0.95,
    tech: 0.9,
    education: 1.0,
    default: 1.0,
  };
  const mult = nicheMultipliers[niche.toLowerCase()] ?? nicheMultipliers.default ?? 1;
  return {
    avgScore: Math.round(45 * mult),
    topPerformersScore: Math.round(75 * mult),
  };
};
