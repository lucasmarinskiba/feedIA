/**
 * Auto Feedback Loop Service
 * Track winning prompts → auto-analyze patterns → update ranking weights (no user input)
 */

export interface PromptMetrics {
  batchId: number;
  prompt: string;
  format: string;
  topic: string;
  engagement: number; // 0-1
  conversions: number;
  impressions: number;
  timestamp: string;
}

export interface PatternAnalysis {
  format: { winner: string; winRate: number };
  topic: { winner: string; winRate: number };
  style: { winner: string; winRate: number };
  insights: string[];
}

export interface WeightUpdate {
  formatWeight: number;
  categoryWeight: number;
  topicWeight: number;
  styleWeight: number;
  confidence: number;
  appliedAt: string;
}

// Store metrics in memory (would use DB in production)
const promptMetricsLog: PromptMetrics[] = [];
const weightHistory: WeightUpdate[] = [];

// Default weights
let currentWeights: WeightUpdate = {
  formatWeight: 0.35,
  categoryWeight: 0.3,
  topicWeight: 0.2,
  styleWeight: 0.15,
  confidence: 0.5,
  appliedAt: new Date().toISOString(),
};

/**
 * Record prompt performance (called after user generates content)
 */
export const recordPromptPerformance = (metrics: PromptMetrics): void => {
  promptMetricsLog.push(metrics);
  console.log('[AutoFeedback] Recorded:', {
    batch: metrics.batchId,
    engagement: metrics.engagement,
    conversions: metrics.conversions,
  });
};

/**
 * Analyze patterns in winning prompts
 */
export const analyzeWinningPatterns = (minSamples: number = 10): PatternAnalysis => {
  if (promptMetricsLog.length < minSamples) {
    return {
      format: { winner: 'insufficient_data', winRate: 0 },
      topic: { winner: 'insufficient_data', winRate: 0 },
      style: { winner: 'insufficient_data', winRate: 0 },
      insights: [`Need ${minSamples - promptMetricsLog.length} more samples`],
    };
  }

  // Split: winners (top 25%) vs losers (bottom 25%)
  const sorted = [...promptMetricsLog].sort(
    (a, b) => b.engagement + b.conversions / 100 - (a.engagement + a.conversions / 100),
  );
  const winnersCount = Math.ceil(sorted.length * 0.25);
  const losersCount = Math.ceil(sorted.length * 0.25);

  const winners = sorted.slice(0, winnersCount);
  const losers = sorted.slice(sorted.length - losersCount);

  // Format analysis
  const winnerFormats = countOccurrences(winners.map((m) => m.format));
  const winFormat = Object.entries(winnerFormats).sort((a, b) => b[1] - a[1])[0];
  const formatWinRate = winFormat ? winFormat[1] / winnersCount : 0;

  // Topic analysis
  const winnerTopics = countOccurrences(winners.map((m) => m.topic));
  const winTopic = Object.entries(winnerTopics).sort((a, b) => b[1] - a[1])[0];
  const topicWinRate = winTopic ? winTopic[1] / winnersCount : 0;

  // Style analysis (extract from prompt)
  const winnerStyles = countOccurrences(winners.map((m) => extractStyle(m.prompt)));
  const winStyle = Object.entries(winnerStyles).sort((a, b) => b[1] - a[1])[0];
  const styleWinRate = winStyle ? winStyle[1] / winnersCount : 0;

  // Generate insights
  const insights: string[] = [];

  if (formatWinRate > 0.6) {
    insights.push(`Format "${winFormat?.[0]}" wins 60%+ of time — boost allocation`);
  }
  if (topicWinRate > 0.5) {
    insights.push(`Topic "${winTopic?.[0]}" performs 50%+ higher — prioritize`);
  }

  // Compare vs losers
  const loserFormats = countOccurrences(losers.map((m) => m.format));
  const loserFormat = Object.entries(loserFormats).sort((a, b) => b[1] - a[1])[0];
  if (loserFormat && loserFormat[0] !== winFormat?.[0]) {
    insights.push(`Avoid "${loserFormat[0]}" format — performs 50%+ worse`);
  }

  const avgWinnerEngagement = winners.reduce((sum, m) => sum + m.engagement, 0) / winners.length;
  const avgLoserEngagement = losers.reduce((sum, m) => sum + m.engagement, 0) / losers.length;
  if (avgWinnerEngagement > avgLoserEngagement * 1.5) {
    insights.push(
      `Winner engagement ${(avgWinnerEngagement * 100).toFixed(1)}% vs loser ${(avgLoserEngagement * 100).toFixed(1)}% — gap widening`,
    );
  }

  return {
    format: { winner: winFormat?.[0] || 'unknown', winRate: formatWinRate },
    topic: { winner: winTopic?.[0] || 'unknown', winRate: topicWinRate },
    style: { winner: winStyle?.[0] || 'unknown', winRate: styleWinRate },
    insights: insights.slice(0, 5),
  };
};

