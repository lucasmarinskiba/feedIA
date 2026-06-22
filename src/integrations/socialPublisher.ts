/**
 * Social Publisher — publicación unificada en Instagram y TikTok.
 *
 * Abstrae la diferencia de formatos entre plataformas:
 * - Instagram: carousel, reel, story, feed post.
 * - TikTok: video (reel o carrusel convertido a slideshow).
 *
 * Usa upload-post.com como agregador certificado y post-first-comment de Meta.
 */

import { log } from '../agent/logger.js';
import { env } from '../config/index.js';
import { postFirstComment } from '../capabilities/conversion/smartFirstComment.js';
import {
  uploadToSocial,
  listConnectedAccounts,
  validateAll,
  type SocialPlatform,
  type MediaType,
  type UploadPostPayload,
} from './uploadPost.js';
import { carruselToVideoUrl } from '../capabilities/tiktok/carruselToVideo.js';
import type { CarruselResult } from '../capabilities/content/carrusel.js';

export interface SocialPublishRequest {
  platforms: Array<'instagram' | 'tiktok'>;
  format: 'reel' | 'carrusel' | 'story' | 'post';
  caption: string;
  mediaUrls: string[];
  hashtags?: string[];
  firstComment?: string;
  scheduledAt?: string;
  perPlatform?: UploadPostPayload['perPlatform'];
  carrusel?: CarruselResult;
  brandName?: string;
  userHandle?: string;
}

export interface SocialPublishResult {
  ok: boolean;
  perPlatform: Array<{
    platform: 'instagram' | 'tiktok';
    status: 'queued' | 'posted' | 'failed' | 'scheduled';
    socialUrl?: string;
    socialPostId?: string;
    scheduledFor?: string;
    error?: string;
  }>;
  uploads: import('./uploadPost.js').UploadResult[];
  errors: string[];
}

const toContentType = (format: SocialPublishRequest['format']): 'reel' | 'carrusel' | 'post-imagen' | 'historia' | 'all' => {
  if (format === 'post') return 'post-imagen';
  if (format === 'story') return 'historia';
  return format;
};

const validateAccounts = async (platforms: SocialPlatform[]): Promise<{ ok: boolean; errors: string[] }> => {
  if (env.dryRun) return { ok: true, errors: [] };
  const accounts = await listConnectedAccounts();
  const active = new Set(accounts.filter((a) => a.isActive).map((a) => a.platform));
  const errors: string[] = [];
  for (const p of platforms) {
    if (!active.has(p)) errors.push(`Cuenta ${p} no conectada`);
  }
  return { ok: errors.length === 0, errors };
};

const mapFormatToMediaType = (format: SocialPublishRequest['format'], platform: SocialPlatform): MediaType => {
  if (platform === 'tiktok') return 'video';
  if (format === 'reel') return 'reel';
  if (format === 'carrusel') return 'carousel';
  if (format === 'story') return 'story';
  return 'photo';
};

const publishSingle = async (
  platforms: SocialPlatform[],
  format: SocialPublishRequest['format'],
  caption: string,
  mediaUrls: string[],
  opts: {
    hashtags?: string[];
    scheduledAt?: string;
    firstComment?: string;
    perPlatform?: UploadPostPayload['perPlatform'];
  } = {},
): Promise<{
  ok: boolean;
  upload: import('./uploadPost.js').UploadResult;
  perPlatform: SocialPublishResult['perPlatform'];
  firstCommentSent?: boolean;
}> => {
  const mediaType = mapFormatToMediaType(format, platforms[0]!);
  const validation = validateAll({
    platforms,
    mediaType,
    mediaUrls,
    caption,
    hashtags: opts.hashtags,
    scheduleAt: opts.scheduledAt,
    perPlatform: opts.perPlatform,
  });
  if (!validation.ok) {
    const issues = validation.perPlatform.flatMap((p) => p.result.issues);
    return {
      ok: false,
      upload: {
        ok: false,
        uploadId: '',
        perPlatformResults: platforms.map((p) => ({ platform: p as 'instagram' | 'tiktok', status: 'failed' as const, error: issues.join('; ') })),
        errors: issues,
        costEstimateUsd: 0,
      },
      perPlatform: platforms.map((p) => ({ platform: p as 'instagram' | 'tiktok', status: 'failed', error: issues.join('; ') })),
    };
  }

  const upload = await uploadToSocial({
    platforms,
    mediaType,
    mediaUrls,
    caption,
    hashtags: opts.hashtags,
    scheduleAt: opts.scheduledAt,
    perPlatform: opts.perPlatform,
  });

  const perPlatform: SocialPublishResult['perPlatform'] = upload.perPlatformResults.map((r) => ({
    platform: r.platform as 'instagram' | 'tiktok',
    status: r.status,
    socialUrl: r.socialUrl,
    socialPostId: r.socialPostId,
    scheduledFor: r.scheduledFor,
    error: r.error,
  }));

  let firstCommentSent = false;
  if (opts.firstComment && platforms.includes('instagram')) {
    const ig = perPlatform.find((p) => p.platform === 'instagram');
    if (ig?.socialPostId) {
      const fc = await postFirstComment(ig.socialPostId, toContentType(format));
      firstCommentSent = fc.sent;
      if (!fc.sent) log.warn(`[SocialPublisher] First comment no enviado: ${fc.reason}`);
    }
  }

  return { ok: upload.ok, upload, perPlatform, firstCommentSent };
};

