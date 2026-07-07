/**
 * Resolution & Quality Routes
 * Guarantee max resolution/bitrate for Instagram + TikTok, zero quality loss
 */

import { Router, Request, Response } from 'express';
import { log } from '../agent/logger.js';
import { resolutionQualityEngine } from '../services/resolution-quality-engine.js';

const router = Router();

/**
 * GET /api/resolution/specs/:platform
 * Get all resolution specs for platform (instagram/tiktok)
 */
router.get('/specs/:platform', async (req: Request, res: Response) => {
  try {
    const { platform } = req.params;

    if (!['instagram', 'tiktok'].includes(platform)) {
      return res.status(400).json({ error: 'platform must be instagram or tiktok' });
    }

    const specs = resolutionQualityEngine.getAllSpecsForPlatform(platform as 'instagram' | 'tiktok');

    res.json({
      status: 'ok',
      platform,
      specCount: specs.length,
      specs,
      metadata: { retrievedAt: new Date().toISOString() },
    });
  } catch (error) {
    log.error('[ResolutionQuality] Specs retrieval failed', error);
    res.status(500).json({ error: 'Specs retrieval failed' });
  }
});

/**
 * POST /api/resolution/inject-instructions
 * Get quality instructions to inject into content generation prompt
 */
router.post('/inject-instructions', async (req: Request, res: Response) => {
  try {
    const { platform, contentType, prompt } = req.body;

    if (!platform || !contentType) {
      return res.status(400).json({ error: 'platform and contentType required' });
    }

    const instructions = resolutionQualityEngine.generateQualityInstructions(
      platform,
      contentType
    );

    const enhancedPrompt = prompt ? `${instructions}\n\n[CONTENT PROMPT]\n${prompt}` : instructions;

    res.json({
      status: 'success',
      platform,
      contentType,
      instructions,
      enhancedPrompt,
      guarantee: 'Content will target maximum platform-supported resolution/bitrate',
      metadata: { generatedAt: new Date().toISOString() },
    });
  } catch (error) {
    log.error('[ResolutionQuality] Instructions injection failed', error);
    res.status(500).json({ error: 'Instructions injection failed' });
  }
});

/**
 * POST /api/resolution/validate
 * Validate an asset's actual specs against platform requirements
 */
router.post('/validate', async (req: Request, res: Response) => {
  try {
    const { platform, contentType, width, height, bitrateKbps, fileSizeMB } = req.body;

    if (!platform || !contentType || !width || !height) {
      return res.status(400).json({ error: 'platform, contentType, width, height required' });
    }

    const result = resolutionQualityEngine.validateQuality(
      platform,
      contentType,
      width,
      height,
      bitrateKbps,
      fileSizeMB
    );

    res.json({
      status: 'validated',
      ...result,
      statusLabel: result.passed ? 'Quality Approved' : 'NEEDS CORRECTION',
      metadata: { validatedAt: new Date().toISOString() },
    });
  } catch (error) {
    log.error('[ResolutionQuality] Validation failed', error);
    res.status(500).json({ error: 'Validation failed' });
  }
});

/**
 * POST /api/resolution/upscale-strategy
 * Get recommended upscale approach for low-res source
 */
router.post('/upscale-strategy', async (req: Request, res: Response) => {
  try {
    const { currentWidth, currentHeight, targetWidth, targetHeight } = req.body;

    if (!currentWidth || !currentHeight || !targetWidth || !targetHeight) {
      return res.status(400).json({ error: 'currentWidth, currentHeight, targetWidth, targetHeight required' });
    }

    const strategy = resolutionQualityEngine.getUpscaleStrategy(
      currentWidth,
      currentHeight,
      targetWidth,
      targetHeight
    );

    res.json({
      status: 'ok',
      strategy,
      metadata: { calculatedAt: new Date().toISOString() },
    });
  } catch (error) {
    log.error('[ResolutionQuality] Upscale strategy failed', error);
    res.status(500).json({ error: 'Upscale strategy failed' });
  }
});

/**
 * GET /api/resolution/best/:platform/:contentType
 * Get the single best (max quality) spec for platform + content type
 */
router.get('/best/:platform/:contentType', async (req: Request, res: Response) => {
  try {
    const { platform, contentType } = req.params;

    if (!['instagram', 'tiktok'].includes(platform)) {
      return res.status(400).json({ error: 'platform must be instagram or tiktok' });
    }
    if (!['image', 'video', 'carousel'].includes(contentType)) {
      return res.status(400).json({ error: 'contentType must be image, video, or carousel' });
    }

    const spec = resolutionQualityEngine.getBestSpec(
      platform as 'instagram' | 'tiktok',
      contentType as 'image' | 'video' | 'carousel'
    );

    res.json({
      status: 'ok',
      platform,
      contentType,
      recommendedSpec: spec,
      metadata: { retrievedAt: new Date().toISOString() },
    });
  } catch (error) {
    log.error('[ResolutionQuality] Best spec retrieval failed', error);
    res.status(500).json({ error: 'Best spec retrieval failed' });
  }
});

/**
 * GET /api/resolution/health
 * Resolution & quality engine health check
 */
router.get('/health', async (req: Request, res: Response) => {
  try {
    res.json({
      status: 'ok',
      service: 'resolution-quality-engine',
      purpose: 'Guarantees ALL FeedIA content hits maximum Instagram/TikTok supported resolution — zero quality loss',
      platforms: ['instagram', 'tiktok'],
      formatsTracked: 8,
      criticalRules: [
        'Generate/render at native resolution — never generate small then upscale',
        'Export source quality ABOVE platform minimum (platforms compress on upload)',
        'AI upscaling (Real-ESRGAN/GFPGAN) when source is below target, never simple interpolation',
        'One clean export pass — no repeated JPEG re-compression cycles',
        'Verify final dimensions exactly match target before delivery',
      ],
      instagramMax: {
        carousel: '1080x1350 (4:5), 5000kbps',
        reels: '1080x1920 (9:16), 8000kbps, 30fps',
      },
      tiktokMax: {
        photo: '1080x1920 (9:16), lossless',
        video: '1080x1920 (9:16), 16000kbps, 60fps (HD tier)',
      },
      endpoints: {
        specs: 'GET /api/resolution/specs/:platform',
        injectInstructions: 'POST /api/resolution/inject-instructions',
        validate: 'POST /api/resolution/validate',
        upscaleStrategy: 'POST /api/resolution/upscale-strategy',
        best: 'GET /api/resolution/best/:platform/:contentType',
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    log.error('[ResolutionQuality] Health check failed', error);
    res.status(500).json({ error: 'Health check failed' });
  }
});

export default router;
