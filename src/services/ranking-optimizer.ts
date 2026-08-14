/**
 * Ranking Optimizer
 * Adjusts prompt ranking weights based on collected feedback
 * Uses quality scores to boost high-performing batches
 */

import { getAllBatchQualityScores, getQualityWeightBoost } from './feedback-service.js';

export interface DynamicWeights {
  formatWeight: number; // default 0.5
  categoryWeight: number; // default 0.3
  topicWeight: number; // default 0.2
  qualityBoost: boolean;
}

export interface OptimizedScore {
  batchId: number;
  baseScore: number;
  qualityBoost: number;
  finalScore: number;
}

/**
 * Get current dynamic weights (default or from feedback history)
 */
export const getDynamicWeights = async (): Promise<DynamicWeights> =>
  // TODO: Persist weights in DB after retraining
  // For now, return defaults
  ({
    formatWeight: 0.5,
    categoryWeight: 0.3,
    topicWeight: 0.2,
    qualityBoost: true,
  });

/**
 * Apply quality boost to ranking score
 */
export const applyQualityBoost = async (batchId: number, baseScore: number): Promise<OptimizedScore> => {
  const boost = await getQualityWeightBoost(batchId);

  return {
    batchId,
    baseScore,
    qualityBoost: boost,
    finalScore: baseScore * boost,
  };
};

/**
 * Retrain weights based on feedback data
 * Increases weights for factors that correlate with high ratings
 */
export const retrainWeights = async (): Promise<{
  oldWeights: DynamicWeights;
  newWeights: DynamicWeights;
  improvementPercent: number;
}> => {
  try {
    const qualityScores = await getAllBatchQualityScores();

    if (qualityScores.length === 0) {
      console.warn('[Optimizer] No feedback data for retraining');
      return {
        oldWeights: { formatWeight: 0.5, categoryWeight: 0.3, topicWeight: 0.2, qualityBoost: true },
        newWeights: { formatWeight: 0.5, categoryWeight: 0.3, topicWeight: 0.2, qualityBoost: true },
        improvementPercent: 0,
      };
    }

    // Analysis: which batches have highest ratings?
    const topBatches = qualityScores.filter((s) => s.averageRating >= 4);
    const bottomBatches = qualityScores.filter((s) => s.averageRating < 3);

    console.log('[Optimizer] Analysis:', {
      totalBatches: qualityScores.length,
      topPerformers: topBatches.length,
      underperformers: bottomBatches.length,
      avgRating: (qualityScores.reduce((sum, s) => sum + s.averageRating, 0) / qualityScores.length).toFixed(2),
    });

    // Simple weight adjustment: boost format if it's the strongest signal
    const oldWeights = await getDynamicWeights();
    const newWeights = { ...oldWeights };

    // If top batches have consistent format, increase formatWeight
    if (topBatches.length > bottomBatches.length) {
      newWeights.formatWeight = Math.min(0.55, oldWeights.formatWeight + 0.05);
      newWeights.topicWeight = Math.max(0.15, oldWeights.topicWeight - 0.05);
    }

    const improvement = ((newWeights.formatWeight - oldWeights.formatWeight) / oldWeights.formatWeight) * 100;

    console.log('[Optimizer] Weights adjusted:', { oldWeights, newWeights });

    return {
      oldWeights,
      newWeights,
      improvementPercent: improvement,
    };
  } catch (err) {
    console.error('[Optimizer] Retrain failed:', err);
    return {
      oldWeights: { formatWeight: 0.5, categoryWeight: 0.3, topicWeight: 0.2, qualityBoost: true },
      newWeights: { formatWeight: 0.5, categoryWeight: 0.3, topicWeight: 0.2, qualityBoost: true },
      improvementPercent: 0,
    };
  }
};

/**
 * Get recommendation based on feedback patterns
 * E.g., "carousel + product category is 4.8★ — highly recommended"
 */
export const getQualityRecommendations = async (): Promise<
  Array<{ formatCategory: string; avgRating: number; totalRatings: number; recommendation: string }>
> => {
  const scores = await getAllBatchQualityScores();

  const topRecommendations = scores
    .filter((s) => s.totalRatings >= 2) // Minimum feedback threshold
    .sort((a, b) => b.averageRating - a.averageRating)
    .slice(0, 5)
    .map((s) => ({
      formatCategory: `Batch ${s.batchId}`,
      avgRating: parseFloat(s.averageRating.toFixed(2)),
      totalRatings: s.totalRatings,
      recommendation: s.averageRating >= 4.5 ? '⭐ Highly recommended' : '✓ Recommended',
    }));

  return topRecommendations;
};
