import { Router } from 'express';
import { log } from '../agent/logger.js';
import { autonomousGenerator } from '../agents/autonomous-generator.js';
import { promptDb } from '../services/prompt-database.js';
import type { BrandProfile } from '../config/types.js';

const router = Router();

/**
 * POST /api/autonomy/generate — Full autonomous generation (all formats)
 */
router.post('/generate', async (req, res): Promise<void> => {
  try {
    const { brand, occasion, carouselCount = 1, reelCount = 1, storyCount = 3 } = req.body;

    if (!brand || !occasion) {
      return res.status(400).json({
        error: 'Missing brand or occasion',
      });
    }

    const result = await autonomousGenerator.generateAll(
      brand as BrandProfile,
      occasion,
      carouselCount,
      reelCount,
      storyCount,
    );

    // Record usage in database
    for (const carousel of result.carousels.items) {
      if (carousel.design) {
        await promptDb.recordUsage({
          promptId: carousel.design.id,
          format: 'carousel',
          brandId: brand.name,
          generatedContentId: carousel.design.id,
          qualityScore: carousel.validation?.score || 0.8,
        });
      }
    }

    log.info('[AutonomyAPI] generation complete', {
      brand: brand.name,
      occasion,
      carousels: result.carousels.itemsGenerated,
      reels: result.reels.itemsGenerated,
      stories: result.stories.itemsGenerated,
      totalTimeMs: result.totalTimeMs,
    });

    return res.json({
      success: true,
      result,
    });
  } catch (error) {
    log.error('[AutonomyAPI] generation failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({
      error: 'Autonomous generation failed',
    });
  }
});

/**
 * POST /api/autonomy/carousels — Batch carousel generation
 */
router.post('/carousels', async (req, res): Promise<void> => {
  try {
    const { brand, occasion, count = 1 } = req.body;

    if (!brand || !occasion) {
      return res.status(400).json({
        error: 'Missing brand or occasion',
      });
    }

    const result = await autonomousGenerator.generateCarousels({
      brand,
      format: 'carousel',
      occasion,
      batchSize: count,
    });

    return res.json({
      success: result.status === 'success',
      result,
    });
  } catch (error) {
    log.error('[AutonomyAPI] carousel generation failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({
      error: 'Carousel generation failed',
    });
  }
});

/**
 * POST /api/autonomy/reels — Batch reel generation
 */
router.post('/reels', async (req, res): Promise<void> => {
  try {
    const { brand, occasion, count = 1 } = req.body;

    if (!brand || !occasion) {
      return res.status(400).json({
        error: 'Missing brand or occasion',
      });
    }

    const result = await autonomousGenerator.generateReels({
      brand,
      format: 'reel',
      occasion,
      batchSize: count,
    });

    return res.json({
      success: result.status === 'success',
      result,
    });
  } catch (error) {
    log.error('[AutonomyAPI] reel generation failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({
      error: 'Reel generation failed',
    });
  }
});

/**
 * POST /api/autonomy/stories — Batch story generation
 */
router.post('/stories', async (req, res): Promise<void> => {
  try {
    const { brand, occasion, count = 3 } = req.body;

    if (!brand || !occasion) {
      return res.status(400).json({
        error: 'Missing brand or occasion',
      });
    }

    const result = await autonomousGenerator.generateStories({
      brand,
      format: 'story',
      occasion,
      batchSize: count,
    });

    return res.json({
      success: result.status === 'success',
      result,
    });
  } catch (error) {
    log.error('[AutonomyAPI] story generation failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({
      error: 'Story generation failed',
    });
  }
});

/**
 * GET /api/autonomy/status — Check autonomy system health
 */
router.get('/status', (req, res) => {
  try {
    const metrics = autonomousGenerator.getMetrics();

    res.json({
      success: true,
      status: 'autonomous',
      metrics,
    });
  } catch (error) {
    log.error('[AutonomyAPI] status check failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({
      error: 'Status check failed',
    });
  }
});

/**
 * POST /api/database/sync — Sync FeedIA Brain → Database
 */
router.post('/database/sync', async (req, res): Promise<void> => {
  try {
    log.info('[DatabaseAPI] sync initiated');

    const stats = await promptDb.syncFromBrain();

    res.json({
      success: true,
      message: 'Sync complete',
      stats,
    });
  } catch (error) {
    log.error('[DatabaseAPI] sync failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({
      error: 'Sync failed',
    });
  }
});

/**
 * GET /api/database/stats — Get database statistics
 */
router.get('/database/stats', async (req, res): Promise<void> => {
  try {
    const stats = await promptDb.getBatchStats();

    res.json({
      success: true,
      stats,
    });
  } catch (error) {
    log.error('[DatabaseAPI] stats fetch failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({
      error: 'Stats fetch failed',
    });
  }
});

/**
 * GET /api/database/performance/:batchId — Batch performance metrics
 */
router.get('/database/performance/:batchId', async (req, res): Promise<void> => {
  try {
    const batchId = parseInt(req.params.batchId);

    const metrics = await promptDb.getPerformanceMetrics(batchId);

    res.json({
      success: true,
      batchId,
      metrics,
    });
  } catch (error) {
    log.error('[DatabaseAPI] performance fetch failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({
      error: 'Performance fetch failed',
    });
  }
});

export default router;
