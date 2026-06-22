import type { NicheCategory, AudienceProfile } from './nicheAnalyzer.js';

/**
 * Audience Psychology Agent
 * Deep psychological profiling: pain → desire → belief → objection → trigger
 * Powers hyper-personalized content, offers, copy, CTAs
 */

export interface PsychProfile {
  niche: NicheCategory;
  audience: AudienceProfile;
  psychographics: Psychographics;
  buyingTriggers: BuyingTrigger[];
  objections: Objection[];
  emotionalDrivers: string[];
  contentResonanceMap: ContentResonance[];
  copyFormulas: CopyFormula[];
  offerFraming: OfferFraming;
}

export interface Psychographics {
  coreDesire: string;
  deepestFear: string;
  selfIdentity: string;
  aspirationalIdentity: string;
  valueHierarchy: string[];
  decisionStyle: 'emotional' | 'logical' | 'social' | 'mixed';
  trustSignals: string[];
  urgencyTriggers: string[];
}

export interface BuyingTrigger {
  trigger: string;
  intensity: 'high' | 'medium' | 'low';
  contentType: string;
  exampleHook: string;
}

export interface Objection {
  objection: string;
  underlyingFear: string;
  reframe: string;
  contentResponse: string;
}

export interface ContentResonance {
  contentType: string;
  resonanceScore: number;
  whyItWorks: string;
  hookFormula: string;
}

export interface CopyFormula {
  name: string;
  structure: string;
  example: string;
  usedFor: string;
}

export interface OfferFraming {
  primaryFrame: string;
  valueProposition: string;
  priceAnchoring: string;
  urgencyType: string;
  socialProofType: string;
}

// Deep psychological maps per niche
const PSYCH_DATABASE: Record<
  string,
  PsychProfile['psychographics'] & {
    triggers: Array<Omit<BuyingTrigger, never>>;
    objections: Objection[];
  }
