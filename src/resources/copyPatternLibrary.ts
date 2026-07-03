/**
 * Phase 34: Copy Pattern Intelligence
 *
 * Learns: headlines, captions, copy tone, CTAs, objections
 */

export interface CopyPattern {
  id: string;
  name: string;
  type: 'hook' | 'benefit' | 'education' | 'social-proof' | 'cta' | 'objection';
  industry?: string;
  tone: 'formal' | 'casual' | 'punchy' | 'intimate' | 'urgent' | 'aspirational';

  template: string; // with [VARIABLES]
  examples: string[];

  psychology: string;
  whenToUse: string;

  powerWords?: string[]; // words that work
  emotionTriggers?: string[];
}

export const copyPatterns: CopyPattern[] = [
  // HOOK PATTERNS
  {
    id: 'hook-challenge',
    name: 'Challenge Hook',
    type: 'hook',
    tone: 'punchy',
    template: 'Desafío [OBJECT] [OUTCOME]',
    examples: [
      'Desafío os límites',
      'Desafío os límites das trilhas',
      'Challenge yourself today'
    ],
    psychology: 'Activates competitive spirit, curiosity',
    whenToUse: 'First slide to stop scroll',
    powerWords: ['Desafío', 'Límites', 'Vence', 'Conquista'],
    emotionTriggers: ['empowerment', 'challenge']
  },
  {
    id: 'hook-promo',
    name: 'Promo Lead',
    type: 'hook',
    tone: 'urgent',
    template: '[OFFER] [URGENCY]',
    examples: [
      'Frete grátis agora',
      'Grab it Before It\'s Gone',
      'R$ 200,90 limitado'
    ],
    psychology: 'FOMO + value proposition',
    whenToUse: 'High-competition carousels needing immediate attention',
    powerWords: ['Grátis', 'Limitado', 'Agora', 'Antes'],
    emotionTriggers: ['urgency', 'value']
  },
  {
    id: 'hook-aspiration',
    name: 'Aspiration Hook',
    type: 'hook',
    tone: 'aspirational',
    template: '[DREAM] [ACTION] [BENEFIT]',
    examples: [
      'Pedale ao lado de quem você ama',
      'Explore the world on a bike',
      'Vive la adventure'
    ],
    psychology: 'Emotional connection to lifestyle desire',
    whenToUse: 'Lifestyle/dream-based campaigns',
    powerWords: ['Pedale', 'Explore', 'Vive', 'Descubre'],
    emotionTriggers: ['aspiration', 'belonging', 'adventure']
  },
  {
    id: 'hook-motivation',
    name: 'Motivation/Urgency Hook',
    type: 'hook',
    tone: 'urgent',
    template: '[ACTION_VERB] [BOLD_OUTCOME]',
    examples: [
      'START STRONG TRAIN STRONGER',
      'NO ONE CARES WORK HARDER',
      'Desafío os límites',
      'GREATNESS DOESN\'T TAKE BREAKS'
    ],
    psychology: 'Activates drive, competitive spirit, action bias',
    whenToUse: 'Fitness/motivation carousels, first slide hook',
    powerWords: ['START', 'TRAIN', 'STRONGER', 'WORK', 'HARDER', 'NO ONE', 'PUSH'],
    emotionTriggers: ['empowerment', 'urgency', 'challenge', 'pride']
  },
  {
    id: 'hook-numbered-list',
    name: 'Numbered Benefits Hook',
    type: 'hook',
    tone: 'punchy',
    template: '[NUMBER] [BENEFIT_TYPE] to [OUTCOME]',
    examples: [
      '4 Ways to GET THE MOST OUT OF YOUR WORKOUTS',
      '3 Reasons to TRAIN TOGETHER',
      '5 Tips para DOMINAR el gym'
    ],
    psychology: 'Curiosity + promise of structure/clarity',
    whenToUse: 'Multi-slide education carousels, numbered structure',
    powerWords: ['Ways', 'Reasons', 'Tips', 'Steps', 'Secrets'],
    emotionTriggers: ['curiosity', 'clarity', 'anticipation']
  },

  // EDUCATION PATTERNS
  {
    id: 'edu-list-benefits',
    name: 'Benefits List',
    type: 'education',
    tone: 'casual',
    template: '[NUMBER] [BENEFIT_TYPE] de [PRODUCT]\n✓ [BENEFIT1]\n✓ [BENEFIT2]\n✓ [BENEFIT3]\n✓ [BENEFIT4]',
    examples: [
      '4 beneficios de usar bicicleta',
      '7 razones para cambiar',
      '5 tips para mejorar'
    ],
    psychology: 'Scannable, credible, comprehensive',
    whenToUse: 'Slides 3-4 in carousel (post-hook, pre-proof)',
    powerWords: ['Beneficios', 'Motivos', 'Razones', 'Tips'],
    emotionTriggers: ['clarity', 'trust', 'value']
  },

  // SOCIAL PROOF PATTERNS
  {
    id: 'proof-testimonial-person',
    name: 'Testimonial + Person',
    type: 'social-proof',
    tone: 'intimate',
    template: 'Faça como [PERSON] e [ACTION]\n"[QUOTE]"',
    examples: [
      'Faça como a Rebeca e adquira sua bike',
      'Join thousands who discovered this'
    ],
    psychology: 'Relatability + social proof merge',
    whenToUse: 'Middle-to-late carousel slides (proof)',
    powerWords: ['Como', 'Descobrir', 'Juntos'],
    emotionTriggers: ['belonging', 'trust', 'relatability']
  },

  // CTA PATTERNS
  {
    id: 'cta-action-verb',
    name: 'Action Verb CTA',
    type: 'cta',
    tone: 'punchy',
    template: '[VERB] + [OUTCOME]',
    examples: [
      'Explore más, vá de bike',
      'Adquira su bike',
      'Descubre el mundo',
      'Contáctanos hoy'
    ],
    psychology: 'Direct action request, clear next step',
    whenToUse: 'Final slide or mid-carousel call-out',
    powerWords: ['Explore', 'Adquira', 'Descubre', 'Actúa'],
    emotionTriggers: ['action', 'clarity']
  },
  {
    id: 'cta-pricing-urgency',
    name: 'Pricing + Urgency',
    type: 'cta',
    tone: 'urgent',
    template: 'R$ [PRICE] | [URGENCY_MESSAGE]',
    examples: [
      'R$ 2.379,00 | Limitado',
      'R$ 200,90 | Antes de que termine',
      'From $199 | Limited time only'
    ],
    psychology: 'Value clarity + FOMO',
    whenToUse: 'Product showcase slides',
    powerWords: ['Limitado', 'Antes', 'Exclusivo'],
    emotionTriggers: ['value', 'urgency']
  },
  {
    id: 'feature-checklist',
    name: 'Feature Checklist',
    type: 'education',
    tone: 'casual',
    template: '✓ [FEATURE]\n✓ [FEATURE]\n✓ [FEATURE]\n✓ [FEATURE]',
    examples: [
      '✓ Electric\n✓ Suitable for rehabilitation\n✓ Light weight\n✓ Quiet (< 40 dB)',
      '✓ Smooth operation\n✓ Adjustable weight\n✓ Compact design\n✓ Easy to assemble'
    ],
    psychology: 'Clarity, scannability, confidence building',
    whenToUse: 'Product feature slides, equipment carousels',
    powerWords: ['Suitable', 'Smooth', 'Adjustable', 'Compact', 'Electric'],
    emotionTriggers: ['clarity', 'confidence', 'trust']
  },
  {
    id: 'benefit-replacement',
    name: 'Benefit Replacement (What Replaces)',
    type: 'education',
    tone: 'casual',
    template: '[NUMBER] MINUTES A DAY WILL REPLACE:\n• [ACTIVITY1]\n• [ACTIVITY2]\n• [ACTIVITY3]',
    examples: [
      '30 MINUTES A DAY WILL REPLACE:\n• Jogging for 2 hours\n• Swimming for 1 hour\n• Cycling 3 kilometers'
    ],
    psychology: 'Time efficiency, value justification',
    whenToUse: 'Product carousel, efficiency-focused messaging',
    powerWords: ['WILL REPLACE', 'MINUTES', 'EQUIVALENT'],
    emotionTriggers: ['efficiency', 'value', 'convenience']
  },
  {
    id: 'community-motivation',
    name: 'Community Motivation',
    type: 'social-proof',
    tone: 'punchy',
    template: '[ACTION] TOGETHER [OUTCOME] TOGETHER',
    examples: [
      'TRAIN TOGETHER WIN TOGETHER',
      'Grow together, achieve together',
      'Community over isolation'
    ],
    psychology: 'Belonging, shared purpose, mutual support',
    whenToUse: 'Gym/coaching carousels, community-building',
    powerWords: ['TOGETHER', 'COMMUNITY', 'COLLECTIVE', 'TEAM'],
    emotionTriggers: ['belonging', 'power', 'support']
  },
  {
    id: 'why-choose-format',
    name: 'Why Choose This (Circular Format)',
    type: 'education',
    tone: 'casual',
    template: 'WHY CHOOSE THIS?\n◦ [REASON1]\n◦ [REASON2]\n◦ [REASON3]',
    examples: [
      'WHY CHOOSE THIS?\n◦ Space-saving design\n◦ Adjustable weight system\n◦ Easy to assemble'
    ],
    psychology: 'Justification, clarity, decision-making support',
    whenToUse: 'Product comparison, feature emphasis slides',
    powerWords: ['CHOOSE', 'ADVANTAGE', 'BENEFIT', 'REASON'],
    emotionTriggers: ['clarity', 'confidence']
  },
  {
    id: 'coach-introduction',
    name: 'Coach/Expert Introduction',
    type: 'social-proof',
    tone: 'informal',
    template: 'Meet [COACH_NAME]\n[TITLE/SPECIALTY]\n[BRIEF_CREDENTIAL]',
    examples: [
      'Meet Coach MIKE\nStrength Specialist\nWith 20+ years in the field'
    ],
    psychology: 'Authority building, personal connection, trust',
    whenToUse: 'Personal training carousels, expert introduction',
    powerWords: ['COACH', 'SPECIALIST', 'EXPERT', 'CERTIFIED'],
    emotionTriggers: ['trust', 'authority', 'familiarity']
  },
  {
    id: 'transformation-proof',
    name: 'Transformation/Results Proof',
    type: 'social-proof',
    tone: 'intimate',
    template: 'I Lost [RESULT] in [TIMEFRAME]\n"[TESTIMONIAL]"\n- [PERSON_NAME]',
    examples: [
      'I Lost 15lbs in 8 Weeks\n"This program changed my life. I\'m stronger, healthier, and confident."\n- Sarah T.'
    ],
    psychology: 'Relatability, proof of results, aspiration',
    whenToUse: 'Transformation carousels, case study slides',
    powerWords: ['Lost', 'Gained', 'Transformed', 'Achieved'],
    emotionTriggers: ['hope', 'aspiration', 'confidence']
  }
];

export const ingestCopyExample = (copy: string, metadata: any): CopyPattern => {
  return {
    id: `copy-${Date.now()}`,
    name: metadata.name || 'Untitled',
    type: metadata.type || 'hook',
    industry: metadata.industry,
    tone: metadata.tone || 'casual',
    template: copy,
    examples: [copy],
    psychology: metadata.psychology || '',
    whenToUse: metadata.whenToUse || '',
    powerWords: metadata.powerWords || [],
    emotionTriggers: metadata.emotionTriggers || []
  };
};

export const findCopyPattern = (criteria: {
  type?: string;
  tone?: string;
  industry?: string;
}): CopyPattern[] => {
  return copyPatterns.filter(p => {
    if (criteria.type && p.type !== criteria.type) return false;
    if (criteria.tone && p.tone !== criteria.tone) return false;
    if (criteria.industry && p.industry !== criteria.industry) return false;
    return true;
  });
};
