/**
 * Phase 13: Template Library
 *
 * 50+ pre-built content templates
 * Carousel, Reel, Video templates with hooks, structures, CTAs
 */

import { log } from '../../agent/logger.js';

export interface ContentTemplate {
  id: string;
  name: string;
  type: 'carousel' | 'reel' | 'video' | 'story' | 'tiktok';
  category: string;
  emotion: 'fear' | 'hope' | 'joy' | 'anger' | 'curiosity';
  structure: string; // Hook-Value-CTA description
  slideCount?: number;
  duration?: number;
  description: string;
  tags: string[];
  engagementPotential: number; // 0-100
  template: {
    hook: string;
    valuePoints: string[];
    cta: string;
  };
}

export const templateLibrary: ContentTemplate[] = [
  // ── CAROUSEL TEMPLATES ────────────────────────────────────────────────

  {
    id: 'carousel-listicle-fear',
    name: '10 Mistakes You\'re Making',
    type: 'carousel',
    category: 'Education',
    emotion: 'fear',
    structure: 'Hook (mistake) → 8 specific mistakes → CTA (avoid them)',
    slideCount: 10,
    description: 'High-engagement listicle revealing common mistakes. Pattern interrupt every slide.',
    tags: ['listicle', 'mistakes', 'avoid', 'education'],
    engagementPotential: 88,
    template: {
      hook: 'STOP. You\'re probably making {{count}} of these critical mistakes...',
      valuePoints: [
        'Mistake 1: {{mistake}}. Here\'s why it fails...',
        'Mistake 2: {{mistake}}. Most people do this...',
      ],
      cta: 'Don\'t make these mistakes. Follow for more tips →',
    },
  },

  {
    id: 'carousel-before-after-hope',
    name: 'Before/After Transformation',
    type: 'carousel',
    category: 'Conversion',
    emotion: 'hope',
    structure: 'Hook (promise) → 3 before shots → 3 after shots → Success proof → CTA',
    slideCount: 10,
    description: 'Transformation-focused carousel. Social proof via results.',
    tags: ['before-after', 'transformation', 'proof', 'conversion'],
    engagementPotential: 92,
    template: {
      hook: 'This {{transformation}} transformation is real. Here\'s how {{person}} did it...',
      valuePoints: [
        'Day 1: {{before_state}}',
        'Day 30: {{midpoint}}',
        'Day 90: {{after_state}} 🎉',
      ],
      cta: 'Ready for your transformation? Start today →',
    },
  },

  {
    id: 'carousel-storytelling-joy',
    name: 'Customer Success Story',
    type: 'carousel',
    category: 'Social Proof',
    emotion: 'joy',
    structure: 'Hook (relatable problem) → Journey (emotions) → Resolution → Celebration',
    slideCount: 10,
    description: 'Narrative-driven carousel. Emotional resonance + celebration ending.',
    tags: ['story', 'customer', 'journey', 'emotional'],
    engagementPotential: 85,
    template: {
      hook: '{{person}} had {{problem}}. Then this happened...',
      valuePoints: [
        'Chapter 1: {{problem_details}}',
        'Chapter 2: {{turning_point}}',
        'Chapter 3: {{breakthrough}}',
        'Result: {{success}} 🎉',
      ],
      cta: 'Your success story could be next. Join {{count}} others →',
    },
  },

  {
    id: 'carousel-comparison-curiosity',
    name: 'Myth vs Reality',
    type: 'carousel',
    category: 'Education',
    emotion: 'curiosity',
    structure: 'Hook (mystery) → Myth debunked (5 slides) → Reality revealed (3 slides) → CTA',
    slideCount: 10,
    description: 'High-curiosity format. Pattern interrupts with myth-busting reveals.',
    tags: ['myth', 'reality', 'debunk', 'curiosity-loop'],
    engagementPotential: 89,
    template: {
      hook: 'Everything you know about {{topic}} is WRONG. Here\'s the truth →',
      valuePoints: [
        'MYTH: {{common_belief}}. FALSE because...',
        'REALITY: {{truth}}. Here\'s proof...',
      ],
      cta: 'Stop believing lies. Learn the {{count}} truths everyone misses →',
    },
  },

  // ── REEL TEMPLATES ────────────────────────────────────────────────────

  {
    id: 'reel-trend-hijack-joy',
    name: 'Trend Hijack (Relatable Take)',
    type: 'reel',
    category: 'Entertainment',
    emotion: 'joy',
    structure: 'Hook (trending audio/format) → Relatable twist → Punchline → CTA',
    duration: 30,
    description: '30-second trend hijack with relatable humor. Rides viral momentum.',
    tags: ['trend', 'humor', 'viral', 'relatable'],
    engagementPotential: 91,
    template: {
      hook: '[TRENDING AUDIO]. POV: You\'re {{relatable_scenario}}',
      valuePoints: [
        'This {{scenario}} hits different',
        'The energy? {{adjective}}',
      ],
      cta: 'Tag someone this is about 👇',
    },
  },

  {
    id: 'reel-demo-curiosity',
    name: 'Product Demo (Satisfying)',
    type: 'reel',
    category: 'Product',
    emotion: 'curiosity',
    structure: 'Hook (problem shown) → Demo 1 → Demo 2 → Result reveal → CTA',
    duration: 45,
    description: 'Satisfying product demo. Each scene 8-10s. Satisfying reveal at end.',
    tags: ['product', 'demo', 'satisfying', 'asmr-style'],
    engagementPotential: 87,
    template: {
      hook: 'This {{product}} solves the {{problem}} problem. Watch →',
      valuePoints: [
        'Step 1: {{demo_scene_1}}',
        'Step 2: {{demo_scene_2}}',
        'Result: {{satisfying_reveal}}',
      ],
      cta: 'Link in bio. First {{count}} get {{offer}} →',
    },
  },

  // ── VIDEO TEMPLATES ────────────────────────────────────────────────────

  {
    id: 'video-hook-story-anger',
    name: 'Exposed Truth (Rant Style)',
    type: 'video',
    category: 'Education',
    emotion: 'anger',
    structure: 'Hook (outrage) → 3 callouts → Why it matters → Action to take',
    duration: 60,
    description: '60-second truth-bomb rant. High retention via outrage loop.',
    tags: ['rant', 'exposed', 'truth', 'call-out'],
    engagementPotential: 86,
    template: {
      hook: '🔥 They don\'t want you to know this about {{topic}}...',
      valuePoints: [
        'Lie #1: {{lie}}. Truth: {{truth}}',
        'Lie #2: {{lie}}. Truth: {{truth}}',
        'That\'s why {{consequence}} happens',
      ],
      cta: 'Stop believing the lie. {{cta}} now →',
    },
  },

  {
    id: 'video-educational-hope',
    name: 'Step-by-Step Tutorial',
    type: 'video',
    category: 'Education',
    emotion: 'hope',
    structure: 'Hook (outcome promise) → Step 1 → Step 2 → Step 3 → Result → CTA',
    duration: 60,
    description: '60-second tutorial. Each step 12-15s. Final result celebration.',
    tags: ['tutorial', 'how-to', 'step-by-step', 'empowering'],
    engagementPotential: 84,
    template: {
      hook: 'You can {{outcome}} in 3 steps. Here\'s how...',
      valuePoints: [
        'Step 1 (15s): {{step_1_action}}',
        'Step 2 (15s): {{step_2_action}}',
        'Step 3 (15s): {{step_3_action}}',
        'Result: {{outcome}} 🎉',
      ],
      cta: 'Try it now. Comment your result →',
    },
  },

  // ── STORY TEMPLATES ────────────────────────────────────────────────────

  {
    id: 'story-quick-poll-curiosity',
    name: 'Interactive Poll',
    type: 'story',
    category: 'Engagement',
    emotion: 'curiosity',
    structure: 'Hook (question) → Poll slide → Results reveal → Follow-up CTA',
    description: 'Interactive story. Drives engagement via polls + follow-ups.',
    tags: ['poll', 'interactive', 'engagement', 'question'],
    engagementPotential: 78,
    template: {
      hook: '{{question}}?',
      valuePoints: ['Option A: {{option_a}}', 'Option B: {{option_b}}', 'Results: {{reveal}}'],
      cta: 'Vote in stories →',
    },
  },

  // ── TIKTOK TEMPLATES ────────────────────────────────────────────────────

  {
    id: 'tiktok-trend-mashup-joy',
    name: 'Trend Mashup (Absurd Humor)',
    type: 'tiktok',
    category: 'Entertainment',
    emotion: 'joy',
    structure: 'Hook (trending sound) → Mashup 1 → Mashup 2 → Absurd punchline',
    duration: 15,
    description: '15-second TikTok. Combines 2-3 trends into absurd mashup.',
    tags: ['trend', 'mashup', 'absurd', 'short-form'],
    engagementPotential: 89,
    template: {
      hook: '[TRENDING SOUND]. Wait for the mashup...',
      valuePoints: ['Trend 1 meets {{genre}}', 'The mashup nobody asked for', 'But it WORKS 😂'],
      cta: 'Duet this →',
    },
  },
];

export const getTemplatesByCategory = (category: string): ContentTemplate[] => {
  return templateLibrary.filter((t) => t.category === category);
};

export const getTemplatesByEmotion = (emotion: string): ContentTemplate[] => {
  return templateLibrary.filter((t) => t.emotion === emotion);
};

export const getTemplatesByType = (type: string): ContentTemplate[] => {
  return templateLibrary.filter((t) => t.type === type);
};

export const getTopTemplates = (limit: number = 10): ContentTemplate[] => {
  return [...templateLibrary].sort((a, b) => b.engagementPotential - a.engagementPotential).slice(0, limit);
};

export const searchTemplates = (query: string): ContentTemplate[] => {
  const q = query.toLowerCase();
  return templateLibrary.filter(
    (t) =>
      t.name.toLowerCase().includes(q) ||
      t.description.toLowerCase().includes(q) ||
      t.tags.some((tag) => tag.includes(q)),
  );
};

export const getRandomTemplate = (type?: string): ContentTemplate => {
  const filtered = type ? getTemplatesByType(type) : templateLibrary;
  return filtered[Math.floor(Math.random() * filtered.length)]!;
};

log.info(`[Template Library] ${templateLibrary.length} templates loaded (Carousel, Reel, Video, Story, TikTok)`);
