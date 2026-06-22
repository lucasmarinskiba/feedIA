import type { Tool } from '@anthropic-ai/sdk/resources/messages.js';
import { analyticsController } from '../../studio/controllers/analyticsController.js';
import { contentAlgorithmAgent } from '../../studio/intelligence/contentAlgorithmAgent.js';
import { revenueOptimizationAgent } from '../../studio/intelligence/revenueOptimizationAgent.js';
import type { BrandProfile } from '../../config/types.js';
import type { NicheCategory, MonetizationModel } from '../../studio/intelligence/nicheAnalyzer.js';
import { buildMinimalIntelligence } from './intelligenceHelpers.js';

interface ToolSpec extends Tool {
  description: string;
}

const tools: Record<string, ToolSpec> = {};

// ── Existing session tools ────────────────────────────────────────────────────

tools.analytics_create_session = {
  name: 'analytics_create_session',
  description: 'Create analytics session for Instagram and/or TikTok account tracking',
  input_schema: {
    type: 'object' as const,
    properties: {
      platform: { type: 'string', enum: ['instagram', 'tiktok', 'both'], description: 'Platform to track' },
      account_handle: { type: 'string', description: 'Account handle without @ symbol' },
    },
    required: ['platform', 'account_handle'],
  },
};

tools.analytics_fetch_account_metrics = {
  name: 'analytics_fetch_account_metrics',
  description: 'Fetch account-level metrics: followers, reach, impressions, growth rate',
  input_schema: {
    type: 'object' as const,
    properties: {
      session_id: { type: 'string', description: 'Active analytics session ID' },
      platform: { type: 'string', enum: ['instagram', 'tiktok'], description: 'Platform to fetch from' },
      account_handle: { type: 'string', description: 'Account handle' },
      date_range: {
        type: 'object',
        properties: {
          start_date: { type: 'string', description: 'YYYY-MM-DD' },
          end_date: { type: 'string', description: 'YYYY-MM-DD' },
        },
      },
    },
    required: ['platform', 'account_handle'],
  },
};

tools.analytics_fetch_post_insights = {
  name: 'analytics_fetch_post_insights',
  description: 'Get detailed insights for specific post: engagement, reach, virality score',
  input_schema: {
    type: 'object' as const,
    properties: {
      session_id: { type: 'string', description: 'Active analytics session ID' },
      platform: { type: 'string', enum: ['instagram', 'tiktok'], description: 'Platform' },
      post_id: { type: 'string', description: 'Post/video ID' },
    },
    required: ['platform', 'post_id'],
  },
};

tools.analytics_compare_periods = {
  name: 'analytics_compare_periods',
  description: 'Compare metrics between two time periods to identify growth patterns',
  input_schema: {
    type: 'object' as const,
    properties: {
      session_id: { type: 'string' },
      platform: { type: 'string', enum: ['instagram', 'tiktok'] },
      account_handle: { type: 'string' },
      period_1: {
        type: 'object',
        properties: { start_date: { type: 'string' }, end_date: { type: 'string' } },
        required: ['start_date', 'end_date'],
      },
      period_2: {
        type: 'object',
        properties: { start_date: { type: 'string' }, end_date: { type: 'string' } },
        required: ['start_date', 'end_date'],
      },
    },
    required: ['platform', 'account_handle', 'period_1', 'period_2'],
  },
};

tools.analytics_detect_trends = {
  name: 'analytics_detect_trends',
  description: 'Detect trends and anomalies in recent account data',
  input_schema: {
    type: 'object' as const,
    properties: {
      session_id: { type: 'string' },
      platform: { type: 'string', enum: ['instagram', 'tiktok'] },
      account_handle: { type: 'string' },
      days_back: { type: 'number', description: 'How many days to analyze (default: 30)' },
    },
    required: ['platform', 'account_handle'],
  },
};

tools.analytics_benchmark_competitors = {
  name: 'analytics_benchmark_competitors',
  description: 'Compare your account metrics against competitor accounts',
  input_schema: {
    type: 'object' as const,
    properties: {
      session_id: { type: 'string' },
      platform: { type: 'string', enum: ['instagram', 'tiktok'] },
      your_account: { type: 'string', description: 'Your account handle' },
      competitor_accounts: {
        type: 'array',
        items: { type: 'string' },
        description: 'Competitor handles to benchmark against',
      },
    },
    required: ['platform', 'your_account', 'competitor_accounts'],
  },
};

tools.analytics_virality_score = {
  name: 'analytics_virality_score',
  description: 'Calculate virality probability score for a post based on engagement metrics',
  input_schema: {
    type: 'object' as const,
    properties: {
      engagement_rate: { type: 'number', description: 'Engagement rate %' },
      save_rate: { type: 'number', description: 'Save rate %' },
      share_rate: { type: 'number', description: 'Share rate %' },
      comment_rate: { type: 'number', description: 'Comment rate %' },
      reach: { type: 'number', description: 'Total reach' },
    },
    required: ['engagement_rate'],
  },
};

tools.analytics_close_session = {
  name: 'analytics_close_session',
  description: 'Close analytics session',
  input_schema: {
    type: 'object' as const,
    properties: { session_id: { type: 'string', description: 'Session ID to close' } },
    required: ['session_id'],
  },
};

// ── AI Intelligence Tools ─────────────────────────────────────────────────────

