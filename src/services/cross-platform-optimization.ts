/**
 * Cross-Platform Optimization
 *
 * Instagram vs TikTok algorithm differences → optimize format, timing, hashtags, content mix.
 * Measures performance delta by platform, recommends content strategy per platform.
 */

import { log } from '../agent/logger.js';
import type { BrandProfile } from '../config/types.js';

export type Platform = 'instagram' | 'tiktok';
export type ContentFormat = 'carousel' | 'reel' | 'story' | 'video' | 'photo';

export interface PlatformMetrics {
  platform: Platform;
  format: ContentFormat;
  averageReach: number;
  averageEngagement: number;
  completionRate: number; // % of viewers who watch/see full content
  shareRate: number; // % who share/repost
  saveRate: number; // % who save (IG) or favorite (TikTok)
  followConversion: number; // % of reach → new followers
}

export interface PlatformStrategy {
  platform: Platform;
  recommendedFormats: ContentFormat[];
  formatDistribution: Array<{ format: ContentFormat; percentage: number }>;
  hashtagStrategy: {
    count: number;
    mega: number; // 1M+
    macro: number; // 100K-1M
    niche: number; // <100K
  };
  bestPostingHours: number[]; // 0-23
  contentMixTips: string[];
  algorithmInsights: string[];
  estimatedReach: number; // baseline, before viral factors
}

export interface CrossPlatformAnalysis {
  accountId: string;
  instagramStrategy?: PlatformStrategy;
  tiktokStrategy?: PlatformStrategy;
  contentGap?: string; // What's missing from current mix
  opportunityPlatform?: Platform; // Where growth is fastest
  recommendedAction: string; // Specific next step
}

class CrossPlatformOptimizationService {
  private platformMetrics: Map<string, Map<Platform, PlatformMetrics[]>> = new Map();

  /**
   * Record format-specific performance per platform
   */
  recordPerformance(
    accountId: string,
    platform: Platform,
    format: ContentFormat,
    metrics: {
      reach: number;
      engagement: number;
      completions: number;
      shares: number;
      saves: number;
      follows: number;
    },
  ): void {
    const engagementRate = metrics.reach > 0 ? metrics.engagement / metrics.reach : 0;
    const completionRate = metrics.reach > 0 ? metrics.completions / metrics.reach : 0;
    const shareRate = metrics.reach > 0 ? metrics.shares / metrics.reach : 0;
    const saveRate = metrics.reach > 0 ? metrics.saves / metrics.reach : 0;
    const followConversion = metrics.reach > 0 ? metrics.follows / metrics.reach : 0;

    let accountMetrics = this.platformMetrics.get(accountId);
    if (!accountMetrics) {
      accountMetrics = new Map();
      this.platformMetrics.set(accountId, accountMetrics);
    }

    let platformList = accountMetrics.get(platform);
    if (!platformList) {
      platformList = [];
      accountMetrics.set(platform, platformList);
    }

    const existing = platformList.find((p) => p.format === format);
    if (existing) {
      // Exponential moving average
      existing.averageReach = existing.averageReach * 0.7 + metrics.reach * 0.3;
      existing.averageEngagement = existing.averageEngagement * 0.7 + engagementRate * 0.3;
      existing.completionRate = existing.completionRate * 0.7 + completionRate * 0.3;
      existing.shareRate = existing.shareRate * 0.7 + shareRate * 0.3;
      existing.saveRate = existing.saveRate * 0.7 + saveRate * 0.3;
      existing.followConversion = existing.followConversion * 0.7 + followConversion * 0.3;
    } else {
      platformList.push({
        platform,
        format,
        averageReach: metrics.reach,
        averageEngagement: engagementRate,
        completionRate,
        shareRate,
        saveRate,
        followConversion,
      });
    }

    log.info('[CrossPlatform] Performance recorded', {
      accountId,
      platform,
      format,
      reach: metrics.reach,
      engagement: engagementRate.toFixed(3),
    });
  }

