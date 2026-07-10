/**
 * Real Asset Renderer — the missing final link in FeedIA's pipeline.
 *
 * Every other service this session (master-content-pipeline.ts, Brújula,
 * autonomous-generator.ts, content-routes.ts) produces a fully-guaranteed
 * PROMPT — validated, cinematographically refined, witty, identity-locked,
 * resolution-specced. None of them actually render a file. This service
 * takes that finished prompt and calls the real generators (Gemini Nano
 * Banana / Replicate / OpenAI for images, Veo 3.1 / SeeDance for video) to
 * produce an actual asset URL.
 *
 * This is intentionally a thin dispatcher over already-real services — no
 * new provider logic here, just the glue that was missing.
 */

import { log } from '../agent/logger.js';
import { generateImage, type ImageGenRequest } from '../integrations/imageGen.js';
import { generateVideoAndWait } from './veo-video-service.js';
import { generateSeedanceVideoAndWait } from './seedance-video-service.js';
import {
  generateVideoAndWait as higgsfieldGenerateVideo,
  generateImageAndWait as higgsfieldGenerateImage,
} from '../integrations/higgsfield.js';
import { loadHiggsfieldCredentials } from '../integrations/higgsfieldAuth.js';

export interface RenderRequest {
  prompt: string;
  platform: 'instagram' | 'tiktok';
  contentType: 'image' | 'video' | 'carousel';
  durationSeconds?: 4 | 5 | 6 | 8 | 10;
  referenceImageBase64?: string; // image-to-video (Veo only) or img2img context for image gen
  userHandle?: string; // if set, tries user's Higgsfield account first
  preferredProvider?: 'higgsfield' | 'veo' | 'auto';
}

export interface RenderResult {
  ok: boolean;
  assetUrl?: string;
  provider?: string;
  contentType: 'image' | 'video' | 'carousel';
  renderedAt: string;
  error?: string;
  fallbackUsed?: boolean;
}

/** Maps FeedIA's platform+contentType vocabulary to imageGen.ts's aspect ratio format. */
const toImageAspectRatio = (
  platform: 'instagram' | 'tiktok',
  contentType: 'image' | 'video' | 'carousel'
): ImageGenRequest['aspectRatio'] => {
  if (contentType === 'carousel') return '4:5';
  if (platform === 'tiktok') return '9:16';
  return '1:1';
};

const toVideoAspectRatio = (platform: 'instagram' | 'tiktok'): '9:16' | '16:9' =>
  platform === 'tiktok' ? '9:16' : '9:16'; // both platforms default to vertical for reels/tiktok video

/**
 * Render a static image or carousel frame.
 * Chain: Higgsfield (user account) → Gemini Nano Banana → Replicate → OpenAI.
 */
async function renderImage(request: RenderRequest): Promise<RenderResult> {
  // 1. Try Higgsfield if user has connected account
  const higgsResult = await tryHiggsfieldImage(request);
  if (higgsResult) return higgsResult;

  // 2. Auto fallback chain (Gemini → Replicate → OpenAI)
  const result = await generateImage({
    prompt: request.prompt,
    aspectRatio: toImageAspectRatio(request.platform, request.contentType),
  });

  return {
    ok: result.ok,
    assetUrl: result.urls?.[0],
    provider: result.provider,
    contentType: request.contentType,
    renderedAt: new Date().toISOString(),
    error: result.error,
  };
}

/**
 * Try Higgsfield video generation with the user's connected account.
 * Returns null if not configured or on failure (caller falls through to Veo).
 */
async function tryHiggsfieldVideo(request: RenderRequest): Promise<RenderResult | null> {
  if (!request.userHandle) return null;
  const creds = loadHiggsfieldCredentials(request.userHandle);
  if (!creds?.apiKey) return null;

  const aspectRatio = toVideoAspectRatio(request.platform);
  const duration = (request.durationSeconds || 5) as 4 | 5 | 6 | 8 | 10 | 15;

  log.info('[RealAssetRenderer] Trying Higgsfield video', {
    handle: request.userHandle,
    duration,
  });

  const result = await higgsfieldGenerateVideo(
    creds.apiKey,
    {
      prompt: request.prompt,
      model: 'auto',
      aspectRatio,
      durationSeconds: duration,
    },
    180000
  );

  if (result?.status === 'completed' && result.resultUrl) {
    return {
      ok: true,
      assetUrl: result.resultUrl,
      provider: `higgsfield:${result.model || result.provider || 'auto'}`,
      contentType: request.contentType,
      renderedAt: new Date().toISOString(),
    };
  }

  log.warn('[RealAssetRenderer] Higgsfield video failed', { error: result?.error });
  return null;
}

