/**
 * Phase 13: Content Generation REST API
 *
 * User-facing endpoints for one-click content generation
 * GET /api/content/generate
 * GET /api/content/preview/:id
 * POST /api/content/publish
 */

import type { Express, Request, Response } from 'express';
import { log } from '../../agent/logger.js';
import {
  executeGenerationPipeline,
  getContentPreview,
  publishContent,
  type UserContentBrief,
} from '../../capabilities/content/generationPipeline.js';

// Same story as server/routes/pinterestResearch.ts: written against the
// `RouteHandler`/`ctx: {req, res, ...}` convention from ../http.ts, which
// nothing in the real app (server.ts) ever imports or mounts — confirmed
// via repo-wide grep, same as for pinterestResearch.ts. These 5
// endpoints — the actual "one-click content generation" API this
// project is named after, per the file header below — have never been
// reachable. generateContent here calls executeGenerationPipeline from
// ../../capabilities/content/generationPipeline.js, which has real,
// working carousel/video generators (fixed earlier in this same
// type-safety pass), so wiring this up is a real feature becoming
// usable, not just a type fix. Rewritten as real Express handlers,
// registered from server.ts (registerContentGenerationRoutes).

// ── POST /api/content/generate ────────────────────────────────────────

export const generateContent = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId, contentType, topic, emotion, templateId, platform, duration } = req.body;

    if (!userId || !contentType || !topic) {
      res.status(400).json({ error: 'Missing required fields: userId, contentType, topic' });
      return;
    }

    log.info(`[API] Generate request: ${contentType} for ${topic}`);

    const result = await executeGenerationPipeline({
      userId,
      contentType: contentType as UserContentBrief['contentType'],
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
    res.status(500).json({ error: 'Generation failed' });
  }
};

// ── GET /api/content/preview/:generationId ────────────────────────────

export const previewContent = async (req: Request, res: Response): Promise<void> => {
  try {
    const generationId = req.params.generationId as string;
    const format = (req.query.format as string) || 'web';

    log.info(`[API] Preview request: ${generationId} (${format})`);

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
    res.status(500).json({ error: 'Preview failed' });
  }
};

// ── POST /api/content/publish ─────────────────────────────────────────

export const publishToSocial = async (req: Request, res: Response): Promise<void> => {
  try {
    const { generationId, targetPlatforms, scheduling, caption } = req.body;

    if (!generationId || !(Array.isArray(targetPlatforms) && targetPlatforms.length > 0)) {
      res.status(400).json({ error: 'Missing required fields: generationId, targetPlatforms[]' });
      return;
    }

    log.info(`[API] Publish request: ${generationId} → ${(targetPlatforms as string[]).join(', ')}`);

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
    res.status(500).json({ error: 'Publishing failed' });
  }
};

// ── GET /api/content/templates ────────────────────────────────────────

export const listTemplates = async (_req: Request, res: Response): Promise<void> => {
  try {
    const { getTopTemplates } = await import('../../capabilities/content/templateLibrary.js');

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
    res.status(500).json({ error: 'Failed to load templates' });
  }
};

// ── GET /api/content/brand-kit ────────────────────────────────────────

export const getBrandKit = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.query.userId as string;

    if (!userId) {
      res.status(400).json({ error: 'Missing required field: userId' });
      return;
    }

    log.info(`[API] Brand kit request for: ${userId}`);

    const { autoLoadBrandKit } = await import('../../capabilities/content/brandKitAutoLoader.js');
    const brandKit = await autoLoadBrandKit(userId);

    res.status(200).json({
      success: true,
      userId,
      source: brandKit.type,
      confidence: brandKit.confidence,
      brand: {
        colors: brandKit.data?.visual?.palette,
        fonts: brandKit.data?.visual?.typography,
        voice: brandKit.data?.voice,
        audience: brandKit.data?.audience,
      },
    });
  } catch (error) {
    log.error(`[API] Brand kit error: ${error}`);
    res.status(500).json({ error: 'Failed to load brand kit' });
  }
};

// ── Mount routes on the real Express app ────────────────────────────

export const registerContentGenerationRoutes = (app: Express): void => {
  app.post('/api/content/generate', generateContent);
  app.get('/api/content/preview/:generationId', previewContent);
  app.post('/api/content/publish', publishToSocial);
  app.get('/api/content/templates', listTemplates);
  app.get('/api/content/brand-kit', getBrandKit);
  log.info('[Content Generation API] Routes registered: 5 endpoints');
};
