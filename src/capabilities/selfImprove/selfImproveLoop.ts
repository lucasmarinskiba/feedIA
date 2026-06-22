/**
 * Self-Improvement Loop — El agente mejora su propio comportamiento basado en resultados.
 * Detecta patrones de éxito/fracaso y ajusta estrategias automáticamente.
 */

import { log } from '../../agent/logger.js';

export interface ImprovementCycle {
  id: string;
  agentId: string;
  metric: string;
  beforeValue: number;
  afterValue: number;
  change: number; // positive = improvement
  strategy: string;
  timestamp: string;
}

export interface ImprovementSuggestion {
  metric: string;
  currentValue: number;
  targetValue: number;
  suggestion: string;
  confidence: number;
  estimatedImpact: number;
}

const cycles: ImprovementCycle[] = [];
const MAX_CYCLES = 200;

export const recordCycle = (cycle: Omit<ImprovementCycle, 'id' | 'timestamp'>): ImprovementCycle => {
  const full: ImprovementCycle = {
    ...cycle,
    id: `imp-${Date.now()}`,
    timestamp: new Date().toISOString(),
  };
  cycles.push(full);
  if (cycles.length > MAX_CYCLES) cycles.shift();

  log.info(
    `[SelfImprove] ${cycle.agentId} improved ${cycle.metric}: ${cycle.beforeValue} → ${cycle.afterValue} (${cycle.change > 0 ? '+' : ''}${cycle.change})`,
  );
  return full;
};

export const analyzeImprovements = (
  agentId: string,
): { totalCycles: number; avgChange: number; bestMetric: string; worstMetric: string } => {
  const relevant = cycles.filter((c) => c.agentId === agentId);
  if (relevant.length === 0) {
    return { totalCycles: 0, avgChange: 0, bestMetric: 'none', worstMetric: 'none' };
  }

  const byMetric: Record<string, number[]> = {};
  for (const c of relevant) {
    if (!byMetric[c.metric]) byMetric[c.metric] = [];
    byMetric[c.metric]!.push(c.change);
  }

  const metricAvgs = Object.entries(byMetric).map(([metric, changes]) => ({
    metric,
    avg: changes.reduce((s, v) => s + v, 0) / changes.length,
  }));

  metricAvgs.sort((a, b) => b.avg - a.avg);

  return {
    totalCycles: relevant.length,
    avgChange: Math.round((relevant.reduce((s, c) => s + c.change, 0) / relevant.length) * 100) / 100,
    bestMetric: metricAvgs[0]?.metric ?? 'none',
    worstMetric: metricAvgs[metricAvgs.length - 1]?.metric ?? 'none',
  };
};

export const suggestImprovements = (
  agentId: string,
  currentMetrics: Record<string, number>,
): ImprovementSuggestion[] => {
  const suggestions: ImprovementSuggestion[] = [];
  const analysis = analyzeImprovements(agentId);

  for (const [metric, value] of Object.entries(currentMetrics)) {
    if (value < 0.5) {
      suggestions.push({
        metric,
        currentValue: value,
        targetValue: Math.min(1, value * 1.3),
        suggestion: `Incrementar ${metric}: probar variantes A/B y medir impacto`,
        confidence: 0.7,
        estimatedImpact: 0.15,
      });
    }
  }

  if (analysis.worstMetric !== 'none' && !suggestions.find((s) => s.metric === analysis.worstMetric)) {
    suggestions.push({
      metric: analysis.worstMetric,
      currentValue: currentMetrics[analysis.worstMetric] ?? 0,
      targetValue: Math.min(1, (currentMetrics[analysis.worstMetric] ?? 0) * 1.2),
      suggestion: `Revisar estrategia de ${analysis.worstMetric}: analizar ciclos pasados con peor performance`,
      confidence: 0.6,
      estimatedImpact: 0.1,
    });
  }

  log.info(`[SelfImprove] ${suggestions.length} suggestions for ${agentId}`);
  return suggestions;
};

export const getImprovementHistory = (agentId: string, limit = 10): ImprovementCycle[] =>
  cycles.filter((c) => c.agentId === agentId).slice(-limit);