/**
 * Try Higgsfield image generation with the user's connected account.
 */
async function tryHiggsfieldImage(request: RenderRequest): Promise<RenderResult | null> {
  if (!request.userHandle) return null;
  const creds = loadHiggsfieldCredentials(request.userHandle);
  if (!creds?.apiKey) return null;

  log.info('[RealAssetRenderer] Trying Higgsfield image', { handle: request.userHandle });

  const result = await higgsfieldGenerateImage(
    creds.apiKey,
    {
      prompt: request.prompt,
      model: 'auto',
      aspectRatio: toImageAspectRatio(request.platform, request.contentType),
      numImages: 1,
    },
    60000
  );

  if (result?.status === 'completed' && (result.resultUrl || result.resultUrls?.[0])) {
    return {
      ok: true,
      assetUrl: result.resultUrl || result.resultUrls?.[0],
      provider: `higgsfield:${result.model || result.provider || 'auto'}`,
      contentType: request.contentType,
      renderedAt: new Date().toISOString(),
    };
  }

  log.warn('[RealAssetRenderer] Higgsfield image failed', { error: result?.error });
  return null;
}

/**
 * Render a video: Higgsfield (user's account) → Veo 3.1 → SeeDance fallback.
 */
async function renderVideo(request: RenderRequest): Promise<RenderResult> {
  // 1. Try Higgsfield if user has connected account
  if (request.preferredProvider !== 'veo') {
    const higgsResult = await tryHiggsfieldVideo(request);
    if (higgsResult) return higgsResult;
  }

  const aspectRatio = toVideoAspectRatio(request.platform);
  const duration = (request.durationSeconds && [4, 6, 8].includes(request.durationSeconds)
    ? request.durationSeconds
    : 8) as 4 | 6 | 8;

  // 2. Try Veo 3.1
  const veoResult = await generateVideoAndWait(
    request.prompt,
    {
      aspectRatio,
      durationSeconds: duration,
      referenceImageBase64: request.referenceImageBase64,
    },
    180000
  );

  if (veoResult?.done && !veoResult.error && (veoResult.videoUrl || veoResult.videoBase64)) {
    return {
      ok: true,
      assetUrl: veoResult.videoUrl,
      provider: 'veo-3.1',
      contentType: request.contentType,
      renderedAt: new Date().toISOString(),
    };
  }

  log.warn('[RealAssetRenderer] Veo unavailable, falling back to SeeDance', {
    veoError: veoResult?.error || 'unavailable',
  });

  // 3. SeeDance via FAL (last resort)
  const seedanceDuration = request.durationSeconds && request.durationSeconds >= 8 ? 10 : 5;
  const seedanceResult = await generateSeedanceVideoAndWait(
    request.prompt,
    { aspectRatio, durationSeconds: seedanceDuration as 5 | 10 },
    150000
  );

  if (seedanceResult?.done && !seedanceResult.error && seedanceResult.videoUrl) {
    return {
      ok: true,
      assetUrl: seedanceResult.videoUrl,
      provider: 'seedance-lite',
      contentType: request.contentType,
      renderedAt: new Date().toISOString(),
      fallbackUsed: true,
    };
  }

  return {
    ok: false,
    contentType: request.contentType,
    renderedAt: new Date().toISOString(),
    error: `Higgsfield: no account | Veo failed: ${veoResult?.error || 'unavailable'} | SeeDance failed: ${seedanceResult?.error || 'unavailable'}`,
  };
}

/**
 * Main entry point: renders a real asset from a finished prompt. Dispatches
 * to the image or video pipeline based on contentType.
 */
export async function renderAsset(request: RenderRequest): Promise<RenderResult> {
  log.info('[RealAssetRenderer] Render requested', {
    contentType: request.contentType,
    platform: request.platform,
    promptPreview: request.prompt.slice(0, 80),
  });

  const result =
    request.contentType === 'video' ? await renderVideo(request) : await renderImage(request);

  log.info('[RealAssetRenderer] Render complete', {
    ok: result.ok,
    provider: result.provider,
    contentType: result.contentType,
  });

  return result;
}

/**
 * Render an entire carousel — one image per frame prompt, in parallel.
 */
export async function renderCarousel(
  framePrompts: string[],
  platform: 'instagram' | 'tiktok'
): Promise<RenderResult[]> {
  return Promise.all(
    framePrompts.map(prompt =>
      renderImage({ prompt, platform, contentType: 'carousel' })
    )
  );
}
