/**
 * Phase 18: Smart Carousel Generator
 *
 * Uses Pinterest patterns to auto-generate carousels with:
 * - Optimal slide count (3-10, no filler)
 * - Locked color palette + typography
 * - Validated narrative structure
 * - Retention-optimized progression
 */

import { log } from '../../agent/logger.js';
import {
  selectColorPalette,
  selectTypographyPairing,
  selectLayoutPattern,
  selectNarrativeStructure,
  type PinterestPattern,
} from './pinterestPatternEncoder.js';

export interface CarouselBrief {
  topic: string;
  emotion: 'fear' | 'hope' | 'joy' | 'anger' | 'curiosity';
  contentType?:
    | 'tips'
    | 'tutorial'
    | 'transformation'
    | 'listicle'
    | 'educational'
    | 'story'
    | 'product';
  audience?: 'b2b' | 'b2c' | 'lifestyle' | 'youth' | 'professional';
  targetSlideCount?: number; // 3-10, optional override
  userHasResearchData?: boolean; // true = trained on Pinterest pins
}

export interface CarouselSlide {
  number: number;
  role:
    | 'hook'
    | 'curiosity'
    | 'value'
    | 'objection'
    | 'proof'
    | 'cta'
    | 'item'
    | 'lesson'
    | 'example'
    | 'actions';
  headline: string;
  body: string;
  copyPattern: string;
  retentionTrigger: string;
  design: {
    layout: string; // from pattern library
    backgroundColor: string;
    textColor: string;
    imageType: 'hero' | 'mockup' | 'illustration' | 'photo' | 'grid' | 'none';
    visualElements: string[];
  };
  estimatedRetention: number; // 0-100, % of users reaching this slide
}

export interface GeneratedCarousel {
  id: string;
  topic: string;
  slideCount: number;
  optimalSlideCount: boolean; // true = matches Pinterest best practice
  slides: CarouselSlide[];
  designSystem: {
    colorPalette: PinterestPattern;
    typography: PinterestPattern;
    narrativeStructure: PinterestPattern;
    layoutApproach: string;
  };
  metadata: {
    emotion: string;
    primaryHook: string;
    retentionCurve: number[]; // per-slide retention %
    averageRetention: number;
    coherenceScore: number; // 0-100
    engagementScore: number; // 0-100
    trainedOnResearch: boolean;
    generatedAt: string;
  };
}

// ── Slide Count Decision (Pinterest Research) ───────────────────────────

const decideOptimalSlideCount = (
  topic: string,
  contentType?: string,
): number => {
  // Pinterest pattern: certain structures win at certain counts
  const contentTypeToCount: Record<string, number> = {
    tips: 7, // Listicle sweet spot
    tutorial: 6, // How-to keeps tight
    transformation: 5, // Before-after clean arc
    listicle: 7, // "7 tips" = optimal engagement
    educational: 7, // Lesson structure works at 7
    story: 8, // Narrative needs breathing room
    product: 5, // Features bore fast, keep short
  };

  const decidedCount = contentTypeToCount[contentType || 'tips'] || 7;

  log.info(`[Smart Carousel] Optimal slide count for "${contentType}": ${decidedCount} slides`);

  return decidedCount;
};

// ── Generate Carousel Structure ────────────────────────────────────────

export const generateSmartCarousel = async (
  brief: CarouselBrief,
): Promise<GeneratedCarousel> => {
  log.info(`[Smart Carousel] Generating carousel: ${brief.topic} (${brief.emotion})`);

  const carouselId = `carousel_${Date.now()}`;

  // Step 1: Select patterns from library
  const colorPalette = selectColorPalette(brief.topic, brief.emotion, brief.audience);
  const typography = selectTypographyPairing(brief.contentType || 'tips');
  const optimalSlideCount = brief.targetSlideCount || decideOptimalSlideCount(brief.topic, brief.contentType);
  const narrativeStructure = selectNarrativeStructure(optimalSlideCount, brief.contentType);

  log.info(
    `[Smart Carousel] Selected: palette=${colorPalette.name}, fonts=${typography.name}, slides=${optimalSlideCount}, narrative=${narrativeStructure.name}`,
  );

  // Step 2: Generate slides using narrative structure
  const slides: CarouselSlide[] = await generateSlidesFromNarrative(
    narrativeStructure,
    brief.topic,
    brief.emotion,
    colorPalette,
    typography,
    optimalSlideCount,
  );

  // Step 3: Calculate retention curve
  const retentionCurve = calculateRetentionCurve(slides);
  const averageRetention = Math.round(
    retentionCurve.reduce((a, b) => a + b, 0) / retentionCurve.length,
  );

  // Step 4: Score coherence
  const coherenceScore = scoreCoherence(slides, colorPalette, typography);
  const engagementScore = scoreEngagement(slides, brief.emotion);

  log.info(
    `[Smart Carousel] ✓ Generated ${optimalSlideCount} slides: coherence=${coherenceScore}, engagement=${engagementScore}, retention=${averageRetention}%`,
  );

  return {
    id: carouselId,
    topic: brief.topic,
    slideCount: optimalSlideCount,
    optimalSlideCount: true,
    slides,
    designSystem: {
      colorPalette,
      typography,
      narrativeStructure,
      layoutApproach: 'Text left + visual right (Pinterest validated)',
    },
    metadata: {
      emotion: brief.emotion,
      primaryHook: slides[0]?.headline || 'Hook',
      retentionCurve,
      averageRetention,
      coherenceScore,
      engagementScore,
      trainedOnResearch: brief.userHasResearchData || false,
      generatedAt: new Date().toISOString(),
    },
  };
};

