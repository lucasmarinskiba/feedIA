/**
 * Metrics Aggregation Service
 * Real-time carousel engagement tracking and daily aggregation
 * Week 6-7: Analytics dashboard for Pro+ tiers
 */

import { queryAs, queryOneAs, executeMutation, CarouselMetricsDailyRow } from '../db/typed-queries.js';
import { log } from '../agent/logger.js';

interface AnalyticsEvent {
  carouselId: string;
  userId: string;
  eventType: 'view' | 'share' | 'save' | 'like' | 'click';
  source?: string;
  userAgent?: string;
  referrer?: string;
}

interface CarouselMetrics {
  views: number;
  views_unique: number;
  shares: number;
  saves: number;
  likes: number;
  engagement_rate: number;
  trend: 'up' | 'down' | 'flat';
}

interface UserCarouselStats {
  id: string;
  title: string;
  slides_count: number;
  total_views: number;
  avg_engagement_rate: number;
}

interface EventBreakdownRow {
  event_type: string;
  count: number;
  unique_users: number;
}

interface EngagementSummaryRow {
  total_carousels: string | number;
  total_views: string | number;
  total_unique_views: string | number;
  total_shares: string | number;
  total_saves: string | number;
  total_likes: string | number;
  avg_engagement_rate: string | number;
}

