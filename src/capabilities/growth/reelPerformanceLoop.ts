/**
 * Reel Performance Loop — analiza métricas de Reels para identificar drop-offs y optimizar.
 */

import { z } from 'zod';
import { log } from '../../agent/logger.js';
import { getRecentPosts, type PostRecord } from '../analytics/performanceDB.js';

export const ReelInsightSchema = z.object({
  postId: z.string(),
  hookStrength: z.enum(['strong', 'medium', 'weak']),
  retentionHealth: z.enum(['good', 'average', 'poor']),
  dropOffPoint: z.string().optional(), // ej: "segundo 3-5"
  recommendations: z.array(z.string()),
  estimatedCompletionRate: z.number().optional(),
});

export type ReelInsight = z.infer<typeof ReelInsightSchema>;

export const analyzeReelPerformance = (post: PostRecord): ReelInsight => {
  const m = post.metrics;
  const recommendations: string[] = [];

  // Heurísticas basadas en métricas disponibles
  const watchTime = m.watchTimePercent;
  const replays = m.replays;
  const saves = m.saves;
  const shares = m.shares;
  const engagementRate = m.engagementRate;

  let hookStrength: ReelInsight['hookStrength'] = 'medium';
  if (watchTime >= 50 && replays > m.reach * 0.05) {
    hookStrength = 'strong';
  } else if (watchTime < 25) {
    hookStrength = 'weak';
    recommendations.push('Hook no retiene. Probar hook más corto (<3s) con contraste o curiosidad.');
  }

  let retentionHealth: ReelInsight['retentionHealth'] = 'average';
  if (watchTime >= 60) {
    retentionHealth = 'good';
  } else if (watchTime < 35) {
    retentionHealth = 'poor';
    recommendations.push('Baja retención. Reducir duración o agregar pattern interrupts cada 2-3 segundos.');
  }

  if (saves < m.reach * 0.01) {
    recommendations.push('Pocos saves. Agregar valor guardable: checklist, plantilla, framework.');
  }
  if (shares < m.reach * 0.005) {
    recommendations.push('Pocos shares. Incluir trigger de identidad o "etiquetá a alguien".');
  }
  if (engagementRate < 3) {
    recommendations.push('Engagement bajo. Reforzar CTA específico en los últimos 5 segundos.');
  }

  let dropOffPoint: string | undefined;
  if (watchTime < 30) dropOffPoint = 'primeros 3 segundos';
  else if (watchTime < 60) dropOffPoint = 'mitad del reel';

  if (recommendations.length === 0) {
    recommendations.push('Reel performando bien. Replicar estructura en próximos videos.');
  }

  log.info(`[ReelPerformanceLoop] ${post.id}: hook=${hookStrength}, retention=${retentionHealth}`);

  return {
    postId: post.id,
    hookStrength,
    retentionHealth,
    dropOffPoint,
    recommendations,
    estimatedCompletionRate: watchTime,
  };
};

export const runReelPerformanceRound = (): ReelInsight[] => {
  const reels = getRecentPosts(14, 'reel');
  return reels.map(analyzeReelPerformance);
};

export const getTopReelPatterns = (limit = 5): Array<{ hook: string; score: number; insight: string }> => {
  const reels = getRecentPosts(30, 'reel')
    .filter((p) => p.metrics.watchTimePercent > 0)
    .sort((a, b) => b.actualScore - a.actualScore)
    .slice(0, limit);

  return reels.map((r) => {
    const insight = analyzeReelPerformance(r);
    return {
      hook: r.hookText,
      score: r.actualScore,
      insight: `${insight.hookStrength} hook, ${insight.retentionHealth} retention`,
    };
  });
};
