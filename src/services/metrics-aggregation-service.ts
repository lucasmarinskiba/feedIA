/**
 * Metrics Aggregation Service
 * Real-time carousel engagement tracking and daily aggregation
 * Week 6-7: Analytics dashboard for Pro+ tiers
 */

import { carouselDB } from '../db/postgres.js';
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

class MetricsAggregationService {
  async trackEvent(event: AnalyticsEvent): Promise<void> {
    try {
      const pool = (carouselDB as unknown as Record<string, any>).pool; // eslint-disable-line @typescript-eslint/no-explicit-any
      if (!pool) return;
      await pool.query(
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
    const pool = (carouselDB as unknown as Record<string, any>).pool; // eslint-disable-line @typescript-eslint/no-explicit-any
    if (!pool) throw new Error('Database unavailable');
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    const todayResult = await pool.query(
      `SELECT views, views_unique, shares, saves, likes, engagement_rate FROM carousel_metrics_daily
       WHERE carousel_id = $1 AND date = $2`,
      [carouselId, today],
    );
    const yesterdayResult = await pool.query(
      `SELECT views FROM carousel_metrics_daily WHERE carousel_id = $1 AND date = $2`,
      [carouselId, yesterday],
    );
    const todayRow = todayResult.rows[0] as Record<string, unknown> | undefined;
    const yesterdayRow = yesterdayResult.rows[0] as Record<string, unknown> | undefined;
    const todayMetrics = {
      views: (todayRow?.views as number) || 0,
      views_unique: (todayRow?.views_unique as number) || 0,
      shares: (todayRow?.shares as number) || 0,
      saves: (todayRow?.saves as number) || 0,
      likes: (todayRow?.likes as number) || 0,
      engagement_rate: (todayRow?.engagement_rate as number) || 0,
    };
    const yesterdayViews = (yesterdayRow?.views as number) || 0;
    const trend = todayMetrics.views > yesterdayViews ? 'up' : todayMetrics.views < yesterdayViews ? 'down' : 'flat';
    return { ...todayMetrics, trend };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async getCarouselHistory(carouselId: string, days: number = 30): Promise<any[]> {
    const pool = (carouselDB as unknown as Record<string, any>).pool; // eslint-disable-line @typescript-eslint/no-explicit-any
    if (!pool) throw new Error('Database unavailable');
    const result = await pool.query(
      `SELECT date, views, views_unique, shares, saves, likes, engagement_rate FROM carousel_metrics_daily
       WHERE carousel_id = $1 AND date >= CURRENT_DATE - INTERVAL '${days} days'
       ORDER BY date ASC`,
      [carouselId],
    );
    return result.rows;
  }

  async aggregateDailyMetrics(targetDate?: string): Promise<void> {
    const pool = (carouselDB as unknown as Record<string, any>).pool; // eslint-disable-line @typescript-eslint/no-explicit-any
    if (!pool) throw new Error('Database unavailable');
    const date = targetDate || new Date(Date.now() - 86400000).toISOString().split('T')[0];
    await pool.query(
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
    await pool.query(
      `UPDATE carousel_metrics_daily
       SET engagement_rate = ROUND((shares + saves + likes)::decimal / NULLIF(views, 0) * 100, 2)
       WHERE date = $1`,
      [date],
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async getUserTopCarousels(userId: string, limit: number = 10): Promise<any[]> {
    const pool = (carouselDB as unknown as Record<string, any>).pool; // eslint-disable-line @typescript-eslint/no-explicit-any
    if (!pool) throw new Error('Database unavailable');
    const result = await pool.query(
      `SELECT c.id, c.title, c.slides_count, COALESCE(SUM(m.views), 0) as total_views,
         COALESCE(AVG(m.engagement_rate), 0) as avg_engagement_rate
       FROM carousels c LEFT JOIN carousel_metrics_daily m ON c.id = m.carousel_id
       WHERE c.user_id = $1 AND c.status = 'published'
       GROUP BY c.id, c.title, c.slides_count ORDER BY total_views DESC LIMIT $2`,
      [userId, limit],
    );
    return result.rows;
  }

  async getUserEngagementSummary(userId: string): Promise<Record<string, unknown>> {
    const pool = (carouselDB as unknown as Record<string, any>).pool; // eslint-disable-line @typescript-eslint/no-explicit-any
    if (!pool) throw new Error('Database unavailable');
    const result = await pool.query(
      `SELECT COUNT(DISTINCT c.id) as total_carousels, COALESCE(SUM(m.views), 0) as total_views,
         COALESCE(SUM(m.views_unique), 0) as total_unique_views, COALESCE(SUM(m.shares), 0) as total_shares,
         COALESCE(SUM(m.saves), 0) as total_saves, COALESCE(SUM(m.likes), 0) as total_likes,
         COALESCE(AVG(m.engagement_rate), 0) as avg_engagement_rate
       FROM carousels c LEFT JOIN carousel_metrics_daily m ON c.id = m.carousel_id
       WHERE c.user_id = $1 AND c.status = 'published' AND m.date >= CURRENT_DATE - INTERVAL '30 days'`,
      [userId],
    );
    return result.rows[0] || {};
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async getCarouselEventBreakdown(carouselId: string, days: number = 7): Promise<any> {
    const pool = (carouselDB as unknown as Record<string, any>).pool; // eslint-disable-line @typescript-eslint/no-explicit-any
    if (!pool) throw new Error('Database unavailable');
    const result = await pool.query(
      `SELECT event_type, COUNT(*) as count, COUNT(DISTINCT user_id) as unique_users
       FROM carousel_analytics WHERE carousel_id = $1 AND created_at >= NOW() - INTERVAL '${days} days'
       GROUP BY event_type ORDER BY count DESC`,
      [carouselId],
    );
    return result.rows;
  }

  async cleanupOldData(retentionDays: number = 90): Promise<number> {
    const pool = (carouselDB as unknown as Record<string, any>).pool; // eslint-disable-line @typescript-eslint/no-explicit-any
    if (!pool) throw new Error('Database unavailable');
    const result = await pool.query(
      `DELETE FROM carousel_analytics WHERE created_at < NOW() - INTERVAL '${retentionDays} days'`,
    );
    return result.rowCount || 0;
  }
}

export const metricsAggregationService = new MetricsAggregationService();
