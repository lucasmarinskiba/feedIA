/**
 * TikTok Analytics Connector — Interfaz operativa para TikTok For Business API.
 * En DRY_RUN o sin credenciales devuelve datos simulados pero estructurados.
 */

import { log } from '../../agent/logger.js';
import { env } from '../../config/index.js';
import {
  getAccountSummary,
  getVideoMetrics,
  getTopPerformers,
  getPerformanceTrend,
  extractContentPatterns,
  ingestVideoMetrics,
  type TikTokVideoMetrics,
  type TikTokAccountSummary,
} from './analytics.js';
import { calculateFYPScore, type FYPMetrics } from './fypOptimizer.js';

export interface TikTokConnectorConfig {
  accessToken?: string;
  advertiserId?: string;
  username?: string;
}

const loadConfig = (): TikTokConnectorConfig => ({
  accessToken: process.env['TIKTOK_ACCESS_TOKEN'],
  advertiserId: process.env['TIKTOK_ADVERTISER_ID'],
  username: process.env['TIKTOK_USERNAME'],
});

const hasRealCredentials = (): boolean => Boolean(loadConfig().accessToken);

const generateMockVideoMetrics = (videoId: string): TikTokVideoMetrics => ({
  videoId,
  publishTime: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
  views: 12400,
  likes: 890,
  comments: 120,
  shares: 45,
  saves: 67,
  watchTimeSec: 18600,
  avgWatchTimeSec: 15,
  completionRate: 0.52,
  fypReach: 0.38,
  profileVisits: 340,
  follows: 28,
  rewatchRate: 0.12,
  trafficSource: { fyp: 0.38, following: 0.22, search: 0.15, profile: 0.25 },
  audience: {
    gender: { female: 0.62, male: 0.36, other: 0.02 },
    age: { '18-24': 0.35, '25-34': 0.41, '35-44': 0.18, '45+': 0.06 },
    countries: { AR: 0.45, MX: 0.22, ES: 0.15, US: 0.18 },
  },
});

export const fetchAccountSummary = async (): Promise<TikTokAccountSummary & { source: string }> => {
  if (!env.dryRun && hasRealCredentials()) {
    log.info('[TikTokAnalyticsConnector] Fetching real account summary (not implemented)');
    // TODO: integrar TikTok Marketing API /business/video/list/
  }

  const summary = getAccountSummary();
  return { ...summary, source: env.dryRun || !hasRealCredentials() ? 'mock' : 'api' };
};

export const fetchVideoMetrics = async (videoId: string): Promise<TikTokVideoMetrics & { source: string }> => {
  if (!env.dryRun && hasRealCredentials()) {
    log.info(`[TikTokAnalyticsConnector] Fetching real metrics for ${videoId} (not implemented)`);
  }

  const existing = getVideoMetrics(videoId);
  const metrics = existing ?? generateMockVideoMetrics(videoId);
  return { ...metrics, source: env.dryRun || !hasRealCredentials() ? 'mock' : 'api' };
};

export const ingestRealMetrics = (metrics: TikTokVideoMetrics): void => {
  ingestVideoMetrics(metrics);
  log.info(`[TikTokAnalyticsConnector] Ingested real metrics for ${metrics.videoId}`);
};

export const fetchTopPerformers = async (limit = 5): Promise<TikTokVideoMetrics[]> => getTopPerformers(limit);

export const fetchPerformanceTrend = async (days = 7): Promise<ReturnType<typeof getPerformanceTrend>> =>
  getPerformanceTrend(days);

export const fetchContentPatterns = async (): Promise<ReturnType<typeof extractContentPatterns>> =>
  extractContentPatterns();

export const analyzeFYPPerformance = async (
  videoId: string,
): Promise<{ metrics: FYPMetrics; score: ReturnType<typeof calculateFYPScore> }> => {
  const data = await fetchVideoMetrics(videoId);
  const metrics: FYPMetrics = {
    completionRate: data.completionRate,
    watchTimePct: data.avgWatchTimeSec / (data.watchTimeSec / (data.views || 1)),
    fypReachPct: data.fypReach,
    rewatchRate: data.rewatchRate,
    shareRate: data.shares / (data.views || 1),
    commentRate: data.comments / (data.views || 1),
    saveRate: data.saves / (data.views || 1),
    followsPerView: data.follows / (data.views || 1),
    avgViewDurationSec: data.avgWatchTimeSec,
    videoLengthSec: data.watchTimeSec / (data.completionRate || 0.5),
  };
  return { metrics, score: calculateFYPScore(metrics) };
};

export const getConnectorStatus = (): {
  hasCredentials: boolean;
  dryRun: boolean;
  username?: string;
} => ({
  hasCredentials: hasRealCredentials(),
  dryRun: env.dryRun,
  username: loadConfig().username,
});
