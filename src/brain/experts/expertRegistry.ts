/**
 * Expert Registry — Maestros en 10+ disciplinas
 *
 * Expertos especializados que alimentan herramientas Sala:
 * - Administrator (Lic. Administración): Ops, workflows, efficiency
 * - Marketing Master (Lic. Marketing): Strategy, campaigns, positioning
 * - Visual Communicator (Lic. Comunicación Visual): Messaging, visual hierarchy
 * - Design Maestro (Lic. Diseño): Aesthetics, composition, innovation
 * - Photography Expert (Lic. Fotografía): Lighting, composition, authentic capture
 * - Branding Specialist (Lic. Branding): Identity, consistency, equity
 * - Strategist (Strategic thinking): Long-term planning, competitive analysis
 * - Psychologist (Behavioral science): Human psychology, persuasion, engagement
 * - Data Analyst (Analytics): Metrics, insights, data-driven decisions
 * - Sales Expert (Sales science): Conversion, persuasion, negotiation
 */

import { log } from '../../agent/logger.js';

export interface ExpertAdvice {
  discipline: string;
  guidance: string[];
  reasoning: string;
  confidence: number; // 0-100
}

// ── Admin Expert ──────────────────────────────────────────────────────

export const adminExpertAdvice = (): ExpertAdvice => ({
  discipline: 'Administration',
  guidance: [
    'Define clear workflows: input → process → output',
    'Automate repetitive tasks (batch operations preferred)',
    'Track KPIs: completion time, error rate, user satisfaction',
    'Implement audit trails for all decisions',
    'Set SLAs (Service Level Agreements) for each process',
    'Regular process reviews (bi-weekly): identify bottlenecks',
    'Delegate efficiently: right person, right task, right time',
    'Documentation: every workflow must be documented + trained',
  ],
  reasoning: 'Operations excellence requires systematic management, clear accountability, metrics.',
  confidence: 95,
});

// ── Marketing Master ──────────────────────────────────────────────────

export const marketingExpertAdvice = (): ExpertAdvice => ({
  discipline: 'Marketing',
  guidance: [
    'Audience segmentation: create buyer personas (5-7 min)',
    'Positioning: unique value proposition (UVP) crystal clear',
    'Channel strategy: where audience spends time (data-driven)',
    'Content pillars: 3-5 core themes that resonate deeply',
    'Campaign funnel: awareness → consideration → conversion → retention',
    'Competitive analysis: weekly checks for market gaps + threats',
    'Attribution: track which touchpoints drive conversions',
    'Testing framework: A/B test copy, design, CTAs always',
  ],
  reasoning: 'Market success requires systematic strategy, audience insight, continuous testing.',
  confidence: 93,
});

// ── Visual Communicator ───────────────────────────────────────────────

export const visualCommunicatorAdvice = (): ExpertAdvice => ({
  discipline: 'Visual Communication',
  guidance: [
    'Hierarchy: guide eye from primary → secondary → tertiary',
    'Contrast: high enough for accessibility (WCAG AA minimum)',
    'White space: minimum 15-20% of design (breathing room)',
    'Consistency: icon style, typography family, color palette (locked)',
    'Focal point: ONE clear main message per visual',
    'Grid system: align to grid (invisible structure, maximum impact)',
    'Psychology: color affects emotion (warm = energetic, cool = calm)',
    'Story first: visual should communicate story in 3 seconds',
  ],
  reasoning: 'Communication effectiveness depends on visual clarity, hierarchy, psychological impact.',
  confidence: 94,
});

// ── Design Maestro ───────────────────────────────────────────────────

export const designMaestroAdvice = (): ExpertAdvice => ({
  discipline: 'Design',
  guidance: [
    'Form follows function: design solves problems (never decoration-first)',
    'Simplicity: remove every element not needed (80/20 rule)',
    'Innovation: push boundaries but respect readability',
    'Accessibility: never design for yourself, design for everyone',
    'Consistency across platform: users trust patterns (learn once, use everywhere)',
    'Iteration: design is never finished (v1, v1.1, v2, etc)',
    'User testing: watch users interact (don\'t ask, observe)',
    'Principles: balance, contrast, emphasis, movement, unity (applies to all design)',
  ],
  reasoning: 'Exceptional design balances aesthetics + function + accessibility + consistency.',
  confidence: 96,
});

// ── Photography Expert ────────────────────────────────────────────────

export const photographyExpertAdvice = (): ExpertAdvice => ({
  discipline: 'Photography',
  guidance: [
    'Lighting: golden hour (sunrise/sunset) for warmth + dimension',
    'Composition: rule of thirds + leading lines + depth',
    'Authenticity: capture real moments, not staged (feels genuine)',
    'Framing: fill frame (crop tightly, exclude distractions)',
    'Depth of field: blur background (subject pops, context disappears)',
    'Story in frame: image should tell micro-story in 1 sec',
    'Angles: vary perspective (low/high, wide/close) = visual interest',
    'Post-processing: enhance, not fabricate (preserve authenticity)',
  ],
  reasoning: 'Authentic photography drives engagement + trust + emotional connection.',
  confidence: 92,
});

// ── Branding Specialist ───────────────────────────────────────────────

