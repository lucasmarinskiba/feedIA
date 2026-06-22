import { log } from '../../agent/logger.js';

export interface MetricPoint {
  date: string;
  value: number;
}

export interface AccountMetrics {
  followers: number;
  following: number;
  postsCount: number;
  reach: MetricPoint[];
  impressions: MetricPoint[];
  profileViews: MetricPoint[];
  followersGrowth: number;
  engagementRate: number;
}

export interface PostInsights {
  postId: string;
  format: 'feed' | 'reel' | 'story' | 'carousel';
  postedAt: string;
  engagements: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  reach: number;
  impressions: number;
  profileVisitsFromPost: number;
  engagementRate: number;
  shareRate: number;
  saveRate: number;
  commentRate: number;
  viralityScore: number;
}

export interface TrendAnalysis {
  metric: string;
  currentValue: number;
  previousValue: number;
  changePercent: number;
  trend: 'up' | 'down' | 'flat';
  velocity: number;
  forecast: number[];
}

export interface CompetitorBenchmark {
  competitorHandle: string;
  accountSize: number;
  avgEngagementRate: number;
  avgReachPerPost: number;
  topContentType: string;
  bestTimeToPost: string;
}

export interface AnalyticsSession {
  sessionId: string;
  platform: 'instagram' | 'tiktok' | 'both';
  accountHandle: string;
  createdAt: Date;
  metrics?: AccountMetrics;
  recentPosts?: PostInsights[];
}

export class AnalyticsController {
  private sessions: Map<string, AnalyticsSession> = new Map();

