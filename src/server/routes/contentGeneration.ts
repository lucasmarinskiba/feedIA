/**
 * Phase 13: Content Generation REST API
 *
 * User-facing endpoints for one-click content generation
 * GET /api/content/generate
 * GET /api/content/preview/:id
 * POST /api/content/publish
 */

import type { RouteContext, RouteHandler } from '../http.js';
import { log } from '../../agent/logger.js';
import {
  executeGenerationPipeline,
  getContentPreview,
  publishContent,
} from '../../capabilities/content/generationPipeline.js';

// ── POST /api/content/generate ────────────────────────────────────────

export const generateContent: RouteHandler = async (ctx: RouteContext): Promise<void> => {
  try {
    const reqBody = ctx.body as Record<string, unknown>;
    const { userId, contentType, topic, emotion, templateId, platform, duration } = reqBody;

    if (!userId || !contentType || !topic) {
      ctx.res.writeHead(400, { 'Content-Type': 'application/json' });
      ctx.res.end(JSON.stringify({ error: 'Missing required fields: userId, contentType, topic' }));
      return;
    }

    log.info(`[API] Generate request: ${contentType} for ${topic}`);

    const result = await executeGenerationPipeline({
      userId: userId as string,
      contentType: contentType as string,
      topic: topic as string,
      emotion: emotion as string,
      templateId: templateId as string,
      platform: platform as string,
      duration: duration as number,
    });

    const resultObj = result as Record<string, unknown>;
    ctx.res.writeHead(200, { 'Content-Type': 'application/json' });
    ctx.res.end(
      JSON.stringify({
        success: true,
        generationId: resultObj.id,
        contentType: resultObj.contentType,
        topic: resultObj.topic,
        scores: resultObj.scores,
        previewUrl: resultObj.previewUrl,
        exportFormats: resultObj.exportFormats,
        metadata: resultObj.metadata,
      }),
    );
  } catch (error) {
    log.error(`[API] Generation error: ${error}`);
    ctx.res.writeHead(500, { 'Content-Type': 'application/json' });
    ctx.res.end(JSON.stringify({ error: 'Generation failed' }));
  }
};

// ── GET /api/content/preview/:generationId ────────────────────────────

export const previewContent: RouteHandler = async (ctx: RouteContext): Promise<void> => {
  try {
    const { generationId } = ctx.params;
    const format = ctx.query.format || 'web';

    log.info(`[API] Preview request: ${generationId} (${format})`);

    const preview = await getContentPreview({
      generationId,
      format: (format as 'web' | 'mobile' | 'instagram' | 'tiktok') || 'web',
    });

    const previewObj = preview as Record<string, unknown>;
    ctx.res.writeHead(200, { 'Content-Type': 'application/json' });
    ctx.res.end(
      JSON.stringify({
        success: true,
        generationId,
        previewHtml: previewObj.previewHtml,
        platforms: previewObj.platforms,
      }),
    );
  } catch (error) {
    log.error(`[API] Preview error: ${error}`);
    ctx.res.writeHead(500, { 'Content-Type': 'application/json' });
    ctx.res.end(JSON.stringify({ error: 'Preview failed' }));
  }
};

// ── POST /api/content/publish ─────────────────────────────────────────

export const publishToSocial: RouteHandler = async (ctx: RouteContext): Promise<void> => {
  try {
    const reqBody = ctx.body as Record<string, unknown>;
    const { generationId, targetPlatforms, scheduling, caption } = reqBody;

    if (!generationId || !(Array.isArray(targetPlatforms) && targetPlatforms.length > 0)) {
      ctx.res.writeHead(400, { 'Content-Type': 'application/json' });
      ctx.res.end(JSON.stringify({ error: 'Missing required fields: generationId, targetPlatforms[]' }));
      return;
    }

    log.info(`[API] Publish request: ${generationId} → ${(targetPlatforms as string[]).join(', ')}`);

    const result = await publishContent({
      generationId: generationId as string,
      targetPlatforms: targetPlatforms as string[],
      scheduling: scheduling as Record<string, unknown>,
      caption: caption as string,
    });

    const resultObj = result as Record<string, unknown>;
    ctx.res.writeHead(200, { 'Content-Type': 'application/json' });
    ctx.res.end(
      JSON.stringify({
        success: resultObj.success,
        generationId,
        platformResults: resultObj.platformResults,
        message: resultObj.success ? 'Content published successfully' : 'Some platforms failed',
      }),
    );
  } catch (error) {
    log.error(`[API] Publish error: ${error}`);
    ctx.res.writeHead(500, { 'Content-Type': 'application/json' });
    ctx.res.end(JSON.stringify({ error: 'Publishing failed' }));
  }
};

// ── GET /api/content/templates ────────────────────────────────────────

export const listTemplates: RouteHandler = async (ctx: RouteContext): Promise<void> => {
  try {
    const { getTopTemplates } = await import('../../capabilities/content/templateLibrary.js');

    const templates = getTopTemplates(15) as Array<Record<string, unknown>>;

    ctx.res.writeHead(200, { 'Content-Type': 'application/json' });
    ctx.res.end(
      JSON.stringify({
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
      }),
    );
  } catch (error) {
    log.error(`[API] Templates error: ${error}`);
    ctx.res.writeHead(500, { 'Content-Type': 'application/json' });
    ctx.res.end(JSON.stringify({ error: 'Failed to load templates' }));
  }
};

// ── GET /api/content/brand-kit ────────────────────────────────────────

export const getBrandKit: RouteHandler = async (ctx: RouteContext): Promise<void> => {
  try {
    const userId = ctx.query.userId;

    if (!userId) {
      ctx.res.writeHead(400, { 'Content-Type': 'application/json' });
      ctx.res.end(JSON.stringify({ error: 'Missing required field: userId' }));
      return;
    }

    log.info(`[API] Brand kit request for: ${userId}`);

    const { autoLoadBrandKit } = await import('../../capabilities/content/brandKitAutoLoader.js');
    const brandKit = await autoLoadBrandKit(userId);

    const brandKitObj = brandKit as Record<string, unknown>;
    const dataObj = brandKitObj.data as Record<string, unknown>;
    const visualObj = dataObj.visual as Record<string, unknown>;

    ctx.res.writeHead(200, { 'Content-Type': 'application/json' });
    ctx.res.end(
      JSON.stringify({
        success: true,
        userId,
        source: brandKitObj.type,
        confidence: brandKitObj.confidence,
        brand: {
          colors: visualObj?.palette,
          fonts: visualObj?.typography,
          voice: dataObj.voice,
          audience: dataObj.audience,
        },
      }),
    );
  } catch (error) {
    log.error(`[API] Brand kit error: ${error}`);
    ctx.res.writeHead(500, { 'Content-Type': 'application/json' });
    ctx.res.end(JSON.stringify({ error: 'Failed to load brand kit' }));
  }
};

// ── Export routes for mounting ────────────────────────────────────────

export const contentGenerationRoutes: Record<string, RouteHandler> = {
  'POST /api/content/generate': generateContent,
  'GET /api/content/preview/:generationId': previewContent,
  'POST /api/content/publish': publishToSocial,
  'GET /api/content/templates': listTemplates,
  'GET /api/content/brand-kit': getBrandKit,
};

log.info('[Content Generation API] Routes registered: 5 endpoints');
