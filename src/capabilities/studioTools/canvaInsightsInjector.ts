/**
 * Studio Tools + Canva Insights Injector
 *
 * Cuando CU NO disponible: cada herramienta Studio consulta Canva Specialist
 * Recibe design guidance para producción sin Computer Use
 *
 * Studio tools:
 * - Carousel Designer Pro
 * - Reel Generator
 * - Story Engagement Stacker
 * - TikTok Video Tool
 * - TikTok Photo Tool
 * - TikTok Script Tool
 */

import { log } from '../../agent/logger.js';
import type { BrandProfile } from '../../config/types.js';
import {
  consultCanvaSpecialist,
  generateCarouselInsight,
  generateReelInsight,
  generateTikTokInsight,
  type CanvaDesignSpec,
} from '../../agent/specialists/canvaSpecialist.js';

export interface StudioContext {
  topic: string;
  brand?: BrandProfile;
  tone: string[];
  contentType: 'hook' | 'value' | 'cta' | 'testimonial' | 'behind-the-scenes' | 'educational' | 'entertaining';
}

// ── Carousel Designer Pro enrichment ──────────────────────────────────────

export interface CarouselSlideGuidance {
  slideIndex: number;
  layout: string;
  colorPalette: {
    bg: string;
    text: string;
    accent: string;
  };
  typography: {
    headline: string;
    body: string;
  };
  imagery: {
    style: string;
    keywords: string[];
  };
  guidance: string;
  hook?: boolean; // If slide 0, should hook
}

export const enrichCarouselDesigner = async (
  context: StudioContext,
  slideCount: number = 10,
): Promise<CarouselSlideGuidance[]> => {
  const spec = await consultCanvaSpecialist({
    format: 'carousel',
    platform: 'instagram',
    topic: context.topic,
    tone: context.tone,
    contentType: context.contentType,
    brand: context.brand,
  });

  const slides: CarouselSlideGuidance[] = [];

  for (let i = 0; i < slideCount; i++) {
    const isHook = i < 3;
    const isValue = i >= 3 && i < 7;
    const isCta = i >= 7;

    const role = isHook ? 'hook' : isValue ? 'value' : 'cta';

    slides.push({
      slideIndex: i,
      layout: spec.layout.pattern,
      colorPalette: {
        bg: spec.colorPalette.primary,
        text: spec.colorPalette.text,
        accent: spec.colorPalette.accent,
      },
      typography: {
        headline: `${spec.typography.headline.size}px ${spec.typography.headline.weight}`,
        body: `${spec.typography.body.size}px ${spec.typography.body.weight}`,
      },
      imagery: {
        style: spec.imagery.style,
        keywords: spec.imagery.keywords,
      },
      guidance: generateCarouselInsight(spec, i),
      hook: isHook,
    });
  }

  log.info(`[Carousel Enrichment] ${slideCount} slides enriched with Canva insights`);

  return slides;
};

// ── Reel Generator enrichment ────────────────────────────────────────────

export interface ReelGeneratorGuidance {
  duration: number; // seconds
  hookDuration: number; // first N seconds for hook
  colorScheme: {
    primary: string;
    secondary: string;
    accent: string;
  };
  textTiming: Array<{
    text: string;
    startMs: number;
    endMs: number;
    size: number;
    weight: number;
    position: 'top' | 'center' | 'bottom';
  }>;
  audioStrategy: {
    trending: boolean;
    duration: number;
    mood: string;
  };
  transitions: Array<{
    type: string;
    durationMs: number;
  }>;
  guidance: string;
}

export const enrichReelGenerator = async (context: StudioContext): Promise<ReelGeneratorGuidance> => {
  const spec = await consultCanvaSpecialist({
    format: 'reel',
    platform: 'instagram',
    topic: context.topic,
    tone: context.tone,
    contentType: context.contentType,
    brand: context.brand,
  });

  const guidance: ReelGeneratorGuidance = {
    duration: 15, // Instagram Reel standard
    hookDuration: 2, // First 2 seconds for hook
    colorScheme: {
      primary: spec.colorPalette.primary,
      secondary: spec.colorPalette.secondary,
      accent: spec.colorPalette.accent,
    },
    textTiming: [
      {
        text: '[HOOK TEXT - 8 WORDS MAX]',
        startMs: 0,
        endMs: 2000,
        size: spec.typography.headline.size,
        weight: spec.typography.headline.weight,
        position: 'center',
      },
      {
        text: '[VALUE SEGMENT TEXT]',
        startMs: 2000,
        endMs: 12000,
        size: spec.typography.body.size,
        weight: spec.typography.body.weight,
        position: 'bottom',
      },
      {
        text: '[CTA - SWIPE UP, LINK, FOLLOW]',
        startMs: 12000,
        endMs: 15000,
        size: spec.typography.cta.size,
        weight: spec.typography.cta.weight,
        position: 'bottom',
      },
    ],
    audioStrategy: {
      trending: true,
      duration: 15000,
      mood: spec.imagery.mood,
    },
    transitions: [
      { type: 'cut', durationMs: 0 },
      { type: 'fade', durationMs: 200 },
      { type: 'slide', durationMs: 300 },
      { type: 'zoom', durationMs: 250 },
    ],
    guidance: generateReelInsight(spec),
  };

  log.info(`[Reel Enrichment] Reel generator enriched with Canva insights`);

  return guidance;
};

// ── TikTok Video Tool enrichment ─────────────────────────────────────────

