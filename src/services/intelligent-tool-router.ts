/**
 * Intelligent Tool Router
 *
 * Route content generation to optimal provider based on:
 * - Niche performance history (success rate per provider)
 * - Content type (carousel → image provider, reel → video provider)
 * - Quality vs Speed tradeoff
 * - Budget constraints
 * - Real-time provider availability
 *
 * Maximizes: reach (via speed+quality) + cost-efficiency
 */

import { log } from '../agent/logger.js';
import { nicheCacheService } from './niche-cache-service.js';

export type ContentType = 'carousel' | 'reel' | 'story' | 'tiktok-video' | 'tiktok-photo';
export type Provider = 'higgsfield' | 'veo' | 'replicate' | 'openai' | 'gemini' | 'fal' | 'canva';

export interface ProviderConfig {
  name: Provider;
  speed: 'fast' | 'medium' | 'slow'; // time to first output
  quality: 'low' | 'medium' | 'high'; // output quality
  costPerUnit: number; // relative cost (1.0 = baseline)
  format: ContentType[];
  availability: boolean;
  maxRetries: number;
}

interface ToolScore {
  provider: Provider;
  score: number; // 0-100
  successRate: number; // historical (0-1)
  speedScore: number; // 0-100
  qualityScore: number; // 0-100
  costScore: number; // 0-100
  reasoning: string;
}

class IntelligentToolRouter {
  private providers: Map<Provider, ProviderConfig> = new Map([
    [
      'higgsfield',
      {
        name: 'higgsfield',
        speed: 'fast',
        quality: 'high',
        costPerUnit: 1.2,
        format: ['carousel', 'reel', 'tiktok-video', 'tiktok-photo'],
        availability: true,
        maxRetries: 2,
      },
    ],
    [
      'veo',
      {
        name: 'veo',
        speed: 'slow',
        quality: 'high',
        costPerUnit: 0.8,
        format: ['reel', 'tiktok-video'],
        availability: true,
        maxRetries: 1,
      },
    ],
    [
      'replicate',
      {
        name: 'replicate',
        speed: 'medium',
        quality: 'medium',
        costPerUnit: 0.5,
        format: ['carousel', 'tiktok-photo'],
        availability: true,
        maxRetries: 3,
      },
    ],
    [
      'openai',
      {
        name: 'openai',
        speed: 'medium',
        quality: 'high',
        costPerUnit: 1.0,
        format: ['carousel', 'tiktok-photo'],
        availability: true,
        maxRetries: 2,
      },
    ],
    [
      'gemini',
      {
        name: 'gemini',
        speed: 'fast',
        quality: 'medium',
        costPerUnit: 0.3,
        format: ['carousel', 'tiktok-photo'],
        availability: true,
        maxRetries: 2,
      },
    ],
    [
      'fal',
      {
        name: 'fal',
        speed: 'medium',
        quality: 'high',
        costPerUnit: 1.5,
        format: ['reel', 'tiktok-video'],
        availability: true,
        maxRetries: 1,
      },
    ],
  ]);

  /**
   * Route content to best provider
   */
  routeContentGeneration(
    contentType: ContentType,
    nicheId: string,
    constraints: {
      prioritize?: 'speed' | 'quality' | 'cost' | 'balanced';
      maxCost?: number;
      requireAvailable?: boolean;
    } = {},
  ): ToolScore {
    const { prioritize = 'balanced', maxCost = Infinity, requireAvailable = true } = constraints;

    // Filter eligible providers
    const eligible = Array.from(this.providers.values()).filter((p) => {
      if (requireAvailable && !p.availability) return false;
      if (!p.format.includes(contentType)) return false;
      if (maxCost && p.costPerUnit > maxCost) return false;
      return true;
    });

    if (eligible.length === 0) {
      log.warn('[ToolRouter] No eligible providers', { contentType, nicheId });
      // Fallback to safest option
      return this.fallbackProvider(contentType);
    }

    // Score each provider
    const scores = eligible.map((provider) => this.scoreProvider(provider, nicheId, prioritize));

    // Sort by score descending
    scores.sort((a, b) => b.score - a.score);

    const winner = scores[0]!;
    log.info('[ToolRouter] Route decision', {
      contentType,
      nicheId,
      selectedProvider: winner.provider,
      score: Math.round(winner.score),
      successRate: Math.round(winner.successRate * 100),
      reasoning: winner.reasoning,
    });

    return winner;
  }

