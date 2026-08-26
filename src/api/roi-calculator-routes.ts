/**
 * ROI Calculator API Routes
 * /api/roi/* — Estimate cost per result, engagement, conversions
 */

import { Router, Request, Response } from 'express';
import {
  calculateROI,
  compareFormats,
  optimizeBudgetAllocation,
  type ROIInput,
  type ROIOutput,
} from '../services/roi-calculator.js';

const router = Router();

/**
 * POST /api/roi/calculate
 * Estimate ROI for a single format
 *
 * Request:
 * {
 *   "format": "carousel" | "reel" | "story" | "static",
 *   "topic": "Premium skincare products",
 *   "targetAudience": "luxury beauty enthusiasts 25-45",
 *   "budget": 500,
 *   "platform": "instagram" (optional),
 *   "niche": "skincare" (optional, auto-detected)
 * }
 *
 * Response:
 * {
 *   "format": "carousel",
 *   "estimatedCPR": 0.08,
 *   "expectedEngagementRate": 12.5,
 *   "estimatedImpressions": 6250,
 *   "estimatedEngagements": 780,
 *   "estimatedConversions": 35,
 *   "recommendedBudget": 500,
 *   "breakeven": 20,
 *   "roi": 3.5,
 *   "confidence": 0.85,
 *   "rationale": "...",
 *   "recommendations": [...]
 * }
 */
router.post('/calculate', (req: Request, res: Response): void => {
  try {
    const { format, topic, targetAudience, budget, platform, niche } = req.body as ROIInput & { niche?: string };

    if (!format || !topic || !targetAudience || !budget) {
      return res.status(400).json({
        error: 'format, topic, targetAudience, budget required',
      });
      return;
    }

    if (!['carousel', 'reel', 'story', 'static'].includes(format)) {
      return res.status(400).json({
        error: 'format must be carousel, reel, story, or static',
      });
      return;
    }

    if (budget < 10) {
      return res.status(400).json({
        error: 'budget must be >= $10',
      });
      return;
    }

    const result = calculateROI({
      format,
      topic,
      targetAudience,
      budget,
      platform,
    });

    console.log('[ROI] Calculated:', { format, budget, conversions: result.estimatedConversions });

    return res.json({
      success: true,
      data: result,
    });
  } catch (err) {
    console.error('[ROI] Calculate failed:', err);
    return res.status(500).json({ error: String(err) });
  }
});

/**
 * POST /api/roi/compare
 * Compare multiple formats with same budget
 *
 * Request:
 * {
 *   "formats": ["carousel", "reel", "story"],
 *   "topic": "Luxury skincare",
 *   "targetAudience": "premium women 25-45",
 *   "budget": 500,
 *   "platform": "instagram" (optional)
 * }
 *
 * Response:
 * {
 *   "results": [
 *     { format: "reel", roi: 4.2, conversions: 42 },
 *     { format: "carousel", roi: 3.5, conversions: 35 },
 *     { format: "story", roi: 2.8, conversions: 28 }
 *   ],
 *   "winner": "reel",
 *   "savings": "Allocate entire budget to reel format"
 * }
 */
router.post('/compare', (req: Request, res: Response): void => {
  try {
    const { formats, topic, targetAudience, budget, platform } = req.body as {
      formats: Array<'carousel' | 'reel' | 'story' | 'static'>;
      topic: string;
      targetAudience: string;
      budget: number;
      platform?: string;
    };

    if (!formats || !topic || !targetAudience || !budget) {
      return res.status(400).json({
        error: 'formats, topic, targetAudience, budget required',
      });
      return;
    }

    if (!Array.isArray(formats) || formats.length === 0) {
      return res.status(400).json({
        error: 'formats must be non-empty array',
      });
      return;
    }

    const results = compareFormats(formats, topic, targetAudience, budget, platform);

    // Sort by ROI
    results.sort((a, b) => b.roi - a.roi);

    console.log('[ROI] Comparison:', { formats: formats.length, winner: results[0].format });

    return res.json({
      success: true,
      results,
      winner: results[0].format,
      winnerROI: results[0].roi,
      savings: `Allocate ${budget} to ${results[0].format} for best ROI`,
      recommendation: results[0].recommendations[0],
    });
  } catch (err) {
    console.error('[ROI] Compare failed:', err);
    return res.status(500).json({ error: String(err) });
  }
});

