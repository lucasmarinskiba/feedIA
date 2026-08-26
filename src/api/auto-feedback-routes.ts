/**
 * Auto Feedback Loop API Routes
 * /api/auto-feedback/* — Track performance → auto-update ranking weights (no user input)
 */

import { Router, Request, Response } from 'express';
import {
  recordPromptPerformance,
  analyzeWinningPatterns,
  autoUpdateWeights,
  getCurrentWeights,
  getWeightHistory,
  getMetricsSummary,
  runAutoFeedbackCycle,
  type PromptMetrics,
} from '../services/auto-feedback-loop.js';

const router = Router();

/**
 * POST /api/auto-feedback/record
 * Record prompt performance (called after generation)
 *
 * Request:
 * {
 *   "batchId": 88,
 *   "prompt": "Luxury skincare carousel: before-after transformation story",
 *   "format": "carousel",
 *   "topic": "before-after",
 *   "engagement": 0.18,
 *   "conversions": 45,
 *   "impressions": 2500
 * }
 *
 * Response: { success: true, recorded: true }
 */
router.post('/record', (req: Request, res: Response): void => {
  try {
    const { batchId, prompt, format, topic, engagement, conversions, impressions } = req.body as PromptMetrics & {
      batchId: number;
    };

    if (!batchId || !prompt || !format || !topic || engagement === undefined || conversions === undefined) {
      return res.status(400).json({
        error: 'batchId, prompt, format, topic, engagement, conversions required',
      });
      return;
    }

    recordPromptPerformance({
      batchId,
      prompt,
      format,
      topic,
      engagement,
      conversions,
      impressions,
      timestamp: new Date().toISOString(),
    });

    return res.json({
      success: true,
      recorded: true,
      message: `Recorded performance for batch ${batchId}`,
    });
  } catch (err) {
    console.error('[AutoFeedback] Record failed:', err);
    return res.status(500).json({ error: String(err) });
  }
});

/**
 * GET /api/auto-feedback/patterns
 * Analyze patterns in winning prompts (no user rating needed)
 *
 * Response:
 * {
 *   "format": { "winner": "carousel", "winRate": 0.65 },
 *   "topic": { "winner": "before-after", "winRate": 0.58 },
 *   "style": { "winner": "luxury", "winRate": 0.62 },
 *   "insights": [
 *     "Format \"carousel\" wins 65% of time — boost allocation",
 *     "Topic \"before-after\" performs 58% higher — prioritize"
 *   ]
 * }
 */
router.get('/patterns', (req: Request, res: Response): void => {
  try {
    const patterns = analyzeWinningPatterns();

    return res.json({
      success: true,
      patterns,
    });
  } catch (err) {
    console.error('[AutoFeedback] Patterns failed:', err);
    return res.status(500).json({ error: String(err) });
  }
});

/**
 * POST /api/auto-feedback/update-weights
 * Auto-update ranking weights based on patterns
 *
 * Response:
 * {
 *   "formatWeight": 0.38,
 *   "categoryWeight": 0.28,
 *   "topicWeight": 0.24,
 *   "styleWeight": 0.18,
 *   "confidence": 0.75,
 *   "appliedAt": "2026-08-14T14:30:00Z"
 * }
 */
router.post('/update-weights', (req: Request, res: Response): void => {
  try {
    const updated = autoUpdateWeights();

    return res.json({
      success: true,
      updated,
      message: `Weights updated. Confidence: ${(updated.confidence * 100).toFixed(0)}%`,
    });
  } catch (err) {
    console.error('[AutoFeedback] Update failed:', err);
    return res.status(500).json({ error: String(err) });
  }
});

/**
 * GET /api/auto-feedback/weights
 * Get current ranking weights
 *
 * Response:
 * {
 *   "formatWeight": 0.38,
 *   "categoryWeight": 0.28,
 *   "topicWeight": 0.24,
 *   "styleWeight": 0.18,
 *   "confidence": 0.75
 * }
 */
router.get('/weights', (req: Request, res: Response): void => {
  try {
    const weights = getCurrentWeights();

    return res.json({
      success: true,
      weights,
    });
  } catch (err) {
    console.error('[AutoFeedback] Weights failed:', err);
    return res.status(500).json({ error: String(err) });
  }
});

/**
 * GET /api/auto-feedback/weight-history
 * Get weight evolution over time
 *
 * Response: { history: [...] }
 */
router.get('/weight-history', (req: Request, res: Response): void => {
  try {
    const history = getWeightHistory();

    return res.json({
      success: true,
      history,
      evolutionCount: history.length,
    });
  } catch (err) {
    console.error('[AutoFeedback] History failed:', err);
    return res.status(500).json({ error: String(err) });
  }
});

/**
 * GET /api/auto-feedback/summary
 * Get metrics dashboard (total prompts, avg engagement, etc)
 *
 * Response:
 * {
 *   "totalPrompts": 152,
 *   "avgEngagement": 15.2,
 *   "avgConversions": 24,
 *   "avgImpressions": 1500,
 *   "topFormat": "carousel",
 *   "topTopic": "before-after"
 * }
 */
router.get('/summary', (req: Request, res: Response): void => {
  try {
    const summary = getMetricsSummary();

    return res.json({
      success: true,
      summary,
    });
  } catch (err) {
    console.error('[AutoFeedback] Summary failed:', err);
    return res.status(500).json({ error: String(err) });
  }
});

/**
 * POST /api/auto-feedback/cycle
 * Run full auto-feedback cycle (analyze + update weights)
 *
 * Response:
 * {
 *   "metricsRecorded": 152,
 *   "patterns": { ... },
 *   "weightsUpdated": { ... }
 * }
 */
router.post('/cycle', (req: Request, res: Response): void => {
  try {
    const result = runAutoFeedbackCycle();

    return res.json({
      success: true,
      result,
      message: `Cycle complete. ${result.metricsRecorded} metrics analyzed, weights updated.`,
    });
  } catch (err) {
    console.error('[AutoFeedback] Cycle failed:', err);
    return res.status(500).json({ error: String(err) });
  }
});

export default router;
