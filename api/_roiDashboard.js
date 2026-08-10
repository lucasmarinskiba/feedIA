/**
 * ROI Dashboard — agregación de métricas de revenue + crisis + performance.
 *
 * Endpoint: GET /api/roi/dashboard
 * Devuelve: overview de salud empresarial (ROI, crisis state, top performers, trends)
 */

import { getProfile } from './_accountMemory.js';
import { getMentionStats } from './_mentionTracker.js';
import { shouldCircuitBreak } from './_crisisAgent.js';

// ── Aggregación de datos ──────────────────────────────────────────────────────

export const getRoiDashboard = async (scope, accountId) => {
  const profile = await getProfile(scope, accountId).catch(() => ({}));
  const attributionStore = profile.attributionStore || { publications: [], conversions: [] };
  const fanStore = profile.fanStore || { fans: [], vipTiers: {} };
  const mentionStats = await getMentionStats(scope, accountId).catch(() => ({}));
  const crisisActive = await shouldCircuitBreak(scope, accountId);

  // ─ 1) Revenue metrics
  const publications = attributionStore.publications || [];
  const conversions = attributionStore.conversions || [];
  const refunded = conversions.filter((c) => c.refunded);

  const totalSpent = publications.reduce((sum, p) => sum + (p.costLLM || 0), 0);
  const totalRevenue = conversions.reduce((sum, c) => sum + (c.refunded ? 0 : c.value || 0), 0);
  const totalRefunds = refunded.reduce((sum, c) => sum + (c.refundAmount || 0), 0);
  const netRevenue = totalRevenue - totalRefunds;
  const roi = totalSpent > 0 ? ((netRevenue - totalSpent) / totalSpent) * 100 : 0;
  const conversionRate = publications.length > 0 ? (conversions.length / publications.length) * 100 : 0;
  const avgCostPerPost = publications.length > 0 ? totalSpent / publications.length : 0;
  const avgRevenuePerConversion = conversions.length > 0 ? netRevenue / conversions.length : 0;

  // ─ 2) Performance by format
  const byFormat = {};
  for (const pub of publications) {
    if (!byFormat[pub.format]) {
      byFormat[pub.format] = { publications: 0, conversions: 0, revenue: 0, cost: 0 };
    }
    byFormat[pub.format].publications++;
    byFormat[pub.format].cost += pub.costLLM || 0;
  }

  for (const conv of conversions) {
    const pub = publications.find((p) => p.id === conv.postId);
    if (pub && byFormat[pub.format]) {
      byFormat[pub.format].conversions++;
      byFormat[pub.format].revenue += conv.refunded ? 0 : conv.value || 0;
    }
  }

  const formatMetrics = Object.entries(byFormat).map(([format, data]) => ({
    format,
    ...data,
    roi: data.cost > 0 ? ((data.revenue - data.cost) / data.cost) * 100 : 0,
    conversionRate: data.publications > 0 ? (data.conversions / data.publications) * 100 : 0,
  }));

  // ─ 3) Performance by topic
  const byTopic = {};
  for (const pub of publications) {
    if (!byTopic[pub.topic]) {
      byTopic[pub.topic] = { publications: 0, conversions: 0, revenue: 0, cost: 0 };
    }
    byTopic[pub.topic].publications++;
    byTopic[pub.topic].cost += pub.costLLM || 0;
  }

  for (const conv of conversions) {
    const pub = publications.find((p) => p.id === conv.postId);
    if (pub && byTopic[pub.topic]) {
      byTopic[pub.topic].conversions++;
      byTopic[pub.topic].revenue += conv.refunded ? 0 : conv.value || 0;
    }
  }

  const topicMetrics = Object.entries(byTopic)
    .map(([topic, data]) => ({
      topic,
      ...data,
      roi: data.cost > 0 ? ((data.revenue - data.cost) / data.cost) * 100 : 0,
      conversionRate: data.publications > 0 ? (data.conversions / data.publications) * 100 : 0,
    }))
    .sort((a, b) => b.revenue - a.revenue);

  // ─ 4) Top performers (publications que generaron más ROI)
  const topPerformers = publications
    .map((pub) => {
      const pubConversions = conversions.filter((c) => c.postId === pub.id && !c.refunded);
      const revenue = pubConversions.reduce((sum, c) => sum + (c.value || 0), 0);
      const roi = pub.costLLM > 0 ? ((revenue - pub.costLLM) / pub.costLLM) * 100 : 0;
      return {
        id: pub.id,
        topic: pub.topic,
        format: pub.format,
        viralScore: pub.viralScore,
        cost: pub.costLLM,
        revenue,
        conversions: pubConversions.length,
        roi,
      };
    })
    .sort((a, b) => b.roi - a.roi)
    .slice(0, 5);

  // ─ 5) VIP distribution
  const vipDistribution = {
    bronze: fanStore.fans?.filter((f) => f.tier === 'bronze').length || 0,
    silver: fanStore.fans?.filter((f) => f.tier === 'silver').length || 0,
    gold: fanStore.fans?.filter((f) => f.tier === 'gold').length || 0,
    platinum: fanStore.fans?.filter((f) => f.tier === 'platinum').length || 0,
    total: fanStore.fans?.length || 0,
  };

  // ─ 6) Health indicators
  const health = {
    roiHealthy: roi > 50, // >50% ROI
    conversionHealthy: conversionRate > 5, // >5% conversion
    crisisActive,
    mentionSentiment: {
      positive: mentionStats.sentiment?.positive || 0,
      negative: mentionStats.sentiment?.negative || 0,
      critical: mentionStats.sentiment?.critical || 0,
    },
    unfollowChurn: fanStore.fans?.filter((f) => f.status === 'churned').length || 0,
  };

  // ─ 7) Recomendaciones automáticas
  const recommendations = [];
  if (roi < 20) recommendations.push('📉 ROI bajo (<20%): revisar costeo de publicaciones o aumentar conversiones');
  if (conversionRate < 2)
    recommendations.push('⚠️ Conversion rate muy baja (<2%): revisar target audience o copy de publicaciones');
  if (crisisActive) recommendations.push('🚨 CRISIS ACTIVA: auto-publish pausado, priorizar respuesta');
  if (health.mentionSentiment.critical > 0) recommendations.push('💬 Menciones críticas detectadas: revisar mentions');
  if (health.unfollowChurn > 5)
    recommendations.push('👋 Churn alto: activar re-engagement campaigns para fans churned');

  if (topicMetrics[0]) {
    recommendations.push(`💡 Topic "${topicMetrics[0].topic}" lidera ROI: escalar contenido en ese nicho (+30%)`);
  }

  return {
    timestamp: new Date().toISOString(),
    overview: {
      totalSpent,
      totalRevenue,
      netRevenue,
      roi: Math.round(roi * 10) / 10,
      conversionRate: Math.round(conversionRate * 10) / 10,
      avgCostPerPost: Math.round(avgCostPerPost * 100) / 100,
      avgRevenuePerConversion: Math.round(avgRevenuePerConversion * 100) / 100,
      totalPublications: publications.length,
      totalConversions: conversions.length,
      totalRefunds,
    },
    byFormat: formatMetrics,
    byTopic: topicMetrics,
    topPerformers,
    vipDistribution,
    health,
    recommendations,
  };
};

// ── HTTP handler ──────────────────────────────────────────────────────────────

export const handleRoiDashboard = async (req, res, path, m, body, ctx = {}) => {
  const json = (code, obj) => {
    res.statusCode = code;
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify(obj));
    return true;
  };

  const scope = ctx.userId || 'anon';

  // GET /api/roi/dashboard
  if (path === '/api/roi/dashboard' && m === 'GET') {
    const accountId = req.query?.accountId || scope;
    const dashboard = await getRoiDashboard(scope, accountId).catch(() => null);
    return json(dashboard ? 200 : 500, dashboard || { ok: false, error: 'dashboard-failed' });
  }

  return false;
};