  /**
   * Score provider: weighted formula based on prioritization
   */
  private scoreProvider(provider: ProviderConfig, nicheId: string, prioritize: string): ToolScore {
    // Historical success rate from Niche Cache
    const successRate = nicheCacheService.getSuccessProbability(`${nicheId}:${provider.name}`, 'success') || 0.5;

    // Speed score (0-100)
    const speedMap = { fast: 95, medium: 70, slow: 40 };
    const speedScore = speedMap[provider.speed as keyof typeof speedMap];

    // Quality score (0-100)
    const qualityMap = { high: 90, medium: 70, low: 40 };
    const qualityScore = qualityMap[provider.quality as keyof typeof qualityMap];

    // Cost score (inverse, 0-100: cheaper = higher)
    const costScore = Math.max(20, 100 - provider.costPerUnit * 30);

    // Weighted score based on prioritization
    let score = 0;
    let weights = { speed: 0.25, quality: 0.5, cost: 0.15, history: 0.1 };

    switch (prioritize) {
      case 'speed':
        weights = { speed: 0.5, quality: 0.2, cost: 0.15, history: 0.15 };
        break;
      case 'quality':
        weights = { speed: 0.15, quality: 0.6, cost: 0.1, history: 0.15 };
        break;
      case 'cost':
        weights = { speed: 0.2, quality: 0.3, cost: 0.4, history: 0.1 };
        break;
    }

    score =
      speedScore * weights.speed +
      qualityScore * weights.quality +
      costScore * weights.cost +
      successRate * 100 * weights.history;

    const reasoning = `${provider.name}: speed=${speedScore} quality=${qualityScore} cost=${Math.round(costScore)} history=${Math.round(successRate * 100)}%`;

    return {
      provider: provider.name,
      score: Math.min(100, score),
      successRate,
      speedScore,
      qualityScore,
      costScore,
      reasoning,
    };
  }

  /**
   * Fallback to safest option
   */
  private fallbackProvider(contentType: ContentType): ToolScore {
    const fallbacks: Record<ContentType, Provider> = {
      carousel: 'replicate', // reliable, cost-effective
      reel: 'veo', // reliable video gen
      story: 'gemini', // fast, cheap
      'tiktok-video': 'veo', // TikTok prefers certain aesthetics
      'tiktok-photo': 'openai', // versatile
    };

    const provider = this.providers.get(fallbacks[contentType])!;
    return {
      provider: provider.name,
      score: 60,
      successRate: 0.6,
      speedScore: 70,
      qualityScore: 70,
      costScore: 70,
      reasoning: `Fallback to ${provider.name} for ${contentType}`,
    };
  }

  /**
   * Record provider success/failure (feedback for future routing)
   */
  recordProviderResult(
    nicheId: string,
    provider: Provider,
    success: boolean,
    metrics?: { viralScore?: number; reach?: number; engagement?: number },
  ): void {
    // Store in Niche Cache via a provider-specific key
    if (success) {
      nicheCacheService.recordWin(`${nicheId}:${provider}`, [`${provider}-success`], undefined);
    }

    log.info('[ToolRouter] Provider result recorded', {
      nicheId,
      provider,
      success,
      metrics,
    });
  }

  /**
   * Get provider stats for monitoring
   */
  getProviderStats(nicheId: string): Record<Provider, { successRate: number; usageCount: number }> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const stats: Record<string, any> = {};

    for (const [name] of this.providers) {
      const successRate = nicheCacheService.getSuccessProbability(`${nicheId}:${name}`, 'success') || 0.5;
      stats[name] = {
        successRate,
        usageCount: Math.round(successRate * 10), // rough estimate
      };
    }

    return stats;
  }
}

export const intelligentToolRouter = new IntelligentToolRouter();
