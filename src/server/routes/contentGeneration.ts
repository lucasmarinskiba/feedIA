/**
 * Phase 13: Content Generation REST API
 *
 * User-facing endpoints for one-click content generation
 * GET /api/content/generate
 * GET /api/content/preview/:id
 * POST /api/content/publish
 */

import type { RouteHandler } from '../http.js';
import { log } from '../../agent/logger.js';
import { executeGenerationPipeline, getContentPreview, publishContent } from '../../capabilities/content/generationPipeline.js';

// ── POST /api/content/generate ────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const generateContent = async (req: any, res: any): Promise<void> => {
  try {
    const {userId, contentType, topic, emotion, templateId, platform, duration} = req.body;

    if (!userId || !contentType || !topic) {
      return res.status(400).json({
        error: 'Missing required fields: userId, contentType, topic',
      });
    }

    log.info(`[API] Generate request: ${contentType} for ${topic}`);

    const result = await executeGenerationPipeline({
      userId,
      contentType: contentType as any,
      topic,
      emotion,
      templateId,
      platform,
      duration,
    });

    res.status(200).json({
      success: true,
      generationId: result.id,
      contentType: result.contentType,
      topic: result.topic,
      scores: result.scores,
      previewUrl: result.previewUrl,
      exportFormats: result.exportFormats,
      metadata: result.metadata,
    });
  } catch (error) {
    log.error(`[API] Generation error: ${error}`);
    res.status(500).json({error: 'Generation failed'});
  }
};

// ── GET /api/content/preview/:generationId ────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const previewContent = async (req: any, res: any): Promise<void> => {
  try {
    const {generationId} = req.params;
    const {format} = req.query;

    log.info(`[API] Preview request: ${generationId} (${format || 'web'})`);

    const preview = await getContentPreview({
      generationId,
      format: (format as 'web' | 'mobile' | 'instagram' | 'tiktok') || 'web',
    });

    res.status(200).json({
      success: true,
      generationId,
      previewHtml: preview.previewHtml,
      platforms: preview.platforms,
    });
  } catch (error) {
    log.error(`[API] Preview error: ${error}`);
    res.status(500).json({error: 'Preview failed'});
  }
};

// ── POST /api/content/publish ─────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const publishToSocial = async (req: any, res: any): Promise<void> => {
  try {
    const {generationId, targetPlatforms, scheduling, caption} = req.body;

    if (!generationId || !targetPlatforms?.length) {
      return res.status(400).json({
        error: 'Missing required fields: generationId, targetPlatforms[]',
      });
    }

    log.info(`[API] Publish request: ${generationId} → ${targetPlatforms.join(', ')}`);

    const result = await publishContent({
      generationId,
      targetPlatforms,
      scheduling,
      caption,
    });

    res.status(200).json({
      success: result.success,
      generationId,
      platformResults: result.platformResults,
      message: result.success ? 'Content published successfully' : 'Some platforms failed',
    });
  } catch (error) {
    log.error(`[API] Publish error: ${error}`);
    res.status(500).json({error: 'Publishing failed'});
  }
};

// ── GET /api/content/templates ────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const listTemplates = async (_req: any, res: any): Promise<void> => {
  try {
    const {getTopTemplates} = await import('../../capabilities/content/templateLibrary.js');

    const templates = getTopTemplates(15);

    res.status(200).json({
      success: true,
      count: templates.length,
      templates: templates.map((t) => ({
        id: t.id,
        name: t.name,
        type: t.type,
        category: t.category,
        emotion: t.emotion,
        engagementPotential: t.engagementPotential,
      })),
    });
  } catch (error) {
    log.error(`[API] Templates error: ${error}`);
    res.status(500).json({error: 'Failed to load templates'});
  }
};

// ── GET /api/content/brand-kit ────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const getBrandKit = async (req: any, res: any): Promise<void> => {
  try {
    const {userId} = req.query;

    if (!userId) {
      return res.status(400).json({
        error: 'Missing required field: userId',
      });
    }

    log.info(`[API] Brand kit request for: ${userId}`);

    const {autoLoadBrandKit} = await import('../../capabilities/content/brandKitAutoLoader.js');
    const brandKit = await autoLoadBrandKit(userId as string);

    res.status(200).json({
      success: true,
      userId,
      source: brandKit.type,
      confidence: brandKit.confidence,
      brand: {
        colors: brandKit.data.visual?.palette,
        fonts: brandKit.data.visual?.typography,
        voice: brandKit.data.voice,
        audience: brandKit.data.audience,
      },
    });
  } catch (error) {
    log.error(`[API] Brand kit error: ${error}`);
    res.status(500).json({error: 'Failed to load brand kit'});
  }
};

// ── Export routes for mounting ────────────────────────────────────────

export const contentGenerationRoutes: Record<string, RouteHandler> = {
  'POST /api/content/generate': generateContent as unknown as RouteHandler,
  'GET /api/content/preview/:generationId': previewContent as unknown as RouteHandler,
  'POST /api/content/publish': publishToSocial as unknown as RouteHandler,
  'GET /api/content/templates': listTemplates as unknown as RouteHandler,
  'GET /api/content/brand-kit': getBrandKit as unknown as RouteHandler,
};

log.info('[Content Generation API] Routes registered: 5 endpoints');
