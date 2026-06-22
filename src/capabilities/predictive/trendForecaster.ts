/**
 * Trend Forecaster — Predice tendencias emergentes basado en datos históricos.
 * Forecasting de hashtags, sounds, y topics con momentum scoring.
 */

import { log } from '../../agent/logger.js';

export interface TrendDataPoint {
  date: string;
  mentions: number;
  engagement: number;
  velocity: number; // growth rate
}

export interface TrendForecast {
  topic: string;
  currentMentions: number;
  predictedMentions7d: number;
  predictedMentions30d: number;
  momentum: 'rising' | 'stable' | 'declining' | 'viral';
  confidence: number;
  recommendedAction: string;
}

const linearRegression = (data: Array<{ x: number; y: number }>): { slope: number; intercept: number; r2: number } => {
  const n = data.length;
  if (n < 2) return { slope: 0, intercept: 0, r2: 0 };

  const sumX = data.reduce((s, d) => s + d.x, 0);
  const sumY = data.reduce((s, d) => s + d.y, 0);
  const sumXY = data.reduce((s, d) => s + d.x * d.y, 0);
  const sumX2 = data.reduce((s, d) => s + d.x * d.x, 0);
  const sumY2 = data.reduce((s, d) => s + d.y * d.y, 0);

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  const ssTot = sumY2 - (sumY * sumY) / n;
  const ssRes = sumY2 - intercept * sumY - slope * sumXY;
  const r2 = ssTot > 0 ? 1 - ssRes / ssTot : 0;

  return { slope, intercept, r2: Math.max(0, r2) };
};

export const forecastTrend = (topic: string, history: TrendDataPoint[]): TrendForecast => {
  if (history.length < 3) {
    return {
      topic,
      currentMentions: history[history.length - 1]?.mentions ?? 0,
      predictedMentions7d: history[history.length - 1]?.mentions ?? 0,
      predictedMentions30d: history[history.length - 1]?.mentions ?? 0,
      momentum: 'stable',
      confidence: 0.3,
      recommendedAction: 'Recolectar más datos antes de actuar',
    };
  }

  const data = history.map((h, i) => ({ x: i, y: h.mentions }));
  const { slope, intercept, r2 } = linearRegression(data);

  const current = history[history.length - 1]!.mentions;
  const predicted7 = Math.max(0, Math.round(intercept + slope * (history.length + 7)));
  const predicted30 = Math.max(0, Math.round(intercept + slope * (history.length + 30)));

  const growthRate = current > 0 ? (predicted7 - current) / current : 0;
  let momentum: TrendForecast['momentum'] = 'stable';
  if (growthRate > 0.5) momentum = 'viral';
  else if (growthRate > 0.2) momentum = 'rising';
  else if (growthRate < -0.1) momentum = 'declining';

  const confidence = Math.min(1, Math.round(r2 * 100) / 100);

  let recommendedAction = 'Monitorear';
  if (momentum === 'viral') recommendedAction = 'Crear contenido inmediatamente';
  else if (momentum === 'rising') recommendedAction = 'Planificar contenido para esta tendencia';
  else if (momentum === 'declining') recommendedAction = 'Evitar, la tendencia decae';

  log.info(`[Forecaster] ${topic} → ${momentum} (7d: ${predicted7}, 30d: ${predicted30}, r²=${confidence})`);

  return {
    topic,
    currentMentions: current,
    predictedMentions7d: predicted7,
    predictedMentions30d: predicted30,
    momentum,
    confidence,
    recommendedAction,
  };
};

export const forecastMultiple = (topics: Array<{ topic: string; history: TrendDataPoint[] }>): TrendForecast[] =>
  topics.map((t) => forecastTrend(t.topic, t.history));
