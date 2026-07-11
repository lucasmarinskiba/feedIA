/**
 * Browserless Settings Routes
 *
 * User-managed Browserless API key storage
 * Each user provides their own key for automation
 *
 * POST   /api/settings/browserless/connect     — save user's Browserless key
 * GET    /api/settings/browserless/status      — check if key exists
 * POST   /api/settings/browserless/disconnect  — remove key
 */

import express, { Request, Response } from 'express';
import { log } from '../agent/logger.js';

const router = express.Router();

// In-memory storage: accountId → { key, timestamp }
const userBrowserlessKeys: Map<string, { key: string; timestamp: number }> = new Map();

/**
 * POST /api/settings/browserless/connect
 * Save user's Browserless API key
 */
router.post('/connect', (req: Request, res: Response): void => {
  try {
    const { accountId, apiKey } = req.body as { accountId: string; apiKey: string };

    if (!accountId || !apiKey) {
      res.status(400).json({ ok: false, error: 'accountId and apiKey required' });
      return;
    }

    // Store key with timestamp
    userBrowserlessKeys.set(accountId, { key: apiKey, timestamp: Date.now() });

    log.info('[BrowserlessSettings] Key stored', { accountId, keyLength: apiKey.length });

    res.json({
      ok: true,
      message: `Browserless key connected for ${accountId}`,
      accountId,
      connectedAt: new Date().toISOString(),
    });
  } catch (err) {
    log.error('[BrowserlessSettings] Connect failed', { error: String(err) });
    res.status(500).json({ ok: false, error: String(err) });
  }
});

/**
 * GET /api/settings/browserless/status
 * Check if Browserless key exists for account
 */
router.get('/status', (req: Request, res: Response): void => {
  try {
    const { accountId } = req.query as { accountId: string };

    if (!accountId) {
      res.status(400).json({ ok: false, error: 'accountId required' });
      return;
    }

    const keyData = userBrowserlessKeys.get(accountId);
    const connected = !!keyData;

    log.info('[BrowserlessSettings] Status checked', { accountId, connected });

    res.json({
      ok: true,
      connected,
      accountId,
      ...(connected && { connectedAt: new Date(keyData!.timestamp).toISOString() }),
    });
  } catch (err) {
    log.error('[BrowserlessSettings] Status check failed', { error: String(err) });
    res.status(500).json({ ok: false, error: String(err) });
  }
});

/**
 * POST /api/settings/browserless/disconnect
 * Remove user's Browserless key
 */
router.post('/disconnect', (req: Request, res: Response): void => {
  try {
    const { accountId } = req.body as { accountId: string };

    if (!accountId) {
      res.status(400).json({ ok: false, error: 'accountId required' });
      return;
    }

    userBrowserlessKeys.delete(accountId);

    log.info('[BrowserlessSettings] Key removed', { accountId });

    res.json({
      ok: true,
      message: `Browserless key disconnected for ${accountId}`,
      accountId,
    });
  } catch (err) {
    log.error('[BrowserlessSettings] Disconnect failed', { error: String(err) });
    res.status(500).json({ ok: false, error: String(err) });
  }
});

/**
 * Get Browserless key for account (internal use)
 */
export const getBrowserlessKey = (accountId: string): string | null => {
  const keyData = userBrowserlessKeys.get(accountId);
  return keyData?.key || null;
};

export default router;
