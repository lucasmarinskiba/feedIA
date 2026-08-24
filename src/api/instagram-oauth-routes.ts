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
import { getPool } from '../db/postgres-real.js';

const router = express.Router();

const PLATFORM = 'instagram';

interface StoredToken {
  access_token: string;
  account_id: string | null;
  expires_at: Date | null;
  updated_at: Date;
}

/**
 * Persist a freshly issued token, replacing any previous one for this user.
 * user_social_tokens has UNIQUE(user_id, platform), so reconnecting updates in
 * place instead of accumulating rows.
 */
const saveToken = async (
  userId: string,
  accessToken: string,
  accountId: string,
  expiresInSeconds: number
): Promise<void> => {
  await getPool().query(
    `INSERT INTO user_social_tokens (user_id, platform, access_token, account_id, expires_at, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
     ON CONFLICT (user_id, platform) DO UPDATE SET
       access_token = EXCLUDED.access_token,
       account_id = EXCLUDED.account_id,
       expires_at = EXCLUDED.expires_at,
       updated_at = NOW()`,
    [userId, PLATFORM, accessToken, accountId, new Date(Date.now() + expiresInSeconds * 1000)]
  );
};

/**
 * Most recently refreshed non-expired token. Rows with a NULL expires_at are
 * treated as still valid — Instagram omits expires_in on some exchanges.
 */
const loadTokens = async (): Promise<StoredToken[]> => {
  const result = await getPool().query(
    `SELECT access_token, account_id, expires_at, updated_at
       FROM user_social_tokens
      WHERE platform = $1
        AND (expires_at IS NULL OR expires_at > NOW())
      ORDER BY updated_at DESC`,
    [PLATFORM]
  );
  return result.rows as StoredToken[];
};

// Where to send the user once the OAuth round-trip finishes. The API and the UI
// are on different origins — this service answers on Railway, while the app the
// user actually sees is the Vercel deployment — so a relative redirect would
// land them on this service's JSON root instead of back in the product.
const FRONTEND_URL = (
  process.env.FRONTEND_URL ||
  process.env.PUBLIC_BASE_URL ||
  'https://feedia.vercel.app'
).replace(/\/+$/, '');

/**
 * GET /oauth/instagram/connect
 * Redirects to Instagram authorization URL
 */
router.get('/connect', (req: Request, res: Response): void => {
  try {
    const clientId = process.env.INSTAGRAM_APP_ID || 'YOUR_APP_ID';
    const redirectUri = `${process.env.APP_URL || 'http://localhost:3000'}/oauth/instagram/callback`;
    const scope = 'instagram_business_basic,instagram_business_content_publish,instagram_business_manage_comments';

    // The token has to be filed against a FeedIA user, but the callback is a
    // fresh request from Instagram carrying no session. Round-tripping the id
    // through `state` is how social-automation-complete.ts already does it.
    const { userId } = req.query as { userId?: string };
    if (!userId) {
      res.status(400).json({
        ok: false,
        error: 'userId query parameter required so the token can be stored against an account',
      });
      return;
    }

    const instagramAuthUrl = `https://www.instagram.com/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}&response_type=code&state=${encodeURIComponent(userId)}`;

    log.info('[InstagramOAuth] Redirecting to Instagram login', { redirectUri, userId });
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

    // state carries the FeedIA user id set in /connect. Without it there is no
    // account to file the token against, so fail rather than store it loose.
    if (!state) {
      res.status(400).json({ ok: false, error: 'Missing state — restart the connection from the app' });
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

    const tokenData = (await tokenResponse.json()) as {
      access_token?: string;
      user_id?: string;
      expires_in?: number;
      error?: string;
    };

    if (!tokenData.access_token) {
      log.error('[InstagramOAuth] No token in response', { response: tokenData });
      res.status(400).json({ ok: false, error: 'No access token received' });
      return;
    }

    const accountId = tokenData.user_id || `account-${Date.now()}`;

    // Persisted rather than held in a Map: Railway replaces the container on
    // every deploy and restart, and an in-memory token would silently strand
    // every connected account.
    await saveToken(state, tokenData.access_token, accountId, tokenData.expires_in || 3600);

    log.info('[InstagramOAuth] Token stored', {
      accountId,
      userId: state,
      tokenLength: tokenData.access_token.length,
    });

    // Redirect to dashboard with success
    res.redirect(
      `${FRONTEND_URL}/?instagram_connected=true&account=${encodeURIComponent(accountId)}`
    );
  } catch (err) {
    log.error('[InstagramOAuth] Callback failed', { error: String(err) });
    res.redirect(`${FRONTEND_URL}/?instagram_error=${encodeURIComponent(String(err))}`);
  }
});

/**
 * GET /oauth/instagram/status
 * Check if Instagram is connected
 */
router.get('/status', async (_req: Request, res: Response): Promise<void> => {
  try {
    const rows = await loadTokens();
    const accounts = rows.map((row) => ({
      id: row.account_id,
      connectedAt: new Date(row.updated_at).toISOString(),
      expiresAt: row.expires_at ? new Date(row.expires_at).toISOString() : null,
    }));

    log.info('[InstagramOAuth] Status checked', {
      connected: accounts.length > 0,
      accountCount: accounts.length,
    });
    res.json({
      ok: true,
      connected: accounts.length > 0,
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
router.post('/disconnect', async (req: Request, res: Response): Promise<void> => {
  try {
    const { accountId } = req.body as { accountId: string };

    if (!accountId) {
      res.status(400).json({ ok: false, error: 'accountId required' });
      return;
    }

    const result = await getPool().query(
      `DELETE FROM user_social_tokens WHERE platform = $1 AND account_id = $2`,
      [PLATFORM, accountId]
    );

    if (result.rowCount === 0) {
      res.status(404).json({ ok: false, error: `No connected account ${accountId}` });
      return;
    }

    log.info('[InstagramOAuth] Token revoked', { accountId });
    res.json({ ok: true, message: `Disconnected from ${accountId}` });
  } catch (err) {
    log.error('[InstagramOAuth] Disconnect failed', { error: String(err) });
    res.status(500).json({ ok: false, error: String(err) });
  }
});

/**
 * Get token for polling (used by metricsPollingOrchestrator).
 *
 * Async since tokens moved to PostgreSQL. Returns the most recently refreshed
 * unexpired token, or null when nothing is connected or the database is
 * unreachable — callers already treat null as "not connected", so a database
 * problem degrades to skipping the cycle rather than throwing into a worker.
 */
export const getInstagramToken = async (): Promise<string | null> => {
  try {
    const rows = await loadTokens();
    return rows[0]?.access_token ?? null;
  } catch (err) {
    log.error('[InstagramOAuth] Token lookup failed', { error: String(err) });
    return null;
  }
};

export default router;
