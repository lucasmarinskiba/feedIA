import { Router, Request, Response } from 'express';
import {
  influencerService,
  Influencer,
  Collaboration,
} from '../services/influencer-service';

const router = Router();

router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const data = req.body as Omit<Influencer, 'id' | 'createdAt' | 'updatedAt'>;

    if (!data.handle || !data.platform) {
      res.status(400).json({
        error: 'Missing required fields: handle, platform',
      });
      return;
    }

    const influencer = await influencerService.createInfluencer(data);

    res.status(201).json({ ok: true, influencer });
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: `Influencer creation failed: ${error}` });
  }
});

router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const status = req.query.status as Influencer['status'] | undefined;
    const niche = req.query.niche as string | undefined;

    const influencers = await influencerService.listInfluencers(status, niche);

    res.json({ ok: true, influencers });
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: `Influencer listing failed: ${error}` });
  }
});

router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = typeof req.params.id === 'string' ? req.params.id : '';

    const influencer = await influencerService.loadInfluencer(id);

    if (!influencer) {
      res.status(404).json({ error: 'Influencer not found' });
      return;
    }

    res.json({ ok: true, influencer });
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: `Influencer load failed: ${error}` });
  }
});

router.put('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = typeof req.params.id === 'string' ? req.params.id : '';
    const updates = req.body as Partial<Influencer>;

    const influencer = await influencerService.updateInfluencer(id, updates);

    res.json({ ok: true, influencer });
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: `Influencer update failed: ${error}` });
  }
});

router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = typeof req.params.id === 'string' ? req.params.id : '';

    await influencerService.deleteInfluencer(id);

    res.json({ ok: true, deleted: true });
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: `Influencer deletion failed: ${error}` });
  }
});

router.post('/:id/collaborations', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = typeof req.params.id === 'string' ? req.params.id : '';
    const collab = req.body as Omit<Collaboration, 'id'>;

    const influencer = await influencerService.addCollaboration(id, collab);

    res.status(201).json({ ok: true, influencer });
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: `Collaboration add failed: ${error}` });
  }
});

router.put('/:id/collaborations/:collabId', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = typeof req.params.id === 'string' ? req.params.id : '';
    const collabId = typeof req.params.collabId === 'string' ? req.params.collabId : '';
    const { status } = req.body as { status: Collaboration['status'] };

    const influencer = await influencerService.updateCollaborationStatus(id, collabId, status);

    res.json({ ok: true, influencer });
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: `Collaboration update failed: ${error}` });
  }
});

router.get('/niche/:niche', async (req: Request, res: Response): Promise<void> => {
  try {
    const niche = typeof req.params.niche === 'string' ? req.params.niche : '';
    const minEngagement = parseInt(req.query.minEngagement as string) || 1;

    const influencers = await influencerService.getInfluencersByNiche(niche, minEngagement);

    res.json({ ok: true, influencers });
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: `Niche search failed: ${error}` });
  }
});

router.get('/top/performers', async (req: Request, res: Response): Promise<void> => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;

    const influencers = await influencerService.getTopPerformers(limit);

    res.json({ ok: true, influencers });
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: `Top performers fetch failed: ${error}` });
  }
});

export default router;
