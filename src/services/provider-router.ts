/**
 * Intelligent provider router — selects the best generation backend per request.
 *
 * Priority: Higgsfield (when connected + mode allows) → existing fallback chain.
 * Completely transparent to callers — they just call routeImageGen / routeVideoGen.
 */

import { log } from '../agent/logger.js';
import {
  isHiggsfieldConnected,
  loadHiggsfieldCredentials,
} from '../integrations/higgsfieldAuth.js';
import {
  generateImageAndWait,
  generateVideoAndWait,
  type HiggsfieldImageModel,
  type HiggsfieldVideoModel,
} from '../integrations/higgsfield.js';
import { generateImage } from '../integrations/imageGen.js';
import { listUsers, getUser } from '../integrations/userRegistry.js';
import type { ProviderMode } from '../integrations/userRegistry.js';

// ─── Public types ─────────────────────────────────────────────────────────────

export type ContentType =
  | 'carousel-frame'   // 4:5 Instagram carousel slide
  | 'story-image'      // 9:16 Instagram/TikTok story
  | 'reel-video'       // 9:16 Instagram Reel
  | 'tiktok-video'     // 9:16 TikTok video
  | 'tiktok-photo'     // 9:16 TikTok photo post
  | 'post-image';      // 1:1 feed image

export type { ProviderMode };

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

// ─── Content-type config ──────────────────────────────────────────────────────

interface ContentTypeConfig {
  aspectRatio: '4:5' | '9:16' | '1:1';
  defaultImageModel: HiggsfieldImageModel;
  qualityImageModel: HiggsfieldImageModel;
  defaultVideoModel: HiggsfieldVideoModel;
  qualityVideoModel: HiggsfieldVideoModel;
  isVideo: boolean;
}

