/**
 * Competitor Signals — extrae brechas y oportunidades de competidores.
 */

import { trackCompetitors, type CompetitorSnapshot } from '../../../integrations/competitors.js';
import { log } from '../../../agent/logger.js';

export interface CompetitorSignals {
  competitors: CompetitorSnapshot[];
  avgEngagementRate: number;
  topHashtags: string[];
  topTopics: string[];
  gapOpportunities: string[];
  dataAvailable: boolean;
}

const MOCK_COMPETITORS: CompetitorSignals = {
  competitors: [],
  avgEngagementRate: 3.5,
  topHashtags: ['#InstagramTips', '#ContentStrategy', '#MarketingDigital'],
  topTopics: ['engagement', 'tendencias', 'errores comunes'],
  gapOpportunities: ['pocos tutoriales prácticos', 'ausencia de carruseles de datos'],
  dataAvailable: false,
};

const extractTopicsFromCaptions = (captions: string[]): string[] => {
  const stopwords = new Set(['el', 'la', 'los', 'las', 'de', 'que', 'en', 'y', 'a', 'un', 'una', 'para', 'con', 'por']);
  const words = captions
    .join(' ')
    .toLowerCase()
    .replace(/[^\wáéíóúüñ\s#]/g, '')
    .split(/\s+/)
    .filter((w) => w.length > 3 && !stopwords.has(w) && !w.startsWith('http'));
  const counts = new Map<string, number>();
  words.forEach((w) => counts.set(w, (counts.get(w) ?? 0) + 1));
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([w]) => w);
};

export const gatherCompetitorSignals = async (
  handles: string[],
  dryRun = true,
): Promise<CompetitorSignals> => {
  if (dryRun || handles.length === 0) {
    log.debug('[CompetitorSignals] DRY_RUN o sin handles: devolviendo mock');
    return { ...MOCK_COMPETITORS };
  }

  try {
    const competitors = await trackCompetitors(handles);
    const withEngagement = competitors.filter((c) => typeof c.engagementRate === 'number');
    const avgEngagementRate =
      withEngagement.length > 0
        ? withEngagement.reduce((s, c) => s + (c.engagementRate ?? 0), 0) / withEngagement.length
        : 0;

    const hashtagSet = new Set<string>();
    const captions: string[] = [];
    competitors.forEach((c) => {
      c.topHashtags?.forEach((h) => hashtagSet.add(h));
      c.topPosts?.forEach((p) => captions.push(p.caption));
    });

    const topTopics = extractTopicsFromCaptions(captions);

    return {
      competitors,
      avgEngagementRate: Math.round(avgEngagementRate * 100) / 100,
      topHashtags: Array.from(hashtagSet).slice(0, 15),
      topTopics,
      gapOpportunities: ['competidores no cubren nichos específicos detectados'],
      dataAvailable: true,
    };
  } catch (err) {
    log.warn('[CompetitorSignals] Error:', err);
    return MOCK_COMPETITORS;
  }
};
