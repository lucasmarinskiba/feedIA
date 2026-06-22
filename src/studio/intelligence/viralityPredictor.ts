/**
 * Virality Predictor Engine
 *
 * Models: Viral Coefficient R₀ (epidemiology), S-curve logistic growth,
 * exponential content decay, Bayesian viral probability, feature attribution.
 *
 * Science refs: SIR model adapted for social networks; Watts-Dodds threshold model;
 * Firth et al. (2020) content virality features.
 */

import type { NicheCategory } from './nicheAnalyzer.js';
import { contentAlgorithmAgent } from './contentAlgorithmAgent.js';

// ── Types ────────────────────────────────────────────────────────────────────

export interface ViralityFeatures {
  hookScore: number; // 0-10 from hookEnforcer
  completionRatePct: number; // % of viewers watching to end (0-100)
  saveRatePct: number; // saves / views × 100
  shareRatePct: number; // shares / views × 100
  commentRatePct: number; // comments / views × 100
  trendAlignmentScore: number; // 0-10 — how on-trend is content
  postingTimingScore: number; // 0-10 — time-of-day/week alignment
  formatPlatformFit: number; // 0-10 — reel/carousel × platform match
  audienceResonanceScore: number; // 0-10 — psychographic match
  initialEngagementVelocity: number; // (likes+comments) in first 30min per 1K reach
}

export interface ViralCoefficient {
  R0: number; // Viral reproduction number (>1 = viral spread)
  interpretation: 'contained' | 'slow-spread' | 'viral' | 'hyper-viral';
  expectedReachMultiplier: number; // e.g., 3.5 = 3.5× organic reach
  viralThresholdMet: boolean;
  spreadGenerations: number; // How many "generations" of sharing before decay
}

export interface GrowthProjection {
  model: 's-curve' | 'exponential' | 'linear';
  week1Followers: number;
  week4Followers: number;
  week12Followers: number;
  carryingCapacity: number; // K — niche ceiling
  growthRate: number; // r — weekly growth rate
  inflectionPoint: number; // Week where growth peaks
  confidenceInterval: { low: number; high: number };
}

export interface ContentHalfLife {
  platform: 'instagram' | 'tiktok';
  contentType: 'reel' | 'carousel' | 'story' | 'post';
  halfLifeHours: number;
  peakEngagementHour: number; // Hours after posting when engagement peaks
  totalLifetimeEngagementEstimate: number; // Relative units
  decayConstant: number; // λ for E(t) = E₀ × e^(-λt)
  viralWindowHours: number; // Time window in which virality must ignite
}

export interface ViralityPrediction {
  viralProbabilityScore: number; // 0-100
  viralCoefficient: ViralCoefficient;
  growthProjection: GrowthProjection;
  halfLife: ContentHalfLife;
  featureAttribution: FeatureAttribution[];
  confidenceLevel: number; // 0-1 based on data quality
  recommendation: 'post-now' | 'improve-first' | 'wait-for-trend' | 'abort';
  blockingFactors: string[];
  boostingFactors: string[];
  predictedPeakReach: number;
  predictedEngagementRate: number;
}

export interface FeatureAttribution {
  feature: string;
  contribution: number; // % contribution to final score
  currentValue: number;
  optimalValue: number;
  improvementPotential: number; // Points gained if optimized
}

export interface EarlySignalUpdate {
  minutesAfterPost: number;
  likesPerMinute: number;
  commentsPerMinute: number;
  sharesPerMinute: number;
  savesPerMinute: number;
  updatedViralProbability: number;
  updatedR0: number;
  recommendation: 'boost-now' | 'monitor' | 'accept-organic' | 'repurpose';
}

// ── Constants ────────────────────────────────────────────────────────────────

