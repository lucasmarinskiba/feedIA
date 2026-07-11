/**
 * Metrics Executive Dashboard
 *
 * Sala Ejecutiva para tracking reach improvements:
 * - Account growth trends (followers, engagement, posting consistency)
 * - Format performance (carousel vs reel vs story by reach/engagement)
 * - Platform comparison (Instagram vs TikTok algo impact)
 * - Variant A/B results (control vs optimized performance lift)
 * - Niche winning patterns (what improvements are working)
 *
 * Real-time metrics updated by:
 * - Account Growth Service (4h polling cycle)
 * - Cross-Platform Optimization (per-publish)
 * - Variant Framework (post-publication measurement)
 * - Feedback Amplification (7d feedback cycle)
 */

import { log } from '../../agent/logger.js';
import { accountGrowthService } from '../../services/account-growth-service.js';
import { crossPlatformOptimizationService } from '../../services/cross-platform-optimization.js';
import { nicheCacheService } from '../../services/niche-cache-service.js';
import type { BrandProfile } from '../../config/types.js';

export interface AccountMetricsSummary {
  accountId: string;
  followerCount: number;
  avgEngagement: number;
  postCount: number;
  consistency: number; // 0-100, how regular posting is
  growthVelocity: number; // followers/week
  trendingUp: boolean;
}

export interface FormatPerformance {
  format: 'carousel' | 'reel' | 'story' | 'post';
  platform: 'instagram' | 'tiktok';
  avgReach: number;
  avgEngagement: number;
  followConversion: number; // % reach → follows
  saveRate: number;
  recommendation: string; // e.g., "Increasing to 50% of content mix could +15% reach"
}

export interface VariantPerformanceComparison {
  variantSetId: string;
  controlReach: number;
  controlEngagement: number;
  variantAReach: number;
  variantAEngagement: number;
  variantBReach?: number;
  variantBEngagement?: number;
  liftVsControl: number; // %
  winnerFormat?: string;
  winnerStrategy?: string;
}

export interface NicheWinningPattern {
  improvement: string;
  hitCount: number;
  successRate: number; // 0-1
  lastWonAt: number;
  recommendation: string;
}

export interface ExecutiveDashboardSnapshot {
  timestamp: number;
  accountId: string;
  accountMetrics: AccountMetricsSummary;
  formatPerformance: FormatPerformance[];
  platformStrategy: {
    instagram: { recommendedMix: Array<{ format: string; percentage: number }>; topTip: string };
    tiktok: { recommendedMix: Array<{ format: string; percentage: number }>; topTip: string };
  };
  variantPerformance: VariantPerformanceComparison[];
  nicheWinners: NicheWinningPattern[];
  keyInsights: string[];
  nextActions: string[];
}

/**
 * Generate snapshot for executive dashboard
 */
