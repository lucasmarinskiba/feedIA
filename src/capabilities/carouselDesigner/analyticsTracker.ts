/**
 * Analytics Tracker — Track usage metrics for carousels.
 */

import { log } from '../../agent/logger.js';

export interface AnalyticsEvent {
  event: string;
  timestamp: string;
  jobId?: string;
  userId?: string;
  data?: Record<string, unknown>;
}

const events: AnalyticsEvent[] = [];
const MAX_EVENTS = 10000;

/**
 * Track analytics event.
 */
export const trackEvent = (
  event: string,
  jobId?: string,
  data?: Record<string, any>,
): void => {
  const evt: AnalyticsEvent = {
    event,
    timestamp: new Date().toISOString(),
    jobId,
    data,
  };

  events.push(evt);
  if (events.length > MAX_EVENTS) {
    events.shift();
  }

  log.info(`[Analytics] Event: ${event} ${jobId ? `(${jobId})` : ''}`);
};

/**
 * Get analytics summary.
 */
export const getAnalyticsSummary = (): {
  totalEvents: number;
  carouselsGenerated: number;
  averageDuration: number;
  topStyles: Record<string, number>;
  errorRate: number;
} => {
  const generated = events.filter((e) => e.event === 'carousel.done').length;
  const errors = events.filter((e) => e.event === 'carousel.error').length;
  const durations = events
    .filter((e) => e.event === 'carousel.done')
    .map((e) => (e.data?.duration as number) || 0)
    .filter((d) => d > 0);

  const styles: Record<string, number> = {};
  events.forEach((e) => {
    if (e.data?.style) {
      styles[e.data.style] = (styles[e.data.style] || 0) + 1;
    }
  });

  return {
    totalEvents: events.length,
    carouselsGenerated: generated,
    averageDuration: durations.length > 0 ? durations.reduce((a, b) => a + b) / durations.length : 0,
    topStyles: styles,
    errorRate: generated + errors > 0 ? (errors / (generated + errors)) * 100 : 0,
  };
};

/**
 * Export analytics to JSON.
 */
export const exportAnalytics = (): string => JSON.stringify(
    {
      exportDate: new Date().toISOString(),
      summary: getAnalyticsSummary(),
      recentEvents: events.slice(-100),
    },
    null,
    2,
  );

export const analyticsTracker = {
  trackEvent,
  getAnalyticsSummary,
  exportAnalytics,
};