// Platform-calibrated half-lives from industry data
const HALF_LIFE_DATA: Record<string, Record<string, ContentHalfLife>> = {
  instagram: {
    reel: {
      platform: 'instagram',
      contentType: 'reel',
      halfLifeHours: 72,
      peakEngagementHour: 3,
      totalLifetimeEngagementEstimate: 100,
      decayConstant: Math.LN2 / 72,
      viralWindowHours: 6,
    },
    carousel: {
      platform: 'instagram',
      contentType: 'carousel',
      halfLifeHours: 48,
      peakEngagementHour: 2,
      totalLifetimeEngagementEstimate: 80,
      decayConstant: Math.LN2 / 48,
      viralWindowHours: 4,
    },
    story: {
      platform: 'instagram',
      contentType: 'story',
      halfLifeHours: 24,
      peakEngagementHour: 1,
      totalLifetimeEngagementEstimate: 30,
      decayConstant: Math.LN2 / 24,
      viralWindowHours: 2,
    },
    post: {
      platform: 'instagram',
      contentType: 'post',
      halfLifeHours: 36,
      peakEngagementHour: 2,
      totalLifetimeEngagementEstimate: 60,
      decayConstant: Math.LN2 / 36,
      viralWindowHours: 3,
    },
  },
  tiktok: {
    reel: {
      platform: 'tiktok',
      contentType: 'reel',
      halfLifeHours: 96,
      peakEngagementHour: 6,
      totalLifetimeEngagementEstimate: 150,
      decayConstant: Math.LN2 / 96,
      viralWindowHours: 12,
    },
    post: {
      platform: 'tiktok',
      contentType: 'post',
      halfLifeHours: 48,
      peakEngagementHour: 4,
      totalLifetimeEngagementEstimate: 80,
      decayConstant: Math.LN2 / 48,
      viralWindowHours: 6,
    },
    story: {
      platform: 'tiktok',
      contentType: 'story',
      halfLifeHours: 24,
      peakEngagementHour: 1,
      totalLifetimeEngagementEstimate: 25,
      decayConstant: Math.LN2 / 24,
      viralWindowHours: 2,
    },
    carousel: {
      platform: 'tiktok',
      contentType: 'carousel',
      halfLifeHours: 60,
      peakEngagementHour: 3,
      totalLifetimeEngagementEstimate: 90,
      decayConstant: Math.LN2 / 60,
      viralWindowHours: 8,
    },
  },
};

// Niche carrying capacities (K) — realistic ceilings for organic growth
const NICHE_CARRYING_CAPACITY: Partial<Record<NicheCategory, number>> = {
  coaching: 500000,
  'fitness-coaching': 800000,
  'fitness-products': 1200000,
  finance: 600000,
  education: 900000,
  beauty: 2000000,
  entertainment: 5000000,
  'personal-brand': 300000,
  ecommerce: 400000,
  'b2b-services': 150000,
  tech: 500000,
  food: 1500000,
  travel: 2000000,
};

// Feature weights for virality score (must sum to 1.0)
const FEATURE_WEIGHTS = {
  hookScore: 0.28,
  completionRatePct: 0.2,
  saveRatePct: 0.15,
  shareRatePct: 0.14,
  trendAlignmentScore: 0.1,
  audienceResonanceScore: 0.08,
  postingTimingScore: 0.05,
} as const;

// Optimal values for each feature (100-point contribution when met)
const OPTIMAL_VALUES = {
  hookScore: 9.0,
  completionRatePct: 60,
  saveRatePct: 4.0,
  shareRatePct: 2.5,
  trendAlignmentScore: 9.0,
  audienceResonanceScore: 9.0,
  postingTimingScore: 9.0,
} as const;

// ── Core Math ────────────────────────────────────────────────────────────────

// Viral coefficient R₀ = spread rate per infected node
// Adapted from SIR model: R₀ = β/γ where β = transmission rate, γ = recovery rate
const computeR0 = (shareRatePct: number, avgConnections = 1200, viewingProbability = 0.18): ViralCoefficient => {
  const shareRate = shareRatePct / 100;
  const R0 = shareRate * avgConnections * viewingProbability;
  const expectedReachMultiplier = R0 > 1 ? 1 + (R0 - 1) * 2.3 : 1;
  const spreadGenerations = R0 > 1 ? Math.ceil(Math.log(100) / Math.log(R0)) : 0;

  const interpretation: ViralCoefficient['interpretation'] =
    R0 >= 5 ? 'hyper-viral' : R0 >= 2 ? 'viral' : R0 >= 1 ? 'slow-spread' : 'contained';

  return {
    R0: parseFloat(R0.toFixed(3)),
    interpretation,
    expectedReachMultiplier: parseFloat(expectedReachMultiplier.toFixed(2)),
    viralThresholdMet: R0 >= 1,
    spreadGenerations,
  };
};

// S-curve logistic growth model: N(t) = K / (1 + A × e^(-r×t))
const computeSCurveGrowth = (
  currentFollowers: number,
  niche: NicheCategory,
  weeklyGrowthRate: number,
): GrowthProjection => {
  const K = NICHE_CARRYING_CAPACITY[niche] ?? 250000;
  const N0 = Math.max(currentFollowers, 1);
  const r = weeklyGrowthRate;
  const A = (K - N0) / N0;

  const project = (weeks: number): number => Math.round(K / (1 + A * Math.exp(-r * weeks)));

  const inflectionPoint = Math.round(Math.log(A) / r);

  // Confidence interval via ±15% variance on growth rate
  const rLow = r * 0.7;
  const rHigh = r * 1.3;
  const ALow = (K - N0) / N0;

  const w12Low = Math.round(K / (1 + ALow * Math.exp(-rLow * 12)));
  const w12High = Math.round(K / (1 + ALow * Math.exp(-rHigh * 12)));

  return {
    model: 's-curve',
    week1Followers: project(1),
    week4Followers: project(4),
    week12Followers: project(12),
    carryingCapacity: K,
    growthRate: parseFloat(r.toFixed(4)),
    inflectionPoint: Math.max(1, inflectionPoint),
    confidenceInterval: { low: w12Low, high: w12High },
  };
};

