/**
 * Agent Orchestrator — Neural Swarm Decision Loop
 *
 * Flow: Dashboard data → Predictive models → Agent reasoning → Actions
 *
 * Agents: Growth, Retention, Sales, Content
 */

import { runFullPredictiveAnalysis } from './predictive-models.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyObject = Record<string, any>;

export interface AgentDecision {
  agent: 'growth' | 'retention' | 'sales' | 'content';
  priority: 'critical' | 'high' | 'medium' | 'low';
  action: string;
  expectedROI?: number;
  affectedCount?: number;
  timeframe?: string;
}

export interface OrchestrationResult {
  timestamp: string;
  decisions: AgentDecision[];
  summary: string;
  northStar: {
    currentROI: number;
    projectedROI: number;
    fanRetention: number;
    leadVelocity: number;
  };
}

const growthAgent = (predictions: AnyObject, roi: AnyObject): AgentDecision[] => {
  const decisions: AgentDecision[] = [];

  for (const opp of predictions.viralOpportunities || []) {
    if (opp.score > 80) {
      decisions.push({
        agent: 'growth',
        priority: 'critical',
        action: `SCALE: ${opp.recommendation} → increase budget 30% for viral combo`,
        expectedROI: opp.score * 5,
        timeframe: '7 days',
      });
    }
  }

  for (const topic of roi.byTopic || []) {
    if (topic.roi < 50 && topic.publications > 10) {
      decisions.push({
        agent: 'growth',
        priority: 'high',
        action: `PAUSE: topic "${topic.topic}" underperforming (${topic.roi}% ROI) — reallocate budget`,
        affectedCount: topic.publications,
        timeframe: '3 days',
      });
    }
  }

  const testRecs = (roi.byFormat || []).filter((f: AnyObject) => f.publications < 15);
  if (testRecs.length > 0) {
    decisions.push({
      agent: 'growth',
      priority: 'medium',
      action: `TEST: ${testRecs.length} emerging formats need more reps for signal`,
      affectedCount: testRecs.length,
      timeframe: '14 days',
    });
  }

  return decisions;
};

const retentionAgent = (predictions: AnyObject, fans: AnyObject): AgentDecision[] => {
  const decisions: AgentDecision[] = [];

  const criticalChurn = (predictions.churnRisks || []).filter((c: AnyObject) => c.riskScore > 80);
  if (criticalChurn.length > 0) {
    decisions.push({
      agent: 'retention',
      priority: 'critical',
      action: `ALERT: ${criticalChurn.length} fans at extreme churn risk (>80) — activate emergency retention`,
      affectedCount: criticalChurn.length,
      timeframe: '24h',
    });
  }

  const vipAtRisk = (predictions.churnRisks || []).filter((c: AnyObject) => c.riskScore > 60);
  if (vipAtRisk.length > 0) {
    decisions.push({
      agent: 'retention',
      priority: 'critical',
      action: `PROTECT: ${vipAtRisk.length} Platinum fans at risk — schedule personal outreach`,
      affectedCount: vipAtRisk.length,
      timeframe: '48h',
    });
  }

  const inactive30 = fans.churnAnalysis?.inactive30Count || 0;
  if (inactive30 > 10) {
    decisions.push({
      agent: 'retention',
      priority: 'high',
      action: `REACTIVATE: ${inactive30} fans inactive 30+ days — exclusive content drip`,
      affectedCount: inactive30,
      timeframe: '7 days',
    });
  }

  return decisions;
};

const salesAgent = (predictions: AnyObject, leads: AnyObject): AgentDecision[] => {
  const decisions: AgentDecision[] = [];

  const hotLeads = (predictions.leadPredictions || []).filter((l: AnyObject) => l.stage === 'hot');
  if (hotLeads.length > 10) {
    const totalValue = hotLeads.reduce((sum: number, l: AnyObject) => sum + (l.predictedValue || 0), 0);
    decisions.push({
      agent: 'sales',
      priority: 'critical',
      action: `CLOSE: ${hotLeads.length} hot leads ready for demo (Σ$${Math.round(totalValue / 1000)}k pipeline)`,
      affectedCount: hotLeads.length,
      expectedROI: Math.round(totalValue / 1000),
      timeframe: '3 days',
    });
  }

  const warmLeads = (predictions.leadPredictions || []).filter((l: AnyObject) => l.stage === 'warm');
  if (warmLeads.length > 0) {
    decisions.push({
      agent: 'sales',
      priority: 'high',
      action: `NURTURE: ${warmLeads.length} warm leads — send case studies + social proof`,
      affectedCount: warmLeads.length,
      timeframe: '7 days',
    });
  }

  const topSignals = (leads.signals || []).slice(0, 3);
  if (topSignals.length > 0) {
    decisions.push({
      agent: 'sales',
      priority: 'medium',
      action: `COPYWRITE: Top signals detected (${topSignals.map((s: AnyObject) => s.signal).join(', ')}) — update pitch`,
      timeframe: '2 days',
    });
  }

  return decisions;
};

