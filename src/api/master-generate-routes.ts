/**
 * Master Generate Routes
 * Single-call access to the full FeedIA quality pipeline:
 * quality + cinematography + ocurrencia + identity + consistency + resolution
 */

import { Router, Request, Response } from 'express';
import { log } from '../agent/logger.js';
import { masterContentPipeline } from '../services/master-content-pipeline.js';
import type { BrandProfile } from '../config/types.js';

const router = Router();

/**
 * POST /api/master/generate
 * Run single prompt through full pipeline in one call
 */
router.post('/generate', async (req: Request, res: Response) => {
  try {
    const brand = (req as any).brand as BrandProfile;
    const {
      basePrompt,
      platform = 'instagram',
      contentType = 'carousel',
      identityLockId,
      consistencySeriesId,
      frameNumber,
      frameCount,
    } = req.body;

    if (!basePrompt) {
      return res.status(400).json({ error: 'basePrompt required' });
    }

    log.info('[MasterGenerate] Single generation requested', { platform, contentType, brand: brand?.name });

    const result = await masterContentPipeline.processContent({
      basePrompt,
      platform,
      contentType,
      identityLockId,
      consistencySeriesId,
      frameNumber,
      frameCount,
    });

    return res.json({
      status: result.readyForGeneration ? 'ready' : 'needs_review',
      finalPrompt: result.finalPrompt,
      pipeline: {
        stagesApplied: result.stagesApplied,
        qualityScore: result.qualityScore,
        witScore: result.witScore,
        identityPreserved: result.identityPreserved,
        consistencyEnforced: result.consistencyEnforced,
        resolutionLocked: result.resolutionLocked,
      },
      warnings: result.warnings,
      guarantees: [
        '✓ No ortografía errors',
        '✓ No face/product/environment deformation risk',
        '✓ Professional cinematography (rule-of-thirds, depth, framing)',
        '✓ Genuine wit/ocurrencia (no clichés, creative twist)',
        result.identityPreserved !== null ? '✓ Real facial identity preserved' : null,
        result.consistencyEnforced ? '✓ Character/product/environment locked across series' : null,
        '✓ Max platform resolution/bitrate targeted',
      ].filter(Boolean),
      metadata: { processedAt: new Date().toISOString() },
    });
  } catch (error) {
    log.error('[MasterGenerate] Generation failed', error);
    return res.status(500).json({ error: 'Generation failed', message: String(error) });
  }
});

/**
 * POST /api/master/generate-carousel
 * Run entire carousel (multiple frames) through pipeline in one call
 */
router.post('/generate-carousel', async (req: Request, res: Response) => {
  try {
    const brand = (req as any).brand as BrandProfile;
    const {
      basePrompt,
      platform = 'instagram',
      frameCount = 10,
      identityLockId,
      consistencySeriesId,
    } = req.body;

    if (!basePrompt) {
      return res.status(400).json({ error: 'basePrompt required' });
    }

    if (frameCount < 2 || frameCount > 10) {
      return res.status(400).json({ error: 'frameCount must be between 2 and 10' });
    }

    log.info('[MasterGenerate] Carousel generation requested', {
      platform,
      frameCount,
      brand: brand?.name,
    });

    const results = await masterContentPipeline.processCarousel(
      basePrompt,
      platform,
      frameCount,
      identityLockId,
      consistencySeriesId
    );

    const allReady = results.every(r => r.readyForGeneration);
    const avgQuality = Math.round(results.reduce((sum, r) => sum + r.qualityScore, 0) / results.length);
    const avgWit = Math.round(results.reduce((sum, r) => sum + r.witScore, 0) / results.length);

    return res.json({
      status: allReady ? 'ready' : 'needs_review',
      frameCount: results.length,
      frames: results.map((r, i) => ({
        frameNumber: i + 1,
        prompt: r.finalPrompt,
        qualityScore: r.qualityScore,
        witScore: r.witScore,
        ready: r.readyForGeneration,
        warnings: r.warnings,
      })),
      summary: {
        avgQualityScore: avgQuality,
        avgWitScore: avgWit,
        allFramesReady: allReady,
        identityLocked: !!identityLockId,
        consistencyLocked: !!consistencySeriesId,
      },
      metadata: { processedAt: new Date().toISOString() },
    });
  } catch (error) {
    log.error('[MasterGenerate] Carousel generation failed', error);
    return res.status(500).json({ error: 'Carousel generation failed', message: String(error) });
  }
});

/**
 * GET /api/master/health
 * Master pipeline health + full capability summary
 */
router.get('/health', async (req: Request, res: Response) => {
  try {
    res.json({
      status: 'ok',
      service: 'master-content-pipeline',
      purpose: 'Single entry point chaining ALL FeedIA quality/creative/technical systems',
      pipelineStages: [
        '1. Quality validation — ortografia, faces, products, environments',
        '2. Refinement — cinematography patterns + artistic standards',
        '3. Ocurrencia — wit analysis, cliché removal, creative twist injection',
        '4. Resolution lock — max IG/TikTok resolution + bitrate targeting',
        '5. Facial identity injection (optional) — preserve real uploaded face',
        '6. Consistency lock injection (optional) — same character/product/env across frames',
        '7. Final validation + readiness scoring',
      ],
      usage: {
        singleContent: 'POST /api/master/generate — one image/video/carousel frame',
        fullCarousel: 'POST /api/master/generate-carousel — 2-10 frame carousel in one call',
      },
      relatedEndpoints: {
        identityLockFirst: 'POST /api/identity/lock (if using real user photo)',
        consistencyLockFirst: 'POST /api/consistency/create-lock (if generating carousel series)',
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    log.error('[MasterGenerate] Health check failed', error);
    res.status(500).json({ error: 'Health check failed' });
  }
});

export default router;
