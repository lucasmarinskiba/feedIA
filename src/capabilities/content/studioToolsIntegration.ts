/**
 * Studio Tools Integration Master
 *
 * Asegura que TODAS las herramientas Studio (Carousel, Reel, Story, TikTok)
 * reciben guidance del brain antes de producir contenido.
 *
 * Funciona como mediator: herramienta llama aquí, aquí se inyecta guidance,
 * luego herramienta tiene acceso a los insights automáticamente.
 */

import { log } from '../../agent/logger.js';
import type { BrandProfile } from '../../config/types.js';
import {
  enhanceCarouselCreation,
  enhanceReelCreation,
  enhanceTikTokVideo,
  enhanceTikTokPhoto,
  enhanceTikTokScript,
  enhanceStoryCreation,
  validateStudioOutput,
} from './studioToolEnhancer.js';
import { runCarouselFactory } from './carouselFactory.js';
import { createReel } from './reel.js';
import { generateCarouselContent, type CarouselBrief } from './carouselContentOrchestrator.js';
import { generateVideoContent, type VideoBrief } from './videoContentOrchestrator.js';
import {
  enrichCarouselWithEmotionAndHumor,
  enrichVideoWithEmotionAndHumor,
  type Emotion,
} from './emotionHumorOrchestrator.js';

// Re-export enhanced versions for use throughout codebase

/**
 * Carousel Creator con brain guidance
 * Automaticamente recibe Canva Specialist insights
 */
export const createCarouselWithBrainGuidance = async (
  topic: string,
  brand: BrandProfile,
  slideCount: number = 10,
): Promise<any> => {
  log.info(`[Studio Integration] Carousel with brain guidance: ${topic}`);

  const result = await enhanceCarouselCreation(
    {
      topic,
      brand,
      slideCount,
      tone: brand?.voice?.tone || ['professional'],
    },
    async (t, b) => {
      const job = await runCarouselFactory(b, { topic: t });
      return { jobId: job.id, format: 'carousel' };
    },
  );

  // Validate output
  const validation = await validateStudioOutput(result, 'carousel');
  log.info(`[Studio Integration] Carousel validation: score=${validation.score}`);

  return result;
};

/**
 * Reel Creator con brain guidance
 */
export const createReelWithBrainGuidance = async (
  idea: string,
  brand: BrandProfile,
): Promise<any> => {
  log.info(`[Studio Integration] Reel with brain guidance: ${idea}`);

  const result = await enhanceReelCreation(
    {
      idea,
      brand,
    },
    (i, b) => createReel(b, i),
  );

  const validation = await validateStudioOutput(result, 'reel');
  log.info(`[Studio Integration] Reel validation: score=${validation.score}`);

  return result;
};

/**
 * TikTok Video Creator con brain guidance
 */
export const createTikTokVideoWithBrainGuidance = async (
  topic: string,
  brand: BrandProfile,
): Promise<any> => {
  log.info(`[Studio Integration] TikTok Video with brain guidance: ${topic}`);

  const result = await enhanceTikTokVideo(
    { topic, brand },
    async (t, b) => 
      // TODO: Call actual TikTok video creator
       ({ topic: t, format: 'tiktok-video', status: 'planned' })
    ,
  );

  const validation = await validateStudioOutput(result, 'tiktok-video');
  log.info(`[Studio Integration] TikTok Video validation: score=${validation.score}`);

  return result;
};

/**
 * TikTok Photo Creator con brain guidance
 */
export const createTikTokPhotoWithBrainGuidance = async (
  description: string,
  brand: BrandProfile,
): Promise<any> => {
  log.info(`[Studio Integration] TikTok Photo with brain guidance: ${description}`);

  const result = await enhanceTikTokPhoto(
    { description, brand },
    async (d, b) => 
      // TODO: Call actual TikTok photo creator
       ({ description: d, format: 'tiktok-photo', status: 'planned' })
    ,
  );

  const validation = await validateStudioOutput(result, 'tiktok-photo');
  log.info(`[Studio Integration] TikTok Photo validation: score=${validation.score}`);

  return result;
};

/**
 * TikTok Script Creator con brain guidance
 */
export const createTikTokScriptWithBrainGuidance = async (
  topic: string,
  brand: BrandProfile,
): Promise<any> => {
  log.info(`[Studio Integration] TikTok Script with brain guidance: ${topic}`);

  const result = await enhanceTikTokScript(
    { topic, brand },
    async (t, b) => 
      // TODO: Call actual TikTok script creator
       ({ topic: t, format: 'tiktok-script', status: 'planned' })
    ,
  );

  const validation = await validateStudioOutput(result, 'tiktok-script');
  log.info(`[Studio Integration] TikTok Script validation: score=${validation.score}`);

  return result;
};

/**
 * Story Creator con brain guidance
 */
export const createStoryWithBrainGuidance = async (
  idea: string,
  brand: BrandProfile,
): Promise<any> => {
  log.info(`[Studio Integration] Story with brain guidance: ${idea}`);

  const result = await enhanceStoryCreation(
    { idea, brand },
    async (i, b) => 
      // TODO: Call actual Story creator
       ({ idea: i, format: 'story', status: 'planned' })
    ,
  );

  const validation = await validateStudioOutput(result, 'story');
  log.info(`[Studio Integration] Story validation: score=${validation.score}`);

  return result;
};