export const brandingSpecialistAdvice = (): ExpertAdvice => ({
  discipline: 'Branding',
  guidance: [
    'Brand essence: one sentence core identity (mission + personality)',
    'Visual identity: logo, color palette, typography (locked, consistent)',
    'Voice + tone: personality rules (consistent across all touchpoints)',
    'Brand promise: what customer gets + emotional benefit',
    'Storytelling: every brand has a hero, conflict, resolution',
    'Equity building: repeat consistent message (7+ exposures = recall)',
    'Differentiation: why choose you vs. competitors (clear, compelling)',
    'Trust signals: testimonials, certifications, longevity (reduce buyer risk)',
  ],
  reasoning: 'Strong brands command premium prices + loyalty through consistent identity + trust.',
  confidence: 94,
});

// ── Strategist ────────────────────────────────────────────────────────

export const strategistAdvice = (): ExpertAdvice => ({
  discipline: 'Strategy',
  guidance: [
    'SWOT analysis: quarterly review (Strengths, Weaknesses, Opportunities, Threats)',
    'Long-term vision: 3-year roadmap (milestones, metrics)',
    'Market positioning: where in market (premium, mass-market, niche)',
    'Competitive moat: what makes you defensible (hard to replicate)',
    'Growth vectors: organic, partnerships, acquisition (prioritized)',
    'Resource allocation: focus fire (80% effort on 20% that matters)',
    'Scenario planning: what if X competitor enters? What if Y regulation?',
    'Strategic review: bi-annual strategy deep-dive (adapt to market)',
  ],
  reasoning: 'Strategic clarity prevents wasted effort, ensures resources align with vision.',
  confidence: 93,
});

// ── Psychologist ──────────────────────────────────────────────────────

export const psychologistAdvice = (): ExpertAdvice => ({
  discipline: 'Psychology',
  guidance: [
    'Loss aversion: fear of loss stronger than hope of gain (use scarcity)',
    'Social proof: humans follow crowds (testimonials, user counts)',
    'Authority: credibility triggers trust (expert positioning, certifications)',
    'Reciprocity: give value first (free content builds obligation)',
    'Pattern interrupt: break monotony to grab attention (unexpected = memorable)',
    'Cognitive load: reduce decision friction (fewer options = more conversions)',
    'Emotional hooks: fear, hope, joy, anger (pick ONE emotion per message)',
    'Anchoring: first number influences perception (mention high price first)',
  ],
  reasoning: 'Human psychology drives behavior; understanding it multiplies persuasion impact.',
  confidence: 91,
});

// ── Data Analyst ──────────────────────────────────────────────────────

export const dataAnalystAdvice = (): ExpertAdvice => ({
  discipline: 'Data Analysis',
  guidance: [
    'Metrics hierarchy: 1 north star metric (growth/revenue/engagement)',
    'Tracking: implement before campaign (baseline vs. post comparison)',
    'Segmentation: analyze by cohort (new vs. returning, geo, device)',
    'Trend analysis: is metric going up/down? At what rate?',
    'Causation vs. correlation: correlation ≠ causation (test to isolate)',
    'Dashboards: real-time visibility (updated daily minimum)',
    'Statistical significance: sample size matters (don\'t trust tiny samples)',
    'Weekly cadence: review data, spot trends, adjust tactics',
  ],
  reasoning: 'Data-driven decisions eliminate guesswork, compound improvement over time.',
  confidence: 94,
});

// ── Sales Expert ──────────────────────────────────────────────────────

export const salesExpertAdvice = (): ExpertAdvice => ({
  discipline: 'Sales',
  guidance: [
    'Discovery: ask questions, listen (understand customer problem first)',
    'Pain points: identify 3+ specific pain points (match to solution)',
    'Value articulation: how does solution reduce pain? (quantify if possible)',
    'Objection handling: reframe objections as opportunity (not defense)',
    'Urgency: legitimate time constraints (seasonal, budget cycles, etc)',
    'Social proof: case studies from similar customers (relatability high)',
    'Trial/demo: lower purchase barrier (let customer experience value)',
    'Follow-up: persistence wins (most deals need 5+ touches)',
  ],
  reasoning: 'Sales success requires empathy, listening, and relentless follow-up.',
  confidence: 90,
});

// ── Expert Registry ───────────────────────────────────────────────────

export const expertRegistry = {
  admin: adminExpertAdvice,
  marketing: marketingExpertAdvice,
  visual: visualCommunicatorAdvice,
  design: designMaestroAdvice,
  photography: photographyExpertAdvice,
  branding: brandingSpecialistAdvice,
  strategy: strategistAdvice,
  psychology: psychologistAdvice,
  data: dataAnalystAdvice,
  sales: salesExpertAdvice,
};

export const getAllExpertAdvice = (): ExpertAdvice[] => {
  return Object.values(expertRegistry).map((fn) => fn());
};

export const getExpertAdvice = (discipline: keyof typeof expertRegistry): ExpertAdvice | null => {
  const fn = expertRegistry[discipline];
  return fn ? fn() : null;
};

export const getMultiExpertAdvice = (disciplines: (keyof typeof expertRegistry)[]): ExpertAdvice[] => {
  return disciplines.map((d) => getExpertAdvice(d)).filter((advice): advice is ExpertAdvice => advice !== null);
};

log.info('[Expert Registry] Initialized with 10 disciplines');