tools.analytics_content_roi = {
  name: 'analytics_content_roi',
  description:
    'Calculate ROI per content type — compares production effort vs. followers gained, engagement generated, and estimated revenue attribution. Ranks formats by efficiency',
  input_schema: {
    type: 'object' as const,
    properties: {
      platform: { type: 'string', enum: ['instagram', 'tiktok'], description: 'Platform' },
      account_handle: { type: 'string', description: 'Account handle' },
      niche: { type: 'string', description: 'Content niche' },
      monetization_model: {
        type: 'string',
        enum: ['coaching', 'products', 'affiliate', 'ads', 'sponsorship', 'saas', 'services', 'community'],
        description: 'How the account monetizes',
      },
      followers: { type: 'number', description: 'Current follower count' },
      monthly_revenue_usd: { type: 'number', description: 'Current monthly revenue (optional)' },
    },
    required: ['platform', 'niche'],
  },
};

tools.analytics_hashtag_performance = {
  name: 'analytics_hashtag_performance',
  description:
    'Analyze hashtag effectiveness: reach potential, competition level, discovery rate per hashtag group. Recommends optimal hashtag strategy per post type',
  input_schema: {
    type: 'object' as const,
    properties: {
      hashtags: {
        type: 'array',
        items: { type: 'string' },
        description: 'Hashtags to analyze (without # symbol)',
      },
      platform: { type: 'string', enum: ['instagram', 'tiktok'], description: 'Platform' },
      niche: { type: 'string', description: 'Content niche' },
      post_format: {
        type: 'string',
        enum: ['reel', 'feed', 'carousel', 'story', 'tiktok-video'],
        description: 'Post format (hashtag strategy differs)',
      },
    },
    required: ['hashtags', 'platform', 'niche'],
  },
};

tools.analytics_best_format = {
  name: 'analytics_best_format',
  description:
    'Identify which content format drives the most growth, engagement, and reach for a specific account and niche. Returns format performance ranking with data-backed recommendations',
  input_schema: {
    type: 'object' as const,
    properties: {
      platform: { type: 'string', enum: ['instagram', 'tiktok'], description: 'Platform' },
      account_handle: { type: 'string', description: 'Account handle' },
      niche: { type: 'string', description: 'Content niche' },
      account_stage: {
        type: 'string',
        enum: ['starter', 'growing', 'established'],
        description: 'Account stage (affects format recommendations)',
      },
    },
    required: ['platform', 'niche'],
  },
};

tools.analytics_follower_quality = {
  name: 'analytics_follower_quality',
  description:
    'Score follower quality — real engagement ratio vs ghost followers, audience authenticity, DM relationship strength. Identifies if account needs engagement repair vs. growth',
  input_schema: {
    type: 'object' as const,
    properties: {
      platform: { type: 'string', enum: ['instagram', 'tiktok'], description: 'Platform' },
      account_handle: { type: 'string', description: 'Account handle' },
      followers: { type: 'number', description: 'Total follower count' },
      avg_likes: { type: 'number', description: 'Average likes per post' },
      avg_comments: { type: 'number', description: 'Average comments per post' },
      avg_saves: { type: 'number', description: 'Average saves per post' },
    },
    required: ['platform', 'account_handle', 'followers'],
  },
};

tools.analytics_posting_frequency_impact = {
  name: 'analytics_posting_frequency_impact',
  description:
    'Analyze correlation between posting frequency and engagement rate — finds optimal posting cadence that maximizes algorithm reach without engagement dilution',
  input_schema: {
    type: 'object' as const,
    properties: {
      platform: { type: 'string', enum: ['instagram', 'tiktok'], description: 'Platform' },
      niche: { type: 'string', description: 'Content niche' },
      current_posts_per_week: { type: 'number', description: 'Current weekly posting frequency' },
      current_engagement_rate: { type: 'number', description: 'Current avg engagement rate %' },
      account_stage: { type: 'string', enum: ['starter', 'growing', 'established'], description: 'Account stage' },
    },
    required: ['platform', 'niche', 'current_posts_per_week'],
  },
};

tools.analytics_funnel_tracking = {
  name: 'analytics_funnel_tracking',
  description:
    'Map and analyze full conversion funnel: Reach → Profile Visit → Follow → Link Click → Lead → Sale. Identifies funnel bottlenecks and revenue leakage points',
  input_schema: {
    type: 'object' as const,
    properties: {
      niche: { type: 'string', description: 'Content niche' },
      monetization_model: {
        type: 'string',
        enum: ['coaching', 'products', 'affiliate', 'ads', 'sponsorship', 'saas', 'services', 'community'],
        description: 'Monetization model determines funnel stages',
      },
      monthly_reach: { type: 'number', description: 'Monthly content reach' },
      profile_visit_rate: { type: 'number', description: 'Profile visits / reach %' },
      follow_rate: { type: 'number', description: 'Follows from profile visits %' },
      link_click_rate: { type: 'number', description: 'Bio link clicks / followers %' },
      conversion_rate: { type: 'number', description: 'Sales / link clicks %' },
      avg_order_value: { type: 'number', description: 'Average purchase value USD' },
    },
    required: ['niche', 'monetization_model'],
  },
};

