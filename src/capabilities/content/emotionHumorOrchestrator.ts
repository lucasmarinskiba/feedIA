/**
 * Phase 12: Emotion + Humor Orchestrator
 *
 * Master orchestrator combining psychology + comedy
 * Applied to carousel + video for maximum engagement
 */

import { log } from '../../agent/logger.js';
import type { BrandProfile } from '../../config/types.js';
import {
  createEmotionMap,
  validateEmotionCoherence,
  type Emotion,
  type EmotionMap,
} from './emotionPsychologyEngine.js';
import {
  generateHumorMap,
  validateHumorFit,
  injectHumor,
  type HumorMap,
} from './humorInjectionEngine.js';

export interface ContentEnrichmentBrief {
  content: string; // Original copy/script
  contentType: 'carousel-slide' | 'video-hook' | 'video-scene' | 'video-cta';
  topic: string;
  primaryEmotion: Emotion;
  comedyStyle?: 'dry' | 'absurd' | 'relatable' | 'dark' | 'pun-heavy';
  audience?: string;
  humorIntensity?: 'light' | 'medium' | 'strong';
}

export interface EnrichedContent {
  original: string;
  enriched: string;
  emotionMap: EmotionMap;
  humorMap: HumorMap;
  score: {
    emotionalImpact: number; // 0-100
    comedyResonance: number; // 0-100
    overallEngagement: number; // 0-100
  };
  metadata: {
    psychologyApplied: string[];
    humorTechniques: string[];
  };
}

export const enrichContentWithEmotionAndHumor = async (
  brief: ContentEnrichmentBrief,
  brand?: BrandProfile,
): Promise<EnrichedContent> => {
  log.info(`[Enrichment] ${brief.contentType}: ${brief.topic} (${brief.primaryEmotion})`);

  // Step 1: Create emotion map
  const emotionMap = createEmotionMap(
    brief.primaryEmotion,
    brief.topic,
    brief.audience || 'general',
  );

  // Step 2: Validate emotion coherence
  const emotionValidation = validateEmotionCoherence(emotionMap);
  if (!emotionValidation.valid) {
    log.warn(`[Enrichment] Emotion issues: ${emotionValidation.issues.join(', ')}`);
  }

  // Step 3: Create humor map
  const comedyStyle = brief.comedyStyle || selectComedyStyle(brief.primaryEmotion);
  const humorMap = generateHumorMap(brief.topic, brief.content.length, comedyStyle);

  // Step 4: Validate humor fit
  const humorValidation = validateHumorFit(
    brief.topic,
    humorMap,
    brief.audience || 'general',
  );
  if (humorValidation.warnings.length > 0) {
    log.warn(`[Enrichment] Humor warnings: ${humorValidation.warnings.join(', ')}`);
  }

  // Step 5: Inject psychology into content
  const withPsychology = applyPsychologicalTriggers(brief.content, emotionMap);

  // Step 6: Inject humor
  const enriched = injectHumor(withPsychology, comedyStyle, brief.humorIntensity || 'medium');

  // Step 7: Calculate engagement score
  const score = calculateEngagementScore(emotionMap, humorMap, brief.contentType);

  log.info(`[Enrichment] ✓ Score: ${score.overallEngagement}/100`);

  return {
    original: brief.content,
    enriched,
    emotionMap,
    humorMap,
    score,
    metadata: {
      psychologyApplied: emotionMap.triggers.map((t) => t.trigger),
      humorTechniques: humorMap.humorPoints.map((h) => h.type),
    },
  };
};

const selectComedyStyle = (emotion: Emotion): keyof typeof import('./humorInjectionEngine.js').comedyStyles => {
  const styleMap: Record<Emotion, keyof typeof import('./humorInjectionEngine.js').comedyStyles> = {
    fear: 'dark',
    hope: 'relatable',
    joy: 'absurd',
    anger: 'dark',
    curiosity: 'pun-heavy',
  };

  return styleMap[emotion];
};

const applyPsychologicalTriggers = (content: string, emotionMap: EmotionMap): string => {
  let result = content;

  // Insert primary trigger at start
  if (emotionMap.triggers.length > 0) {
    const primaryTrigger = emotionMap.triggers[0]!;
    result = `${primaryTrigger.trigger}\n\n${result}`;
  }

  // Inject emotional keywords throughout
  const keywords = getEmotionalKeywords(emotionMap.primary);
  keywords.slice(0, 2).forEach((keyword) => {
    // Replace first generic descriptor with emotional keyword
    const genericDescriptors = ['interesting', 'important', 'thing', 'fact', 'idea'];
    genericDescriptors.forEach((descriptor) => {
      result = result.replace(new RegExp(descriptor, 'i'), keyword);
    });
  });

  return result;
};

