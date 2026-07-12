import { promises as fs } from 'fs';

export interface MetricSnapshot {
  timestamp: Date;
  followers?: number;
  following?: number;
  posts?: number;
  engagement?: number;
  reach?: number;
  impressions?: number;
  saves?: number;
  shares?: number;
  comments?: number;
  likes?: number;
  contentPerformed?: string[];
}

export interface ContentMetrics {
  contentId: string;
  contentType: 'carousel' | 'reel' | 'story' | 'post';
  postedAt: Date;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  reach: number;
  impressions: number;
  engagement: number;
  engagement_rate: number;
}

export interface AccountAnalytics {
  accountHandle: string;
  platform: 'instagram' | 'tiktok';
  metrics: MetricSnapshot[];
  content: ContentMetrics[];
  lastUpdated: Date;
}

export interface GrowthTrend {
  period: string;
  followerGrowth: number;
  engagementRate: number;
  averageReach: number;
  topContent: ContentMetrics[];
}

export const analyticsService = {
  async recordMetricSnapshot(
    accountHandle: string,
    platform: 'instagram' | 'tiktok',
    snapshot: MetricSnapshot
  ): Promise<void> {
    const analytics = await this.loadAnalytics(accountHandle, platform);

    analytics.metrics.push({
      ...snapshot,
      timestamp: new Date(),
    });

    analytics.lastUpdated = new Date();
    await this.saveAnalytics(accountHandle, platform, analytics);
  },

  async recordContentMetrics(
    accountHandle: string,
    platform: 'instagram' | 'tiktok',
    metrics: ContentMetrics
  ): Promise<void> {
    const analytics = await this.loadAnalytics(accountHandle, platform);

    const existing = analytics.content.findIndex((c) => c.contentId === metrics.contentId);

    if (existing >= 0) {
      analytics.content[existing] = metrics;
    } else {
      analytics.content.push(metrics);
    }

    analytics.lastUpdated = new Date();
    await this.saveAnalytics(accountHandle, platform, analytics);
  },

  async loadAnalytics(
    accountHandle: string,
    platform: 'instagram' | 'tiktok'
  ): Promise<AccountAnalytics> {
    const path = `/data/analytics/${accountHandle}-${platform}.json`;

    try {
      const data = await fs.readFile(path, 'utf-8');
      const parsed = JSON.parse(data) as AccountAnalytics;
      return {
        ...parsed,
        metrics: parsed.metrics.map((m) => ({
          ...m,
          timestamp: new Date(m.timestamp),
        })),
        content: parsed.content.map((c) => ({
          ...c,
          postedAt: new Date(c.postedAt),
        })),
        lastUpdated: new Date(parsed.lastUpdated),
      };
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        return {
          accountHandle,
          platform,
          metrics: [],
          content: [],
          lastUpdated: new Date(),
        };
      }
      throw err;
    }
  },

  async saveAnalytics(
    accountHandle: string,
    platform: 'instagram' | 'tiktok',
    analytics: AccountAnalytics
  ): Promise<void> {
    const dirPath = '/data/analytics';

    try {
      await fs.mkdir(dirPath, { recursive: true });
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'EEXIST') {
        throw err;
      }
    }

    const path = `${dirPath}/${accountHandle}-${platform}.json`;
    await fs.writeFile(path, JSON.stringify(analytics, null, 2));
  },

  async getGrowthTrend(
    accountHandle: string,
    platform: 'instagram' | 'tiktok',
    days: number = 30
  ): Promise<GrowthTrend> {
    const analytics = await this.loadAnalytics(accountHandle, platform);
    const now = new Date();
    const cutoffDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    const recentMetrics = analytics.metrics.filter((m) => m.timestamp >= cutoffDate);
    const recentContent = analytics.content.filter((c) => c.postedAt >= cutoffDate);

    const followerGrowth =
      recentMetrics.length > 1
        ? ((recentMetrics[recentMetrics.length - 1].followers || 0) -
            (recentMetrics[0].followers || 0)) /
          (recentMetrics[0].followers || 1)
        : 0;

    const engagementRate =
      recentMetrics.reduce((sum, m) => sum + (m.engagement || 0), 0) / recentMetrics.length || 0;

    const averageReach =
      recentMetrics.reduce((sum, m) => sum + (m.reach || 0), 0) / recentMetrics.length || 0;

    const topContent = recentContent.sort((a, b) => b.engagement - a.engagement).slice(0, 5);

    return {
      period: `${days}d`,
      followerGrowth,
      engagementRate,
      averageReach,
      topContent,
    };
  },

  async getContentPerformance(
    accountHandle: string,
    platform: 'instagram' | 'tiktok',
    limit: number = 20
  ): Promise<ContentMetrics[]> {
    const analytics = await this.loadAnalytics(accountHandle, platform);

    return analytics.content.sort((a, b) => b.engagement - a.engagement).slice(0, limit);
  },

  async getEngagementRate(
    accountHandle: string,
    platform: 'instagram' | 'tiktok',
    days: number = 7
  ): Promise<number> {
    const analytics = await this.loadAnalytics(accountHandle, platform);
    const now = new Date();
    const cutoffDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    const recentMetrics = analytics.metrics.filter((m) => m.timestamp >= cutoffDate);

    if (recentMetrics.length === 0) return 0;

    const totalEngagement = recentMetrics.reduce((sum, m) => sum + (m.engagement || 0), 0);
    const totalImpressions = recentMetrics.reduce((sum, m) => sum + (m.impressions || 1), 0);

    return (totalEngagement / totalImpressions) * 100;
  },

  async getReachTrend(
    accountHandle: string,
    platform: 'instagram' | 'tiktok',
    days: number = 30
  ): Promise<number[]> {
    const analytics = await this.loadAnalytics(accountHandle, platform);
    const now = new Date();
    const cutoffDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    const recentMetrics = analytics.metrics.filter((m) => m.timestamp >= cutoffDate);

    const dailyReach: { [key: string]: number[] } = {};

    for (const metric of recentMetrics) {
      const dateKey = metric.timestamp.toISOString().split('T')[0];
      if (!dailyReach[dateKey]) {
        dailyReach[dateKey] = [];
      }
      dailyReach[dateKey]!.push(metric.reach || 0);
    }

    return Object.keys(dailyReach)
      .sort()
      .map((date) => {
        const values = dailyReach[date];
        return values ? values.reduce((a, b) => a + b, 0) / values.length : 0;
      });
  },

  async getFollowerGrowth(
    accountHandle: string,
    platform: 'instagram' | 'tiktok',
    days: number = 30
  ): Promise<number[]> {
    const analytics = await this.loadAnalytics(accountHandle, platform);
    const now = new Date();
    const cutoffDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    const recentMetrics = analytics.metrics.filter((m) => m.timestamp >= cutoffDate);

    return recentMetrics.map((m) => m.followers || 0);
  },

  async getRecommendations(
    accountHandle: string,
    platform: 'instagram' | 'tiktok'
  ): Promise<string[]> {
    const analytics = await this.loadAnalytics(accountHandle, platform);
    const trend = await this.getGrowthTrend(accountHandle, platform);
    const recommendations: string[] = [];

    if (trend.engagementRate < 1) {
      recommendations.push('Engagement rate is below 1%. Focus on content quality and posting consistency.');
    }

    if (trend.topContent.length > 0) {
      const topContentType = trend.topContent[0]!.contentType;
      recommendations.push(`Top performing content type is ${topContentType}. Increase posting frequency.`);
    }

    if (trend.followerGrowth < 0.01) {
      recommendations.push('Growth rate is low. Consider collaborative content or hashtag strategy.');
    }

    if (analytics.content.length < 10) {
      recommendations.push('Limited content history. Post more consistently for better trend analysis.');
    }

    return recommendations;
  },
};