// Feature-weighted virality score with SHAP-like attribution
const computeViralityScore = (
  features: ViralityFeatures,
): {
  score: number;
  attribution: FeatureAttribution[];
} => {
  type WeightedFeature = keyof typeof FEATURE_WEIGHTS;
  const scoredFeatures: FeatureAttribution[] = [];
  let totalScore = 0;

  const featureMap: Record<WeightedFeature, number> = {
    hookScore: features.hookScore,
    completionRatePct: features.completionRatePct,
    saveRatePct: features.saveRatePct,
    shareRatePct: features.shareRatePct,
    trendAlignmentScore: features.trendAlignmentScore,
    audienceResonanceScore: features.audienceResonanceScore,
    postingTimingScore: features.postingTimingScore,
  };

  for (const [key, weight] of Object.entries(FEATURE_WEIGHTS) as [WeightedFeature, number][]) {
    const current = featureMap[key];
    const optimal = OPTIMAL_VALUES[key];
    const normalised = Math.min(1, current / optimal);
    const contribution = normalised * weight * 100;
    totalScore += contribution;

    const improvementPotential = (optimal - current) * weight * 10;

    scoredFeatures.push({
      feature: key,
      contribution: parseFloat((weight * 100).toFixed(1)),
      currentValue: current,
      optimalValue: optimal,
      improvementPotential: Math.max(0, parseFloat(improvementPotential.toFixed(1))),
    });
  }

  return {
    score: Math.min(100, Math.round(totalScore)),
    attribution: scoredFeatures.sort((a, b) => b.improvementPotential - a.improvementPotential),
  };
};

// Bayesian update: given early engagement signal, update viral probability
const bayesianUpdate = (priorProbability: number, likesPerMin: number, sharesPerMin: number): number => {
  // Likelihood ratio: how much more likely is this signal under viral vs non-viral hypothesis
  const viralLikelihood = Math.min(10, (likesPerMin * 0.3 + sharesPerMin * 3) / 2);
  const nonViralLikelihood = 1;
  const likelihoodRatio = viralLikelihood / nonViralLikelihood;

  // Bayes: posterior ∝ prior × likelihood
  const priorOdds = priorProbability / (1 - priorProbability + 0.001);
  const posteriorOdds = priorOdds * likelihoodRatio;
  const posterior = posteriorOdds / (1 + posteriorOdds);

  return Math.min(0.99, Math.max(0.01, parseFloat(posterior.toFixed(3))));
};

// ── Engine ────────────────────────────────────────────────────────────────────