const getEmotionalKeywords = (emotion: Emotion): string[] => {
  const keywordMap: Record<Emotion, string[]> = {
    fear: ['danger', 'critical', 'urgent', 'must avoid', 'catastrophic'],
    hope: ['possible', 'breakthrough', 'achieve', 'transform', 'potential'],
    joy: ['celebrate', 'amazing', 'love', 'incredible', 'magical'],
    anger: ['unfair', 'exposed', 'injustice', 'action now', 'truth'],
    curiosity: ['secret', 'discover', 'revealed', 'unknown', 'mystery'],
  };

  return keywordMap[emotion];
};

const calculateEngagementScore = (
  emotionMap: EmotionMap,
  humorMap: HumorMap,
  contentType: string,
): EnrichedContent['score'] => {
  // Emotional impact: Hook strength + secondary emotion texture
  const emotionalImpact = Math.round(
    (emotionMap.hookStrength * 0.7 + (emotionMap.secondary ? 20 : 0)) / 1.0,
  );

  // Comedy resonance: Humor count + timing quality
  const timingScore: Record<string, number> = {
    excellent: 90,
    good: 75,
    risky: 50,
  };

  const comedyResonance = Math.round(
    (humorMap.totalLaughs * 10 + (timingScore[humorMap.timing] ?? 50)) / 2,
  );

  // Overall engagement: Combined, with content-type modifiers
  let overall = (emotionalImpact + comedyResonance) / 2;

  if (contentType === 'video-hook') overall *= 1.15; // Hooks need max impact
  if (contentType === 'carousel-slide') overall *= 0.95; // Slightly lower for static

  return {
    emotionalImpact: Math.min(100, emotionalImpact),
    comedyResonance: Math.min(100, comedyResonance),
    overallEngagement: Math.min(100, Math.round(overall)),
  };
};

// ── Batch enrichment for entire carousel/video ──────────────────────

export const enrichCarouselWithEmotionAndHumor = async (
  slides: Array<{number: number; headline: string; body: string}>,
  topic: string,
  primaryEmotion: Emotion,
  brand?: BrandProfile,
): Promise<Array<{number: number; enriched: EnrichedContent}>> => {
  log.info(`[Batch Enrichment] ${slides.length}-slide carousel: ${topic}`);

  const enriched = await Promise.all(
    slides.map((slide) =>
      enrichContentWithEmotionAndHumor(
        {
          content: `${slide.headline}\n${slide.body}`,
          contentType: slide.number <= 3 ? 'carousel-slide' : 'carousel-slide',
          topic,
          primaryEmotion,
          audience: brand?.audience?.description,
        },
        brand,
      ),
    ),
  );

  return enriched.map((e, idx) => ({
    number: slides[idx]!.number,
    enriched: e,
  }));
};

export const enrichVideoWithEmotionAndHumor = async (
  videoScript: {hook: string; scenes: Array<{second: number; voiceover: string}>; cta: string},
  topic: string,
  primaryEmotion: Emotion,
  brand?: BrandProfile,
): Promise<{hook: EnrichedContent; scenes: Array<{second: number; enriched: EnrichedContent}>; cta: EnrichedContent}> => {
  log.info(`[Batch Enrichment] Video script: ${topic}`);

  const hook = await enrichContentWithEmotionAndHumor(
    {
      content: videoScript.hook,
      contentType: 'video-hook',
      topic,
      primaryEmotion,
      humorIntensity: 'strong',
      audience: brand?.audience?.description,
    },
    brand,
  );

  const scenes = await Promise.all(
    videoScript.scenes.map((scene) =>
      enrichContentWithEmotionAndHumor(
        {
          content: scene.voiceover,
          contentType: 'video-scene',
          topic,
          primaryEmotion,
          audience: brand?.audience?.description,
        },
        brand,
      ),
    ),
  );

  const cta = await enrichContentWithEmotionAndHumor(
    {
      content: videoScript.cta,
      contentType: 'video-cta',
      topic,
      primaryEmotion,
      humorIntensity: 'medium',
      audience: brand?.audience?.description,
    },
    brand,
  );

  return {
    hook,
    scenes: scenes.map((e, idx) => ({
      second: videoScript.scenes[idx]!.second,
      enriched: e,
    })),
    cta,
  };
};
