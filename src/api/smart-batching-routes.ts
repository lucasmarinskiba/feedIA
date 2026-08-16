/**
 * Smart Batching API Routes
 * /api/batch/* — Generate 30+ assets with auto-optimized strategy
 */

import { Router, Request, Response } from 'express';
import { generateSmartBatch, executeBatch, generateMultiQuarterStrategy, type StrategyGoal, type BatchResult } from '../services/smart-batching.js';

const router = Router();

// Store active batches in memory (would use DB in production)
const activeBatches = new Map<string, BatchResult>();

/**
 * POST /api/batch/plan
 * Generate smart batch plan (no execution yet)
 *
 * Request:
 * {
 *   "brand": "LuxySkin",
 *   "niche": "skincare",
 *   "quarterGoal": "Q3 brand awareness and engagement",
 *   "duration": 12,
 *   "budget": 3000,
 *   "targetAudience": "luxury beauty women 25-45",
 *   "platform": "instagram"
 * }
 *
 * Response:
 * {
 *   "roadmap": [
 *     { "week": 1, "format": "carousel", "topic": "morning-routine", "quantity": 3, "expectedResult": "awareness" },
 *     { "week": 1, "format": "reel", "topic": "ingredients-explained", "quantity": 2, "expectedResult": "awareness" },
 *     { "week": 1, "format": "story", "topic": "behind-the-scenes", "quantity": 5, "expectedResult": "awareness" }
 *   ],
 *   "totalAssets": 120,
 *   "totalWeeks": 12,
 *   "estimatedBudget": 3000,
 *   "estimatedImpressions": 600000,
 *   "estimatedConversions": 2400,
 *   "timeToProduction": "14 hours",
 *   "status": "planning"
 * }
 */
router.post('/plan', (req: Request, res: Response): void => {
  try {
    const { brand, niche, quarterGoal, duration, budget, targetAudience, platform } = req.body as StrategyGoal & { brand: string };

    if (!brand || !niche || !quarterGoal || !duration || !budget || !targetAudience || !platform) {
      res.status(400).json({
        error: 'brand, niche, quarterGoal, duration, budget, targetAudience, platform required',
      });
      return;
    }

    if (duration < 1 || duration > 52) {
      res.status(400).json({
        error: 'duration must be 1-52 weeks',
      });
      return;
    }

    if (budget < 300) {
      res.status(400).json({
        error: 'budget must be >= $300',
      });
      return;
    }

    const batch = generateSmartBatch({
      brand,
      niche,
      quarterGoal,
      duration,
      budget,
      targetAudience,
      platform,
    });

    // Store for later execution
    const batchId = `batch_${Date.now()}`;
    activeBatches.set(batchId, batch);

    console.log('[SmartBatch] Plan created:', { batchId, totalAssets: batch.totalAssets, weeks: batch.totalWeeks });

    res.json({
      success: true,
      batchId,
      data: batch,
    });
  } catch (err) {
    console.error('[SmartBatch] Plan failed:', err);
    res.status(500).json({ error: String(err) });
  }
});

/**
 * POST /api/batch/:batchId/execute
 * Execute batch generation (generate all assets)
 *
 * Response: { status: "generating", totalAssets: 120, timeToProduction: "14 hours" }
 */
router.post('/:batchId/execute', async (req: Request, res: Response): Promise<void> => {
  try {
    const { batchId } = req.params;
    const batch = activeBatches.get(batchId);

    if (!batch) {
      res.status(404).json({ error: `Batch ${batchId} not found` });
      return;
    }

    // Execute in background
    executeBatch(batch)
      .then((result) => {
        activeBatches.set(batchId, result);
        console.log('[SmartBatch] Execution complete:', { batchId, status: result.status });
      })
      .catch((err) => {
        console.error('[SmartBatch] Execution failed:', err);
      });

    res.json({
      success: true,
      batchId,
      status: 'generating',
      message: `Batch execution started. ${batch.totalAssets} assets will be generated.`,
      timeToProduction: batch.timeToProduction,
      estimatedConversions: batch.estimatedConversions,
    });
  } catch (err) {
    console.error('[SmartBatch] Execute failed:', err);
    res.status(500).json({ error: String(err) });
  }
});

/**
 * GET /api/batch/:batchId/status
 * Check batch generation status
 *
 * Response: { status: "complete", totalAssets: 120, conversions: 2400 }
 */
