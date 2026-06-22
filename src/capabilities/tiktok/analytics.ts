/**
 * TikTok Analytics — Ingesta y análisis de métricas de TikTok
 * Simula la API de TikTok For Business hasta que haya acceso real.
 */

import { log } from '../../agent/logger.js';

export interface TikTokVideoMetrics {
  videoId: string;
  publishTime: string;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  watchTimeSec: number;
  avgWatchTimeSec: number;
  completionRate: number;
  fypReach: number; // % de views que vinieron de FYP
  profileVisits: number;
  follows: number;
  rewatchRate: number;
  trafficSource: Record<string, number>;
  audience: {
    gender: Record<string, number>;
    age: Record<string, number>;
    countries: Record<string, number>;
  };
}

export interface TikTokAccountSummary {
  followers: number;
  followerGrowth7d: number;
  totalVideos: number;
  totalViews: number;
  avgViewsPerVideo: number;
  avgEngagementRate: number;
  topPerformingVideo?: TikTokVideoMetrics;
  worstPerformingVideo?: TikTokVideoMetrics;
}

const STORAGE_KEY = 'tiktok_analytics';

const loadMetrics = (): TikTokVideoMetrics[] => {
  try {
    const raw = process.env[STORAGE_KEY];
    return raw ? (JSON.parse(raw) as TikTokVideoMetrics[]) : [];
  } catch {
    return [];
  }
};

const saveMetrics = (metrics: TikTokVideoMetrics[]): void => {
  process.env[STORAGE_KEY] = JSON.stringify(metrics);
};

export const ingestVideoMetrics = (metrics: TikTokVideoMetrics): void => {
  const all = loadMetrics();
  const idx = all.findIndex((m) => m.videoId === metrics.videoId);
  if (idx >= 0) all[idx] = metrics;
  else all.push(metrics);
  saveMetrics(all);
  log.info(`[TikTokAnalytics] Ingested metrics for ${metrics.videoId}: ${metrics.views} views`);
};

export const getVideoMetrics = (videoId: string): TikTokVideoMetrics | undefined =>
  loadMetrics().find((m) => m.videoId === videoId);

export const getAccountSummary = (): TikTokAccountSummary => {
  const all = loadMetrics();
  const totalViews = all.reduce((s, m) => s + m.views, 0);
  const avgViews = all.length > 0 ? totalViews / all.length : 0;
  const avgEngagement =
    all.length > 0 ? all.reduce((s, m) => s + (m.likes + m.comments + m.shares) / (m.views || 1), 0) / all.length : 0;

  const sorted = [...all].sort((a, b) => b.views - a.views);

  return {
    followers: 15000, // placeholder
    followerGrowth7d: 450,
    totalVideos: all.length,
    totalViews,
    avgViewsPerVideo: Math.round(avgViews),
    avgEngagementRate: Math.round(avgEngagement * 1000) / 1000,
    topPerformingVideo: sorted[0],
    worstPerformingVideo: sorted[sorted.length - 1],
  };
};

export const getTopPerformers = (limit = 5): TikTokVideoMetrics[] => {
  return [...loadMetrics()].sort((a, b) => b.views - a.views).slice(0, limit);
};

export const getPerformanceTrend = (days = 7): Array<{ date: string; views: number; engagementRate: number }> => {
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const recent = loadMetrics().filter((m) => m.publishTime >= cutoff);

  const byDate = new Map<string, TikTokVideoMetrics[]>();
  for (const m of recent) {
    const date = m.publishTime.slice(0, 10);
    const arr = byDate.get(date) ?? [];
    arr.push(m);
    byDate.set(date, arr);
  }

  return Array.from(byDate.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, videos]) => {
      const views = videos.reduce((s, m) => s + m.views, 0);
      const engagement =
        videos.reduce((s, m) => s + (m.likes + m.comments + m.shares) / (m.views || 1), 0) / videos.length;
      return { date, views, engagementRate: Math.round(engagement * 1000) / 1000 };
    });
};

export interface ContentPattern {
  format: string;
  avgViews: number;
  avgEngagement: number;
  fypReachAvg: number;
  sampleSize: number;
  recommendation: string;
}

export const extractContentPatterns = (): ContentPattern[] => {
  const all = loadMetrics();
  // Simple pattern extraction by video length buckets
  const buckets: Record<string, TikTokVideoMetrics[]> = {
    short_0_7s: [],
    mid_7_15s: [],
    long_15_30s: [],
    'very_long_30s+': [],
  };

  for (const m of all) {
    const duration = m.watchTimeSec / (m.completionRate || 0.5);
    if (duration <= 7) buckets['short_0_7s']!.push(m);
    else if (duration <= 15) buckets['mid_7_15s']!.push(m);
    else if (duration <= 30) buckets['long_15_30s']!.push(m);
    else buckets['very_long_30s+']!.push(m);
  }

  return Object.entries(buckets)
    .filter(([, v]) => v.length > 0)
    .map(([format, videos]) => {
      const avgViews = videos.reduce((s, m) => s + m.views, 0) / videos.length;
      const avgEng = videos.reduce((s, m) => s + (m.likes + m.comments + m.shares) / (m.views || 1), 0) / videos.length;
      const avgFyp = videos.reduce((s, m) => s + m.fypReach, 0) / videos.length;
      return {
        format,
        avgViews: Math.round(avgViews),
        avgEngagement: Math.round(avgEng * 1000) / 1000,
        fypReachAvg: Math.round(avgFyp * 1000) / 1000,
        sampleSize: videos.length,
        recommendation:
          avgFyp > 0.5
            ? `${format}: FYP king. Hacer más de este formato.`
            : `${format}: FYP débil. Revisar hooks y sound selection.`,
      };
    });
};
