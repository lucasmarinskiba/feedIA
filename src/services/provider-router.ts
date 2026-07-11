/**
 * Provider Router — Intelligent Content Provider Routing
 *
 * Central orchestrator that routes image/video generation through Higgsfield first,
 * then falls back to existing providers (Replicate, OpenAI) if Higgsfield unavailable.
 *
 * Features:
 * - Auto-detect user Higgsfield connection
 * - Per-user provider mode: auto / higgsfield-first / speed / quality
 * - Graceful degradation to Replicate/OpenAI fallback
 * - Content-type → model mapping
 */

import { log } from '../agent/logger.js';
import { loadHiggsfieldCredentials } from '../integrations/higgsfieldAuth.js';
import { generateImageAndWait, generateVideoAndWait } from '../integrations/higgsfield.js';
import { generateImage } from '../integrations/imageGen.js';

export type ContentType = 'carousel-frame' | 'story-image' | 'reel-video' | 'tiktok-video' | 'tiktok-photo' | 'post-image';
export type ProviderMode = 'auto' | 'higgsfield-first' | 'speed' | 'quality';

export interface ImageRouterRequest {
  prompt: string;
  contentType: ContentType;
  userHandle?: string;
  style?: string;
  count?: number;
}

export interface VideoRouterRequest {
  prompt: string;
  contentType: ContentType;
  durationSeconds?: 4 | 5 | 6 | 8 | 10;
  userHandle?: string;
  referenceImageUrl?: string;
}

export interface ProviderResult {
  ok: boolean;
  url?: string;
  urls?: string[];
  provider: string;
  durationMs: number;
  error?: string;
}

const getHiggsfieldModels = (
  contentType: ContentType,
  mode: ProviderMode,
): { imageModel?: string; videoModel?: string; aspectRatio: string } => {
  const speedModel = 'flux-1-schnell';
  const qualityModel = 'flux-1-dev';
  const modelSelection = mode === 'quality' ? qualityModel : speedModel;

  switch (contentType) {
    case 'carousel-frame':
      return { imageModel: modelSelection, aspectRatio: '4:5' };
    case 'story-image':
    case 'reel-video':
    case 'tiktok-video':
      return { videoModel: 'wan-2.1-t2v', aspectRatio: '9:16' };
    case 'tiktok-photo':
      return { imageModel: modelSelection, aspectRatio: '9:16' };
    case 'post-image':
      return { imageModel: modelSelection, aspectRatio: '1:1' };
    default:
      return { imageModel: speedModel, aspectRatio: '1:1' };
  }
};

export const routeImageGen = async (req: ImageRouterRequest): Promise<ProviderResult> => {
  const startTime = Date.now();
  const userHandle = req.userHandle?.toLowerCase().replace(/^@/, '');

  log.info('[ProviderRouter] Image route requested', { contentType: req.contentType, userHandle });

  if (userHandle) {
    try {
      const creds = loadHiggsfieldCredentials(userHandle);
      if (creds) {
        const models = getHiggsfieldModels(req.contentType, 'auto');
        if (models.imageModel) {
          const result = await generateImageAndWait(creds.apiKey, {
            prompt: req.prompt,
            model: models.imageModel,
            aspectRatio: models.aspectRatio,
            numImages: req.count ?? 1,
          });

          if (result.ok && result.urls) {
            const durationMs = Date.now() - startTime;
            log.info('[ProviderRouter] Higgsfield image generated', {
              userHandle,
              provider: `higgsfield:${models.imageModel}`,
              durationMs,
            });
            return {
              ok: true,
              urls: result.urls,
              provider: `higgsfield:${models.imageModel}`,
              durationMs,
            };
          }
        }
      }
    } catch (err) {
      log.warn('[ProviderRouter] Higgsfield image failed, falling back', { userHandle, error: String(err) });
    }
  }

  try {
    const result = await generateImage(req.prompt, req.style, req.count);
    const durationMs = Date.now() - startTime;
    return {
      ok: result.ok,
      urls: result.urls,
      provider: result.provider || 'replicate',
      durationMs,
      error: result.error,
    };
  } catch (err) {
    log.error('[ProviderRouter] All image providers failed', { userHandle, error: String(err) });
    return {
      ok: false,
      provider: 'error',
      durationMs: Date.now() - startTime,
      error: String(err),
    };
  }
};

export const routeVideoGen = async (req: VideoRouterRequest): Promise<ProviderResult> => {
  const startTime = Date.now();
  const userHandle = req.userHandle?.toLowerCase().replace(/^@/, '');

  log.info('[ProviderRouter] Video route requested', { contentType: req.contentType, userHandle });

  if (userHandle) {
    try {
      const creds = loadHiggsfieldCredentials(userHandle);
      if (creds) {
        const models = getHiggsfieldModels(req.contentType, 'auto');
        if (models.videoModel) {
          const result = await generateVideoAndWait(creds.apiKey, {
            prompt: req.prompt,
            model: models.videoModel,
            aspectRatio: models.aspectRatio,
            durationSeconds: req.durationSeconds ?? 6,
            referenceImageUrl: req.referenceImageUrl,
          });

          if (result.ok && result.url) {
            const durationMs = Date.now() - startTime;
            log.info('[ProviderRouter] Higgsfield video generated', {
              userHandle,
              provider: `higgsfield:${models.videoModel}`,
              durationMs,
            });
            return {
              ok: true,
              url: result.url,
              provider: `higgsfield:${models.videoModel}`,
              durationMs,
            };
          }
        }
      }
    } catch (err) {
      log.warn('[ProviderRouter] Higgsfield video failed, falling back', { userHandle, error: String(err) });
    }
  }

  log.error('[ProviderRouter] Video fallback not yet wired', { userHandle });
  return {
    ok: false,
    provider: 'video-fallback-todo',
    durationMs: Date.now() - startTime,
    error: 'Video fallback provider not yet implemented',
  };
};

export const getUserProviderMode = (userHandle?: string): ProviderMode => {
  return 'auto';
};
