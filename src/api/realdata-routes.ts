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
    // Extract accountId from header, ensure it's a string
    let accountId = req.get('X-Account-ID');
    console.log('[conversion] raw header:', accountId, 'typeof:', typeof accountId);
    if (typeof accountId !== 'string' || !accountId) {
      accountId = String(req.headers['x-account-id'] || 'test-account');
    }
    accountId = String(accountId).trim();
    console.log('[conversion] final accountId:', accountId, 'typeof:', typeof accountId);
    const result = await recordConversion(accountId, req.body);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: String(err) });
  }
});

router.post('/webhook/engagement', async (req: Request, res: Response) => {
  try {
    let accountId = req.get('X-Account-ID');
    if (typeof accountId !== 'string' || !accountId) {
      accountId = String(req.headers['x-account-id'] || 'test-account');
    }
    accountId = String(accountId).trim();
    const result = await recordFanEngagement(accountId, req.body);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: String(err) });
  }
});

router.post('/webhook/lead', async (req: Request, res: Response) => {
  try {
    let accountId = req.get('X-Account-ID');
    if (typeof accountId !== 'string' || !accountId) {
      accountId = String(req.headers['x-account-id'] || 'test-account');
    }
    accountId = String(accountId).trim();
    const result = await recordLeadSignal(accountId, req.body);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: String(err) });
  }
});

router.get('/metrics', async (req: Request, res: Response) => {
  try {
    let accountId = req.get('X-Account-ID');
    if (typeof accountId !== 'string' || !accountId) {
      accountId = String(req.headers['x-account-id'] || 'test-account');
    }
    accountId = String(accountId).trim();
    const metrics = await getLiveMetrics(accountId);
    res.json(metrics);
  } catch (err) {
    res.status(400).json({ error: String(err) });
  }
});

export default router;
