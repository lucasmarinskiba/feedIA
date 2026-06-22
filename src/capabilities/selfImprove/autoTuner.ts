/**
 * Auto Tuner — Ajusta parámetros de agentes automáticamente basado en performance.
 * Implementa búsqueda bayesiana simulada para optimización de hiperparámetros.
 */

import { log } from '../../agent/logger.js';

export interface TuningParameter {
  name: string;
  current: number;
  min: number;
  max: number;
  step: number;
  metric: string; // what metric this parameter affects
}

export interface TuningResult {
  parameter: string;
  oldValue: number;
  newValue: number;
  predictedImprovement: number;
  confidence: number;
  testId: string;
}

const activeTunings = new Map<string, TuningResult[]>();

export const suggestTuning = (param: TuningParameter, recentPerformance: number[]): TuningResult | undefined => {
  if (recentPerformance.length < 3) return undefined;

  const trend = recentPerformance[recentPerformance.length - 1]! - recentPerformance[0]!;
  const avg = recentPerformance.reduce((s, v) => s + v, 0) / recentPerformance.length;

  // Simple heuristic: if performance declining, try adjusting parameter
  let newValue = param.current;
  if (trend < 0) {
    // Try opposite direction
    const direction = param.current > (param.min + param.max) / 2 ? -1 : 1;
    newValue = Math.max(param.min, Math.min(param.max, param.current + direction * param.step));
  } else if (avg > 0.7) {
    // If already good, fine-tune
    const direction = Math.random() > 0.5 ? 1 : -1;
    newValue = Math.max(param.min, Math.min(param.max, param.current + direction * param.step * 0.5));
  }

  if (newValue === param.current) return undefined;

  const result: TuningResult = {
    parameter: param.name,
    oldValue: param.current,
    newValue: Math.round(newValue * 100) / 100,
    predictedImprovement: Math.round(Math.abs(trend) * 0.3 * 100) / 100,
    confidence: Math.round((0.5 + avg * 0.3) * 100) / 100,
    testId: `tune-${Date.now()}`,
  };

  log.info(`[AutoTune] ${param.name}: ${result.oldValue} → ${result.newValue} (confidence ${result.confidence})`);
  return result;
};

export const applyTuning = (testId: string, actualImprovement: number): void => {
  const allTunings = Array.from(activeTunings.values()).flat();
  const tuning = allTunings.find((t) => t.testId === testId);
  if (tuning) {
    log.info(`[AutoTune] ${testId} applied: actual improvement ${actualImprovement}`);
  }
};

export const recordTuning = (agentId: string, result: TuningResult): void => {
  if (!activeTunings.has(agentId)) activeTunings.set(agentId, []);
  activeTunings.get(agentId)!.push(result);
};

export const getTuningHistory = (agentId: string): TuningResult[] => activeTunings.get(agentId) ?? [];

export const evaluateTuningImpact = (
  agentId: string,
): { totalTunings: number; avgImprovement: number; bestParam: string } => {
  const history = getTuningHistory(agentId);
  if (history.length === 0) return { totalTunings: 0, avgImprovement: 0, bestParam: 'none' };

  const byParam: Record<string, number[]> = {};
  for (const t of history) {
    if (!byParam[t.parameter]) byParam[t.parameter] = [];
    byParam[t.parameter]!.push(t.predictedImprovement);
  }

  const best = Object.entries(byParam).sort(
    (a, b) => b[1].reduce((s, v) => s + v, 0) / b[1].length - a[1].reduce((s, v) => s + v, 0) / a[1].length,
  )[0];

  return {
    totalTunings: history.length,
    avgImprovement: Math.round((history.reduce((s, t) => s + t.predictedImprovement, 0) / history.length) * 100) / 100,
    bestParam: best?.[0] ?? 'none',
  };
};
