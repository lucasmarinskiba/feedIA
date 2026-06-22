// @ts-nocheck
/**
 * TikTok Publish Pipeline — brief → contenido adaptado → publicación operativa.
 * Usa upload-post.com como agregador certificado cuando hay credenciales reales.
 */

import { log } from '../../agent/logger.js';
import { env } from '../../config/index.js';
import type { BrandProfile } from '../../config/types.js';
import { uploadToSocial, type UploadResult } from '../../integrations/uploadPost.js';
import type { BriefRequest } from '../pipelines/briefToPublish.js';
import type { CarruselResult } from '../content/carrusel.js';
import type { ReelScript } from '../content/reel.js';
import { adaptContentToTikTok, type TikTokContentPlan } from './contentAdapter.js';
import { recommendSound } from './soundLibrary.js';
import { scrapeTrends } from './trendScraper.js';
import { auditPromises } from '../antiPromiseAuditor/antiPromiseAuditor.js';

export interface TikTokPublishOutcome {
  ok: boolean;
  plan: TikTokContentPlan;
  upload?: UploadResult;
  socialUrl?: string;
  socialPostId?: string;
  scheduledFor?: string;
  antiPromiseClean: boolean;
  dryRun: boolean;
  errors: string[];
}

export interface TikTokPublishInput {
  brand: BrandProfile;
  brief: BriefRequest;
  content: { reel?: ReelScript; carrusel?: CarruselResult };
  videoUrl?: string;
  scheduleAt?: string;
}

const buildTikTokCaption = (plan: TikTokContentPlan): string => {
  const caption = `${plan.hookRewrite}\n\n${plan.adaptedCaption}\n\n${plan.ctaRewrite}`.trim();
  const hashtags = plan.hashtags.join(' ');
  return `${caption}\n\n${hashtags}`;
};

const deriveVideoUrl = (input: TikTokPublishInput): string => {
  if (input.videoUrl) return input.videoUrl;
  // Si es reel, asumimos que ya hay export URL; si no, generamos un mock realista.
  if (input.content.reel?.exportUrl) return input.content.reel.exportUrl;
  return `https://cdn.feedia.ai/mock/tiktok/${input.brand.handle ?? 'brand'}-${Date.now()}.mp4`;
};

export const tikTokBriefToPublish = async (input: TikTokPublishInput): Promise<TikTokPublishOutcome> => {
  const { brand, brief, content } = input;
  log.step(`TikTok brief → ${brief.idea.slice(0, 50)}`);

  const errors: string[] = [];

  const plan = await adaptContentToTikTok(brand, content);

  // Enriquecer con sound curado
  const sound = recommendSound({
    contentType: brand.voice?.contentPillars?.[0] ?? 'education',
    durationSec: plan.durationSec,
    mood: plan.template.bestFor.includes('comedy') ? 'funny' : 'upbeat',
  });
  plan.sound = {
    name: sound.name,
    bpm: sound.bpm,
    reason: `Sound ${sound.license} con ${sound.usageCount} usos — ${sound.suggestedFor.join(', ')}`,
  };

  // Refrescar trends si el cache está viejo
  await scrapeTrends({ region: 'global', limit: 5 }).catch((err: Error) => {
    log.warn(`[TikTokPipeline] Trend scrape fallback: ${err.message}`);
  });

  // Anti-promise audit
  const fullText = buildTikTokCaption(plan);
  const audit = auditPromises(fullText);
  if (audit.veredicto === 'hard-promise') {
    errors.push(`Anti-promise HARD: ${audit.issues.map((i) => i.phrase).join(', ')}`);
  }
  const antiPromiseClean = audit.veredicto !== 'hard-promise';

  const videoUrl = deriveVideoUrl(input);

  let upload: UploadResult | undefined;

  if (env.dryRun) {
    log.info('[TikTokPipeline] DRY_RUN: simulando publicación TikTok');
    upload = await uploadToSocial({
      platforms: ['tiktok'],
      mediaType: 'video',
      mediaUrls: [videoUrl],
      caption: fullText,
      scheduleAt: input.scheduleAt ?? brief.scheduledAt,
      perPlatform: {
        tiktok: { allowComments: true, allowDuet: true, allowStitch: true },
      },
      postId: `tt-${Date.now()}`,
    });
  } else if (antiPromiseClean) {
    upload = await uploadToSocial({
      platforms: ['tiktok'],
      mediaType: 'video',
      mediaUrls: [videoUrl],
      caption: fullText,
      scheduleAt: input.scheduleAt ?? brief.scheduledAt,
      perPlatform: {
        tiktok: { allowComments: true, allowDuet: true, allowStitch: true },
      },
      postId: `tt-${Date.now()}`,
    });
  } else {
    errors.push('Publicación bloqueada por anti-promise audit.');
  }

  const tiktokResult = upload?.perPlatformResults.find((r) => r.platform === 'tiktok');

  return {
    ok: Boolean(upload?.ok) && errors.length === 0,
    plan,
    upload,
    socialUrl: tiktokResult?.socialUrl,
    socialPostId: tiktokResult?.socialPostId,
    scheduledFor: tiktokResult?.scheduledFor,
    antiPromiseClean,
    dryRun: env.dryRun,
    errors,
  };
};

export const scheduleTikTokFromInstagramBrief = async (
  brand: BrandProfile,
  brief: BriefRequest,
  content: { reel?: ReelScript; carrusel?: CarruselResult },
  videoUrl?: string,
): Promise<TikTokPublishOutcome> => tikTokBriefToPublish({ brand, brief, content, videoUrl });
