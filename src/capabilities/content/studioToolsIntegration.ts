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
      const job = await runCarouselFactory(b, { topic: t, mode: 'quick' });
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

// ── Export unified API ────────────────────────────────────────────────

export const studioToolsAPI = {
  carousel: createCarouselWithBrainGuidance,
  reel: createReelWithBrainGuidance,
  tiktokVideo: createTikTokVideoWithBrainGuidance,
  tiktokPhoto: createTikTokPhotoWithBrainGuidance,
  tiktokScript: createTikTokScriptWithBrainGuidance,
  story: createStoryWithBrainGuidance,
};

log.info('[Studio Integration] All studio tools initialized with brain guidance');
