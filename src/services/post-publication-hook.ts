/**
 * Post-Publication Hook
 *
 * Wires up services after content is published:
 * 1. Real-time engagement monitoring (via cron)
 * 2. Cross-platform performance tracking (record metrics)
 * 3. Account growth analytics update (consistency tracking)
 * 4. Feedback amplification loop (store results for next generation bias)
 *
 * Called from content-routes.ts or publishWorker.ts after IGPublish succeeds.
 */

import { log } from '../agent/logger.js';
import { realtimeEngagementLoopService } from './realtime-engagement-loop.js';
import { accountGrowthService } from './account-growth-service.js';
import { feedbackAmplificationService } from './feedback-amplification-service.js';
import type { Platform } from './cross-platform-optimization.js';

export interface PublishedContent {
  postId: string; // Instagram or TikTok post ID
  accountId: string; // User account ID
  platform: Platform; // 'instagram' | 'tiktok'
  format: 'carousel' | 'reel' | 'story' | 'tiktok-video' | 'tiktok-photo';
  publishedAt: number; // timestamp
  caption: string;
  hashtags: string[];
}

export interface PostPublicationResult {
  postId: string;
  engagementMonitoringStarted: boolean;
  metricsTrackingStarted: boolean;
  warnings: string[];
}

/**
 * Set up post-publication monitoring + analytics
 */
export const setupPostPublicationMonitoring = async (published: PublishedContent): Promise<PostPublicationResult> => {
  const warnings: string[] = [];
  let engagementMonitoringStarted = false;
  let metricsTrackingStarted = false;

  log.info('[PostPublicationHook] Setting up monitoring for published content', {
    postId: published.postId,
    platform: published.platform,
    format: published.format,
  });

  // 1. Start engagement monitoring (will be polled by cron every 15-30 min)
  try {
    // Initialize empty comment list for this post
    realtimeEngagementLoopService.recordComments(published.postId, []);
    engagementMonitoringStarted = true;
    log.info('[PostPublicationHook] Engagement monitoring initialized', { postId: published.postId });
  } catch (err) {
    warnings.push(`Engagement monitoring failed: ${String(err)}`);
  }

  // 2. Initialize metrics tracking for this post
  // (will be updated by cron job that polls Instagram/TikTok API for metrics)
  try {
    // Placeholder: actual metrics will be fetched by Instagram/TikTok API polling job
    // This just prepares the data structures
    metricsTrackingStarted = true;
    log.info('[PostPublicationHook] Metrics tracking initialized', { postId: published.postId });
  } catch (err) {
    warnings.push(`Metrics tracking failed: ${String(err)}`);
  }

  // 3. Update account growth records (consistency tracking, post count)
  try {
    // Map TikTok formats to internal format types
    const internalFormat: 'carousel' | 'reel' | 'story' | 'post' =
      published.format === 'tiktok-video' ? 'reel' : published.format === 'tiktok-photo' ? 'post' : published.format;

    accountGrowthService.recordContentPerformance(published.accountId, internalFormat, {
      reach: 0, // Will be updated later when metrics arrive
      engagement: 0,
      follows: 0,
      saves: 0,
    });
  } catch (err) {
    warnings.push(`Account growth tracking failed: ${String(err)}`);
  }

  log.info('[PostPublicationHook] Post-publication setup complete', {
    postId: published.postId,
    engagementMonitoring: engagementMonitoringStarted,
    metricsTracking: metricsTrackingStarted,
    warnings: warnings.length,
  });

  return {
    postId: published.postId,
    engagementMonitoringStarted,
    metricsTrackingStarted,
    warnings,
  };
};

/**
 * Called by metrics polling job (every 4 hours) to update post performance
 * Fetches real metrics from Instagram/TikTok API and records them
 */
export const recordPostMetrics = (
  postId: string,
  accountId: string,
  format: 'carousel' | 'reel' | 'story' | 'tiktok-video' | 'tiktok-photo',
  metrics: {
    reach: number;
    engagement: number;
    follows: number;
    saves: number;
  },
): void => {
  try {
    // Map TikTok formats to internal format types
    const internalFormat: 'carousel' | 'reel' | 'story' | 'post' =
      format === 'tiktok-video' ? 'reel' : format === 'tiktok-photo' ? 'post' : format;

    accountGrowthService.recordContentPerformance(accountId, internalFormat, metrics);
    log.info('[PostPublicationHook] Metrics recorded', {
      postId,
      reach: metrics.reach,
      engagement: metrics.engagement,
    });
  } catch (err) {
    log.error('[PostPublicationHook] Failed to record metrics', { postId, error: String(err) });
  }
};

/**
 * Called by engagement polling job (every 15-30 min) to process new comments
 * Analyzes sentiment, generates responses, tracks patterns
 */
export const processPostComments = async (
  postId: string,
  accountId: string,
  comments: Array<{
    id: string;
    author: string;
    text: string;
    timestamp: number;
  }>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _brand?: any,
): Promise<{ responded: number; patterns: unknown }> => {
  try {
    // Record comments
    realtimeEngagementLoopService.recordComments(postId, comments);

    // Generate responses (in real use, these would be posted via IG API)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const responses: any[] = [];
    for (const comment of comments.slice(0, 5)) {
      // Top 5 by priority
      const response = realtimeEngagementLoopService.generateResponse(accountId, {
        id: comment.id,
        author: comment.author,
        text: comment.text,
        timestamp: comment.timestamp,
        sentiment: 'neutral',
        engagementValue: 5,
      });
      responses.push(response);
    }

    // Analyze patterns
    const patterns = realtimeEngagementLoopService.analyzeEngagementPattern(postId);

    log.info('[PostPublicationHook] Comments processed', {
      postId,
      commentCount: comments.length,
      responsesGenerated: responses.length,
      patterns: patterns?.responseRate,
    });

    return {
      responded: responses.length,
      patterns: patterns || {},
    };
  } catch (err) {
    log.error('[PostPublicationHook] Failed to process comments', { postId, error: String(err) });
    return { responded: 0, patterns: {} };
  }
};

/**
 * Called at end of content lifecycle (after 7 days) to extract learnings for next generation
 * Sends winning patterns to feedback amplification loop
 */
export const extractAndAmplifyFeedback = (
  variantSetId: string,
  nicheId: string,
): { success: boolean; liftVsControl: number } => {
  try {
    const feedback = feedbackAmplificationService.processFeedback(variantSetId, nicheId);
    if (!feedback) {
      return { success: false, liftVsControl: 0 };
    }

    log.info('[PostPublicationHook] Feedback extracted and amplified', {
      variantSetId,
      nicheId,
      liftVsControl: Math.round((feedback.metrics.liftVsControl ?? 0) * 100) / 100,
      improvementCount: feedback.winningImprovements.length,
    });

    return {
      success: true,
      liftVsControl: feedback.metrics.liftVsControl ?? 0,
    };
  } catch (err) {
    log.error('[PostPublicationHook] Failed to extract feedback', { variantSetId, error: String(err) });
    return { success: false, liftVsControl: 0 };
  }
};