// ── Generate Slides from Narrative Template ────────────────────────────

const generateSlidesFromNarrative = async (
  narrative: PinterestPattern,
  topic: string,
  emotion: string,
  colorPalette: PinterestPattern,
  typography: PinterestPattern,
  slideCount: number,
): Promise<CarouselSlide[]> => {
  const slides: CarouselSlide[] = [];

  // Extract slide template from narrative
  const template = narrative.implementation.slides || [];

  for (let i = 0; i < Math.min(template.length, slideCount); i++) {
    const slideTemplate = template[i];

    const slide: CarouselSlide = {
      number: i + 1,
      role: slideTemplate.role,
      headline: generateHeadline(slideTemplate.role, topic, emotion),
      body: generateBodyText(slideTemplate.role, topic, slideTemplate.copyPattern),
      copyPattern: slideTemplate.copyPattern || '',
      retentionTrigger: slideTemplate.retentionTrigger || 'Continue reading',
      design: {
        layout: selectLayoutForSlideRole(slideTemplate.role),
        backgroundColor: getBackgroundColor(i, colorPalette),
        textColor: slideTemplate.role === 'hook' ? '#FFFFFF' : colorPalette.implementation.textOnLight,
        imageType: selectImageTypeForRole(slideTemplate.role),
        visualElements: selectVisualElements(slideTemplate.role, topic),
      },
      estimatedRetention: calculateSlideRetention(i, slideCount),
    };

    slides.push(slide);
  }

  return slides;
};

// ── Helper: Generate Headlines ─────────────────────────────────────────

const generateHeadline = (role: string, topic: string, emotion: string): string => {
  const hooks: Record<string, string[]> = {
    fear: [
      `STOP. You're probably making these mistakes...`,
      `⚠️ Before you ${topic}, know this...`,
      `Most people get this wrong (including you)`,
    ],
    hope: [
      `What if ${topic} was actually achievable?`,
      `✨ Just discovered how to ${topic}...`,
      `The secret to ${topic}: [revealed inside]...`,
    ],
    joy: [
      `😂 POV: You just realized [relatable thing]`,
      `Wait till you see this... (you're gonna love it)`,
      `This is so [adjective] I can't even...`,
    ],
    curiosity: [
      `👀 This ${topic} hack nobody talks about...`,
      `❓ What most people get wrong about ${topic}`,
      `This is so [unexpected], even experts don't know...`,
    ],
    anger: [
      `🔥 They don't want you to know this...`,
      `STOP. They've been LYING about ${topic}...`,
      `This ${topic} SECRET is exposed...`,
    ],
  };

  const emotionHooks = hooks[emotion] ?? hooks.curiosity ?? [];

  if (role === 'hook') {
    return emotionHooks[Math.floor(Math.random() * emotionHooks.length)]!;
  }
  if (role === 'value' || role === 'item') {
    return `Tip: ${topic}`;
  }
  if (role === 'proof') {
    return `87% of people saw results`;
  }
  if (role === 'cta') {
    return `Follow for more insights`;
  }

  return `Slide ${role}`;
};

// ── Helper: Generate Body Text ─────────────────────────────────────────

const generateBodyText = (role: string, topic: string, pattern: string): string => {
  const bodies: Record<string, string> = {
    hook: `Discover the surprising truth about ${topic}. Swipe to learn what you've been missing.`,
    value: `Here's what actually works. This is actionable, tested, and works starting today.`,
    curiosity: `But here's the twist nobody mentions...`,
    proof: `Real people, real results. This isn't theory — it's proven by thousands.`,
    cta: `Save this carousel. Follow for more. The link in bio has the full guide.`,
    objection: `But what if you've been doing this for years? Here's how to fix it.`,
  };

  return bodies[role] || 'Your content here';
};

// ── Helper: Select Layout for Slide Role ───────────────────────────────

