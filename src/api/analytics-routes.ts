import { Router, Request, Response } from 'express';
import {
  analyticsService,
  MetricSnapshot,
  ContentMetrics,
} from '../services/analytics-service';

const router = Router();

router.post('/metrics', async (req: Request, res: Response): Promise<void> => {
  try {
    const { accountHandle, platform, snapshot } = req.body as {
      accountHandle: string;
      platform: 'instagram' | 'tiktok';
      snapshot: MetricSnapshot;
    };

    if (!accountHandle || !platform || !snapshot) {
      res.status(400).json({
        error: 'Missing required fields: accountHandle, platform, snapshot',
      });
      return;
    }

    await analyticsService.recordMetricSnapshot(accountHandle, platform, snapshot);

    res.status(201).json({ ok: true, recorded: true });
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: `Metric recording failed: ${error}` });
  }
});

router.post('/content', async (req: Request, res: Response): Promise<void> => {
  try {
    const { accountHandle, platform, metrics } = req.body as {
      accountHandle: string;
      platform: 'instagram' | 'tiktok';
      metrics: ContentMetrics;
    };

    if (!accountHandle || !platform || !metrics) {
      res.status(400).json({
        error: 'Missing required fields: accountHandle, platform, metrics',
      });
      return;
    }

    await analyticsService.recordContentMetrics(accountHandle, platform, metrics);

    res.status(201).json({ ok: true, recorded: true });
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: `Content metrics recording failed: ${error}` });
  }
});

router.get('/growth-trend', async (req: Request, res: Response): Promise<void> => {
  try {
    const accountHandle = req.query.account as string;
    const platform = (req.query.platform as 'instagram' | 'tiktok') || 'instagram';
    const days = parseInt(req.query.days as string) || 30;

    if (!accountHandle) {
      res.status(400).json({ error: 'Missing query parameter: account' });
      return;
    }

    const trend = await analyticsService.getGrowthTrend(accountHandle, platform, days);

    res.json({ ok: true, trend });
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: `Growth trend fetch failed: ${error}` });
  }
});

router.get('/content-performance', async (req: Request, res: Response): Promise<void> => {
  try {
    const accountHandle = req.query.account as string;
    const platform = (req.query.platform as 'instagram' | 'tiktok') || 'instagram';
    const limit = parseInt(req.query.limit as string) || 20;

    if (!accountHandle) {
      res.status(400).json({ error: 'Missing query parameter: account' });
      return;
    }

    const content = await analyticsService.getContentPerformance(accountHandle, platform, limit);

    res.json({ ok: true, content });
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: `Content performance fetch failed: ${error}` });
  }
});

router.get('/engagement-rate', async (req: Request, res: Response): Promise<void> => {
  try {
    const accountHandle = req.query.account as string;
    const platform = (req.query.platform as 'instagram' | 'tiktok') || 'instagram';
    const days = parseInt(req.query.days as string) || 7;

    if (!accountHandle) {
      res.status(400).json({ error: 'Missing query parameter: account' });
      return;
    }

    const engagementRate = await analyticsService.getEngagementRate(accountHandle, platform, days);

    res.json({ ok: true, engagementRate });
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: `Engagement rate fetch failed: ${error}` });
  }
});

router.get('/reach-trend', async (req: Request, res: Response): Promise<void> => {
  try {
    const accountHandle = req.query.account as string;
    const platform = (req.query.platform as 'instagram' | 'tiktok') || 'instagram';
    const days = parseInt(req.query.days as string) || 30;

    if (!accountHandle) {
      res.status(400).json({ error: 'Missing query parameter: account' });
      return;
    }

    const reachTrend = await analyticsService.getReachTrend(accountHandle, platform, days);

    res.json({ ok: true, reachTrend });
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: `Reach trend fetch failed: ${error}` });
  }
});

router.get('/follower-growth', async (req: Request, res: Response): Promise<void> => {
  try {
    const accountHandle = req.query.account as string;
    const platform = (req.query.platform as 'instagram' | 'tiktok') || 'instagram';
    const days = parseInt(req.query.days as string) || 30;

    if (!accountHandle) {
      res.status(400).json({ error: 'Missing query parameter: account' });
      return;
    }

    const growth = await analyticsService.getFollowerGrowth(accountHandle, platform, days);

    res.json({ ok: true, growth });
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: `Follower growth fetch failed: ${error}` });
  }
});

router.get('/recommendations', async (req: Request, res: Response): Promise<void> => {
  try {
    const accountHandle = req.query.account as string;
    const platform = (req.query.platform as 'instagram' | 'tiktok') || 'instagram';

    if (!accountHandle) {
      res.status(400).json({ error: 'Missing query parameter: account' });
      return;
    }

    const recommendations = await analyticsService.getRecommendations(accountHandle, platform);

    res.json({ ok: true, recommendations });
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: `Recommendations fetch failed: ${error}` });
  }
});

export default router;