tools.analytics_content_prediction = {
  name: 'analytics_content_prediction',
  description:
    'Predict post performance before publishing — uses algorithm signals, timing, format, and niche data to forecast engagement rate range, reach potential, and viral probability',
  input_schema: {
    type: 'object' as const,
    properties: {
      platform: { type: 'string', enum: ['instagram', 'tiktok'], description: 'Target platform' },
      niche: { type: 'string', description: 'Content niche' },
      format: {
        type: 'string',
        enum: ['reel', 'carousel', 'feed', 'story', 'tiktok-video'],
        description: 'Content format',
      },
      has_hook: { type: 'boolean', description: 'Strong opening hook present?' },
      has_cta: { type: 'boolean', description: 'Clear call-to-action present?' },
      is_trending_topic: { type: 'boolean', description: 'Topic currently trending in niche?' },
      uses_trending_audio: { type: 'boolean', description: 'Uses trending sound/music?' },
      posting_hour: { type: 'number', description: 'Hour of day (0-23) for scheduled post' },
      posting_day: { type: 'number', description: 'Day of week (0=Sunday, 6=Saturday)' },
      followers: { type: 'number', description: 'Current follower count' },
    },
    required: ['platform', 'niche', 'format'],
  },
};

tools.analytics_niche_benchmarks = {
  name: 'analytics_niche_benchmarks',
  description:
    'Get niche-specific performance benchmarks: average engagement rate, follower growth rate, best content formats, posting frequency, and revenue per follower for your niche',
  input_schema: {
    type: 'object' as const,
    properties: {
      niche: { type: 'string', description: 'Content niche' },
      platform: { type: 'string', enum: ['instagram', 'tiktok', 'both'], description: 'Platform' },
      account_stage: {
        type: 'string',
        enum: ['starter', 'growing', 'established', 'dominant'],
        description: 'Account growth stage',
      },
    },
    required: ['niche', 'platform'],
  },
};

export const analyticsTools = tools;

// ── Niche benchmark data ──────────────────────────────────────────────────────

interface NicheBenchmark {
  avgEngagementRate: number;
  viralThreshold: number;
  optimalPostsPerWeek: number;
  topFormat: string;
  avgFollowerGrowthRateMonthly: number;
  revenuePerFollowerUsd: number;
  bestPostingDays: string[];
  bestPostingHours: number[];
}

const NICHE_BENCHMARKS: Partial<Record<string, NicheBenchmark>> = {
  'fitness-coaching': {
    avgEngagementRate: 4.5,
    viralThreshold: 8.0,
    optimalPostsPerWeek: 5,
    topFormat: 'reel',
    avgFollowerGrowthRateMonthly: 8,
    revenuePerFollowerUsd: 0.12,
    bestPostingDays: ['Monday', 'Wednesday', 'Saturday'],
    bestPostingHours: [6, 12, 18],
  },
  'fitness-products': {
    avgEngagementRate: 3.2,
    viralThreshold: 6.0,
    optimalPostsPerWeek: 4,
    topFormat: 'carousel',
    avgFollowerGrowthRateMonthly: 5,
    revenuePerFollowerUsd: 0.08,
    bestPostingDays: ['Tuesday', 'Thursday', 'Sunday'],
    bestPostingHours: [8, 17, 20],
  },
  'personal-brand': {
    avgEngagementRate: 5.8,
    viralThreshold: 10.0,
    optimalPostsPerWeek: 7,
    topFormat: 'reel',
    avgFollowerGrowthRateMonthly: 12,
    revenuePerFollowerUsd: 0.18,
    bestPostingDays: ['Monday', 'Wednesday', 'Friday'],
    bestPostingHours: [7, 12, 19],
  },
  ecommerce: {
    avgEngagementRate: 2.8,
    viralThreshold: 5.5,
    optimalPostsPerWeek: 5,
    topFormat: 'carousel',
    avgFollowerGrowthRateMonthly: 4,
    revenuePerFollowerUsd: 0.06,
    bestPostingDays: ['Tuesday', 'Thursday', 'Saturday'],
    bestPostingHours: [10, 14, 20],
  },
  finance: {
    avgEngagementRate: 3.5,
    viralThreshold: 7.0,
    optimalPostsPerWeek: 4,
    topFormat: 'carousel',
    avgFollowerGrowthRateMonthly: 6,
    revenuePerFollowerUsd: 0.22,
    bestPostingDays: ['Monday', 'Wednesday', 'Friday'],
    bestPostingHours: [8, 12, 18],
  },
  education: {
    avgEngagementRate: 4.0,
    viralThreshold: 7.5,
    optimalPostsPerWeek: 5,
    topFormat: 'carousel',
    avgFollowerGrowthRateMonthly: 7,
    revenuePerFollowerUsd: 0.14,
    bestPostingDays: ['Tuesday', 'Thursday', 'Sunday'],
    bestPostingHours: [9, 15, 20],
  },
  coaching: {
    avgEngagementRate: 4.8,
    viralThreshold: 8.5,
    optimalPostsPerWeek: 5,
    topFormat: 'reel',
    avgFollowerGrowthRateMonthly: 9,
    revenuePerFollowerUsd: 0.25,
    bestPostingDays: ['Monday', 'Wednesday', 'Friday'],
    bestPostingHours: [7, 12, 18],
  },
};

