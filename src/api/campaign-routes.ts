import { Router, Request, Response } from 'express';
import { campaignService, CampaignCreateRequest, CampaignUpdateRequest } from '../services/campaign-service';

const router = Router();

router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const body = req.body as CampaignCreateRequest;

    if (!body.name || !body.accountHandle || !body.platform || !body.contentType) {
      res.status(400).json({
        error: 'Missing required fields: name, accountHandle, platform, contentType',
      });
      return;
    }

    const campaign = await campaignService.createCampaign(body);

    res.status(201).json({ ok: true, campaign });
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: `Campaign creation failed: ${error}` });
  }
});

router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const accountHandle = req.query.account as string | undefined;
    const campaigns = await campaignService.listCampaigns(accountHandle);

    res.json({ ok: true, campaigns });
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: `Campaign listing failed: ${error}` });
  }
});

router.get('/:campaignId', async (req: Request, res: Response): Promise<void> => {
  try {
    const campaignId = typeof req.params.campaignId === 'string' ? req.params.campaignId : '';

    if (!campaignId) {
      res.status(400).json({ error: 'Missing campaignId' });
      return;
    }

    const campaign = await campaignService.loadCampaign(campaignId);

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

router.put('/:campaignId', async (req: Request, res: Response): Promise<void> => {
  try {
    const campaignId = typeof req.params.campaignId === 'string' ? req.params.campaignId : '';
    const updates = req.body as CampaignUpdateRequest;

    if (!campaignId) {
      res.status(400).json({ error: 'Missing campaignId' });
      return;
    }

    const campaign = await campaignService.updateCampaign(campaignId, updates);

    res.json({ ok: true, campaign });
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: `Campaign update failed: ${error}` });
  }
});

router.delete('/:campaignId', async (req: Request, res: Response): Promise<void> => {
  try {
    const campaignId = typeof req.params.campaignId === 'string' ? req.params.campaignId : '';

    if (!campaignId) {
      res.status(400).json({ error: 'Missing campaignId' });
      return;
    }

    await campaignService.deleteCampaign(campaignId);

    res.json({ ok: true, deleted: true });
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: `Campaign deletion failed: ${error}` });
  }
});

router.post('/:campaignId/content', async (req: Request, res: Response): Promise<void> => {
  try {
    const campaignId = typeof req.params.campaignId === 'string' ? req.params.campaignId : '';
    const { contentId } = req.body as { contentId: string };

    if (!campaignId || !contentId) {
      res.status(400).json({
        error: 'Missing fields: campaignId, contentId',
      });
      return;
    }

    const campaign = await campaignService.addContentToCampaign(campaignId, contentId);

    res.json({ ok: true, campaign });
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: `Add content failed: ${error}` });
  }
});

router.delete('/:campaignId/content/:contentId', async (req: Request, res: Response): Promise<void> => {
  try {
    const campaignId = typeof req.params.campaignId === 'string' ? req.params.campaignId : '';
    const contentId = typeof req.params.contentId === 'string' ? req.params.contentId : '';

    if (!campaignId || !contentId) {
      res.status(400).json({
        error: 'Missing fields: campaignId, contentId',
      });
      return;
    }

    const campaign = await campaignService.removeContentFromCampaign(campaignId, contentId);

    res.json({ ok: true, campaign });
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: `Remove content failed: ${error}` });
  }
});

router.post('/:campaignId/schedule', async (req: Request, res: Response): Promise<void> => {
  try {
    const campaignId = typeof req.params.campaignId === 'string' ? req.params.campaignId : '';
    const { startDate, endDate } = req.body as {
      startDate?: string;
      endDate?: string;
    };

    if (!campaignId || !startDate) {
      res.status(400).json({
        error: 'Missing fields: campaignId, startDate',
      });
      return;
    }

    const campaign = await campaignService.scheduleCampaign(
      campaignId,
      new Date(startDate),
      endDate ? new Date(endDate) : undefined
    );

    res.json({ ok: true, campaign });
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: `Schedule failed: ${error}` });
  }
});

router.post('/:campaignId/metrics', async (req: Request, res: Response): Promise<void> => {
  try {
    const campaignId = typeof req.params.campaignId === 'string' ? req.params.campaignId : '';
    const metrics = req.body as {
      impressions?: number;
      reaches?: number;
      engagement?: number;
      clicks?: number;
      saves?: number;
      shares?: number;
    };

    if (!campaignId) {
      res.status(400).json({ error: 'Missing campaignId' });
      return;
    }

    const campaign = await campaignService.updateMetrics(campaignId, metrics);

    res.json({ ok: true, campaign });
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: `Metrics update failed: ${error}` });
  }
});

export default router;
