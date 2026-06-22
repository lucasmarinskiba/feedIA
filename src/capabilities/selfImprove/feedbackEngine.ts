/**
 * Feedback Engine — Colecta y aplica feedback automático de múltiples fuentes.
 * Agrega señales de performance, engagement, y errores en acciones concretas.
 */

import { log } from '../../agent/logger.js';

export interface FeedbackSignal {
  id: string;
  source: 'performance' | 'user' | 'system' | 'human' | 'algorithm';
  agentId: string;
  metric: string;
  value: number;
  weight: number; // 0-1
  timestamp: string;
  context?: string;
}

export interface FeedbackSummary {
  agentId: string;
  overallScore: number;
  strengths: string[];
  weaknesses: string[];
  topRecommendation: string;
  signalCount: number;
}

const signals: FeedbackSignal[] = [];
const MAX_SIGNALS = 300;

export const collectSignal = (signal: Omit<FeedbackSignal, 'id' | 'timestamp'>): FeedbackSignal => {
  const full: FeedbackSignal = {
    ...signal,
    id: `fb-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: new Date().toISOString(),
  };
  signals.push(full);
  if (signals.length > MAX_SIGNALS) signals.shift();

  log.info(`[Feedback] ${signal.source} → ${signal.agentId}/${signal.metric}: ${signal.value} (w=${signal.weight})`);
  return full;
};

export const getSignals = (opts?: {
  agentId?: string;
  source?: string;
  metric?: string;
  limit?: number;
}): FeedbackSignal[] => {
  let result = signals.slice();
  if (opts?.agentId) result = result.filter((s) => s.agentId === opts.agentId);
  if (opts?.source) result = result.filter((s) => s.source === opts.source);
  if (opts?.metric) result = result.filter((s) => s.metric === opts.metric);
  return result.slice(-(opts?.limit ?? 50));
};

export const summarizeFeedback = (agentId: string): FeedbackSummary => {
  const relevant = signals.filter((s) => s.agentId === agentId);
  if (relevant.length === 0) {
    return {
      agentId,
      overallScore: 0,
      strengths: [],
      weaknesses: [],
      topRecommendation: 'No data yet',
      signalCount: 0,
    };
  }

  const weightedSum = relevant.reduce((s, sig) => s + sig.value * sig.weight, 0);
  const totalWeight = relevant.reduce((s, sig) => s + sig.weight, 0);
  const overallScore = totalWeight > 0 ? Math.round((weightedSum / totalWeight) * 100) / 100 : 0;

  const byMetric: Record<string, number[]> = {};
  for (const s of relevant) {
    if (!byMetric[s.metric]) byMetric[s.metric] = [];
    byMetric[s.metric]!.push(s.value);
  }

  const metricAvgs = Object.entries(byMetric).map(([metric, values]) => ({
    metric,
    avg: values.reduce((s, v) => s + v, 0) / values.length,
  }));

  metricAvgs.sort((a, b) => b.avg - a.avg);

  const strengths = metricAvgs
    .filter((m) => m.avg > 0.7)
    .map((m) => m.metric)
    .slice(0, 3);
  const weaknesses = metricAvgs
    .filter((m) => m.avg < 0.4)
    .map((m) => m.metric)
    .slice(0, 3);

  let topRecommendation = 'Keep current strategy';
  if (weaknesses.length > 0) {
    topRecommendation = `Focus on improving: ${weaknesses.join(', ')}`;
  } else if (overallScore > 0.8) {
    topRecommendation = 'Scale successful patterns to other agents';
  }

  return {
    agentId,
    overallScore,
    strengths,
    weaknesses,
    topRecommendation,
    signalCount: relevant.length,
  };
};

export const applyFeedback = (agentId: string, action: string): { applied: boolean; expectedImpact: number } => {
  const summary = summarizeFeedback(agentId);
  const expectedImpact = summary.overallScore < 0.5 ? 0.2 : 0.05;

  log.info(`[Feedback] Applied "${action}" to ${agentId}. Expected impact: +${expectedImpact}`);
  return { applied: true, expectedImpact };
};
