/**
 * Content Curation Engine
 * Auto-filter + rank prompts by performance metrics → suggest best content
 */

export interface PromptPerformance {
  promptId: string;
  content: string;
  engagement: number;
  conversions: number;
  impressions: number;
  clickThroughRate: number;
  saveRate: number;
  shareRate: number;
  timestamp: string;
  format: string;
  topic: string;
  platform: string;
}

export interface CurationScore {
  promptId: string;
  overallScore: number;
  engagementScore: number;
  conversionScore: number;
  viralityScore: number;
  consistencyScore: number;
  tier: 'gold' | 'silver' | 'bronze' | 'experimental';
}

export interface CurationResult {
  totalPrompts: number;
  goldTier: PromptPerformance[];
  silverTier: PromptPerformance[];
  recommendedForRepeat: PromptPerformance[];
  underperformers: PromptPerformance[];
  emergingTrends: { topic: string; momentum: number }[];
}

// Performance tracking (in-memory; DB in production)
const performanceLog: PromptPerformance[] = [];
const curationScores: Map<string, CurationScore> = new Map();

export const recordPromptPerformance = (perf: PromptPerformance): void => {
  performanceLog.push(perf);
  calculateScore(perf);
  console.log('[ContentCuration] Recorded:', { promptId: perf.promptId, engagement: perf.engagement });
};

export const curateContent = (minSamples: number = 5): CurationResult => {
  if (performanceLog.length < minSamples) {
    return {
      totalPrompts: performanceLog.length,
      goldTier: [],
      silverTier: [],
      recommendedForRepeat: [],
      underperformers: [],
      emergingTrends: [],
    };
  }

  // Calculate scores for all
  performanceLog.forEach((perf) => {
    if (!curationScores.has(perf.promptId)) {
      calculateScore(perf);
    }
  });

  // Sort by score
  const sorted = [...performanceLog].sort((a, b) => {
    const scoreA = curationScores.get(a.promptId)?.overallScore ?? 0;
    const scoreB = curationScores.get(b.promptId)?.overallScore ?? 0;
    return scoreB - scoreA;
  });

  const cutoffGold = Math.ceil(sorted.length * 0.2); // Top 20%
  const cutoffSilver = Math.ceil(sorted.length * 0.5); // Top 50%
  const cutoffRepeat = Math.ceil(sorted.length * 0.35); // Top 35% for repeat

  const goldTier = sorted.slice(0, cutoffGold);
  const silverTier = sorted.slice(cutoffGold, cutoffSilver);
  const recommendedForRepeat = sorted.slice(0, cutoffRepeat);
  const underperformers = sorted.slice(cutoffSilver);

  // Detect emerging trends
  const topicMomentum = calculateMomentum();
  const emergingTrends = Object.entries(topicMomentum)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([topic, momentum]) => ({ topic, momentum }));

  return {
    totalPrompts: performanceLog.length,
    goldTier,
    silverTier,
    recommendedForRepeat,
    underperformers,
    emergingTrends,
  };
};

export const getSuggestedFormats = (): Record<string, { format: string; score: number }> => {
  const formatScores: Record<string, number[]> = {};

  performanceLog.forEach((perf) => {
    if (!formatScores[perf.format]) formatScores[perf.format] = [];
    formatScores[perf.format]!.push(curationScores.get(perf.promptId)?.overallScore ?? 0);
  });

  const result: Record<string, { format: string; score: number }> = {};
  Object.entries(formatScores).forEach(([format, scores]) => {
    const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
    result[format] = { format, score: Math.round(avgScore * 100) / 100 };
  });

  return result;
};

export const getTopTopics = (limit: number = 10): Array<{ topic: string; avgScore: number }> => {
  const topicScores: Record<string, number[]> = {};

  performanceLog.forEach((perf) => {
    if (!topicScores[perf.topic]) topicScores[perf.topic] = [];
    topicScores[perf.topic]!.push(curationScores.get(perf.promptId)?.overallScore ?? 0);
  });

  return Object.entries(topicScores)
    .map(([topic, scores]) => ({
      topic,
      avgScore: Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100) / 100,
    }))
    .sort((a, b) => b.avgScore - a.avgScore)
    .slice(0, limit);
};

export const getPlatformRecommendations = (): Record<string, { format: string; topic: string }> => {
  const recommendations: Record<string, { format: string; topic: string }> = {};

  const platforms = ['instagram', 'tiktok', 'pinterest'];
  platforms.forEach((platform) => {
    const platformContent = performanceLog.filter((p) => p.platform === platform);
    if (platformContent.length === 0) return;

    const bestByScore = [...platformContent].sort(
      (a, b) => (curationScores.get(b.promptId)?.overallScore ?? 0) - (curationScores.get(a.promptId)?.overallScore ?? 0)
    )[0];

    if (bestByScore) {
      recommendations[platform] = { format: bestByScore.format, topic: bestByScore.topic };
    }
  });

  return recommendations;
};

// ============ HELPERS ============

const calculateScore = (perf: PromptPerformance): void => {
  // Engagement: CTR + save + share (max 0-1)
  const engagementScore = Math.min(perf.clickThroughRate + perf.saveRate + perf.shareRate, 1.0);

  // Conversion: actual conversions normalized by impressions
  const conversionScore = Math.min(perf.conversions / Math.max(perf.impressions, 1), 0.5);

  // Virality: share rate + save rate (indicates organic spread)
  const viralityScore = Math.min(perf.shareRate + perf.saveRate, 1.0) * 0.5;

  // Consistency: engagement relative to expected baseline (0.05 per 1K impressions)
  const expectedEngagement = (perf.impressions / 1000) * 0.05;
  const consistencyScore = Math.min(perf.engagement / Math.max(expectedEngagement, 0.01), 1.0) * 0.3;

  // Overall: weighted sum
  const overallScore = engagementScore * 0.35 + conversionScore * 0.35 + viralityScore * 0.2 + consistencyScore * 0.1;

  // Tier assignment
  let tier: 'gold' | 'silver' | 'bronze' | 'experimental' = 'experimental';
  if (overallScore >= 0.7) tier = 'gold';
  else if (overallScore >= 0.5) tier = 'silver';
  else if (overallScore >= 0.3) tier = 'bronze';

  const score: CurationScore = {
    promptId: perf.promptId,
    overallScore,
    engagementScore,
    conversionScore,
    viralityScore,
    consistencyScore,
    tier,
  };
  curationScores.set(perf.promptId, score);

  console.log('[ContentCuration] Score calculated:', { promptId: perf.promptId, tier, score: overallScore });
};

const calculateMomentum = (): Record<string, number> => {
  const recentCutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // Last 7 days
  const recentPrompts = performanceLog.filter((p) => new Date(p.timestamp) > recentCutoff);

  const topicMomentum: Record<string, number> = {};
  recentPrompts.forEach((perf) => {
    const score = curationScores.get(perf.promptId)?.overallScore ?? 0;
    topicMomentum[perf.topic] = (topicMomentum[perf.topic] ?? 0) + score;
  });

  return topicMomentum;
};
