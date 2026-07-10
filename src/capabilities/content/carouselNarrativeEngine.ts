/**
 * Carousel Narrative Engine
 *
 * Controla hilo conductor + retención por slide
 * Variables slide count (3-10) based on story strength
 * Valida desarrollo coherente + no filler
 */

import { log } from '../../agent/logger.js';

export type SlideRole =
  | 'hook'
  | 'curiosity-build'
  | 'value-1'
  | 'value-2'
  | 'value-3'
  | 'proof'
  | 'objection-handler'
  | 'cta-setup'
  | 'cta-urgent'
  | 'retention';

export interface NarrativeSlide {
  number: number;
  role: SlideRole;
  purpose: string; // Why this slide exists
  copy: string;
  progression: string; // How does this advance the story?
  retentionTrigger?: string; // What makes them swipe to next?
  design: {
    backgroundStyle: string;
    typography: string;
    calloutElement: string;
  };
}

export interface CarouselNarrative {
  topic: string;
  slideCount: number; // 3-10
  narrative: NarrativeSlide[];
  narrativeStrength: number; // 0-100 (coherence + flow)
  estimatedRetention: number; // Expected % reaching last slide
  issues: string[];
  recommendations: string[];
}

// ── Narrative patterns ────────────────────────────────────────────

export const narrativePatterns: Record<number, SlideRole[]> = {
  // 3-slide minimum: Hook + Value + CTA
  3: ['hook', 'value-1', 'cta-urgent'],

  // 4-slide: Hook + Value + Proof + CTA
  4: ['hook', 'value-1', 'proof', 'cta-urgent'],

  // 5-slide: Hook + 2 Values + Proof + CTA
  5: ['hook', 'value-1', 'value-2', 'proof', 'cta-urgent'],

  // 6-slide: Hook + Curiosity + 2 Values + Proof + CTA
  6: ['hook', 'curiosity-build', 'value-1', 'value-2', 'proof', 'cta-urgent'],

  // 7-slide: Hook + Curiosity + 3 Values + Proof + CTA
  7: [
    'hook',
    'curiosity-build',
    'value-1',
    'value-2',
    'value-3',
    'proof',
    'cta-urgent',
  ],

  // 8-slide: Hook + Curiosity + 3 Values + Objection + Proof + CTA
  8: [
    'hook',
    'curiosity-build',
    'value-1',
    'value-2',
    'value-3',
    'objection-handler',
    'proof',
    'cta-urgent',
  ],

  // 9-slide: Hook + Curiosity + 3 Values + Objection + Proof + CTA + Retention
  9: [
    'hook',
    'curiosity-build',
    'value-1',
    'value-2',
    'value-3',
    'objection-handler',
    'proof',
    'cta-setup',
    'cta-urgent',
  ],

  // 10-slide: Only if STRONG narrative. Hook + Curiosity + 3 Values + 2 Proofs + Objection + CTA
  10: [
    'hook',
    'curiosity-build',
    'value-1',
    'value-2',
    'value-3',
    'objection-handler',
    'proof',
    'proof', // Second proof if story demands
    'cta-setup',
    'cta-urgent',
  ],
};

// ── Slide progression rules ────────────────────────────────────────

