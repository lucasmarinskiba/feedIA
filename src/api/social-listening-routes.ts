import { Router, Request, Response } from 'express';
import { socialListeningService, Mention, HashtagMetric } from '../services/social-listening-service';

const router = Router();

router.post('/mention', async (req: Request, res: Response): Promise<void> => {
  try {
    const mention = req.body as Omit<Mention, 'id'>;

    if (!mention.accountHandle || !mention.platform || !mention.sourceHandle || !mention.content) {
      res.status(400).json({
        error: 'Missing required fields: accountHandle, platform, sourceHandle, content',
      });
      return;
    }

    const recorded = await socialListeningService.recordMention(mention);

    res.status(201).json({ ok: true, mention: recorded });
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: `Mention recording failed: ${error}` });
  }
});

router.get('/mentions', async (req: Request, res: Response): Promise<void> => {
  try {
    const accountHandle = req.query.account as string;
    const platform = (req.query.platform as 'instagram' | 'tiktok') || 'instagram';
    const sentiment = req.query.sentiment as 'positive' | 'neutral' | 'negative' | undefined;
    const limit = parseInt(req.query.limit as string) || 50;

    if (!accountHandle) {
      res.status(400).json({ error: 'Missing query parameter: account' });
      return;
    }

    const mentions = await socialListeningService.getMentions(
      accountHandle,
      platform,
      sentiment,
      limit
    );

    res.json({ ok: true, mentions });
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: `Mention fetch failed: ${error}` });
  }
});

router.post('/hashtag', async (req: Request, res: Response): Promise<void> => {
  try {
    const metric = req.body as HashtagMetric;

    if (!metric.hashtag || !metric.platform) {
      res.status(400).json({
        error: 'Missing required fields: hashtag, platform',
      });
      return;
    }

    await socialListeningService.recordHashtagMetric({
      ...metric,
      lastUpdated: new Date(),
    });

    res.status(201).json({ ok: true, recorded: true });
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: `Hashtag metric recording failed: ${error}` });
  }
});

router.get('/hashtags', async (req: Request, res: Response): Promise<void> => {
  try {
    const platform = (req.query.platform as 'instagram' | 'tiktok') || 'instagram';
    const trend = req.query.trend as 'rising' | 'stable' | 'declining' | undefined;
    const limit = parseInt(req.query.limit as string) || 20;

    const hashtags = await socialListeningService.getHashtagMetrics(platform, trend, limit);

    res.json({ ok: true, hashtags });
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: `Hashtag fetch failed: ${error}` });
  }
});

router.post('/competitor-mention', async (req: Request, res: Response): Promise<void> => {
  try {
    const mention = req.body;

    if (!mention.competitorHandle || !mention.sourceHandle || !mention.content) {
      res.status(400).json({
        error: 'Missing required fields: competitorHandle, sourceHandle, content',
      });
      return;
    }

    const recorded = await socialListeningService.recordCompetitorMention({
      ...mention,
      mentionedAt: new Date(),
    });

    res.status(201).json({ ok: true, mention: recorded });
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: `Competitor mention recording failed: ${error}` });
  }
});

router.get('/competitor-mentions', async (req: Request, res: Response): Promise<void> => {
  try {
    const competitorHandle = req.query.competitor as string;
    const limit = parseInt(req.query.limit as string) || 50;

    if (!competitorHandle) {
      res.status(400).json({ error: 'Missing query parameter: competitor' });
      return;
    }

    const mentions = await socialListeningService.getCompetitorMentions(
      competitorHandle,
      limit
    );

    res.json({ ok: true, mentions });
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: `Competitor mention fetch failed: ${error}` });
  }
});

router.get('/sentiment', async (req: Request, res: Response): Promise<void> => {
  try {
    const accountHandle = req.query.account as string;
    const platform = (req.query.platform as 'instagram' | 'tiktok') || 'instagram';
    const days = parseInt(req.query.days as string) || 30;

    if (!accountHandle) {
      res.status(400).json({ error: 'Missing query parameter: account' });
      return;
    }

    const analysis = await socialListeningService.getSentimentAnalysis(
      accountHandle,
      platform,
      days
    );

    res.json({ ok: true, sentiment: analysis });
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: `Sentiment analysis failed: ${error}` });
  }
});

export default router;