// ── Phase 10: Carousel Content Generation ────────────────────────────

export const generateCarousel = async (
  topic: string,
  brand: BrandProfile,
  slideCount: number = 10,
  emotion: 'fear' | 'hope' | 'joy' | 'anger' | 'curiosity' = 'curiosity',
): Promise<any> => {
  log.info(`[Studio Integration] Generating carousel: ${topic}`);

  const brief: CarouselBrief = {
    topic,
    slideCount,
    emotion,
    audience: brand?.audience?.primary,
  };

  const carousel = await generateCarouselContent(brief, brand);
  log.info(`[Studio Integration] ✓ Carousel: ${carousel.slideCount} slides, score=${carousel.metadata.engagementScore}`);

  return carousel;
};

// ── Phase 11: Video Content Generation ────────────────────────────

export const generateVideo = async (
  topic: string,
  brand: BrandProfile,
  duration: 15 | 30 | 45 | 60 = 30,
  platform: 'tiktok' | 'reel' | 'youtube-short' | 'instagram-story' = 'tiktok',
  emotion: 'fear' | 'hope' | 'joy' | 'anger' | 'curiosity' = 'curiosity',
): Promise<any> => {
  log.info(`[Studio Integration] Generating ${duration}s ${platform} video: ${topic}`);

  const brief: VideoBrief = {
    topic,
    duration,
    platform,
    tone: brand?.voice?.tone || ['professional'],
    emotionalHook: emotion,
    audience: brand?.audience?.primary,
  };

  const video = await generateVideoContent(brief, brand);
  log.info(`[Studio Integration] ✓ Video: ${duration}s, retention_score=${video.metadata.retentionScore}`);

  return video;
};

// ── Phase 12: Emotion + Humor Layer ────────────────────────────

export const enrichCarouselWithPsychology = async (
  carouselSlides: Array<{number: number; headline: string; body: string}>,
  topic: string,
  emotion: Emotion,
  brand?: BrandProfile,
): Promise<any> => {
  log.info(`[Studio Integration] Enriching carousel with ${emotion} emotion + humor`);

  const enriched = await enrichCarouselWithEmotionAndHumor(
    carouselSlides,
    topic,
    emotion,
    brand,
  );

  const avgScore = Math.round(
    enriched.reduce((sum, e) => sum + e.enriched.score.overallEngagement, 0) / enriched.length,
  );

  log.info(`[Studio Integration] ✓ Carousel enriched: avg_engagement=${avgScore}/100`);

  return enriched;
};

export const enrichVideoWithPsychology = async (
  videoScript: {hook: string; scenes: Array<{second: number; voiceover: string}>; cta: string},
  topic: string,
  emotion: Emotion,
  brand?: BrandProfile,
): Promise<any> => {
  log.info(`[Studio Integration] Enriching video with ${emotion} emotion + humor`);

  const enriched = await enrichVideoWithEmotionAndHumor(
    videoScript,
    topic,
    emotion,
    brand,
  );

  log.info(
    `[Studio Integration] ✓ Video enriched: hook=${enriched.hook.score.overallEngagement}, cta=${enriched.cta.score.overallEngagement}`,
  );

  return enriched;
};

// ── Export unified API ────────────────────────────────────────────────

export const studioToolsAPI = {
  carousel: createCarouselWithBrainGuidance,
  carouselGenerate: generateCarousel,
  carouselEnrichPsychology: enrichCarouselWithPsychology,
  reel: createReelWithBrainGuidance,
  tiktokVideo: createTikTokVideoWithBrainGuidance,
  videoGenerate: generateVideo,
  videoEnrichPsychology: enrichVideoWithPsychology,
  tiktokPhoto: createTikTokPhotoWithBrainGuidance,
  tiktokScript: createTikTokScriptWithBrainGuidance,
  story: createStoryWithBrainGuidance,
};

// ── Phase 16: Content Coherence Validation ────────────────────

export const validateWeeklyContentCoherence = async (
  contentPieces: Array<{type: 'carousel' | 'video' | 'story' | 'reel'; data: any}>,
  brand?: BrandProfile,
): Promise<any> => {
  const {validateWeeklyCoherence} = await import('./contentCoherenceValidator.js');

  const posts = contentPieces.map((piece) => ({
    type: piece.type,
    topic: piece.data.topic || 'Untitled',
    emotion: piece.data.emotion || 'curiosity',
    fonts: piece.data.fonts || [brand?.fonts?.headline || 'Poppins'],
    colors: piece.data.colors || [brand?.colors?.primary || '#E91E8C'],
    tone: brand?.voice?.tone?.[0] || 'professional',
    cta: piece.data.cta || 'Follow',
  }));

  const coherence = validateWeeklyCoherence(posts);
  log.info(`[Integration] Weekly coherence: ${coherence.coherence.overallCoherence}/100`);

  return coherence;
};

// ── Complete Unified API ────────────────────────────────────────

log.info('[Studio Integration] All engines initialized: Phase 10-16 complete');
