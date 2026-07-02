/**
 * Phase 26: Pattern-Based Carousel Engine
 *
 * Generates carousels using inverted patterns, storytelling, and cross-format support
 * - Inverted carousel patterns (punchline first)
 * - Advanced message patterns (before-during-after, misconception flip, etc.)
 * - Cross-format storytelling (video, carousel, reel, story, post)
 * - Platform-specific timing and recommendations
 */

import { log } from '../../agent/logger.js';

export interface CarouselBriefPhase26 {
  userId: string;
  patternType: 'inverted' | 'advancedMessage' | 'storytelling';
  patternName: string;
  industry: string;
  messaging?: string;
  format: 'carousel' | 'reel' | 'story' | 'tiktok' | 'email' | 'linkedin' | 'post';
  language?: 'es' | 'en' | 'pt';
  targetAudience?: string;
  tone?: 'professional' | 'playful' | 'educational' | 'motivational';
}

export interface GeneratedCarouselPhase26 {
  id: string;
  userId: string;
  pattern: {
    type: 'inverted' | 'advancedMessage' | 'storytelling';
    name: string;
    category: string;
  };
  industry: string;
  format: string;
  slides: CarouselSlidePhase26[];
  metadata: {
    structure: string;
    psychology: string;
    shareability: string;
    platformRecommendations: string[];
    generatedAt: string;
    version: 'Phase26';
  };
  contentBrief: string;
  nextSteps: string[];
}

export interface CarouselSlidePhase26 {
  number: number;
  role: string;
  headline: string;
  body: string;
  visualGuidance: string;
  copyTone: string;
  emotionTrigger: string;
  retentionMechanic: string;
}

// ── PATTERN TEMPLATES ────────────────────────────────────────────────────

const patternTemplates = {
  // Inverted Patterns
  productWontPattern: {
    slides: [
      {
        role: 'Punchline',
        headline: '[PRODUCT] won\'t [SOLVE PROBLEM]',
        body: 'Provocative statement that stops scroll',
        copyTone: 'Humorous, bold, eye-catching',
        emotionTrigger: 'Curiosity, contradiction'
      },
      {
        role: 'Error ID',
        headline: 'EL ERROR: [PRODUCT] = [FALSE SOLUTION]',
        body: 'Name the false belief explicitly',
        copyTone: 'Direct, validating frustration',
        emotionTrigger: 'Recognition, "they see my pain"'
      },
      {
        role: 'Proof',
        headline: 'Formulas: + [X] ≠ + [Y]',
        body: 'Multiple equations debunking myth',
        copyTone: 'Data-driven, logical',
        emotionTrigger: 'Credibility, understanding'
      },
      {
        role: 'System',
        headline: 'NECESITAS UN SISTEMA',
        body: 'Puzzle pieces showing what DOES work',
        copyTone: 'Explanatory, comprehensive',
        emotionTrigger: 'Clarity, hope'
      },
      {
        role: 'Wisdom',
        headline: 'Tu [PRODUCT] es [ROLE], no [WRONG ROLE]',
        body: 'Permission to use correctly within system',
        copyTone: 'Wise, empowering',
        emotionTrigger: 'Empowerment, understanding'
      }
    ],
    psychology: 'Punchline first stops scroll. Reverse-reading forces engagement. Shareability high.',
    shareability: 'Slide 1 (meme) + Slide 5 (quote) both independently shareable'
  },

  // Advanced Message Patterns
  beforeDuringAfter: {
    slides: [
      {
        role: 'Before',
        headline: 'Así estabas...',
        body: 'Show problem state, frustration, stuckness',
        copyTone: 'Relatable, validating pain',
        emotionTrigger: 'Recognition of struggle'
      },
      {
        role: 'During1',
        headline: 'Hasta que descubriste...',
        body: 'The realization or decision point',
        copyTone: 'Hopeful, turning point',
        emotionTrigger: 'Hope mixed with effort'
      },
      {
        role: 'During2',
        headline: 'Entonces comenzaste...',
        body: 'Steps, effort, small wins along journey',
        copyTone: 'Narrative progression',
        emotionTrigger: 'Momentum, progress'
      },
      {
        role: 'During3',
        headline: 'Y aprendiste que...',
        body: 'Key insight from process',
        copyTone: 'Wisdom from struggle',
        emotionTrigger: 'Learning, growth'
      },
      {
        role: 'After',
        headline: 'Ahora eres...',
        body: 'Transformation complete, new reality',
        copyTone: 'Celebratory, aspirational',
        emotionTrigger: 'Joy, pride, invitation'
      }
    ],
    psychology: 'Emotional arc forces completion. Relatability high.',
    shareability: 'Before/After extremely shareable'
  },

  misconceptionFlip: {
    slides: [
      {
        role: 'False Belief',
        headline: 'Siempre creíste que [FALSE BELIEF]',
        body: 'State common misconception',
        copyTone: 'Validating, understanding',
        emotionTrigger: 'Recognition'
      },
      {
        role: 'Origin',
        headline: 'Porque toda tu vida te dijeron...',
        body: 'Where belief comes from (family, media, culture)',
        copyTone: 'Empathetic explanation',
        emotionTrigger: 'Understanding root cause'
      },
      {
        role: 'Trap',
        headline: 'Y eso te atrapó en...',
        body: 'Consequences of false belief',
        copyTone: 'Reality check, costs shown',
        emotionTrigger: 'Concern, motivation to change'
      },
      {
        role: 'Reality',
        headline: 'La verdad real es [TRUTH]',
        body: 'What\'s actually true (evidence/proof)',
        copyTone: 'Truth-telling, authoritative',
        emotionTrigger: 'Enlightenment, clarity'
      },
      {
        role: 'NewPath',
        headline: 'Cuando empezaste a creer que...',
        body: 'New belief and what\'s possible',
        copyTone: 'Empowering, forward-looking',
        emotionTrigger: 'Permission to change'
      }
    ],
    psychology: 'Personal revelation = high engagement',
    shareability: '"I believed this too" moment'
  }
};

