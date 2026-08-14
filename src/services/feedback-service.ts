/**
 * Quality Feedback Loop Service
 * Collects user ratings on prompt quality
 * Analyzes patterns to optimize future ranking
 */

import { getPool } from '../db/postgres-real.js';

export interface FeedbackRecord {
  id: string;
  userId: string;
  batchId: number;
  rating: number; // 1-5
  content?: string;
  createdAt: string;
}

export interface BatchQualityScore {
  batchId: number;
  averageRating: number;
  totalRatings: number;
  trend: 'improving' | 'stable' | 'declining';
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

    // Try to save to DB
    const pool = getPool();
    await pool.query(
      `INSERT INTO feedback (id, user_id, batch_id, rating, content, created_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (user_id, batch_id) DO UPDATE SET rating = $4, updated_at = NOW()`,
      [feedbackId, userId, batchId, rating, content, now],
    );

    console.log('[Feedback] Saved:', { userId, batchId, rating });

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
    const pool = getPool();

    const result = await pool.query(
      `SELECT
        AVG(rating) as avg_rating,
        COUNT(*) as total_ratings,
        -- Simple trend: compare recent vs older ratings
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

    if (!result.rows || result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0] as {
      avg_rating: number | null;
      total_ratings: number;
      trend: 'improving' | 'stable' | 'declining';
    };

    return {
      batchId,
      averageRating: row.avg_rating || 0,
      totalRatings: row.total_ratings || 0,
      trend: row.trend || 'stable',
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
    const pool = getPool();

    const result = await pool.query(`
      SELECT
        batch_id,
        AVG(rating) as avg_rating,
        COUNT(*) as total_ratings
      FROM feedback
      GROUP BY batch_id
      ORDER BY avg_rating DESC
    `);

    return (result.rows || []).map((row: unknown) => {
      const r = row as Record<string, unknown>;
      return {
        batchId: r.batch_id as number,
        averageRating: (r.avg_rating as number) || 0,
        totalRatings: (r.total_ratings as number) || 0,
        trend: 'stable' as const, // Simplified for batch report
      };
    });
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
    const pool = getPool();

    const result = await pool.query(
      `SELECT id, user_id, batch_id, rating, content, created_at
       FROM feedback
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 50`,
      [userId],
    );

    return (result.rows || []) as FeedbackRecord[];
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
