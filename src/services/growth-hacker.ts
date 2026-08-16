/**
 * Growth Hacker Engine
 * Auto-identify growth levers → viral loops, referral mechanics, retention hacks
 */

export interface GrowthLever {
  leverId: string;
  name: string;
  type: 'viral' | 'referral' | 'retention' | 'monetization' | 'distribution';
  currentMetric: number;
  targetMetric: number;
  estimatedImpact: number; // 0-1 (multiplicative growth)
  effort: 'low' | 'medium' | 'high';
  timeToImplement: string;
  roiMultiplier: number;
}

export interface GrowthStrategy {
  strategyId: string;
  currentMetrics: { followers: number; engagement: number; conversions: number };
  projectedMetrics30Days: { followers: number; engagement: number; conversions: number };
  growthLevers: GrowthLever[];
  quickWins: GrowthLever[];
  longerTermPlays: GrowthLever[];
  monthlyGrowthTarget: number;
  recommendations: string[];
}

const appliedLevers: Map<string, GrowthLever> = new Map();

export const identifyGrowthLevers = (
  currentFollowers: number,
  engagementRate: number,
  conversionRate: number
): GrowthLever[] => {
  const levers: GrowthLever[] = [];

  // Viral loop: each follower invites 2 others (K-factor 2)
  levers.push({
    leverId: 'viral_invitation',
    name: 'Viral Invitation (K-factor 2)',
    type: 'viral',
    currentMetric: 1.0,
    targetMetric: 2.0,
    estimatedImpact: 1.5,
    effort: 'medium',
    timeToImplement: '2-4 weeks',
    roiMultiplier: 3.0,
  });

  // Referral bonus
  levers.push({
    leverId: 'referral_bonus',
    name: 'Referral Incentive ($10 credit)',
    type: 'referral',
    currentMetric: 0,
    targetMetric: 20,
    estimatedImpact: 1.3,
    effort: 'low',
    timeToImplement: '1 week',
    roiMultiplier: 2.5,
  });

  // Content repurposing for retention
  levers.push({
    leverId: 'retention_content',
    name: 'Weekly Digest (re-engagement)',
    type: 'retention',
    currentMetric: engagementRate,
    targetMetric: engagementRate * 1.4,
    estimatedImpact: 0.4,
    effort: 'low',
    timeToImplement: '5 days',
    roiMultiplier: 2.0,
  });

  // Upsell to premium
  levers.push({
    leverId: 'monetization_premium',
    name: 'Premium Subscription Tier',
    type: 'monetization',
    currentMetric: conversionRate,
    targetMetric: conversionRate * 1.2,
    estimatedImpact: 0.8,
    effort: 'high',
    timeToImplement: '4-6 weeks',
    roiMultiplier: 5.0,
  });

  // Cross-channel amplification
  levers.push({
    leverId: 'distribution_tiktok',
    name: 'TikTok Expansion (new audience)',
    type: 'distribution',
    currentMetric: 1,
    targetMetric: 800000,
    estimatedImpact: 2.0,
    effort: 'medium',
    timeToImplement: '4-8 weeks',
    roiMultiplier: 3.5,
  });

  return levers;
};

export const buildGrowthStrategy = (currentFollowers: number, engagementRate: number, conversionRate: number): GrowthStrategy => {
  const levers = identifyGrowthLevers(currentFollowers, engagementRate, conversionRate);

  // Quick wins: low effort, high ROI
  const quickWins = levers.filter((l) => l.effort === 'low' && l.roiMultiplier >= 2.0);

  // Longer-term: high effort, exponential growth
  const longerTermPlays = levers.filter((l) => l.effort === 'high' || (l.effort === 'medium' && l.estimatedImpact > 1.5));

  // Project 30-day metrics
  const appliedLeverImpact = quickWins.reduce((sum, l) => sum + l.estimatedImpact, 1);
  const monthlyGrowthTarget = Math.round(currentFollowers * (appliedLeverImpact - 1) * 100) / 100;

  const strategyId = `growth_${Date.now()}`;

  const strategy: GrowthStrategy = {
    strategyId,
    currentMetrics: {
      followers: currentFollowers,
      engagement: Math.round(engagementRate * 1000) / 10,
      conversions: Math.round(conversionRate * 1000) / 10,
    },
    projectedMetrics30Days: {
      followers: Math.round(currentFollowers * appliedLeverImpact),
      engagement: Math.round(engagementRate * 1000 * appliedLeverImpact) / 10,
      conversions: Math.round(conversionRate * 1000 * (appliedLeverImpact + 0.2)) / 10,
    },
    growthLevers: levers,
    quickWins,
    longerTermPlays,
    monthlyGrowthTarget,
    recommendations: [
      `Quick wins: ${quickWins.map((l) => l.name).join(', ')} (implement this week)`,
      `Longer-term: ${longerTermPlays.map((l) => l.name).join(', ')} (30+ days)`,
      `Expected growth: ${monthlyGrowthTarget.toLocaleString()} new followers in 30 days`,
      'Monitor viral coefficient daily—adjust if dropping',
    ],
  };

  console.log('[GrowthHacker] Strategy created:', { strategyId, monthlyGrowthTarget });

  return strategy;
};

export const calculateViralCoefficient = (invites: number, signups: number): { coefficient: number; doubleTime: string } => {
  const coefficient = invites / Math.max(signups, 1);

  // Doubling time estimate (based on coefficient)
  let doubleTime = 'Never doubles (K < 1)';
  if (coefficient >= 1) {
    const days = Math.log(2) / Math.log(coefficient + 1);
    doubleTime = `~${Math.round(days)} days`;
  }

  return { coefficient: Math.round(coefficient * 100) / 100, doubleTime };
};

export const priorizeGrowthLevers = (levers: GrowthLever[]): GrowthLever[] => {
  // Priority: (ROI × impact) / effort_score
  const scored = levers.map((l) => {
    const effortScore = l.effort === 'low' ? 1 : l.effort === 'medium' ? 3 : 5;
    const priority = (l.roiMultiplier * l.estimatedImpact) / effortScore;
    return { ...l, priority };
  });

  return scored.sort((a, b) => b.priority - a.priority);
};
