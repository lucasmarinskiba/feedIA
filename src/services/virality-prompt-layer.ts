/**
 * Virality Prompt Layer
 *
 * Transforms virality improvements into structured guidance for content generation.
 * Sits between viral prediction and content generation in pipeline.
 *
 * Flow:
 * 1. Score baseline content or control variant
 * 2. Extract improvement recommendations
 * 3. Convert to LLM instructions via getPromptInjections()
 * 4. Enrich brief with virality instructions
 * 5. Pass enriched brief to generator
 */

import { log } from '../agent/logger.js';
import { trendingCacheService } from './trending-cache-service.js';
import type { BrandProfile } from '../config/types.js';

// Dynamic import to cross src/api boundary
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const loadViralPredictor = async (): Promise<any> => {
  // @ts-ignore - api/_viralPredictor.js is JS, not TS
  const mod = await import('../../api/_viralPredictor.js');
  return { predictVirality: mod.predictVirality, getPromptInjections: mod.getPromptInjections };
};

export interface VirologyInjectionContext {
  hook?: string;
  caption?: string;
  hashtags?: string[];
  format: 'reels' | 'carousel' | 'stories' | 'video' | 'reel';
  platform: 'instagram' | 'tiktok';
  thumbnail?: {
    hasFace?: boolean;
    hasText?: boolean;
    brightColors?: boolean;
    highContrast?: boolean;
  };
  postingTime?: string;
  audienceSize?: number;
}

export interface EnrichedBrief {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  originalBrief: any;
  viralityGuidance: string[];
  injectionSource: 'baseline-analysis' | 'user-provided';
  predictions: {
    viralScore: number;
    ceilingScore: number;
    contentIntent: string;
  };
  frameGuidance?: Array<{
    frameNumber: number;
    emphasis: string[];
  }>;
  trendingTopics?: string[];
  trendingGuidance?: string;
}

/**
 * Score existing content (control variant) and extract insights
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const getBaselineScore = async (context: VirologyInjectionContext): Promise<any> => {
  const { predictVirality } = await loadViralPredictor();

  const analysis = predictVirality({
    hook: context.hook || '',
    caption: context.caption || '',
    hashtags: context.hashtags || [],
    format: context.format,
    platform: context.platform,
    thumbnail: context.thumbnail,
    postingTime: context.postingTime,
    audienceSize: context.audienceSize || 1000,
  });

  return analysis;
};

/**
 * Convert viralityAnalysis → enriched brief with guidance + trending topics
 */
 
export const enrichBriefWithVirality = async (
  brief: any, // eslint-disable-line @typescript-eslint/no-explicit-any
  baselineAnalysis: any, // eslint-disable-line @typescript-eslint/no-explicit-any
  carouselFrameCount?: number,
  brandProfile?: BrandProfile,
): Promise<EnrichedBrief> => {
  const { getPromptInjections } = await loadViralPredictor();

  const injections = getPromptInjections(baselineAnalysis);

  // Optional: frame-level guidance for carousels
  let frameGuidance: EnrichedBrief['frameGuidance'] = undefined;
  if (carouselFrameCount && carouselFrameCount > 1) {
    frameGuidance = generateFrameGuidance(baselineAnalysis.improvements, carouselFrameCount);
  }

  // NEW: Inject trending topics if brand profile provided
  let trendingTopics: string[] | undefined;
  let trendingGuidance: string | undefined;
  if (brandProfile) {
    try {
      trendingTopics = await trendingCacheService.getTrendingTopics(brandProfile);
      if (trendingTopics.length > 0) {
        trendingGuidance = trendingCacheService.formatTrendingGuidance(trendingTopics);
      }
    } catch (err) {
      log.warn('[ViraLityLayer] Failed to fetch trending topics', { error: String(err) });
    }
  }

  return {
    originalBrief: brief,
    viralityGuidance: injections,
    injectionSource: 'baseline-analysis',
    predictions: {
      viralScore: baselineAnalysis.viralScore,
      ceilingScore: baselineAnalysis.ceilingScore,
      contentIntent: baselineAnalysis.contentIntent,
    },
    frameGuidance,
    trendingTopics,
    trendingGuidance,
  };
};

/**
 * Allocate improvement focus across carousel frames
 * E.g., Frame 1-2: Hook, Frame 3-5: Value, Frame 6-8: Proof, Frame 9-10: CTA
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const generateFrameGuidance = (improvements: any[], frameCount: number): EnrichedBrief['frameGuidance'] => {
  const guidance: EnrichedBrief['frameGuidance'] = [];

  const hookImprovements = improvements.filter(
    (i) => i.metric.toLowerCase().includes('hook') || i.metric.toLowerCase().includes('retention'),
  );
  const emotionImprovements = improvements.filter(
    (i) => i.metric.toLowerCase().includes('emotion') || i.metric.toLowerCase().includes('engagement'),
  );
  const ctaImprovements = improvements.filter(
    (i) => i.metric.toLowerCase().includes('cta') || i.metric.toLowerCase().includes('comments'),
  );

  for (let i = 1; i <= frameCount; i++) {
    const emphasis: string[] = [];

    if (i <= 2) {
      emphasis.push(...hookImprovements.map((imp) => imp.action));
    } else if (i >= frameCount - 1) {
      emphasis.push(...ctaImprovements.map((imp) => imp.action));
    } else {
      emphasis.push(...emotionImprovements.map((imp) => imp.action));
    }

    if (emphasis.length > 0) {
      guidance.push({
        frameNumber: i,
        emphasis: [...new Set(emphasis)],
      });
    }
  }

  return guidance;
};

/**
 * Public orchestrator: given a brief, optionally score it first, then enrich with virality + trending
 */
 
export const applyViraLityLayer = async (
  brief: any, // eslint-disable-line @typescript-eslint/no-explicit-any
  format: 'carousel' | 'reel' | 'story',
  platform: 'instagram' | 'tiktok',
  scoreControl?: VirologyInjectionContext,
  brandProfile?: BrandProfile,
): Promise<EnrichedBrief> => {
  log.info('[ViraLityLayer] Starting enrichment', {
    briefTopic: brief.topic,
    format,
    platform,
    scoreControl: !!scoreControl,
    hasBrand: !!brandProfile,
  });

  let baselineAnalysis;

  if (scoreControl) {
    baselineAnalysis = await getBaselineScore(scoreControl);
  } else {
    const { predictVirality } = await loadViralPredictor();
    baselineAnalysis = predictVirality({
      hook: brief.topic,
      caption: '',
      hashtags: [],
      format: format === 'carousel' ? 'carousel' : format === 'reel' ? 'reels' : 'stories',
      platform,
    });
  }

  const frameCount = brief.slideCount || brief.frameCount || undefined;
  const enriched = await enrichBriefWithVirality(brief, baselineAnalysis, frameCount, brandProfile);

  log.info('[ViraLityLayer] Enrichment complete', {
    viralScore: enriched.predictions.viralScore,
    guidelineCount: enriched.viralityGuidance.length,
    trendingTopicCount: enriched.trendingTopics?.length || 0,
  });

  return enriched;
};