> = {
  'fitness-products': {
    coreDesire: 'Look fit, feel powerful, be seen as disciplined',
    deepestFear: 'Wasting time in the gym and not seeing results',
    selfIdentity: 'Someone who works hard but needs the right tools',
    aspirationalIdentity: 'The person others ask "what do you take?"',
    valueHierarchy: ['results', 'quality', 'convenience', 'price', 'brand'],
    decisionStyle: 'mixed',
    trustSignals: ['before/after photos', 'ingredient transparency', 'athlete endorsements', 'lab testing'],
    urgencyTriggers: ['limited stock', 'price increase', 'competition season', 'summer approaching'],
    triggers: [
      {
        trigger: 'Transformation evidence',
        intensity: 'high',
        contentType: 'before/after reel',
        exampleHook: 'I gained 8kg of muscle in 4 months using this stack',
      },
      {
        trigger: 'Ingredient reveal',
        intensity: 'high',
        contentType: 'educational post',
        exampleHook: 'Why 90% of proteins are wasting your money (check the label)',
      },
      {
        trigger: 'Limited availability',
        intensity: 'medium',
        contentType: 'story CTA',
        exampleHook: 'Only 47 units left at this price',
      },
      {
        trigger: 'Social proof stack',
        intensity: 'high',
        contentType: 'ugc compilation',
        exampleHook: "200 customers. Same result. Here's why.",
      },
    ],
    objections: [
      {
        objection: 'Too expensive',
        underlyingFear: "Wasting money if it doesn't work",
        reframe: 'Cost per serving vs results comparison',
        contentResponse: 'Show ROI: cost per workout vs gym membership, results value',
      },
      {
        objection: "Doesn't work for me",
        underlyingFear: 'My genetics are different',
        reframe: 'Protocol matters more than product',
        contentResponse: 'Educational content: how to use correctly for your body type',
      },
      {
        objection: 'I can get it cheaper elsewhere',
        underlyingFear: 'Being ripped off',
        reframe: 'Quality difference comparison',
        contentResponse: 'Lab test comparison, ingredient quality breakdown',
      },
    ],
  },
  'fitness-coaching': {
    coreDesire: "Finally get the body/mind they've been trying for years",
    deepestFear: 'Failure again after trying so many things',
    selfIdentity: 'Someone who is motivated but lacks the right system',
    aspirationalIdentity: 'The person who figured it out and transformed',
    valueHierarchy: ['results', 'accountability', 'personalization', 'community', 'price'],
    decisionStyle: 'emotional',
    trustSignals: ['client transformations', 'coach credentials', 'step-by-step methodology', 'money-back guarantee'],
    urgencyTriggers: ['limited spots', 'enrollment deadline', 'price going up', 'group starting soon'],
    triggers: [
      {
        trigger: 'Pain agitation',
        intensity: 'high',
        contentType: 'talking head reel',
        exampleHook: "You've tried everything. Here's why it keeps failing.",
      },
      {
        trigger: 'Transformation identification',
        intensity: 'high',
        contentType: 'client story reel',
        exampleHook: "She said the same thing you're thinking right now",
      },
      {
        trigger: 'Free value proof',
        intensity: 'medium',
        contentType: 'carousel/educational',
        exampleHook: 'The 3-step morning protocol that changed everything (free)',
      },
      {
        trigger: 'Scarcity',
        intensity: 'high',
        contentType: 'story CTA',
        exampleHook: 'Last 3 spots in my June cohort. DM READY.',
      },
    ],
    objections: [
      {
        objection: 'I can do it myself',
        underlyingFear: "Don't want to admit needing help",
        reframe: 'Accountability multiplies results 10x',
        contentResponse: 'Show cost of going alone: time wasted, wrong approaches, plateau',
      },
      {
        objection: "I don't have time",
        underlyingFear: 'Fear of failing again due to schedule',
        reframe: '20 minutes a day program',
        contentResponse: 'Show minimal time investment with maximum results',
      },
      {
        objection: 'Too expensive',
        underlyingFear: 'ROI uncertainty',
        reframe: 'Cost of staying the same',
        contentResponse: "What's the cost of another year of no results?",
      },
    ],
  },
  'fitness-b2b': {
    coreDesire: 'Build a profitable coaching business with consistent clients',
    deepestFear: 'Putting in massive effort and staying broke',
    selfIdentity: 'Knowledgeable fitness professional who lacks business skills',
    aspirationalIdentity: 'The 7-figure fitness entrepreneur who influences others',
    valueHierarchy: ['ROI', 'systems', 'speed', 'community', 'credibility'],
    decisionStyle: 'logical',
    trustSignals: ['revenue screenshots', 'client coach testimonials', 'frameworks/systems', 'case studies'],
    urgencyTriggers: ['market saturation threat', 'competitor growing', 'price increasing', 'cohort filling'],
    triggers: [
      {
        trigger: 'Revenue proof',
        intensity: 'high',
        contentType: 'case study reel',
        exampleHook: "From 0 to $8,400/month in 60 days. Here's the exact system.",
      },
      {
        trigger: 'Market threat',
        intensity: 'high',
        contentType: 'educational reel',
        exampleHook: "The fitness market is changing. Coaches who don't adapt will disappear.",
      },
      {
        trigger: 'System preview',
        intensity: 'medium',
        contentType: 'carousel',
        exampleHook: 'The 5-step client acquisition system (steal this)',
      },
    ],
    objections: [
      {
        objection: 'I need more followers first',
        underlyingFear: 'Not good enough yet',
        reframe: "Clients don't come from followers, they come from trust",
        contentResponse: 'Case study: $10K/month with under 2000 followers',
      },
      {
        objection: "I tried before and it didn't work",
        underlyingFear: 'This is just another course',
        reframe: 'Implementation gap vs information gap',
        contentResponse: 'Show accountability + implementation support differentiator',
      },
    ],
  },
  'personal-brand': {
    coreDesire: 'Build an audience that follows their journey and opens doors',
    deepestFear: 'Creating content nobody watches / being irrelevant',
    selfIdentity: 'Interesting person with value to share but uncertain how',
    aspirationalIdentity: 'The authentic creator brands want to work with',
    valueHierarchy: ['authenticity', 'growth', 'monetization', 'community', 'freedom'],
    decisionStyle: 'social',
    trustSignals: ['follower count growth', 'engagement proof', 'brand deal mentions', 'behind-scenes access'],
    urgencyTriggers: ['algorithm change', 'viral moment window', 'brand deal expiry', 'competitor growing faster'],
    triggers: [
      {
        trigger: 'FOMO on creator economy',
        intensity: 'high',
        contentType: 'growth proof reel',
        exampleHook: 'I grew 10K followers in 30 days doing this one thing',
      },
      {
        trigger: 'Authenticity permission',
        intensity: 'medium',
        contentType: 'behind-scenes',
        exampleHook: 'Stop trying to be perfect. This is what works.',
      },
      {
        trigger: 'Dream life proof',
        intensity: 'high',
        contentType: 'lifestyle reel',
        exampleHook: 'Brands pay me to travel. This is how it started.',
      },
    ],
    objections: [
      {
        objection: "I'm not interesting enough",
        underlyingFear: 'Imposter syndrome',
        reframe: "You don't need to be famous, you need to be specific",
        contentResponse: 'Show niche micro-creators thriving with small audiences',
      },
      {
        objection: 'There are too many creators already',
        underlyingFear: 'Competition too high',
        reframe: 'Authenticity creates infinite differentiation',
        contentResponse: 'No one can copy your exact combination of experience and perspective',
      },
    ],
  },
};

