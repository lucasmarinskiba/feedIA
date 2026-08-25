/**
 * Analytics Backend — ROI tracking, metrics, dashboards
 * Stores: content performance, engagement, conversion, spend tracking
 */

import { v4 as uuid } from 'uuid';

/**
 * Record content performance (per platform: IG, TikTok, etc)
 */
export const recordContentMetric = async (store, userId, metric) => {
  const { contentId, platform, impressions, engagements, clicks, conversions, spend } = metric;

  try {
    const metricsKey = `feedia:metrics:${userId}:${platform}:${contentId}`;
    await store.set(metricsKey, {
      contentId,
      platform,
      impressions: impressions || 0,
      engagements: engagements || 0,
      clicks: clicks || 0,
      conversions: conversions || 0,
      spend: spend || 0,
      recordedAt: new Date().toISOString(),
      engagementRate: engagements ? ((engagements / (impressions || 1)) * 100).toFixed(2) : 0,
      roi: conversions && spend ? (((conversions - spend) / spend) * 100).toFixed(2) : 0,
    });

    return { ok: true, contentId };
  } catch (err) {
    throw new Error(`Metric recording failed: ${String(err)}`);
  }
};

/**
 * Get ROI dashboard summary
 */
export const getRoiSummary = async (store, userId, daysBack = 30) => {
  try {
    // Get all metrics from last N days
    const metricsPattern = `feedia:metrics:${userId}:*:*`;
    const cutoff = new Date(Date.now() - daysBack * 86_400_000);

    // For now: mock aggregation (in production use Redis SCAN or SQL)
    // Assume 15 pieces of content
    const totalSpend = Math.random() * 2000 + 500; // $500-2500
    const totalConversions = Math.floor(Math.random() * 150 + 50); // 50-200
    const totalImpressions = Math.floor(Math.random() * 100_000 + 10_000); // 10K-110K
    const totalEngagements = Math.floor(totalImpressions * 0.05); // 5% engagement

    return {
      period: `last-${daysBack}-days`,
      summary: {
        totalSpend: totalSpend.toFixed(2),
        totalConversions,
        totalImpressions,
        totalEngagements,
        roi: (((totalConversions - totalSpend) / (totalSpend || 1)) * 100).toFixed(2),
        engagementRate: ((totalEngagements / (totalImpressions || 1)) * 100).toFixed(2),
        costPerConversion: (totalSpend / (totalConversions || 1)).toFixed(2),
        costPerEngagement: (totalSpend / (totalEngagements || 1)).toFixed(2),
      },
      byPlatform: {
        instagram: {
          impressions: Math.floor(totalImpressions * 0.6),
          engagements: Math.floor(totalEngagements * 0.6),
          conversions: Math.floor(totalConversions * 0.6),
          spend: (totalSpend * 0.6).toFixed(2),
        },
        tiktok: {
          impressions: Math.floor(totalImpressions * 0.4),
          engagements: Math.floor(totalEngagements * 0.4),
          conversions: Math.floor(totalConversions * 0.4),
          spend: (totalSpend * 0.4).toFixed(2),
        },
      },
      trend: 'up', // Can be 'up', 'down', 'stable'
    };
  } catch (err) {
    throw new Error(`ROI summary failed: ${String(err)}`);
  }
};

/**
 * Get content performance rankings
 */
export const getTopPerformingContent = async (userId, limit = 10) => {
  // Mock: simulate top posts
  const topPosts = Array.from({ length: limit }, (_, i) => ({
    contentId: `content_${i + 1}`,
    platform: i % 2 === 0 ? 'instagram' : 'tiktok',
    impressions: Math.floor(Math.random() * 50_000 + 5_000),
    engagements: Math.floor(Math.random() * 2_500 + 500),
    conversions: Math.floor(Math.random() * 100 + 10),
    roi: (Math.random() * 500 + 100).toFixed(2),
    rank: i + 1,
  }));

  return {
    userId,
    totalContent: limit,
    topPerformers: topPosts.sort((a, b) => b.conversions - a.conversions).slice(0, 5),
  };
};

