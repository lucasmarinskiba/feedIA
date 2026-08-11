/**
 * Real Data Sync Routes — Webhook Handlers
 *
 * POST /api/realdata/webhook/conversion
 * POST /api/realdata/webhook/engagement
 * POST /api/realdata/webhook/lead
 */

import { Router, Request, Response } from 'express';
import { recordConversion, recordFanEngagement, recordLeadSignal, getLiveMetrics } from '../services/real-data-sync.js';

const router = Router();

router.post('/webhook/conversion', async (req: Request, res: Response) => {
  try {
    // Extract accountId from header
    const headerAccountId = req.get('X-Account-ID');
    const accountId = headerAccountId || 'test-account';
    const result = await recordConversion(accountId, req.body);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: String(err) });
  }
});

router.post('/webhook/engagement', async (req: Request, res: Response) => {
  try {
    const accountId = req.get('X-Account-ID') || 'test-account';
    const result = await recordFanEngagement(accountId, req.body);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: String(err) });
  }
});

router.post('/webhook/lead', async (req: Request, res: Response) => {
  try {
    const accountId = req.get('X-Account-ID') || 'test-account';
    const result = await recordLeadSignal(accountId, req.body);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: String(err) });
  }
});

router.get('/metrics', async (req: Request, res: Response) => {
  try {
    const accountId = req.get('X-Account-ID') || 'test-account';
    const metrics = await getLiveMetrics(accountId);
    res.json(metrics);
  } catch (err) {
    res.status(400).json({ error: String(err) });
  }
});

export default router;
