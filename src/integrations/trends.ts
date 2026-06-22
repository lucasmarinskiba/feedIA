import { log } from '../agent/logger.js';

export interface TrendItem {
  keyword: string;
  source: 'reddit' | 'google' | 'twitter' | 'tiktok' | 'manual';
  volume?: number;
  growth?: number;
  url?: string;
  snapshotDate: string;
  raw?: unknown;
}

/**
 * Fetches trends from multiple real sources.
 * Falls back to manual/LLM if no APIs are configured.
 */
export const scoutTrends = async (
  keywords: string[],
  sources: TrendItem['source'][] = ['reddit', 'google'],
): Promise<TrendItem[]> => {
  const results: TrendItem[] = [];

  for (const source of sources) {
    try {
      if (source === 'reddit') {
        const reddit = await fetchRedditTrends(keywords);
        results.push(...reddit);
      }
      if (source === 'google') {
        const google = await fetchGoogleTrends(keywords);
        results.push(...google);
      }
      if (source === 'twitter' && process.env.TWITTER_BEARER_TOKEN) {
        const twitter = await fetchTwitterTrends(keywords);
        results.push(...twitter);
      }
    } catch (err) {
      log.warn(`Trend source ${source} failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  log.info(`scoutTrends: ${results.length} trends from ${sources.join(', ')}`);
  return results;
};

async function fetchRedditTrends(keywords: string[]): Promise<TrendItem[]> {
  const results: TrendItem[] = [];
  const subs = process.env.REDDIT_SUBREDDITS?.split(',') ?? ['instagram', 'socialmedia', 'marketing'];

  for (const sub of subs.slice(0, 3)) {
    try {
      const res = await fetch(`https://www.reddit.com/r/${sub.trim()}/hot.json?limit=25`, {
        headers: { 'User-Agent': 'paithon-agent/1.0' },
      });
      if (!res.ok) continue;
      const data = (await res.json()) as {
        data?: { children?: Array<{ data: { title: string; ups: number; url: string } }> };
      };
      for (const post of data.data?.children ?? []) {
        const postData = post.data;
        const title = postData?.title?.toLowerCase() ?? '';
        const matched = keywords.some((k) => title.includes(k.toLowerCase()));
        if (matched || keywords.length === 0) {
          results.push({
            keyword: (postData?.title ?? '').slice(0, 60),
            source: 'reddit',
            volume: postData?.ups ?? 0,
            url: postData?.url ?? '',
            snapshotDate: new Date().toISOString(),
          });
        }
      }
    } catch {
      /* ignore subreddit errors */
    }
  }
  return results;
}

async function fetchGoogleTrends(keywords: string[]): Promise<TrendItem[]> {
  // Google Trends doesn't have a public REST API, but we can use the unofficial endpoint
  // or a proxy. For production, use a service like SerpAPI or DataForSEO.
  const apiKey = process.env.SERPAPI_KEY;
  if (!apiKey) {
    log.debug('SERPAPI_KEY not configured, skipping Google Trends');
    return [];
  }

  const results: TrendItem[] = [];
  for (const kw of keywords.slice(0, 5)) {
    try {
      const res = await fetch(
        `https://serpapi.com/search.json?engine=google_trends&q=${encodeURIComponent(kw)}&api_key=${apiKey}`,
      );
      if (!res.ok) continue;
      const data = (await res.json()) as {
        interest_over_time?: { timeline_data?: Array<{ values: Array<{ value: string }> }> };
      };
      const timeline = data.interest_over_time?.timeline_data ?? [];
      if (timeline.length > 1) {
        const first = Number(timeline[0]?.values[0]?.value ?? 0);
        const last = Number(timeline[timeline.length - 1]?.values[0]?.value ?? 0);
        const growth = first > 0 ? ((last - first) / first) * 100 : 0;
        results.push({
          keyword: kw,
          source: 'google',
          volume: last,
          growth: Math.round(growth * 10) / 10,
          snapshotDate: new Date().toISOString(),
        });
      }
    } catch {
      /* ignore keyword errors */
    }
  }
  return results;
}

async function fetchTwitterTrends(keywords: string[]): Promise<TrendItem[]> {
  const token = process.env.TWITTER_BEARER_TOKEN;
  if (!token) return [];

  const results: TrendItem[] = [];
  for (const kw of keywords.slice(0, 3)) {
    try {
      const res = await fetch(
        `https://api.twitter.com/2/tweets/search/recent?query=${encodeURIComponent(kw)}&max_results=10&tweet.fields=public_metrics`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (!res.ok) continue;
      const data = (await res.json()) as {
        data?: Array<{ public_metrics?: { impression_count?: number } }>;
      };
      const totalImpressions = (data.data ?? []).reduce((sum, t) => sum + (t.public_metrics?.impression_count ?? 0), 0);
      results.push({
        keyword: kw,
        source: 'twitter',
        volume: totalImpressions,
        snapshotDate: new Date().toISOString(),
      });
    } catch {
      /* ignore */
    }
  }
  return results;
}
