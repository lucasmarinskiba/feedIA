/**
 * TikTok Trend Scraper — Cache inteligente de tendencias con freshness scoring.
 * En producción reemplaza/mock por TikTok Creative Center API o scraper externo.
 */

import { log } from '../../agent/logger.js';
import { fetchTikTokTrends, type TikTokTrend, type TikTokSoundTrend } from './trendEngine.js';

export interface TrendSnapshot {
  fetchedAt: string;
  region: string;
  trends: TikTokTrend[];
  freshnessScore: number; // 0-100
}

const cache = new Map<string, TrendSnapshot>();
const FRESHNESS_DECAY_PER_HOUR = 8;

const buildCacheKey = (region: string, category?: string, type?: TikTokTrend['type']): string =>
  `${region}:${category ?? 'all'}:${type ?? 'all'}`;

const calculateFreshness = (fetchedAt: string): number => {
  const hours = (Date.now() - new Date(fetchedAt).getTime()) / (1000 * 60 * 60);
  return Math.max(0, 100 - hours * FRESHNESS_DECAY_PER_HOUR);
};

export const scrapeTrends = async (opts?: {
  region?: string;
  category?: string;
  type?: TikTokTrend['type'];
  minVelocity?: number;
  limit?: number;
  forceRefresh?: boolean;
}): Promise<TrendSnapshot> => {
  const region = opts?.region ?? 'global';
  const key = buildCacheKey(region, opts?.category, opts?.type);
  const cached = cache.get(key);

  if (!opts?.forceRefresh && cached && calculateFreshness(cached.fetchedAt) > 50) {
    log.info(`[TrendScraper] Cache hit for ${key} (freshness ${calculateFreshness(cached.fetchedAt).toFixed(0)})`);
    return cached;
  }

  log.info(`[TrendScraper] Fetching fresh trends for ${key}`);
  const trends = await fetchTikTokTrends({
    region,
    category: opts?.category,
    type: opts?.type,
    minVelocity: opts?.minVelocity,
    limit: opts?.limit,
  });

  const snapshot: TrendSnapshot = {
    fetchedAt: new Date().toISOString(),
    region,
    trends,
    freshnessScore: 100,
  };
  cache.set(key, snapshot);
  return snapshot;
};

export const getRisingTrends = async (region = 'global', limit = 10): Promise<TikTokTrend[]> => {
  const snapshot = await scrapeTrends({ region, limit: limit * 2 });
  return snapshot.trends.filter((t) => t.freshness === 'rising' && t.velocity >= 70).slice(0, limit);
};

export const getSoundTrends = async (region = 'global', limit = 5): Promise<TikTokSoundTrend[]> => {
  const snapshot = await scrapeTrends({ region, type: 'sound', limit });
  return snapshot.trends as TikTokSoundTrend[];
};

export const getHashtagTrends = async (region = 'global', limit = 5): Promise<TikTokTrend[]> => {
  const snapshot = await scrapeTrends({ region, type: 'hashtag', limit });
  return snapshot.trends;
};

export const invalidateTrendCache = (): void => {
  cache.clear();
  log.info('[TrendScraper] Trend cache invalidated');
};

export const getCacheStats = (): { keys: number; avgFreshness: number } => {
  const values = Array.from(cache.values());
  const avg = values.length > 0 ? values.reduce((s, v) => s + calculateFreshness(v.fetchedAt), 0) / values.length : 0;
  return { keys: values.length, avgFreshness: Math.round(avg) };
};
