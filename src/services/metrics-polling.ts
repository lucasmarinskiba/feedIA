/**
 * Metrics Polling Worker
 * Background job: fetch metrics from Instagram/TikTok APIs, update DB
 * Runs on interval (e.g., every 6 hours)
 */

import { log } from '../agent/logger.js';
import { getPool } from '../db/postgres-real.js';
import { updateContentMetrics } from '../db/accounts.js';

export interface PollingJob {
  enabled: boolean;
  intervalHours: number;
  lastRunAt: Date | null;
}

let pollingJob: NodeJS.Timeout | null = null;
const pollingState: PollingJob = {
  enabled: true,
  intervalHours: 6,
  lastRunAt: null,
};

/**
 * Start metrics polling worker
 * Polls Instagram/TikTok metrics for published content every N hours
 */
export const startMetricsPolling = (intervalHours: number = 6): void => {
  if (pollingJob) {
    log.warn('[Metrics Polling] Already running');
    return;
  }

  pollingState.intervalHours = intervalHours;
  const intervalMs = intervalHours * 60 * 60 * 1000;

  log.info('[Metrics Polling] Started', { intervalHours });

  // Run immediately, then on interval
  pollMetrics();
  pollingJob = setInterval(pollMetrics, intervalMs);
};

/**
 * Stop metrics polling worker
 */
export const stopMetricsPolling = (): void => {
  if (pollingJob) {
    clearInterval(pollingJob);
    pollingJob = null;
    log.info('[Metrics Polling] Stopped');
  }
};

/**
 * Execute one polling cycle
 * Fetches metrics for all published content from past 30 days
 */
async function pollMetrics(): Promise<void> {
  try {
    pollingState.lastRunAt = new Date();
    log.info('[Metrics Polling] Running cycle', { startedAt: pollingState.lastRunAt });

    // Get all published content from past 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const result = await getPool().query(
      `SELECT * FROM account_content
       WHERE published_at > $1
       ORDER BY published_at DESC`,
      [thirtyDaysAgo],
    );

    if (!result.rows) {
      log.info('[Metrics Polling] No content to poll');
      return;
    }

    const rows = result.rows as Array<Record<string, unknown>>;
    log.info('[Metrics Polling] Polling', { contentCount: rows.length });

    let successCount = 0;
    let errorCount = 0;

    for (const row of rows) {
      try {
        const contentId = String(row.id);
        const platform = String(row.platform);
        const postId = String(row.content_id);
        const accessToken = await fetchAccountAccessToken(String(row.account_id));

        if (!accessToken) {
          log.warn('[Metrics Polling] No access token', { contentId, platform });
          errorCount++;
          continue;
        }

        // Fetch metrics from platform
        let metrics: Record<string, number> | null = null;

        if (platform === 'instagram') {
          metrics = await fetchInstagramMetrics(postId, accessToken);
        } else if (platform === 'tiktok') {
          metrics = await fetchTikTokMetrics(postId, accessToken);
        }

        if (metrics) {
          await updateContentMetrics(contentId, metrics);
          successCount++;
        } else {
          errorCount++;
        }
      } catch (err) {
        log.error('[Metrics Polling] Row error', { error: String(err), rowId: String(row.id) });
        errorCount++;
      }
    }

    log.info('[Metrics Polling] Cycle complete', { successCount, errorCount, totalCount: rows.length });
  } catch (err) {
    log.error('[Metrics Polling] Cycle failed', { error: String(err) });
  }
}

/**
 * Fetch Instagram Insights for a post
 */
async function fetchInstagramMetrics(postId: string, accessToken: string): Promise<Record<string, number> | null> {
  try {
    // TODO: Call Instagram Graph API /postId/insights
    // Fields: engagement, impressions, reach, saved_count
    // Reference: https://developers.facebook.com/docs/instagram-api/reference/ig-media/insights
    log.info('[Instagram Metrics] Fetching (stub)', { postId });

    // Stub: return mock data
    return {
      likes: Math.floor(Math.random() * 1000),
      comments: Math.floor(Math.random() * 50),
      shares: Math.floor(Math.random() * 20),
      saves: Math.floor(Math.random() * 100),
      reach: Math.floor(Math.random() * 5000),
      impressions: Math.floor(Math.random() * 10000),
    };
  } catch (err) {
    log.error('[Instagram Metrics] Error', { error: String(err), postId });
    return null;
  }
}

/**
 * Fetch TikTok video metrics
 */
async function fetchTikTokMetrics(videoId: string, accessToken: string): Promise<Record<string, number> | null> {
  try {
    // TODO: Call TikTok API /video/{video_id}/statistics
    // Fields: view_count, like_count, comment_count, share_count
    // Reference: https://developers.tiktok.com/doc/research-api-video-information
    log.info('[TikTok Metrics] Fetching (stub)', { videoId });

    // Stub: return mock data
    return {
      likes: Math.floor(Math.random() * 5000),
      comments: Math.floor(Math.random() * 200),
      shares: Math.floor(Math.random() * 100),
      reach: Math.floor(Math.random() * 20000),
      impressions: Math.floor(Math.random() * 50000),
    };
  } catch (err) {
    log.error('[TikTok Metrics] Error', { error: String(err), videoId });
    return null;
  }
}

/**
 * Get access token for account
 */
async function fetchAccountAccessToken(accountId: string): Promise<string | null> {
  try {
    const result = await getPool().query(
      `SELECT access_token, token_expires_at FROM user_accounts WHERE id = $1`,
      [accountId],
    );

    if (!result.rows || result.rows.length === 0) return null;

    const row = result.rows[0] as Record<string, unknown>;
    const accessToken = String(row.access_token || '');
    const expiresAt = row.token_expires_at ? new Date(String(row.token_expires_at)) : null;

    // Check if token expired, refresh if needed
    if (expiresAt && expiresAt < new Date()) {
      // TODO: Refresh token via platform API
      log.warn('[Metrics Polling] Token expired, needs refresh', { accountId });
      return null;
    }

    return accessToken;
  } catch (err) {
    log.error('[Metrics Polling] Token fetch error', { error: String(err), accountId });
    return null;
  }
}

/**
 * Get polling status
 */
export const getPollingStatus = (): PollingJob => pollingState;