// ── CAROUSEL GENERATION ──────────────────────────────────────────────────

export const generateCarouselPhase26 = (brief: CarouselBriefPhase26): GeneratedCarouselPhase26 => {
  log.info(`[Phase 26] Generating carousel: ${brief.patternName} for ${brief.industry}`);

  const template = (patternTemplates as any)[brief.patternName];

  if (!template) {
    throw new Error(`Pattern ${brief.patternName} not found`);
  }

  const slides: CarouselSlidePhase26[] = template.slides.map((slide: any, idx: number) => ({
    number: idx + 1,
    role: slide.role,
    headline: slide.headline,
    body: slide.body,
    visualGuidance: getVisualGuidance(brief.industry, slide.role),
    copyTone: slide.copyTone,
    emotionTrigger: slide.emotionTrigger,
    retentionMechanic: getRetentionMechanic(slide.role, brief.patternName)
  }));

  const carousel: GeneratedCarouselPhase26 = {
    id: `carousel-${Date.now()}`,
    userId: brief.userId,
    pattern: {
      type: brief.patternType,
      name: brief.patternName,
      category: brief.patternType
    },
    industry: brief.industry,
    format: brief.format,
    slides,
    metadata: {
      structure: template.slides.map((s: any) => s.role).join(' → '),
      psychology: template.psychology,
      shareability: template.shareability,
      platformRecommendations: getPlatformRecommendations(brief.format),
      generatedAt: new Date().toISOString(),
      version: 'Phase26'
    },
    contentBrief: generateContentBrief(brief, slides),
    nextSteps: [
      'Fill headline gaps with specific [INDUSTRY/PRODUCT] references',
      'Generate visual assets per slide guidance',
      'Write copy for each slide body',
      'Validate retention mechanics',
      'Test platform-specific timing'
    ]
  };

  return carousel;
};

// ── HELPER FUNCTIONS ────────────────────────────────────────────────────

const getVisualGuidance = (industry: string, role: string): string => {
  const industryVisuals: Record<string, Record<string, string>> = {
    'fitness': {
      'Before': 'Person in gym before transformation',
      'During': 'Process montage with effort shown',
      'After': 'Fit person celebrating result'
    },
    'business': {
      'Punchline': 'Bold typography + professional setting',
      'Error ID': 'Frustrated person at desk',
      'Proof': 'Data visualization + charts',
      'System': 'Puzzle pieces showing integration'
    },
    'education': {
      'Before': 'Confused student',
      'During': 'Learning journey with books/resources',
      'After': 'Confident expert'
    }
  };

  return industryVisuals[industry]?.[role] || `Visual relevant to ${role} in ${industry}`;
};

const getRetentionMechanic = (role: string, pattern: string): string => {
  const mechanics: Record<string, string> = {
    'Punchline': 'Bold statement creates curiosity → forces next slide swipe',
    'Error ID': 'Validation triggers emotional connection → audience feels understood',
    'Proof': 'Data + logic build credibility → audience believes claim',
    'System': 'Complexity simplified → audience sees path forward',
    'Wisdom': 'Permission granted → audience feels empowered to act'
  };

  return mechanics[role] || 'Escalating engagement';
};

const getPlatformRecommendations = (format: string): string[] => {
  const recommendations: Record<string, string[]> = {
    'carousel': ['Instagram Carousel (5+ slides)', 'LinkedIn carousel', 'Pinterest pins'],
    'reel': ['Instagram Reel (15-60s)', 'TikTok', 'YouTube Shorts'],
    'story': ['Instagram Stories (4-5 frames)', 'WhatsApp Status'],
    'tiktok': ['TikTok', 'Instagram Reel', 'YouTube Shorts'],
    'email': ['Email marketing campaign', 'Newsletter series'],
    'linkedin': ['LinkedIn post', 'LinkedIn carousel'],
    'post': ['Instagram Feed post', 'Facebook post', 'LinkedIn post']
  };

  return recommendations[format] || ['Multi-platform'];
};

const generateContentBrief = (brief: CarouselBriefPhase26, slides: CarouselSlidePhase26[]): string => {
  return `
Generate ${brief.format} carousel for ${brief.industry} using ${brief.patternName} pattern:

PATTERN STRUCTURE: ${slides.map(s => s.role).join(' → ')}

SLIDES TO CREATE:
${slides.map((s, idx) => `
Slide ${s.number}: ${s.role}
- Headline: ${s.headline}
- Tone: ${s.copyTone}
- Emotion: ${s.emotionTrigger}
- Mechanics: ${s.retentionMechanic}
`).join('')}

INDUSTRY: ${brief.industry}
FORMAT: ${brief.format}
LANGUAGE: ${brief.language || 'English'}
TONE: ${brief.tone || 'Professional'}

Create compelling, conversion-focused content following this structure.
Make each slide build on previous. Maintain coherent narrative.
`;
};

// ── BATCH GENERATION ────────────────────────────────────────────────────

export const generateMultipleCarousels = (
  briefs: CarouselBriefPhase26[]
): GeneratedCarouselPhase26[] => {
  log.info(`[Phase 26] Batch generating ${briefs.length} carousels`);

  return briefs.map(brief => {
    try {
      return generateCarouselPhase26(brief);
    } catch (error) {
      log.error(`[Phase 26] Failed to generate carousel: ${error}`);
      throw error;
    }
  });
};

log.info('[Phase 26] Pattern-Based Carousel Engine ✅ (Inverted + Advanced + Storytelling)');
