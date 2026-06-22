/**
 * Neural Learning Loop — Aprende de resultados pasados para mejorar decisiones futuras
 * Registra outcomes, detecta patrones, y ajusta estrategias.
 */

import { log } from '../../agent/logger.js';

export interface LearningRecord {
  id: string;
  agentId: string;
  strategy: string;
  context: string;
  outcome: number; // 0-100
  lesson: string;
  appliedAt: string;
}

const STORAGE_KEY = 'neural_learning_loop';

const loadRecords = (): LearningRecord[] => {
  try {
    const raw = process.env[STORAGE_KEY];
    return raw ? (JSON.parse(raw) as LearningRecord[]) : [];
  } catch {
    return [];
  }
};

const saveRecords = (records: LearningRecord[]): void => {
  process.env[STORAGE_KEY] = JSON.stringify(records.slice(-300));
};

export const recordOutcome = (opts: {
  agentId: string;
  strategy: string;
  context: string;
  outcome: number;
  lesson: string;
}): LearningRecord => {
  const record: LearningRecord = {
    id: `lr-${Date.now()}`,
    agentId: opts.agentId,
    strategy: opts.strategy,
    context: opts.context,
    outcome: opts.outcome,
    lesson: opts.lesson,
    appliedAt: new Date().toISOString(),
  };
  const all = loadRecords();
  all.push(record);
  saveRecords(all);
  log.info(`[Learning] Recorded: ${opts.strategy} → ${opts.outcome}/100`);
  return record;
};

export interface StrategyPerformance {
  strategy: string;
  avgOutcome: number;
  count: number;
  bestContext: string;
  worstContext: string;
  recommendation: string;
}

export const analyzeStrategyPerformance = (agentId?: string): StrategyPerformance[] => {
  const records = loadRecords().filter((r) => !agentId || r.agentId === agentId);
  const byStrategy = new Map<string, LearningRecord[]>();

  for (const r of records) {
    const arr = byStrategy.get(r.strategy) ?? [];
    arr.push(r);
    byStrategy.set(r.strategy, arr);
  }

  return Array.from(byStrategy.entries()).map(([strategy, rs]) => {
    const avg = rs.reduce((s, r) => s + r.outcome, 0) / rs.length;
    const sorted = [...rs].sort((a, b) => b.outcome - a.outcome);
    const best = sorted[0];
    const worst = sorted[sorted.length - 1];
    return {
      strategy,
      avgOutcome: Math.round(avg * 10) / 10,
      count: rs.length,
      bestContext: best?.context ?? 'N/A',
      worstContext: worst?.context ?? 'N/A',
      recommendation:
        avg > 70
          ? `Estrategia sólida. Usar en contextos similares a: ${best?.context ?? ''}`
          : avg > 40
            ? `Estrategia inconsistente. Evitar en: ${worst?.context ?? ''}`
            : `Estrategia débil. Considerar descartar o redesign.`,
    };
  });
};

export const getBestStrategyFor = (context: string, agentId?: string): string | undefined => {
  const records = loadRecords().filter((r) => (!agentId || r.agentId === agentId) && r.context.includes(context));
  if (records.length === 0) return undefined;

  const byStrategy = new Map<string, number[]>();
  for (const r of records) {
    const arr = byStrategy.get(r.strategy) ?? [];
    arr.push(r.outcome);
    byStrategy.set(r.strategy, arr);
  }

  let bestStrategy: string | undefined;
  let bestAvg = -1;

  for (const [strat, outcomes] of byStrategy) {
    const avg = outcomes.reduce((a, b) => a + b, 0) / outcomes.length;
    if (avg > bestAvg) {
      bestAvg = avg;
      bestStrategy = strat;
    }
  }

  return bestStrategy;
};

export const getLearningStats = (): { totalRecords: number; avgOutcome: number; topStrategies: string[] } => {
  const records = loadRecords();
  const avg = records.length > 0 ? records.reduce((s, r) => s + r.outcome, 0) / records.length : 0;
  const perf = analyzeStrategyPerformance();
  return {
    totalRecords: records.length,
    avgOutcome: Math.round(avg * 10) / 10,
    topStrategies: perf.filter((p) => p.avgOutcome > 70).map((p) => p.strategy),
  };
};
