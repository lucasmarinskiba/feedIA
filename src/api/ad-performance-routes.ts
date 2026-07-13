import { Router, Request, Response } from 'express';
import {
  adPerformanceService,
  AdCampaign,
  AdCreative,
  AdInsight,
} from '../services/ad-performance-service';

const router = Router();

router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const data = req.body as Omit<AdCampaign, 'id' | 'createdAt' | 'lastUpdated'>;

    if (!data.platform || !data.ad_account_id || !data.name) {
      res.status(400).json({
        error: 'Missing required fields: platform, ad_account_id, name',
      });
      return;
    }

    const campaign = await adPerformanceService.createAdCampaign(data);

    res.status(201).json({ ok: true, campaign });
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: `Campaign creation failed: ${error}` });
  }
});

router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const accountId = req.query.account as string;
    const status = req.query.status as AdCampaign['status'] | undefined;

    if (!accountId) {
      res.status(400).json({ error: 'Missing query parameter: account' });
      return;
    }

    const campaigns = await adPerformanceService.listCampaigns(accountId, status);

    res.json({ ok: true, campaigns });
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: `Campaign listing failed: ${error}` });
  }
});

router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = typeof req.params.id === 'string' ? req.params.id : '';

    const campaign = await adPerformanceService.loadCampaign(id);

    if (!campaign) {
      res.status(404).json({ error: 'Campaign not found' });
      return;
    }

    res.json({ ok: true, campaign });
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: `Campaign load failed: ${error}` });
  }
});

router.put('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = typeof req.params.id === 'string' ? req.params.id : '';
    const updates = req.body as Partial<AdCampaign>;

    const campaign = await adPerformanceService.updateAdCampaign(id, updates);

    res.json({ ok: true, campaign });
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: `Campaign update failed: ${error}` });
  }
});

router.post('/:id/creatives', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = typeof req.params.id === 'string' ? req.params.id : '';
    const creative = req.body as Omit<AdCreative, 'id'>;

    const campaign = await adPerformanceService.addCreative(id, creative);

    res.status(201).json({ ok: true, campaign });
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: `Creative add failed: ${error}` });
  }
});

router.put('/:id/creatives/:creativeId', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = typeof req.params.id === 'string' ? req.params.id : '';
    const creativeId = typeof req.params.creativeId === 'string' ? req.params.creativeId : '';
    const performance = req.body as AdCreative['performance'];

    const campaign = await adPerformanceService.updateCreativePerformance(
      id,
      creativeId,
      performance
    );

    res.json({ ok: true, campaign });
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: `Creative update failed: ${error}` });
  }
});

router.post('/insights/:campaignId', async (req: Request, res: Response): Promise<void> => {
  try {
    const campaignId = typeof req.params.campaignId === 'string' ? req.params.campaignId : '';
    const insight = req.body as Omit<AdInsight, 'timestamp'>;

    await adPerformanceService.recordInsight(campaignId, insight);

    res.status(201).json({ ok: true, recorded: true });
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: `Insight recording failed: ${error}` });
  }
});

router.get('/insights/:campaignId', async (req: Request, res: Response): Promise<void> => {
  try {
    const campaignId = typeof req.params.campaignId === 'string' ? req.params.campaignId : '';
    const days = parseInt(req.query.days as string) || 30;

    const insights = await adPerformanceService.getInsights(campaignId, days);

    res.json({ ok: true, insights });
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: `Insights fetch failed: ${error}` });
  }
});

router.get('/:id/roas', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = typeof req.params.id === 'string' ? req.params.id : '';

    const roas = await adPerformanceService.calculateROAS(id);

    res.json({ ok: true, roas });
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: `ROAS calculation failed: ${error}` });
  }
});

router.get('/account/:accountId/best', async (req: Request, res: Response): Promise<void> => {
  try {
    const accountId = typeof req.params.accountId === 'string' ? req.params.accountId : '';

    const campaign = await adPerformanceService.getBestPerformer(accountId);

    res.json({ ok: true, campaign });
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: `Best performer fetch failed: ${error}` });
  }
});

router.post('/:id/optimize', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = typeof req.params.id === 'string' ? req.params.id : '';

    const optimization = await adPerformanceService.optimizeAds(id);

    res.json({ ok: true, optimization });
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: `Optimization failed: ${error}` });
  }
});

export default router;