const CONTENT_CONFIG: Record<ContentType, ContentTypeConfig> = {
  'carousel-frame': {
    isVideo: false,
    aspectRatio: '4:5',
    defaultImageModel: 'flux-1-schnell',
    qualityImageModel: 'flux-1-dev',
    defaultVideoModel: 'auto',
    qualityVideoModel: 'auto',
  },
  'story-image': {
    isVideo: false,
    aspectRatio: '9:16',
    defaultImageModel: 'auto',
    qualityImageModel: 'flux-1-dev',
    defaultVideoModel: 'auto',
    qualityVideoModel: 'auto',
  },
  'reel-video': {
    isVideo: true,
    aspectRatio: '9:16',
    defaultImageModel: 'auto',
    qualityImageModel: 'auto',
    defaultVideoModel: 'wan-2.1-t2v',
    qualityVideoModel: 'kling-v1.5',
  },
  'tiktok-video': {
    isVideo: true,
    aspectRatio: '9:16',
    defaultImageModel: 'auto',
    qualityImageModel: 'auto',
    defaultVideoModel: 'wan-2.1-t2v',
    qualityVideoModel: 'kling-v1.5',
  },
  'tiktok-photo': {
    isVideo: false,
    aspectRatio: '9:16',
    defaultImageModel: 'flux-1-schnell',
    qualityImageModel: 'flux-1-dev',
    defaultVideoModel: 'auto',
    qualityVideoModel: 'auto',
  },
  'post-image': {
    isVideo: false,
    aspectRatio: '1:1',
    defaultImageModel: 'auto',
    qualityImageModel: 'flux-1-dev',
    defaultVideoModel: 'auto',
    qualityVideoModel: 'auto',
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const resolveUserHandle = (candidates: (string | undefined)[]): string | null => {
  for (const c of candidates) {
    if (c?.trim()) return c.trim().toLowerCase();
  }
  const users = listUsers();
  return users.length === 1 ? (users[0]?.handle ?? null) : null;
};

const loadProviderMode = (handle: string | null): ProviderMode => {
  if (!handle) return 'auto';
  return (getUser(handle)?.providerMode) ?? 'auto';
};

const shouldUseHiggsfield = (mode: ProviderMode): boolean => mode !== 'speed';

// ─── Image routing ────────────────────────────────────────────────────────────

export const routeImageGen = async (req: ImageRouterRequest): Promise<ProviderResult> => {
  const t0 = Date.now();
  const cfg = CONTENT_CONFIG[req.contentType];
  const handle = resolveUserHandle([req.userHandle]);
  const mode = loadProviderMode(handle);

  // ── Higgsfield path ──────────────────────────────────────────────────────────
  if (handle && shouldUseHiggsfield(mode) && isHiggsfieldConnected(handle)) {
    const creds = loadHiggsfieldCredentials(handle);
    if (creds?.apiKey) {
      const model = mode === 'quality' ? cfg.qualityImageModel : cfg.defaultImageModel;
      log.info('[ProviderRouter] Routing image via Higgsfield', {
        handle,
        mode,
        model,
        contentType: req.contentType,
      });
      try {
        const job = await generateImageAndWait(
          creds.apiKey,
          {
            prompt: req.style ? `${req.prompt}, ${req.style}` : req.prompt,
            model,
            aspectRatio: cfg.aspectRatio,
            numImages: ((req.count ?? 1) <= 4 ? (req.count ?? 1) : 4) as 1 | 2 | 4,
          },
          60000,
        );
        if (job?.status === 'completed' && (job.resultUrl || job.resultUrls?.length)) {
          return {
            ok: true,
            url: job.resultUrl,
            urls: job.resultUrls ?? (job.resultUrl ? [job.resultUrl] : undefined),
            provider: `higgsfield:${job.model ?? model}`,
            durationMs: Date.now() - t0,
          };
        }
        log.warn('[ProviderRouter] Higgsfield image failed, falling back', {
          status: job?.status,
          error: job?.error,
        });
      } catch (err) {
        log.warn('[ProviderRouter] Higgsfield image threw, falling back', { error: String(err) });
      }
    }
  }

  // ── Fallback: existing imageGen chain (replicate / openai) ──────────────────
  log.info('[ProviderRouter] Using imageGen fallback', { contentType: req.contentType });
  const result = await generateImage({
    prompt: req.prompt,
    aspectRatio: cfg.aspectRatio,
    style: req.style,
    count: req.count,
  });

  return {
    ok: result.ok,
    url: result.urls?.[0],
    urls: result.urls,
    provider: `${result.provider}:fallback`,
    durationMs: Date.now() - t0,
    error: result.error,
  };
};

// ─── Video routing ────────────────────────────────────────────────────────────

export const routeVideoGen = async (req: VideoRouterRequest): Promise<ProviderResult> => {
  const t0 = Date.now();
  const cfg = CONTENT_CONFIG[req.contentType];
  const handle = resolveUserHandle([req.userHandle]);
  const mode = loadProviderMode(handle);

  // ── Higgsfield path ──────────────────────────────────────────────────────────
  if (handle && shouldUseHiggsfield(mode) && isHiggsfieldConnected(handle)) {
    const creds = loadHiggsfieldCredentials(handle);
    if (creds?.apiKey) {
      const model = mode === 'quality' ? cfg.qualityVideoModel : cfg.defaultVideoModel;
      log.info('[ProviderRouter] Routing video via Higgsfield', {
        handle,
        mode,
        model,
        contentType: req.contentType,
      });
      try {
        const job = await generateVideoAndWait(
          creds.apiKey,
          {
            prompt: req.prompt,
            model,
            aspectRatio: cfg.aspectRatio,
            durationSeconds: req.durationSeconds ?? 5,
            referenceImageUrl: req.referenceImageUrl,
          },
          180000,
        );
        if (job?.status === 'completed' && job.resultUrl) {
          return {
            ok: true,
            url: job.resultUrl,
            provider: `higgsfield:${job.model ?? model}`,
            durationMs: Date.now() - t0,
          };
        }
        log.warn('[ProviderRouter] Higgsfield video failed, falling back', {
          status: job?.status,
          error: job?.error,
        });
      } catch (err) {
        log.warn('[ProviderRouter] Higgsfield video threw, falling back', { error: String(err) });
      }
    }
  }

  // ── Fallback: dynamic import of existing _videoProviders.js chain ───────────
  log.info('[ProviderRouter] Using smartGenerateVideo fallback', { contentType: req.contentType });
  try {
    type SmartVideoFn = (opts: {
      prompt: string;
      aspectRatio: string;
      durationSec?: number;
      planId?: string;
    }) => Promise<{ url?: string; provider?: string } | null>;

    // _videoProviders.js is a plain-JS legacy file without type declarations — intentional
    // @ts-ignore
    const mod = (await import('../../api/_videoProviders.js')) as { smartGenerateVideo?: SmartVideoFn };
    const fn = mod.smartGenerateVideo;
    if (fn) {
      const result = await fn({
        prompt: req.prompt,
        aspectRatio: cfg.aspectRatio,
        durationSec: req.durationSeconds ?? 5,
      });
      if (result?.url) {
        return {
          ok: true,
          url: result.url,
          provider: `${result.provider ?? 'smartVideo'}:fallback`,
          durationMs: Date.now() - t0,
        };
      }
    }
  } catch {
    // _videoProviders.js may not be importable in all environments — safe to skip
  }

  return {
    ok: false,
    provider: 'none',
    durationMs: Date.now() - t0,
    error: 'All video providers exhausted or unavailable',
  };
};