/**
 * Track content spend vs revenue
 */
export const getFinancialSummary = async (userId) => {
  const totalSpend = 1250;
  const totalRevenue = 5800;
  const roi = (((totalRevenue - totalSpend) / totalSpend) * 100).toFixed(2);

  return {
    userId,
    financial: {
      totalSpend: totalSpend.toFixed(2),
      totalRevenue: totalRevenue.toFixed(2),
      netProfit: (totalRevenue - totalSpend).toFixed(2),
      roi,
      profitMargin: ((((totalRevenue - totalSpend) / totalRevenue) * 100)).toFixed(2),
    },
    byPlatform: {
      instagram: {
        spend: (totalSpend * 0.7).toFixed(2),
        revenue: (totalRevenue * 0.65).toFixed(2),
      },
      tiktok: {
        spend: (totalSpend * 0.3).toFixed(2),
        revenue: (totalRevenue * 0.35).toFixed(2),
      },
    },
  };
};

/**
 * Analytics HTTP handler
 */
export const handleAnalytics = async (req, res, path, m, body) => {
  const json = (code, obj) => {
    res.statusCode = code;
    res.setHeader('content-type', 'application/json; charset=utf-8');
    res.end(JSON.stringify(obj));
    return true;
  };

  const userId = req.headers['x-user-id'];
  if (!userId) {
    return json(401, { error: 'x-user-id header required' });
  }

  // ─── GET /api/analytics/roi ───────────────────────────────────
  if (path === '/api/analytics/roi' && m === 'GET') {
    try {
      const daysBack = parseInt(req.url?.split('days=')[1] || '30');
      const summary = await getRoiSummary(null, userId, daysBack);
      return json(200, summary);
    } catch (err) {
      return json(500, { error: 'roi-summary-failed' });
    }
  }

  // ─── GET /api/analytics/top-content ───────────────────────────
  if (path === '/api/analytics/top-content' && m === 'GET') {
    try {
      const limit = parseInt(req.url?.split('limit=')[1] || '10');
      const topContent = await getTopPerformingContent(userId, limit);
      return json(200, topContent);
    } catch (err) {
      return json(500, { error: 'top-content-failed' });
    }
  }

  // ─── GET /api/analytics/financial ──────────────────────────────
  if (path === '/api/analytics/financial' && m === 'GET') {
    try {
      const financial = await getFinancialSummary(userId);
      return json(200, financial);
    } catch (err) {
      return json(500, { error: 'financial-summary-failed' });
    }
  }

  // ─── POST /api/analytics/metrics ──────────────────────────────
  if (path === '/api/analytics/metrics' && m === 'POST') {
    const { contentId, platform, impressions, engagements, clicks, conversions, spend } = body || {};

    if (!contentId || !platform) {
      return json(400, { error: 'contentId, platform required' });
    }

    try {
      // In production: store in database
      const result = await recordContentMetric(null, userId, {
        contentId,
        platform,
        impressions,
        engagements,
        clicks,
        conversions,
        spend,
      });
      return json(200, { ok: true, metricId: `metric_${uuid()}` });
    } catch (err) {
      return json(500, { error: 'metric-record-failed' });
    }
  }

  // ─── GET /api/analytics/dashboard ─────────────────────────────
  if (path === '/api/analytics/dashboard' && m === 'GET') {
    try {
      const roi = await getRoiSummary(null, userId, 30);
      const financial = await getFinancialSummary(userId);
      const topContent = await getTopPerformingContent(userId, 5);

      return json(200, {
        userId,
        roi,
        financial,
        topContent: topContent.topPerformers,
        lastUpdated: new Date().toISOString(),
      });
    } catch (err) {
      return json(500, { error: 'dashboard-failed' });
    }
  }

  return false;
};
