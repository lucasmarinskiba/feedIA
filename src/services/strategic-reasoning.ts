/**
 * Strategic Reasoning Engine
 * Multi-dimensional analysis: competitors, pricing, budget, positioning
 */

export interface CompetitorProfile {
  name: string;
  pricing: number; // monthly USD
  features: string[];
  positioning: string;
  weaknesses: string[];
}

export interface StrategicContext {
  ourPrice: number;
  ourFeatures: string[];
  competitorCount: number;
  marketSize: number; // est. users
  growthRate: number; // % month-over-month
}

export interface PricingRecommendation {
  recommendedPrice: number;
  rationale: string;
  pricePoints: Array<{ price: number; elasticity: string }>;
  competitivePosition: 'premium' | 'value' | 'disruptor';
}

export interface BudgetAllocation {
  marketing: number; // % of revenue
  product: number;
  ops: number;
  reserve: number;
  rationale: string;
}

export interface PositioningStatement {
  coreMessage: string;
  targetSegment: string;
  defensibleAdvantage: string;
  vs: string; // main competitor
  nextSteps: string[];
}

/**
 * Analyze competitors in market
 */
export const analyzeCompetitors = (competitors: CompetitorProfile[]): {
  averagePrice: number;
  priceRange: [number, number];
  topThreats: CompetitorProfile[];
  gapOpportunities: string[];
} => {
  const prices = competitors.map((c) => c.pricing);
  const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;

  // Threats: high pricing + many features
  const threats = competitors
    .sort((a, b) => (b.features.length + b.pricing / 100) - (a.features.length + a.pricing / 100))
    .slice(0, 3);

  // Gap opportunities: features claimed but missing in top 3
  const allFeatures = new Set(competitors.flatMap((c) => c.features));
  const threatFeatures = new Set(threats.flatMap((c) => c.features));
  const gaps = Array.from(allFeatures).filter((f) => !threatFeatures.has(f));

  return {
    averagePrice: Math.round(avgPrice),
    priceRange: [Math.min(...prices), Math.max(...prices)],
    topThreats: threats,
    gapOpportunities: gaps.slice(0, 5),
  };
};

/**
 * Recommend pricing strategy
 */
export const recommendPricing = (context: StrategicContext, competitors: CompetitorProfile[]): PricingRecommendation => {
  const analysis = analyzeCompetitors(competitors);

  // Pricing strategy logic
  let recommendedPrice = context.ourPrice;
  let position: 'premium' | 'value' | 'disruptor' = 'value';

  // If we have +2 competitive advantages, premium positioning
  const advantageCount = context.ourFeatures.length - (analysis.topThreats[0]?.features.length || 0);
  if (advantageCount > 2) {
    recommendedPrice = Math.ceil(analysis.averagePrice * 1.3); // 30% premium
    position = 'premium';
  }
  // If market < 10 competitors, disrupt with 40% below average
  else if (competitors.length < 10) {
    recommendedPrice = Math.ceil(analysis.averagePrice * 0.6);
    position = 'disruptor';
  }
  // Otherwise value position: match or 10% below average
  else {
    recommendedPrice = Math.ceil(analysis.averagePrice * 0.9);
    position = 'value';
  }

  const pricePoints = [
    { price: Math.ceil(recommendedPrice * 0.7), elasticity: 'high (high volume, low margin)' },
    { price: recommendedPrice, elasticity: 'medium (recommended)' },
    { price: Math.ceil(recommendedPrice * 1.4), elasticity: 'low (premium tier)' },
  ];

  const rationale =
    position === 'premium'
      ? `Strong feature advantage (${advantageCount}+ unique). Premium pricing justified.`
      : position === 'disruptor'
        ? `Small market (${competitors.length} competitors). Undercut ${Math.round((1 - 0.6) * 100)}% to capture share.`
        : `Market average $${analysis.averagePrice}. Value position = $${recommendedPrice} (10% discount).`;

  return {
    recommendedPrice,
    rationale,
    pricePoints,
    competitivePosition: position,
  };
};

/**
 * Allocate budget based on growth stage
 */
export const allocateBudget = (monthlyRevenue: number, growthRate: number): BudgetAllocation => {
  // Early stage (< 10% MoM): invest in product + marketing
  // Mid stage (10-50% MoM): balance all four
  // Late stage (> 50% MoM): ops + reserve (sustain momentum)

  let marketing = 0,
    product = 0,
    ops = 0,
    reserve = 0;
  let rationale = '';

  if (growthRate < 10) {
    // Bootstrap: 40% product, 35% marketing, 15% ops, 10% reserve
    marketing = 35;
    product = 40;
    ops = 15;
    reserve = 10;
    rationale = 'Early growth. Heavy product investment (40%) + marketing (35%) to accelerate MoM.';
  } else if (growthRate < 50) {
    // Scale: 30% each, 10% reserve
    marketing = 30;
    product = 30;
    ops = 30;
    reserve = 10;
    rationale = 'Mid-stage scaling. Balanced allocation across all three pillars.';
  } else {
    // Rocket: 20% marketing, 20% product, 40% ops, 20% reserve
    marketing = 20;
    product = 20;
    ops = 40;
    reserve = 20;
    rationale = `Hypergrowth (${growthRate}% MoM). Ops-heavy (40%) to handle scale. Protect cash (20% reserve).`;
  }

  return {
    marketing,
    product,
    ops,
    reserve,
    rationale,
  };
};

/**
 * Generate positioning statement
 */
export const positionAgainstCompetitors = (
  ourFeatures: string[],
  mainCompetitor: CompetitorProfile,
  targetSegment: string,
): PositioningStatement => {
  // Find unique features we have that competitor lacks
  const uniqueFeatures = ourFeatures.filter((f) => !mainCompetitor.features.includes(f));

  // Build positioning
  const defensibleAdvantage = uniqueFeatures[0] || 'Better UX + Faster support';
  const coreMessage =
    targetSegment === 'enterprise'
      ? `Enterprise-grade ${defensibleAdvantage.toLowerCase()} at mid-market price.`
      : targetSegment === 'creator'
        ? `Creators first. ${defensibleAdvantage} built in from day 1.`
        : `${defensibleAdvantage}. No complexity. Focus on what matters.`;

  const nextSteps = [
    'Validate defensible advantage with 5 customer interviews',
    `Create comparison matrix: us vs ${mainCompetitor.name}`,
    'Test messaging on LinkedIn + Twitter',
    'Build case studies highlighting unique advantage',
    'Price 20% below if value position, 30% above if premium',
  ];

  return {
    coreMessage,
    targetSegment,
    defensibleAdvantage,
    vs: mainCompetitor.name,
    nextSteps,
  };
};

/**
 * Full strategic analysis (all three dimensions)
 */
export const runFullAnalysis = (
  context: StrategicContext,
  competitors: CompetitorProfile[],
  targetSegment: string,
): {
  competitiveAnalysis: ReturnType<typeof analyzeCompetitors>;
  pricingRecommendation: PricingRecommendation;
  budgetAllocation: BudgetAllocation;
  positioning: PositioningStatement;
} => {
  const competitiveAnalysis = analyzeCompetitors(competitors);
  const pricingRecommendation = recommendPricing(context, competitors);
  const budgetAllocation = allocateBudget(context.marketSize * 50, context.growthRate); // est. revenue
  const positioning = positionAgainstCompetitors(context.ourFeatures, competitors[0], targetSegment);

  return {
    competitiveAnalysis,
    pricingRecommendation,
    budgetAllocation,
    positioning,
  };
};
