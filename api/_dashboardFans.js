/**
 * Fan VIP Dashboard — tiers, spend trends, churn tracking.
 *
 * GET /api/dashboard/fans — visual breakdown by VIP tier
 */

import { getProfile } from './_accountMemory.js';

export const getFansDashboard = async (scope, accountId) => {
  const profile = await getProfile(scope, accountId).catch(() => ({}));
  const fanStore = profile.fanStore || { fans: [] };
  const fans = fanStore.fans || [];

  // ─ Breakdown by tier
  const tierStats = {
    bronze: { count: 0, totalSpend: 0, avgEngagement: 0, churnCount: 0 },
    silver: { count: 0, totalSpend: 0, avgEngagement: 0, churnCount: 0 },
    gold: { count: 0, totalSpend: 0, avgEngagement: 0, churnCount: 0 },
    platinum: { count: 0, totalSpend: 0, avgEngagement: 0, churnCount: 0 },
  };

  const engagementScores = {};

  for (const fan of fans) {
    const tier = fan.tier || 'bronze';
    if (tierStats[tier]) {
      tierStats[tier].count++;
      tierStats[tier].totalSpend += fan.totalSpent || 0;
      tierStats[tier].churnCount += fan.status === 'churned' ? 1 : 0;

      if (!engagementScores[tier]) engagementScores[tier] = [];
      engagementScores[tier].push(fan.engagementScore || 0);
    }
  }

  // Calculate averages
  for (const tier of Object.keys(tierStats)) {
    if (engagementScores[tier]?.length > 0) {
      tierStats[tier].avgEngagement = engagementScores[tier].reduce((a, b) => a + b, 0) / engagementScores[tier].length;
    }
  }

  // ─ Churn & retention
  const active = fans.filter((f) => f.status !== 'churned');
  const churned = fans.filter((f) => f.status === 'churned');
  const retentionRate = fans.length > 0 ? ((active.length / fans.length) * 100).toFixed(1) : 0;

  // Inactive 30+ days
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const inactive30 = fans.filter(
    (f) => f.status !== 'churned' && new Date(f.lastEngagement || f.createdAt).getTime() < thirtyDaysAgo,
  );

  // ─ Top spenders
  const topSpenders = fans
    .filter((f) => f.status !== 'churned')
    .sort((a, b) => (b.totalSpent || 0) - (a.totalSpent || 0))
    .slice(0, 10)
    .map((f) => ({
      email: f.email,
      tier: f.tier,
      spent: f.totalSpent || 0,
      purchases: f.purchaseCount || 0,
      engagement: f.engagementScore || 0,
    }));

  // ─ Churn reasons breakdown
  const churnReasons = {};
  for (const fan of churned) {
    const reason = fan.churnReason || 'unknown';
    churnReasons[reason] = (churnReasons[reason] || 0) + 1;
  }

  return {
    timestamp: new Date().toISOString(),
    overview: {
      totalFans: fans.length,
      activeFans: active.length,
      churned: churned.length,
      retentionRate: `${retentionRate}%`,
      totalSpend: fans.reduce((sum, f) => sum + (f.totalSpent || 0), 0),
      avgSpendPerFan:
        fans.length > 0 ? (fans.reduce((sum, f) => sum + (f.totalSpent || 0), 0) / fans.length).toFixed(2) : 0,
    },
    tiers: tierStats,
    churnAnalysis: {
      inactive30Count: inactive30.length,
      recentChurned: churned
        .sort((a, b) => new Date(b.churnedAt || 0).getTime() - new Date(a.churnedAt || 0).getTime())
        .slice(0, 5)
        .map((f) => ({ email: f.email, tier: f.tier, reason: f.churnReason })),
      reasons: churnReasons,
    },
    topSpenders,
    alerts: [
      inactive30.length > 10 && `⚠️ ${inactive30.length} fans inactive 30+ days`,
      churned.length > fans.length * 0.1 && `🚨 Churn rate >10% (${churned.length}/${fans.length})`,
      tierStats.platinum.count === 0 && '💎 No Platinum fans yet',
    ].filter(Boolean),
  };
};

export const handleFansDashboard = async (req, res, path, m, body, ctx = {}) => {
  const json = (code, obj) => {
    res.statusCode = code;
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify(obj));
    return true;
  };

  const scope = ctx.userId || 'anon';

  if (path === '/api/dashboard/fans' && m === 'GET') {
    const accountId = req.query?.accountId || scope;
    const dashboard = await getFansDashboard(scope, accountId).catch(() => null);
    return json(dashboard ? 200 : 500, dashboard || { ok: false });
  }

  return false;
};
