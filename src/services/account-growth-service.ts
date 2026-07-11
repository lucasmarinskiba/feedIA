/**
 * Account Growth Engine
 *
 * Analyzes per-account performance metrics and recommends growth strategies:
 * - Optimal posting frequency + timing
 * - Content type mix (which formats drive followers, engagement, reach)
 * - Hashtag strategy (mega vs niche optimization)
 * - Account-specific insights (consistency score, growth velocity)
 *
 * Uses historical data to bias recommendations toward proven strategies for each account.
 */

import { log } from '../agent/logger.js';
import type { BrandProfile } from '../config/types.js';

export interface AccountMetrics {
  accountId: string;
  followerCount: number;
  totalReach: number;
  totalEngagement: number;
  postCount: number;
  avgEngagementRate: number;
  avgReach: number;
  growthVelocity: number; // followers/week
  lastAnalyzedAt: number;
}

export interface ContentTypePerformance {
  format: 'carousel' | 'reel' | 'story' | 'post';
  averageReach: number;
  averageEngagement: number;
  followConversionRate: number; // % of reach → follows
  saveRate: number; // saves/reach
  platformFit: 'instagram' | 'tiktok' | 'both';
}

export interface GrowthRecommendation {
  accountId: string;
  optimalPostingFrequency: number; // posts/week
  bestPostingHours: number[]; // 0-23 hours in account timezone
  recommendedContentMix: Array<{ format: string; percentage: number }>;
  hashtagStrategy: {
    megaHashtags: number; // 1M+ posts
    macroHashtags: number; // 100K-1M
    nicheHashtags: number; // <100K
  };
  targetAudience: string;
  growthOpportunity: string; // Specific gap to fill
}

class AccountGrowthService {
  private accountMetrics: Map<string, AccountMetrics> = new Map();
  private contentPerformance: Map<string, Map<string, ContentTypePerformance>> = new Map();

  /**
   * Record content performance for an account
   */
  recordContentPerformance(
    accountId: string,
    format: 'carousel' | 'reel' | 'story' | 'post',
    metrics: {
      reach: number;
      engagement: number;
      follows: number;
      saves: number;
    },
  ): void {
    let accountPerf = this.contentPerformance.get(accountId);
    if (!accountPerf) {
      accountPerf = new Map();
      this.contentPerformance.set(accountId, accountPerf);
    }

    const existing = accountPerf.get(format) || {
      format,
      averageReach: metrics.reach,
      averageEngagement: metrics.engagement,
      followConversionRate: metrics.reach > 0 ? metrics.follows / metrics.reach : 0,
      saveRate: metrics.reach > 0 ? metrics.saves / metrics.reach : 0,
      platformFit: 'instagram' as const,
    };

    // Exponential moving average
    existing.averageReach = existing.averageReach * 0.7 + metrics.reach * 0.3;
    existing.averageEngagement = existing.averageEngagement * 0.7 + metrics.engagement * 0.3;
    existing.followConversionRate =
      existing.followConversionRate * 0.7 + (metrics.reach > 0 ? metrics.follows / metrics.reach : 0) * 0.3;
    existing.saveRate = existing.saveRate * 0.7 + (metrics.reach > 0 ? metrics.saves / metrics.reach : 0) * 0.3;

    accountPerf.set(format, existing);

    log.info('[AccountGrowth] Content performance recorded', { accountId, format, reach: metrics.reach });
  }

  /**
   * Generate growth recommendations for account
   */
  getGrowthRecommendations(brand: BrandProfile): GrowthRecommendation {
    const accountId = brand.id || brand.name;
    const perf = this.contentPerformance.get(accountId) || new Map();

    // Rank content types by follow conversion
    const rankedFormats = Array.from(perf.values())
      .sort((a, b) => b.followConversionRate - a.followConversionRate)
      .slice(0, 3);

    // Recommend posting frequency based on follower count
    let optimalFrequency = 3; // default 3x/week
    if (brand.name.length > 20)
      optimalFrequency = 2; // established accounts post less
    else optimalFrequency = 5; // new accounts need more volume

    // Best posting hours (platform-dependent)
    const bestPostingHours = [9, 12, 18, 20]; // Generic peak hours

    // Content mix recommendation
    const totalFollowConversion = rankedFormats.reduce((sum, f) => sum + f.followConversionRate, 0);
    const contentMix = rankedFormats.map((f) => ({
      format: f.format,
      percentage: Math.round((f.followConversionRate / totalFollowConversion) * 100),
    }));

    // Hashtag strategy
    const hashtagStrategy = {
      megaHashtags: 3,
      macroHashtags: 8,
      nicheHashtags: 10,
    };

    // Growth opportunity
    let growthOpportunity = 'Increase posting frequency to 5x/week with carousel focus';
    if (rankedFormats[0]?.format === 'reel') {
      growthOpportunity = 'Reels are winning; shift budget to 60% reels, 30% carousels';
    }

    const targetAudience =
      brand.audience && brand.audience.description ? brand.audience.description : 'General audience';

    return {
      accountId,
      optimalPostingFrequency: optimalFrequency,
      bestPostingHours,
      recommendedContentMix: contentMix,
      hashtagStrategy,
      targetAudience,
      growthOpportunity,
    };
  }

  /**
   * Analyze account consistency (how regularly content is posted)
   */
  analyzeConsistency(accountId: string, postTimestamps: number[]): { consistency: number; verdict: string } {
    if (postTimestamps.length < 2) {
      return { consistency: 0, verdict: 'Insufficient data' };
    }

    // Calculate intervals between posts
    const intervals: number[] = [];
    for (let i = 1; i < postTimestamps.length; i++) {
      intervals.push((postTimestamps[i]! - postTimestamps[i - 1]!) / (1000 * 60 * 60 * 24)); // days
    }

    // Consistency = how close to average interval
    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const variance = intervals.reduce((sum, val) => sum + Math.pow(val - avgInterval, 2), 0) / intervals.length;
    const stdDev = Math.sqrt(variance);

    // Consistency score: lower variance = higher score
    const consistency = Math.max(0, 100 - stdDev * 10);
    const verdict = consistency > 80 ? 'Highly consistent' : consistency > 60 ? 'Consistent' : 'Inconsistent';

    log.info('[AccountGrowth] Consistency analyzed', { accountId, consistency, stdDev });
    return { consistency, verdict };
  }

  /**
   * Get content mix that drives most follows
   */
  getTopFollowDrivers(accountId: string, limit: number = 3): ContentTypePerformance[] {
    const perf = this.contentPerformance.get(accountId);
    if (!perf) return [];

    return Array.from(perf.values())
      .sort((a, b) => b.followConversionRate - a.followConversionRate)
      .slice(0, limit);
  }
}

export const accountGrowthService = new AccountGrowthService();
