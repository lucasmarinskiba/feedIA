import { Router, Request, Response } from 'express';
import { runAgentOrchestration } from '../services/agent-orchestrator.js';

const router = Router();

router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const dashboardData = req.body || getMockDashboardData();

    const result = await runAgentOrchestration(dashboardData);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'orchestration', message: String(err) });
  }
});

/**
 * GET /api/orchestrate/status — health check
 */
router.get('/status', (req: Request, res: Response): void => {
  res.json({
    status: 'ok',
    agents: ['growth-agent', 'retention-agent', 'sales-agent', 'content-agent'],
    mode: 'autonomous-loop',
    lastRun: new Date().toISOString(),
  });
});

/**
 * Mock dashboard data for testing
 */
function getMockDashboardData() {
  return {
    fans: {
      overview: {
        totalFans: 4280,
        activeFans: 3956,
        churned: 324,
      },
      tiers: {
        bronze: { count: 2145 },
        silver: { count: 1456 },
        gold: { count: 562 },
        platinum: { count: 75 },
      },
      churnAnalysis: {
        inactive30Count: 287,
        recentChurned: [],
      },
      topSpenders: [
        {
          email: 'vip_1@example.com',
          tier: 'platinum',
          spent: 8500,
          engagement: 94,
        },
      ],
    },
    roi: {
      overview: { roi: 412 },
      byFormat: [
        {
          format: 'carousel',
          publications: 148,
          conversions: 45,
          revenue: 14250,
          cost: 2340.5,
          roi: 509.3,
        },
      ],
      byTopic: [
        {
          topic: 'lifestyle',
          publications: 245,
          conversions: 52,
          revenue: 16800,
          cost: 3120,
          roi: 438.5,
        },
      ],
      topPerformers: [],
    },
    leads: {
      funnel: {
        stats: { new: 1247, contacted: 456, qualified: 128, converted: 38 },
      },
      scoreDistribution: {},
      signals: [
        { signal: 'price-question', count: 342 },
        { signal: 'urgency-marker', count: 298 },
      ],
      recentConversions: [
        {
          email: 'client_1@corp.com',
          score: 89,
          value: 15000,
          convertedAt: '2026-08-10T14:32:00Z',
        },
      ],
    },
  };
}

export default router;
