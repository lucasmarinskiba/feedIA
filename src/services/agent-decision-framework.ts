/**
 * Agent Decision Framework
 *
 * Helps agents choose:
 * - Which enrichment layers to activate (virality, trending, feedback amplification)
 * - Whether to generate A/B variants
 * - Which format to recommend (carousel, reel, story, etc.)
 * - Publishing strategy (timing, platform mix)
 *
 * Based on: account profile, content type, time budget, quality threshold.
 */

import { log } from '../agent/logger.js';
import type { BrandProfile } from '../config/types.js';

export type ContentType = 'carousel' | 'reel' | 'story' | 'tiktok-video' | 'tiktok-photo' | 'post';
export type EnrichmentLayer = 'virality' | 'trending' | 'feedback-amplification' | 'cross-platform' | 'engagement-loop';
export type QualityThreshold = 'draft' | 'good' | 'excellent' | 'viral-ready';
export type TimeBudget = 'urgent' | 'standard' | 'extended';

export interface DecisionContext {
  topic: string;
  contentType: ContentType;
  platform: 'instagram' | 'tiktok' | 'both';
  timeBudget: TimeBudget;
  qualityThreshold: QualityThreshold;
  account?: { followerCount: number; avgEngagement: number; consistency: number };
  brand?: BrandProfile;
}

export interface AgentDecision {
  recommendedFormats: ContentType[];
  activeEnrichmentLayers: EnrichmentLayer[];
  shouldGenerateVariants: boolean;
  variantCount: number; // 0 (control only), 2 (control + A), 3 (control + A + B)
  publishingStrategy: {
    platforms: Array<{ platform: 'instagram' | 'tiktok'; timing: string }>;
    schedulingPattern: 'immediate' | 'staggered' | 'a-b-test';
    bestPostingHours: number[];
  };
  estimatedReach: number;
  rationale: string;
}

class AgentDecisionFrameworkService {
  /**
   * Main decision engine: given context, return optimized agent strategy
   */
  decide(ctx: DecisionContext): AgentDecision {
    // Priority 1: Format selection (cost/reward tradeoff)
    const recommendedFormats = this.selectFormats(ctx);

    // Priority 2: Enrichment layers (quality vs speed tradeoff)
    const activeEnrichmentLayers = this.selectEnrichmentLayers(ctx, recommendedFormats);

    // Priority 3: Variant generation (testing vs production)
    const { shouldGenerateVariants, variantCount } = this.variantDecision(ctx, activeEnrichmentLayers);

    // Priority 4: Publishing strategy (timing + platform mix)
    const publishingStrategy = this.decidePublishingStrategy(ctx, recommendedFormats);

    // Reach estimation
    const estimatedReach = this.estimateReach(ctx, recommendedFormats, activeEnrichmentLayers);

    const rationale = this.buildRationale(ctx, recommendedFormats, activeEnrichmentLayers, shouldGenerateVariants);

    return {
      recommendedFormats,
      activeEnrichmentLayers,
      shouldGenerateVariants,
      variantCount,
      publishingStrategy,
      estimatedReach,
      rationale,
    };
  }

  /**
   * Select best content formats given time + quality constraints
   */
  private selectFormats(ctx: DecisionContext): ContentType[] {
    const formats: ContentType[] = [];

    if (ctx.platform === 'both') {
      // Multi-platform: Reels as primary (works on both IG + TikTok via repurposing)
      formats.push('reel');
      // Secondary: carousel (IG strength)
      if (ctx.timeBudget !== 'urgent') formats.push('carousel');
      // Tertiary: stories (fast, high engagement loop)
      if (ctx.qualityThreshold === 'draft') formats.push('story');
    } else if (ctx.platform === 'instagram') {
      // IG: Reels > Carousels > Stories
      if (ctx.timeBudget === 'urgent') {
        formats.push('reel');
      } else {
        formats.push('reel', 'carousel');
        if (ctx.qualityThreshold === 'draft') formats.push('story');
      }
    } else {
      // TikTok: Video-first, photos secondary
      formats.push('tiktok-video');
      if (ctx.timeBudget !== 'urgent') formats.push('tiktok-photo');
    }

    return formats;
  }

  /**
   * Decide which enrichment layers to apply
   */
  private selectEnrichmentLayers(ctx: DecisionContext, _formats: ContentType[]): EnrichmentLayer[] {
    const layers: EnrichmentLayer[] = [];

    // Always: virality (fast, high-impact)
    layers.push('virality');

    // Add trending if quality threshold allows
    if (ctx.qualityThreshold !== 'draft') {
      layers.push('trending');
    }

    // Add feedback amplification if time available + high follower count
    if (ctx.timeBudget !== 'urgent' && (ctx.account?.followerCount ?? 0) > 10000) {
      layers.push('feedback-amplification');
    }

    // Add cross-platform if multi-platform
    if (ctx.platform === 'both' && ctx.timeBudget !== 'urgent') {
      layers.push('cross-platform');
    }

    // Add engagement loop if time available (monitoring)
    if (ctx.timeBudget === 'extended' && (ctx.account?.consistency ?? 0) > 0.6) {
      layers.push('engagement-loop');
    }

    log.info('[AgentDecision] Enrichment layers selected', {
      topic: ctx.topic,
      layers: layers.join(','),
      timeBudget: ctx.timeBudget,
    });

    return layers;
  }