export class AudiencePsychologyAgent {
  buildPsychProfile(niche: NicheCategory, audience: AudienceProfile): PsychProfile {
    const data = PSYCH_DATABASE[niche] ?? PSYCH_DATABASE['personal-brand']!;

    return {
      niche,
      audience,
      psychographics: {
        coreDesire: data.coreDesire,
        deepestFear: data.deepestFear,
        selfIdentity: data.selfIdentity,
        aspirationalIdentity: data.aspirationalIdentity,
        valueHierarchy: data.valueHierarchy,
        decisionStyle: data.decisionStyle,
        trustSignals: data.trustSignals,
        urgencyTriggers: data.urgencyTriggers,
      },
      buyingTriggers: data.triggers,
      objections: data.objections,
      emotionalDrivers: this.deriveEmotionalDrivers(data),
      contentResonanceMap: this.buildResonanceMap(niche, data.decisionStyle),
      copyFormulas: this.getCopyFormulas(data.decisionStyle),
      offerFraming: this.buildOfferFraming(niche, data),
    };
  }

  generateHookVariants(trigger: BuyingTrigger, count: number = 5): string[] {
    const base = trigger.exampleHook;
    const variants = [
      base,
      `Why ${base.toLowerCase().replace('i ', 'most people ')}`,
      `The truth about: ${base.split(' ').slice(0, 5).join(' ')}...`,
      `Stop doing this if you want ${trigger.trigger.toLowerCase()}`,
      `What nobody tells you about ${trigger.contentType}`,
    ];
    return variants.slice(0, count);
  }

  reframeObjection(objection: Objection): string[] {
    return [objection.reframe, `${objection.contentResponse}`, `Address fear directly: "${objection.underlyingFear}"`];
  }

  private deriveEmotionalDrivers(data: (typeof PSYCH_DATABASE)[string]): string[] {
    return [
      `Fear of: ${data.deepestFear}`,
      `Desire for: ${data.coreDesire}`,
      `Identity shift: ${data.selfIdentity} → ${data.aspirationalIdentity}`,
    ];
  }

