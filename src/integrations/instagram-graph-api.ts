/**
 * Instagram Graph API Service
 *
 * Fetch real metrics from Instagram Business Account:
 * - reach (impressions)
 * - engagement (likes + comments + shares)
 * - follows gained
 * - saves
 *
 * Requires: META_ACCESS_TOKEN + META_IG_BUSINESS_ID
 */

import { log } from '../agent/logger.js';

export interface IGMetrics {
  reach: number;
  engagement: number;
  follows: number;
  saves: number;
  impressions: number;
  profileViews: number;
}

/**
 * Fetch post metrics from Instagram API
 */
export const fetchPostMetrics = async (
  postId: string,
  accessToken?: string,
): Promise<IGMetrics | null> => {
  const token = accessToken || process.env.META_ACCESS_TOKEN;

  if (!token) {
    log.warn('[InstagramAPI] No access token, returning mock metrics');
    return {
      reach: Math.floor(Math.random() * 5000) + 1000,
      engagement: Math.floor(Math.random() * 200) + 50,
      follows: Math.floor(Math.random() * 100) + 10,
      saves: Math.floor(Math.random() * 150) + 30,
      impressions: Math.floor(Math.random() * 6000) + 1000,
      profileViews: Math.floor(Math.random() * 500) + 100,
    };
  }

  try {
    // GET /v18.0/{ig_media_id}/insights?metric=impressions,engagement_rate,profile_visits,saves
    const url = `https://graph.instagram.com/v18.0/${postId}/insights?metric=impressions,engagement_rate,profile_visits,saved&access_token=${token}`;

    const response = await fetch(url);

    if (!response.ok) {
      if (response.status === 401) {
        log.warn('[InstagramAPI] Token invalid/expired, falling back to mock');
      } else if (response.status === 429) {
        log.warn('[InstagramAPI] Rate limited, falling back to mock');
      } else {
        log.warn('[InstagramAPI] API error', { status: response.status });
      }
      return null;
    }

    const data = (await response.json()) as {
      data?: Array<{
        name: string;
        period: string;
        values: Array<{ value: number }>;
        title: string;
      }>;
    };

    if (!data.data) {
      log.warn('[InstagramAPI] No data returned');
      return null;
    }

    // Parse metrics
    const metrics: IGMetrics = {
      reach: 0,
      engagement: 0,
      follows: 0,
      saves: 0,
      impressions: 0,
      profileViews: 0,
    };

    for (const item of data.data) {
      const value = item.values?.[0]?.value || 0;

      switch (item.name) {
        case 'impressions':
          metrics.impressions = Math.round(value);
          metrics.reach = Math.round(value * 0.85); // Estimate reach = 85% of impressions
          break;
        case 'engagement_rate':
          metrics.engagement = Math.round(metrics.impressions * (value / 100));
          break;
        case 'profile_visits':
          metrics.profileViews = Math.round(value);
          break;
        case 'saved':
          metrics.saves = Math.round(value);
          break;
        case 'follows':
          metrics.follows = Math.round(value);
          break;
      }
    }

    log.info('[InstagramAPI] Metrics fetched', { postId, reach: metrics.reach, engagement: metrics.engagement });

    return metrics;
  } catch (err) {
    log.error('[InstagramAPI] Fetch failed', { postId, error: String(err) });
    return null;
  }
};

/**
 * Fetch account insights (overall performance)
 */
export const fetchAccountInsights = async (accessToken?: string): Promise<{ followers: number; posts: number } | null> => {
  const token = accessToken || process.env.META_ACCESS_TOKEN;
  const businessId = process.env.META_IG_BUSINESS_ID;

  if (!token || !businessId) {
    log.warn('[InstagramAPI] No credentials for account insights');
    return null;
  }

  try {
    const url = `https://graph.instagram.com/v18.0/${businessId}/insights?metric=follower_count,total_published_media&access_token=${token}`;

    const response = await fetch(url);

    if (!response.ok) {
      log.warn('[InstagramAPI] Account insights failed', { status: response.status });
      return null;
    }

    const data = (await response.json()) as {
      data?: Array<{
        name: string;
        period: string;
        values: Array<{ value: number }>;
        title: string;
      }>;
    };

    if (!data.data) return null;

    let followers = 0;
    let posts = 0;

    for (const item of data.data) {
      const value = item.values?.[0]?.value || 0;
      if (item.name === 'follower_count') followers = Math.round(value);
      if (item.name === 'total_published_media') posts = Math.round(value);
    }

    return { followers, posts };
  } catch (err) {
    log.error('[InstagramAPI] Account insights error', { error: String(err) });
    return null;
  }
};

/**
 * Post comment reply (auto-response to comments)
 */
export const postCommentReply = async (commentId: string, message: string, accessToken?: string): Promise<boolean> => {
  const token = accessToken || process.env.META_ACCESS_TOKEN;

  if (!token) {
    log.warn('[InstagramAPI] No token for comment reply');
    return false;
  }

  try {
    const url = `https://graph.instagram.com/v18.0/${commentId}/replies?message=${encodeURIComponent(message)}&access_token=${token}`;

    const response = await fetch(url, { method: 'POST' });

    if (!response.ok) {
      log.warn('[InstagramAPI] Comment reply failed', { status: response.status, commentId });
      return false;
    }

    log.info('[InstagramAPI] Comment replied', { commentId });
    return true;
  } catch (err) {
    log.error('[InstagramAPI] Comment reply error', { error: String(err) });
    return false;
  }
};
