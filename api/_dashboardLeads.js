/**
 * Lead Pipeline Dashboard — hot/warm/cold workflow visualization.
 *
 * GET /api/dashboard/leads — kanban view of lead funnel
 */

import { getProfile } from './_accountMemory.js';

export const getLeadsPipeline = async (scope, accountId) => {
  const profile = await getProfile(scope, accountId).catch(() => ({}));
  const leadStore = profile.leadStore || { leads: [] };
  const leads = leadStore.leads || [];

  // Breakdown by tier + workflow stage
  const stages = {
    new: { hot: [], warm: [], cold: [] },
    contacted: { hot: [], warm: [], cold: [] },
    qualified: { hot: [], warm: [], cold: [] },
    converted: { hot: [], warm: [], cold: [] },
  };

  for (const lead of leads) {
    const tier = lead.tier || 'cold';
    const stage = lead.workflow || 'new';
    if (stages[stage] && stages[stage][tier]) {
      stages[stage][tier].push({
        id: lead.id,
        email: lead.email,
        score: lead.score || 0,
        signals: lead.signals || [],
        createdAt: lead.createdAt,
        updatedAt: lead.lastUpdated,
        conversions: lead.conversions || 0,
        value: lead.value || 0,
      });
    }
  }

  // Conversion funnel stats
  const funnelStats = {
    new: leads.filter((l) => l.workflow === 'new' || !l.workflow).length,
    contacted: leads.filter((l) => l.workflow === 'contacted').length,
    qualified: leads.filter((l) => l.workflow === 'qualified').length,
    converted: leads.filter((l) => l.workflow === 'converted').length,
  };

  // Conversion rates
  const conversionRates = {
    newToContacted: funnelStats.new > 0 ? ((funnelStats.contacted / funnelStats.new) * 100).toFixed(1) : 0,
    contactedToQualified:
      funnelStats.contacted > 0 ? ((funnelStats.qualified / funnelStats.contacted) * 100).toFixed(1) : 0,
    qualifiedToConverted:
      funnelStats.qualified > 0 ? ((funnelStats.converted / funnelStats.qualified) * 100).toFixed(1) : 0,
    totalConversion: funnelStats.new > 0 ? ((funnelStats.converted / funnelStats.new) * 100).toFixed(1) : 0,
  };

  // Score distribution
  const scoreDistribution = {
    hot: { count: leads.filter((l) => l.tier === 'hot').length, avgScore: 0, totalValue: 0 },
    warm: { count: leads.filter((l) => l.tier === 'warm').length, avgScore: 0, totalValue: 0 },
    cold: { count: leads.filter((l) => l.tier === 'cold').length, avgScore: 0, totalValue: 0 },
  };

  for (const tier of ['hot', 'warm', 'cold']) {
    const tieredLeads = leads.filter((l) => l.tier === tier);
    if (tieredLeads.length > 0) {
      scoreDistribution[tier].avgScore = (
        tieredLeads.reduce((sum, l) => sum + (l.score || 0), 0) / tieredLeads.length
      ).toFixed(1);
      scoreDistribution[tier].totalValue = tieredLeads.reduce((sum, l) => sum + (l.value || 0), 0);
    }
  }

  // Signals detected
  const signalFrequency = {};
  for (const lead of leads) {
    for (const signal of lead.signals || []) {
      signalFrequency[signal] = (signalFrequency[signal] || 0) + 1;
    }
  }

  // Recently converted
  const recentConversions = leads
    .filter((l) => l.workflow === 'converted')
    .sort((a, b) => new Date(b.convertedAt || 0).getTime() - new Date(a.convertedAt || 0).getTime())
    .slice(0, 5)
    .map((l) => ({
      email: l.email,
      score: l.score,
      value: l.value,
      convertedAt: l.convertedAt,
    }));

  // Stalled leads (no update 7+ days)
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const stalledLeads = leads
    .filter(
      (l) => l.workflow !== 'converted' && (l.lastUpdated ? new Date(l.lastUpdated).getTime() < sevenDaysAgo : true),
    )
    .map((l) => ({
      email: l.email,
      tier: l.tier,
      daysStalled: Math.floor((Date.now() - new Date(l.lastUpdated || l.createdAt).getTime()) / (24 * 60 * 60 * 1000)),
    }));

  return {
    timestamp: new Date().toISOString(),
    pipeline: stages,
    funnel: {
      stats: funnelStats,
      conversionRates,
    },
    scoreDistribution,
    signals: Object.entries(signalFrequency)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([signal, count]) => ({ signal, count })),
    recentConversions,
    alerts: [
      stalledLeads.length > 0 && `⚠️ ${stalledLeads.length} leads stalled 7+ days`,
      scoreDistribution.hot.count === 0 && '🔥 No hot leads in pipeline',
      parseFloat(conversionRates.totalConversion) < 5 &&
        `📉 Total conversion <5% (${conversionRates.totalConversion}%)`,
    ].filter(Boolean),
    stalledLeads: stalledLeads.slice(0, 5),
  };
};

export const handleLeadsDashboard = async (req, res, path, m, body, ctx = {}) => {
  const json = (code, obj) => {
    res.statusCode = code;
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify(obj));
    return true;
  };

  const scope = ctx.userId || 'anon';

  if (path === '/api/dashboard/leads' && m === 'GET') {
    const accountId = req.query?.accountId || scope;
    const pipeline = await getLeadsPipeline(scope, accountId).catch(() => null);
    return json(pipeline ? 200 : 500, pipeline || { ok: false });
  }

  return false;
};