export const slideRolePurpose: Record<SlideRole, {purpose: string; copyPattern: string; retentionRule: string}> = {
  hook: {
    purpose: 'Stop scroll. Pattern interrupt. Establish relevance.',
    copyPattern: 'Question OR Controversial statement OR Social proof OR Curiosity loop',
    retentionRule: 'Must make them NEED next slide. No scroll below.',
  },
  'curiosity-build': {
    purpose: 'Deepen curiosity. Hint at solution. Create tension.',
    copyPattern: 'Revelation OR Contrast (what people think vs. reality) OR Setup for payoff',
    retentionRule: 'Promise value is coming. "Here\'s what nobody knows..."',
  },
  'value-1': {
    purpose: 'Deliver first promised value. Proof concept works.',
    copyPattern: 'First lesson OR First tip OR First principle with example',
    retentionRule: 'Show quick win. Tangible. "You can implement this today."',
  },
  'value-2': {
    purpose: 'Second value. Build momentum. Vary format (visual or copy style).',
    copyPattern: 'Second lesson OR Deeper principle OR Different angle on problem',
    retentionRule: 'Escalate value. "Gets even better..." or "Most miss this..."',
  },
  'value-3': {
    purpose: 'Third value or bonus. Rare/secret knowledge. Premium feel.',
    copyPattern: 'Advanced tip OR Secret nobody mentions OR Shortcut',
    retentionRule: 'Feel like insider knowledge. Rare. Valuable.',
  },
  proof: {
    purpose: 'Social proof. Credibility. Real results.',
    copyPattern: 'Testimonial OR Case study OR Stat OR Before-after',
    retentionRule: 'Make promise BELIEVABLE. "Others got results..."',
  },
  'objection-handler': {
    purpose: 'Address common objection. "But what about..." handling.',
    copyPattern: 'Common objection + reframe OR Myth-busting OR Limitation → Solution',
    retentionRule: 'Remove hesitation. "This is a concern, but actually..."',
  },
  'cta-setup': {
    purpose: 'Plant hook for CTA. Create urgency or desire.',
    copyPattern: 'Result promise + "Here\'s how..." OR Pain reversal + solution hint',
    retentionRule: 'Build anticipation. "Ready to..." or "Only X spots..."',
  },
  'cta-urgent': {
    purpose: 'Clear call-to-action. Remove friction. Drive conversion.',
    copyPattern: 'Direct ask + benefit + deadline OR Link + offer + scarcity',
    retentionRule: 'Make action obvious. No ambiguity.',
  },
  retention: {
    purpose: 'Last slide. Follow/subscribe call. Content hint.',
    copyPattern: '"More like this..." + Follow CTA + Preview next topic',
    retentionRule: 'Lock in follow. Hint at series.',
  },
};

// ── Generate narrative ────────────────────────────────────────────

export const generateCarouselNarrative = (
  topic: string,
  emotion: string,
  autoSlideCount: boolean = true, // Auto-determine or user-set?
): CarouselNarrative => {
  log.info(`[Narrative] Building carousel: ${topic} (emotion: ${emotion})`);

  // Determine slide count based on story strength
  const recommendedCount = autoSlideCount ? determineSlideCount(topic, emotion) : 7; // Default 7
  const roleSequence = narrativePatterns[recommendedCount] ?? narrativePatterns[7]!;

  const slides: NarrativeSlide[] = roleSequence.map((role, idx) => ({
    number: idx + 1,
    role,
    purpose: slideRolePurpose[role].purpose,
    copy: `[${role.toUpperCase()}] ${slideRolePurpose[role].copyPattern}`,
    progression: `Advances story toward conversion. ${slideRolePurpose[role].retentionRule}`,
    retentionTrigger: selectRetentionTrigger(role, idx, roleSequence.length),
    design: {
      backgroundStyle: selectBackgroundForRole(role),
      typography: selectTypographyForRole(role, idx, emotion),
      calloutElement: selectCalloutForRole(role),
    },
  }));

  // Validate narrative coherence
  const issues = validateNarrativeCoherence(slides, topic);
  const recommendations = generateNarrativeRecommendations(slides, issues);
  const strength = calculateNarrativeStrength(slides, issues);
  const retention = estimateRetention(slides);

  log.info(`[Narrative] Strength: ${strength}/100. Estimated retention: ${retention}%`);

  return {
    topic,
    slideCount: recommendedCount,
    narrative: slides,
    narrativeStrength: strength,
    estimatedRetention: retention,
    issues,
    recommendations,
  };
};

const determineSlideCount = (_topic: string, emotion: string): number => {
  // Logic: emotion-driven + story complexity
  const emotionToCount: Record<string, number> = {
    fear: 7, // Fear needs proof
    hope: 6, // Hope is simple
    joy: 5, // Joy is short
    anger: 7, // Anger needs explanation
    curiosity: 8, // Curiosity can sustain longer
  };

  return emotionToCount[emotion] || 7;
};

