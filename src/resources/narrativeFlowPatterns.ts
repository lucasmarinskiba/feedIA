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
  },
  {
    id: 'finance-education-3slide',
    name: 'Finance Education 3-Slide (Question → Explanation → Service)',
    slides: 3,
    flow: [
      'Educational question hook (Qual a diferença?)',
      'Concept explanation + visual metaphor (tree/money)',
      'Service offering + CTA (nossa ajuda)'
    ],
    retention: [
      { slideNumber: 1, mechanic: 'Curiosity (what is the difference?)' },
      { slideNumber: 2, mechanic: 'Visual learning + clarity' },
      { slideNumber: 3, mechanic: 'Service positioning + trust' }
    ],
    industryFit: ['finance', 'accounting', 'tax', 'corporate-education'],
    psychologyFlow: 'Curiosity (1) → Education (2) → Trust + Action (3)'
  },
  {
    id: 'finance-benefit-promotion-4slide',
    name: 'Finance Benefit Promotion 4-Slide (Outcome → How → Why → CTA)',
    slides: 4,
    flow: [
      'Benefit outcome headline (Maximize seu faturamento)',
      'Service/strategy explanation (estratégias digitais)',
      'Targeted benefit (para a sua empresa)',
      'Contact/booking CTA + money visual'
    ],
    retention: [
      { slideNumber: 1, mechanic: 'Benefit clarity (what do I gain?)' },
      { slideNumber: 2, mechanic: 'Method transparency' },
      { slideNumber: 3, mechanic: 'Relevance/personalization' },
      { slideNumber: 4, mechanic: 'Urgency + access' }
    ],
    industryFit: ['finance', 'accounting-services', 'corporate-consulting', 'business-growth'],
    psychologyFlow: 'Desire (1) → Understanding (2-3) → Action (4)'
  },
  {
    id: 'finance-risk-awareness-2slide',
    name: 'Risk Awareness 2-Slide (Warning → Prevention)',
    slides: 2,
    flow: [
      'Risk warning headline (Cheque seu boleto ANTES de PAGAR)',
      'Prevention guidance + support offer'
    ],
    retention: [
      { slideNumber: 1, mechanic: 'Loss aversion activation (avoid fraud)' },
      { slideNumber: 2, mechanic: 'Trust-building solution + help' }
    ],
    industryFit: ['finance', 'fraud-prevention', 'corporate-security', 'tax-compliance'],
    psychologyFlow: 'Risk alert (1) → Prevention + trust (2)'
  },
  {
    id: 'finance-myth-busting-5slide',
    name: 'Myth-Busting 5-Slide (Belief Challenge → Reality)',
    slides: 5,
    flow: [
      'Myth-busting hook (Ao contrário do que pensa...)',
      'Challenge belief 1 + proof',
      'Challenge belief 2 + proof',
      'New reality/what they actually do',
      'Service/expertise CTA'
    ],
    retention: [
      { slideNumber: 1, mechanic: 'Cognitive dissonance (captures attention)' },
      { slideNumber: 2, mechanic: 'Evidence 1 (builds credibility)' },
      { slideNumber: 3, mechanic: 'Evidence 2 (reinforces)' },
      { slideNumber: 4, mechanic: 'Repositioning (establishes new belief)' },
      { slideNumber: 5, mechanic: 'Action (prove it with service)' }
    ],
    industryFit: ['accounting', 'finance', 'consulting', 'professional-services'],
    psychologyFlow: 'Dissonance (1) → Evidence (2-3) → Belief shift (4) → Action (5)'
  },
  {
    id: 'cost-revelation-4slide',
    name: 'Cost Revelation 4-Slide (Hidden Cost Journey)',
    slides: 4,
    flow: [
      'Price shock hook (Quanto custa...? Você acha que custa...?)',
      'Fear identification + myth-bust (O problema não é... O problema é...)',
      'Structured comparison (Options + consequences listed)',
      'Calculation reality check (Specific numbers + impact on bottom line)'
    ],
    retention: [
      { slideNumber: 1, mechanic: 'Price assumption challenge (stops scroll, activates curiosity)' },
      { slideNumber: 2, mechanic: 'Fear naming (emotional recognition: "eu sou assim")' },
      { slideNumber: 3, mechanic: 'Option clarity (empowerment through comparison)' },
      { slideNumber: 4, mechanic: 'Reality wake-up (specific numbers prove hidden cost)' }
    ],
    industryFit: ['finance', 'accounting', 'hiring', 'consulting', 'business-services', 'cost-optimization'],
    psychologyFlow: 'Price shock (1) → Emotion recognition (2) → Empowerment (3) → Reality acceptance (4)'
  },
  {
    id: 'hiring-cost-education-4slide',
    name: 'Hiring Cost Education 4-Slide (Adaptable Template)',
    slides: 4,
    flow: [
      '[ROLE] hiring cost assumption challenge',
      'Real problem identification (fear, lack of calculation)',
      'Comparison of hiring models (CLT vs Autônomo vs PJ vs Service)',
      'Specific breakdown (salary + taxes + benefits + consequences)'
    ],
    retention: [
      { slideNumber: 1, mechanic: 'Shock value (actual cost >> perceived cost)' },
      { slideNumber: 2, mechanic: 'Emotional resonance (recognizing own behavior)' },
      { slideNumber: 3, mechanic: 'Decision clarity (systematized options)' },
      { slideNumber: 4, mechanic: 'Actionability (specific numbers + impact statement)' }
    ],
    industryFit: ['hiring', 'consulting', 'business-services', 'accounting', 'human-resources'],
    psychologyFlow: 'Cost awareness (1) → Self-recognition (2) → Decision framework (3) → Action readiness (4)'
  },
  {
    id: 'myth-busting-4slide-series',
    name: 'Myth-Busting 4-Slide Series (Intro → Myth 1 → Myth 2 → Truth)',
    slides: 4,
    flow: [
      'Myth-busting intro: Set up problem area + preview benefits',
      'MYTH #01: Quote false belief + reality reframe + solution positioning',
      'MYTH #02: Quote another false belief + reality reframe + solution positioning',
      'TRUTH: Affirmation + benefits recap + transformation CTA'
    ],
    retention: [
      { slideNumber: 1, mechanic: 'Authority setup (we understand your concerns)' },
      { slideNumber: 2, mechanic: 'Myth challenge (false belief directly challenged)' },
      { slideNumber: 3, mechanic: 'Relatability (another common false belief addressed)' },
      { slideNumber: 4, mechanic: 'Empowerment (truth + benefits + partnership invitation)' }
    ],
    industryFit: ['consulting', 'education', 'accounting', 'professional-services', 'financial-advising'],
    psychologyFlow: 'Authority (1) → Myth challenge (2-3) → Reality reframe → Belief shift → Empowerment (4)'
  },
  {
    id: 'school-recovery-4slide',
    name: 'School Financial Recovery 4-Slide (Education Services)',
    slides: 4,
    flow: [
      'Problem intro: "MITOS que prejudicam a saúde financeira da sua escola"',
      'MYTH #01: "Depois de muito tempo não dá para recuperar" → Reality: Antigos débitos podem ser recuperados',
      'MYTH #02: "Cobrança desgasta relação com pais" → Reality: Cobrança com respeito fortalece relação',
      'TRUTH: "Recuperar é possível e necessário" + Benefits + Partnership CTA'
    ],
    retention: [
      { slideNumber: 1, mechanic: 'Problem naming (school financial health)' },
      { slideNumber: 2, mechanic: 'Hope activation (recovery is possible)' },
      { slideNumber: 3, mechanic: 'Relationship preservation (cobrança = professional + humanized)' },
      { slideNumber: 4, mechanic: 'Transformation (myths → solutions → action)' }
    ],
    industryFit: ['education', 'school-recovery', 'financial-collection', 'school-management'],
    psychologyFlow: 'Problem recognition (1) → Hope + possibility (2-3) → Empowerment + action (4)'
  },
  {
    id: 'domain-transfer-5slide',
    name: 'Domain Transfer 5-Slide (Complex Concept via Familiar Analogy)',
    slides: 5,
    flow: [
      'Analogy intro hook: "Te explicando [COMPLEX] na linguagem do [FAMILIAR_DOMAIN]"',
      'Implicit learning: "Seu [FAMILIAR_ENTITY] te ensinou tudo que precisa saber"',
      'Benefit/reward question: "E o prêmio?" → Answer with benefit clarity',
      'Practical example: "E na prática?" → Concrete scenario showing principle in action',
      'Misconception clarifier + expert teaser CTA'
    ],
    retention: [
      { slideNumber: 1, mechanic: 'Accessibility through analogy (complex → familiar)' },
      { slideNumber: 2, mechanic: 'Authority reframing (you already know this)' },
      { slideNumber: 3, mechanic: 'Reward anticipation (keeps momentum)' },
      { slideNumber: 4, mechanic: 'Clarity through concrete scenario' },
      { slideNumber: 5, mechanic: 'Misconception handling + expert trust + soft CTA' }
    ],
    industryFit: ['financial-education', 'complex-products', 'abstract-concepts', 'consulting'],
    psychologyFlow: 'Accessibility (1) → Recognition (2) → Reward (3) → Clarity (4) → Trust + action (5)'
  },
  {
    id: 'consortium-education-5slide',
    name: 'Consortium/Complex Financial Product 5-Slide (Specific Example)',
    slides: 5,
    flow: [
      'Hook: "Te explicando consórcio na linguagem do futebol"',
      'Learning transfer: "Seu clube te ensinou tudo que precisa saber sobre consórcio"',
      'Benefit question: "E o prêmio?" + "Você não recebe dinheiro, recebe poder de compra"',
      'Practical example: "E na prática? O consórcio é um grupo que joga junto..."',
      'Misconception + expert CTA: "Você só não percebeu isso antes, vem que explica"'
    ],
    retention: [
      { slideNumber: 1, mechanic: 'Football analogy = accessible entry point' },
      { slideNumber: 2, mechanic: 'Club example = familiar proof of principle' },
      { slideNumber: 3, mechanic: 'Benefit clarity (reframes money ≠ buying power)' },
      { slideNumber: 4, mechanic: 'Concrete bolão example = makes abstract concrete' },
      { slideNumber: 5, mechanic: 'Light teaser (not salesy) + expert invitation' }
    ],
    industryFit: ['financial-products', 'consortium', 'savings-plans', 'group-financing'],
    psychologyFlow: 'Familiarity (1-2) → Benefit clarity (3) → Practical understanding (4) → Soft conversion (5)'
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