class ViralityPredictor {
  predict = (
    features: ViralityFeatures,
    niche: NicheCategory,
    platform: 'instagram' | 'tiktok',
    contentType: 'reel' | 'carousel' | 'story' | 'post',
    currentFollowers: number,
  ): ViralityPrediction => {
    const { score, attribution } = computeViralityScore(features);
    const viralCoefficient = computeR0(features.shareRatePct);

    // Weekly growth rate derived from engagement quality + virality score
    const weeklyGrowthRate = (score / 100) * 0.35 + (viralCoefficient.R0 > 1 ? 0.15 : 0);
    const growthProjection = computeSCurveGrowth(currentFollowers, niche, weeklyGrowthRate);

    const halfLife = HALF_LIFE_DATA[platform]?.[contentType] ?? HALF_LIFE_DATA['instagram']!['reel']!;

    // Confidence level: higher when we have velocity data
    const confidenceLevel = features.initialEngagementVelocity > 0 ? 0.82 : 0.61;

    // Predicted reach multiplier from algorithm + viral coefficient
    const algProfile = contentAlgorithmAgent.getAlgorithmProfile(platform, niche);
    const algBoostSignals = algProfile.boostSignals.length;
    const predictedReachMultiplier = viralCoefficient.expectedReachMultiplier * (1 + algBoostSignals * 0.05);
    const predictedPeakReach = Math.round(currentFollowers * predictedReachMultiplier * (score / 60));
    const predictedEngagementRate = parseFloat(
      (
        features.completionRatePct * 0.04 +
        features.saveRatePct * 0.5 +
        features.shareRatePct * 0.3 +
        features.commentRatePct * 0.2
      ).toFixed(2),
    );

    const blockingFactors: string[] = [];
    const boostingFactors: string[] = [];

    if (features.hookScore < 7)
      blockingFactors.push(`Hook débil (${features.hookScore}/10) — bloquea distribución algorítmica`);
    if (features.completionRatePct < 40)
      blockingFactors.push(`Completion rate ${features.completionRatePct}% — algoritmo penaliza <40%`);
    if (features.shareRatePct < 0.5)
      blockingFactors.push(`Share rate ${features.shareRatePct}% — insuficiente para R₀ > 1`);
    if (features.trendAlignmentScore < 5) blockingFactors.push(`Baja alineación con tendencias actuales`);

    if (features.hookScore >= 8)
      boostingFactors.push(
        `Hook fuerte (${features.hookScore}/10) — +${Math.round((features.hookScore - 7) * 8)}% distribución`,
      );
    if (viralCoefficient.viralThresholdMet) boostingFactors.push(`R₀ = ${viralCoefficient.R0} — umbral viral superado`);
    if (features.saveRatePct >= 3) boostingFactors.push(`Save rate ${features.saveRatePct}% — señal fuerte de valor`);
    if (features.trendAlignmentScore >= 8) boostingFactors.push(`Alta alineación de tendencia — ventana viral activa`);

    const recommendation: ViralityPrediction['recommendation'] =
      score >= 75 && viralCoefficient.viralThresholdMet
        ? 'post-now'
        : score >= 55 && blockingFactors.length <= 1
          ? 'improve-first'
          : features.trendAlignmentScore < 4
            ? 'wait-for-trend'
            : 'abort';

    return {
      viralProbabilityScore: score,
      viralCoefficient,
      growthProjection,
      halfLife,
      featureAttribution: attribution,
      confidenceLevel,
      recommendation,
      blockingFactors,
      boostingFactors,
      predictedPeakReach,
      predictedEngagementRate,
    };
  };

  updateWithEarlySignals = (
    priorPrediction: ViralityPrediction,
    minutesAfterPost: number,
    likesPerMinute: number,
    commentsPerMinute: number,
    sharesPerMinute: number,
    savesPerMinute: number,
  ): EarlySignalUpdate => {
    const prior = priorPrediction.viralProbabilityScore / 100;
    const updatedProb = bayesianUpdate(prior, likesPerMinute + commentsPerMinute * 0.5, sharesPerMinute);
    const updatedR0 = computeR0(sharesPerMinute * 60 * 0.01);

    // Engagement velocity benchmark: >2 likes/min per 1K followers = healthy
    const engagementVelocityScore =
      (likesPerMinute * 0.4 + sharesPerMinute * 3 + savesPerMinute * 2) / minutesAfterPost;

    const recommendation: EarlySignalUpdate['recommendation'] =
      updatedProb > 0.75
        ? 'boost-now'
        : updatedProb > 0.5
          ? 'monitor'
          : engagementVelocityScore > 0.5
            ? 'accept-organic'
            : 'repurpose';

    return {
      minutesAfterPost,
      likesPerMinute,
      commentsPerMinute,
      sharesPerMinute,
      savesPerMinute,
      updatedViralProbability: Math.round(updatedProb * 100),
      updatedR0: parseFloat(updatedR0.R0.toFixed(3)),
      recommendation,
    };
  };

  computeContentDecay = (
    platform: 'instagram' | 'tiktok',
    contentType: 'reel' | 'carousel' | 'story' | 'post',
    initialEngagementE0: number,
    hoursAfterPost: number,
  ): number => {
    const hl = HALF_LIFE_DATA[platform]?.[contentType];
    if (!hl) return 0;
    return Math.round(initialEngagementE0 * Math.exp(-hl.decayConstant * hoursAfterPost));
  };

  estimateOptimalPostWindow = (
    niche: NicheCategory,
    platform: 'instagram' | 'tiktok',
  ): { bestDays: string[]; bestHours: number[]; reasoning: string } => {
    const algProfile = contentAlgorithmAgent.getAlgorithmProfile(platform, niche);
    const distributionLogic = algProfile.distributionLogic;

    return {
      bestDays: ['lunes', 'martes', 'miércoles', 'jueves'],
      bestHours: [8, 12, 18, 20],
      reasoning: `${distributionLogic.amplificationTrigger} — ventana viral: primeras ${HALF_LIFE_DATA[platform]?.['reel']?.viralWindowHours ?? 6}h`,
    };
  };
}

export const viralityPredictor = new ViralityPredictor();
