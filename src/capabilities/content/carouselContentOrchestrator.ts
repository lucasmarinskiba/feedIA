/**
 * Phase 10: Carousel Content Orchestrator
 *
 * Orchestrates full carousel generation:
 * Brief → Copy → Images → Sequence → Design specs
 */

import { log } from '../../agent/logger.js';
import type { BrandProfile } from '../../config/types.js';
import { generateCarouselCopy, enrichCopyWithPsychology } from './copywritingEngine.js';
import { generateImageBriefs } from './imageBriefGenerator.js';
import { sequenceCarousel, validateSequence } from './slideSequencer.js';

export interface CarouselBrief {
  topic: string;
  slideCount?: number;
  emotion?: 'fear' | 'hope' | 'joy' | 'anger' | 'curiosity';
  cta?: string;
  audience?: string;
}

export interface GeneratedCarousel {
  id: string;
  topic: string;
  slideCount: number;
  slides: Array<{
    number: number;
    headline: string;
    body: string;
    image: string;
    purpose: string;
  }>;
  designSpecs: {
    colorPalette: string;
    typography: string;
    layout: string;
    animation: string;
  };
  metadata: {
    generatedAt: string;
    emotion: string;
    engagementScore: number;
  };
}

export const generateCarouselContent = async (
  brief: CarouselBrief,
  brand?: BrandProfile,
): Promise<GeneratedCarousel> => {
  log.info(`[Carousel Orchestrator] Starting generation: ${brief.topic}`);

  const slideCount = brief.slideCount || 10;
  const emotion = brief.emotion || 'curiosity';

  try {
    // Step 1: Generate copy
    const copy = await generateCarouselCopy(
      {
        topic: brief.topic,
        slideCount,
        tone: brand?.voice?.tone || ['professional'],
        cta: brief.cta,
        audience: brief.audience,
        emotionalHook: emotion,
      },
      brand,
    );

    // Step 2: Enrich with psychology
    const enrichedCopy = enrichCopyWithPsychology(copy, emotion);

    // Step 3: Generate image briefs
    const imageBriefs = generateImageBriefs(enrichedCopy, brief.topic);

    // Step 4: Sequence slides
    const sequence = sequenceCarousel(slideCount);
    const validation = validateSequence(sequence);

    if (!validation.valid) {
      log.warn(`[Carousel] Sequence validation issues: ${validation.issues.join(', ')}`);
    }

    // Step 5: Combine into carousel
    const slides = enrichedCopy.map((copy, idx) => ({
      number: copy.slideNumber,
      headline: copy.headline,
      body: copy.body,
      image: imageBriefs[idx]?.description || '',
      purpose: sequence[idx]?.purpose || 'value',
    }));

    // Step 6: Design specs
    const designSpecs = getDesignSpecs(brief.topic, emotion);

    const carousel: GeneratedCarousel = {
      id: `carousel_${Date.now()}`,
      topic: brief.topic,
      slideCount,
      slides,
      designSpecs,
      metadata: {
        generatedAt: new Date().toISOString(),
        emotion,
        engagementScore: calculateEngagementScore(slides),
      },
    };

    log.info(`[Carousel Orchestrator] ✓ Generated ${slideCount}-slide carousel`);
    return carousel;
  } catch (error) {
    log.error(`[Carousel Orchestrator] Error: ${error}`);
    throw error;
  }
};

const getDesignSpecs = (
  topic: string,
  emotion: string,
): GeneratedCarousel['designSpecs'] => {
  const emotionalPalettes: Record<string, string> = {
    fear: 'Dark Premium (#1A1A1A, #E6D5B8)',
    hope: 'Warm Organic (#C65911, #D4AF37)',
    joy: 'Bold Playful (#E91E8C, #00D9FF)',
    anger: 'Dark Premium (#1A1A1A, #E91E8C)',
    curiosity: 'Clean Editorial (#001F3F, #FFFFFF)',
  };

  return {
    colorPalette: emotionalPalettes[emotion] || 'Clean Editorial',
    typography: 'Poppins Bold (headlines) + Inter Regular (body)',
    layout: 'Full-bleed image + centered text overlay',
    animation: 'Fade transition (400ms), pop-in text entrance',
  };
};

const calculateEngagementScore = (slides: GeneratedCarousel['slides']): number => {
  // Simple scoring: hooks get points, CTAs get points, variety counts
  let score = 50; // Base

  slides.forEach((slide) => {
    if (slide.purpose === 'hook') score += 15;
    if (slide.purpose === 'cta') score += 10;
    if (slide.purpose === 'proof') score += 8;
  });

  return Math.min(100, score);
};