export interface TikTokVideoGuidance {
  format: '9:16';
  dimensions: { width: number; height: number };
  colorPalette: {
    primary: string;
    secondary: string;
    accent: string;
  };
  hookStrategy: {
    duration: number; // ms
    textSize: number;
    position: 'top' | 'center' | 'bottom';
    animation: string;
  };
  trendingAudio: {
    required: boolean;
    description: string;
  };
  stickers: boolean;
  transitions: string[];
  guidance: string;
}

export const enrichTikTokVideo = async (context: StudioContext): Promise<TikTokVideoGuidance> => {
  const spec = await consultCanvaSpecialist({
    format: 'tiktok-video',
    platform: 'tiktok',
    topic: context.topic,
    tone: context.tone,
    contentType: context.contentType,
    brand: context.brand,
  });

  const guidance: TikTokVideoGuidance = {
    format: '9:16',
    dimensions: { width: 1080, height: 1920 },
    colorPalette: {
      primary: spec.colorPalette.primary,
      secondary: spec.colorPalette.secondary,
      accent: spec.colorPalette.accent,
    },
    hookStrategy: {
      duration: 1000, // 1 second hook
      textSize: spec.typography.headline.size,
      position: 'top',
      animation: spec.animation.style,
    },
    trendingAudio: {
      required: true,
      description: `Audio: ${spec.imagery.mood} (trending)`,
    },
    stickers: spec.elements.decorativeShapes,
    transitions: ['fade', 'slide', 'zoom', 'rotate'],
    guidance: generateTikTokInsight(spec),
  };

  log.info(`[TikTok Video Enrichment] TikTok generator enriched`);

  return guidance;
};

// ── Story Engagement enrichment ──────────────────────────────────────────

export interface StoryGuidance {
  duration: number; // seconds
  layouts: Array<{
    id: string;
    pattern: string;
    colorScheme: { bg: string; text: string; accent: string };
  }>;
  interactiveElements: {
    poll: boolean;
    quiz: boolean;
    countdownTimer: boolean;
    linkSticker: boolean;
  };
  guidance: string;
}

export const enrichStoryTool = async (context: StudioContext): Promise<StoryGuidance> => {
  const spec = await consultCanvaSpecialist({
    format: 'story',
    platform: 'instagram',
    topic: context.topic,
    tone: context.tone,
    contentType: context.contentType,
    brand: context.brand,
  });

  const guidance: StoryGuidance = {
    duration: 5, // Stories are usually quick
    layouts: [
      {
        id: 'layout-1',
        pattern: spec.layout.pattern,
        colorScheme: {
          bg: spec.colorPalette.primary,
          text: spec.colorPalette.text,
          accent: spec.colorPalette.accent,
        },
      },
    ],
    interactiveElements: {
      poll: context.contentType === 'entertaining',
      quiz: context.contentType === 'educational',
      countdownTimer: context.contentType === 'cta',
      linkSticker: context.contentType === 'cta',
    },
    guidance: `Story: ${spec.layout.pattern} layout. ${spec.imagery.style} imagery. Duration 5s. ${spec.canvaInstructions[0]}`,
  };

  log.info(`[Story Enrichment] Story tool enriched`);

  return guidance;
};

// ── TikTok Photo + Script enrichment ─────────────────────────────────────

export interface TikTokPhotoGuidance {
  dimensions: { width: number; height: number };
  colorPalette: {
    primary: string;
    accent: string;
  };
  textOverlay: {
    size: number;
    weight: number;
    position: 'top' | 'center' | 'bottom';
  };
  guidance: string;
}

export const enrichTikTokPhoto = async (context: StudioContext): Promise<TikTokPhotoGuidance> => {
  const spec = await consultCanvaSpecialist({
    format: 'tiktok-photo',
    platform: 'tiktok',
    topic: context.topic,
    tone: context.tone,
    contentType: context.contentType,
    brand: context.brand,
  });

  return {
    dimensions: { width: 1080, height: 1920 },
    colorPalette: {
      primary: spec.colorPalette.primary,
      accent: spec.colorPalette.accent,
    },
    textOverlay: {
      size: spec.typography.headline.size,
      weight: spec.typography.headline.weight,
      position: 'center',
    },
    guidance: `Photo (9:16): ${spec.imagery.style} style. Headline ${spec.typography.headline.size}px. ${spec.imagery.mood} mood.`,
  };
};

export interface TikTokScriptGuidance {
  hookDuration: number; // seconds
  pacing: Array<{
    segment: string;
    duration: number;
    instruction: string;
  }>;
  audioSuggestion: string;
  scriptFormat: string;
  guidance: string;
}

export const enrichTikTokScript = async (context: StudioContext): Promise<TikTokScriptGuidance> => {
  const spec = await consultCanvaSpecialist({
    format: 'tiktok-script',
    platform: 'tiktok',
    topic: context.topic,
    tone: context.tone,
    contentType: context.contentType,
    brand: context.brand,
  });

  return {
    hookDuration: 1.5, // seconds
    pacing: [
      { segment: 'hook', duration: 1.5, instruction: 'Grab attention (pattern interrupt)' },
      { segment: 'setup', duration: 4, instruction: 'Build context' },
      { segment: 'payoff', duration: 6, instruction: 'Deliver value' },
      { segment: 'cta', duration: 2.5, instruction: 'Call to action (follow, share, comment)' },
    ],
    audioSuggestion: `Trending audio with ${spec.imagery.mood} energy`,
    scriptFormat: `[0-1.5s HOOK]\n[1.5-5.5s SETUP]\n[5.5-11.5s PAYOFF]\n[11.5-14s CTA]`,
    guidance: `Script pacing: ${spec.animation.duration}ms transitions. Hook text 56px. ${spec.canvaInstructions[0]}`,
  };
};
