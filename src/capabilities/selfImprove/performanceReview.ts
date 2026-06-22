/**
 * Performance Review — Genera revisiones de performance auto-generadas.
 * Compara métricas actuales vs objetivos y genera reportes estructurados.
 */

import { log } from '../../agent/logger.js';

export interface ReviewPeriod {
  startDate: string;
  endDate: string;
  agentId: string;
}

export interface PerformanceReview {
  period: ReviewPeriod;
  overallGrade: 'A' | 'B' | 'C' | 'D' | 'F';
  overallScore: number;
  metrics: Array<{ name: string; actual: number; target: number; grade: string; trend: 'up' | 'down' | 'stable' }>;
  highlights: string[];
  lowlights: string[];
  actionItems: string[];
  nextPeriodGoals: Array<{ metric: string; target: number; strategy: string }>;
}

const GRADE_THRESHOLDS = [
  { grade: 'A' as const, min: 0.9 },
  { grade: 'B' as const, min: 0.75 },
  { grade: 'C' as const, min: 0.6 },
  { grade: 'D' as const, min: 0.4 },
  { grade: 'F' as const, min: 0 },
];

const calculateGrade = (score: number): PerformanceReview['overallGrade'] => {
  for (const t of GRADE_THRESHOLDS) {
    if (score >= t.min) return t.grade;
  }
  return 'F';
};

export const generateReview = (
  period: ReviewPeriod,
  metrics: Array<{ name: string; actual: number; target: number; previous?: number }>,
): PerformanceReview => {
  const scoredMetrics: PerformanceReview['metrics'] = metrics.map((m) => {
    const ratio = m.target > 0 ? m.actual / m.target : 0;
    const trend =
      m.previous !== undefined
        ? m.actual > m.previous * 1.05
          ? 'up'
          : m.actual < m.previous * 0.95
            ? 'down'
            : 'stable'
        : 'stable';
    return {
      name: m.name,
      actual: m.actual,
      target: m.target,
      grade: calculateGrade(ratio),
      trend,
    };
  });

  const overallScore =
    scoredMetrics.length > 0
      ? Math.round(
          (scoredMetrics.reduce((s, m) => s + (m.target > 0 ? m.actual / m.target : 0), 0) / scoredMetrics.length) *
            100,
        ) / 100
      : 0;

  const highlights = scoredMetrics.filter((m) => m.grade === 'A').map((m) => `${m.name}: ${m.actual}/${m.target}`);
  const lowlights = scoredMetrics
    .filter((m) => m.grade === 'D' || m.grade === 'F')
    .map((m) => `${m.name}: ${m.actual}/${m.target}`);

  const actionItems: string[] = [];
  for (const m of scoredMetrics.filter((m) => m.grade === 'C' || m.grade === 'D')) {
    actionItems.push(`Mejorar ${m.name}: actual ${m.actual} vs target ${m.target}`);
  }

  const nextPeriodGoals = scoredMetrics.map((m) => ({
    metric: m.name,
    target: Math.round(m.target * (m.trend === 'up' ? 1.1 : 1) * 100) / 100,
    strategy: m.trend === 'down' ? 'Revisar estrategia y testar alternativas' : 'Mantener y escalar',
  }));

  const review: PerformanceReview = {
    period,
    overallGrade: calculateGrade(overallScore),
    overallScore,
    metrics: scoredMetrics,
    highlights: highlights.slice(0, 5),
    lowlights: lowlights.slice(0, 5),
    actionItems: actionItems.slice(0, 5),
    nextPeriodGoals: nextPeriodGoals.slice(0, 5),
  };

  log.info(`[PerformanceReview] ${period.agentId}: ${review.overallGrade} (${review.overallScore})`);
  return review;
};

export const compareReviews = (
  reviewA: PerformanceReview,
  reviewB: PerformanceReview,
): { improved: boolean; delta: number; changedMetrics: string[] } => {
  const delta = reviewB.overallScore - reviewA.overallScore;
  const changed: string[] = [];

  for (const mB of reviewB.metrics) {
    const mA = reviewA.metrics.find((m) => m.name === mB.name);
    if (mA && mB.grade !== mA.grade) {
      changed.push(`${mB.name}: ${mA.grade}→${mB.grade}`);
    }
  }

  return { improved: delta > 0, delta: Math.round(delta * 100) / 100, changedMetrics: changed };
};