export const publishToSocialPlatforms = async (req: SocialPublishRequest): Promise<SocialPublishResult> => {
  const platforms = [...new Set(req.platforms)] as SocialPlatform[];
  if (platforms.length === 0) {
    return { ok: false, perPlatform: [], uploads: [], errors: ['No se especificaron plataformas'] };
  }

  const accountCheck = await validateAccounts(platforms);
  if (!accountCheck.ok) {
    return { ok: false, perPlatform: [], uploads: [], errors: accountCheck.errors };
  }

  const result: SocialPublishResult = { ok: true, perPlatform: [], uploads: [], errors: [] };

  // TikTok solo soporta video. Si el formato es story/post, se publica solo en IG.
  const tiktokSupported = req.format === 'reel' || req.format === 'carrusel';
  const igOnly = req.format === 'story' || req.format === 'post' || !platforms.includes('tiktok') || !tiktokSupported;

  if (igOnly) {
    const unsupported = platforms.filter((p) => p === 'tiktok');
    if (unsupported.length > 0 && !result.errors.some((e) => e.includes('TikTok no soporta'))) {
      result.errors.push(`TikTok no soporta formato ${req.format}`);
      result.ok = false;
      result.perPlatform.push(
        ...unsupported.map((p) => ({ platform: p as 'instagram' | 'tiktok', status: 'failed' as const, error: `Formato ${req.format} no soportado` })),
      );
    }
    const igPlatforms = platforms.filter((p) => p === 'instagram') as SocialPlatform[];
    if (igPlatforms.length === 0) {
      return { ...result, uploads: [] };
    }
    const r = await publishSingle(igPlatforms, req.format, req.caption, req.mediaUrls, {
      hashtags: req.hashtags,
      scheduledAt: req.scheduledAt,
      firstComment: req.firstComment,
      perPlatform: req.perPlatform,
    });
    result.ok = r.ok;
    result.uploads.push(r.upload);
    result.perPlatform.push(...r.perPlatform);
    if (!r.ok) result.errors.push(`Instagram publish failed`);
    result.ok = result.errors.length === 0 && result.perPlatform.every((p) => p.status !== 'failed');
    return result;
  }

  // Reel: un solo asset sirve para IG y TikTok
  if (req.format === 'reel') {
    const r = await publishSingle(platforms, req.format, req.caption, req.mediaUrls, {
      hashtags: req.hashtags,
      scheduledAt: req.scheduledAt,
      firstComment: req.firstComment,
      perPlatform: req.perPlatform,
    });
    result.ok = r.ok;
    result.uploads.push(r.upload);
    result.perPlatform.push(...r.perPlatform);
    if (!r.ok) result.errors.push(`Cross-post reel failed`);
    result.ok = result.errors.length === 0 && result.perPlatform.every((p) => p.status !== 'failed');
    return result;
  }

  // Carrusel: IG recibe imágenes, TikTok recibe video slideshow
  if (req.format === 'carrusel') {
    // Instagram
    const igPlatforms = platforms.filter((p) => p === 'instagram') as SocialPlatform[];
    if (igPlatforms.length > 0) {
      const ig = await publishSingle(igPlatforms, req.format, req.caption, req.mediaUrls, {
        hashtags: req.hashtags,
        scheduledAt: req.scheduledAt,
        firstComment: req.firstComment,
        perPlatform: req.perPlatform,
      });
      result.ok &&= ig.ok;
      result.uploads.push(ig.upload);
      result.perPlatform.push(...ig.perPlatform);
      if (!ig.ok) result.errors.push('Instagram carousel publish failed');
    }

    // TikTok
    if (platforms.includes('tiktok')) {
      const videoUrl = await carruselToVideoUrl(
        req.carrusel ?? req.mediaUrls,
        req.caption,
        req.brandName,
        req.userHandle,
      );
      if (!videoUrl) {
        result.ok = false;
        result.errors.push('No se pudo generar video slideshow para TikTok');
        result.perPlatform.push({ platform: 'tiktok', status: 'failed', error: 'carrusel-to-video failed' });
        return result;
      }
      const tt = await publishSingle(['tiktok'], 'reel', req.caption, [videoUrl], {
        hashtags: req.hashtags,
        scheduledAt: req.scheduledAt,
        perPlatform: { tiktok: req.perPlatform?.tiktok },
      });
      result.ok &&= tt.ok;
      result.uploads.push(tt.upload);
      result.perPlatform.push(...tt.perPlatform);
      if (!tt.ok) result.errors.push('TikTok carousel-to-video publish failed');
    }
    result.ok = result.errors.length === 0 && result.perPlatform.every((p) => p.status !== 'failed');
    return result;
  }

  return { ok: false, perPlatform: [], uploads: [], errors: [`Formato no soportado: ${req.format}`] };
};