export const generateExecutiveDashboardSnapshot = (brand: BrandProfile): ExecutiveDashboardSnapshot => {
  const accountId = brand.id || brand.name;
  const timestamp = Date.now();
  const keyInsights: string[] = [];
  const nextActions: string[] = [];

  // 1. Account metrics summary
  const recommendations = accountGrowthService.getGrowthRecommendations(brand);
  const accountMetrics: AccountMetricsSummary = {
    accountId,
    followerCount: 0, // Would come from Instagram API in production
    avgEngagement: recommendations.optimalPostingFrequency * 0.05, // Rough estimate
    postCount: 0,
    consistency: 75, // Placeholder
    growthVelocity: 5, // followers/week placeholder
    trendingUp: true,
  };

  // 2. Format performance
  const formatPerformance = recommendations.recommendedContentMix.map((item) => ({
    format: item.format as 'carousel' | 'reel' | 'story' | 'post',
    platform: 'instagram' as const,
    avgReach: 1200 * (item.percentage / 100),
    avgEngagement: 0.035,
    followConversion: 0.008,
    saveRate: 0.02,
    recommendation: `${item.format} performing at ${item.percentage}% of mix`,
  }));

  keyInsights.push(`Recommended posting frequency: ${recommendations.optimalPostingFrequency}x/week`);
  keyInsights.push(`Target audience: ${recommendations.targetAudience}`);

  // 3. Platform strategy
  const igStrategy = crossPlatformOptimizationService.generatePlatformStrategy(accountId, 'instagram', brand);
  const ttStrategy = crossPlatformOptimizationService.generatePlatformStrategy(accountId, 'tiktok', brand);

  const platformStrategy = {
    instagram: {
      recommendedMix: igStrategy.formatDistribution,
      topTip: igStrategy.algorithmInsights[0] || 'Focus on saves + shares for algorithm boost',
    },
    tiktok: {
      recommendedMix: ttStrategy.formatDistribution,
      topTip: ttStrategy.algorithmInsights[0] || 'Complete watch time is primary ranking signal',
    },
  };

  if (igStrategy.estimatedReach > ttStrategy.estimatedReach) {
    keyInsights.push(
      `Instagram outperforming: ${Math.round(igStrategy.estimatedReach)} vs ${Math.round(ttStrategy.estimatedReach)} baseline reach`,
    );
  }

  // 4. Variant performance (latest 3)
  const variantPerformance: VariantPerformanceComparison[] = [];
  // Placeholder: real data comes from variant framework

  // 5. Niche winning patterns
  const nichStats = nicheCacheService.getStats(accountId);
  const topImprovements = nicheCacheService.getTopImprovements(accountId, 5);
  const nicheWinners: NicheWinningPattern[] = topImprovements.map((p) => ({
    improvement: p.improvement,
    hitCount: p.hitCount,
    successRate: p.variance,
    lastWonAt: p.lastWonAt,
    recommendation: `This improvement won ${p.hitCount} times (${Math.round(p.variance * 100)}% success rate)`,
  }));

  if (nicheWinners.length > 0) {
    keyInsights.push(
      `Top winning pattern: "${nicheWinners[0]!.improvement}" (${Math.round(nicheWinners[0]!.successRate * 100)}% success)`,
    );
  }

  // 6. Next actions
  if (nichStats && nichStats.totalWins < 5) {
    nextActions.push(
      'Run more variants to build winning patterns library (currently ' + nichStats.totalWins + ' wins)',
    );
  }
  nextActions.push(recommendations.growthOpportunity);
  nextActions.push(
    `Hashtag strategy: ${recommendations.hashtagStrategy.megaHashtags} mega + ${recommendations.hashtagStrategy.macroHashtags} macro + ${recommendations.hashtagStrategy.nicheHashtags} niche`,
  );

  log.info('[ExecutiveDashboard] Snapshot generated', {
    accountId,
    formatCount: formatPerformance.length,
    nicheWinners: nicheWinners.length,
    insights: keyInsights.length,
  });

  return {
    timestamp,
    accountId,
    accountMetrics,
    formatPerformance,
    platformStrategy,
    variantPerformance,
    nicheWinners,
    keyInsights,
    nextActions,
  };
};

/**
 * Get growth trajectory (last 30 days)
 */
export const getGrowthTrajectory = (
  _accountId: string,
): {
  dates: string[];
  followerGrowth: number[];
  reachTrend: number[];
  engagementTrend: number[];
} => {
  // Placeholder: real data from metrics database
  const dates = Array.from({ length: 30 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (29 - i));
    return d.toISOString().split('T')[0]!;
  });

  return {
    dates,
    followerGrowth: Array(30).fill(5), // Placeholder: 5 followers/day
    reachTrend: Array(30).fill(1200), // Placeholder: 1200 reach/post
    engagementTrend: Array(30).fill(0.035), // Placeholder: 3.5% engagement rate
  };
};

/**
 * Platform comparison scorecard
 */
export const getPlatformComparison = (
  brand: BrandProfile,
): {
  instagram: {
    strength: string;
    score: number;
    opportunity: string;
  };
  tiktok: {
    strength: string;
    score: number;
    opportunity: string;
  };
  recommendation: string;
} => {
  const accountId = brand.id || brand.name;

  const igStrategy = crossPlatformOptimizationService.generatePlatformStrategy(accountId, 'instagram', brand);
  const ttStrategy = crossPlatformOptimizationService.generatePlatformStrategy(accountId, 'tiktok', brand);

  const igScore = Math.min(100, igStrategy.estimatedReach / 12); // Normalize to 100
  const ttScore = Math.min(100, ttStrategy.estimatedReach / 12);

  return {
    instagram: {
      strength: `${igStrategy.recommendedFormats[0]} performs best`,
      score: igScore,
      opportunity: 'Increase post frequency to 5x/week for algorithm feed boost',
    },
    tiktok: {
      strength: `${ttStrategy.recommendedFormats[0]} drives engagement`,
      score: ttScore,
      opportunity: 'Hook optimization (first 3 seconds) critical for FYP placement',
    },
    recommendation:
      igScore > ttScore
        ? 'Double down on Instagram for short term'
        : 'TikTok has higher growth potential, shift budget +20%',
  };
};
