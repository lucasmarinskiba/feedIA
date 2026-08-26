/**
 * Quality Feedback Loop Service
 * Collects user ratings on prompt quality
 * Analyzes patterns to optimize future ranking
 */

import { queryAs, queryOneAs } from '../db/typed-queries.js';

// Mock feedback storage for development (SQLite pool doesn't support feedback tables yet)
const mockFeedback = new Map<string, { batchId: number; rating: number; content?: string; createdAt: string }>();

export interface FeedbackRecord {
  id: string;
  user_id: string;
  batch_id: number;
  rating: number; // 1-5
  content?: string;
  created_at: string;
}

export interface BatchQualityScore {
  batchId: number;
  averageRating: number;
  totalRatings: number;
  trend: 'improving' | 'stable' | 'declining';
}

interface QualityScoreRow {
  avg_rating: number | null;
  total_ratings: number;
  trend: 'improving' | 'stable' | 'declining';
}

interface AllQualityRow {
  batch_id: number;
  avg_rating: number | null;
  total_ratings: number;
}

/**
 * Save user feedback on prompt quality
 */
export const saveFeedback = async (
  userId: string,
  batchId: number,
  rating: number,
  content?: string,
): Promise<{ success: boolean; feedbackId?: string; error?: string }> => {
  try {
    if (!userId || !batchId) {
      return { success: false, error: 'userId and batchId required' };
    }

    if (rating < 1 || rating > 5) {
      return { success: false, error: 'rating must be 1-5' };
    }

    const feedbackId = `feedback_${userId}_${batchId}_${Date.now()}`;
    const now = new Date().toISOString();

    // Mock storage (development)
    mockFeedback.set(`${userId}:${batchId}`, {
      batchId,
      rating,
      content,
      createdAt: now,
    });

    console.log('[Feedback] Saved (mock):', { userId, batchId, rating });

    return { success: true, feedbackId };
  } catch (err) {
    console.error('[Feedback] Save failed:', err);
    return { success: false, error: String(err) };
  }
};

/**
 * Get quality score for a batch (avg rating + trend)
 */
export const getBatchQualityScore = async (batchId: number): Promise<BatchQualityScore | null> => {
  try {
    const result = await queryOneAs<QualityScoreRow>(
      `SELECT
        AVG(rating) as avg_rating,
        COUNT(*) as total_ratings,
        CASE
          WHEN AVG(CASE WHEN created_at > NOW() - INTERVAL '7 days' THEN rating END) >
               AVG(CASE WHEN created_at < NOW() - INTERVAL '7 days' THEN rating END) THEN 'improving'
          WHEN AVG(CASE WHEN created_at > NOW() - INTERVAL '7 days' THEN rating END) <
               AVG(CASE WHEN created_at < NOW() - INTERVAL '7 days' THEN rating END) THEN 'declining'
          ELSE 'stable'
        END as trend
       FROM feedback
       WHERE batch_id = $1`,
      [batchId],
    );

    if (!result) {
      return null;
    }

    return {
      batchId,
      averageRating: result.avg_rating || 0,
      totalRatings: result.total_ratings || 0,
      trend: result.trend || 'stable',
    };
  } catch (err) {
    console.error('[QualityScore] Fetch failed:', err);
    return null;
  }
};

/**
 * Get all batch quality scores (for model retraining)
 */
export const getAllBatchQualityScores = async (): Promise<BatchQualityScore[]> => {
  try {
    const results = await queryAs<AllQualityRow>(`
      SELECT
        batch_id,
        AVG(rating) as avg_rating,
        COUNT(*) as total_ratings
      FROM feedback
      GROUP BY batch_id
      ORDER BY avg_rating DESC
    `);

    return results.map((row) => ({
      batchId: row.batch_id,
      averageRating: row.avg_rating || 0,
      totalRatings: row.total_ratings || 0,
      trend: 'stable' as const, // Simplified for batch report
    }));
  } catch (err) {
    console.error('[AllQualityScores] Fetch failed:', err);
    return [];
  }
};

/**
 * Get user's feedback history
 */
export const getUserFeedbackHistory = async (userId: string): Promise<FeedbackRecord[]> => {
  try {
    return queryAs<FeedbackRecord>(
      `SELECT id, user_id, batch_id, rating, content, created_at
       FROM feedback
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 50`,
      [userId],
    );
  } catch (err) {
    console.error('[UserHistory] Fetch failed:', err);
    return [];
  }
};

/**
 * Calculate quality-weighted ranking boost
 * Batches with higher ratings get boosted in future rankings
 */
export const getQualityWeightBoost = async (batchId: number): Promise<number> => {
  const score = await getBatchQualityScore(batchId);

  if (!score || score.totalRatings < 3) {
    return 1.0; // No boost if insufficient data
  }

  // Boost range: 0.8 (for 2-star avg) to 1.3 (for 5-star avg)
  const normalizedRating = (score.averageRating - 1) / 4; // 0-1 scale
  const boost = 0.8 + normalizedRating * 0.5;

  return Math.min(boost, 1.3); // Cap at 1.3x
};