export const executeAnalyticsTool = async (
  toolName: string,
  input: Record<string, unknown>,
  _brand?: BrandProfile,
): Promise<string> => {
  try {
    const validPlatforms = ['instagram', 'tiktok'] as const;
    const isValidPlatform = (str: string): str is (typeof validPlatforms)[number] =>
      validPlatforms.includes(str as (typeof validPlatforms)[number]);

    switch (toolName) {
      case 'analytics_create_session': {
        const validPlatformTypes = ['instagram', 'tiktok', 'both'] as const;
        const isValidPlatformType = (str: string): str is (typeof validPlatformTypes)[number] =>
          validPlatformTypes.includes(str as (typeof validPlatformTypes)[number]);
        const platformStr = (input.platform as string) || 'instagram';
        const platform = isValidPlatformType(platformStr) ? platformStr : 'instagram';
        const session = await analyticsController.createSession(
          platform,
          (input.account_handle as string) || 'unknown',
        );
        return JSON.stringify({
          ok: true,
          session_id: session.sessionId,
          platform: session.platform,
          account: session.accountHandle,
          message: `Analytics session created for @${session.accountHandle}`,
        });
      }

      case 'analytics_fetch_account_metrics': {
        const platformStr = (input.platform as string) || 'instagram';
        const platform = isValidPlatform(platformStr) ? platformStr : 'instagram';
        const handle = (input.account_handle as string) || 'unknown';
        const dateRange = input.date_range as { start_date?: string; end_date?: string } | undefined;
        const result = await analyticsController.fetchAccountMetrics(platform, handle, {
          startDate: dateRange?.start_date || '',
          endDate: dateRange?.end_date || '',
        });
        if (!result.ok) return JSON.stringify({ ok: false, error: result.error });
        return JSON.stringify({
          ok: true,
          followers: result.metrics?.followers,
          following: result.metrics?.following,
          posts: result.metrics?.postsCount,
          engagement_rate: result.metrics?.engagementRate,
          followers_growth: result.metrics?.followersGrowth,
          reach_7d: result.metrics?.reach.slice(-7),
        });
      }

      case 'analytics_fetch_post_insights': {
        const platformStr = (input.platform as string) || 'instagram';
        const platform = isValidPlatform(platformStr) ? platformStr : 'instagram';
        const postId = (input.post_id as string) || 'unknown';
        const result = await analyticsController.fetchPostInsights(platform, postId);
        if (!result.ok) return JSON.stringify({ ok: false, error: result.error });
        const insights = result.insights!;
        const viralityCalc = await analyticsController.getViralityScore(insights);
        return JSON.stringify({
          ok: true,
          post_id: postId,
          format: insights.format,
          engagements: insights.engagements,
          engagement_rate: insights.engagementRate,
          reach: insights.reach,
          saves: insights.saves,
          save_rate: insights.saveRate,
          shares: insights.shares,
          share_rate: insights.shareRate,
          virality_score: viralityCalc.score,
          viral: viralityCalc.viral,
        });
      }

      case 'analytics_compare_periods': {
        const platformStr = (input.platform as string) || 'instagram';
        const platform = isValidPlatform(platformStr) ? platformStr : 'instagram';
        const handle = (input.account_handle as string) || 'unknown';
        const p1 = input.period_1 as Record<string, unknown>;
        const p2 = input.period_2 as Record<string, unknown>;
        const result = await analyticsController.comparePeriods(
          platform,
          handle,
          { startDate: (p1.start_date as string) || '', endDate: (p1.end_date as string) || '' },
          { startDate: (p2.start_date as string) || '', endDate: (p2.end_date as string) || '' },
        );
        if (!result.ok) return JSON.stringify({ ok: false, error: result.error });
        return JSON.stringify({
          ok: true,
          trends: result.trends?.map((t) => ({
            metric: t.metric,
            change_percent: t.changePercent,
            trend: t.trend,
            velocity: t.velocity,
          })),
        });
      }

      case 'analytics_detect_trends': {
        const platformStr = (input.platform as string) || 'instagram';
        const platform = isValidPlatform(platformStr) ? platformStr : 'instagram';
        const handle = (input.account_handle as string) || 'unknown';
        const daysBack = typeof input.days_back === 'number' ? input.days_back : 30;
        const result = await analyticsController.detectTrends(platform, handle, daysBack);
        if (!result.ok) return JSON.stringify({ ok: false, error: result.error });
        return JSON.stringify({
          ok: true,
          trends: result.trends?.map((t) => ({ metric: t.metric, trend: t.trend, change_percent: t.changePercent })),
          anomalies: result.anomalies,
        });
      }

      case 'analytics_benchmark_competitors': {
        const platformStr = (input.platform as string) || 'instagram';
        const platform = isValidPlatform(platformStr) ? platformStr : 'instagram';
        const yourAccount = (input.your_account as string) || 'unknown';
        const competitors = (input.competitor_accounts as string[]) || [];
        const result = await analyticsController.benchmarkCompetitors(platform, yourAccount, competitors);
        if (!result.ok) return JSON.stringify({ ok: false, error: result.error });
        return JSON.stringify({
          ok: true,
          benchmarks: result.benchmarks?.map((b) => ({
            competitor: b.competitorHandle,
            account_size: b.accountSize,
            avg_engagement: b.avgEngagementRate,
            top_format: b.topContentType,
            best_time: b.bestTimeToPost,
          })),
        });
      }

      case 'analytics_virality_score': {
        const mockInsights = {
          postId: 'mock',
          format: 'reel' as const,
          postedAt: new Date().toISOString(),
          engagements: 1000,
          likes: 800,
          comments: 100,
          shares: 50,
          saves: 200,
          reach: 50000,
          impressions: 100000,
          profileVisitsFromPost: 500,
          engagementRate: (input.engagement_rate as number) || 2,
          shareRate: (input.share_rate as number) || 0.5,
          saveRate: (input.save_rate as number) || 1,
          commentRate: (input.comment_rate as number) || 0.5,
          viralityScore: 75,
        };
        const result = await analyticsController.getViralityScore(mockInsights);
        return JSON.stringify({ ok: true, virality_score: result.score, viral: result.viral, factors: result.factors });
      }

      case 'analytics_close_session': {
        const closed = await analyticsController.closeSession(input.session_id as string);
        return JSON.stringify({ ok: closed, message: closed ? 'Session closed' : 'Session not found' });
      }

      // ── AI Intelligence Cases ───────────────────────────────────────────────

      case 'analytics_content_roi': {
        const niche = input.niche as string as NicheCategory;
        const platform = (input.platform as string) || 'instagram';
        const monetization = (input.monetization_model as MonetizationModel) || 'coaching';
        const followers = typeof input.followers === 'number' ? input.followers : 1000;
        const monthlyRevenue = typeof input.monthly_revenue_usd === 'number' ? input.monthly_revenue_usd : 0;

        const algIG = contentAlgorithmAgent.getAlgorithmProfile('instagram', niche);
        const algTK = contentAlgorithmAgent.getAlgorithmProfile('tiktok', niche);

        const formatROI = [
          {
            format: 'reel',
            platform: 'instagram',
            avg_reach_multiplier: 8.5,
            avg_production_hours: 2,
            engagement_weight: algIG.rankingFactors[0]?.weight ?? 0.3,
            discovery_potential: 'high',
          },
          {
            format: 'carousel',
            platform: 'instagram',
            avg_reach_multiplier: 3.2,
            avg_production_hours: 1.5,
            engagement_weight: algIG.rankingFactors[0]?.weight ?? 0.3,
            discovery_potential: 'medium-high',
          },
          {
            format: 'feed-post',
            platform: 'instagram',
            avg_reach_multiplier: 1.8,
            avg_production_hours: 0.5,
            engagement_weight: 0.15,
            discovery_potential: 'low',
          },
          {
            format: 'story',
            platform: 'instagram',
            avg_reach_multiplier: 0.6,
            avg_production_hours: 0.3,
            engagement_weight: 0.05,
            discovery_potential: 'low',
          },
          {
            format: 'tiktok-video',
            platform: 'tiktok',
            avg_reach_multiplier: 12.0,
            avg_production_hours: 2.5,
            engagement_weight: algTK.rankingFactors[0]?.weight ?? 0.35,
            discovery_potential: 'very-high',
          },
        ]
          .map((f) => ({
            ...f,
            roi_score: Math.round((f.avg_reach_multiplier * f.engagement_weight * 100) / f.avg_production_hours),
            revenue_attribution:
              monthlyRevenue > 0
                ? `~$${(monthlyRevenue * f.engagement_weight * 0.3).toFixed(0)}/mo`
                : 'Track link clicks to measure',
          }))
          .sort((a, b) => b.roi_score - a.roi_score);

        const revProfile = revenueOptimizationAgent.buildRevenueProfile(
          buildMinimalIntelligence('analytics', platform as 'instagram' | 'tiktok', niche, monetization, followers),
        );

        return JSON.stringify({
          ok: true,
          format_roi_ranking: formatROI,
          top_format_recommendation: formatROI[0],
          revenue_profile: {
            current_estimate: revProfile.currentEstimate.monthly,
            optimized_potential: revProfile.optimizedEstimate.monthly,
            key_levers: revProfile.revenueLevers.slice(0, 3).map((l) => l.lever),
          },
        });
      }

      case 'analytics_hashtag_performance': {
        const hashtags = (input.hashtags as string[]) || [];
        const platform = (input.platform as string) || 'instagram';
        const niche = (input.niche as string) || 'personal-brand';
        const postFormat = (input.post_format as string) || 'reel';

        const categorized = hashtags
          .map((tag) => {
            const len = tag.length;
            const sizeCategory =
              len <= 6
                ? 'mega (>1M posts)'
                : len <= 10
                  ? 'large (100K-1M)'
                  : len <= 15
                    ? 'medium (10K-100K)'
                    : 'niche (<10K)';
            const reachScore = len <= 6 ? 20 : len <= 10 ? 55 : len <= 15 ? 80 : 95;
            const competitionScore = len <= 6 ? 95 : len <= 10 ? 70 : len <= 15 ? 45 : 20;
            return {
              hashtag: `#${tag}`,
              estimated_size: sizeCategory,
              reach_score: reachScore,
              competition_score: competitionScore,
              discovery_score: Math.round(reachScore * 0.4 + (100 - competitionScore) * 0.6),
              recommended_for:
                reachScore > 70 ? 'viral content' : reachScore > 50 ? 'growth content' : 'niche targeting',
            };
          })
          .sort((a, b) => b.discovery_score - a.discovery_score);

        const optimalMix = {
          mega_tags: hashtags.filter((_, i) => categorized[i] && categorized[i]!.reach_score <= 30).slice(0, 3),
          large_tags: hashtags
            .filter((_, i) => categorized[i] && categorized[i]!.reach_score > 30 && categorized[i]!.reach_score <= 60)
            .slice(0, 5),
          medium_tags: hashtags
            .filter((_, i) => categorized[i] && categorized[i]!.reach_score > 60 && categorized[i]!.reach_score <= 85)
            .slice(0, 8),
          niche_tags: hashtags.filter((_, i) => categorized[i] && categorized[i]!.reach_score > 85).slice(0, 9),
        };

        return JSON.stringify({
          ok: true,
          platform,
          niche,
          post_format: postFormat,
          analyzed_count: hashtags.length,
          hashtag_analysis: categorized.slice(0, 15),
          optimal_mix_strategy: optimalMix,
          platform_notes:
            {
              instagram:
                postFormat === 'reel'
                  ? '3-5 hashtags on reels performs better than 30'
                  : '8-15 hashtags optimal for feed/carousel',
              tiktok: '3-5 hashtags — TikTok FYP is topic-based, not hashtag-based primarily',
            }[platform] ?? '5-10 hashtags recommended',
          first_comment_tip: 'Move hashtags to first comment to keep caption clean for SEO',
        });
      }

      case 'analytics_best_format': {
        const platform = (input.platform as string) || 'instagram';
        const niche = input.niche as string as NicheCategory;
        const stage = (input.account_stage as string) || 'growing';

        const algProfile = contentAlgorithmAgent.getAlgorithmProfile(platform as 'instagram' | 'tiktok', niche);
        const benchmark = NICHE_BENCHMARKS[niche] ?? NICHE_BENCHMARKS['personal-brand'];

        const formatRanking =
          platform === 'instagram'
            ? [
                {
                  format: 'reel',
                  discovery_potential: 'very-high',
                  engagement_boost: '3-8x vs feed',
                  best_for: 'growth & discovery',
                  algorithm_priority: algProfile.rankingFactors[0]?.factor,
                },
                {
                  format: 'carousel',
                  discovery_potential: 'high',
                  engagement_boost: '2-3x vs feed',
                  best_for: 'saves & authority',
                  algorithm_priority: 'saves signal',
                },
                {
                  format: 'feed-post',
                  discovery_potential: 'low',
                  engagement_boost: 'baseline',
                  best_for: 'existing audience',
                  algorithm_priority: 'likes/comments',
                },
                {
                  format: 'story',
                  discovery_potential: 'minimal',
                  engagement_boost: 'relationship building',
                  best_for: 'DM & trust',
                  algorithm_priority: 'reply rate',
                },
              ]
            : [
                {
                  format: 'tiktok-video',
                  discovery_potential: 'extreme',
                  engagement_boost: '5-20x vs followers',
                  best_for: 'FYP discovery',
                  algorithm_priority: algProfile.rankingFactors[0]?.factor,
                },
                {
                  format: 'tiktok-story',
                  discovery_potential: 'low',
                  engagement_boost: 'relationship',
                  best_for: 'engaged followers',
                  algorithm_priority: 'replies',
                },
              ];

        return JSON.stringify({
          ok: true,
          platform,
          niche,
          account_stage: stage,
          format_ranking: formatRanking,
          top_recommendation: formatRanking[0],
          niche_top_format: benchmark?.topFormat ?? 'reel',
          stage_strategy:
            {
              starter: 'Focus 80% on discovery formats (reels/TikTok). Build reach first.',
              growing: 'Mix 60% discovery, 40% engagement (carousels). Build saves.',
              established: 'Balance: 40% discovery, 40% saves, 20% community (stories).',
            }[stage] ?? 'Focus on highest-reach format first',
          posts_per_week_benchmark: benchmark?.optimalPostsPerWeek ?? 5,
        });
      }

      case 'analytics_follower_quality': {
        const followers = typeof input.followers === 'number' ? input.followers : 1000;
        const avgLikes = typeof input.avg_likes === 'number' ? input.avg_likes : 0;
        const avgComments = typeof input.avg_comments === 'number' ? input.avg_comments : 0;
        const avgSaves = typeof input.avg_saves === 'number' ? input.avg_saves : 0;
        const platform = (input.platform as string) || 'instagram';

        const totalEngagements = avgLikes + avgComments + avgSaves;
        const engagementRate = followers > 0 ? (totalEngagements / followers) * 100 : 0;

        const platformBenchmarks = { instagram: { good: 3.5, great: 6.0 }, tiktok: { good: 4.0, great: 8.0 } };
        const benchmarks = platformBenchmarks[platform as 'instagram' | 'tiktok'] ?? platformBenchmarks.instagram;

        const qualityScore =
          engagementRate >= benchmarks.great
            ? 90
            : engagementRate >= benchmarks.good
              ? 70
              : engagementRate >= benchmarks.good / 2
                ? 50
                : 30;
        const ghostFollowerEstimate = Math.max(0, Math.round(followers * (1 - engagementRate / 100) * 0.4));

        return JSON.stringify({
          ok: true,
          platform,
          followers,
          engagement_rate: engagementRate.toFixed(2),
          follower_quality_score: qualityScore,
          quality_grade:
            qualityScore >= 85 ? 'Excellent' : qualityScore >= 65 ? 'Good' : qualityScore >= 45 ? 'Fair' : 'Poor',
          estimated_ghost_followers: ghostFollowerEstimate,
          active_audience_estimate: followers - ghostFollowerEstimate,
          benchmark_comparison: {
            your_rate: `${engagementRate.toFixed(2)}%`,
            niche_good: `${benchmarks.good}%`,
            niche_great: `${benchmarks.great}%`,
            status:
              engagementRate >= benchmarks.great
                ? 'Above average'
                : engagementRate >= benchmarks.good
                  ? 'Average'
                  : 'Below average',
          },
          repair_actions:
            qualityScore < 65
              ? [
                  'Run engagement re-activation campaign',
                  'Ask direct questions in captions',
                  'Story polls to re-engage silent followers',
                  'Remove obvious bot followers',
                ]
              : ['Maintain current engagement strategy', 'Focus on quality over follower quantity'],
          revenue_impact: `At ${qualityScore >= 65 ? 'good' : 'low'} quality, estimated ${qualityScore >= 65 ? '$' + Math.round(followers * 0.08) : '$' + Math.round(followers * 0.03)}/mo potential`,
        });
      }

      case 'analytics_posting_frequency_impact': {
        const platform = (input.platform as string) || 'instagram';
        const niche = input.niche as string as NicheCategory;
        const currentFreq = typeof input.current_posts_per_week === 'number' ? input.current_posts_per_week : 3;
        const stage = (input.account_stage as string) || 'growing';

        const benchmark = NICHE_BENCHMARKS[niche] ?? NICHE_BENCHMARKS['personal-brand'];
        const optimalFreq = benchmark?.optimalPostsPerWeek ?? 5;

        const freqImpact = [
          {
            posts_per_week: 1,
            engagement_multiplier: 1.4,
            reach_multiplier: 0.6,
            note: 'Too sparse — algorithm deprioritizes inactive accounts',
          },
          {
            posts_per_week: 3,
            engagement_multiplier: 1.2,
            reach_multiplier: 0.85,
            note: 'Below optimal — lower algorithm distribution',
          },
          {
            posts_per_week: optimalFreq,
            engagement_multiplier: 1.0,
            reach_multiplier: 1.0,
            note: `Optimal for ${niche} on ${platform}`,
          },
          {
            posts_per_week: optimalFreq + 2,
            engagement_multiplier: 0.85,
            reach_multiplier: 1.1,
            note: 'Slight engagement dilution but more total reach',
          },
          {
            posts_per_week: 14,
            engagement_multiplier: 0.65,
            reach_multiplier: 1.15,
            note: 'Over-posting — significant engagement dilution',
          },
        ];

        const currentImpact = freqImpact.find((f) => Math.abs(f.posts_per_week - currentFreq) <= 1) ?? freqImpact[2]!;

        return JSON.stringify({
          ok: true,
          platform,
          niche,
          current_posts_per_week: currentFreq,
          optimal_posts_per_week: optimalFreq,
          current_status:
            currentFreq < optimalFreq ? 'under-posting' : currentFreq > optimalFreq + 3 ? 'over-posting' : 'optimal',
          frequency_impact_table: freqImpact,
          current_frequency_note: currentImpact.note,
          recommendation:
            currentFreq < optimalFreq
              ? `Increase to ${optimalFreq} posts/week for ${niche} — est. ${((1 - currentImpact.engagement_multiplier / 1.0) * 100).toFixed(0)}% engagement gain`
              : `Current frequency good for ${stage} stage`,
          content_distribution: {
            reels: `${Math.round(optimalFreq * 0.5)}/week (highest discovery)`,
            carousels: `${Math.round(optimalFreq * 0.3)}/week (saves & authority)`,
            stories: 'Daily (relationship maintenance)',
            feed: `${Math.round(optimalFreq * 0.2)}/week (brand presence)`,
          },
        });
      }

      case 'analytics_funnel_tracking': {
        const niche = input.niche as string as NicheCategory;
        const monetization = (input.monetization_model as MonetizationModel) || 'coaching';
        const reach = typeof input.monthly_reach === 'number' ? input.monthly_reach : 50000;
        const profileVisitRate = typeof input.profile_visit_rate === 'number' ? input.profile_visit_rate : 5;
        const followRate = typeof input.follow_rate === 'number' ? input.follow_rate : 15;
        const linkClickRate = typeof input.link_click_rate === 'number' ? input.link_click_rate : 2;
        const conversionRate = typeof input.conversion_rate === 'number' ? input.conversion_rate : 3;
        const aov = typeof input.avg_order_value === 'number' ? input.avg_order_value : 97;

        const profileVisits = Math.round((reach * profileVisitRate) / 100);
        const newFollowers = Math.round((profileVisits * followRate) / 100);
        const linkClicks = Math.round((newFollowers * linkClickRate) / 100);
        const conversions = Math.round((linkClicks * conversionRate) / 100);
        const revenue = conversions * aov;

        const funnelRevProfile = revenueOptimizationAgent.buildRevenueProfile(
          buildMinimalIntelligence('funnel', 'instagram', niche, monetization, 1000),
        );

        const bottleneck = [
          { stage: 'reach→profile_visit', rate: profileVisitRate, benchmark: 6, value: profileVisits },
          { stage: 'profile_visit→follow', rate: followRate, benchmark: 20, value: newFollowers },
          { stage: 'follow→link_click', rate: linkClickRate, benchmark: 3, value: linkClicks },
          { stage: 'link_click→sale', rate: conversionRate, benchmark: 5, value: conversions },
        ].find((s) => s.rate < s.benchmark);

        return JSON.stringify({
          ok: true,
          funnel_metrics: {
            monthly_reach: reach,
            profile_visits: profileVisits,
            new_followers: newFollowers,
            link_clicks: linkClicks,
            conversions,
            monthly_revenue_estimate: `$${revenue}`,
          },
          funnel_stages: funnelRevProfile.conversionFunnelMap.map((s) => ({
            stage: s.stage,
            metric: s.metric,
            optimization_tip: s.fix,
          })),
          bottleneck_stage: bottleneck
            ? {
                stage: bottleneck.stage,
                your_rate: `${bottleneck.rate}%`,
                benchmark: `${bottleneck.benchmark}%`,
                revenue_impact: `+$${Math.round(revenue * 0.3)}/mo if fixed`,
              }
            : null,
          revenue_projection_if_optimized: `$${Math.round(revenue * 1.4)}/mo (+40% from fixing bottleneck)`,
        });
      }

      case 'analytics_content_prediction': {
        const platform = (input.platform as string) || 'instagram';
        const niche = input.niche as string as NicheCategory;
        const format = (input.format as string) || 'reel';
        const hasHook = (input.has_hook as boolean) ?? false;
        const hasCta = (input.has_cta as boolean) ?? false;
        const isTrending = (input.is_trending_topic as boolean) ?? false;
        const usesTrendingAudio = (input.uses_trending_audio as boolean) ?? false;
        const postingHour = typeof input.posting_hour === 'number' ? input.posting_hour : 12;
        const postingDay = typeof input.posting_day === 'number' ? input.posting_day : 3;
        const followers = typeof input.followers === 'number' ? input.followers : 1000;

        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const plan = contentAlgorithmAgent.optimizeContent(platform as 'instagram' | 'tiktok', niche, {
          type: format,
          hookText: hasHook ? 'Hook text present' : undefined,
          hasCta,
        });

        const timingScore = contentAlgorithmAgent.getPostingWindowScore(
          platform as 'instagram' | 'tiktok',
          dayNames[postingDay] ?? 'Wed',
          postingHour,
        );

        const bonuses =
          (isTrending ? 15 : 0) +
          (usesTrendingAudio && platform === 'tiktok' ? 20 : 0) +
          (usesTrendingAudio && platform === 'instagram' ? 10 : 0);
        const finalScore = Math.min(100, plan.score + bonuses);

        const engagementBase = finalScore / 10;
        const reachMultiplier = format === 'reel' || format === 'tiktok-video' ? 5 : format === 'carousel' ? 2.5 : 1.2;

        return JSON.stringify({
          ok: true,
          predicted_performance_score: finalScore,
          performance_grade: finalScore >= 80 ? 'A' : finalScore >= 65 ? 'B' : finalScore >= 50 ? 'C' : 'D',
          estimated_engagement_rate: `${(engagementBase * 0.8).toFixed(1)}-${(engagementBase * 1.4).toFixed(1)}%`,
          estimated_reach: `${Math.round(followers * reachMultiplier * 0.7).toLocaleString()}–${Math.round(followers * reachMultiplier * 1.5).toLocaleString()}`,
          viral_probability: finalScore >= 80 ? '15-25%' : finalScore >= 65 ? '5-10%' : '1-3%',
          timing_score: timingScore,
          optimizations: plan.optimizations.slice(0, 3).map((o) => ({
            action: o.recommended,
            expected_lift: o.reason,
          })),
          score_breakdown: {
            base_score: plan.score,
            trending_bonus: isTrending ? '+15' : '0',
            audio_bonus: usesTrendingAudio ? `+${platform === 'tiktok' ? 20 : 10}` : '0',
            final_score: finalScore,
          },
        });
      }

      case 'analytics_niche_benchmarks': {
        const niche = (input.niche as string) || 'personal-brand';
        const platform = (input.platform as string) || 'instagram';
        const stage = (input.account_stage as string) || 'growing';

        const benchmark = NICHE_BENCHMARKS[niche] ?? NICHE_BENCHMARKS['personal-brand'];
        const algProfile = contentAlgorithmAgent.getAlgorithmProfile(
          (platform === 'both' ? 'instagram' : platform) as 'instagram' | 'tiktok',
          niche as NicheCategory,
        );

        return JSON.stringify({
          ok: true,
          niche,
          platform,
          account_stage: stage,
          benchmarks: benchmark ?? {
            avgEngagementRate: 3.5,
            viralThreshold: 7.0,
            optimalPostsPerWeek: 5,
            topFormat: 'reel',
            avgFollowerGrowthRateMonthly: 6,
            revenuePerFollowerUsd: 0.1,
            bestPostingDays: ['Monday', 'Wednesday', 'Friday'],
            bestPostingHours: [9, 12, 18],
          },
          algorithm_signals: algProfile.rankingFactors.map((f) => ({
            signal: f.factor,
            weight: `${(f.weight * 100).toFixed(0)}%`,
            optimization: f.optimization,
          })),
          stage_targets:
            {
              starter: {
                followers: '0-1K',
                engagement: `>${(benchmark?.avgEngagementRate ?? 3.5) * 1.5}%`,
                posts_week: Math.max(3, (benchmark?.optimalPostsPerWeek ?? 5) - 1),
              },
              growing: {
                followers: '1K-10K',
                engagement: `>${benchmark?.avgEngagementRate ?? 3.5}%`,
                posts_week: benchmark?.optimalPostsPerWeek ?? 5,
              },
              established: {
                followers: '10K-100K',
                engagement: `>${(benchmark?.avgEngagementRate ?? 3.5) * 0.8}%`,
                posts_week: (benchmark?.optimalPostsPerWeek ?? 5) + 1,
              },
              dominant: {
                followers: '100K+',
                engagement: `>${(benchmark?.avgEngagementRate ?? 3.5) * 0.6}%`,
                posts_week: (benchmark?.optimalPostsPerWeek ?? 5) + 2,
              },
            }[stage] ?? {},
          revenue_benchmark: `$${Math.round((benchmark?.revenuePerFollowerUsd ?? 0.1) * 1000)}/1K followers/mo for ${niche}`,
        });
      }

      default:
        return JSON.stringify({ ok: false, error: `Unknown analytics tool: ${toolName}` });
    }
  } catch (error) {
    return JSON.stringify({
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
};
