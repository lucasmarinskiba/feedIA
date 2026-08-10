import { Router, Request, Response } from 'express';

const router = Router();

/**
 * GET /api/dashboard/fans — Fan VIP tier breakdown, spend, churn tracking
 */
router.get('/fans', async (req: Request, res: Response) => {
  const timestamp = new Date().toISOString();
  res.json({
    timestamp,
    overview: {
      totalFans: 4280,
      activeFans: 3956,
      churned: 324,
      retentionRate: '92.4%',
      totalSpend: 187430.5,
      avgSpendPerFan: '43.84',
    },
    tiers: {
      bronze: {
        count: 2145,
        totalSpend: 42875.25,
        avgEngagement: 48.2,
        churnCount: 98,
      },
      silver: {
        count: 1456,
        totalSpend: 89562.75,
        avgEngagement: 72.1,
        churnCount: 45,
      },
      gold: {
        count: 562,
        totalSpend: 42987.5,
        avgEngagement: 84.3,
        churnCount: 25,
      },
      platinum: {
        count: 75,
        totalSpend: 12005.0,
        avgEngagement: 91.7,
        churnCount: 0,
      },
    },
    churnAnalysis: {
      inactive30Count: 287,
      recentChurned: [
        { email: 'user_1@example.com', tier: 'bronze', reason: 'no-engagement' },
        { email: 'user_2@example.com', tier: 'silver', reason: 'price-sensitive' },
      ],
      reasons: { 'no-engagement': 156, 'price-sensitive': 98, other: 70 },
    },
    topSpenders: [
      { email: 'vip_1@example.com', tier: 'platinum', spent: 8500, purchases: 24, engagement: 94 },
      { email: 'vip_2@example.com', tier: 'gold', spent: 5200, purchases: 18, engagement: 88 },
    ],
    alerts: ['⚠️ 287 fans inactive 30+ days'],
  });
});

/**
 * GET /api/dashboard/roi/explorer?dimension=format|topic|date — drill-down ROI by dimension
 */
router.get('/roi/explorer', async (req: Request, res: Response) => {
  const dimension = (req.query?.dimension as string) || 'format';

  if (dimension === 'format') {
    return res.json({
      dimension: 'format',
      data: [
        {
          name: 'carousel',
          publications: 148,
          conversions: 45,
          cost: 2340.5,
          revenue: 14250,
          roi: 509.3,
          conversionRate: 30.4,
          avgCostPerPub: 15.82,
        },
        {
          name: 'reel',
          publications: 312,
          conversions: 38,
          cost: 4125.75,
          revenue: 9120,
          roi: 121.0,
          conversionRate: 12.2,
          avgCostPerPub: 13.22,
        },
        {
          name: 'story',
          publications: 156,
          conversions: 12,
          cost: 1560,
          revenue: 2160,
          roi: 38.5,
          conversionRate: 7.7,
          avgCostPerPub: 10.0,
        },
      ],
      summary: {
        topPerformer: 'carousel',
        bottomPerformer: 'story',
        totalPubs: 616,
        totalConversions: 95,
      },
    });
  }

  if (dimension === 'topic') {
    return res.json({
      dimension: 'topic',
      data: [
        {
          name: 'lifestyle',
          publications: 245,
          conversions: 52,
          cost: 3120,
          revenue: 16800,
          roi: 438.5,
          conversionRate: 21.2,
          avgCostPerPub: 12.73,
        },
        {
          name: 'tutorial',
          publications: 198,
          conversions: 28,
          cost: 2580,
          revenue: 7560,
          roi: 192.6,
          conversionRate: 14.1,
          avgCostPerPub: 13.03,
        },
        {
          name: 'viral',
          publications: 173,
          conversions: 15,
          cost: 2345,
          revenue: 3450,
          roi: 47.1,
          conversionRate: 8.7,
          avgCostPerPub: 13.55,
        },
      ],
      summary: {
        topPerformer: 'lifestyle',
        bottomPerformer: 'viral',
        totalPubs: 616,
        totalConversions: 95,
      },
    });
  }

  return res.json({
    dimension: 'date',
    data: [
      {
        name: '2026-08-08',
        publications: 28,
        conversions: 8,
        cost: 365,
        revenue: 1920,
        roi: 425.5,
        conversionRate: 28.6,
        avgCostPerPub: 13.04,
      },
      {
        name: '2026-08-09',
        publications: 35,
        conversions: 12,
        cost: 455,
        revenue: 2880,
        roi: 533.0,
        conversionRate: 34.3,
        avgCostPerPub: 13.0,
      },
      {
        name: '2026-08-10',
        publications: 42,
        conversions: 9,
        cost: 525,
        revenue: 2160,
        roi: 311.4,
        conversionRate: 21.4,
        avgCostPerPub: 12.5,
      },
    ],
    summary: {
      topPerformer: '2026-08-09',
      bottomPerformer: '2026-08-08',
      totalPubs: 105,
      totalConversions: 29,
    },
  });
});

