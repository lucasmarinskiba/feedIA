/**
 * Phase 13: Content Generation REST API
 *
 * User-facing endpoints for one-click content generation
 * GET /api/content/generate
 * GET /api/content/preview/:id
 * POST /api/content/publish
 */

import type { RouteHandler } from '../http.js';
import { json } from '../http.js';
import { log } from '../../agent/logger.js';
import { executeGenerationPipeline, getContentPreview, publishContent, type UserContentBrief, type PublishRequest } from '../../capabilities/content/generationPipeline.js';

// ── POST /api/content/generate ────────────────────────────────────────

export const generateContent: RouteHandler = async ({ res, body }) => {
  try {
    const {userId, contentType, topic, emotion, templateId, platform, duration} = (body ?? {}) as Partial<UserContentBrief>;

    if (!userId || !contentType || !topic) {
      json(res, 400, {
        error: 'Missing required fields: userId, contentType, topic',
      });
      return;
    }

    log.info(`[API] Generate request: ${contentType} for ${topic}`);

    const result = await executeGenerationPipeline({
      userId,
      contentType,
      topic,
      emotion,
      templateId,
      platform,
      duration,
    });

    json(res, 200, {
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
    json(res, 500, {error: 'Generation failed'});
  }
};

// ── GET /api/content/preview/:generationId ────────────────────────────

export const previewContent: RouteHandler = async ({ res, params, query }) => {
  try {
    const {generationId} = params;
    const {format} = query;

    if (!generationId) {
      json(res, 400, {error: 'Missing required param: generationId'});
      return;
    }

    log.info(`[API] Preview request: ${generationId} (${format || 'web'})`);

    const preview = await getContentPreview({
      generationId,
      format: (format as 'web' | 'mobile' | 'instagram' | 'tiktok') || 'web',
    });

    json(res, 200, {
      success: true,
      generationId,
      previewHtml: preview.previewHtml,
      platforms: preview.platforms,
    });
  } catch (error) {
    log.error(`[API] Preview error: ${error}`);
    json(res, 500, {error: 'Preview failed'});
  }
};

// ── POST /api/content/publish ─────────────────────────────────────────

export const publishToSocial: RouteHandler = async ({ res, body }) => {
  try {
    const {generationId, targetPlatforms, scheduling, caption} = (body ?? {}) as Partial<PublishRequest>;

    if (!generationId || !targetPlatforms?.length) {
      json(res, 400, {
        error: 'Missing required fields: generationId, targetPlatforms[]',
      });
      return;
    }

    log.info(`[API] Publish request: ${generationId} → ${targetPlatforms.join(', ')}`);

    const result = await publishContent({
      generationId,
      targetPlatforms,
      scheduling,
      caption,
    });

    json(res, 200, {
      success: result.success,
      generationId,
      platformResults: result.platformResults,
      message: result.success ? 'Content published successfully' : 'Some platforms failed',
    });
  } catch (error) {
    log.error(`[API] Publish error: ${error}`);
    json(res, 500, {error: 'Publishing failed'});
  }
};

// ── GET /api/content/templates ────────────────────────────────────────

export const listTemplates: RouteHandler = async ({ res }) => {
  try {
    const {getTopTemplates} = await import('../../capabilities/content/templateLibrary.js');

    const templates = getTopTemplates(15);

    json(res, 200, {
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
    json(res, 500, {error: 'Failed to load templates'});
  }
};

// ── GET /api/content/brand-kit ────────────────────────────────────────

export const getBrandKit: RouteHandler = async ({ res, query }) => {
  try {
    const {userId} = query;

    if (!userId) {
      json(res, 400, {
        error: 'Missing required field: userId',
      });
      return;
    }

    log.info(`[API] Brand kit request for: ${userId}`);

    const {autoLoadBrandKit} = await import('../../capabilities/content/brandKitAutoLoader.js');
    const brandKit = await autoLoadBrandKit(userId);

    json(res, 200, {
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
    json(res, 500, {error: 'Failed to load brand kit'});
  }
};

// ── Export routes for mounting ────────────────────────────────────────

export const contentGenerationRoutes = {
  'POST /api/content/generate': generateContent,
  'GET /api/content/preview/:generationId': previewContent,
  'POST /api/content/publish': publishToSocial,
  'GET /api/content/templates': listTemplates,
  'GET /api/content/brand-kit': getBrandKit,
};

log.info('[Content Generation API] Routes registered: 5 endpoints');