/**
 * POST /api/roi/optimize-budget
 * Recommend optimal budget split across formats
 *
 * Request:
 * {
 *   "totalBudget": 1500,
 *   "topic": "Luxury skincare",
 *   "targetAudience": "premium women 25-45",
 *   "platform": "instagram" (optional)
 * }
 *
 * Response:
 * {
 *   "allocation": {
 *     "reel": { budget: 750, conversions: 75, roi: 4.2 },
 *     "carousel": { budget: 525, conversions: 52, roi: 3.5 },
 *     "story": { budget: 225, conversions: 45, roi: 2.8 }
 *   },
 *   "totalExpectedConversions": 172,
 *   "averageROI": 3.5,
 *   "rationale": "Reel format performs 20% better—allocate 50% budget there"
 * }
 */
router.post('/optimize-budget', (req: Request, res: Response): void => {
  try {
    const { totalBudget, topic, targetAudience, platform } = req.body as {
      totalBudget: number;
      topic: string;
      targetAudience: string;
      platform?: string;
    };

    if (!totalBudget || !topic || !targetAudience) {
      return res.status(400).json({
        error: 'totalBudget, topic, targetAudience required',
      });
      return;
    }

    if (totalBudget < 30) {
      return res.status(400).json({
        error: 'totalBudget must be >= $30',
      });
      return;
    }

    const allocation = optimizeBudgetAllocation(totalBudget, topic, targetAudience, platform);

    // Calculate totals
    const totalConversions = Object.values(allocation).reduce((sum, a) => sum + a.conversions, 0);
    const avgROI = Object.values(allocation).reduce((sum, a) => sum + a.roi, 0) / Object.keys(allocation).length;

    console.log('[ROI] Optimized:', { totalBudget, formats: Object.keys(allocation).length, totalConversions });

    return res.json({
      success: true,
      allocation,
      totalExpectedConversions: totalConversions,
      averageROI: Math.round(avgROI * 100) / 100,
      rationale: `Budget split optimizes for ${Object.keys(allocation)[0]} format (highest ROI). Expected ${totalConversions} conversions across all formats.`,
    });
  } catch (err) {
    console.error('[ROI] Optimize failed:', err);
    return res.status(500).json({ error: String(err) });
  }
});

/**
 * GET /api/roi/benchmarks
 * Get industry benchmarks by format + niche
 *
 * Response:
 * {
 *   "carousel": { skincare: {...}, fashion: {...}, ... },
 *   "reel": { skincare: {...}, fashion: {...}, ... },
 *   ...
 * }
 */
router.get('/benchmarks', (req: Request, res: Response): void => {
  try {
    const benchmarks = {
      carousel: {
        skincare: 'CPR $0.08, 12% engagement, 4.5% conversion',
        fashion: 'CPR $0.12, 10% engagement, 3.5% conversion',
        fitness: 'CPR $0.06, 14% engagement, 5.5% conversion',
        food: 'CPR $0.05, 15% engagement, 4% conversion',
        business: 'CPR $0.15, 8% engagement, 2.5% conversion',
      },
      reel: {
        skincare: 'CPR $0.05, 18% engagement, 6% conversion',
        fashion: 'CPR $0.07, 16% engagement, 4.8% conversion',
        fitness: 'CPR $0.04, 20% engagement, 7% conversion',
        food: 'CPR $0.03, 22% engagement, 5.5% conversion',
        business: 'CPR $0.10, 12% engagement, 3.5% conversion',
      },
      story: {
        skincare: 'CPR $0.04, 22% engagement, 8% conversion',
        fashion: 'CPR $0.06, 20% engagement, 6.5% conversion',
        fitness: 'CPR $0.03, 25% engagement, 9% conversion',
        food: 'CPR $0.025, 28% engagement, 7% conversion',
        business: 'CPR $0.08, 15% engagement, 4.5% conversion',
      },
    };

    return res.json({
      success: true,
      benchmarks,
      note: 'CPR = Cost Per Result (engagement or conversion). Higher engagement rate = lower CPR.',
    });
  } catch (err) {
    console.error('[ROI] Benchmarks failed:', err);
    return res.status(500).json({ error: String(err) });
  }
});

export default router;