  /**
   * Generate platform-specific strategy
   */
  generatePlatformStrategy(accountId: string, platform: Platform, _brand?: BrandProfile): PlatformStrategy {
    const accountMetrics = this.platformMetrics.get(accountId);
    const metricsForPlatform = accountMetrics?.get(platform) ?? [];

    // Rank formats by engagement
    const rankedFormats = [...metricsForPlatform].sort((a, b) => b.averageEngagement - a.averageEngagement).slice(0, 3);

    // Platform-specific algorithm insights
    const algorithmInsights =
      platform === 'instagram'
        ? [
            'Reels get 67% more reach than carousels (first 24h)',
            'Saves + shares weighted 2x in feed algorithm',
            'Comments indicate topic relevance — CTA boosts algorithm',
            'Carousel performance improves after 48h (feed positioning)',
            'Stories boost reels visibility (sticker linking)',
          ]
        : [
            'Watch time (completion %) is primary ranking signal',
            'Shares > likes in TikTok algorithm weighting',
            'Trending sounds/audio = 40% higher reach (first hour)',
            'Hook timing critical — drop engagement after 3s = shadowban risk',
            'For You Page favors diverse content types over repeat format',
          ];

    // Platform-specific hashtag strategy
    const hashtagStrategy =
      platform === 'instagram'
        ? { count: 30, mega: 3, macro: 8, niche: 19 } // IG allows more hashtags + niche helps discovery
        : { count: 8, mega: 1, macro: 2, niche: 5 }; // TikTok: fewer, focus on niche (algorithm-driven discovery)

    // Best posting hours per platform
    const bestPostingHours =
      platform === 'instagram'
        ? [6, 9, 12, 17, 19, 21] // Varied (static feed + stories)
        : [6, 12, 18, 20, 21, 22]; // Later peak (short-form competition high evening)

    // Content mix based on platform + rankings
    const totalEngagement = rankedFormats.reduce((sum, f) => sum + f.averageEngagement, 0) || 1;
    const formatDistribution = rankedFormats.map((f) => ({
      format: f.format,
      percentage: Math.round((f.averageEngagement / totalEngagement) * 100),
    }));

    // Fallback if no data
    if (formatDistribution.length === 0) {
      formatDistribution.push(
        ...(platform === 'instagram'
          ? [
              { format: 'reel' as const, percentage: 50 },
              { format: 'carousel' as const, percentage: 30 },
              { format: 'story' as const, percentage: 20 },
            ]
          : [
              { format: 'video' as const, percentage: 80 },
              { format: 'photo' as const, percentage: 20 },
            ]),
      );
    }

    // Tips based on platform
    const contentMixTips =
      platform === 'instagram'
        ? [
            'Post reels during weekdays 5-10pm (highest TTV)',
            'Use carousel as proof/testimonial (comment-driver)',
            'Stories for engagement loops (sticker → swipe up strategy)',
            'Avoid posting multiple reels same day (feed algorithm deprioritizes)',
            'Reels with captions outperform by 35% (context for algorithm)',
          ]
        : [
            'Post during 6pm-11pm (peak scroll, less competition)',
            'First 3 seconds = make-or-break (hook hard, or algorithm stops showing)',
            'Trending sound + niche topic = viral-proof combo',
            'Engage with 5-10 competitor videos (2h after post) to boost FYP',
            'Video length: 21-34s outperforms <15s on TikTok (recent algo shift)',
          ];

    // Estimated reach baseline
    const avgReach =
      metricsForPlatform.length > 0
        ? metricsForPlatform.reduce((sum, m) => sum + m.averageReach, 0) / metricsForPlatform.length
        : 1000;

    return {
      platform,
      recommendedFormats: rankedFormats.map((f) => f.format),
      formatDistribution,
      hashtagStrategy,
      bestPostingHours,
      contentMixTips,
      algorithmInsights,
      estimatedReach: Math.round(avgReach),
    };
  }

  /**
   * Cross-platform analysis + gap detection
   */
  analyzeCrossPlatform(accountId: string, brand?: BrandProfile): CrossPlatformAnalysis {
    const igStrategy = this.generatePlatformStrategy(accountId, 'instagram', brand);
    const ttStrategy = this.generatePlatformStrategy(accountId, 'tiktok', brand);

    // Detect gap: which platform is underserved
    const accountMetrics = this.platformMetrics.get(accountId);
    const igMetrics = accountMetrics?.get('instagram') ?? [];
    const ttMetrics = accountMetrics?.get('tiktok') ?? [];

    const igVolume = igMetrics.length;
    const ttVolume = ttMetrics.length;

    let opportunityPlatform: Platform | undefined;
    let contentGap = '';

    if (igVolume > 0 && ttVolume === 0) {
      opportunityPlatform = 'tiktok';
      contentGap = 'No TikTok content detected. TikTok audience grows 3x faster for short-form video.';
    } else if (ttVolume > 0 && igVolume === 0) {
      opportunityPlatform = 'instagram';
      contentGap = 'No Instagram content. IG has higher conversion (link clicks, DMsales).';
    } else if (igVolume > 0 && ttVolume > 0) {
      const igEngagement = igMetrics.reduce((sum, m) => sum + m.averageEngagement, 0) / igVolume;
      const ttEngagement = ttMetrics.reduce((sum, m) => sum + m.averageEngagement, 0) / ttVolume;
      if (igEngagement > ttEngagement * 1.5) {
        contentGap = 'Instagram outperforming TikTok by 50%. Repurpose IG content → TikTok (vertical, trending audio).';
      } else if (ttEngagement > igEngagement * 1.5) {
        contentGap = 'TikTok outperforming IG by 50%. Double down on short-form, trending content.';
      }
    }

    const recommendedAction = opportunityPlatform
      ? `Shift ${opportunityPlatform} to 40% of content mix. Use best-performing IG format, adapt for ${opportunityPlatform} algo.`
      : contentGap || 'Maintain current platform split, A/B test new format combinations.';

    return {
      accountId,
      instagramStrategy: igVolume > 0 ? igStrategy : undefined,
      tiktokStrategy: ttVolume > 0 ? ttStrategy : undefined,
      contentGap: contentGap || undefined,
      opportunityPlatform,
      recommendedAction,
    };
  }

  /**
   * Get platform-specific format recommendation
   */
  getBestFormatForPlatform(accountId: string, platform: Platform): ContentFormat | null {
    const accountMetrics = this.platformMetrics.get(accountId);
    const metricsForPlatform = accountMetrics?.get(platform) ?? [];

    if (metricsForPlatform.length === 0) return null;

    return metricsForPlatform.reduce((best, current) =>
      current.averageEngagement > best.averageEngagement ? current : best,
    ).format;
  }
}

export const crossPlatformOptimizationService = new CrossPlatformOptimizationService();
