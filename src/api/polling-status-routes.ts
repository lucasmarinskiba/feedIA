/**
 * Polling Status Routes
 *
 * GET  /api/polling/stats        — queue status
 * POST /api/polling/register      — manually register post for polling
 * POST /api/polling/trigger-cycle — manually trigger one polling cycle (testing)
 */

import express, { Request, Response } from 'express';
import { log } from '../agent/logger.js';
import { registerPostForPolling, getPollingStats } from '../workers/metricsPollingOrchestrator.js';

const router = express.Router();

/**
 * GET /api/polling/stats
 * Returns polling queue status
 */
router.get('/stats', (_req: Request, res: Response): void => {
  try {
    const stats = getPollingStats();
    log.info('[PollingStatus] Stats queried', stats);
    res.json({
      ok: true,
      ...stats,
      timestamp: Date.now(),
    });
  } catch (err) {
    log.error('[PollingStatus] Stats query failed', { error: String(err) });
    res.status(500).json({ ok: false, error: String(err) });
  }
});

/**
 * POST /api/polling/register
 * Manually register post for polling cycles
 * Body: { postId, accountId, platform, format, variantSetId?, niche? }
 */
router.post('/register', (req: Request, res: Response): void => {
  try {
    const { postId, accountId, platform, format, variantSetId, niche } = req.body as {
      postId: string;
      accountId: string;
      platform: 'instagram' | 'tiktok';
      format: 'carousel' | 'reel' | 'story' | 'tiktok-video' | 'tiktok-photo';
      variantSetId?: string;
      niche?: string;
    };

    if (!postId || !accountId || !platform || !format) {
      res.status(400).json({ ok: false, error: 'Missing required fields' });
      return;
    }

    registerPostForPolling(postId, accountId, platform, format, variantSetId, niche);

    log.info('[PollingStatus] Post manually registered', { postId, accountId });
    res.json({
      ok: true,
      message: `Post ${postId} registered for polling (4h/15-30m/7d cycles)`,
      postId,
    });
  } catch (err) {
    log.error('[PollingStatus] Registration failed', { error: String(err) });
    res.status(500).json({ ok: false, error: String(err) });
  }
});

/**
 * POST /api/polling/trigger-cycle
 * Manually trigger one polling cycle (for testing)
 * Body: { cycle: 'metrics' | 'engagement' | 'feedback' }
 */
router.post('/trigger-cycle', (req: Request, res: Response): void => {
  try {
    const { cycle } = req.body as { cycle: 'metrics' | 'engagement' | 'feedback' };

    if (!cycle || !['metrics', 'engagement', 'feedback'].includes(cycle)) {
      res.status(400).json({ ok: false, error: 'cycle must be metrics|engagement|feedback' });
      return;
    }

    // TODO: Implement manual trigger
    // For now, just acknowledge the request
    log.info('[PollingStatus] Manual cycle trigger requested', { cycle });

    res.json({
      ok: true,
      message: `Manual ${cycle} cycle triggered (polling queue will execute on next scheduled check)`,
      cycle,
      nextCheck: {
        metrics: 'every 4 hours',
        engagement: 'every 15-30 minutes',
        feedback: 'every 7 days',
      },
    });
  } catch (err) {
    log.error('[PollingStatus] Trigger failed', { error: String(err) });
    res.status(500).json({ ok: false, error: String(err) });
  }
});

export default router;