  /**
   * Variant generation decision: when to A/B test
   */
  private variantDecision(
    ctx: DecisionContext,
    layers: EnrichmentLayer[],
  ): { shouldGenerateVariants: boolean; variantCount: number } {
    // Don't variant if: urgent or draft
    if (ctx.timeBudget === 'urgent' || ctx.qualityThreshold === 'draft') {
      return { shouldGenerateVariants: false, variantCount: 0 };
    }

    // Always variant if: account large, quality threshold high, feedback amplification active
    if (
      (ctx.account?.followerCount ?? 0) > 50000 ||
      ctx.qualityThreshold === 'viral-ready' ||
      layers.includes('feedback-amplification')
    ) {
      return { shouldGenerateVariants: true, variantCount: 3 }; // control + A + B
    }

    // Sometimes variant if: extended time, good account
    if (ctx.timeBudget === 'extended' && (ctx.account?.followerCount ?? 0) > 5000) {
      return { shouldGenerateVariants: true, variantCount: 2 }; // control + A
    }

    return { shouldGenerateVariants: false, variantCount: 0 };
  }

  /**
   * Publishing strategy: timing + platform + pattern
   */
  private decidePublishingStrategy(ctx: DecisionContext, _formats: ContentType[]): AgentDecision['publishingStrategy'] {
    const platforms: Array<{ platform: 'instagram' | 'tiktok'; timing: string }> = [];
    let schedulingPattern: 'immediate' | 'staggered' | 'a-b-test' = 'immediate';

    if (ctx.platform === 'instagram') {
      platforms.push({ platform: 'instagram', timing: ctx.timeBudget === 'urgent' ? 'ASAP' : '12pm or 6pm' });
    } else if (ctx.platform === 'tiktok') {
      platforms.push({ platform: 'tiktok', timing: ctx.timeBudget === 'urgent' ? 'ASAP' : '8pm-10pm' });
    } else {
      // Both: stagger (IG first, TikTok 2h later)
      platforms.push({ platform: 'instagram', timing: '12pm or 6pm' });
      platforms.push({ platform: 'tiktok', timing: '8pm-10pm (2h gap)' });
      schedulingPattern = 'staggered';
    }

    // If variants: A/B test pattern
    if (ctx.timeBudget === 'extended') {
      schedulingPattern = 'a-b-test';
    }

    const bestPostingHours = ctx.platform === 'instagram' ? [9, 12, 18, 20] : [6, 12, 18, 20, 21, 22];

    return {
      platforms,
      schedulingPattern,
      bestPostingHours,
    };
  }

  /**
   * Estimate reach based on format + layers + account
   */
  private estimateReach(ctx: DecisionContext, _formats: ContentType[], layers: EnrichmentLayer[]): number {
    let baselineReach = ctx.account?.followerCount ?? 1000;

    // Format impact
    const formatBoost = _formats.includes('reel') ? 1.5 : _formats.includes('carousel') ? 1.2 : 1.0;
    baselineReach *= formatBoost;

    // Enrichment layer impact
    let enrichmentMultiplier = 1.0;
    if (layers.includes('virality')) enrichmentMultiplier *= 1.3;
    if (layers.includes('trending')) enrichmentMultiplier *= 1.4;
    if (layers.includes('feedback-amplification')) enrichmentMultiplier *= 1.2;
    if (layers.includes('cross-platform')) enrichmentMultiplier *= 1.1;
    if (layers.includes('engagement-loop')) enrichmentMultiplier *= 1.15;

    baselineReach *= enrichmentMultiplier;

    // Quality threshold (viral-ready = higher algorithm lift)
    if (ctx.qualityThreshold === 'viral-ready') baselineReach *= 1.4;

    return Math.round(baselineReach);
  }

  /**
   * Build human-readable rationale
   */
  private buildRationale(
    ctx: DecisionContext,
    formats: ContentType[],
    layers: EnrichmentLayer[],
    variant: boolean,
  ): string {
    const parts: string[] = [];

    parts.push(
      `${ctx.timeBudget === 'urgent' ? 'Fast track' : 'Optimized'}  for ${ctx.contentType}s on ${ctx.platform}.`,
    );

    if (formats.length === 1) {
      parts.push(`Format: ${formats[0]} (best for ${ctx.platform}).`);
    } else {
      parts.push(`Formats: ${formats.join(', ')} (multi-format reach).`);
    }

    const layerLabels = {
      virality: 'improve hook + appeal',
      trending: 'inject trending topics',
      'feedback-amplification': 'bias toward proven patterns',
      'cross-platform': 'optimize per platform algo',
      'engagement-loop': 'monitor + respond to comments',
    };
    const activeLayers = layers.map((l) => layerLabels[l]).filter(Boolean);
    if (activeLayers.length > 0) {
      parts.push(`Enrichments: ${activeLayers.join('; ')}.`);
    }

    if (variant) {
      parts.push(`A/B test enabled (control + variants).`);
    }

    return parts.join(' ');
  }

  /**
   * Get decision presets for common use cases
   */
  getPreset(useCase: 'viral' | 'evergreen' | 'engagement' | 'quick-post'): Partial<DecisionContext> {
    const presets: Record<string, Partial<DecisionContext>> = {
      viral: {
        timeBudget: 'extended',
        qualityThreshold: 'viral-ready',
        platform: 'both',
      },
      evergreen: {
        timeBudget: 'standard',
        qualityThreshold: 'good',
        platform: 'instagram',
      },
      engagement: {
        timeBudget: 'extended',
        qualityThreshold: 'excellent',
        platform: 'both',
      },
      'quick-post': {
        timeBudget: 'urgent',
        qualityThreshold: 'draft',
        platform: 'instagram',
      },
    };
    return presets[useCase] ?? {};
  }
}

export const agentDecisionFrameworkService = new AgentDecisionFrameworkService();