const selectRetentionTrigger = (role: SlideRole, _idx: number, total: number): string => {
  const triggers: Record<SlideRole, string> = {
    hook: 'Pattern interrupt. "Wait, this changes everything..."',
    'curiosity-build': 'Mystery. "But here\'s the twist..."',
    'value-1': 'Quick win. "You can do this today."',
    'value-2': 'Escalation. "Gets better..."',
    'value-3': 'Insider knowledge. "The secret is..."',
    proof: 'Credibility. "Real person got X result."',
    'objection-handler': 'Reframe. "That concern is actually..."',
    'cta-setup': 'Anticipation. "Ready to transform?"',
    'cta-urgent': 'Action. "Link in bio" or "DM now"',
    retention: 'Series. "More like this every week."',
  };

  return triggers[role];
};

const selectBackgroundForRole = (role: SlideRole): string => {
  if (role === 'hook') return 'hero-image-full-bleed';
  if (role === 'curiosity-build') return 'gradient-bold';
  if (role.includes('value')) return 'image-text-overlay';
  if (role === 'proof') return 'testimonial-bg';
  if (role.includes('cta')) return 'solid-accent-color';
  return 'neutral-subtle';
};

const selectTypographyForRole = (role: SlideRole, _idx: number, emotion: string): string => {
  if (role === 'hook') return emotion === 'fear' ? 'Bold serif (Playfair)' : 'Bold sans (Poppins)';
  if (role.includes('value')) return 'Medium sans (Montserrat)';
  if (role === 'proof') return 'Light serif (Lora)';
  return 'Bold sans (Poppins)';
};

const selectCalloutForRole = (role: SlideRole): string => {
  if (role === 'hook') return '⚡ or 🔥 or ❓ (emotion-dependent)';
  if (role.includes('value')) return '✅ or 💡 (checkmark or lightbulb)';
  if (role === 'proof') return '⭐ (star for testimonial)';
  if (role.includes('cta')) return '→ (arrow) or 🎯 (target)';
  return '';
};

const validateNarrativeCoherence = (slides: NarrativeSlide[], _topic: string): string[] => {
  const issues: string[] = [];

  // Must start with hook
  if (slides[0]?.role !== 'hook') {
    issues.push('Slide 1 must be hook. Attention is first.');
  }

  // Must end with CTA
  if (!slides[slides.length - 1]?.role?.includes('cta')) {
    issues.push('Last slide must be CTA. No wasted real estate.');
  }

  // Value slides before proof
  const proofIdx = slides.findIndex((s) => s.role === 'proof');
  const valueIdx = slides.findIndex((s) => s.role.includes('value'));
  if (proofIdx > -1 && valueIdx > -1 && valueIdx > proofIdx) {
    issues.push('Value should come BEFORE proof. Build credibility.');
  }

  // Max 3 value slides
  const valueCount = slides.filter((s) => s.role.includes('value')).length;
  if (valueCount > 3) {
    issues.push('Max 3 value slides. More is filler.');
  }

  return issues;
};

const generateNarrativeRecommendations = (slides: NarrativeSlide[], _issues: string[]): string[] => {
  return [
    'Each slide must answer: "Why should I swipe to next?" If no answer = delete slide.',
    'Vary copy style: Headline-heavy, image-heavy, data-heavy slides alternating.',
    `Total flow: Hook (stop) → Curiosity (build) → Value (deliver) → Proof (believe) → CTA (act).`,
    'No filler slides. Every slide earns its real estate.',
  ];
};

const calculateNarrativeStrength = (slides: NarrativeSlide[], issues: string[]): number => {
  let score = 90;

  // Deduct for structure issues
  score -= issues.length * 15;

  // Bonus for good progression
  if (slides.length >= 5 && slides.length <= 8) score += 10; // Sweet spot

  return Math.max(0, Math.min(100, score));
};

const estimateRetention = (slides: NarrativeSlide[]): number => {
  // Estimate: % of audience reaching last slide
  let retention = 100;

  slides.forEach((slide, idx) => {
    // Each weak retention trigger = 10% drop-off
    if (!slide.retentionTrigger) {
      retention -= 10;
    }

    // Late-carousel drop-off acceleration
    if (idx > 5) {
      retention *= 0.85; // 15% drop per slide after 5
    }
  });

  return Math.max(20, Math.min(100, Math.round(retention)));
};
