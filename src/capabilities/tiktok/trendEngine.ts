/**
 * TikTok Trend Engine — Scraper de tendencias desde TikTok Creative Center y fuentes externas
 * Detecta trending sounds, hashtags, creators, challenges y formatos virales.
 */

import { log } from '../../agent/logger.js';

export interface TikTokTrend {
  id: string;
  type: 'sound' | 'hashtag' | 'creator' | 'challenge' | 'effect' | 'format';
  name: string;
  url?: string;
  velocity: number; // 0-100, qué tan rápido crece
  postsCount: number;
  viewsCount: number;
  peakTime?: string;
  region: string;
  category?: string;
  suggestedUse: string;
  freshness: 'rising' | 'peak' | 'declining';
}

export interface TikTokSoundTrend extends TikTokTrend {
  type: 'sound';
  artist: string;
  durationSec: number;
  bpm?: number;
  dropTimestamp?: number; // segundos donde ocurre el beat drop
  genre?: string;
}

const MOCK_TRENDS: Array<TikTokTrend | TikTokSoundTrend> = [
  {
    id: 'tt-sound-1',
    type: 'sound',
    name: 'Original Sound - Trending Beat',
    artist: 'Unknown',
    durationSec: 15,
    bpm: 128,
    dropTimestamp: 3.5,
    velocity: 92,
    postsCount: 450000,
    viewsCount: 1200000000,
    region: 'global',
    category: 'dance',
    freshness: 'peak',
    suggestedUse: 'Usar para transiciones rápidas. Drop en 3.5s = corte visual.',
  },
  {
    id: 'tt-hash-1',
    type: 'hashtag',
    name: '#LearnOnTikTok',
    velocity: 78,
    postsCount: 8900000,
    viewsCount: 45000000000,
    region: 'global',
    category: 'education',
    freshness: 'rising',
    suggestedUse: 'Educational content con hook en primer segundo.',
  },
  {
    id: 'tt-chal-1',
    type: 'challenge',
    name: 'Transition Challenge 2025',
    velocity: 85,
    postsCount: 230000,
    viewsCount: 890000000,
    region: 'global',
    category: 'creative',
    freshness: 'peak',
    suggestedUse: 'Dos outfits, corte en beat drop. Usar transición de zoom.',
  },
  {
    id: 'tt-format-1',
    type: 'format',
    name: 'Storytime + Text Overlay',
    velocity: 72,
    postsCount: 120000,
    viewsCount: 340000000,
    region: 'global',
    category: 'storytelling',
    freshness: 'rising',
    suggestedUse: 'Voz en off + texto grande sincronizado. 7-15s.',
  },
];

export const fetchTikTokTrends = async (opts?: {
  region?: string;
  category?: string;
  type?: TikTokTrend['type'];
  minVelocity?: number;
  limit?: number;
}): Promise<TikTokTrend[]> => {
  log.info('[TikTokTrendEngine] Fetching trends...');

  // TODO: Implementar scraper real de TikTok Creative Center
  // Por ahora, simulación + posible llamada a API externa
  let trends = [...MOCK_TRENDS];

  if (opts?.region) trends = trends.filter((t) => t.region === opts.region || t.region === 'global');
  if (opts?.category) trends = trends.filter((t) => t.category === opts.category);
  if (opts?.type) trends = trends.filter((t) => t.type === opts.type);
  if (opts?.minVelocity) trends = trends.filter((t) => t.velocity >= opts.minVelocity!);

  trends.sort((a, b) => b.velocity - a.velocity);
  return trends.slice(0, opts?.limit ?? 20);
};

export const fetchTikTokSounds = async (opts?: {
  genre?: string;
  minBpm?: number;
  maxBpm?: number;
  limit?: number;
}): Promise<TikTokSoundTrend[]> => {
  const sounds = MOCK_TRENDS.filter((t) => t.type === 'sound') as TikTokSoundTrend[];
  let filtered = sounds;
  if (opts?.genre) filtered = filtered.filter((s) => s.genre === opts.genre);
  if (opts?.minBpm) filtered = filtered.filter((s) => (s.bpm ?? 0) >= opts.minBpm!);
  if (opts?.maxBpm) filtered = filtered.filter((s) => (s.bpm ?? 999) <= opts.maxBpm!);
  return filtered.slice(0, opts?.limit ?? 10);
};

export const getTrendingHashtags = async (limit = 10): Promise<TikTokTrend[]> => {
  return fetchTikTokTrends({ type: 'hashtag', limit });
};

export const getTrendingSounds = async (limit = 10): Promise<TikTokSoundTrend[]> => {
  return fetchTikTokSounds({ limit });
};

export const getTrendingChallenges = async (limit = 10): Promise<TikTokTrend[]> => {
  return fetchTikTokTrends({ type: 'challenge', limit });
};

export interface TrendRecommendation {
  contentAngle: string;
  suggestedSound: string;
  suggestedHashtags: string[];
  estimatedViralityScore: number;
  reasoning: string;
}

export const recommendContentFromTrends = async (niche: string): Promise<TrendRecommendation> => {
  const trends = await fetchTikTokTrends({ limit: 5 });
  const sounds = await fetchTikTokSounds({ limit: 3 });
  const hashtags = await getTrendingHashtags(5);

  const topSound = sounds[0];
  const topHashtags = hashtags.slice(0, 3).map((h) => h.name);

  return {
    contentAngle: `${niche} + ${trends[0]?.name ?? 'trending format'}`,
    suggestedSound: topSound?.name ?? 'Trending sound',
    suggestedHashtags: [...topHashtags, `#${niche.replace(/\s+/g, '')}`, '#fyp', '#viral'],
    estimatedViralityScore: Math.round((trends[0]?.velocity ?? 50) * 0.8),
    reasoning: `Trend ${trends[0]?.name} creciendo a ${trends[0]?.velocity}/100. Sound ${topSound?.name} con ${topSound?.postsCount} posts.`,
  };
};
