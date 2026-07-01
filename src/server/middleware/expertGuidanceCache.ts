/**
 * Phase 9: Expert Guidance Cache Layer
 *
 * Caches expert guidance responses to reduce repeated lookups.
 * TTL: 5 minutes per tool
 */

import { log } from '../../agent/logger.js';
import type { SalaToolGuidance } from '../../brain/integration/salaToolsMaster.js';
import { salaToolsAPI } from '../../brain/integration/salaToolsMaster.js';

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const guidanceCache = new Map<string, CacheEntry<SalaToolGuidance>>();

export const getCachedGuidance = async (toolName: string): Promise<SalaToolGuidance | null> => {
  const cached = guidanceCache.get(toolName);

  if (cached && Date.now() < cached.expiresAt) {
    log.debug(`[Expert Cache] HIT: ${toolName}`);
    return cached.data;
  }

  log.debug(`[Expert Cache] MISS: ${toolName}`);
  guidanceCache.delete(toolName);
  return null;
};

export const cacheGuidance = (toolName: string, guidance: SalaToolGuidance): void => {
  guidanceCache.set(toolName, {
    data: guidance,
    expiresAt: Date.now() + CACHE_TTL,
  });
};

export const getGuidanceWithCache = async (toolName: string): Promise<SalaToolGuidance> => {
  const cached = await getCachedGuidance(toolName);
  if (cached) return cached;

  const toolGetter = salaToolsAPI[toolName as keyof typeof salaToolsAPI];
  if (!toolGetter) {
    throw new Error(`Unknown tool: ${toolName}`);
  }

  const guidance = await toolGetter();
  cacheGuidance(toolName, guidance);
  return guidance;
};

export const clearGuidanceCache = (): void => {
  guidanceCache.clear();
  log.info('[Expert Cache] Cleared all cached guidance');
};

export const getCacheStats = (): { size: number; entries: string[] } => {
  return {
    size: guidanceCache.size,
    entries: Array.from(guidanceCache.keys()),
  };
};