  async fetchAccountMetrics(
    platform: 'instagram' | 'tiktok',
    accountHandle: string,
    _dateRange?: { startDate: string; endDate: string },
  ): Promise<{ ok: boolean; metrics?: AccountMetrics; error?: string }> {
    try {
      log.info(`[AnalyticsController] Fetching ${platform} metrics for @${accountHandle}`);

      // Placeholder: In production, would call Instagram Graph API or TikTok Analytics API
      const mockMetrics: AccountMetrics = {
        followers: Math.floor(Math.random() * 100000) + 10000,
        following: Math.floor(Math.random() * 5000),
        postsCount: Math.floor(Math.random() * 500) + 50,
        reach: this.generateMetricTimeseries(7),
        impressions: this.generateMetricTimeseries(7),
        profileViews: this.generateMetricTimeseries(7),
        followersGrowth: Math.random() * 15 - 2,
        engagementRate: Math.random() * 8 + 1,
      };

      return { ok: true, metrics: mockMetrics };
    } catch (error) {
      log.error(`[AnalyticsController] Failed to fetch metrics: ${error}`);
      return {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async fetchPostInsights(
    platform: 'instagram' | 'tiktok',
    postId: string,
  ): Promise<{ ok: boolean; insights?: PostInsights; error?: string }> {
    try {
      log.info(`[AnalyticsController] Fetching ${platform} post insights for ${postId}`);

      const mockInsights: PostInsights = {
        postId,
        format: ['feed', 'reel', 'story', 'carousel'][Math.floor(Math.random() * 4)] as PostInsights['format'],
        postedAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
        engagements: Math.floor(Math.random() * 10000) + 100,
        likes: Math.floor(Math.random() * 8000) + 50,
        comments: Math.floor(Math.random() * 500) + 10,
        shares: Math.floor(Math.random() * 200) + 5,
        saves: Math.floor(Math.random() * 1000) + 20,
        reach: Math.floor(Math.random() * 50000) + 5000,
        impressions: Math.floor(Math.random() * 100000) + 10000,
        profileVisitsFromPost: Math.floor(Math.random() * 500) + 50,
        engagementRate: Math.random() * 10 + 0.5,
        shareRate: Math.random() * 2 + 0.1,
        saveRate: Math.random() * 5 + 0.2,
        commentRate: Math.random() * 2 + 0.1,
        viralityScore: Math.random() * 100,
      };

      return { ok: true, insights: mockInsights };
    } catch (error) {
      log.error(`[AnalyticsController] Failed to fetch post insights: ${error}`);
      return {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async comparePeriods(
    platform: 'instagram' | 'tiktok',
    accountHandle: string,
    _period1: { startDate: string; endDate: string },
    _period2: { startDate: string; endDate: string },
  ): Promise<{ ok: boolean; trends?: TrendAnalysis[]; error?: string }> {
    try {
      log.info(`[AnalyticsController] Comparing ${platform} periods for @${accountHandle}`);

      const metrics = ['followers', 'reach', 'impressions', 'engagement_rate', 'saves', 'shares'];
      const trends: TrendAnalysis[] = metrics.map((metric) => ({
        metric,
        currentValue: Math.random() * 100 + 100,
        previousValue: Math.random() * 100 + 80,
        changePercent: Math.random() * 40 - 10,
        trend: Math.random() > 0.5 ? 'up' : 'down',
        velocity: Math.random() * 5 - 2,
        forecast: this.generateForecast(7),
      }));

      return { ok: true, trends };
    } catch (error) {
      log.error(`[AnalyticsController] Failed to compare periods: ${error}`);
      return {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async detectTrends(
    platform: 'instagram' | 'tiktok',
    accountHandle: string,
    daysBack: number = 30,
  ): Promise<{ ok: boolean; trends?: TrendAnalysis[]; anomalies?: string[]; error?: string }> {
    try {
      log.info(`[AnalyticsController] Detecting ${daysBack}-day trends for @${accountHandle} on ${platform}`);

      const trends: TrendAnalysis[] = [
        {
          metric: 'engagement_rate',
          currentValue: Math.random() * 8 + 1,
          previousValue: Math.random() * 6 + 1,
          changePercent: Math.random() * 50 - 15,
          trend: 'up',
          velocity: Math.random() * 2,
          forecast: this.generateForecast(7),
        },
        {
          metric: 'video_completion_rate',
          currentValue: Math.random() * 70 + 20,
          previousValue: Math.random() * 60 + 20,
          changePercent: Math.random() * 30 - 5,
          trend: 'down',
          velocity: Math.random() * 1,
          forecast: this.generateForecast(7),
        },
      ];

      const anomalies =
        Math.random() > 0.5 ? ['Unusual spike in saves 3 days ago', 'Viral comment thread detected'] : [];

      return { ok: true, trends, anomalies };
    } catch (error) {
      log.error(`[AnalyticsController] Failed to detect trends: ${error}`);
      return {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async benchmarkCompetitors(
    platform: 'instagram' | 'tiktok',
    accountHandle: string,
    competitors: string[],
  ): Promise<{ ok: boolean; benchmarks?: CompetitorBenchmark[]; error?: string }> {
    try {
      log.info(`[AnalyticsController] Benchmarking vs ${competitors.length} competitors on ${platform}`);

      const benchmarks: CompetitorBenchmark[] = competitors.map((handle) => {
        const contentTypes = ['reel', 'carousel', 'feed'] as const;
        const times = ['9:00 AM', '6:00 PM', '12:00 PM'] as const;
        return {
          competitorHandle: handle,
          accountSize: Math.floor(Math.random() * 500000) + 10000,
          avgEngagementRate: Math.random() * 8 + 0.5,
          avgReachPerPost: Math.floor(Math.random() * 100000) + 10000,
          topContentType: contentTypes[Math.floor(Math.random() * contentTypes.length)]!,
          bestTimeToPost: times[Math.floor(Math.random() * times.length)]!,
        };
      });

      return { ok: true, benchmarks };
    } catch (error) {
      log.error(`[AnalyticsController] Failed to benchmark: ${error}`);
      return {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async getViralityScore(
    insights: PostInsights,
  ): Promise<{ score: number; factors: Record<string, number>; viral: boolean }> {
    const factors = {
      save_rate_weight: (insights.saveRate / 10) * 30,
      share_rate_weight: (insights.shareRate / 5) * 25,
      comment_rate_weight: (insights.commentRate / 5) * 20,
      engagement_rate_weight: (insights.engagementRate / 10) * 15,
      momentum_weight: (insights.reach > 50000 ? 1 : 0.5) * 10,
    };

    const score = Object.values(factors).reduce((a, b) => a + b, 0);
    const viral = score > 60;

    return { score: Math.min(100, score), factors, viral };
  }

  async createSession(platform: 'instagram' | 'tiktok' | 'both', accountHandle: string): Promise<AnalyticsSession> {
    const sessionId = `analytics-${platform}-${Date.now()}`;
    const session: AnalyticsSession = {
      sessionId,
      platform,
      accountHandle,
      createdAt: new Date(),
    };
    this.sessions.set(sessionId, session);
    log.debug(`[AnalyticsController] Created session ${sessionId} for @${accountHandle} on ${platform}`);
    return session;
  }

  async closeSession(sessionId: string): Promise<boolean> {
    const deleted = this.sessions.delete(sessionId);
    if (deleted) {
      log.debug(`[AnalyticsController] Closed session ${sessionId}`);
    }
    return deleted;
  }

  getSession(sessionId: string): AnalyticsSession | undefined {
    return this.sessions.get(sessionId);
  }

  private generateMetricTimeseries(days: number): MetricPoint[] {
    return Array.from({ length: days }, (_, i) => {
      const dateStr = new Date(Date.now() - (days - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0]!;
      return {
        date: dateStr,
        value: Math.floor(Math.random() * 100000) + 10000,
      };
    });
  }

  private generateForecast(days: number): number[] {
    return Array.from({ length: days }, () => Math.floor(Math.random() * 100000) + 10000);
  }
}

export const analyticsController = new AnalyticsController();
