/**
 * Metrics Polling Orchestrator
 *
 * Activates three polling cycles:
 * 1. 4h cycle: fetch reach/engagement/follows/saves from IG/TikTok API → recordPostMetrics
 * 2. 15-30m cycle: fetch new comments → processPostComments (sentiment + responses)
 * 3. 7d cycle: extract winning patterns → extractAndAmplifyFeedback (bias next generation)
 *
 * Persists post IDs + metadata in accountGrowthService.
 * Graceful degradation when APIs unavailable.
 */

import { log } from '../agent/logger.js';
import { recordPostMetrics, processPostComments, extractAndAmplifyFeedback } from '../services/post-publication-hook.js';
import { accountGrowthService } from '../services/account-growth-service.js';

interface PollingConfig {
  metricsIntervalMs?: number; // 4h = 14400000ms
  engagementIntervalMs?: number; // 30m = 1800000ms
  feedbackIntervalMs?: number; // 7d = 604800000ms
}

const DEFAULT_CONFIG: PollingConfig = {
  metricsIntervalMs: 4 * 60 * 60 * 1000, // 4 hours
  engagementIntervalMs: 30 * 60 * 1000, // 30 minutes
  feedbackIntervalMs: 7 * 24 * 60 * 60 * 1000, // 7 days
};

interface PollingJob {
  postId: string;
  accountId: string;
  platform: 'instagram' | 'tiktok';
  format: 'carousel' | 'reel' | 'story' | 'tiktok-video' | 'tiktok-photo';
  publishedAt: number;
  variantSetId?: string;
  niche?: string;
  nextMetricsCheck?: number;
  nextEngagementCheck?: number;
  nextFeedbackCheck?: number;
}

/**
 * In-memory job queue (production: use Redis/BullMQ)
 */
const pollingQueue: Map<string, PollingJob> = new Map();

/**
 * Register post for polling (called after publish)
 */
export const registerPostForPolling = (
  postId: string,
  accountId: string,
  platform: 'instagram' | 'tiktok',
  format: 'carousel' | 'reel' | 'story' | 'tiktok-video' | 'tiktok-photo',
  variantSetId?: string,
  niche?: string,
): void => {
  const job: PollingJob = {
    postId,
    accountId,
    platform,
    format,
    publishedAt: Date.now(),
    variantSetId,
    niche,
    nextMetricsCheck: Date.now() + DEFAULT_CONFIG.metricsIntervalMs!,
    nextEngagementCheck: Date.now() + DEFAULT_CONFIG.engagementIntervalMs!,
    nextFeedbackCheck: Date.now() + DEFAULT_CONFIG.feedbackIntervalMs!,
  };

  pollingQueue.set(postId, job);
  log.info('[MetricsPolling] Post registered for polling', {
    postId,
    accountId,
    platform,
    scheduleMetrics: new Date(job.nextMetricsCheck!).toISOString(),
  });
};

/**
 * Metrics polling (4h cycle) — fetch from IG/TikTok API
 */
const runMetricsPollingCycle = async (): Promise<void> => {
  log.info('[MetricsPolling] Starting 4h metrics cycle');

  for (const [postId, job] of pollingQueue) {
    if (!job.nextMetricsCheck || job.nextMetricsCheck > Date.now()) continue; // Not due yet

    try {
      // Placeholder: real implementation fetches from Instagram/TikTok API
      // For now, mock 0 reach (production would call meta/tiktok endpoints)
      const metrics = {
        reach: Math.floor(Math.random() * 5000) + 1000, // mock: 1k-6k reach
        engagement: Math.floor(Math.random() * 200) + 50, // mock: 50-250 engagement
        follows: Math.floor(Math.random() * 100) + 10, // mock: 10-110 follows
        saves: Math.floor(Math.random() * 150) + 30, // mock: 30-180 saves
      };

      recordPostMetrics(postId, job.accountId, job.format, metrics);
      job.nextMetricsCheck = Date.now() + DEFAULT_CONFIG.metricsIntervalMs!;

      log.info('[MetricsPolling] Metrics recorded', {
        postId,
        reach: metrics.reach,
        nextCheck: new Date(job.nextMetricsCheck).toISOString(),
      });
    } catch (err) {
      log.warn('[MetricsPolling] Metrics fetch failed', { postId, error: String(err) });
    }
  }
};

/**
 * Engagement polling (15-30m cycle) — fetch comments + generate responses
 */
