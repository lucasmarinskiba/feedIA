/**
 * Niche Cache Service
 *
 * Persistent memory of winning content patterns per niche.
 * Updated by feedback loop when variant winners identified.
 * Biases future generation toward proven-successful improvements.
 *
 * Per-niche pattern library: {improvement: hit_count, alternative_angle: hit_count, ...}
 */

import { log } from '../agent/logger.js';

export interface NichePattern {
  improvement: string;
  hitCount: number;
  lastWonAt: number;
  variance: number; // How often this improvement wins (0-1)
}

interface NichePatternSet {
  nicheId: string;
  improvements: Map<string, NichePattern>;
  alternativeAngles: Map<string, NichePattern>;
  lastUpdatedAt: number;
  totalWins: number;
}

class NicheCacheService {
  private nicheCache: Map<string, NichePatternSet> = new Map();

  /**
   * Record a winning variant and extract patterns
   */
  recordWin(nicheId: string, improvements: string[], alternativeAngle?: string): void {
    let niche = this.nicheCache.get(nicheId);
    if (!niche) {
      niche = {
        nicheId,
        improvements: new Map(),
        alternativeAngles: new Map(),
        lastUpdatedAt: Date.now(),
        totalWins: 0,
      };
      this.nicheCache.set(nicheId, niche);
    }

    const now = Date.now();

    // Record improvement wins
    for (const imp of improvements) {
      const existing = niche.improvements.get(imp) || {
        improvement: imp,
        hitCount: 0,
        lastWonAt: 0,
        variance: 0,
      };
      existing.hitCount += 1;
      existing.lastWonAt = now;
      existing.variance = Math.min(1, existing.hitCount / Math.max(5, niche.totalWins || 1));
      niche.improvements.set(imp, existing);
    }

    // Record alternative angle wins
    if (alternativeAngle) {
      const existing = niche.alternativeAngles.get(alternativeAngle) || {
        improvement: alternativeAngle,
        hitCount: 0,
        lastWonAt: 0,
        variance: 0,
      };
      existing.hitCount += 1;
      existing.lastWonAt = now;
      existing.variance = Math.min(1, existing.hitCount / Math.max(5, niche.totalWins || 1));
      niche.alternativeAngles.set(alternativeAngle, existing);
    }

    niche.lastUpdatedAt = now;
    niche.totalWins += 1;

    const lastImprovement = Array.from(niche.improvements.values()).pop();
    log.info('[NicheCache] Win recorded', {
      nicheId,
      improvementCount: improvements.length,
      totalWins: niche.totalWins,
      variance: Math.round((lastImprovement?.variance || 0) * 100) / 100,
    });
  }

  /**
   * Get top winning improvements for a niche (sorted by variance/hitCount)
   */
  getTopImprovements(nicheId: string, limit: number = 5): NichePattern[] {
    const niche = this.nicheCache.get(nicheId);
    if (!niche || niche.improvements.size === 0) return [];

    return Array.from(niche.improvements.values())
      .sort((a, b) => b.variance - a.variance || b.hitCount - a.hitCount)
      .slice(0, limit);
  }

  /**
   * Get top winning alternative angles for a niche
   */
  getTopAlternativeAngles(nicheId: string, limit: number = 3): NichePattern[] {
    const niche = this.nicheCache.get(nicheId);
    if (!niche || niche.alternativeAngles.size === 0) return [];

    return Array.from(niche.alternativeAngles.values())
      .sort((a, b) => b.variance - a.variance || b.hitCount - a.hitCount)
      .slice(0, limit);
  }

  /**
   * Get niche pattern stats
   */
  getStats(nicheId: string): {
    totalWins: number;
    uniqueImprovements: number;
    uniqueAngles: number;
    lastUpdated: number;
  } | null {
    const niche = this.nicheCache.get(nicheId);
    if (!niche) return null;

    return {
      totalWins: niche.totalWins,
      uniqueImprovements: niche.improvements.size,
      uniqueAngles: niche.alternativeAngles.size,
      lastUpdated: niche.lastUpdatedAt,
    };
  }

  /**
   * Get probability of success for improvement (based on variance)
   */
  getSuccessProbability(nicheId: string, improvement: string): number {
    const niche = this.nicheCache.get(nicheId);
    if (!niche) return 0;

    const pattern = niche.improvements.get(improvement);
    return pattern?.variance || 0;
  }

  /**
   * Clear niche cache
   */
  clearNiche(nicheId: string): void {
    this.nicheCache.delete(nicheId);
    log.info('[NicheCache] Niche cleared', { nicheId });
  }
}

export const nicheCacheService = new NicheCacheService();
