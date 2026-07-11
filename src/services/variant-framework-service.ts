/**
 * A/B Variant Framework
 *
 * Generate multiple content variants per piece for testing:
 * - Control: baseline generation
 * - Variant A: top virality improvements applied
 * - Variant B: alternative emotion/format
 *
 * Track variant metadata for performance analysis + feedback loop.
 */

import { log } from '../agent/logger.js';
import type { EnrichedBrief } from './virality-prompt-layer.js';

export interface ContentVariant {
  id: string;
  variantType: 'control' | 'virality-optimized' | 'alternative-angle';
  basePrompt: string;
  improvements: string[]; // virality improvements applied
  alternativeAngle?: string; // for alternative-angle variant
  metadata: {
    createdAt: number;
    viralScore?: number;
    ceilingScore?: number;
    trendingTopicsCount?: number;
    contentIntent?: string;
  };
  metrics?: {
    reach?: number;
    engagement?: number;
    saves?: number;
    shares?: number;
    timestamp?: number;
  };
}

interface VariantSet {
  controlId: string;
  variantIds: string[];
  basePrompt: string;
  enrichedBrief: EnrichedBrief;
  testStartAt?: number;
  winner?: string; // variant ID of best performer
}

class VariantFrameworkService {
  private variants: Map<string, ContentVariant> = new Map();
  private variantSets: Map<string, VariantSet> = new Map();

  /**
   * Generate 3 variants from enriched brief
   */
  generateVariants(enrichedBrief: EnrichedBrief, basePrompt: string): VariantSet {
    const setId = `variantset-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const now = Date.now();

    // Control: baseline
    const control: ContentVariant = {
      id: `${setId}:control`,
      variantType: 'control',
      basePrompt,
      improvements: [],
      metadata: {
        createdAt: now,
        viralScore: enrichedBrief.predictions.viralScore,
        ceilingScore: enrichedBrief.predictions.ceilingScore,
        trendingTopicsCount: enrichedBrief.trendingTopics?.length || 0,
        contentIntent: enrichedBrief.predictions.contentIntent,
      },
    };

    // Variant A: Top 2-3 virality improvements applied
    const topImprovements = enrichedBrief.viralityGuidance
      .filter((line) => line.includes('CRÍTICA') || line.includes('alta'))
      .slice(0, 3);

    const variantA: ContentVariant = {
      id: `${setId}:virality-optimized`,
      variantType: 'virality-optimized',
      basePrompt: [topImprovements.join('\n'), '', basePrompt].join('\n'),
      improvements: topImprovements,
      metadata: {
        createdAt: now,
        viralScore: enrichedBrief.predictions.viralScore,
        ceilingScore: enrichedBrief.predictions.ceilingScore,
        trendingTopicsCount: enrichedBrief.trendingTopics?.length || 0,
        contentIntent: enrichedBrief.predictions.contentIntent,
      },
    };

    // Variant B: Alternative angle (different emotion/format suggestion)
    const altAngle = this.generateAlternativeAngle(enrichedBrief.predictions.contentIntent);
    const variantB: ContentVariant = {
      id: `${setId}:alternative-angle`,
      variantType: 'alternative-angle',
      basePrompt: [
        `Alternative angle: ${altAngle}`,
        'Different emotion focus may increase engagement with diverse audience segments.',
        '',
        basePrompt,
      ].join('\n'),
      improvements: [`Alternative angle: ${altAngle}`],
      alternativeAngle: altAngle,
      metadata: {
        createdAt: now,
        viralScore: enrichedBrief.predictions.viralScore,
        ceilingScore: enrichedBrief.predictions.ceilingScore,
        trendingTopicsCount: enrichedBrief.trendingTopics?.length || 0,
        contentIntent: enrichedBrief.predictions.contentIntent,
      },
    };

    // Store variants
    [control, variantA, variantB].forEach((v) => this.variants.set(v.id, v));

    const set: VariantSet = {
      controlId: control.id,
      variantIds: [variantA.id, variantB.id],
      basePrompt,
      enrichedBrief,
      testStartAt: now,
    };

    this.variantSets.set(setId, set);

    log.info('[VariantFramework] Generated variant set', {
      setId,
      controlId: control.id,
      variantCount: 2,
      baseIntent: enrichedBrief.predictions.contentIntent,
    });

    return set;
  }

  /**
   * Record performance metrics for a variant
   */
  recordMetrics(variantId: string, metrics: Partial<ContentVariant['metrics']>): boolean {
    const variant = this.variants.get(variantId);
    if (!variant) {
      log.warn('[VariantFramework] Variant not found for metrics', { variantId });
      return false;
    }

    variant.metrics = {
      ...variant.metrics,
      ...metrics,
      timestamp: Date.now(),
    };

    log.info('[VariantFramework] Metrics recorded', { variantId, metrics });
    return true;
  }

  /**
   * Determine winner from variant set (best ER or engagement)
   */
  determineWinner(setId: string): string | null {
    const set = this.variantSets.get(setId);
    if (!set) return null;

    const allIds = [set.controlId, ...set.variantIds];
    const metricsMap = new Map(allIds.map((id) => [id, this.variants.get(id)?.metrics]));

    // Score: engagement rate (shares + saves + comments) > reach
    const scores = allIds.map((id) => {
      const m = metricsMap.get(id);
      if (!m) return { id, score: -1 };
      const engagementScore = (m.shares || 0) * 2 + (m.saves || 0) + (m.engagement || 0);
      const reachScore = (m.reach || 0) * 0.1;
      return { id, score: engagementScore + reachScore };
    });

    const winner = scores.sort((a, b) => b.score - a.score)[0];
    if (winner && winner.score >= 0) {
      set.winner = winner.id;
      log.info('[VariantFramework] Winner determined', { setId, winnerId: winner.id, score: winner.score });
      return winner.id;
    }

    return null;
  }

  /**
   * Extract winning patterns from variant set (for Niche Cache update)
   */
  extractWinningPatterns(setId: string): { improvements: string[]; angle?: string } | null {
    const set = this.variantSets.get(setId);
    if (!set || !set.winner) return null;

    const winnerVariant = this.variants.get(set.winner);
    if (!winnerVariant) return null;

    return {
      improvements: winnerVariant.improvements,
      angle: winnerVariant.alternativeAngle,
    };
  }

  /**
   * Get variant by ID
   */
  getVariant(variantId: string): ContentVariant | undefined {
    return this.variants.get(variantId);
  }

  /**
   * Get all variants in a set
   */
  getVariantSet(setId: string): VariantSet | undefined {
    return this.variantSets.get(setId);
  }

  private generateAlternativeAngle(currentIntent: string): string {
    const angleMap: Record<string, string> = {
      educational: 'emotional storytelling focus instead of tips/tricks',
      entertainment: 'educational value extraction from the entertainment hook',
      inspirational: 'practical actionable steps instead of motivation alone',
      controversial: 'consensus-building angle instead of debate',
      relatable: 'aspirational angle showing growth/transformation',
      promotional: 'authentic story/value focus instead of direct pitch',
      neutral: 'emotional engagement through surprise or curiosity',
    };

    return angleMap[currentIntent] || 'different emotional tone (empathy vs. urgency)';
  }
}

export const variantFrameworkService = new VariantFrameworkService();