  private buildResonanceMap(niche: NicheCategory, decisionStyle: Psychographics['decisionStyle']): ContentResonance[] {
    const base: ContentResonance[] = [
      {
        contentType: 'transformation reel',
        resonanceScore: decisionStyle === 'emotional' ? 95 : 75,
        whyItWorks: 'Shows the gap between current and desired state',
        hookFormula: '[Pain state]. Then I found [solution]. Now [dream state].',
      },
      {
        contentType: 'educational carousel',
        resonanceScore: decisionStyle === 'logical' ? 90 : 70,
        whyItWorks: 'Demonstrates expertise, builds trust systematically',
        hookFormula: '[Number] [topic] that [authority claim]',
      },
      {
        contentType: 'social proof compilation',
        resonanceScore: decisionStyle === 'social' ? 95 : 80,
        whyItWorks: 'Reduces risk perception through group validation',
        hookFormula: "[N] people tried [thing]. Here's what happened.",
      },
      {
        contentType: 'behind-scenes story',
        resonanceScore: 75,
        whyItWorks: 'Builds parasocial connection and authentic trust',
        hookFormula: "What [platform] doesn't show you about [topic]",
      },
    ];

    return base.sort((a, b) => b.resonanceScore - a.resonanceScore);
  }

  private getCopyFormulas(decisionStyle: Psychographics['decisionStyle']): CopyFormula[] {
    const formulas: CopyFormula[] = [
      {
        name: 'PAS (Pain-Agitate-Solution)',
        structure: 'State the pain → make it feel urgent → reveal solution',
        example: "Tired of plateaus? Most people hit a wall at 3 months. Here's what breaks it.",
        usedFor: 'emotional decision makers, cold audience',
      },
      {
        name: 'AIDA (Attention-Interest-Desire-Action)',
        structure: 'Hook → story/proof → desire amplification → CTA',
        example: "I lost 20kg (A). Here's my exact protocol (I). Imagine being 20kg lighter (D). DM START (A)",
        usedFor: 'warm audience, offer posts',
      },
      {
        name: 'Before-After-Bridge',
        structure: 'Before state → after state → bridge = your offer',
        example: 'Before: 3 years struggling. After: 6-pack in 90 days. Bridge: my 12-week system.',
        usedFor: 'transformation content, coaching offers',
      },
      {
        name: 'Problem-Promise-Proof-Proposal',
        structure: 'Name problem → make bold promise → stack proof → make offer',
        example: "90% of coaches fail year 1. I built a $10K/month system. 47 coaches used it. Here's how.",
        usedFor: 'logical decision makers, B2B',
      },
    ];

    if (decisionStyle === 'logical') return formulas.filter((f) => f.name.includes('Proof') || f.name.includes('AIDA'));
    if (decisionStyle === 'emotional')
      return formulas.filter((f) => f.name.includes('PAS') || f.name.includes('Before'));
    return formulas;
  }

  private buildOfferFraming(niche: NicheCategory, data: (typeof PSYCH_DATABASE)[string]): OfferFraming {
    const frames: Partial<Record<NicheCategory, OfferFraming>> = {
      'fitness-products': {
        primaryFrame: 'Optimization: give your body what it needs to perform',
        valueProposition: 'The right supplements = multiply your gym results',
        priceAnchoring: 'Cost per workout / cost vs missing results',
        urgencyType: 'Stock scarcity + price increase',
        socialProofType: 'Before/after stack + ingredient proof',
      },
      'fitness-coaching': {
        primaryFrame: 'Transformation: the system that finally works',
        valueProposition: 'Accountability + personalization = guaranteed results',
        priceAnchoring: 'Cost of another year of no results',
        urgencyType: 'Limited spots + cohort start date',
        socialProofType: 'Client transformation stories',
      },
      'fitness-b2b': {
        primaryFrame: 'ROI: turn your knowledge into a scalable income',
        valueProposition: 'Proven system used by 100+ coaches to hit $10K+/mo',
        priceAnchoring: 'Cost of wasted time building alone',
        urgencyType: 'Market window closing + price going up',
        socialProofType: 'Revenue screenshots + coach case studies',
      },
    };

    return (
      frames[niche] ?? {
        primaryFrame: 'Value: get more of what you want, faster',
        valueProposition: 'The proven system to achieve [desired outcome]',
        priceAnchoring: 'Cost of not taking action',
        urgencyType: 'Limited availability',
        socialProofType: 'Social proof and testimonials',
      }
    );
  }
}

export const audiencePsychologyAgent = new AudiencePsychologyAgent();
