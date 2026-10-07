/**
 * Account Health Scorecard — Phase 13
 * Diagnóstico holístico de la salud de la cuenta (0-100)
 */

export interface HealthFactor {
  name: string;
  score: number; // 0-100
  status: 'critical' | 'weak' | 'fair' | 'good' | 'excellent';
  description: string;
  gap?: number; // Puntos para alcanzar "good" (75+)
}

export interface HealthWeakness {
  factor: string;
  issue: string;
  priority: 'high' | 'medium' | 'low';
  actionable: string;
  expectedImpact: string; // "+15 health points if fixed"
}

export interface AccountHealthScorecard {
  overallScore: number; // 0-100
  overallStatus: 'critical' | 'at-risk' | 'fair' | 'healthy' | 'excellent';
  factors: HealthFactor[];
  percentile: number; // vs industry benchmark (0-100)
  topWeaknesses: HealthWeakness[];
  roadmapPhases: string[];
  recommendations: string[];
}

const getStatus = (score: number): 'critical' | 'weak' | 'fair' | 'good' | 'excellent' => {
  if (score < 40) return 'critical';
  if (score < 55) return 'weak';
  if (score < 70) return 'fair';
  if (score < 85) return 'good';
  return 'excellent';
};

const getOverallStatus = (score: number): 'critical' | 'at-risk' | 'fair' | 'healthy' | 'excellent' => {
  if (score < 40) return 'critical';
  if (score < 55) return 'at-risk';
  if (score < 70) return 'fair';
  if (score < 85) return 'healthy';
  return 'excellent';
};

export const calculateAccountHealth = (
  contentQuality: number = 62,
  engagementHealth: number = 58,
  growthTrajectory: number = 65,
  audienceFit: number = 71,
  postingConsistency: number = 48,
  nicheClarityscore: number = 60,
  monetizationReadiness: number = 42,
  trendAlignment: number = 55,
): AccountHealthScorecard => {
  const factors: HealthFactor[] = [
    {
      name: 'Content Quality',
      score: contentQuality,
      status: getStatus(contentQuality),
      description: 'Estructura narrativa, densidad emocional, copywriting',
      gap: Math.max(0, 75 - contentQuality),
    },
    {
      name: 'Engagement Health',
      score: engagementHealth,
      status: getStatus(engagementHealth),
      description: 'Saves/shares ratio, comment depth, audience interaction',
      gap: Math.max(0, 75 - engagementHealth),
    },
    {
      name: 'Growth Trajectory',
      score: growthTrajectory,
      status: getStatus(growthTrajectory),
      description: 'Velocity de followers, trending up/down/flat',
      gap: Math.max(0, 75 - growthTrajectory),
    },
    {
      name: 'Audience Fit',
      score: audienceFit,
      status: getStatus(audienceFit),
      description: '% contenido aligns con persona dominante',
      gap: Math.max(0, 75 - audienceFit),
    },
    {
      name: 'Posting Consistency',
      score: postingConsistency,
      status: getStatus(postingConsistency),
      description: 'Frecuencia vs plan óptimo, calendario adherence',
      gap: Math.max(0, 75 - postingConsistency),
    },
    {
      name: 'Niche Clarity',
      score: nicheClarityscore,
      status: getStatus(nicheClarityscore),
      description: 'Cuán definido es el nicho, confusión vs clarity',
      gap: Math.max(0, 75 - nicheClarityscore),
    },
    {
      name: 'Monetization Readiness',
      score: monetizationReadiness,
      status: getStatus(monetizationReadiness),
      description: 'Followers, engagement, tema viability para ingresos',
      gap: Math.max(0, 75 - monetizationReadiness),
    },
    {
      name: 'Trend Alignment',
      score: trendAlignment,
      status: getStatus(trendAlignment),
      description: 'Relevancia vs trending topics, cultural timing',
      gap: Math.max(0, 75 - trendAlignment),
    },
  ];

  const overallScore = Math.round(factors.reduce((sum, f) => sum + f.score, 0) / factors.length);
  const overallStatus = getOverallStatus(overallScore);

  // Percentile vs industry benchmark
  const industryAvg = 65;
  const percentile = Math.min(100, Math.round((overallScore / industryAvg) * 50) + 25);

  // Top weaknesses (lowest scores)
  const topWeaknesses: HealthWeakness[] = factors
    .sort((a, b) => a.score - b.score)
    .slice(0, 3)
    .map((f) => ({
      factor: f.name,
      issue: `${f.name} at ${f.score}/100 (${f.status})`,
      priority: f.score < 40 ? 'high' : f.score < 60 ? 'medium' : 'low',
      actionable:
        f.name === 'Posting Consistency'
          ? 'Increase to 5x/week minimum, batch content 2w ahead'
          : f.name === 'Monetization Readiness'
            ? 'Reach 10K+ followers, audit audience demographics'
            : f.name === 'Niche Clarity'
              ? 'Choose one lane, eliminate 30% of conflicting content'
              : `Focus improvements on ${f.name}`,
      expectedImpact: `+${Math.min(25, f.gap || 15)} health points`,
    }));

  // Roadmap phases (prioritized)
  const roadmapPhases = [
    `Phase 1 (Weeks 1-4): ${topWeaknesses[0]?.actionable || 'Fix top weakness'}`,
    `Phase 2 (Weeks 5-8): ${topWeaknesses[1]?.actionable || 'Fix second weakness'}`,
    `Phase 3 (Weeks 9-12): ${topWeaknesses[2]?.actionable || 'Fix third weakness'}`,
    `Phase 4 (Weeks 13+): Optimization — push all factors to 80+`,
  ];

  const recommendations: string[] = [
    `📊 Account health: ${overallScore}/100 (${overallStatus.toUpperCase()}). Percentil: ${percentile}th vs industry.`,
    `🎯 Top 3 weaknesses: ${topWeaknesses.map((w) => w.factor).join(', ')}.`,
    `⚡ Quick wins: ${topWeaknesses[0]?.factor} is highest priority. ${topWeaknesses[0]?.expectedImpact}`,
    `📈 Growth potential: Reach 90/100 = 2-3x revenue potential unlocked.`,
    `🔄 Recheck health: Monthly scorecard (after each optimization phase).`,
  ];

  return {
    overallScore,
    overallStatus,
    factors,
    percentile,
    topWeaknesses,
    roadmapPhases,
    recommendations,
  };
};