const contentAgent = (predictions: AnyObject, roi: AnyObject): AgentDecision[] => {
  const decisions: AgentDecision[] = [];

  const winnerTopics = (roi.byTopic || []).filter((t: AnyObject) => t.roi > 300);
  if (winnerTopics.length > 0) {
    const winner = winnerTopics[0];
    decisions.push({
      agent: 'content',
      priority: 'high',
      action: `CONTENT STACK: "${winner?.topic}" dominates (${winner?.roi}% ROI) — create 5 variations`,
      timeframe: '7 days',
    });
  }

  const underexplored = (roi.byFormat || []).filter((f: AnyObject) => f.publications < 10);
  if (underexplored.length > 0) {
    decisions.push({
      agent: 'content',
      priority: 'medium',
      action: `EXPERIMENT: ${underexplored.map((f: AnyObject) => f.format).join(', ')} need signal → 3 reps each`,
      affectedCount: underexplored.length,
      timeframe: '14 days',
    });
  }

  return decisions;
};

export const runAgentOrchestration = async (dashboardData: AnyObject): Promise<OrchestrationResult> => {
  const fanMetrics = (dashboardData.fans.topSpenders || []).reduce((acc: AnyObject, fan: AnyObject) => {
    acc[fan.email] = {
      daysSinceLastEngagement: 15,
      totalSpent: fan.spent,
      engagementScore: fan.engagement,
      tier: fan.tier,
    };
    return acc;
  }, {});

  const contentHistory = (dashboardData.roi.byTopic || []).map((t: AnyObject) => ({
    format: 'mixed',
    topic: t.topic,
    publications: t.publications,
    conversions: t.conversions,
    revenue: t.revenue,
    cost: t.cost,
    engagement: 70,
    roi: t.roi,
  }));

  const leads = (dashboardData.leads.recentConversions || []).reduce((acc: AnyObject, lead: AnyObject) => {
    acc[lead.email] = {
      score: lead.score,
      signals: ['price-question'],
      daysSinceCreation: 5,
    };
    return acc;
  }, {});

  const predictions = runFullPredictiveAnalysis(fanMetrics, contentHistory, leads);

  const growthDecisions = growthAgent(predictions, dashboardData.roi);
  const retentionDecisions = retentionAgent(predictions, dashboardData.fans);
  const salesDecisions = salesAgent(predictions, dashboardData.leads);
  const contentDecisions = contentAgent(predictions, dashboardData.roi);

  const allDecisions = [...growthDecisions, ...retentionDecisions, ...salesDecisions, ...contentDecisions].sort(
    (a, b) => {
      const priorityMap = { critical: 0, high: 1, medium: 2, low: 3 };
      return priorityMap[a.priority] - priorityMap[b.priority];
    },
  );

  const currentROI = dashboardData.roi.overview?.roi || 0;
  const topicROI = (dashboardData.roi.byTopic || []).reduce((max: number, t: AnyObject) => Math.max(max, t.roi), 0);

  const summary =
    allDecisions.length > 0
      ? `${allDecisions.filter((d) => d.priority === 'critical').length} critical actions + ${allDecisions.length - 1} follow-ups`
      : 'All metrics healthy, no critical actions needed';

  return {
    timestamp: new Date().toISOString(),
    decisions: allDecisions,
    summary,
    northStar: {
      currentROI,
      projectedROI: Math.max(currentROI, topicROI),
      fanRetention: dashboardData.fans.overview.activeFans / dashboardData.fans.overview.totalFans,
      leadVelocity: dashboardData.leads.funnel.stats.converted || 0,
    },
  };
};

export default {
  runAgentOrchestration,
  growthAgent,
  retentionAgent,
  salesAgent,
  contentAgent,
};
