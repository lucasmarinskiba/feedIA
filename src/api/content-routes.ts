import { Router } from 'express';
import { log } from '../agent/logger.js';
import { contentPipeline } from '../agents/content-generation-pipeline.js';
import { promptLoader } from '../services/prompt-loader.js';
import type { BrandProfile } from '../config/types.js';

const router = Router();

/**
 * POST /api/content/carousel — Generate carousel content with prompts
 */
router.post('/carousel', async (req, res) => {
  try {
    const { brand, occasion, category, count } = req.body;

    if (!brand || !occasion) {
      return res.status(400).json({
        error: 'Missing brand or occasion',
      });
    }

    const content = await contentPipeline.generateCarousel({
      brand,
      format: 'carousel',
      occasion,
      category,
      count: count || 10,
    });

    log.info('[ContentAPI] carousel generated', {
      contentId: content.id,
      slides: content.prompts.length,
    });

    return res.json({
      success: true,
      content,
    });
  } catch (error) {
    log.error('[ContentAPI] carousel error', {
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({
      error: 'Content generation failed',
    });
  }
});

/**
 * POST /api/content/reel — Generate reel content with prompts
 */
router.post('/reel', async (req, res) => {
  try {
    const { brand, occasion, category, count } = req.body;

    if (!brand || !occasion) {
      return res.status(400).json({
        error: 'Missing brand or occasion',
      });
    }

    const content = await contentPipeline.generateReel({
      brand,
      format: 'reel',
      occasion,
      category,
      count: count || 5,
    });

    log.info('[ContentAPI] reel generated', {
      contentId: content.id,
      scenes: content.prompts.length,
    });

    return res.json({
      success: true,
      content,
    });
  } catch (error) {
    log.error('[ContentAPI] reel error', {
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({
      error: 'Content generation failed',
    });
  }
});

/**
 * POST /api/content/story — Generate story content with prompts
 */
router.post('/story', async (req, res) => {
  try {
    const { brand, occasion, category } = req.body;

    if (!brand || !occasion) {
      return res.status(400).json({
        error: 'Missing brand or occasion',
      });
    }

    const content = await contentPipeline.generateStory({
      brand,
      format: 'story',
      occasion,
      category,
      count: 3,
    });

    log.info('[ContentAPI] story generated', {
      contentId: content.id,
      frames: content.prompts.length,
    });

    return res.json({
      success: true,
      content,
    });
  } catch (error) {
    log.error('[ContentAPI] story error', {
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({
      error: 'Content generation failed',
    });
  }
});

/**
 * POST /api/content/post — Generate single post content with prompt
 */
router.post('/post', async (req, res) => {
  try {
    const { brand, occasion, category } = req.body;

    if (!brand || !occasion) {
      return res.status(400).json({
        error: 'Missing brand or occasion',
      });
    }

    const content = await contentPipeline.generatePost({
      brand,
      format: 'post',
      occasion,
      category,
    });

    log.info('[ContentAPI] post generated', {
      contentId: content.id,
    });

    return res.json({
      success: true,
      content,
    });
  } catch (error) {
    log.error('[ContentAPI] post error', {
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({
      error: 'Content generation failed',
    });
  }
});

/**
 * POST /api/content/batch — Batch generate multiple content pieces
 */
router.post('/batch', async (req, res) => {
  try {
    const { brand, format, occasions, count } = req.body;

    if (!brand || !format || !occasions || !Array.isArray(occasions)) {
      return res.status(400).json({
        error: 'Missing brand, format, or occasions array',
      });
    }

    const contents = await contentPipeline.generateBatch(
      brand,
      format,
      occasions,
      count || 1,
    );

    log.info('[ContentAPI] batch generated', {
      total: contents.length,
      format,
      occasions: occasions.length,
    });

    res.json({
      success: true,
      contents,
      total: contents.length,
    });
  } catch (error) {
    log.error('[ContentAPI] batch error', {
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({
      error: 'Batch generation failed',
    });
  }
});

/**
 * GET /api/prompts/query — Query prompts by occasion/category/batch
 */
router.get('/prompts/query', (req, res) => {
  try {
    const { occasion, category, batch, limit } = req.query;

    const prompts = promptLoader.queryPrompts({
      occasion: occasion as string,
      category: category as string,
      batch: batch ? parseInt(batch as string) : undefined,
      limit: limit ? parseInt(limit as string) : 10,
    });

    log.info('[ContentAPI] prompts queried', {
      filters: { occasion, category, batch },
      results: prompts.length,
    });

    res.json({
      success: true,
      prompts,
      total: prompts.length,
    });
  } catch (error) {
    log.error('[ContentAPI] query error', {
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({
      error: 'Query failed',
    });
  }
});

/**
 * GET /api/prompts/stats — Get prompt library statistics
 */
router.get('/prompts/stats', (req, res) => {
  try {
    const stats = promptLoader.getBatchStats();
    const pipelineStats = contentPipeline.getStats();

    res.json({
      success: true,
      stats: {
        ...stats,
        ...pipelineStats,
      },
    });
  } catch (error) {
    log.error('[ContentAPI] stats error', {
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({
      error: 'Stats fetch failed',
    });
  }
});

export default router;