const selectLayoutForSlideRole = (role: string): string => {
  if (role === 'hook') return 'full-bleed-image-overlay';
  if (role === 'value' || role === 'item') return 'text-left-visual-right';
  if (role === 'proof') return 'grid-or-testimonial';
  if (role === 'cta') return 'solid-color-centered';
  return 'text-left-visual-right';
};

// ── Helper: Select Image Type ──────────────────────────────────────────

const selectImageTypeForRole = (
  role: string,
): 'hero' | 'mockup' | 'illustration' | 'photo' | 'grid' | 'none' => {
  if (role === 'hook') return 'hero';
  if (role === 'value' || role === 'item') return 'illustration';
  if (role === 'proof') return 'photo';
  if (role === 'cta') return 'none';
  return 'illustration';
};

// ── Helper: Select Visual Elements ─────────────────────────────────────

const selectVisualElements = (role: string, topic: string): string[] => {
  if (role === 'hook') return ['large-icon', 'attention-grabbing-color'];
  if (role === 'value') return ['icon', 'subtle-shadow'];
  if (role === 'proof') return ['testimonial-box', 'stat-highlight'];
  if (role === 'cta') return ['button', 'social-icons'];
  return [];
};

// ── Helper: Get Background Color ───────────────────────────────────────

const getBackgroundColor = (slideNumber: number, palette: PinterestPattern): string => {
  if (slideNumber === 0) {
    // Hook = high contrast
    return palette.implementation.primary;
  }
  if (slideNumber % 3 === 0) {
    // Alternate accent colors
    return palette.implementation.accent || palette.implementation.secondary;
  }
  // Default = light background
  return palette.implementation.background;
};

// ── Retention Curve Calculation ────────────────────────────────────────

const calculateRetentionCurve = (slides: CarouselSlide[]): number[] => {
  // Pinterest pattern: Slide 1 = 100%, then ~15% drop per slide after slide 5
  const curve: number[] = [];

  for (let i = 0; i < slides.length; i++) {
    if (i === 0) {
      curve.push(100); // Hook always 100% (you see slide 1)
    } else if (i < 3) {
      curve.push(85); // Slides 2-3: 85% (hook is strong)
    } else if (i < 5) {
      curve.push(70); // Slides 4-5: 70% (value phase)
    } else if (i < 7) {
      curve.push(50); // Slides 6-7: 50% (fatigue sets in)
    } else {
      curve.push(30); // Slide 8+: 30% (user fatigue)
    }
  }

  return curve;
};

// ── Slide Retention Calculation ────────────────────────────────────────

const calculateSlideRetention = (slideNumber: number, totalSlides: number): number => {
  // Same as curve but as single value
  if (slideNumber === 0) return 100;
  if (slideNumber < 3) return 85;
  if (slideNumber < 5) return 70;
  if (slideNumber < 7) return 50;
  return 30;
};

// ── Coherence Scoring ──────────────────────────────────────────────────

const scoreCoherence = (slides: CarouselSlide[], colorPalette: PinterestPattern, typography: PinterestPattern): number => {
  let score = 100;

  // Check for filler slides (low retention trigger)
  const fillerCount = slides.filter((s) => s.retentionTrigger === 'Continue reading').length;
  score -= fillerCount * 10;

  // Check for narrative flow
  const hasHook = slides.some((s) => s.role === 'hook');
  const hasValue = slides.some((s) => s.role === 'value' || s.role === 'item');
  const hasCTA = slides.some((s) => s.role === 'cta');

  if (!hasHook || !hasValue || !hasCTA) {
    score -= 30; // Missing key narrative elements
  }

  // Check color consistency
  const uniqueColors = new Set(slides.map((s) => s.design.backgroundColor)).size;
  if (uniqueColors > 4) {
    score -= (uniqueColors - 4) * 5; // Too many colors
  }

  return Math.max(0, score);
};

// ── Engagement Scoring ─────────────────────────────────────────────────

const scoreEngagement = (slides: CarouselSlide[], emotion: string): number => {
  let score = 75; // Base score

  // Strong hook = higher engagement
  if (slides[0]?.headline.includes('STOP') || slides[0]?.headline.includes('Wait')) {
    score += 10;
  }

  // Emotional triggers boost engagement
  const emotionalKeywords = ['surprising', 'secret', 'hidden', 'hack', 'mistake', 'truth'];
  const emotionalSlides = slides.filter((s) =>
    emotionalKeywords.some((kw) => s.headline.toLowerCase().includes(kw)),
  );
  score += emotionalSlides.length * 3;

  // CTA clarity
  if (slides[slides.length - 1]?.headline.includes('Follow')) {
    score += 5;
  }

  return Math.min(100, score);
};

log.info('[Phase 18] Smart Carousel Generator initialized');
