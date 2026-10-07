/**
 * Audience Growth Trajectory — Phase 16
 * Proyecta followers 30/60/90 días
 */

export interface GrowthScenario {
  scenario: 'current-pace' | 'optimistic' | 'conservative';
  label: string;
  description: string;
  projectedFollowers: {
    '30days': number;
    '60days': number;
    '90days': number;
  };
  followerGain: {
    '30days': number;
    '60days': number;
    '90days': number;
  };
  monthlyGrowthRate: number; // %
  keyAssumptions: string[];
}

export interface AudienceGrowthTrajectory {
  currentFollowers: number;
  currentGrowthRate: number; // % per month
  scenarios: GrowthScenario[];
  mostLikely: GrowthScenario;
  optimisticCaseFollowers90: number;
  timeToMilestones: {
    '10K': string; // "2 months"
    '50K': string;
    '100K': string;
  };
  recommendations: string[];
}

export const projectAudienceGrowth = (
  currentFollowers: number = 12000,
  currentGrowthRate: number = 0.15, // 15% per month
): AudienceGrowthTrajectory => {
  // Current pace scenario
  const currentPace: GrowthScenario = {
    scenario: 'current-pace',
    label: 'Current Pace (No changes)',
    description: 'Continues at current 15% monthly growth rate',
    projectedFollowers: {
      '30days': Math.round(currentFollowers * (1 + currentGrowthRate)),
      '60days': Math.round(currentFollowers * Math.pow(1 + currentGrowthRate, 2)),
      '90days': Math.round(currentFollowers * Math.pow(1 + currentGrowthRate, 3)),
    },
    followerGain: {
      '30days': Math.round(currentFollowers * currentGrowthRate),
      '60days': Math.round(currentFollowers * (Math.pow(1 + currentGrowthRate, 2) - 1)),
      '90days': Math.round(currentFollowers * (Math.pow(1 + currentGrowthRate, 3) - 1)),
    },
    monthlyGrowthRate: currentGrowthRate * 100,
    keyAssumptions: [
      'Posting consistency maintained (Phase 11)',
      'Engagement rate stable',
      'No major algorithm shifts',
    ],
  };

  // Optimistic scenario (apply Phase 13 recommendations)
  const boostedRate = currentGrowthRate * 1.4; // 40% boost from optimizations
  const optimistic: GrowthScenario = {
    scenario: 'optimistic',
    label: 'Optimistic (After Phase 13 optimization)',
    description: 'Applies account health improvements + repurposing (Phase 15)',
    projectedFollowers: {
      '30days': Math.round(currentFollowers * (1 + boostedRate)),
      '60days': Math.round(currentFollowers * Math.pow(1 + boostedRate, 2)),
      '90days': Math.round(currentFollowers * Math.pow(1 + boostedRate, 3)),
    },
    followerGain: {
      '30days': Math.round(currentFollowers * boostedRate),
      '60days': Math.round(currentFollowers * (Math.pow(1 + boostedRate, 2) - 1)),
      '90days': Math.round(currentFollowers * (Math.pow(1 + boostedRate, 3) - 1)),
    },
    monthlyGrowthRate: boostedRate * 100,
    keyAssumptions: [
      'Apply Phase 13 recommendations',
      'Implement Phase 15 repurposing',
      'Content quality improves 15%+',
      'Hashtag strategy optimized',
    ],
  };

  // Conservative scenario (slower growth)
  const reducedRate = currentGrowthRate * 0.7;
  const conservative: GrowthScenario = {
    scenario: 'conservative',
    label: 'Conservative (Algorithm headwinds)',
    description: 'Algorithm changes or market saturation',
    projectedFollowers: {
      '30days': Math.round(currentFollowers * (1 + reducedRate)),
      '60days': Math.round(currentFollowers * Math.pow(1 + reducedRate, 2)),
      '90days': Math.round(currentFollowers * Math.pow(1 + reducedRate, 3)),
    },
    followerGain: {
      '30days': Math.round(currentFollowers * reducedRate),
      '60days': Math.round(currentFollowers * (Math.pow(1 + reducedRate, 2) - 1)),
      '90days': Math.round(currentFollowers * (Math.pow(1 + reducedRate, 3) - 1)),
    },
    monthlyGrowthRate: reducedRate * 100,
    keyAssumptions: ['Algorithm deprioritizes account', 'Market saturation increases', 'Engagement decline 20%'],
  };

  const scenarios = [optimistic, currentPace, conservative];

  // Time to milestones
  const calcTimeToFollowers = (target: number, rate: number): string => {
    if (currentFollowers >= target) return 'Already reached';
    const months = Math.log(target / currentFollowers) / Math.log(1 + rate);
    return months < 1 ? 'This month' : `${Math.round(months)} months`;
  };

  const recommendations = [
    `📈 Actual crecimiento: ${currentGrowthRate * 100}%/mes. Proyección 90d: ${optimistic.projectedFollowers['90days'].toLocaleString()} followers (optimista)`,
    `🎯 Hito 10K: ${calcTimeToFollowers(10000, currentGrowthRate)}. Hito 50K: ${calcTimeToFollowers(50000, boostedRate)}`,
    `⚡ Boost esperado: aplicar Phase 13 = +40% growth rate. Diferencia 90d: +${(optimistic.projectedFollowers['90days'] - currentPace.projectedFollowers['90days']).toLocaleString()} followers`,
    `🔄 Roadmap: Week 1-2 health score fixes, Week 3-6 repurposing ramp, Week 7-12 scaling`,
    `⚠️ Risk: Algorithm headwinds podrían reducir a ${conservative.projectedFollowers['90days'].toLocaleString()} followers. Mitigar con diversidad de contenido`,
  ];

  return {
    currentFollowers,
    currentGrowthRate,
    scenarios,
    mostLikely: optimistic,
    optimisticCaseFollowers90: optimistic.projectedFollowers['90days'],
    timeToMilestones: {
      '10K': calcTimeToFollowers(10000, currentGrowthRate),
      '50K': calcTimeToFollowers(50000, boostedRate),
      '100K': calcTimeToFollowers(100000, boostedRate),
    },
    recommendations,
  };
};
