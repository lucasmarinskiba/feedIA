/**
 * Quality Feedback Loop API Routes
 * /api/feedback/* — collect & analyze prompt quality ratings
 */

import { Router, Request, Response } from 'express';
import {
  saveFeedback,
  getBatchQualityScore,
  getAllBatchQualityScores,
  getUserFeedbackHistory,
  getQualityWeightBoost,
} from '../services/feedback-service.js';
import { retrainWeights, getQualityRecommendations } from '../services/ranking-optimizer.js';

const router = Router();

/**
 * POST /api/feedback/save
 * Save user rating on prompt batch quality
 *
 * Request:
 * {
 *   "userId": "user-123",
 *   "batchId": 88,
 *   "rating": 5,
 *   "content": "Perfect for skincare carousel!"
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "feedbackId": "feedback_user-123_88_1723457890",
 *   "batchId": 88,
 *   "rating": 5
 * }
 */
router.post('/save', async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId, batchId, rating, content } = req.body as {
      userId: string;
      batchId: number;
      rating: number;
      content?: string;
    };

    if (!userId || !batchId || rating === undefined) {
      return res.status(400).json({ error: 'userId, batchId, rating required' });
      return;
    }

    const result = await saveFeedback(userId, batchId, rating, content);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
      return;
    }

    console.log('[QualityLoop] Feedback saved:', { userId, batchId, rating });

    return res.json({
      success: true,
      feedbackId: result.feedbackId,
      batchId,
      rating,
      message: `Thanks! Rating saved for Batch ${batchId}`,
    });
  } catch (err) {
    console.error('[QualityLoop] Save error:', err);
    return res.status(500).json({ error: String(err) });
  }
});

/**
 * GET /api/feedback/quality-scores/:batchId
 * Get quality score (avg rating + trend) for specific batch
 *
 * Example: GET /api/feedback/quality-scores/88
 * Response:
 * {
 *   "batchId": 88,
 *   "averageRating": 4.7,
 *   "totalRatings": 23,
 *   "trend": "improving",
 *   "qualityBoost": 1.18
 * }
 */
router.get('/quality-scores/:batchId', async (req: Request, res: Response): Promise<void> => {
  try {
    const batchId = parseInt(req.params.batchId as string, 10);

    if (!batchId || isNaN(batchId)) {
      return res.status(400).json({ error: 'batchId required' });
      return;
    }

    const score = await getBatchQualityScore(batchId);
    const boost = await getQualityWeightBoost(batchId);

    if (!score) {
      return res.status(404).json({ error: `No ratings for Batch ${batchId}` });
      return;
    }

    return res.json({
      batchId: score.batchId,
      averageRating: parseFloat(score.averageRating.toFixed(2)),
      totalRatings: score.totalRatings,
      trend: score.trend,
      qualityBoost: parseFloat(boost.toFixed(2)),
      interpretation: score.averageRating >= 4.5 ? '⭐ Highly recommended' : '✓ Good performer',
    });
  } catch (err) {
    console.error('[QualityScores] Error:', err);
    return res.status(500).json({ error: String(err) });
  }
});

/**
 * GET /api/feedback/quality-scores
 * Get all batch quality scores (for analytics)
 *
 * Response:
 * {
 *   "batches": [
 *     { "batchId": 88, "averageRating": 4.7, "totalRatings": 23 },
 *     { "batchId": 65, "averageRating": 4.3, "totalRatings": 15 },
 *     ...
 *   ]
 * }
 */
router.get('/quality-scores', async (req: Request, res: Response): Promise<void> => {
  try {
    const scores = await getAllBatchQualityScores();

    return res.json({
      success: true,
      batches: scores.map((s) => ({
        batchId: s.batchId,
        averageRating: parseFloat(s.averageRating.toFixed(2)),
        totalRatings: s.totalRatings,
      })),
      totalBatches: scores.length,
      message: `Retrieved quality scores for ${scores.length} batches`,
    });
  } catch (err) {
    console.error('[AllQualityScores] Error:', err);
    return res.status(500).json({ error: String(err) });
  }
});

/**
 * GET /api/feedback/history/:userId
 * Get user's feedback history
 *
 * Example: GET /api/feedback/history/user-123
 * Response:
 * {
 *   "userId": "user-123",
 *   "feedback": [
 *     { "id": "feedback_...", "batchId": 88, "rating": 5, "createdAt": "2024-08-12T..." },
 *     ...
 *   ]
 * }
 */
router.get('/history/:userId', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.params.userId as string;

    if (!userId) {
      return res.status(400).json({ error: 'userId required' });
      return;
    }

    const history = await getUserFeedbackHistory(userId);

    return res.json({
      success: true,
      userId,
      feedback: history,
      count: history.length,
    });
  } catch (err) {
    console.error('[FeedbackHistory] Error:', err);
    return res.status(500).json({ error: String(err) });
  }
});

/**
 * POST /api/feedback/retrain
 * Retrain ranking weights based on accumulated feedback
 *
 * Response:
 * {
 *   "success": true,
 *   "oldWeights": { "formatWeight": 0.5, ... },
 *   "newWeights": { "formatWeight": 0.55, ... },
 *   "improvement": 10,
 *   "analysis": { "totalBatches": 15, "topPerformers": 8, "underperformers": 3 }
 * }
 */
router.post('/retrain', async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await retrainWeights();

    console.log('[Retrain] Weights updated:', result);

    return res.json({
      success: true,
      oldWeights: result.oldWeights,
      newWeights: result.newWeights,
      improvementPercent: result.improvementPercent,
      message: `Ranking weights retrained. ${result.improvementPercent > 0 ? '📈 Improved' : '→ Stable'}`,
    });
  } catch (err) {
    console.error('[Retrain] Error:', err);
    return res.status(500).json({ error: String(err) });
  }
});

/**
 * GET /api/feedback/recommendations
 * Get top recommended batches based on quality feedback
 *
 * Response:
 * {
 *   "recommendations": [
 *     { "batchId": 88, "avgRating": 4.8, "totalRatings": 23, "recommendation": "⭐ Highly recommended" },
 *     ...
 *   ]
 * }
 */
router.get('/recommendations', async (req: Request, res: Response): Promise<void> => {
  try {
    const recs = await getQualityRecommendations();

    return res.json({
      success: true,
      recommendations: recs,
      count: recs.length,
      message: 'Top-rated batches for prompt selection',
    });
  } catch (err) {
    console.error('[Recommendations] Error:', err);
    return res.status(500).json({ error: String(err) });
  }
});

export default router;