/**
 * GET /api/dashboard/roi/timeline — ROI trends over time (daily + cumulative)
 */
router.get('/roi/timeline', async (req: Request, res: Response) => {
  res.json({
    timeline: [
      {
        date: '2026-08-01',
        publications: 22,
        conversions: 5,
        dailySpend: 285,
        dailyRevenue: 1200,
        dailyRoi: 321.1,
        cumulativeSpend: 285,
        cumulativeRevenue: 1200,
        cumulativeRoi: 321.1,
      },
      {
        date: '2026-08-02',
        publications: 28,
        conversions: 8,
        dailySpend: 365,
        dailyRevenue: 1920,
        dailyRoi: 425.5,
        cumulativeSpend: 650,
        cumulativeRevenue: 3120,
        cumulativeRoi: 379.4,
      },
      {
        date: '2026-08-03',
        publications: 35,
        conversions: 12,
        dailySpend: 455,
        dailyRevenue: 2880,
        dailyRoi: 533.0,
        cumulativeSpend: 1105,
        cumulativeRevenue: 6000,
        cumulativeRoi: 443.0,
      },
    ],
    trend: 121.9,
  });
});

/**
 * GET /api/dashboard/leads — Lead pipeline kanban view (hot/warm/cold, conversion funnel)
 */
router.get('/leads', async (req: Request, res: Response) => {
  const timestamp = new Date().toISOString();
  res.json({
    timestamp,
    pipeline: {
      new: { hot: [], warm: [], cold: [] },
      contacted: { hot: [], warm: [], cold: [] },
      qualified: { hot: [], warm: [], cold: [] },
      converted: { hot: [], warm: [], cold: [] },
    },
    funnel: {
      stats: {
        new: 1247,
        contacted: 456,
        qualified: 128,
        converted: 38,
      },
      conversionRates: {
        newToContacted: '36.6',
        contactedToQualified: '28.1',
        qualifiedToConverted: '29.7',
        totalConversion: '3.0',
      },
    },
    scoreDistribution: {
      hot: { count: 156, avgScore: '82.3', totalValue: 487500 },
      warm: { count: 298, avgScore: '65.7', totalValue: 298000 },
      cold: { count: 793, avgScore: '42.1', totalValue: 119500 },
    },
    signals: [
      { signal: 'price-question', count: 342 },
      { signal: 'urgency-marker', count: 298 },
      { signal: 'comparison-search', count: 267 },
      { signal: 'demo-request', count: 156 },
      { signal: 'budget-inquiry', count: 145 },
    ],
    recentConversions: [
      { email: 'client_1@corp.com', score: 89, value: 15000, convertedAt: '2026-08-10T14:32:00Z' },
      { email: 'client_2@corp.com', score: 76, value: 8500, convertedAt: '2026-08-09T09:15:00Z' },
    ],
    alerts: [],
    stalledLeads: [],
  });
});

export default router;
