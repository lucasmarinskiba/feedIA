/**
 * FeedIA Cache Strategy Service
 * Intelligent caching for hot endpoints with automatic invalidation
 *
 * Caching Strategy:
 * - /api/trends/detect: 5 minutes (user-specific + days param)
 * - /api/trends/audio: 10 minutes (platform-specific)
 * - /api/roi/calculate: 15 minutes (format-specific, invalidate on cost tracking)
 * - /api/roi/compare: 15 minutes (formats-specific)
 * - /api/abtest/:id/results: 10 minutes (test-specific, invalidate on new events)
 * - /api/carousel/:id/metrics: 5 minutes (carousel-specific)
 */

import type { Request, Response } from 'express';
import { getCache, setCache, deleteCache } from '../cache/redis-client.js';

/**
 * Cache key generators for different endpoints
 */
export const generateCacheKey = {
  trends: (userId: string, days: string = '7'): string =>
    `trends:detect:${userId}:${days}`,

  trendingAudio: (platform: string = 'tiktok', limit: string = '10'): string =>
    `trends:audio:${platform}:${limit}`,

  roiCalculate: (format: string, topic: string, audience: string, budget: number): string =>
    `roi:calculate:${format}:${Buffer.from(`${topic}:${audience}`).toString('base64')}:${budget}`,

  roiCompare: (formats: string[], topic: string, audience: string, budget: number): string =>
    `roi:compare:${formats.sort().join(',')}:${Buffer.from(`${topic}:${audience}`).toString('base64')}:${budget}`,

  abtestResults: (testId: string): string =>
    `abtest:results:${testId}`,

  carouselMetrics: (carouselId: string): string =>
    `carousel:metrics:${carouselId}`,

  analyticsAggregation: (userId: string, metricType: string, period: string): string =>
    `analytics:agg:${userId}:${metricType}:${period}`,
};

/**
 * Cache invalidation patterns
 * Called when data changes (e.g., new cost tracked, new analytics event)
 */
export const invalidateCachePatterns = async (pattern: string, specificKey?: string): Promise<void> => {
  try {
    if (specificKey) {
      // Invalidate specific key
      await deleteCache(specificKey);
      console.log(`[Cache] Invalidated key: ${specificKey}`);
      return;
    }

    // Pattern-based invalidation (would need Redis SCAN in production)
    // For now, we invalidate commonly related keys
    const patterns: Record<string, string[]> = {
      cost: ['roi:calculate:*', 'roi:compare:*', 'analytics:agg:*'],
      analytics: ['trends:detect:*', 'abtest:results:*', 'carousel:metrics:*'],
      campaign: ['carousel:metrics:*', 'analytics:agg:*'],
    };

    const keysToInvalidate = patterns[pattern] || [];
    for (const key of keysToInvalidate) {
      // Note: Real Redis SCAN/UNLINK needed for production
      // This is a placeholder for pattern matching
      console.log(`[Cache] Invalidation pattern: ${key}`);
    }
  } catch (err) {
    console.warn('[Cache] Invalidation failed:', (err as Error).message);
  }
};

/**
 * Middleware: Automatic cache check + set for GET endpoints
 * Usage: app.get('/api/trends/detect', cacheMiddleware(5 * 60), detectTrends)
 */
export const cacheMiddleware = (ttlSeconds: number) => {
  return async (req: Request, res: Response, next: () => void): Promise<void> => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      next();
      return;
    }

    try {
      // Generate cache key from route + query params
      const cacheKey = `${req.path}:${JSON.stringify(req.query)}`;
      const cached = await getCache<unknown>(cacheKey);

      if (cached) {
        console.log(`[Cache] HIT: ${cacheKey}`);
        res.set('X-Cache', 'HIT');
        res.json(cached);
        return;
      }

      // Monkey-patch res.json to auto-cache successful responses
      const originalJson = res.json.bind(res);
      res.json = ((data: unknown): Response => {
        if (res.statusCode === 200) {
          setCache(cacheKey, data, ttlSeconds).catch(() => {
            // Silently fail if cache unavailable
          });
          res.set('X-Cache', 'MISS');
        }
        return originalJson(data);
      }) as typeof res.json;

      next();
    } catch (err) {
      console.warn('[Cache] Middleware error:', (err as Error).message);
      next(); // Fail open, continue without caching
    }
  };
};

