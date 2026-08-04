import { feedIADatabase } from '../db/database.js';

export interface AnalyticsEvent {
  carouselId: string;
  userId: string;
  eventType: 'view' | 'share' | 'save' | 'like' | 'click';
  source?: string;
  userAgent?: string;
  referrer?: string;
}

export interface CarouselMetrics {
  views: number;
  views_unique: number;
  shares: number;
  saves: number;
  likes: number;
  clicks: number;
  engagement_rate: number;
  trend: 'up' | 'down' | 'flat';
}

export interface MetricsHistory {
  date: string;
  views: number;
  views_unique: number;
  shares: number;
  saves: number;
  likes: number;
  engagement_rate: number;
}

export const carouselMetricsService = {
  async trackEvent(event: AnalyticsEvent): Promise<void> {
    const db = feedIADatabase.getConnection();
    const stmt = db.prepare(
      `INSERT INTO carousel_events (id, carousel_id, user_id, event_type, source, user_agent, referrer, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    );

    stmt.run(
      `event-${Date.now()}-${Math.random()}`,
      event.carouselId,
      event.userId,
      event.eventType,
      event.source || null,
      event.userAgent || null,
      event.referrer || null,
      new Date().toISOString(),
    );
  },

  async getCarouselMetrics(carouselId: string): Promise<CarouselMetrics> {
    const db = feedIADatabase.getConnection();
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    const todayStmt = db.prepare(
      `SELECT views, views_unique, shares, saves, likes, clicks, engagement_rate FROM carousel_metrics_daily
       WHERE carousel_id = ? AND date = ?`
    );
    const todayRow = todayStmt.get(carouselId, today) as any;

    const yesterdayStmt = db.prepare(
      `SELECT views FROM carousel_metrics_daily WHERE carousel_id = ? AND date = ?`
    );
    const yesterdayRow = yesterdayStmt.get(carouselId, yesterday) as any;

    const todayMetrics = {
      views: todayRow?.views || 0,
      views_unique: todayRow?.views_unique || 0,
      shares: todayRow?.shares || 0,
      saves: todayRow?.saves || 0,
      likes: todayRow?.likes || 0,
      clicks: todayRow?.clicks || 0,
      engagement_rate: todayRow?.engagement_rate || 0,
    };

    const yesterdayViews = yesterdayRow?.views || 0;
    const trend = todayMetrics.views > yesterdayViews ? 'up' : todayMetrics.views < yesterdayViews ? 'down' : 'flat';

    return { ...todayMetrics, trend };
  },

  async getCarouselHistory(carouselId: string, days = 30): Promise<MetricsHistory[]> {
    const db = feedIADatabase.getConnection();
    const cutoffDate = new Date(Date.now() - days * 86400000).toISOString().split('T')[0];

    const stmt = db.prepare(
      `SELECT date, views, views_unique, shares, saves, likes, engagement_rate FROM carousel_metrics_daily
       WHERE carousel_id = ? AND date >= ?
       ORDER BY date ASC`
    );

    const rows = stmt.all(carouselId, cutoffDate) as MetricsHistory[];
    return rows;
  },

  async getUserEngagementSummary(userId: string): Promise<Record<string, number>> {
    const db = feedIADatabase.getConnection();
    const stmt = db.prepare(
      `SELECT
        COUNT(DISTINCT carousel_id) as total_carousels,
        COUNT(DISTINCT CASE WHEN event_type = 'view' THEN carousel_id END) as carousels_with_views,
        SUM(CASE WHEN event_type = 'view' THEN 1 ELSE 0 END) as total_views,
        SUM(CASE WHEN event_type = 'share' THEN 1 ELSE 0 END) as total_shares,
        SUM(CASE WHEN event_type = 'save' THEN 1 ELSE 0 END) as total_saves,
        SUM(CASE WHEN event_type = 'like' THEN 1 ELSE 0 END) as total_likes
       FROM carousel_events
       WHERE user_id = ?`
    );

    const row = stmt.get(userId) as any;
    return {
      total_carousels: row?.total_carousels || 0,
      carousels_with_views: row?.carousels_with_views || 0,
      total_views: row?.total_views || 0,
      total_shares: row?.total_shares || 0,
      total_saves: row?.total_saves || 0,
      total_likes: row?.total_likes || 0,
    };
  },

  async getUserTopCarousels(userId: string, limit = 5): Promise<Array<{ carouselId: string; views: number; engagement: number }>> {
    const db = feedIADatabase.getConnection();
    const stmt = db.prepare(
      `SELECT
        carousel_id as carouselId,
        SUM(CASE WHEN event_type = 'view' THEN 1 ELSE 0 END) as views,
        (SUM(CASE WHEN event_type IN ('share', 'save', 'like') THEN 1 ELSE 0 END) * 100.0 /
         SUM(CASE WHEN event_type = 'view' THEN 1 ELSE 0 END)) as engagement
       FROM carousel_events
       WHERE user_id = ?
       GROUP BY carousel_id
       ORDER BY views DESC
       LIMIT ?`
    );

    const rows = stmt.all(userId, limit) as Array<{ carouselId: string; views: number; engagement: number }>;
    return rows;
  },

  async getCarouselEventBreakdown(carouselId: string, days = 7): Promise<Record<string, number>> {
    const db = feedIADatabase.getConnection();
    const cutoffDate = new Date(Date.now() - days * 86400000).toISOString().split('T')[0];

    const stmt = db.prepare(
      `SELECT
        COUNT(CASE WHEN event_type = 'view' THEN 1 END) as views,
        COUNT(CASE WHEN event_type = 'share' THEN 1 END) as shares,
        COUNT(CASE WHEN event_type = 'save' THEN 1 END) as saves,
        COUNT(CASE WHEN event_type = 'like' THEN 1 END) as likes,
        COUNT(CASE WHEN event_type = 'click' THEN 1 END) as clicks,
        COUNT(DISTINCT user_id) as unique_users
       FROM carousel_events
       WHERE carousel_id = ? AND created_at >= ?`
    );

    const row = stmt.get(carouselId, cutoffDate) as any;
    return {
      views: row?.views || 0,
      shares: row?.shares || 0,
      saves: row?.saves || 0,
      likes: row?.likes || 0,
      clicks: row?.clicks || 0,
      unique_users: row?.unique_users || 0,
    };
  },

  async aggregateDailyMetrics(targetDate?: string): Promise<void> {
    const db = feedIADatabase.getConnection();
    const date = targetDate || new Date(Date.now() - 86400000).toISOString().split('T')[0];
    const now = new Date().toISOString();

    const selectStmt = db.prepare(
      `SELECT
        carousel_id,
        COUNT(CASE WHEN event_type = 'view' THEN 1 END) as views,
        COUNT(DISTINCT CASE WHEN event_type = 'view' THEN user_id END) as views_unique,
        COUNT(CASE WHEN event_type = 'share' THEN 1 END) as shares,
        COUNT(CASE WHEN event_type = 'save' THEN 1 END) as saves,
        COUNT(CASE WHEN event_type = 'like' THEN 1 END) as likes,
        COUNT(CASE WHEN event_type = 'click' THEN 1 END) as clicks
       FROM carousel_events
       WHERE DATE(created_at) = ?
       GROUP BY carousel_id`
    );

    const rows = selectStmt.all(date) as Array<{
      carousel_id: string;
      views: number;
      views_unique: number;
      shares: number;
      saves: number;
      likes: number;
      clicks: number;
    }>;

    const upsertStmt = db.prepare(
      `INSERT INTO carousel_metrics_daily
       (id, carousel_id, date, views, views_unique, shares, saves, likes, clicks, engagement_rate, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(carousel_id, date) DO UPDATE SET
        views = excluded.views,
        views_unique = excluded.views_unique,
        shares = excluded.shares,
        saves = excluded.saves,
        likes = excluded.likes,
        clicks = excluded.clicks,
        engagement_rate = excluded.engagement_rate,
        updated_at = excluded.updated_at`
    );

    for (const row of rows) {
      const engagement = row.views > 0 ? ((row.shares + row.saves + row.likes + row.clicks) * 100.0) / row.views : 0;

      upsertStmt.run(
        `metrics-${row.carousel_id}-${date}`,
        row.carousel_id,
        date,
        row.views,
        row.views_unique,
        row.shares,
        row.saves,
        row.likes,
        row.clicks,
        engagement,
        now,
        now,
      );
    }
  },
};
