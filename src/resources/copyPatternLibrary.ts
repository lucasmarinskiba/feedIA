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
