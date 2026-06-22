import { log } from '../agent/logger.js';

export interface CompetitorSnapshot {
  handle: string;
  followers?: number;
  postsCount?: number;
  avgLikes?: number;
  avgComments?: number;
  engagementRate?: number;
  topHashtags?: string[];
  topPosts?: Array<{ url: string; likes: number; caption: string }>;
  snapshotDate: string;
  raw?: unknown;
}

/**
 * Tracks competitors using available APIs.
 * Supports:
 * - RapidAPI Instagram Data API
 * - Apify Instagram scraper webhook
 * - Manual JSON ingestion via webhook
 */
export const trackCompetitor = async (handle: string): Promise<CompetitorSnapshot> => {
  // Try RapidAPI first
  const rapidApiKey = process.env.RAPIDAPI_KEY;
  if (rapidApiKey) {
    try {
      return await fetchRapidApi(handle, rapidApiKey);
    } catch (err) {
      log.warn(`RapidAPI failed for ${handle}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // Try Apify webhook
  const apifyToken = process.env.APIFY_API_TOKEN;
  if (apifyToken) {
    try {
      return await fetchApify(handle, apifyToken);
    } catch (err) {
      log.warn(`Apify failed for ${handle}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // Try manual webhook
  const manualWebhook = process.env.COMPETITOR_WEBHOOK_URL;
  if (manualWebhook) {
    try {
      const res = await fetch(`${manualWebhook}?handle=${encodeURIComponent(handle)}`);
      if (res.ok) {
        const data = (await res.json()) as CompetitorSnapshot;
        return { ...data, snapshotDate: new Date().toISOString() };
      }
    } catch {
      /* ignore */
    }
  }

  log.warn(`No competitor API configured for ${handle}. Set RAPIDAPI_KEY, APIFY_API_TOKEN, or COMPETITOR_WEBHOOK_URL.`);
  return {
    handle,
    snapshotDate: new Date().toISOString(),
  };
};

export const trackCompetitors = async (handles: string[]): Promise<CompetitorSnapshot[]> => {
  const results: CompetitorSnapshot[] = [];
  for (const handle of handles) {
    const snap = await trackCompetitor(handle);
    results.push(snap);
    // Rate limit: wait 1s between requests
    await new Promise((r) => setTimeout(r, 1000));
  }
  return results;
};

async function fetchRapidApi(handle: string, apiKey: string): Promise<CompetitorSnapshot> {
  const res = await fetch(
    `https://instagram-scraper-api2.p.rapidapi.com/v1/info?username_or_id_or_url=${encodeURIComponent(handle)}`,
    {
      headers: {
        'x-rapidapi-key': apiKey,
        'x-rapidapi-host': 'instagram-scraper-api2.p.rapidapi.com',
      },
    },
  );
  if (!res.ok) throw new Error(`RapidAPI error: ${await res.text()}`);
  const data = (await res.json()) as {
    data?: {
      follower_count?: number;
      media_count?: number;
      biography?: string;
    };
  };

  // Fetch recent posts for engagement metrics
  const postsRes = await fetch(
    `https://instagram-scraper-api2.p.rapidapi.com/v1/posts?username_or_id_or_url=${encodeURIComponent(handle)}&count=12`,
    {
      headers: {
        'x-rapidapi-key': apiKey,
        'x-rapidapi-host': 'instagram-scraper-api2.p.rapidapi.com',
      },
    },
  );

  let avgLikes = 0;
  let avgComments = 0;
  let topHashtags: string[] = [];
  const topPosts: CompetitorSnapshot['topPosts'] = [];

  if (postsRes.ok) {
    const postsData = (await postsRes.json()) as {
      data?: {
        items?: Array<{ like_count?: number; comment_count?: number; caption?: { text?: string }; url?: string }>;
      };
    };
    const items = postsData.data?.items ?? [];
    if (items.length > 0) {
      const totalLikes = items.reduce((s, p) => s + (p.like_count ?? 0), 0);
      const totalComments = items.reduce((s, p) => s + (p.comment_count ?? 0), 0);
      avgLikes = Math.round(totalLikes / items.length);
      avgComments = Math.round(totalComments / items.length);

      const hashtagSet = new Set<string>();
      for (const post of items) {
        const text = post.caption?.text ?? '';
        const tags = text.match(/#[\w]+/g) ?? [];
        tags.forEach((t) => hashtagSet.add(t));
        topPosts.push({
          url: post.url ?? '',
          likes: post.like_count ?? 0,
          caption: text.slice(0, 100),
        });
      }
      topHashtags = Array.from(hashtagSet).slice(0, 10);
    }
  }

  const followers = data.data?.follower_count ?? 0;
  const engagementRate = followers > 0 ? ((avgLikes + avgComments) / followers) * 100 : 0;

  return {
    handle,
    followers,
    postsCount: data.data?.media_count,
    avgLikes,
    avgComments,
    engagementRate: Math.round(engagementRate * 100) / 100,
    topHashtags,
    topPosts: topPosts.slice(0, 5),
    snapshotDate: new Date().toISOString(),
    raw: data,
  };
}

async function fetchApify(handle: string, token: string): Promise<CompetitorSnapshot> {
  // Start Apify actor run
  const startRes = await fetch('https://api.apify.com/v2/acts/apify~instagram-profile-scraper/runs', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: [handle],
      resultsLimit: 12,
    }),
  });
  if (!startRes.ok) throw new Error(`Apify start error: ${await startRes.text()}`);
  const startData = (await startRes.json()) as { data?: { id: string } };
  const runId = startData.data?.id;
  if (!runId) throw new Error('Apify did not return run ID');

  // Poll for completion
  let attempts = 0;
  let datasetId: string | undefined;
  while (attempts < 30) {
    await new Promise((r) => setTimeout(r, 3000));
    const statusRes = await fetch(`https://api.apify.com/v2/actor-runs/${runId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const statusData = (await statusRes.json()) as { data?: { status: string; defaultDatasetId?: string } };
    if (statusData.data?.status === 'SUCCEEDED') {
      datasetId = statusData.data.defaultDatasetId;
      break;
    }
    if (statusData.data?.status === 'FAILED') {
      throw new Error('Apify run failed');
    }
    attempts++;
  }

  if (!datasetId) throw new Error('Apify run timed out');

  // Fetch results
  const datasetRes = await fetch(`https://api.apify.com/v2/datasets/${datasetId}/items`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const items = (await datasetRes.json()) as Array<{
    username?: string;
    followersCount?: number;
    followsCount?: number;
    mediaCount?: number;
    latestPosts?: Array<{ likesCount?: number; commentsCount?: number; caption?: string; url?: string }>;
  }>;

  const profile = items[0];
  const posts = profile?.latestPosts ?? [];
  const avgLikes = posts.length > 0 ? Math.round(posts.reduce((s, p) => s + (p.likesCount ?? 0), 0) / posts.length) : 0;
  const avgComments =
    posts.length > 0 ? Math.round(posts.reduce((s, p) => s + (p.commentsCount ?? 0), 0) / posts.length) : 0;

  return {
    handle,
    followers: profile?.followersCount,
    postsCount: profile?.mediaCount,
    avgLikes,
    avgComments,
    snapshotDate: new Date().toISOString(),
    raw: profile,
  };
}
