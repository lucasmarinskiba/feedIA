/**
 * Engagement Forecasting Engine
 * Predict performance before posting (format + topic + audience + time)
 */

export interface EngagementForecast {
  promptId: string;
  format: string;
  topic: string;
  platform: string;
  audience: string;
  postingTime: string;
  forecastedEngagement: number;
  forecastedImpressions: number;
  forecastedConversions: number;
  confidenceScore: number;
  riskFactors: string[];
  recommendations: string[];
}

export interface ForecastInput {
  format: 'carousel' | 'reel' | 'story' | 'static';
  topic: string;
  platform: 'instagram' | 'tiktok' | 'pinterest';
  audience: string;
  postingTime: string;
  historicalEngagementRate?: number;
  seasonalFactor?: number;
}

export interface PerformanceBenchmark {
  format: string;
  platform: string;
  avgEngagement: number;
  avgImpressions: number;
  avgConversions: number;
  variability: number;
}

// Forecast history
const forecastHistory: EngagementForecast[] = [];
const benchmarks: Map<string, PerformanceBenchmark> = new Map();

// Initialize with standard benchmarks
const initializeBenchmarks = (): void => {
  const standardBenchmarks = [
    { format: 'carousel', platform: 'instagram', avgEngagement: 0.12, avgImpressions: 8000, avgConversions: 320, variability: 0.35 },
    { format: 'reel', platform: 'instagram', avgEngagement: 0.18, avgImpressions: 12000, avgConversions: 480, variability: 0.4 },
    { format: 'story', platform: 'instagram', avgEngagement: 0.22, avgImpressions: 15000, avgConversions: 600, variability: 0.45 },
    { format: 'reel', platform: 'tiktok', avgEngagement: 0.28, avgImpressions: 50000, avgConversions: 2000, variability: 0.5 },
    { format: 'carousel', platform: 'pinterest', avgEngagement: 0.08, avgImpressions: 5000, avgConversions: 200, variability: 0.3 },
  ];

  standardBenchmarks.forEach((bench) => {
    benchmarks.set(`${bench.format}-${bench.platform}`, bench);
  });
};

initializeBenchmarks();

export const forecastEngagement = (input: ForecastInput): EngagementForecast => {
  const promptId = `fc_${Date.now()}`;
  const benchmarkKey = `${input.format}-${input.platform}`;
  const benchmark = benchmarks.get(benchmarkKey);

  if (!benchmark) {
    throw new Error(`No benchmark for ${benchmarkKey}`);
  }

  // Base calculation
  const baseEngagement = benchmark.avgEngagement;
  const baseImpressions = benchmark.avgImpressions;

  // Adjustments
  const topicMultiplier = getTopicMultiplier(input.topic);
  const audienceMultiplier = getAudienceMultiplier(input.audience);
  const timeMultiplier = getTimeMultiplier(input.postingTime);
  const seasonalAdjustment = input.seasonalFactor ?? 1.0;

  const totalMultiplier = topicMultiplier * audienceMultiplier * timeMultiplier * seasonalAdjustment;

  const forecastedEngagement = Math.round(baseEngagement * totalMultiplier * 10000) / 100; // %
  const forecastedImpressions = Math.round(baseImpressions * totalMultiplier);
  const forecastedConversions = Math.round((forecastedImpressions * (baseEngagement * totalMultiplier)) / (2 * totalMultiplier)); // Simplified

  // Confidence based on data recency + multiplier extremes
  let confidence = 0.7;
  if (totalMultiplier > 1.5) confidence -= 0.15; // High multiplier = lower confidence
  if (totalMultiplier < 0.5) confidence -= 0.1; // Low multiplier = slightly lower confidence
  if (input.historicalEngagementRate) confidence += 0.15; // Historical data improves confidence

  // Risk assessment
  const riskFactors: string[] = [];
  if (totalMultiplier > 1.8) riskFactors.push('Forecast unusually optimistic—may underperform');
  if (input.topic.length > 50) riskFactors.push('Topic unclear—narrow focus recommended');
  if (timeMultiplier < 0.7) riskFactors.push('Posting time suboptimal—consider scheduling elsewhere');

  // Recommendations
  const recommendations: string[] = [];
  if (forecastedEngagement > 0.2) recommendations.push('Strong forecast—prioritize this content');
  if (forecastedConversions > 500) recommendations.push('High conversion potential—allocate budget');
  if (topicMultiplier > 1.2) recommendations.push(`Topic "${input.topic}" is trending—leverage this`);

  const forecast: EngagementForecast = {
    promptId,
    format: input.format,
    topic: input.topic,
    platform: input.platform,
    audience: input.audience,
    postingTime: input.postingTime,
    forecastedEngagement,
    forecastedImpressions,
    forecastedConversions,
    confidenceScore: confidence,
    riskFactors,
    recommendations,
  };

  forecastHistory.push(forecast);
  console.log('[EngagementForecasting] Forecast created:', { promptId, engagement: forecastedEngagement, confidence });

  return forecast;
};

