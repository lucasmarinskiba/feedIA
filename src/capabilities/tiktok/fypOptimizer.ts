/**
 * TikTok FYP Optimizer — Optimización específica para el For You Page de TikTok
 * Entiende las métricas críticas del algoritmo FYP y genera recomendaciones.
 */

export interface FYPMetrics {
  completionRate: number;
  watchTimePct: number;
  fypReachPct: number;
  rewatchRate: number;
  shareRate: number;
  commentRate: number;
  saveRate: number;
  followsPerView: number;
  avgViewDurationSec: number;
  videoLengthSec: number;
}

export interface FYPScore {
  overall: number; // 0-100
  breakdown: {
    completion: number;
    engagement: number;
    retention: number;
    virality: number;
  };
  verdict: 'fyp_boost' | 'stable' | 'needs_work' | 'dead';
  recommendations: string[];
}

const scoreCompletion = (rate: number): number => {
  if (rate >= 0.75) return 100;
  if (rate >= 0.6) return 80;
  if (rate >= 0.45) return 60;
  if (rate >= 0.3) return 40;
  return 20;
};

const scoreEngagement = (metrics: FYPMetrics): number => {
  const shareW = metrics.shareRate * 100;
  const commentW = metrics.commentRate * 100;
  const saveW = metrics.saveRate * 100;
  const followW = metrics.followsPerView * 100;
  const raw = shareW * 3 + commentW * 2 + saveW * 2 + followW * 4;
  return Math.min(100, Math.round(raw));
};

const scoreRetention = (watchTimePct: number, rewatchRate: number): number => {
  const watchW = watchTimePct * 100;
  const rewatchW = rewatchRate * 100;
  return Math.min(100, Math.round(watchW * 0.6 + rewatchW * 0.4));
};

const scoreVirality = (metrics: FYPMetrics): number => {
  const fypW = metrics.fypReachPct * 100;
  const rewatchW = metrics.rewatchRate * 100;
  const shareW = metrics.shareRate * 100;
  return Math.min(100, Math.round(fypW * 0.5 + rewatchW * 0.3 + shareW * 0.2));
};

export const calculateFYPScore = (metrics: FYPMetrics): FYPScore => {
  const completion = scoreCompletion(metrics.completionRate);
  const engagement = scoreEngagement(metrics);
  const retention = scoreRetention(metrics.watchTimePct, metrics.rewatchRate);
  const virality = scoreVirality(metrics);

  const overall = Math.round(completion * 0.35 + engagement * 0.25 + retention * 0.25 + virality * 0.15);

  let verdict: FYPScore['verdict'] = 'needs_work';
  if (overall >= 80) verdict = 'fyp_boost';
  else if (overall >= 60) verdict = 'stable';
  else if (overall >= 40) verdict = 'needs_work';
  else verdict = 'dead';

  const recommendations: string[] = [];

  if (metrics.completionRate < 0.45) {
    recommendations.push('Completion < 45%: Acortar video a <15s o agregar loop final');
  }
  if (metrics.watchTimePct < 0.5) {
    recommendations.push('Watch time bajo: Mejorar hook en primer 1-3 segundos. Usar texto grande + movimiento.');
  }
  if (metrics.rewatchRate < 0.1) {
    recommendations.push(
      'Rewatch < 10%: Agregar elemento que requiera pausa/repetición (texto rápido, detalle oculto)',
    );
  }
  if (metrics.shareRate < 0.01) {
    recommendations.push('Share rate < 1%: Añadir CTA de share o contenido más emotivo/util');
  }
  if (metrics.commentRate < 0.02) {
    recommendations.push('Comments < 2%: Hacer pregunta controvertida o pedir opinión en texto/video');
  }
  if (metrics.videoLengthSec > 30 && metrics.completionRate < 0.5) {
    recommendations.push(`Video ${metrics.videoLengthSec}s con completion bajo: TikTok prefiere <21s para FYP`);
  }
  if (metrics.fypReachPct < 0.3) {
    recommendations.push('FYP reach < 30%: Revisar hashtags, sound trending, y post timing');
  }

  return { overall, breakdown: { completion, engagement, retention, virality }, verdict, recommendations };
};

export interface VideoOptimizationPlan {
  originalLength: number;
  targetLength: number;
  hookStrategy: string;
  textOverlayStrategy: string;
  soundStrategy: string;
  ctaStrategy: string;
  postingTime: string;
  estimatedImprovement: number; // %
}

export const generateOptimizationPlan = (metrics: FYPMetrics): VideoOptimizationPlan => {
  const score = calculateFYPScore(metrics);

  let targetLength = metrics.videoLengthSec;
  if (metrics.videoLengthSec > 21 && metrics.completionRate < 0.5) targetLength = 15;
  else if (metrics.videoLengthSec > 15 && metrics.completionRate < 0.6) targetLength = 12;

  return {
    originalLength: metrics.videoLengthSec,
    targetLength,
    hookStrategy:
      metrics.watchTimePct < 0.5
        ? 'Frame 0: texto grande + movimiento + sonido fuerte. Primer 1s = decisivo.'
        : 'Hook actual funciona. Mantener estilo.',
    textOverlayStrategy:
      metrics.rewatchRate < 0.1
        ? 'Texto en múltiples capas, velocidad media, requiere pausa para leer completo.'
        : 'Texto mínimo, dejar que el video hable.',
    soundStrategy:
      metrics.fypReachPct < 0.3
        ? 'Usar sound trending con <100K posts. Evitar sounds saturados.'
        : 'Sound actual funciona. Mantener.',
    ctaStrategy:
      metrics.commentRate < 0.02
        ? 'CTA de comentario en último 2s: "¿Tú qué harías?" o "Escribe tu opinión"'
        : 'CTA de share/save: "Guarda esto" o "Comparte con alguien que necesite verlo"',
    postingTime: '19:00-21:00 (peak TikTok usage) o 12:00-13:00 (lunch scroll)',
    estimatedImprovement: score.verdict === 'dead' ? 40 : score.verdict === 'needs_work' ? 25 : 10,
  };
};

export const benchmarkAgainstNiche = (
  metrics: FYPMetrics,
  niche: string,
): {
  percentile: number;
  vsNicheAvg: string;
  topPerformerGap: number;
} => {
  // Simulación de benchmarks por nicho
  const nicheAvgs: Record<string, { completion: number; engagement: number }> = {
    fitness: { completion: 0.52, engagement: 0.08 },
    education: { completion: 0.48, engagement: 0.06 },
    beauty: { completion: 0.55, engagement: 0.09 },
    food: { completion: 0.5, engagement: 0.07 },
    tech: { completion: 0.45, engagement: 0.05 },
    general: { completion: 0.48, engagement: 0.06 },
  };

  const avg = nicheAvgs[niche] ?? nicheAvgs['general'];
  const ourEngagement = metrics.shareRate + metrics.commentRate + metrics.saveRate;
  const avgEngagement = avg!.engagement;

  const completionDiff = metrics.completionRate - avg!.completion;
  const engagementDiff = ourEngagement - avgEngagement;

  const percentile = Math.min(99, Math.round(50 + completionDiff * 200 + engagementDiff * 500));

  return {
    percentile,
    vsNicheAvg:
      completionDiff > 0 && engagementDiff > 0
        ? 'above_average'
        : completionDiff < 0 && engagementDiff < 0
          ? 'below_average'
          : 'mixed',
    topPerformerGap: Math.max(0, 95 - percentile),
  };
};