/**
 * Auto-update ranking weights based on patterns
 */
export const autoUpdateWeights = (): WeightUpdate => {
  const analysis = analyzeWinningPatterns();

  // If insufficient data, return current weights
  if (analysis.format.winner === 'insufficient_data') {
    return currentWeights;
  }

  // Calculate new weights based on win rates
  const newWeights = { ...currentWeights };

  // Boost high-performing dimensions
  if (analysis.format.winRate > 0.6) {
    newWeights.formatWeight = Math.min(0.4, currentWeights.formatWeight + 0.05);
  }
  if (analysis.topic.winRate > 0.5) {
    newWeights.topicWeight = Math.min(0.3, currentWeights.topicWeight + 0.05);
  }
  if (analysis.style.winRate > 0.5) {
    newWeights.styleWeight = Math.min(0.25, currentWeights.styleWeight + 0.05);
  }

  // Rebalance to sum to 1.0
  const total = newWeights.formatWeight + newWeights.categoryWeight + newWeights.topicWeight + newWeights.styleWeight;
  newWeights.formatWeight /= total;
  newWeights.categoryWeight /= total;
  newWeights.topicWeight /= total;
  newWeights.styleWeight /= total;

  // Confidence increases with sample size
  newWeights.confidence = Math.min(0.95, 0.5 + promptMetricsLog.length * 0.01);
  newWeights.appliedAt = new Date().toISOString();

  currentWeights = newWeights;
  weightHistory.push(newWeights);

  console.log('[AutoFeedback] Weights updated:', {
    format: (newWeights.formatWeight * 100).toFixed(0) + '%',
    confidence: (newWeights.confidence * 100).toFixed(0) + '%',
  });

  return newWeights;
};

/**
 * Get current ranking weights
 */
export const getCurrentWeights = (): WeightUpdate => currentWeights;

/**
 * Get weight evolution over time
 */
export const getWeightHistory = (): WeightUpdate[] => weightHistory;

/**
 * Get metrics summary (for dashboard)
 */
export const getMetricsSummary = (): {
  totalPrompts: number;
  avgEngagement: number;
  avgConversions: number;
  avgImpressions: number;
  topFormat: string;
  topTopic: string;
} => {
  if (promptMetricsLog.length === 0) {
    return {
      totalPrompts: 0,
      avgEngagement: 0,
      avgConversions: 0,
      avgImpressions: 0,
      topFormat: 'no_data',
      topTopic: 'no_data',
    };
  }

  const avgEngagement = promptMetricsLog.reduce((sum, m) => sum + m.engagement, 0) / promptMetricsLog.length;
  const avgConversions = promptMetricsLog.reduce((sum, m) => sum + m.conversions, 0) / promptMetricsLog.length;
  const avgImpressions = promptMetricsLog.reduce((sum, m) => sum + m.impressions, 0) / promptMetricsLog.length;

  const formats = countOccurrences(promptMetricsLog.map((m) => m.format));
  const topics = countOccurrences(promptMetricsLog.map((m) => m.topic));

  return {
    totalPrompts: promptMetricsLog.length,
    avgEngagement: Math.round(avgEngagement * 1000) / 10,
    avgConversions: Math.round(avgConversions),
    avgImpressions: Math.round(avgImpressions),
    topFormat: Object.entries(formats).sort((a, b) => b[1] - a[1])[0]?.[0] || 'unknown',
    topTopic: Object.entries(topics).sort((a, b) => b[1] - a[1])[0]?.[0] || 'unknown',
  };
};

/**
 * Run auto-feedback cycle (would be called by scheduler)
 */
export const runAutoFeedbackCycle = (): {
  metricsRecorded: number;
  patterns: PatternAnalysis;
  weightsUpdated: WeightUpdate;
} => {
  const patterns = analyzeWinningPatterns();
  const weightsUpdated = autoUpdateWeights();

  console.log('[AutoFeedback] Cycle complete:', {
    samples: promptMetricsLog.length,
    topFormat: patterns.format.winner,
    confidence: (weightsUpdated.confidence * 100).toFixed(0) + '%',
  });

  return {
    metricsRecorded: promptMetricsLog.length,
    patterns,
    weightsUpdated,
  };
};

// ============ HELPERS ============

const countOccurrences = (arr: string[]): Record<string, number> => arr.reduce(
    (acc, item) => {
      acc[item] = (acc[item] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

const extractStyle = (prompt: string): string => {
  const lower = prompt.toLowerCase();
  if (lower.includes('luxury') || lower.includes('premium')) return 'luxury';
  if (lower.includes('minimalist') || lower.includes('clean')) return 'minimalist';
  if (lower.includes('bold') || lower.includes('vibrant')) return 'bold';
  if (lower.includes('educational') || lower.includes('tutorial')) return 'educational';
  if (lower.includes('inspirational') || lower.includes('motivational')) return 'inspirational';
  return 'default';
};
