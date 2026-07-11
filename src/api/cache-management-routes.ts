/**
 * Cache Management Routes
 *
 * GET  /api/cache/stats              — cache performance metrics
 * POST /api/cache/clear              — clear all cached prompts (admin)
 * GET  /api/cache/suggestions        — suggested reusable variants
 */

import express, { Request, Response } from 'express';
import { log } from '../agent/logger.js';
import { getCacheStats, clearCache, suggestCachedVariant, type ContentPillar } from '../services/prompt-cache-layer.js';

const router = express.Router();

/**
 * GET /api/cache/stats
 * Cache performance metrics + estimated savings
 */
router.get('/stats', (_req: Request, res: Response): void => {
  try {
    const stats = getCacheStats();

    log.info('[CacheManagement] Stats retrieved', {
      hits: stats.hits,
      misses: stats.misses,
      hitRate: stats.hitRate.toFixed(1) + '%',
      savings: '$' + stats.estimatedSavingsUSD.toFixed(2),
    });

    res.json({
      ok: true,
      cache: {
        totalCached: stats.totalCached,
        hits: stats.hits,
        misses: stats.misses,
        hitRate: stats.hitRate.toFixed(1) + '%',
        regenerations: stats.regenerations,
        estimatedSavingsUSD: '$' + stats.estimatedSavingsUSD.toFixed(2),
        topPillars: stats.topPillars,
      },
      insight: `Cache is ${stats.hitRate.toFixed(0)}% effective. Saved ~${(stats.hits * 0.01).toFixed(2)} in API costs.`,
    });
  } catch (err) {
    log.error('[CacheManagement] Stats failed', { error: String(err) });
    res.status(500).json({ ok: false, error: String(err) });
  }
});

/**
 * POST /api/cache/clear
 * Clear all cached prompts (admin)
 */
router.post('/clear', (_req: Request, res: Response): void => {
  try {
    const result = clearCache();

    log.info('[CacheManagement] Cache cleared', { cleared: result.cleared });

    res.json({
      ok: true,
      message: `Cleared ${result.cleared} cached prompts`,
      cleared: result.cleared,
    });
  } catch (err) {
    log.error('[CacheManagement] Clear failed', { error: String(err) });
    res.status(500).json({ ok: false, error: String(err) });
  }
});

/**
 * GET /api/cache/suggestions
 * Suggest cached variants for reuse
 */
router.get('/suggestions', (req: Request, res: Response): void => {
  try {
    const { pillar, platform, niche } = req.query as { pillar?: string; platform?: 'instagram' | 'tiktok'; niche?: string };

    if (!pillar || !platform || !niche) {
      res.status(400).json({ ok: false, error: 'pillar, platform, and niche required' });
      return;
    }

    const suggestions = suggestCachedVariant(pillar as ContentPillar, platform, niche);

    log.info('[CacheManagement] Suggestions retrieved', { pillar, platform, count: suggestions.length });

    res.json({
      ok: true,
      pillar,
      platform,
      niche,
      suggestions,
      message: suggestions.length > 0 ? `${suggestions.length} cached variants available for reuse` : 'No cached variants for this pillar+platform+niche',
    });
  } catch (err) {
    log.error('[CacheManagement] Suggestions failed', { error: String(err) });
    res.status(500).json({ ok: false, error: String(err) });
  }
});

export default router;
