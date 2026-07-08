import { Router } from 'express';
import { log } from '../agent/logger.js';
import { contentPipeline, type GeneratedContent } from '../agents/content-generation-pipeline.js';
import { promptLoader } from '../services/prompt-loader.js';
import { masterContentPipeline } from '../services/master-content-pipeline.js';
import type { BrandProfile } from '../config/types.js';

const router = Router();

/**
 * Run every prompt in a GeneratedContent through the Master Content Pipeline
 * (quality + cinematography + ocurrencia + resolution lock, one shared
 * consistency lock across the piece) and write enhanced text back in place.
 */
async function enhanceGeneratedContent(
  content: GeneratedContent,
  brand: BrandProfile,
  occasion: string,
  platform: 'instagram' | 'tiktok' = 'instagram'
): Promise<{ content: GeneratedContent; avgQuality: number; avgWit: number }> {
  const contentTypeMap: Record<GeneratedContent['format'], 'image' | 'video' | 'carousel'> = {
    carousel: 'carousel',
    reel: 'video',
    story: 'video',
    post: 'image',
  };

  const rawPrompts = content.prompts.map(p => p.prompt.text);
  const enhanced = await masterContentPipeline.enhancePromptBatch(
    rawPrompts,
    platform,
    contentTypeMap[content.format],
    `${brand.name} — ${occasion}`
  );

  content.prompts.forEach((p, idx) => {
    p.prompt.text = enhanced.prompts[idx] ?? p.prompt.text;
  });

  return { content, avgQuality: enhanced.avgQuality, avgWit: enhanced.avgWit };
}

/**
 * POST /api/content/carousel — Generate carousel content with prompts
 */
router.post('/carousel', async (req, res) => {
  try {
    const { brand, occasion, category, count } = req.body;

    if (!brand || !occasion) {
      res.status(400).json({
        error: 'Missing brand or occasion',
      });
      return;
    }

    const content = await contentPipeline.generateCarousel({
      brand,
      format: 'carousel',
      occasion,
      category,
      count: count || 10,
    });

    const { avgQuality, avgWit } = await enhanceGeneratedContent(content, brand, occasion, req.body.platform);

    log.info('[ContentAPI] carousel generated', {
      contentId: content.id,
      slides: content.prompts.length,
      avgQuality,
      avgWit,
    });

    res.json({
      success: true,
      content,
      quality: { avgQuality, avgWit },
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
      res.status(400).json({
        error: 'Missing brand or occasion',
      });
      return;
    }

    const content = await contentPipeline.generateReel({
      brand,
      format: 'reel',
      occasion,
      category,
      count: count || 5,
    });

    const { avgQuality, avgWit } = await enhanceGeneratedContent(content, brand, occasion, req.body.platform);

    log.info('[ContentAPI] reel generated', {
      contentId: content.id,
      scenes: content.prompts.length,
      avgQuality,
      avgWit,
    });

    res.json({
      success: true,
      content,
      quality: { avgQuality, avgWit },
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
      res.status(400).json({
        error: 'Missing brand or occasion',
      });
      return;
    }

    const content = await contentPipeline.generateStory({
      brand,
      format: 'story',
      occasion,
      category,
      count: 3,
    });

    const { avgQuality, avgWit } = await enhanceGeneratedContent(content, brand, occasion, req.body.platform);

    log.info('[ContentAPI] story generated', {
      contentId: content.id,
      frames: content.prompts.length,
      avgQuality,
      avgWit,
    });

    res.json({
      success: true,
      content,
      quality: { avgQuality, avgWit },
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
      res.status(400).json({
        error: 'Missing brand or occasion',
      });
      return;
    }

    const content = await contentPipeline.generatePost({
      brand,
      format: 'post',
      occasion,
      category,
    });

    const { avgQuality, avgWit } = await enhanceGeneratedContent(content, brand, occasion, req.body.platform);

    log.info('[ContentAPI] post generated', {
      contentId: content.id,
      avgQuality,
      avgWit,
    });

    res.json({
      success: true,
      content,
      quality: { avgQuality, avgWit },
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
      res.status(400).json({
        error: 'Missing brand, format, or occasions array',
      });
      return;
    }

    const contents = await contentPipeline.generateBatch(
      brand,
      format,
      occasions,
      count || 1,
    );

    // Enhance every generated piece through the master pipeline in parallel
    await Promise.all(
      contents.map((content, idx) =>
        enhanceGeneratedContent(content, brand, occasions[idx % occasions.length] ?? occasions[0], req.body.platform)
      )
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
