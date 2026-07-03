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
  },
  {
    id: 'fitness-motivation-5slide',
    name: 'Fitness Motivation 5-Slide (Challenge to Action)',
    slides: 5,
    flow: [
      'Motivation hook (numbered benefit teaser)',
      'Benefit detail 1 + photo',
      'Benefit detail 2 + photo',
      'Benefit detail 3 + photo',
      'Action call + coaching CTA'
    ],
    retention: [
      { slideNumber: 1, mechanic: 'Curiosity (what are the 4 ways?)' },
      { slideNumber: 2, mechanic: 'Value delivery + social proof' },
      { slideNumber: 3, mechanic: 'Sustained education + momentum' },
      { slideNumber: 4, mechanic: 'Completion + confidence' },
      { slideNumber: 5, mechanic: 'Action urgency + personal touch' }
    ],
    industryFit: ['fitness', 'gym', 'coaching', 'personal-training', 'motivation'],
    psychologyFlow: 'Curiosity hook (1) → Education (2-4) → Belief shift → Action (5)'
  },
  {
    id: 'product-features-6slide',
    name: 'Equipment Features 6-Slide (Product Showcase)',
    slides: 6,
    flow: [
      'Product hero + key benefit',
      'Feature checklist',
      'Benefit comparison (replaces X)',
      'Touch controls + tech details',
      'Who is this for + use cases',
      'Purchase CTA + testimonial proof'
    ],
    retention: [
      { slideNumber: 1, mechanic: 'Visual hook (impressive product)' },
      { slideNumber: 2, mechanic: 'Clarity (what it does)' },
      { slideNumber: 3, mechanic: 'Value justification (time savings)' },
      { slideNumber: 4, mechanic: 'Technical confidence' },
      { slideNumber: 5, mechanic: 'Relatability (this is for me)' },
      { slideNumber: 6, mechanic: 'Social proof + action' }
    ],
    industryFit: ['equipment', 'fitness-tech', 'e-commerce', 'product-launch'],
    psychologyFlow: 'Interest (1) → Understanding (2-3) → Confidence (4) → Identification (5) → Conversion (6)'
  },
  {
    id: 'coaching-grid-9slide',
    name: 'Coaching Community 9-Slide (Brand + Services)',
    slides: 9,
    flow: [
      'Brand intro + coach photo',
      'Transformation proof slide 1',
      'Transformation proof slide 2',
      'Community motivation angle',
      'Service breakdown (1-on-1, class, etc)',
      'Pricing/access option 1',
      'Pricing/access option 2',
      'Testimonial from past client',
      'Join/booking CTA + community feel'
    ],
    retention: [
      { slideNumber: 1, mechanic: 'Authority + personal connection' },
      { slideNumber: 2, mechanic: 'Results proof 1' },
      { slideNumber: 3, mechanic: 'Results proof 2' },
      { slideNumber: 4, mechanic: 'Community belonging' },
      { slideNumber: 5, mechanic: 'Service clarity' },
      { slideNumber: 6, mechanic: 'Access simplification' },
      { slideNumber: 7, mechanic: 'Choice empowerment' },
      { slideNumber: 8, mechanic: 'Social proof narrative' },
      { slideNumber: 9, mechanic: 'Urgency + community invitation' }
    ],
    industryFit: ['personal-training', 'coaching', 'gym-studios', 'fitness-community'],
    psychologyFlow: 'Trust (1) → Proof (2-3) → Belonging (4) → Understanding (5-7) → Social proof (8) → Action (9)'
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
