/**
 * Agency Routes — TIER 8 Real LLM Integration
 * POST /api/agency/campaign/create orchestrates 6 agents via Claude API
 */

import { Router, Request, Response } from 'express';
import { agencyOrchestrator } from '../agents/agency-orchestrator.js';
import { batchOrchestrator } from '../agents/batch-orchestrator.js';
import { saveCampaign, loadCampaign, listCampaigns, updateCampaignStatus, initializeCampaignsTable } from '../agents/agency-persistence.js';
import { metricsCollector, getHealthCheck } from '../agents/agency-metrics.js';
import { validateTierAccess } from '../middleware/tier-enforcer.js';

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
    const accountId = (req.body as CampaignRequest).userId || req.get('X-Account-ID') || 'test-account';
    const { brief, targetAudience, goals, budget, platforms } = req.body as CampaignRequest;

    if (!brief || !targetAudience || !goals || goals.length === 0) {
      res.status(400).json({
        error: 'Missing required fields: brief, targetAudience, goals (array)',
      });
      return;
    }

    console.log(`[TIER 8] Orchestrating campaign for account=${accountId}`);

    // TIER 8 Phase 7: Enforce tier limits (campaign count)
    const tierValidation = await validateTierAccess(accountId, 1);
    if (!tierValidation.allowed) {
      console.warn(`[Tier Enforce] Campaign rejected for ${accountId}: ${tierValidation.reason}`);
      res.status(403).json({
        error: 'Campaign limit exceeded',
        reason: tierValidation.reason,
        tier: tierValidation.context?.tier || 'free',
        campaignsRemaining: tierValidation.context?.campaignsRemaining || 0,
      });
      return;
    }

    // Initialize DB table on first request
    await initializeCampaignsTable();

    const campaign = await agencyOrchestrator({
      accountId,
      brief,
      targetAudience,
      goals,
      budget,
      platforms,
    });

    // TIER 8 Phase 2: Persist to PostgreSQL
    await saveCampaign(campaign, accountId);

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
 * TIER 8 Phase 2: Retrieve from PostgreSQL
 */
router.get('/campaign/:campaignId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { campaignId } = req.params;
    const campaign = await loadCampaign(campaignId);

    if (!campaign) {
      res.status(404).json({ error: 'Campaign not found' });
      return;
    }

    res.json(campaign);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

/**
 * GET /api/agency/campaigns
 * List campaigns for account
 */
router.get('/campaigns', async (req: Request, res: Response): Promise<void> => {
  try {
    const accountId = req.get('X-Account-ID') || 'test-account';
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;

    const result = await listCampaigns(accountId, limit, offset);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

/**
 * POST /api/agency/batch/create
 * TIER 8 Phase 3: Process multiple campaigns in parallel with worker pool
 */
router.post('/batch/create', async (req: Request, res: Response): Promise<void> => {
  try {
    const accountId = req.get('X-Account-ID') || 'test-account';
    const requests: CampaignRequest[] = req.body;
    const workerCount = parseInt(req.get('X-Worker-Count') || '3');

    if (!Array.isArray(requests) || requests.length === 0) {
      res.status(400).json({ error: 'Expected array of campaign requests' });
      return;
    }

    console.log(`[TIER 8 Phase 3] Batch creating ${requests.length} campaigns (accountId=${accountId})`);

    // Initialize DB table on first request
    await initializeCampaignsTable();

    // Convert to CampaignInput format
    const inputs = requests.map((req: CampaignRequest) => ({
      accountId,
      brief: req.brief,
      targetAudience: req.targetAudience,
      goals: req.goals,
      budget: req.budget,
      platforms: req.platforms,
    }));

    // Process batch with worker pool
    const batchResult = await batchOrchestrator(inputs, accountId, workerCount);

    res.json(batchResult);
  } catch (err) {
    console.error('[TIER 8 Phase 3] Batch error:', err);
    res.status(500).json({ error: String(err) });
  }
});

/**
 * GET /api/agency/health
 * TIER 8 Phase 4: Health check + metrics
 */
router.get('/health', (req: Request, res: Response): void => {
  const health = getHealthCheck();
  res.json(health);
});

/**
 * GET /api/agency/metrics
 * TIER 8 Phase 4: Prometheus metrics format
 */
router.get('/metrics', (req: Request, res: Response): void => {
  const prometheus = metricsCollector.getPrometheusFormat();
  res.type('text/plain').send(prometheus);
});

export default router;
