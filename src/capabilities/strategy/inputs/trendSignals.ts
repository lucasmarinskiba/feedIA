/**
 * Trend Signals — detecta tendencias de búsqueda, audio y hashtags.
 *
 * En DRY_RUN usa simulación determinista. En producción consulta
 * Reddit, Google Trends/Twitter vía `scoutTrends`.
 */

import { scoutTrends, type TrendItem } from '../../../integrations/trends.js';
import { log } from '../../../agent/logger.js';

export interface TrendSignals {
  trendingTopics: Array<{ topic: string; score: number }>;
  trendingHashtags: Array<{ hashtag: string; score: number }>;
  trendingAudio: Array<{ title: string; score: number }>;
  relevanceToBrand: number; // 0-100
}

const MOCK_TRENDS: TrendSignals = {
  trendingTopics: [
    { topic: 'cortesía profesional', score: 72 },
    { topic: 'gestión del tiempo', score: 68 },
    { topic: 'marca personal', score: 64 },
    { topic: 'contenido educativo', score: 58 },
    { topic: 'productividad sin burnout', score: 55 },
  ],
  trendingHashtags: [
    { hashtag: '#CMOTips', score: 70 },
    { hashtag: '#InstagramStrategy', score: 65 },
    { hashtag: '#ContentMarketing', score: 60 },
  ],
  trendingAudio: [],
  relevanceToBrand: 60,
};

const toTrendScore = (item: TrendItem): number => {
  const volume = item.volume ?? 0;
  const growth = item.growth ?? 0;
  const base = Math.min(volume / 100, 100) * 0.6 + Math.max(0, Math.min(growth, 100)) * 0.4;
  return Math.round(Math.min(100, Math.max(10, base)));
};

export const gatherTrendSignals = async (brandName: string, dryRun = true): Promise<TrendSignals> => {
  if (dryRun) {
    log.debug('[TrendSignals] Modo DRY_RUN: devolviendo tendencias simuladas');
    return { ...MOCK_TRENDS };
  }

  try {
    const items = await scoutTrends([brandName, 'instagram', 'marketing'], ['reddit', 'google']);
    const trendingTopics = items.map((i) => ({ topic: i.keyword, score: toTrendScore(i) }));
    return {
      trendingTopics,
      trendingHashtags: [], // se puede derivar con LLM o hashtagify en el futuro
      trendingAudio: [],
      relevanceToBrand: trendingTopics.length > 0 ? Math.round(trendingTopics.reduce((s, t) => s + t.score, 0) / trendingTopics.length) : 50,
    };
  } catch (err) {
    log.warn('[TrendSignals] Error obteniendo tendencias:', err);
    return MOCK_TRENDS;
  }
};