/**
 * Manual cache operations for complex endpoints
 */
export const withCaching = async <T>(
  key: string,
  ttlSeconds: number,
  fetcher: () => Promise<T>,
): Promise<T> => {
  // Try cache first
  const cached = await getCache<T>(key);
  if (cached) {
    console.log(`[Cache] HIT: ${key}`);
    return cached;
  }

  // Cache miss: fetch fresh data
  console.log(`[Cache] MISS: ${key} — fetching fresh data`);
  const data = await fetcher();

  // Store in cache
  await setCache(key, data, ttlSeconds).catch(() => {
    console.warn(`[Cache] Failed to cache key: ${key}`);
  });

  return data;
};

/**
 * Cache statistics for monitoring
 */
interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  avgResponseTime: number;
}

const stats: CacheStats = {
  hits: 0,
  misses: 0,
  hitRate: 0,
  avgResponseTime: 0,
};

export const recordCacheHit = (): void => {
  stats.hits++;
  updateHitRate();
};

export const recordCacheMiss = (): void => {
  stats.misses++;
  updateHitRate();
};

const updateHitRate = (): void => {
  const total = stats.hits + stats.misses;
  stats.hitRate = total > 0 ? (stats.hits / total) * 100 : 0;
};

export const getCacheStats = (): CacheStats => stats;

export const resetCacheStats = (): void => {
  stats.hits = 0;
  stats.misses = 0;
  stats.hitRate = 0;
  stats.avgResponseTime = 0;
};

/**
 * TTL Configuration
 */
export const CACHE_TTL = {
  TRENDS_DETECT: 5 * 60, // 5 minutes
  TRENDS_AUDIO: 10 * 60, // 10 minutes
  ROI_CALCULATE: 15 * 60, // 15 minutes
  ROI_COMPARE: 15 * 60, // 15 minutes
  ABTEST_RESULTS: 10 * 60, // 10 minutes
  CAROUSEL_METRICS: 5 * 60, // 5 minutes
  ANALYTICS_AGG: 10 * 60, // 10 minutes
  CONVERSION_FORECAST: 30 * 60, // 30 minutes (less volatile)
} as const;

/**
 * Batch cache operations
 */
export const prewarmCache = async (keys: Array<{ key: string; value: unknown; ttl: number }>): Promise<void> => {
  console.log(`[Cache] Prewarming ${keys.length} keys...`);
  const results = await Promise.allSettled(
    keys.map(({ key, value, ttl }) => setCache(key, value, ttl)),
  );

  const failed = results.filter((r) => r.status === 'rejected').length;
  if (failed > 0) {
    console.warn(`[Cache] Prewarm: ${failed}/${keys.length} keys failed`);
  }
};

/**
 * Cache health check
 */
export const cacheHealthCheck = async (): Promise<{
  status: 'healthy' | 'degraded' | 'offline';
  latencyMs: number;
  message: string;
}> => {
  try {
    const testKey = '__cache:health:test__';
    const start = Date.now();

    await setCache(testKey, { test: true }, 1);
    const cached = await getCache(testKey);
    await deleteCache(testKey);

    const latencyMs = Date.now() - start;

    if (cached) {
      return {
        status: 'healthy',
        latencyMs,
        message: `Cache responding normally (${latencyMs}ms)`,
      };
    }

    return {
      status: 'degraded',
      latencyMs,
      message: 'Cache write/read mismatch',
    };
  } catch (err) {
    return {
      status: 'offline',
      latencyMs: -1,
      message: `Cache unavailable: ${(err as Error).message}`,
    };
  }
};

export default {
  generateCacheKey,
  invalidateCachePatterns,
  cacheMiddleware,
  withCaching,
  getCacheStats,
  resetCacheStats,
  prewarmCache,
  cacheHealthCheck,
  CACHE_TTL,
};
