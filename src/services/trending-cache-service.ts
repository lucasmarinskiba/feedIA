/**
 * Trending Topics Cache Service
 *
 * In-memory cache of trending topics, refreshed every 4 hours.
 * Used to inject live trends into content generation briefs.
 *
 * Flow:
 * 1. getTrendingTopics() → return cached topics (or fetch if stale)
 * 2. Trends cached for 4h with auto-refresh
 * 3. Brief enrichment injects trending data into prompt
 */

import { log } from '../agent/logger.js';
import {
  detectTrendingOpportunities,
  adaptTrendToBrand,
  type TrendOpportunity,
} from '../capabilities/growth/trendingNow.js';
import type { BrandProfile } from '../config/types.js';

const CACHE_TTL_MS = 4 * 60 * 60 * 1000; // 4 hours
const TRENDING_REFRESH_INTERVAL_MS = CACHE_TTL_MS;

interface CachedTrends {
  topics: string[];
  opportunities: TrendOpportunity[];
  lastRefreshAt: number;
  expiresAt: number;
}

interface TrendingCacheEntry {
  data: CachedTrends;
  refreshTimeout?: NodeJS.Timeout;
}

class TrendingCacheService {
  private cache: Map<string, TrendingCacheEntry> = new Map();

  /**
   * Get trending topics for a brand. Fetches fresh if stale, otherwise returns cached.
   */
  async getTrendingTopics(brand: BrandProfile): Promise<string[]> {
    const brandId = brand.id || brand.name;
    const cached = this.cache.get(brandId);

    if (cached && !this.isStale(cached.data)) {
      log.info('[TrendingCache] Cache hit', { brandId, topicCount: cached.data.topics.length });
      return cached.data.topics;
    }

    log.info('[TrendingCache] Cache miss/stale, refreshing', { brandId });
    return this.refreshTrends(brand);
  }

  /**
   * Get full trending opportunities for a brand (trend + content idea + urgency)
   */
  async getTrendingOpportunities(brand: BrandProfile): Promise<TrendOpportunity[]> {
    const brandId = brand.id || brand.name;
    const cached = this.cache.get(brandId);

    if (cached && !this.isStale(cached.data)) {
      return cached.data.opportunities;
    }

    return this.refreshTrends(brand).then(() => {
      const entry = this.cache.get(brandId);
      return entry?.data.opportunities || [];
    });
  }

  /**
   * Manually refresh cache for a brand
   */
  private async refreshTrends(brand: BrandProfile): Promise<string[]> {
    const brandId = brand.id || brand.name;
    try {
      const opportunities = await detectTrendingOpportunities(brand);
      const topics = opportunities.map((opp) => opp.trend);

      const now = Date.now();
      const entry: CachedTrends = {
        topics,
        opportunities,
        lastRefreshAt: now,
        expiresAt: now + CACHE_TTL_MS,
      };

      // Cancel old refresh timeout if exists
      const oldEntry = this.cache.get(brandId);
      if (oldEntry?.refreshTimeout) {
        clearTimeout(oldEntry.refreshTimeout);
      }

      // Schedule auto-refresh
      const refreshTimeout = setTimeout(() => {
        log.info('[TrendingCache] Auto-refresh triggered', { brandId });
        this.refreshTrends(brand).catch((err) => {
          log.error('[TrendingCache] Auto-refresh failed', { brandId, error: String(err) });
        });
      }, TRENDING_REFRESH_INTERVAL_MS);

      this.cache.set(brandId, {
        data: entry,
        refreshTimeout,
      });

      log.info('[TrendingCache] Refreshed', {
        brandId,
        topicCount: topics.length,
        expiresAt: new Date(entry.expiresAt).toISOString(),
      });

      return topics;
    } catch (err) {
      log.error('[TrendingCache] Refresh failed', { brandId, error: String(err) });
      // Return empty array on failure, caller will handle gracefully
      return [];
    }
  }

  /**
   * Format trending topics into LLM-friendly string for brief enrichment
   */
  formatTrendingGuidance(topics: string[]): string {
    if (topics.length === 0) return '';
    return `=== TRENDING NOW (inject if relevant) ===\n${topics.map((t, i) => `${i + 1}. ${t}`).join('\n')}\nConsider angles above if aligned with brand message.`;
  }

  /**
   * Adapt a trending topic to a specific brand (for content customization)
   */
  async adaptTrend(brand: BrandProfile, trendName: string) {
    try {
      return await adaptTrendToBrand(brand, trendName);
    } catch (err) {
      const brandId = brand.id || brand.name;
      log.error('[TrendingCache] Adapt failed', { brandId, trend: trendName, error: String(err) });
      return null;
    }
  }

  /**
   * Clear all cache (manual override)
   */
  clearCache(): void {
    for (const entry of this.cache.values()) {
      if (entry.refreshTimeout) {
        clearTimeout(entry.refreshTimeout);
      }
    }
    this.cache.clear();
    log.info('[TrendingCache] Cache cleared');
  }

  private isStale(entry: CachedTrends): boolean {
    return Date.now() > entry.expiresAt;
  }
}

export const trendingCacheService = new TrendingCacheService();
