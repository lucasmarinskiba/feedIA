/**
 * Content ROI Explorer — drill-down: format → topic → date.
 *
 * GET /api/dashboard/roi/explorer?dimension=format|topic|date
 * GET /api/dashboard/roi/timeline — ROI trend over time
 */

import { getProfile } from './_accountMemory.js';

export const getRoiExplorer = async (scope, accountId, dimension = 'format') => {
  const profile = await getProfile(scope, accountId).catch(() => ({}));
  const attributionStore = profile.attributionStore || { publications: [], conversions: [] };
  const publications = attributionStore.publications || [];
  const conversions = attributionStore.conversions || [];

  // Group by dimension
  const grouped = {};

  for (const pub of publications) {
    const key = dimension === 'format' ? pub.format : dimension === 'topic' ? pub.topic : pub.createdAt?.split('T')[0];

    if (!grouped[key]) {
      grouped[key] = { pubs: [], convs: 0, revenue: 0, cost: 0 };
    }
    grouped[key].pubs.push(pub);
    grouped[key].cost += pub.costLLM || 0;
  }

  for (const conv of conversions) {
    if (conv.refunded) continue;
    const pub = publications.find((p) => p.id === conv.postId);
    if (!pub) continue;

    const key = dimension === 'format' ? pub.format : dimension === 'topic' ? pub.topic : pub.createdAt?.split('T')[0];
    if (grouped[key]) {
      grouped[key].convs++;
      grouped[key].revenue += conv.value || 0;
    }
  }

  const data = Object.entries(grouped)
    .map(([name, data]) => {
      const roi = data.cost > 0 ? ((data.revenue - data.cost) / data.cost) * 100 : 0;
      const convRate = data.pubs.length > 0 ? (data.convs / data.pubs.length) * 100 : 0;
      return {
        name,
        publications: data.pubs.length,
        conversions: data.convs,
        cost: Math.round(data.cost * 100) / 100,
        revenue: Math.round(data.revenue * 100) / 100,
        roi: Math.round(roi * 10) / 10,
        conversionRate: Math.round(convRate * 10) / 10,
        avgCostPerPub: Math.round((data.cost / Math.max(1, data.pubs.length)) * 100) / 100,
      };
    })
    .sort((a, b) => b.roi - a.roi);

  return {
    dimension,
    data,
    summary: {
      topPerformer: data[0]?.name || null,
      bottomPerformer: data[data.length - 1]?.name || null,
      totalPubs: publications.length,
      totalConversions: conversions.filter((c) => !c.refunded).length,
    },
  };
};

export const getRoiTimeline = async (scope, accountId) => {
  const profile = await getProfile(scope, accountId).catch(() => ({}));
  const attributionStore = profile.attributionStore || { publications: [], conversions: [] };
  const publications = attributionStore.publications || [];
  const conversions = attributionStore.conversions || [];

  // Group by date
  const byDate = {};

  for (const pub of publications) {
    const date = pub.createdAt?.split('T')[0] || 'unknown';
    if (!byDate[date]) byDate[date] = { pubs: 0, convs: 0, revenue: 0, cost: 0 };
    byDate[date].pubs++;
    byDate[date].cost += pub.costLLM || 0;
  }

  for (const conv of conversions) {
    if (conv.refunded) continue;
    const pub = publications.find((p) => p.id === conv.postId);
    if (!pub) continue;
    const date = pub.createdAt?.split('T')[0] || 'unknown';
    if (byDate[date]) {
      byDate[date].convs++;
      byDate[date].revenue += conv.value || 0;
    }
  }

  // Compute cumulative ROI
  let cumulativeCost = 0;
  let cumulativeRevenue = 0;
  const timeline = Object.entries(byDate)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, data]) => {
      cumulativeCost += data.cost;
      cumulativeRevenue += data.revenue;
      const dailyRoi = data.cost > 0 ? ((data.revenue - data.cost) / data.cost) * 100 : 0;
      const cumulativeRoi = cumulativeCost > 0 ? ((cumulativeRevenue - cumulativeCost) / cumulativeCost) * 100 : 0;
      return {
        date,
        publications: data.pubs,
        conversions: data.convs,
        dailySpend: Math.round(data.cost * 100) / 100,
        dailyRevenue: Math.round(data.revenue * 100) / 100,
        dailyRoi: Math.round(dailyRoi * 10) / 10,
        cumulativeSpend: Math.round(cumulativeCost * 100) / 100,
        cumulativeRevenue: Math.round(cumulativeRevenue * 100) / 100,
        cumulativeRoi: Math.round(cumulativeRoi * 10) / 10,
      };
    });

  return {
    timeline,
    trend:
      timeline.length > 0 ? (timeline[timeline.length - 1].cumulativeRoi - timeline[0].cumulativeRoi).toFixed(1) : 0,
  };
};

export const handleRoiDashboards = async (req, res, path, m, body, ctx = {}) => {
  const json = (code, obj) => {
    res.statusCode = code;
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify(obj));
    return true;
  };

  const scope = ctx.userId || 'anon';

  if (path === '/api/dashboard/roi/explorer' && m === 'GET') {
    const accountId = req.query?.accountId || scope;
    const dimension = req.query?.dimension || 'format';
    const explorer = await getRoiExplorer(scope, accountId, dimension).catch(() => null);
    return json(explorer ? 200 : 500, explorer || { ok: false });
  }

  if (path === '/api/dashboard/roi/timeline' && m === 'GET') {
    const accountId = req.query?.accountId || scope;
    const timeline = await getRoiTimeline(scope, accountId).catch(() => null);
    return json(timeline ? 200 : 500, timeline || { ok: false });
  }

  return false;
};
