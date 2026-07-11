/**
 * Prompt Cache Layer
 *
 * Caches generated prompts by content pillar + variant type.
 * Incoming request → match pattern → return cached (skip generation).
 * Only regenerate if: cache miss OR quality threshold requires fresh.
 *
 * Goal: 60% fewer API calls (3x less spend).
 *
 * Cache key = hash(contentPillar + variantType + platform + brand)
 * TTL = 30 days
 */

import { log } from '../agent/logger.js';
import crypto from 'crypto';

export type ContentPillar = 'tips' | 'lifestyle' | 'education' | 'entertainment' | 'behind-the-scenes' | 'testimonial';
export type VariantType = 'hook' | 'body' | 'cta' | 'full-carousel' | 'reel-script';

interface CachedPrompt {
  key: string;
  pillar: ContentPillar;
  variant: VariantType;
  platform: 'instagram' | 'tiktok';
  brandNiche: string;
  prompt: string;
  createdAt: number;
  expiresAt: number;
  hitCount: number;
  qualityScore: number;
}

/**
 * In-memory cache (production: Redis)
 */
const promptCache: Map<string, CachedPrompt> = new Map();
const cacheStats = {
  hits: 0,
  misses: 0,
  regenerations: 0,
};

const TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

/**
 * Generate cache key
 */
const generateKey = (pillar: ContentPillar, variant: VariantType, platform: 'instagram' | 'tiktok', brandNiche: string): string => {
  const str = `${pillar}:${variant}:${platform}:${brandNiche}`;
  return crypto.createHash('sha256').update(str).digest('hex');
};

/**
 * Get cached prompt if available and not expired
 */
export const getCachedPrompt = (
  pillar: ContentPillar,
  variant: VariantType,
  platform: 'instagram' | 'tiktok',
  brandNiche: string,
): { hit: boolean; prompt?: string; qualityScore?: number } => {
  const key = generateKey(pillar, variant, platform, brandNiche);
  const cached = promptCache.get(key);

  if (!cached) {
    cacheStats.misses++;
    log.debug('[PromptCache] Cache miss', { key, pillar, variant });
    return { hit: false };
  }

  // Check expiration
  if (Date.now() > cached.expiresAt) {
    promptCache.delete(key);
    cacheStats.misses++;
    log.debug('[PromptCache] Cache expired', { key });
    return { hit: false };
  }

  // Hit
  cached.hitCount += 1;
  cacheStats.hits++;

  log.debug('[PromptCache] Cache hit', {
    key,
    hitCount: cached.hitCount,
    expiresIn: Math.round((cached.expiresAt - Date.now()) / 1000 / 3600) + 'h',
  });

  return { hit: true, prompt: cached.prompt, qualityScore: cached.qualityScore };
};

/**
 * Store prompt in cache
 */
export const cachePrompt = (
  pillar: ContentPillar,
  variant: VariantType,
  platform: 'instagram' | 'tiktok',
  brandNiche: string,
  prompt: string,
  qualityScore: number = 75,
): void => {
  const key = generateKey(pillar, variant, platform, brandNiche);
  const now = Date.now();

  const cached: CachedPrompt = {
    key,
    pillar,
    variant,
    platform,
    brandNiche,
    prompt,
    createdAt: now,
    expiresAt: now + TTL_MS,
    hitCount: 0,
    qualityScore,
  };

  promptCache.set(key, cached);

  log.debug('[PromptCache] Prompt cached', {
    key,
    size: prompt.length,
    expiresAt: new Date(cached.expiresAt).toISOString(),
  });
};

/**
 * Get cache statistics
 */
export const getCacheStats = (): {
  totalCached: number;
  hits: number;
  misses: number;
  hitRate: number;
  regenerations: number;
  estimatedSavingsUSD: number;
  topPillars: Array<{ pillar: ContentPillar; count: number }>;
} => {
  const totalRequests = cacheStats.hits + cacheStats.misses;
  const hitRate = totalRequests > 0 ? (cacheStats.hits / totalRequests) * 100 : 0;

  // Group by pillar
  const pillarStats = new Map<ContentPillar, number>();
  for (const cached of promptCache.values()) {
    const count = pillarStats.get(cached.pillar) || 0;
    pillarStats.set(cached.pillar, count + 1);
  }

  const topPillars = Array.from(pillarStats.entries())
    .map(([pillar, count]) => ({ pillar, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Estimate savings (assume $0.01 per cached prompt avoided)
  const estimatedSavingsUSD = cacheStats.hits * 0.01;

  return {
    totalCached: promptCache.size,
    hits: cacheStats.hits,
    misses: cacheStats.misses,
    hitRate,
    regenerations: cacheStats.regenerations,
    estimatedSavingsUSD,
    topPillars,
  };
};

/**
 * Clear cache (manual admin)
 */
export const clearCache = (): { cleared: number } => {
  const cleared = promptCache.size;
  promptCache.clear();
  cacheStats.hits = 0;
  cacheStats.misses = 0;
  cacheStats.regenerations = 0;

  log.info('[PromptCache] Cache cleared', { cleared });

  return { cleared };
};

/**
 * Suggest cached pillar/variant for reuse
 */
export const suggestCachedVariant = (
  pillar: ContentPillar,
  platform: 'instagram' | 'tiktok',
  brandNiche: string,
): Array<{ variant: VariantType; hitCount: number; qualityScore: number }> => {
  const suggestions: Array<{ variant: VariantType; hitCount: number; qualityScore: number }> = [];

  for (const cached of promptCache.values()) {
    if (cached.pillar === pillar && cached.platform === platform && cached.brandNiche === brandNiche) {
      suggestions.push({
        variant: cached.variant,
        hitCount: cached.hitCount,
        qualityScore: cached.qualityScore,
      });
    }
  }

  return suggestions.sort((a, b) => b.hitCount - a.hitCount);
};

/**
 * Warm cache with common prompts (bootstrap)
 */
export const warmCache = (commonPrompts: Array<{ pillar: ContentPillar; variant: VariantType; platform: 'instagram' | 'tiktok'; brandNiche: string; prompt: string }>) => {
  log.info('[PromptCache] Warming cache', { count: commonPrompts.length });

  for (const item of commonPrompts) {
    cachePrompt(item.pillar, item.variant, item.platform, item.brandNiche, item.prompt, 80);
  }
};