export const compareForecastsForContent = (
  formats: Array<'carousel' | 'reel' | 'story' | 'static'>,
  topic: string,
  platform: 'instagram' | 'tiktok' | 'pinterest',
  audience: string,
  postingTime: string
): EngagementForecast[] => formats.map((format) =>
    forecastEngagement({
      format,
      topic,
      platform,
      audience,
      postingTime,
    })
  );

export const validateForecastAccuracy = (promptId: string, actualEngagement: number, actualImpressions: number): { accuracy: number; error: number } => {
  const forecast = forecastHistory.find((f) => f.promptId === promptId);
  if (!forecast) {
    throw new Error(`Forecast ${promptId} not found`);
  }

  const engagementError = Math.abs(forecast.forecastedEngagement - (actualEngagement * 100)) / forecast.forecastedEngagement;
  const impressionError = Math.abs(forecast.forecastedImpressions - actualImpressions) / forecast.forecastedImpressions;

  const accuracy = 1 - (engagementError + impressionError) / 2;

  console.log('[EngagementForecasting] Accuracy validated:', { promptId, accuracy });

  return { accuracy: Math.max(0, accuracy), error: (engagementError + impressionError) / 2 };
};

export const getAccuracyTrend = (): { trend: 'improving' | 'stable' | 'declining'; avgAccuracy: number } => {
  if (forecastHistory.length < 10) {
    return { trend: 'stable', avgAccuracy: 0.75 };
  }

  // Calculate rolling average accuracy
  const recent = forecastHistory.slice(-10);
  const older = forecastHistory.slice(-20, -10);

  // Simulate accuracy scoring
  const recentAccuracy = recent.reduce((sum, f) => sum + f.confidenceScore, 0) / recent.length;
  const olderAccuracy = older.reduce((sum, f) => sum + f.confidenceScore, 0) / older.length;

  let trend: 'improving' | 'stable' | 'declining' = 'stable';
  if (recentAccuracy > olderAccuracy + 0.05) trend = 'improving';
  else if (recentAccuracy < olderAccuracy - 0.05) trend = 'declining';

  return { trend, avgAccuracy: recentAccuracy };
};

// ============ HELPERS ============

const getTopicMultiplier = (topic: string): number => {
  const lower = topic.toLowerCase();

  if (lower.includes('before-after') || lower.includes('transformation')) return 1.4;
  if (lower.includes('trending') || lower.includes('viral')) return 1.3;
  if (lower.includes('tip') || lower.includes('tutorial')) return 1.15;
  if (lower.includes('educational') || lower.includes('howto')) return 1.1;
  if (lower.includes('entertaining') || lower.includes('funny')) return 1.25;
  if (lower.includes('promotional') || lower.includes('sale')) return 0.8;

  return 1.0;
};

const getAudienceMultiplier = (audience: string): number => {
  const lower = audience.toLowerCase();

  if (lower.includes('luxury') || lower.includes('premium')) return 1.2;
  if (lower.includes('gen z') || lower.includes('gen-z')) return 1.3;
  if (lower.includes('millennial')) return 1.15;
  if (lower.includes('professional') || lower.includes('b2b')) return 0.9;
  if (lower.includes('budget') || lower.includes('value')) return 0.85;

  return 1.0;
};

const getTimeMultiplier = (postingTime: string): number => {
  const date = new Date(postingTime);
  const hour = date.getHours();
  const day = date.getDay();

  // Peak hours: 6-9am, 12-1pm, 6-9pm
  let hourMultiplier = 0.8;
  if ((hour >= 6 && hour <= 9) || (hour >= 12 && hour <= 13) || (hour >= 18 && hour <= 21)) {
    hourMultiplier = 1.2;
  }

  // Peak days: Tue-Thu
  let dayMultiplier = 1.0;
  if (day >= 2 && day <= 4) dayMultiplier = 1.15;
  if (day === 0 || day === 6) dayMultiplier = 0.85;

  return hourMultiplier * dayMultiplier;
};
