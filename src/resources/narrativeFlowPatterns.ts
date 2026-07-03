/**
 * Phase 36: Carousel Flow Intelligence
 *
 * Learns: slide-by-slide narrative flow, pacing, retention
 */

export interface CarouselFlowPattern {
  id: string;
  name: string;
  slides: number;
  flow: string[];
  retention: {
    slideNumber: number;
    mechanic: string; // what keeps swiping
  }[];
  industryFit: string[];
  psychologyFlow: string;
}

export const flowPatterns: CarouselFlowPattern[] = [
  {
    id: 'atasport-6slide',
    name: 'ATASport 6-Slide (Challenge → Purchase)',
    slides: 6,
    flow: [
      'Challenge hook + person',
      'Community + benefit',
      'Educational list (4 benefits)',
      'Lifestyle dream + product intro',
      'Product detail close-up',
      'Product + pricing CTA'
    ],
    retention: [
      { slideNumber: 1, mechanic: 'Curiosity hook (challenge)' },
      { slideNumber: 2, mechanic: 'Relatability (community)' },
      { slideNumber: 3, mechanic: 'Credibility (education)' },
      { slideNumber: 4, mechanic: 'Aspiration (lifestyle)' },
      { slideNumber: 5, mechanic: 'Detail/quality showcase' },
      { slideNumber: 6, mechanic: 'Urgency (pricing + CTA)' }
    ],
    industryFit: ['bikes', 'sports', 'lifestyle', 'fitness'],
    psychologyFlow: 'Emotional engagement (1-2) → Credibility (3) → Aspiration (4) → Product detail (5) → Purchase motivation (6)'
  },
  {
    id: 'mbikes-9slide',
    name: 'MBikes 9-Slide (Comprehensive Journey)',
    slides: 9,
    flow: [
      'Promo lead + free shipping',
      'Product intro + pricing',
      'Lifestyle dream',
      'Educational list (4 benefits)',
      'Social proof (testimonial)',
      'Equipment quality positioning',
      'Adventure call',
      'Multiple testimonials',
      'Product + purchase button'
    ],
    retention: [
      { slideNumber: 1, mechanic: 'FOMO (free shipping)' },
      { slideNumber: 2, mechanic: 'Value clarity (pricing)' },
      { slideNumber: 3, mechanic: 'Aspiration (lifestyle)' },
      { slideNumber: 4, mechanic: 'Education (features)' },
      { slideNumber: 5, mechanic: 'Social proof (testimonial)' },
      { slideNumber: 6, mechanic: 'Quality assurance' },
      { slideNumber: 7, mechanic: 'Adventure motivation' },
      { slideNumber: 8, mechanic: 'Multiple proof points' },
      { slideNumber: 9, mechanic: 'Final CTA + urgency' }
    ],
    industryFit: ['bikes', 'e-commerce', 'premium-goods', 'lifestyle'],
    psychologyFlow: 'Urgency (1) → Value (2) → Dream (3) → Education (4-6) → Community proof (7-8) → Action (9)'
  },
  {
    id: 'trikat-4slide',
    name: 'TrikatPro 4-Slide (Urgency Focus)',
    slides: 4,
    flow: [
      'Urgency promo',
      'Adventure aspiration',
      'Testimonials/reviews',
      'Feature + version + CTA'
    ],
    retention: [
      { slideNumber: 1, mechanic: 'FOMO (limited time)' },
      { slideNumber: 2, mechanic: 'Lifestyle desire' },
      { slideNumber: 3, mechanic: 'Social proof' },
      { slideNumber: 4, mechanic: 'Feature clarity + action' }
    ],
    industryFit: ['bikes', 'accessories', 'tech-products', 'time-sensitive'],
    psychologyFlow: 'Urgency spike (1) → Emotional lift (2) → Trust building (3) → Conversion (4)'
  }
];

export interface SlideRole {
  position: number;
  role: 'hook' | 'benefit' | 'education' | 'lifestyle' | 'proof' | 'detail' | 'quality' | 'cta';
  purpose: string;
  retentionMechanic: string;
  visualGuidance: string;
  copyGuidance: string;
}

export const getFlowTemplate = (criteria: {
  industry: string;
  slideCount?: number;
  messageType: string;
}): CarouselFlowPattern | null => {
  return flowPatterns.find(p => p.industryFit.includes(criteria.industry)) || null;
};

export const ingestCarouselFlow = (slides: any[], metadata: any): CarouselFlowPattern => {
  return {
    id: `flow-${Date.now()}`,
    name: metadata.name || 'Custom Flow',
    slides: slides.length,
    flow: slides.map(s => s.summary || ''),
    retention: slides.map((s, i) => ({
      slideNumber: i + 1,
      mechanic: s.retentionMechanic || ''
    })),
    industryFit: metadata.industries || [],
    psychologyFlow: metadata.psychology || ''
  };
};
