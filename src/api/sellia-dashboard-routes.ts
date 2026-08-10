import { Router, Request, Response } from 'express';
// @ts-ignore — Node handlers without types
import { getFansDashboard } from '../../api/_dashboardFans.js';
// @ts-ignore — Node handlers without types
import { getRoiExplorer, getRoiTimeline } from '../../api/_dashboardRoi.js';
// @ts-ignore — Node handlers without types
import { getLeadsPipeline } from '../../api/_dashboardLeads.js';

const router = Router();

/**
 * GET /api/dashboard/fans — Fan VIP tier breakdown, spend, churn tracking
 */
router.get('/fans', async (req: Request, res: Response) => {
  try {
    const accountId = (req.query?.accountId as string) || 'demo-account';
    const scope = 'demo-scope';
    const dashboard = await getFansDashboard(scope, accountId);
    res.json(dashboard);
  } catch (err) {
    res.status(500).json({ error: 'fans-dashboard', message: String(err) });
  }
});

/**
 * GET /api/dashboard/roi/explorer?dimension=format|topic|date — drill-down ROI by dimension
 */
router.get('/roi/explorer', async (req: Request, res: Response) => {
  try {
    const accountId = (req.query?.accountId as string) || 'demo-account';
    const dimension = (req.query?.dimension as string) || 'format';
    const scope = 'demo-scope';
    const explorer = await getRoiExplorer(scope, accountId, dimension);
    res.json(explorer);
  } catch (err) {
    res.status(500).json({ error: 'roi-explorer', message: String(err) });
  }
});

/**
 * GET /api/dashboard/roi/timeline — ROI trends over time (daily + cumulative)
 */
router.get('/roi/timeline', async (req: Request, res: Response) => {
  try {
    const accountId = (req.query?.accountId as string) || 'demo-account';
    const scope = 'demo-scope';
    const timeline = await getRoiTimeline(scope, accountId);
    res.json(timeline);
  } catch (err) {
    res.status(500).json({ error: 'roi-timeline', message: String(err) });
  }
});

/**
 * GET /api/dashboard/leads — Lead pipeline kanban view (hot/warm/cold, conversion funnel)
 */
router.get('/leads', async (req: Request, res: Response) => {
  try {
    const accountId = (req.query?.accountId as string) || 'demo-account';
    const scope = 'demo-scope';
    const pipeline = await getLeadsPipeline(scope, accountId);
    res.json(pipeline);
  } catch (err) {
    res.status(500).json({ error: 'leads-pipeline', message: String(err) });
  }
});

export default router;
