import { log } from '../../agent/logger.js';
import type { BrandProfile } from '../../config/types.js';

/**
 * Growth Analyzer Model
 * Predicts follower growth trajectory + optimal posting strategies
 * Analyzes: posting frequency, timing, content types, engagement patterns
 */

export interface GrowthMetrics {
  currentFollowers: number;
  dailyFollowerGrowth: number;
  avgEngagementRate: number;
  topContentTypes: string[];
  postingFrequency: number; // posts per week
  bestPostingTimes: string[]; // HH:MM format
}

export interface GrowthForecast {
  followerForecast30Days: number;
  followerForecast90Days: number;
  growthRate: number; // daily growth %
  optimalPostingFrequency: number;
  optimalPostingTimes: string[];
  contentStrategyRecommendation: string;
  estimatedRevenueImpact: number;
  confidence: number;
}

export class GrowthAnalyzerModel {
  /**
   * Analyze growth patterns + forecast trajectory
   */
  analyzeGrowth(metrics: GrowthMetrics, brand: BrandProfile, platform: 'instagram' | 'tiktok'): GrowthForecast {
    // Calculate growth rate
    const dailyGrowthRate = metrics.dailyFollowerGrowth / Math.max(metrics.currentFollowers, 1000);

    // Forecast using exponential growth model
    const forecast30 = this.forecastFollowers(metrics.currentFollowers, dailyGrowthRate, 30);
    const forecast90 = this.forecastFollowers(metrics.currentFollowers, dailyGrowthRate, 90);

    // Optimal posting frequency
    const optimalFreq = this.calculateOptimalFrequency(metrics.postingFrequency, metrics.avgEngagementRate, platform);

    // Optimal posting times
    const optimalTimes = this.optimizePostingTimes(metrics.bestPostingTimes, platform);

    // Content strategy
    const strategy = this.contentStrategyRecommendation(metrics.topContentTypes, metrics.avgEngagementRate, brand);

    // Revenue impact
    const revenueImpact = this.estimateRevenueImpact(forecast90 - metrics.currentFollowers, brand);

    log.debug(
      `[GrowthAnalyzer] 30-day forecast: ${forecast30.toLocaleString()} (${dailyGrowthRate.toFixed(2)}% daily)`,
    );

    return {
      followerForecast30Days: forecast30,
      followerForecast90Days: forecast90,
      growthRate: dailyGrowthRate * 100,
      optimalPostingFrequency: optimalFreq,
      optimalPostingTimes: optimalTimes,
      contentStrategyRecommendation: strategy,
      estimatedRevenueImpact: revenueImpact,
      confidence: 0.72,
    };
  }

  private forecastFollowers(current: number, dailyGrowthRate: number, days: number): number {
    // Exponential growth: F = P * (1 + r)^t
    const forecast = current * Math.pow(1 + dailyGrowthRate, days);

    // Apply saturation factor (growth slows as account matures)
    const saturationFactor = 0.95; // 5% slowdown per stage
    return Math.floor(forecast * saturationFactor);
  }

  private calculateOptimalFrequency(current: number, engagement: number, platform: string): number {
    // Platform-specific optimal frequencies
    const platformFreq: Record<string, number> = {
      instagram: 1.5, // 1-2 per day
      tiktok: 2.5, // 2-3 per day
    };

    let optimal = platformFreq[platform] ?? 1.5;

    // Adjust based on engagement
    if (engagement > 8) optimal += 0.5; // High engagement = post more
    if (engagement < 3) optimal -= 0.5; // Low engagement = post less

    // Cap at platform limits
    optimal = Math.max(0.5, Math.min(optimal, platform === 'tiktok' ? 4 : 2));

    return parseFloat(optimal.toFixed(1));
  }

  private optimizePostingTimes(currentTimes: string[], platform: string): string[] {
    // If no data, use platform defaults
    if (currentTimes.length === 0) {
      return platform === 'instagram'
        ? ['09:00', '13:00', '19:00', '21:00']
        : ['08:00', '12:00', '18:00', '20:00', '22:00'];
    }

    // Return top performers + recommended times
    const recommended = platform === 'instagram' ? ['09:00', '19:00', '21:00'] : ['08:00', '18:00', '20:00'];
    return [...new Set([...currentTimes.slice(0, 2), ...recommended])].slice(0, 4) as string[];
  }

  private contentStrategyRecommendation(topTypes: string[], engagement: number, brand: BrandProfile): string {
    let strategy = 'Content Mix: ';

    if (engagement > 8) {
      strategy += `Focus on ${topTypes[0] || 'video'} (highest performer). `;
      strategy += 'Increase posting frequency.';
    } else if (engagement > 5) {
      strategy += `Balance ${topTypes[0] || 'video'} with ${topTypes[1] || 'carousel'}. `;
      strategy += 'Test new formats weekly.';
    } else {
      strategy += `Revise strategy. Try trending ${topTypes[0] || 'video'} formats. `;
      strategy += 'Increase brand personality in captions.';
    }

    return strategy;
  }

  private estimateRevenueImpact(newFollowers: number, brand: BrandProfile): number {
    // Conservative estimate: $0.50-5.00 per follower depending on niche
    const pricePerFollower = this.estimatePricePerFollower(brand);
    return newFollowers * pricePerFollower;
  }

  private estimatePricePerFollower(brand: BrandProfile): number {
    // Price varies by niche
    const niche = brand.niche || 'general';
    const prices: Record<string, number> = {
      ecommerce: 5.0,
      coaching: 4.5,
      software: 3.5,
      lifestyle: 2.5,
      gaming: 1.5,
      general: 1.0,
    };

    return prices[niche] ?? prices['general'];
  }
}

export const growthAnalyzerModel = new GrowthAnalyzerModel();
