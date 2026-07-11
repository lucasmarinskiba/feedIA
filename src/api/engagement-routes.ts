/**
 * Engagement Routes
 *
 * POST /api/engagement/execute      — execute single engagement action
 * POST /api/engagement/schedule-routine — schedule daily engagement
 * GET  /api/engagement/metrics      — track engagement performance
 */

import express, { Request, Response } from 'express';
import { log } from '../agent/logger.js';
import { executeEngagementTask, scheduleDailyEngagementRoutine, getEngagementMetrics } from '../services/computer-use-orchestrator.js';

const router = express.Router();

/**
 * POST /api/engagement/execute
 * Execute single engagement action (like/comment/follow/story-view)
 */
router.post('/execute', async (req: Request, res: Response): Promise<void> => {
  try {
    const { accountId, action, targetPostId, targetAccountId, message } = req.body as {
      accountId: string;
      action: 'like' | 'comment' | 'story-view' | 'follow';
      targetPostId?: string;
      targetAccountId?: string;
      message?: string;
    };

    if (!accountId || !action) {
      res.status(400).json({ ok: false, error: 'accountId and action required' });
      return;
    }

    const result = await executeEngagementTask({
      accountId,
      action,
      targetPostId,
      targetAccountId,
      message,
    });

    log.info('[Engagement] Action executed', { accountId, action, success: result.success });

    res.json({
      ok: result.success,
      action: result.action,
      accountId: result.accountId,
      cost: result.cost,
      rateLimitReached: result.rateLimitReached,
      error: result.error,
    });
  } catch (err) {
    log.error('[Engagement] Execute failed', { error: String(err) });
    res.status(500).json({ ok: false, error: String(err) });
  }
});

/**
 * POST /api/engagement/schedule-routine
 * Schedule daily engagement routine (called by cron job)
 */
router.post('/schedule-routine', async (req: Request, res: Response): Promise<void> => {
  try {
    const { accountId } = req.body as { accountId: string };

    if (!accountId) {
      res.status(400).json({ ok: false, error: 'accountId required' });
      return;
    }

    const result = await scheduleDailyEngagementRoutine(accountId);

    log.info('[Engagement] Routine scheduled', { accountId, ...result });

    res.json({
      ok: true,
      accountId,
      executed: result.executed,
      skipped: result.skipped,
      errors: result.errors,
    });
  } catch (err) {
    log.error('[Engagement] Schedule routine failed', { error: String(err) });
    res.status(500).json({ ok: false, error: String(err) });
  }
});

/**
 * GET /api/engagement/metrics
 * Track engagement performance
 */
router.get('/metrics', (req: Request, res: Response): void => {
  try {
    const { accountId } = req.query as { accountId: string };

    if (!accountId) {
      res.status(400).json({ ok: false, error: 'accountId required' });
      return;
    }

    const metrics = getEngagementMetrics(accountId);

    log.info('[Engagement] Metrics retrieved', { accountId });

    res.json({
      ok: true,
      accountId,
      metrics,
    });
  } catch (err) {
    log.error('[Engagement] Metrics failed', { error: String(err) });
    res.status(500).json({ ok: false, error: String(err) });
  }
});

export default router;
