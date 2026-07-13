import { Router, Request, Response } from 'express';
import {
  growthStrategyService,
  StrategyItem,
  GrowthRecommendation,
} from '../services/growth-strategy-service';

const router = Router();

router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { accountHandle, platform } = req.body as {
      accountHandle: string;
      platform: 'instagram' | 'tiktok';
    };

    if (!accountHandle || !platform) {
      res.status(400).json({
        error: 'Missing required fields: accountHandle, platform',
      });
      return;
    }

    const strategy = await growthStrategyService.createStrategy(accountHandle, platform);

    res.status(201).json({ ok: true, strategy });
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: `Strategy creation failed: ${error}` });
  }
});

router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const accountHandle = req.query.account as string;

    if (!accountHandle) {
      res.status(400).json({ error: 'Missing query parameter: account' });
      return;
    }

    const strategies = await growthStrategyService.listStrategies(accountHandle);

    res.json({ ok: true, strategies });
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: `Strategy listing failed: ${error}` });
  }
});

router.get('/:strategyId', async (req: Request, res: Response): Promise<void> => {
  try {
    const strategyId = typeof req.params.strategyId === 'string' ? req.params.strategyId : '';

    if (!strategyId) {
      res.status(400).json({ error: 'Missing strategyId' });
      return;
    }

    const strategy = await growthStrategyService.loadStrategy(strategyId);

    if (!strategy) {
      res.status(404).json({ error: 'Strategy not found' });
      return;
    }

    res.json({ ok: true, strategy });
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: `Strategy load failed: ${error}` });
  }
});

router.post('/:strategyId/items', async (req: Request, res: Response): Promise<void> => {
  try {
    const strategyId = typeof req.params.strategyId === 'string' ? req.params.strategyId : '';
    const item = req.body as Omit<StrategyItem, 'id' | 'status'>;

    if (!strategyId || !item.type || !item.description) {
      res.status(400).json({
        error: 'Missing fields: strategyId, type, description',
      });
      return;
    }

    const strategy = await growthStrategyService.addStrategyItem(strategyId, item);

    res.status(201).json({ ok: true, strategy });
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: `Strategy item add failed: ${error}` });
  }
});

router.put('/:strategyId/items/:itemId', async (req: Request, res: Response): Promise<void> => {
  try {
    const strategyId = typeof req.params.strategyId === 'string' ? req.params.strategyId : '';
    const itemId = typeof req.params.itemId === 'string' ? req.params.itemId : '';
    const updates = req.body as Partial<StrategyItem>;

    if (!strategyId || !itemId) {
      res.status(400).json({
        error: 'Missing fields: strategyId, itemId',
      });
      return;
    }

    const strategy = await growthStrategyService.updateStrategyItem(strategyId, itemId, updates);

    res.json({ ok: true, strategy });
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: `Strategy item update failed: ${error}` });
  }
});

router.post('/:strategyId/activate', async (req: Request, res: Response): Promise<void> => {
  try {
    const strategyId = typeof req.params.strategyId === 'string' ? req.params.strategyId : '';

    if (!strategyId) {
      res.status(400).json({ error: 'Missing strategyId' });
      return;
    }

    const strategy = await growthStrategyService.activateStrategy(strategyId);

    res.json({ ok: true, strategy });
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: `Strategy activation failed: ${error}` });
  }
});

router.post('/:strategyId/pause', async (req: Request, res: Response): Promise<void> => {
  try {
    const strategyId = typeof req.params.strategyId === 'string' ? req.params.strategyId : '';

    if (!strategyId) {
      res.status(400).json({ error: 'Missing strategyId' });
      return;
    }

    const strategy = await growthStrategyService.pauseStrategy(strategyId);

    res.json({ ok: true, strategy });
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: `Strategy pause failed: ${error}` });
  }
});

router.post('/recommendations', async (req: Request, res: Response): Promise<void> => {
  try {
    const { accountHandle, platform, currentMetrics } = req.body as {
      accountHandle: string;
      platform: 'instagram' | 'tiktok';
      currentMetrics?: {
        engagement?: number;
        followers?: number;
        reach?: number;
        contentType?: string;
      };
    };

    if (!accountHandle || !platform) {
      res.status(400).json({
        error: 'Missing required fields: accountHandle, platform',
      });
      return;
    }

    const recommendations = await growthStrategyService.generateRecommendations(
      accountHandle,
      platform,
      currentMetrics
    );

    res.json({ ok: true, recommendations });
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: `Recommendations generation failed: ${error}` });
  }
});

export default router;
