/**
 * Performance Caching Layer
 * In-memory cache for frequently accessed data
 * TTL-based eviction, size limits per tier
 */

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
  hitCount: number;
}

class CacheLayer {
  private cache = new Map<string, CacheEntry<unknown>>();
  private maxSize = 1000;
  private defaultTtlMs = 5 * 60 * 1000; // 5 minutes

  /**
   * Get cached value
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;

    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    entry.hitCount++;
    return entry.data;
  }

  /**
   * Set cache value
   */
  set<T>(key: string, data: T, ttlMs: number = this.defaultTtlMs): void {
    // Evict stale entries if approaching max size
    if (this.cache.size >= this.maxSize) {
      this.evictLRU();
    }

    this.cache.set(key, {
      data,
      expiresAt: Date.now() + ttlMs,
      hitCount: 0,
    });
  }

  /**
   * Evict least-recently-used entries
   */
  private evictLRU(): void {
    const entries = Array.from(this.cache.entries())
      .sort(([, a], [, b]) => a.hitCount - b.hitCount)
      .slice(0, Math.ceil(this.maxSize * 0.2)); // Remove bottom 20%

    entries.forEach(([key]) => this.cache.delete(key));
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Cache stats
   */
  stats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      entries: Array.from(this.cache.entries()).map(([key, entry]) => ({
        key,
        hitCount: entry.hitCount,
        expiresIn: entry.expiresAt - Date.now(),
      })),
    };
  }
}

export const cache = new CacheLayer();

/**
 * Cache middleware for Express
 */
export const cacheMiddleware = (ttlMs: number = 5 * 60 * 1000) => (req: any, res: any, next: any) => {
  const originalJson = res.json.bind(res);

  res.json = function (data: unknown) {
    // Cache GET requests with 2xx status
    if (req.method === 'GET' && res.statusCode >= 200 && res.statusCode < 300) {
      const cacheKey = `${req.method}:${req.url}`;
      cache.set(cacheKey, data, ttlMs);
    }
    return originalJson(data);
  };

  // Try cache first for GET requests
  if (req.method === 'GET') {
    const cacheKey = `${req.method}:${req.url}`;
    const cached = cache.get(cacheKey);

    if (cached) {
      return originalJson(cached);
    }
  }

  next();
};

/**
 * Memoize async function calls
 */
export const memoizeAsync = <T extends (...args: any[]) => Promise<any>>(
  fn: T,
  ttlMs: number = 5 * 60 * 1000
): T => {
  return (async (...args: any[]) => {
    const cacheKey = `${fn.name}:${JSON.stringify(args)}`;
    const cached = cache.get(cacheKey);

    if (cached) return cached;

    const result = await fn(...args);
    cache.set(cacheKey, result, ttlMs);
    return result;
  }) as T;
};
