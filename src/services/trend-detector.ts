/**
 * Trend Detector Engine
 * Monitor trends → surface emerging topics, declining trends, seasonal patterns
 */

export interface Trend {
  trendId: string;
  name: string;
  category: string;
  momentum: number; // -1 to 1 (declining to exploding)
  volume: number; // Search/mention count
  trajectory: 'emerging' | 'accelerating' | 'plateauing' | 'declining';
  predictedPeakDate?: string;
  relatedKeywords: string[];
  opportunityWindow: string;
}

export interface TrendAnalysis {
  reportDate: string;
  trendingNow: Trend[];
  emerging: Trend[];
  declining: Trend[];
  seasonal: Array<{ trend: string; predictedPeak: string; impact: number }>;
  recommendations: string[];
}

const trendHistory: Map<string, Trend[]> = new Map();
const currentTrends: Map<string, Trend> = new Map();

export const detectTrend = (name: string, category: string, volume: number, keywords: string[]): Trend => {
  const trendId = `trend_${name.toLowerCase()}_${Date.now()}`;

  // Calculate momentum (simplified: compare to historical average)
  const historicalData = trendHistory.get(name) ?? [];
  const avgHistoricalVolume = historicalData.reduce((sum, t) => sum + t.volume, 0) / Math.max(historicalData.length, 1);
  const momentum = Math.min(1, Math.max(-1, (volume - avgHistoricalVolume) / Math.max(avgHistoricalVolume, 1)));

  // Determine trajectory
  let trajectory: 'emerging' | 'accelerating' | 'plateauing' | 'declining' = 'plateauing';
  if (momentum > 0.5) trajectory = 'accelerating';
  if (momentum > 0.2 && momentum <= 0.5) trajectory = 'emerging';
  if (momentum < -0.3) trajectory = 'declining';

  // Estimate peak date
  let predictedPeakDate: string | undefined;
  if (trajectory === 'accelerating' || trajectory === 'emerging') {
    const peakDate = new Date();
    peakDate.setDate(peakDate.getDate() + Math.floor(Math.random() * 30) + 7); // 7-37 days
    predictedPeakDate = peakDate.toISOString();
  }

  // Opportunity window
  const opportunityWindow =
    trajectory === 'emerging' ? '7-14 days (get in early)' : trajectory === 'accelerating' ? '3-7 days (peak period)' : '1-3 days (declining)';

  const trend: Trend = {
    trendId,
    name,
    category,
    momentum,
    volume,
    trajectory,
    predictedPeakDate,
    relatedKeywords: keywords,
    opportunityWindow,
  };

  currentTrends.set(name, trend);

  if (!trendHistory.has(name)) trendHistory.set(name, []);
  trendHistory.get(name)!.push(trend);

  console.log('[TrendDetector] Trend detected:', { name, trajectory, momentum });

  return trend;
};

export const analyzeTrends = (): TrendAnalysis => {
  const trends = Array.from(currentTrends.values());

  // Sort by momentum
  const sortedByMomentum = [...trends].sort((a, b) => b.momentum - a.momentum);

  // Categorize
  const trendingNow = sortedByMomentum.filter((t) => t.trajectory === 'accelerating' || t.trajectory === 'plateauing').slice(0, 5);
  const emerging = sortedByMomentum.filter((t) => t.trajectory === 'emerging').slice(0, 5);
  const declining = sortedByMomentum.filter((t) => t.trajectory === 'declining').slice(0, 3);

  // Seasonal predictions (simplified)
  const seasonal: Array<{ trend: string; predictedPeak: string; impact: number }> = [
    { trend: 'holiday-shopping', predictedPeak: '2026-12-01', impact: 0.95 },
    { trend: 'new-year-fitness', predictedPeak: '2027-01-15', impact: 0.85 },
    { trend: 'summer-travel', predictedPeak: '2026-07-01', impact: 0.8 },
  ];

  // Recommendations
  const recommendations: string[] = [];
  if (emerging.length > 0) {
    recommendations.push(`Emerging trends (${emerging.map((t) => t.name).join(', ')})—enter early for first-mover advantage`);
  }
  if (trendingNow.length > 0) {
    recommendations.push(`Riding ${trendingNow[0]?.name}—high volume but competition increasing`);
  }
  if (declining.length > 0) {
    recommendations.push(`Avoid declining trends—${declining.map((t) => t.name).join(', ')}`);
  }

  return {
    reportDate: new Date().toISOString(),
    trendingNow,
    emerging,
    declining,
    seasonal,
    recommendations,
  };
};

export const predictTrendLifecycle = (trendName: string): { phases: Array<{ phase: string; duration: string; engagement: number }>; recommendation: string } => {
  const trend = currentTrends.get(trendName);
  if (!trend) {
    return {
      phases: [],
      recommendation: 'Trend not found',
    };
  }

  const phases = [
    { phase: 'emergence', duration: '3-7 days', engagement: 0.4 },
    { phase: 'acceleration', duration: '7-14 days', engagement: 0.85 },
    { phase: 'peak', duration: '2-5 days', engagement: 1.0 },
    { phase: 'plateau', duration: '5-10 days', engagement: 0.7 },
    { phase: 'decline', duration: '3-7 days', engagement: 0.3 },
  ];

  let recommendation = 'Monitor trend closely';
  if (trend.trajectory === 'emerging') recommendation = 'RECOMMENDED: Post immediately to capture early engagement';
  if (trend.trajectory === 'accelerating') recommendation = 'Post now while momentum is strong';
  if (trend.trajectory === 'declining') recommendation = 'Do not recommend—trend declining rapidly';

  return { phases, recommendation };
};

export const getTrendingByNiche = (niche: string): Trend[] => {
  return Array.from(currentTrends.values())
    .filter((t) => t.category.toLowerCase().includes(niche.toLowerCase()))
    .sort((a, b) => b.momentum - a.momentum);
};
