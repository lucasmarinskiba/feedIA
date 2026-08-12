/**
 * Agency Routes — TIER 8 Real LLM Integration
 * POST /api/agency/campaign/create orchestrates 6 agents via Claude API
 */

import { Router, Request, Response } from 'express';
import { agencyOrchestrator } from '../agents/agency-orchestrator.js';

const router = Router();

interface CampaignRequest {
  brief: string;
  targetAudience: string;
  goals: string[];
  budget?: number;
  platforms?: string[];
}

/**
 * POST /api/agency/campaign/create
 * TIER 8: Real LLM orchestration (Strategy → Copy → Community → QA)
 */
router.post('/campaign/create', async (req: Request, res: Response): Promise<void> => {
  try {
    const accountId = req.get('X-Account-ID') || 'test-account';
    const { brief, targetAudience, goals, budget, platforms } = req.body as CampaignRequest;

    if (!brief || !targetAudience || !goals || goals.length === 0) {
      res.status(400).json({
        error: 'Missing required fields: brief, targetAudience, goals (array)',
      });
      return;
    }

    console.log(`[TIER 8] Orchestrating campaign for account=${accountId}`);

    const campaign = await agencyOrchestrator({
      accountId,
      brief,
      targetAudience,
      goals,
      budget,
      platforms,
    });

    res.json({
      campaignId: campaign.campaignId,
      status: 'approved',
      strategy: campaign.strategy,
      copy: campaign.copy,
      engagement: campaign.engagement,
      art: campaign.art,
      validation: campaign.validation,
      metrics: {
        totalTokens: campaign.totalTokens,
        estimatedCost: `$${campaign.estimatedCost.toFixed(4)}`,
      },
      createdAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[TIER 8] Orchestration error:', err);
    res.status(500).json({ error: String(err) });
  }
});

/**
 * GET /api/agency/campaign/:campaignId
 * TODO: Retrieve from PostgreSQL
 */
router.get('/campaign/:campaignId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { campaignId } = req.params;
    res.status(501).json({ error: 'Campaign retrieval not yet implemented. Use campaign creation endpoint.' });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

/**
 * POST /api/agency/batch/create
 * TODO: Process multiple campaigns in parallel
 */
router.post('/batch/create', async (req: Request, res: Response): Promise<void> => {
  try {
    const accountId = req.get('X-Account-ID') || 'test-account';
    const requests: CampaignRequest[] = req.body;

    if (!Array.isArray(requests) || requests.length === 0) {
      res.status(400).json({ error: 'Expected array of campaign requests' });
      return;
    }

    res.status(501).json({ error: 'Batch processing not yet implemented' });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

export default router;
