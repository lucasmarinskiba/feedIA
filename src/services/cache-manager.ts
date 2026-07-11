/**
 * Cache Manager
 * In-memory caching layer for performance optimization
 * LRU eviction, TTL support, hit/miss tracking
 */

import { log } from '../agent/logger.js';

interface CacheEntry<T> {
  value: T;
  createdAt: number;
  ttlMs?: number;
  accessCount: number;
  lastAccessed: number;
}

interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  evictions: number;
  size: number;
  maxSize: number;
}

class CacheManager<T> {
  private cache: Map<string, CacheEntry<T>> = new Map();
  private maxSize: number;
  private stats = {
    hits: 0,
    misses: 0,
    evictions: 0,
  };

  constructor(maxSize: number = 1000) {
    this.maxSize = maxSize;
  }

  /**
   * Get from cache
   */
  get(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      return null;
    }

    // Check if expired
    if (entry.ttlMs && Date.now() - entry.createdAt > entry.ttlMs) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }

    // Update access metadata
    entry.accessCount++;
    entry.lastAccessed = Date.now();
    this.stats.hits++;

    return entry.value;
  }

  /**
   * Set in cache
   */
  set(key: string, value: T, ttlMs?: number): void {
    // Evict if at capacity
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      this.evictLRU();
    }

    this.cache.set(key, {
      value,
      createdAt: Date.now(),
      ttlMs,
      accessCount: 0,
      lastAccessed: Date.now(),
    });

    log.info('[Cache] Value cached', { key, ttl: ttlMs });
  }

  /**
   * Check if key exists
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);

    if (!entry) return false;

    // Check if expired
    if (entry.ttlMs && Date.now() - entry.createdAt > entry.ttlMs) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Delete from cache
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
    log.info('[Cache] Cache cleared');
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const total = this.stats.hits + this.stats.misses;
    const hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0;

    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate: Math.round(hitRate * 100) / 100,
      evictions: this.stats.evictions,
      size: this.cache.size,
      maxSize: this.maxSize,
    };
  }

  /**
   * Evict least recently used item
   */
  private evictLRU(): void {
    let lruKey: string | null = null;
    let lruTime = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessed < lruTime) {
        lruKey = key;
        lruTime = entry.lastAccessed;
      }
    }

    if (lruKey) {
      this.cache.delete(lruKey);
      this.stats.evictions++;
      log.info('[Cache] LRU eviction', { key: lruKey });
    }
  }

  /**
   * Cleanup expired entries
   */
  cleanup(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.ttlMs && now - entry.createdAt > entry.ttlMs) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    log.info('[Cache] Cleanup complete', { cleaned });
  }
}

// Export instances for different data types
export const promptCache = new CacheManager<string>(5000);
export const contentCache = new CacheManager<Record<string, any>>(2000);
export const validationCache = new CacheManager<Record<string, any>>(1000);
export const embeddingCache = new CacheManager<number[]>(10000);
