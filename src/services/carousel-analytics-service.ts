import { feedIADatabase } from '../db/database.js';

export interface CarouselAnalytics {
  carouselId: string;
  title: string;
  platform: string;
  format: string;
  status: string;
  createdAt: string;
  totalViews: number;
  totalEngagement: number;
  engagementRate: number;
  trend: 'up' | 'down' | 'flat';
  topEvent: string;
  estimatedReach: number;
}

export interface UserAnalytics {
  userId: string;
  totalCarousels: number;
  totalViews: number;
  avgEngagementRate: number;
  topCarousel: { id: string; views: number; engagement: number };
  platformDistribution: Record<string, number>;
  trend: 'up' | 'down' | 'flat';
}

export interface AnalyticsTimeseries {
  date: string;
  views: number;
  engagement: number;
  shares: number;
  saves: number;
  likes: number;
  unique_users: number;
}

class CarouselAnalyticsService {
  async getCarouselAnalytics(carouselId: string): Promise<CarouselAnalytics | null> {
    const db = feedIADatabase.getConnection();

    const carouselStmt = db.prepare('SELECT id, title, format, metadata FROM carousels WHERE id = ?');
    const carousel = carouselStmt.get(carouselId) as any;

    if (!carousel) return null;

    const metadata = JSON.parse(carousel.metadata);

    const metricsStmt = db.prepare(
      `SELECT
        SUM(views) as total_views,
        SUM(shares + saves + likes + clicks) as total_engagement,
        AVG(engagement_rate) as avg_engagement
       FROM carousel_metrics_daily
       WHERE carousel_id = ?`
    );
    const metrics = metricsStmt.get(carouselId) as any;

    const eventsStmt = db.prepare(
      `SELECT event_type, COUNT(*) as count
       FROM carousel_events
       WHERE carousel_id = ?
       GROUP BY event_type
       ORDER BY count DESC
       LIMIT 1`
    );
    const topEvent = eventsStmt.get(carouselId) as any;

    const totalViews = metrics?.total_views || 0;
    const totalEngagement = metrics?.total_engagement || 0;
    const engagementRate = totalViews > 0 ? (totalEngagement * 100) / totalViews : 0;

    const yesterdayStmt = db.prepare(
      `SELECT SUM(views) as views FROM carousel_metrics_daily WHERE carousel_id = ? AND date = DATE('now', '-1 day')`
    );
    const yesterday = yesterdayStmt.get(carouselId) as any;
    const yesterdayViews = yesterday?.views || 0;

    const trend = totalViews > yesterdayViews ? 'up' : totalViews < yesterdayViews ? 'down' : 'flat';

    return {
      carouselId,
      title: carousel.title,
      platform: metadata.platform,
      format: carousel.format,
      status: metadata.status,
      createdAt: metadata.createdAt,
      totalViews,
      totalEngagement,
      engagementRate: Math.round(engagementRate * 100) / 100,
      trend,
      topEvent: topEvent?.event_type || 'none',
      estimatedReach: Math.round(totalViews * 0.7),
    };
  }

  async getUserAnalytics(userId: string): Promise<UserAnalytics> {
    const db = feedIADatabase.getConnection();

    const carouselStmt = db.prepare(
      `SELECT COUNT(DISTINCT id) as total FROM carousels WHERE user_id = ?`
    );
    const carouselCount = carouselStmt.get(userId) as any;
    const totalCarousels = carouselCount?.total || 0;

    const viewsStmt = db.prepare(
      `SELECT SUM(views) as total_views FROM carousel_metrics_daily
       WHERE carousel_id IN (SELECT id FROM carousels WHERE user_id = ?)`
    );
    const views = viewsStmt.get(userId) as any;
    const totalViews = views?.total_views || 0;

    const engagementStmt = db.prepare(
      `SELECT AVG(engagement_rate) as avg_rate FROM carousel_metrics_daily
       WHERE carousel_id IN (SELECT id FROM carousels WHERE user_id = ?)`
    );
    const engagement = engagementStmt.get(userId) as any;
    const avgEngagementRate = Math.round((engagement?.avg_rate || 0) * 100) / 100;

    const topCarouselStmt = db.prepare(
      `SELECT c.id, SUM(e.count) as views, AVG(m.engagement_rate) as engagement
       FROM carousels c
       LEFT JOIN carousel_metrics_daily m ON c.id = m.carousel_id
       LEFT JOIN (
         SELECT carousel_id, COUNT(*) as count FROM carousel_events
         WHERE carousel_id IN (SELECT id FROM carousels WHERE user_id = ?)
         GROUP BY carousel_id
       ) e ON c.id = e.carousel_id
       WHERE c.user_id = ?
       GROUP BY c.id
       ORDER BY views DESC
       LIMIT 1`
    );
    const topCarousel = topCarouselStmt.get(userId, userId) as any;

    const platformStmt = db.prepare(
      `SELECT metadata FROM carousels WHERE user_id = ?`
    );
    const platforms = platformStmt.all(userId) as Array<{ metadata: string }>;

    const platformDistribution: Record<string, number> = {};
    platforms.forEach(p => {
      const meta = JSON.parse(p.metadata);
      platformDistribution[meta.platform] = (platformDistribution[meta.platform] || 0) + 1;
    });

    const lastWeekStmt = db.prepare(
      `SELECT SUM(views) as views FROM carousel_metrics_daily
       WHERE carousel_id IN (SELECT id FROM carousels WHERE user_id = ?)
       AND date >= DATE('now', '-7 days')`
    );
    const lastWeekViews = lastWeekStmt.get(userId) as any;

    const prevWeekStmt = db.prepare(
      `SELECT SUM(views) as views FROM carousel_metrics_daily
       WHERE carousel_id IN (SELECT id FROM carousels WHERE user_id = ?)
       AND date >= DATE('now', '-14 days') AND date < DATE('now', '-7 days')`
    );
    const prevWeekViews = prevWeekStmt.get(userId) as any;

    const trend =
      (lastWeekViews?.views || 0) > (prevWeekViews?.views || 0) ? 'up' :
      (lastWeekViews?.views || 0) < (prevWeekViews?.views || 0) ? 'down' : 'flat';

    return {
      userId,
      totalCarousels,
      totalViews,
      avgEngagementRate,
      topCarousel: {
        id: topCarousel?.id || 'none',
        views: topCarousel?.views || 0,
        engagement: topCarousel?.engagement || 0,
      },
      platformDistribution,
      trend,
    };
  }

