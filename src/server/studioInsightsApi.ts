/**
 * Studio Insights API — Frontend wiring
 *
 * Cuando Design Master inyecta insights en Studio tools,
 * este API los sirve al frontend para que UI los muestre
 *
 * GET /api/studio/insights/:format?platform=instagram
 * → { slides: [...], guidance: [...], reasoning: [...] }
 */

import type { RouteHandler } from './http.js';
import type { BrandProfile } from '../config/types.js';
import {
  enrichCarouselDesigner,
  enrichReelGenerator,
  enrichTikTokVideo,
  enrichStoryTool,
  enrichTikTokPhoto,
  enrichTikTokScript,
  type StudioContext,
} from '../capabilities/studioTools/canvaInsightsInjector.js';

// ── In-memory cache: workflow_id → insights ──────────────────────────

const insightsCache = new Map<string, Record<string, unknown>>();

export const cacheInsights = (workflowId: string, insights: Record<string, unknown>): void => {
  insightsCache.set(workflowId, insights);
  // TTL: 30 min
  setTimeout(() => insightsCache.delete(workflowId), 30 * 60 * 1000);
};

export const getInsights = (workflowId: string): Record<string, unknown> | null => insightsCache.get(workflowId) || null;

// ── API handlers ──────────────────────────────────────────────────────

export const studioInsightsHandler: RouteHandler = async ({ req, res }) => {
  const url = new URL(req.url || '/', 'http://localhost');
  const format = url.pathname.split('/').pop() || 'carousel';
  const platform = url.searchParams.get('platform') || 'instagram';
  const topic = url.searchParams.get('topic') || 'contenido de marca';
  const workflowId = url.searchParams.get('workflow_id');

  // Check cache first
  if (workflowId) {
    const cached = getInsights(workflowId);
    if (cached) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ source: 'cache', data: cached }));
      return;
    }
  }

  // Generate fresh insights
  // Default brand profile (no user context in this endpoint)
  const defaultBrand: BrandProfile = {
    id: 'default',
    name: 'Brand',
    type: 'marca-personal',
    niche: 'general',
    audience: { description: 'Audience', pains: [], desires: [], locale: 'es-AR' },
    voice: { tone: ['professional'], forbidden: [], referenceQuotes: [] },
    visual: {
      palette: [],
      typography: [],
      style: 'minimalista',
      mood: 'profesional',
      photographyStyle: 'natural',
      compositionRules: [],
      allowedIconography: [],
      forbiddenIconography: [],
      moodboardUrls: [],
      density: 'medium',
      imageTextRatio: 'balanced',
    },
    goals: { primary: 'awareness', metricsToWatch: [] },
    competitors: [],
    hashtagPools: {},
    contentPillars: [],
    complianceRules: [],
    brandStrategy: {
      vision: '',
      mission: '',
      values: [],
      promise: '',
      positioning: '',
      story: '',
      personality: [],
      archetype: '',
      architecture: 'master-brand',
      differentiators: [],
      experiencePrinciples: [],
      targetPersonas: [],
      brandVoiceRules: [],
      visualUsageRules: [],
    },
  };

  const context: StudioContext = {
    topic,
    brand: defaultBrand,
    tone: defaultBrand.voice?.tone || ['professional'],
    contentType: 'value',
  };

  try {
    let insights: Record<string, unknown> = {};

    switch (format) {
      case 'carousel':
        insights = { slides: await enrichCarouselDesigner(context, 10) };
        break;

      case 'reel':
        insights = { reelGuidance: await enrichReelGenerator(context) };
        break;

      case 'story':
        insights = { storyGuidance: await enrichStoryTool(context) };
        break;

      case 'tiktok-video':
        insights = { tiktokVideoGuidance: await enrichTikTokVideo(context) };
        break;

      case 'tiktok-photo':
        insights = { tiktokPhotoGuidance: await enrichTikTokPhoto(context) };
        break;

      case 'tiktok-script':
        insights = { tiktokScriptGuidance: await enrichTikTokScript(context) };
        break;

      default:
        insights = { error: `Format desconocido: ${format}` };
    }

    // Cache if workflow_id provided
    if (workflowId) {
      cacheInsights(workflowId, insights);
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        source: 'generated',
        format,
        platform,
        workflowId,
        data: insights,
      }),
    );
  } catch (error) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Error generando insights',
      }),
    );
  }
};

// ── Integration with extendedRoutes ────────────────────────────────

export const registerStudioInsightsRoutes = (routes: Array<{ method: string; pattern: string; handler: RouteHandler }>): void => {
  routes.push({
    method: 'GET',
    pattern: '/api/studio/insights/:format',
    handler: studioInsightsHandler,
  });
};
