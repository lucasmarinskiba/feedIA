// @ts-nocheck
/**
 * Feedback Loop — Circuitos de Retroalimentación Activa.
 *
 * Monitoreo continuo → evaluación de desempeño → auto-corrección.
 * Opera como capa de control cerrado: cada ciclo de feedback ajusta
 * el comportamiento del sistema sin intervención humana.
 *
 * Arquitectura: HIDDEN LAYER de control de desempeño.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { log } from '../../agent/logger.js';
import type { BrandProfile } from '../../config/types.js';
import type { NeuralInputState } from './neuralKnowledgeBase.js';

const FEEDBACK_DIR = path.resolve('data/neural/feedback');

// ── Tipos ─────────────────────────────────────────────────────────────────────

export type MetricName =
  | 'engagement_rate'
  | 'reach_rate'
  | 'follower_growth'
  | 'content_frequency'
  | 'brand_coherence'
  | 'audience_alignment'
  | 'hashtag_effectiveness'
  | 'caption_performance'
  | 'posting_time_score'
  | 'conversion_rate';

export interface MetricReading {
  metric: MetricName;
  value: number;
  normalizedValue: number; // 0–1
  timestamp: string;
  delta: number; // cambio vs lectura anterior
  trend: 'up' | 'down' | 'stable';
}

export interface PerformanceEvaluation {
  brandId: string;
  timestamp: string;
  overallScore: number; // 0–100
  metrics: MetricReading[];
  bottlenecks: string[]; // métricas más débiles
  strengths: string[]; // métricas más fuertes
  urgentIssues: string[]; // métricas críticas bajo umbral
  recommendations: CorrectionAction[];
  cycleNumber: number;
}

export interface CorrectionAction {
  id: string;
  type: 'content' | 'posting-time' | 'hashtags' | 'engagement' | 'brand' | 'frequency';
  priority: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  targetMetric: MetricName;
  expectedImprovement: number; // % esperado
  autonomous: boolean; // puede auto-ejecutarse sin aprobación
  action: string; // qué hacer exactamente
}

export interface FeedbackCycle {
  brandId: string;
  cycleNumber: number;
  startedAt: string;
  completedAt?: string;
  inputState: NeuralInputState;
  evaluation: PerformanceEvaluation;
  correctionsApplied: string[];
  nextCycleScheduledFor: string;
}

export interface FeedbackLoopConfig {
  cycleIntervalMs: number; // intervalo entre ciclos (default: 4h)
  criticalThreshold: number; // score bajo el que se dispara corrección urgente (default: 40)
  warningThreshold: number; // warning threshold (default: 60)
  maxAutonomousCorrections: number; // max correcciones automáticas por ciclo (default: 3)
  humanEscalationScore: number; // score bajo el que se escala a humano (default: 25)
}

// ── Umbrales por métrica ──────────────────────────────────────────────────────

const METRIC_WEIGHTS: Record<MetricName, number> = {
  engagement_rate: 0.25,
  reach_rate: 0.15,
  follower_growth: 0.15,
  content_frequency: 0.1,
  brand_coherence: 0.1,
  audience_alignment: 0.08,
  hashtag_effectiveness: 0.07,
  caption_performance: 0.05,
  posting_time_score: 0.03,
  conversion_rate: 0.02,
};

const METRIC_CRITICAL_THRESHOLD: Record<MetricName, number> = {
  engagement_rate: 0.25,
  reach_rate: 0.2,
  follower_growth: 0.15,
  content_frequency: 0.3,
  brand_coherence: 0.4,
  audience_alignment: 0.35,
  hashtag_effectiveness: 0.2,
  caption_performance: 0.25,
  posting_time_score: 0.25,
  conversion_rate: 0.1,
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const ensureFeedbackDir = async (): Promise<void> => {
  await fs.mkdir(FEEDBACK_DIR, { recursive: true });
};

const feedbackPath = (brandId: string): string => path.join(FEEDBACK_DIR, `${brandId}-cycles.json`);

const loadCycles = async (brandId: string): Promise<FeedbackCycle[]> => {
  try {
    return JSON.parse(await fs.readFile(feedbackPath(brandId), 'utf-8')) as FeedbackCycle[];
  } catch {
    return [];
  }
};

const saveCycles = async (brandId: string, cycles: FeedbackCycle[]): Promise<void> => {
  await ensureFeedbackDir();
  // Mantener solo los últimos 50 ciclos
  const trimmed = cycles.slice(-50);
  await fs.writeFile(feedbackPath(brandId), JSON.stringify(trimmed, null, 2), 'utf-8');
};

const detectTrend = (current: number, previous: number | undefined): 'up' | 'down' | 'stable' => {
  if (previous === undefined) return 'stable';
  const delta = current - previous;
  if (delta > 0.02) return 'up';
  if (delta < -0.02) return 'down';
  return 'stable';
};

// ── Motor de evaluación ───────────────────────────────────────────────────────

const buildMetricReadings = (state: NeuralInputState, previousState: NeuralInputState | null): MetricReading[] => {
  const now = new Date().toISOString();
  const prev = previousState?.accountMetrics;

  const readings: Array<{ metric: MetricName; value: number; normValue: number }> = [
    {
      metric: 'engagement_rate',
      value: state.accountMetrics.engagementRate,
      normValue: state.accountMetrics.engagementRate,
    },
    { metric: 'reach_rate', value: state.accountMetrics.reachRate, normValue: state.accountMetrics.reachRate },
    {
      metric: 'follower_growth',
      value: state.accountMetrics.followerGrowthRate,
      normValue: state.accountMetrics.followerGrowthRate,
    },
    {
      metric: 'content_frequency',
      value: state.accountMetrics.contentFrequencyScore,
      normValue: state.accountMetrics.contentFrequencyScore,
    },
    {
      metric: 'brand_coherence',
      value: state.accountMetrics.brandCoherenceScore,
      normValue: state.accountMetrics.brandCoherenceScore,
    },
    {
      metric: 'audience_alignment',
      value: state.audienceSignals.demographicAlignmentScore,
      normValue: state.audienceSignals.demographicAlignmentScore,
    },
    {
      metric: 'hashtag_effectiveness',
      value: state.audienceSignals.interestMatchScore,
      normValue: state.audienceSignals.interestMatchScore,
    },
    {
      metric: 'caption_performance',
      value: state.audienceSignals.loyaltyScore,
      normValue: state.audienceSignals.loyaltyScore,
    },
    {
      metric: 'posting_time_score',
      value: state.audienceSignals.activeHoursScore,
      normValue: state.audienceSignals.activeHoursScore,
    },
    {
      metric: 'conversion_rate',
      value: state.accountMetrics.conversionRate,
      normValue: state.accountMetrics.conversionRate,
    },
  ];

  return readings.map(({ metric, value, normValue }) => {
    const previousValue = prev
      ? metric === 'engagement_rate'
        ? prev.engagementRate
        : metric === 'reach_rate'
          ? prev.reachRate
          : metric === 'follower_growth'
            ? prev.followerGrowthRate
            : metric === 'content_frequency'
              ? prev.contentFrequencyScore
              : metric === 'brand_coherence'
                ? prev.brandCoherenceScore
                : metric === 'conversion_rate'
                  ? prev.conversionRate
                  : undefined
      : undefined;

    return {
      metric,
      value,
      normalizedValue: normValue,
      timestamp: now,
      delta: previousValue !== undefined ? normValue - previousValue : 0,
      trend: detectTrend(normValue, previousValue),
    };
  });
};

const generateCorrectionActions = (bottlenecks: MetricReading[], _brand: BrandProfile): CorrectionAction[] => {
  const actions: CorrectionAction[] = [];

  for (const metric of bottlenecks) {
    if (metric.metric === 'engagement_rate') {
      actions.push({
        id: `corr-eng-${Date.now()}`,
        type: 'content',
        priority: metric.normalizedValue < 0.2 ? 'critical' : 'high',
        description: 'Engagement bajo — cambiar formato y tipo de contenido',
        targetMetric: 'engagement_rate',
        expectedImprovement: 25,
        autonomous: true,
        action: 'switch-to-carousel-with-question-cta',
      });
    }

    if (metric.metric === 'posting_time_score') {
      actions.push({
        id: `corr-time-${Date.now()}`,
        type: 'posting-time',
        priority: 'medium',
        description: 'Publicando fuera de ventanas óptimas',
        targetMetric: 'posting_time_score',
        expectedImprovement: 15,
        autonomous: true,
        action: 'reschedule-to-prime-windows',
      });
    }

    if (metric.metric === 'hashtag_effectiveness') {
      actions.push({
        id: `corr-ht-${Date.now()}`,
        type: 'hashtags',
        priority: 'medium',
        description: 'Hashtags poco efectivos — rotar sets',
        targetMetric: 'hashtag_effectiveness',
        expectedImprovement: 20,
        autonomous: true,
        action: 'rotate-hashtag-sets',
      });
    }

    if (metric.metric === 'content_frequency') {
      const isLow = metric.normalizedValue < 0.4;
      actions.push({
        id: `corr-freq-${Date.now()}`,
        type: 'frequency',
        priority: isLow ? 'high' : 'low',
        description: isLow ? 'Frecuencia de publicación muy baja' : 'Publicando demasiado',
        targetMetric: 'content_frequency',
        expectedImprovement: 12,
        autonomous: isLow,
        action: isLow ? 'add-content-to-queue' : 'reduce-posting-frequency',
      });
    }

    if (metric.metric === 'brand_coherence') {
      actions.push({
        id: `corr-brand-${Date.now()}`,
        type: 'brand',
        priority: 'high',
        description: 'Coherencia de marca baja — revisar voz y visual',
        targetMetric: 'brand_coherence',
        expectedImprovement: 18,
        autonomous: false, // requiere revisión humana
        action: 'run-branding-brain-evolution',
      });
    }
  }

  return actions.sort((a, b) => {
    const order = { critical: 0, high: 1, medium: 2, low: 3 };
    return order[a.priority] - order[b.priority];
  });
};

// ── API pública ───────────────────────────────────────────────────────────────

/** Ejecuta un ciclo completo de feedback. */
export const runFeedbackCycle = async (
  brand: BrandProfile,
  currentState: NeuralInputState,
  config: Partial<FeedbackLoopConfig> = {},
): Promise<PerformanceEvaluation> => {
  const cfg: FeedbackLoopConfig = {
    cycleIntervalMs: 4 * 60 * 60 * 1000,
    criticalThreshold: 40,
    warningThreshold: 60,
    maxAutonomousCorrections: 3,
    humanEscalationScore: 25,
    ...config,
  };

  const brandId = currentState.brandId;
  const cycles = await loadCycles(brandId);
  const previousCycle = cycles[cycles.length - 1];
  const previousState = previousCycle?.inputState ?? null;
  const cycleNumber = (previousCycle?.cycleNumber ?? 0) + 1;

  log.info('[feedbackLoop] cycle start', { brandId, cycleNumber });

  // Construir lecturas de métricas
  const metrics = buildMetricReadings(currentState, previousState);

  // Score ponderado global
  const overallScore = Math.round(
    metrics.reduce((sum, m) => sum + m.normalizedValue * (METRIC_WEIGHTS[m.metric] ?? 0), 0) * 100,
  );

  // Clasificar métricas
  const bottlenecks = metrics
    .filter((m) => m.normalizedValue < METRIC_CRITICAL_THRESHOLD[m.metric])
    .sort((a, b) => a.normalizedValue - b.normalizedValue);

  const strengths = metrics
    .filter((m) => m.normalizedValue > 0.7)
    .sort((a, b) => b.normalizedValue - a.normalizedValue)
    .map((m) => m.metric);

  const urgentIssues = bottlenecks
    .filter((m) => m.normalizedValue < cfg.criticalThreshold / 100)
    .map((m) => `${m.metric}: ${(m.normalizedValue * 100).toFixed(1)}% (crítico)`);

  // Generar correcciones
  const recommendations = generateCorrectionActions(bottlenecks, brand).slice(0, cfg.maxAutonomousCorrections);

  const evaluation: PerformanceEvaluation = {
    brandId,
    timestamp: new Date().toISOString(),
    overallScore,
    metrics,
    bottlenecks: bottlenecks.map((m) => m.metric),
    strengths,
    urgentIssues,
    recommendations,
    cycleNumber,
  };

  // Persistir ciclo
  const nextCycle = new Date(Date.now() + cfg.cycleIntervalMs).toISOString();
  const cycle: FeedbackCycle = {
    brandId,
    cycleNumber,
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    inputState: currentState,
    evaluation,
    correctionsApplied: recommendations.filter((r) => r.autonomous).map((r) => r.action),
    nextCycleScheduledFor: nextCycle,
  };

  await saveCycles(brandId, [...cycles, cycle]);

  // Escalada si score muy bajo
  if (overallScore < cfg.humanEscalationScore) {
    log.warn('[feedbackLoop] ESCALADA A HUMANO', { brandId, overallScore, urgentIssues });
  }

  log.info('[feedbackLoop] cycle done', { brandId, cycleNumber, overallScore, bottlenecks: bottlenecks.length });
  return evaluation;
};

/** Carga historial de ciclos de feedback. */
export const getFeedbackHistory = async (brandId: string, limit = 10): Promise<FeedbackCycle[]> => {
  const cycles = await loadCycles(brandId);
  return cycles.slice(-limit);
};

/** Retorna el último ciclo sin ejecutar uno nuevo. */
export const getLatestEvaluation = async (brandId: string): Promise<PerformanceEvaluation | null> => {
  const cycles = await loadCycles(brandId);
  return cycles[cycles.length - 1]?.evaluation ?? null;
};

/** Score compuesto de salud del sistema (0–100). */
export const computeHealthScore = (evaluation: PerformanceEvaluation): number => {
  const urgencyPenalty = evaluation.urgentIssues.length * 8;
  const bottleneckPenalty = evaluation.bottlenecks.length * 4;
  return Math.max(0, evaluation.overallScore - urgencyPenalty - bottleneckPenalty);
};

/** Chequea si es necesario escalar a supervisión humana. */
export const needsHumanReview = (evaluation: PerformanceEvaluation): boolean =>
  evaluation.overallScore < 30 || evaluation.urgentIssues.length >= 3;