  async getTimeseriesMetrics(carouselId: string, days = 30): Promise<AnalyticsTimeseries[]> {
    const db = feedIADatabase.getConnection();

    const cutoffDate = new Date(Date.now() - days * 86400000).toISOString().split('T')[0];

    const stmt = db.prepare(
      `SELECT
        date,
        views,
        engagement_rate as engagement,
        0 as shares,
        0 as saves,
        0 as likes,
        0 as unique_users
       FROM carousel_metrics_daily
       WHERE carousel_id = ? AND date >= ?
       ORDER BY date ASC`
    );

    const rows = stmt.all(carouselId, cutoffDate) as AnalyticsTimeseries[];
    return rows;
  }

  async getEngagementBreakdown(carouselId: string, days = 7): Promise<{
    views: number;
    shares: number;
    saves: number;
    likes: number;
    clicks: number;
    unique_users: number;
    share_of_voice: Record<string, number>;
  }> {
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

    const result = stmt.get(carouselId, cutoffDate) as any;

    const total = (result?.shares || 0) + (result?.saves || 0) + (result?.likes || 0) + (result?.clicks || 0);

    return {
      views: result?.views || 0,
      shares: result?.shares || 0,
      saves: result?.saves || 0,
      likes: result?.likes || 0,
      clicks: result?.clicks || 0,
      unique_users: result?.unique_users || 0,
      share_of_voice: {
        shares: total > 0 ? Math.round(((result?.shares || 0) / total) * 100) : 0,
        saves: total > 0 ? Math.round(((result?.saves || 0) / total) * 100) : 0,
        likes: total > 0 ? Math.round(((result?.likes || 0) / total) * 100) : 0,
        clicks: total > 0 ? Math.round(((result?.clicks || 0) / total) * 100) : 0,
      },
    };
  }

  async compareCarousels(carouselIds: string[]): Promise<Array<{
    carouselId: string;
    title: string;
    views: number;
    engagement: number;
    engagementRate: number;
    rank: number;
  }>> {
    const db = feedIADatabase.getConnection();

    const data = await Promise.all(
      carouselIds.map(async id => {
        const carouselStmt = db.prepare('SELECT title FROM carousels WHERE id = ?');
        const carousel = carouselStmt.get(id) as any;

        const metricsStmt = db.prepare(
          `SELECT SUM(views) as views, SUM(shares + saves + likes + clicks) as engagement
           FROM carousel_metrics_daily WHERE carousel_id = ?`
        );
        const metrics = metricsStmt.get(id) as any;

        const views = metrics?.views || 0;
        const engagement = metrics?.engagement || 0;
        const engagementRate = views > 0 ? (engagement * 100) / views : 0;

        return {
          carouselId: id,
          title: carousel?.title || 'Unknown',
          views,
          engagement,
          engagementRate: Math.round(engagementRate * 100) / 100,
          rank: 0,
        };
      })
    );

    data.sort((a, b) => b.views - a.views);
    data.forEach((item, idx) => {
      item.rank = idx + 1;
    });

    return data;
  }
}

export const carouselAnalyticsService = new CarouselAnalyticsService();
