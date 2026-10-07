/**
 * Viral Coefficient Score — Phase 14
 * Predice viralidad (0-100) ANTES de publicar
 */

export interface ViralityFactors {
  hookScore: number; // 0-100 (Phase 6)
  contentQuality: number; // 0-100 (Phase 2)
  personaFit: number; // 0-100 (Phase 9)
  engagementTrend: number; // 0-100 (Phase 3)
  hashtagStrength: number; // 0-100 (Phase 10)
  accountHealth: number; // 0-100 (Phase 13)
  trendAlignment: number; // 0-100 (Phase 8)
}

export interface ViralCoefficientResult {
  overallViralScore: number; // 0-100
  viralProbability: string; // "Very Low", "Low", "Moderate", "High", "Very High"
  confidence: number; // 0-100
  factorBreakdown: Record<string, { score: number; weight: number; contribution: number }>;
  topViraDrivers: string[];
  topBottlenecks: string[];
  actionableOptimizations: string[];
  recommendation: string;
}

const calculateWeightedScore = (factors: ViralityFactors): ViralCoefficientResult => {
  const weights = {
    hookScore: 0.25, // Hook is 25% of virality
    contentQuality: 0.2,
    personaFit: 0.15,
    engagementTrend: 0.15,
    hashtagStrength: 0.1,
    accountHealth: 0.1,
    trendAlignment: 0.05,
  };

  const factorBreakdown: Record<string, { score: number; weight: number; contribution: number }> = {};
  let totalScore = 0;

  Object.entries(weights).forEach(([key, weight]) => {
    const score = factors[key as keyof ViralityFactors];
    const contribution = (score * weight) / 100;
    factorBreakdown[key] = { score, weight: weight * 100, contribution: contribution * 100 };
    totalScore += contribution;
  });

  const overallViralScore = Math.round(totalScore * 100);

  const viralProbability =
    overallViralScore < 20
      ? 'Very Low'
      : overallViralScore < 40
        ? 'Low'
        : overallViralScore < 60
          ? 'Moderate'
          : overallViralScore < 80
            ? 'High'
            : 'Very High';

  const confidence = Math.round(Math.min(95, 50 + (factors.accountHealth + factors.engagementTrend) / 4));

  // Top drivers (highest scoring factors)
  const factorScores = [
    { name: 'Hook Strength', score: factors.hookScore },
    { name: 'Content Quality', score: factors.contentQuality },
    { name: 'Persona Fit', score: factors.personaFit },
    { name: 'Engagement Trend', score: factors.engagementTrend },
    { name: 'Hashtag Strength', score: factors.hashtagStrength },
    { name: 'Account Health', score: factors.accountHealth },
    { name: 'Trend Alignment', score: factors.trendAlignment },
  ];

  const topViraDrivers = factorScores
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((f) => `${f.name} (${f.score}/100)`);

  const topBottlenecks = factorScores
    .sort((a, b) => a.score - b.score)
    .slice(0, 3)
    .map((f) => `${f.name} (${f.score}/100)`);

  const actionableOptimizations: string[] = [];

  if (factors.hookScore < 70) actionableOptimizations.push('Refuerza hook: agrega números + open loop');
  if (factors.contentQuality < 65) actionableOptimizations.push('Estructura 3 actos: problema → insight → solución');
  if (factors.personaFit < 60) actionableOptimizations.push('Alinea con persona dominante (Phase 9)');
  if (factors.hashtagStrength < 65) actionableOptimizations.push('Agrega hashtags trending + niche (Phase 10)');
  if (factors.accountHealth < 70) actionableOptimizations.push('Mejora account health score (Phase 13)');

  const recommendation =
    overallViralScore >= 80
      ? '🚀 POST NOW: Alta probabilidad de viralidad. Publica inmediatamente.'
      : overallViralScore >= 60
        ? '✅ GOOD: Moderada-Alta viralidad esperada. Publicable.'
        : overallViralScore >= 40
          ? '🔄 OPTIMIZE: Puedes mejorar antes de publicar. Aplica optimizaciones.'
          : '⏸️ REWORK: Baja viralidad esperada. Revisa completamente.';

  return {
    overallViralScore,
    viralProbability,
    confidence,
    factorBreakdown,
    topViraDrivers,
    topBottlenecks,
    actionableOptimizations,
    recommendation,
  };
};

export const calculateViralCoefficient = (factors: ViralityFactors): ViralCoefficientResult =>
  calculateWeightedScore(factors);