router.get('/:batchId/status', (req: Request, res: Response): void => {
  try {
    const { batchId } = req.params;
    const batch = activeBatches.get(batchId);

    if (!batch) {
      res.status(404).json({ error: `Batch ${batchId} not found` });
      return;
    }

    res.json({
      success: true,
      batchId,
      status: batch.status,
      totalAssets: batch.totalAssets,
      totalWeeks: batch.totalWeeks,
      estimatedConversions: batch.estimatedConversions,
      roadmapItems: batch.roadmap.length,
    });
  } catch (err) {
    console.error('[SmartBatch] Status failed:', err);
    res.status(500).json({ error: String(err) });
  }
});

/**
 * GET /api/batch/:batchId/roadmap
 * Get detailed week-by-week roadmap
 *
 * Response: { roadmap: [...], summary: {...} }
 */
router.get('/:batchId/roadmap', (req: Request, res: Response): void => {
  try {
    const { batchId } = req.params;
    const batch = activeBatches.get(batchId);

    if (!batch) {
      res.status(404).json({ error: `Batch ${batchId} not found` });
      return;
    }

    // Group by week
    const byWeek: Record<number, typeof batch.roadmap> = {};
    batch.roadmap.forEach((item) => {
      if (!byWeek[item.week]) byWeek[item.week] = [];
      byWeek[item.week].push(item);
    });

    res.json({
      success: true,
      batchId,
      summary: {
        totalAssets: batch.totalAssets,
        totalWeeks: batch.totalWeeks,
        estimatedBudget: batch.estimatedBudget,
        estimatedConversions: batch.estimatedConversions,
      },
      weeklyBreakdown: byWeek,
    });
  } catch (err) {
    console.error('[SmartBatch] Roadmap failed:', err);
    res.status(500).json({ error: String(err) });
  }
});

/**
 * POST /api/batch/multi-quarter
 * Generate strategy for entire year (Q1-Q4 with topic carry-over)
 *
 * Request:
 * {
 *   "brand": "LuxySkin",
 *   "niche": "skincare",
 *   "year": 2026,
 *   "budget": 12000,
 *   "targetAudience": "luxury beauty women 25-45",
 *   "platform": "instagram"
 * }
 *
 * Response:
 * {
 *   "Q1": { roadmap: [...], totalAssets: 30, estimatedConversions: 600 },
 *   "Q2": { roadmap: [...], totalAssets: 30, estimatedConversions: 750 },
 *   "Q3": { roadmap: [...], totalAssets: 30, estimatedConversions: 900 },
 *   "Q4": { roadmap: [...], totalAssets: 30, estimatedConversions: 800 }
 * }
 */
router.post('/multi-quarter', (req: Request, res: Response): void => {
  try {
    const { brand, niche, year, budget, targetAudience, platform } = req.body as Omit<StrategyGoal, 'quarterGoal'> & {
      brand: string;
      year: number;
    };

    if (!brand || !niche || !year || !budget || !targetAudience || !platform) {
      res.status(400).json({
        error: 'brand, niche, year, budget, targetAudience, platform required',
      });
      return;
    }

    const yearPlan = generateMultiQuarterStrategy(
      {
        brand,
        niche,
        year,
        budget,
        targetAudience,
        platform,
        duration: 13, // 13 weeks per quarter
      },
      ['Q1', 'Q2', 'Q3', 'Q4']
    );

    const yearSummary = {
      year,
      totalAssets: Object.values(yearPlan).reduce((sum, q) => sum + q.totalAssets, 0),
      totalBudget: budget,
      totalEstimatedConversions: Object.values(yearPlan).reduce((sum, q) => sum + q.estimatedConversions, 0),
      quarterSummary: Object.entries(yearPlan).reduce(
        (acc, [quarter, plan]) => {
          acc[quarter] = {
            assets: plan.totalAssets,
            conversions: plan.estimatedConversions,
            timeToProduction: plan.timeToProduction,
          };
          return acc;
        },
        {} as Record<string, unknown>
      ),
    };

    console.log('[SmartBatch] Year plan created:', { year, totalAssets: yearSummary.totalAssets });

    res.json({
      success: true,
      yearPlan,
      yearSummary,
    });
  } catch (err) {
    console.error('[SmartBatch] Multi-quarter failed:', err);
    res.status(500).json({ error: String(err) });
  }
});

export default router;