class MetricsAggregationService {
  async trackEvent(event: AnalyticsEvent): Promise<void> {
    try {
      await executeMutation(
        `INSERT INTO carousel_analytics (carousel_id, user_id, event_type, source, user_agent, referrer)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          event.carouselId,
          event.userId,
          event.eventType,
          event.source || null,
          event.userAgent || null,
          event.referrer || null,
        ],
      );
    } catch (err) {
      log.info('Error tracking event', { carouselId: event.carouselId, error: err });
    }
  }

  async getCarouselMetrics(carouselId: string): Promise<CarouselMetrics> {
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    const todayRow = await queryOneAs<CarouselMetricsDailyRow>(
      `SELECT views, views_unique, shares, saves, likes, engagement_rate FROM carousel_metrics_daily
       WHERE carousel_id = $1 AND date = $2`,
      [carouselId, today],
    );

    const yesterdayRow = await queryOneAs<Pick<CarouselMetricsDailyRow, 'views'>>(
      `SELECT views FROM carousel_metrics_daily WHERE carousel_id = $1 AND date = $2`,
      [carouselId, yesterday],
    );

    const todayMetrics = {
      views: todayRow?.views || 0,
      views_unique: todayRow?.views_unique || 0,
      shares: todayRow?.shares || 0,
      saves: todayRow?.saves || 0,
      likes: todayRow?.likes || 0,
      engagement_rate: todayRow?.engagement_rate || 0,
    };

    const yesterdayViews = yesterdayRow?.views || 0;
    const trend = todayMetrics.views > yesterdayViews ? 'up' : todayMetrics.views < yesterdayViews ? 'down' : 'flat';

    return { ...todayMetrics, trend };
  }

  async getCarouselHistory(carouselId: string, days: number = 30): Promise<CarouselMetricsDailyRow[]> {
    return queryAs<CarouselMetricsDailyRow>(
      `SELECT date, views, views_unique, shares, saves, likes, engagement_rate FROM carousel_metrics_daily
       WHERE carousel_id = $1 AND date >= CURRENT_DATE - INTERVAL '${days} days'
       ORDER BY date ASC`,
      [carouselId],
    );
  }

  async aggregateDailyMetrics(targetDate?: string): Promise<void> {
    const date = targetDate || new Date(Date.now() - 86400000).toISOString().split('T')[0];

    await executeMutation(
      `INSERT INTO carousel_metrics_daily (carousel_id, user_id, date, views, views_unique, shares, saves, likes, clicks)
       SELECT carousel_id, user_id, DATE(created_at)::date,
         COUNT(CASE WHEN event_type = 'view' THEN 1 END) as views,
         COUNT(DISTINCT CASE WHEN event_type = 'view' THEN user_id END) as views_unique,
         COUNT(CASE WHEN event_type = 'share' THEN 1 END) as shares,
         COUNT(CASE WHEN event_type = 'save' THEN 1 END) as saves,
         COUNT(CASE WHEN event_type = 'like' THEN 1 END) as likes,
         COUNT(CASE WHEN event_type = 'click' THEN 1 END) as clicks
       FROM carousel_analytics WHERE DATE(created_at)::date = $1
       GROUP BY carousel_id, user_id, DATE(created_at)::date
       ON CONFLICT (carousel_id, date) DO UPDATE SET
         views = EXCLUDED.views, views_unique = EXCLUDED.views_unique,
         shares = EXCLUDED.shares, saves = EXCLUDED.saves, likes = EXCLUDED.likes`,
      [date],
    );

    await executeMutation(
      `UPDATE carousel_metrics_daily
       SET engagement_rate = ROUND((shares + saves + likes)::decimal / NULLIF(views, 0) * 100, 2)
       WHERE date = $1`,
      [date],
    );
  }

  async getUserTopCarousels(userId: string, limit: number = 10): Promise<UserCarouselStats[]> {
    return queryAs<UserCarouselStats>(
      `SELECT c.id, c.title, c.slides_count, COALESCE(SUM(m.views), 0) as total_views,
         COALESCE(AVG(m.engagement_rate), 0) as avg_engagement_rate
       FROM carousels c LEFT JOIN carousel_metrics_daily m ON c.id = m.carousel_id
       WHERE c.user_id = $1 AND c.status = 'published'
       GROUP BY c.id, c.title, c.slides_count ORDER BY total_views DESC LIMIT $2`,
      [userId, limit],
    );
  }

  async getUserEngagementSummary(userId: string): Promise<Record<string, unknown>> {
    const result = await queryOneAs<EngagementSummaryRow>(
      `SELECT COUNT(DISTINCT c.id) as total_carousels, COALESCE(SUM(m.views), 0) as total_views,
         COALESCE(SUM(m.views_unique), 0) as total_unique_views, COALESCE(SUM(m.shares), 0) as total_shares,
         COALESCE(SUM(m.saves), 0) as total_saves, COALESCE(SUM(m.likes), 0) as total_likes,
         COALESCE(AVG(m.engagement_rate), 0) as avg_engagement_rate
       FROM carousels c LEFT JOIN carousel_metrics_daily m ON c.id = m.carousel_id
       WHERE c.user_id = $1 AND c.status = 'published' AND m.date >= CURRENT_DATE - INTERVAL '30 days'`,
      [userId],
    );

    if (!result) return {};

    return {
      total_carousels:
        typeof result.total_carousels === 'string' ? parseInt(result.total_carousels, 10) : result.total_carousels,
      total_views: typeof result.total_views === 'string' ? parseInt(result.total_views, 10) : result.total_views,
      total_unique_views:
        typeof result.total_unique_views === 'string'
          ? parseInt(result.total_unique_views, 10)
          : result.total_unique_views,
      total_shares: typeof result.total_shares === 'string' ? parseInt(result.total_shares, 10) : result.total_shares,
      total_saves: typeof result.total_saves === 'string' ? parseInt(result.total_saves, 10) : result.total_saves,
      total_likes: typeof result.total_likes === 'string' ? parseInt(result.total_likes, 10) : result.total_likes,
      avg_engagement_rate:
        typeof result.avg_engagement_rate === 'string'
          ? parseFloat(result.avg_engagement_rate)
          : result.avg_engagement_rate,
    };
  }

  async getCarouselEventBreakdown(carouselId: string, days: number = 7): Promise<EventBreakdownRow[]> {
    return queryAs<EventBreakdownRow>(
      `SELECT event_type, COUNT(*) as count, COUNT(DISTINCT user_id) as unique_users
       FROM carousel_analytics WHERE carousel_id = $1 AND created_at >= NOW() - INTERVAL '${days} days'
       GROUP BY event_type ORDER BY count DESC`,
      [carouselId],
    );
  }

  async cleanupOldData(retentionDays: number = 90): Promise<number> {
    return executeMutation(
      `DELETE FROM carousel_analytics WHERE created_at < NOW() - INTERVAL '${retentionDays} days'`,
    );
  }
}

export const metricsAggregationService = new MetricsAggregationService();