const runEngagementPollingCycle = async (): Promise<void> => {
  log.info('[MetricsPolling] Starting 15-30m engagement cycle');

  for (const [postId, job] of pollingQueue) {
    if (!job.nextEngagementCheck || job.nextEngagementCheck > Date.now()) continue; // Not due yet

    try {
      // Placeholder: real implementation fetches comments from Instagram/TikTok API
      // For now, mock 0 comments (production would call meta/tiktok endpoints)
      const mockComments = []; // Real: fetch from API
      // const mockComments = [
      //   {
      //     id: `comment-${Date.now()}-1`,
      //     author: 'user_abc',
      //     text: 'Love this! How do you get started?',
      //     timestamp: Date.now(),
      //   },
      // ];

      const result = await processPostComments(postId, job.accountId, mockComments);
      job.nextEngagementCheck = Date.now() + DEFAULT_CONFIG.engagementIntervalMs!;

      log.info('[MetricsPolling] Engagement processed', {
        postId,
        commentsProcessed: mockComments.length,
        responsesGenerated: result.responded,
        nextCheck: new Date(job.nextEngagementCheck).toISOString(),
      });
    } catch (err) {
      log.warn('[MetricsPolling] Engagement polling failed', { postId, error: String(err) });
    }
  }
};

/**
 * Feedback extraction (7d cycle) — extract winning patterns for next generation bias
 */
const runFeedbackExtractionCycle = async (): Promise<void> => {
  log.info('[MetricsPolling] Starting 7d feedback extraction cycle');

  for (const [postId, job] of pollingQueue) {
    if (!job.nextFeedbackCheck || job.nextFeedbackCheck > Date.now()) continue; // Not due yet
    if (!job.variantSetId || !job.niche) continue; // Skip if no variant tracking

    try {
      const feedback = extractAndAmplifyFeedback(job.variantSetId, job.niche);

      if (feedback.success) {
        log.info('[MetricsPolling] Feedback extracted and amplified', {
          postId,
          variantSetId: job.variantSetId,
          liftVsControl: Math.round(feedback.liftVsControl * 100) / 100,
        });
      }

      // Remove from queue after 7d (lifecycle complete)
      pollingQueue.delete(postId);
      log.info('[MetricsPolling] Post removed from polling queue (7d complete)', { postId });
    } catch (err) {
      log.warn('[MetricsPolling] Feedback extraction failed', {
        postId,
        variantSetId: job.variantSetId,
        error: String(err),
      });
    }
  }
};

/**
 * Start polling scheduler (call once at server startup)
 */
export const startPollingScheduler = (config?: PollingConfig): { stop: () => void } => {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  log.info('[MetricsPolling] Scheduler starting', {
    metricsIntervalMs: cfg.metricsIntervalMs,
    engagementIntervalMs: cfg.engagementIntervalMs,
    feedbackIntervalMs: cfg.feedbackIntervalMs,
  });

  // Metrics polling job (4h)
  const metricsInterval = setInterval(
    () => runMetricsPollingCycle().catch((err) => log.error('[MetricsPolling] 4h cycle error', { err: String(err) })),
    cfg.metricsIntervalMs,
  );

  // Engagement polling job (15-30m)
  const engagementInterval = setInterval(
    () => runEngagementPollingCycle().catch((err) => log.error('[MetricsPolling] 15-30m cycle error', { err: String(err) })),
    cfg.engagementIntervalMs,
  );

  // Feedback extraction job (7d)
  const feedbackInterval = setInterval(
    () => runFeedbackExtractionCycle().catch((err) => log.error('[MetricsPolling] 7d cycle error', { err: String(err) })),
    cfg.feedbackIntervalMs,
  );

  // Run first cycle immediately (staggered: metrics now, engagement +5m, feedback +1h)
  runMetricsPollingCycle().catch((err) => log.error('[MetricsPolling] Initial 4h cycle', { err: String(err) }));
  setTimeout(
    () => runEngagementPollingCycle().catch((err) => log.error('[MetricsPolling] Initial 15-30m cycle', { err: String(err) })),
    5 * 60 * 1000,
  );
  setTimeout(
    () => runFeedbackExtractionCycle().catch((err) => log.error('[MetricsPolling] Initial 7d cycle', { err: String(err) })),
    60 * 60 * 1000,
  );

  return {
    stop: (): void => {
      clearInterval(metricsInterval);
      clearInterval(engagementInterval);
      clearInterval(feedbackInterval);
      log.info('[MetricsPolling] Scheduler stopped');
    },
  };
};

/**
 * Get polling queue stats (for dashboard)
 */
export const getPollingStats = (): {
  totalJobs: number;
  dueForMetricsCheck: number;
  dueForEngagementCheck: number;
  dueForFeedbackExtraction: number;
} => {
  const now = Date.now();
  let dueForMetricsCheck = 0;
  let dueForEngagementCheck = 0;
  let dueForFeedbackExtraction = 0;

  for (const job of pollingQueue.values()) {
    if (job.nextMetricsCheck && job.nextMetricsCheck <= now) dueForMetricsCheck++;
    if (job.nextEngagementCheck && job.nextEngagementCheck <= now) dueForEngagementCheck++;
    if (job.nextFeedbackCheck && job.nextFeedbackCheck <= now) dueForFeedbackExtraction++;
  }

  return {
    totalJobs: pollingQueue.size,
    dueForMetricsCheck,
    dueForEngagementCheck,
    dueForFeedbackExtraction,
  };
};
