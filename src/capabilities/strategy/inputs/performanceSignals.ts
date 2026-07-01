/**
 * Performance Signals — extrae patrones ganadores de performanceDB.
 */

import {
  extractPatterns,
  getRecentPosts,
  getAccountSummary,
  type PostRecord,
} from '../../analytics/performanceDB.js';

export interface PerformanceSignals {
  topTopics: Array<{ topic: string; avgScore: number; count: number }>;
  topHooks: string[];
  bestFormats: Array<{ format: string; avgEngagement: number }>;
  bestHashtags: Array<{ hashtag: string; avgReach: number; count: number }>;
  recentPosts: PostRecord[];
  accountTrend: 'mejorando' | 'estable' | 'bajando';
  benchmarksAvailable: boolean;
}

export const gatherPerformanceSignals = (): PerformanceSignals => {
  const patterns = extractPatterns();
  const summary = getAccountSummary();

  return {
    topTopics: patterns.topTopics,
    topHooks: patterns.topHooks,
    bestFormats: patterns.bestFormats,
    bestHashtags: patterns.bestHashtags,
    recentPosts: getRecentPosts(30),
    accountTrend: summary.trend,
    benchmarksAvailable: summary.totalPosts >= 5,
  };
};

export const getWinningFormat = (): string | undefined => {
  const patterns = extractPatterns();
  return patterns.bestFormats[0]?.format;
};

export const getWinningTopics = (limit = 5): string[] => extractPatterns().topTopics.slice(0, limit).map((t) => t.topic);
