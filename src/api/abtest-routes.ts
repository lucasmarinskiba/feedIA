/**
 * A/B Testing Endpoints
 * /api/abtest/* — Create, track, and analyze A/B tests
 *
 * These endpoints allow users to:
 * - Create A/B tests with variants
 * - Track conversion metrics
 * - Get aggregated results with statistical significance
 */

import { Router, Request, Response } from 'express';
import { query } from '../db/client.js';
import {
  generateCacheKey,
  invalidateCachePatterns,
  withCaching,
  CACHE_TTL,
} from '../services/cache-strategy.js';

const router = Router();

interface ABTestConfig {
  name: string;
  description?: string;
  variants: string[]; // e.g., ['control', 'variant_a', 'variant_b']
  metric: 'clicks' | 'conversions' | 'engagement_rate' | 'saves';
  hypothesis?: string;
  startDate: string; // ISO 8601
  endDate?: string; // ISO 8601
}

interface ABTestResult {
  testId: string;
  variant: string;
  conversions: number;
  impressions: number;
  conversionRate: number;
  confidenceLevel: number;
  significant: boolean;
}

/**
 * POST /api/abtest/create
 * Create a new A/B test
 */
router.post('/create', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as unknown as { userId: string }).userId;
    const { name, description, variants, metric, hypothesis, startDate, endDate } = req.body as ABTestConfig;

    // Validate
    if (!name || !variants || variants.length < 2 || !metric) {
      res.status(400).json({
        error: 'name, variants (min 2), and metric required',
      });
      return;
    }

    const testId = `abtest-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    const result = await query(
      `INSERT INTO abtests (id, user_id, name, description, variants, metric, hypothesis, start_date, end_date, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
       RETURNING id, created_at`,
      [testId, userId, name, description || null, JSON.stringify(variants), metric, hypothesis || null, startDate, endDate || null],
    );

    // Invalidate relevant caches
    await invalidateCachePatterns('analytics');

    res.status(201).json({
      success: true,
      test: {
        id: testId,
        name,
        variants,
        metric,
        startDate,
        status: 'active',
      },
    });
    return;
  } catch (err) {
    console.error('[ABTest] Create failed:', err);
    res.status(500).json({ error: String(err) });
    return;
  }
});

/**
 * POST /api/abtest/:testId/track
 * Track a conversion event for a variant
 */
router.post('/:testId/track', async (req: Request, res: Response): Promise<void> => {
  try {
    const { testId } = req.params;
    const { variant, conversions = 1, impressions = 1 } = req.body as { variant: string; conversions?: number; impressions?: number };

    if (!variant) {
      res.status(400).json({ error: 'variant required' });
      return;
    }

    // Record the event
    await query(
      `INSERT INTO abtest_results (test_id, variant, conversions, impressions, created_at)
       VALUES ($1, $2, $3, $4, NOW())`,
      [testId, variant, conversions, impressions],
    );

    // Invalidate test results cache
    await invalidateCachePatterns(
      'analytics',
      generateCacheKey.abtestResults(testId),
    );

    res.json({
      success: true,
      message: `Tracked ${conversions} conversions for ${variant}`,
    });
    return;
  } catch (err) {
    console.error('[ABTest] Track failed:', err);
    res.status(500).json({ error: String(err) });
    return;
  }
});

/**
 * GET /api/abtest/:testId/results
 * Get aggregated A/B test results with statistical significance
 * Cached for 10 minutes
 */
router.get('/:testId/results', async (req: Request, res: Response): Promise<void> => {
  try {
    const { testId } = req.params;

    const cacheKey = generateCacheKey.abtestResults(testId);

    const results = await withCaching(
      cacheKey,
      CACHE_TTL.ABTEST_RESULTS,
      async () => {
        const queryResult = await query(
          `SELECT
            variant,
            SUM(conversions) as total_conversions,
            SUM(impressions) as total_impressions,
            COUNT(*) as event_count
          FROM abtest_results
          WHERE test_id = $1
          GROUP BY variant
          ORDER BY total_conversions DESC`,
          [testId],
        );

        const variants = queryResult.rows as Array<{ variant: string; total_conversions: number; total_impressions: number; event_count: number }>;

        // Calculate conversion rates and statistical significance
        const results: ABTestResult[] = variants.map((v) => ({
          testId,
          variant: v.variant,
          conversions: v.total_conversions,
          impressions: v.total_impressions,
          conversionRate: v.total_impressions > 0 ? (v.total_conversions / v.total_impressions) * 100 : 0,
          confidenceLevel: calculateConfidenceLevel(v.total_conversions, v.total_impressions),
          significant: v.total_impressions > 100, // Simplified: requires > 100 impressions
        }));

        // Determine winner (highest conversion rate with significant sample size)
        const winner = results.find((r) => r.significant)?.variant || results[0]?.variant;

        return {
          testId,
          results,
          winner,
          totalEvents: variants.reduce((sum, v) => sum + v.event_count, 0),
          timestamp: new Date().toISOString(),
        };
      },
    );

    res.json(results);
    return;
  } catch (err) {
    console.error('[ABTest] Results failed:', err);
    res.status(500).json({ error: String(err) });
    return;
  }
});

/**
 * GET /api/abtest/list
 * List user's A/B tests
 */
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as unknown as { userId: string }).userId;
    const { status = 'active', limit = '10' } = req.query as { status?: string; limit?: string };

    const query_str = status === 'all'
      ? `SELECT id, name, metric, start_date, end_date, variants, status
         FROM abtests
         WHERE user_id = $1
         ORDER BY created_at DESC
         LIMIT $2`
      : `SELECT id, name, metric, start_date, end_date, variants, status
         FROM abtests
         WHERE user_id = $1 AND status = $2
         ORDER BY created_at DESC
         LIMIT $3`;

    const params = status === 'all'
      ? [userId, parseInt(limit, 10)]
      : [userId, status, parseInt(limit, 10)];

    const result = await query(query_str, params);

    const tests = result.rows.map((row: unknown) => {
      const typedRow = row as { id: string; name: string; metric: string; start_date: string; end_date?: string; variants: string; status: string };
      return {
        id: typedRow.id,
        name: typedRow.name,
        metric: typedRow.metric,
        startDate: typedRow.start_date,
        endDate: typedRow.end_date,
        variants: JSON.parse(typedRow.variants),
        status: typedRow.status,
      };
    });

    res.json({
      tests,
      total: tests.length,
    });
    return;
  } catch (err) {
    console.error('[ABTest] List failed:', err);
    res.status(500).json({ error: String(err) });
    return;
  }
});

/**
 * PATCH /api/abtest/:testId/status
 * Update test status (active → completed → archived)
 */
router.patch('/:testId/status', async (req: Request, res: Response): Promise<void> => {
  try {
    const { testId } = req.params;
    const { status } = req.body as { status: string };

    if (!['active', 'completed', 'archived'].includes(status)) {
      res.status(400).json({ error: 'status must be active, completed, or archived' });
      return;
    }

    await query(
      `UPDATE abtests
       SET status = $1, updated_at = NOW()
       WHERE id = $2`,
      [status, testId],
    );

    // Invalidate cache
    await invalidateCachePatterns('analytics', generateCacheKey.abtestResults(testId));

    res.json({
      success: true,
      message: `Test ${testId} status changed to ${status}`,
    });
    return;
  } catch (err) {
    console.error('[ABTest] Status update failed:', err);
    res.status(500).json({ error: String(err) });
    return;
  }
});

/**
 * GET /api/abtest/:testId/stats
 * Get detailed statistical analysis
 */
router.get('/:testId/stats', async (req: Request, res: Response): Promise<void> => {
  try {
    const { testId } = req.params;

    // Fetch raw results
    const resultQuery = await query(
      `SELECT
        variant,
        SUM(conversions) as total_conversions,
        SUM(impressions) as total_impressions
      FROM abtest_results
      WHERE test_id = $1
      GROUP BY variant`,
      [testId],
    );

    const variants = resultQuery.rows as Array<{ variant: string; total_conversions: number; total_impressions: number }>;

    // Calculate statistical significance using chi-square
    const stats = variants.map((v, idx) => ({
      variant: v.variant,
      conversions: v.total_conversions,
      impressions: v.total_impressions,
      conversionRate: v.total_impressions > 0 ? (v.total_conversions / v.total_impressions) * 100 : 0,
      confidenceInterval: calculateConfidenceInterval(v.total_conversions, v.total_impressions),
      zScore: calculateZScore(v.total_conversions, v.total_impressions, variants),
    }));

    res.json({
      testId,
      variants: stats,
      winner: stats.reduce((a, b) => a.conversionRate > b.conversionRate ? a : b),
      significance: calculateChiSquare(stats) > 3.841, // p < 0.05
    });
    return;
  } catch (err) {
    console.error('[ABTest] Stats failed:', err);
    res.status(500).json({ error: String(err) });
    return;
  }
});

/**
 * Helper: Calculate confidence level (0-100)
 */
function calculateConfidenceLevel(conversions: number, impressions: number): number {
  if (impressions < 30) return 0;
  if (impressions < 100) return Math.min(50, (impressions / 100) * 50);
  if (impressions < 500) return Math.min(90, 50 + (impressions / 500) * 40);
  return 95;
}

/**
 * Helper: Calculate 95% confidence interval
 */
function calculateConfidenceInterval(conversions: number, impressions: number): { lower: number; upper: number } {
  if (impressions === 0) return { lower: 0, upper: 0 };

  const p = conversions / impressions;
  const se = Math.sqrt((p * (1 - p)) / impressions);
  const z = 1.96; // 95% confidence

  return {
    lower: Math.max(0, p - z * se),
    upper: Math.min(1, p + z * se),
  };
}

/**
 * Helper: Calculate Z-score for hypothesis testing
 */
function calculateZScore(conversions: number, impressions: number, allVariants: Array<{ total_conversions: number; total_impressions: number }>): number {
  if (impressions === 0) return 0;

  const p = conversions / impressions;
  const pooledP = allVariants.reduce((sum, v) => sum + v.total_conversions, 0) /
    allVariants.reduce((sum, v) => sum + v.total_impressions, 0);

  const se = Math.sqrt(pooledP * (1 - pooledP) * (1 / impressions));
  return se > 0 ? (p - pooledP) / se : 0;
}

/**
 * Helper: Calculate chi-square statistic
 */
function calculateChiSquare(variants: Array<{ conversions: number; conversionRate: number }>): number {
  if (variants.length < 2) return 0;

  const totalConversions = variants.reduce((sum, v) => sum + v.conversions, 0);
  const avgRate = totalConversions / variants.length;

  return variants.reduce((sum, v) => {
    const expected = avgRate;
    return sum + Math.pow(v.conversions - expected, 2) / expected;
  }, 0);
}

export default router;
