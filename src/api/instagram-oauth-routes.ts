/**
 * Instagram OAuth Routes
 *
 * Simplified Instagram Business Account authorization.
 * No complexity exposed to user — just click "Connect Instagram" button.
 *
 * GET  /oauth/instagram/connect       — redirect to Instagram login
 * GET  /oauth/instagram/callback      — handle OAuth return (auto-saves token)
 * GET  /oauth/instagram/status        — check connection status
 * POST /oauth/instagram/disconnect    — revoke token
 */

import express, { Request, Response } from 'express';
import { log } from '../agent/logger.js';

const router = express.Router();

// Placeholder: real implementation uses userRegistry + OAuth lib
// For MVP: just store token in-memory + .env

const connectedAccounts: Map<string, { token: string; timestamp: number }> = new Map();

/**
 * GET /oauth/instagram/connect
 * Redirects to Instagram authorization URL
 */
router.get('/connect', (_req: Request, res: Response): void => {
  try {
    const clientId = process.env.INSTAGRAM_APP_ID || 'YOUR_APP_ID';
    const redirectUri = `${process.env.APP_URL || 'http://localhost:3000'}/oauth/instagram/callback`;
    const scope = 'instagram_business_basic,instagram_business_content_publish,instagram_business_manage_comments';

    const instagramAuthUrl = `https://www.instagram.com/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}&response_type=code`;

    log.info('[InstagramOAuth] Redirecting to Instagram login', { redirectUri });
    res.redirect(instagramAuthUrl);
  } catch (err) {
    log.error('[InstagramOAuth] Connect failed', { error: String(err) });
    res.status(500).json({ ok: false, error: String(err) });
  }
});

/**
 * GET /oauth/instagram/callback
 * Instagram redirects here with authorization code
 * Exchange code for token via Instagram Graph API
 */
router.get('/callback', async (req: Request, res: Response): Promise<void> => {
  try {
    const { code, state } = req.query as { code: string; state: string };

    if (!code) {
      res.status(400).json({ ok: false, error: 'No authorization code received' });
      return;
    }

    const clientId = process.env.INSTAGRAM_APP_ID;
    const clientSecret = process.env.INSTAGRAM_APP_SECRET;
    const redirectUri = `${process.env.APP_URL || 'http://localhost:3000'}/oauth/instagram/callback`;

    if (!clientId || !clientSecret) {
      log.error('[InstagramOAuth] Missing credentials for token exchange');
      res.status(500).json({ ok: false, error: 'Server not configured for Instagram OAuth' });
      return;
    }

    // Exchange code for token via Instagram Graph API
    // POST https://graph.instagram.com/v18.0/oauth/access_token
    const tokenUrl = 'https://graph.instagram.com/v18.0/oauth/access_token';
    const params = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
      code,
    });

    log.info('[InstagramOAuth] Exchanging code for token', { code: code.substring(0, 10) + '...' });

    const tokenResponse = await fetch(tokenUrl, {
      method: 'POST',
      body: params,
    });

    if (!tokenResponse.ok) {
      const errorData = (await tokenResponse.json()) as { error?: { message: string } };
      log.error('[InstagramOAuth] Token exchange failed', {
        status: tokenResponse.status,
        error: errorData.error?.message,
      });
      res.status(400).json({ ok: false, error: `Instagram auth failed: ${errorData.error?.message || 'unknown error'}` });
      return;
    }

    const tokenData = (await tokenResponse.json()) as { access_token?: string; user_id?: string; error?: string };

    if (!tokenData.access_token) {
      log.error('[InstagramOAuth] No token in response', { response: tokenData });
      res.status(400).json({ ok: false, error: 'No access token received' });
      return;
    }

    // Store token in memory (production: database + encryption)
    const accountId = tokenData.user_id || `account-${Date.now()}`;
    connectedAccounts.set(accountId, { token: tokenData.access_token, timestamp: Date.now() });

    log.info('[InstagramOAuth] Token stored', { accountId, tokenLength: tokenData.access_token.length });

    // Redirect to dashboard with success
    res.redirect(`/?instagram_connected=true&account=${accountId}`);
  } catch (err) {
    log.error('[InstagramOAuth] Callback failed', { error: String(err) });
    res.redirect(`/?instagram_error=${encodeURIComponent(String(err))}`);
  }
});

/**
 * GET /oauth/instagram/status
 * Check if Instagram is connected
 */
router.get('/status', (_req: Request, res: Response): void => {
  try {
    const connected = connectedAccounts.size > 0;
    const accounts = Array.from(connectedAccounts.entries()).map(([id, data]) => ({
      id,
      connectedAt: new Date(data.timestamp).toISOString(),
    }));

    log.info('[InstagramOAuth] Status checked', { connected, accountCount: accounts.length });
    res.json({
      ok: true,
      connected,
      accounts,
    });
  } catch (err) {
    log.error('[InstagramOAuth] Status check failed', { error: String(err) });
    res.status(500).json({ ok: false, error: String(err) });
  }
});

/**
 * POST /oauth/instagram/disconnect
 * Revoke Instagram token
 */
router.post('/disconnect', (req: Request, res: Response): void => {
  try {
    const { accountId } = req.body as { accountId: string };

    if (!accountId) {
      res.status(400).json({ ok: false, error: 'accountId required' });
      return;
    }

    connectedAccounts.delete(accountId);
    log.info('[InstagramOAuth] Token revoked', { accountId });

    res.json({ ok: true, message: `Disconnected from ${accountId}` });
  } catch (err) {
    log.error('[InstagramOAuth] Disconnect failed', { error: String(err) });
    res.status(500).json({ ok: false, error: String(err) });
  }
});

/**
 * Get token for polling (used by metricsPollingOrchestrator)
 */
export const getInstagramToken = (): string | null => {
  if (connectedAccounts.size === 0) return null;
  const firstAccount = Array.from(connectedAccounts.values())[0];
  return firstAccount?.token || null;
};

export default router;
