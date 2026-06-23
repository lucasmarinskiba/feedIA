/**
 * Opportunity Scorer — combina señales en una puntuación multidimensional.
 */

import type { BrandProfile } from '../../config/types.js';
import type { CompetitorSignals } from './inputs/competitorSignals.js';
import type { GoalSignals } from './inputs/goalSignals.js';
import type { PerformanceSignals } from './inputs/performanceSignals.js';
import type { TrendSignals } from './inputs/trendSignals.js';
import type { ContentPillar } from './output/strategicBrief.js';

export interface OpportunityInput {
  topic: string;
  angle: string;
  format: string;
  platforms: Array<'instagram' | 'tiktok'>;
  pillar: ContentPillar;
  goalSignals: GoalSignals;
  performance: PerformanceSignals;
  trends: TrendSignals;
  competitors: CompetitorSignals;
}

export interface OpportunityScore {
  total: number;
  dimensions: {
    performanceFit: number; // 0-100
    trendRelevance: number;
    goalAlignment: number;
    competitiveGap: number;
    brandConsistency: number;
    urgency: number;
  };
  confidence: number; // 0-100
  estimatedEngagement: 'bajo' | 'medio' | 'alto';
  why: string;
}

const normalize = (val: number, min = 0, max = 100): number => Math.max(0, Math.min(100, ((val - min) / (max - min)) * 100));

export const scoreOpportunity = (input: OpportunityInput, brand: BrandProfile): OpportunityScore => {
  const { topic, format, pillar, goalSignals, performance, trends, competitors } = input;

  // Performance fit: ¿historial ganador con este tema/formato?
  const topicHistory = performance.topTopics.find((t: { topic: string }) => t.topic.toLowerCase() === topic.toLowerCase());
  const formatHistory = performance.bestFormats.find((f) => f.format === format);
  const performanceFit = Math.min(100, (topicHistory?.avgScore ?? 50) * 0.6 + (formatHistory?.avgEngagement ?? 0) * 4);

  // Trend relevance: ¿el tema aparece en tendencias?
  const topicTrend = trends.trendingTopics.find((t) => topic.toLowerCase().includes(t.topic.toLowerCase()));
  const trendRelevance = topicTrend ? topicTrend.score : trends.relevanceToBrand;

  // Goal alignment: formato y pilar vs meta principal
  const pillarWeight = goalSignals.pillarWeights[pillar] ?? 10;
  const formatMatch = goalSignals.preferredFormats.includes(format) ? 30 : 10;
  const goalAlignment = Math.min(100, pillarWeight + formatMatch + 20);

  // Competitive gap: oportunidad si pocos competidores cubren el ángulo
  const competitorOverlap = competitors.topTopics.some((t) => topic.toLowerCase().includes(t.toLowerCase())) ? 30 : 0;
  const competitiveGap = Math.min(100, (competitors.dataAvailable ? 40 : 60) + (60 - competitorOverlap));

  // Brand consistency: alineación con voz/visual
  const voiceMatch = brand.voice.tone.some((t) => topic.toLowerCase().includes(t.toLowerCase()) || angleIncludes(brand.voice.referenceQuotes[0] ?? '', topic))
    ? 80
    : 60;
  const brandConsistency = voiceMatch;

  // Urgency: tendencia creciente + baja cobertura reciente
  const recentCoverage = performance.recentPosts.filter((p) => p.topics.some((t) => topic.toLowerCase().includes(t.toLowerCase()))).length;
  const urgency = Math.min(100, trendRelevance * 0.5 + Math.max(0, 50 - recentCoverage * 10));

  const dims: OpportunityScore['dimensions'] = {
    performanceFit: Math.round(performanceFit),
    trendRelevance: Math.round(trendRelevance),
    goalAlignment: Math.round(goalAlignment),
    competitiveGap: Math.round(competitiveGap),
    brandConsistency: Math.round(brandConsistency),
    urgency: Math.round(urgency),
  };

  const weights = [0.25, 0.2, 0.25, 0.1, 0.1, 0.1];
  const total = Math.round(
    dims.performanceFit * weights[0]! +
      dims.trendRelevance * weights[1]! +
      dims.goalAlignment * weights[2]! +
      dims.competitiveGap * weights[3]! +
      dims.brandConsistency * weights[4]! +
      dims.urgency * weights[5]!,
  );

  const estimatedEngagement: OpportunityScore['estimatedEngagement'] =
    total >= 75 ? 'alto' : total >= 55 ? 'medio' : 'bajo';

  const reasons = [
    performanceFit > 70 ? 'históricamente el tema/formato funciona' : 'sin datos históricos claros',
    trendRelevance > 60 ? 'alineado con tendencias actuales' : 'tendencia moderada',
    goalAlignment > 70 ? 'apunta directo a la meta principal' : 'alejado de la meta inmediata',
    competitiveGap > 60 ? 'hay espacio frente a competidores' : 'competidores ya cubren el ángulo',
  ];

  return {
    total,
    dimensions: dims,
    confidence: Math.round(normalize(performance.benchmarksAvailable ? total : total * 0.85)),
    estimatedEngagement,
    why: reasons.join('; '),
  };
};

const angleIncludes = (quote: string, topic: string): boolean => {
  if (!quote) return false;
  const words = topic.toLowerCase().split(/\s+/);
  return words.some((w) => quote.toLowerCase().includes(w));
};
