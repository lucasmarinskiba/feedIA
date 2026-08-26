/**
 * Instagram OAuth Flow
 * Redirect → Auth → Callback → Token Storage
 */

import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { log } from '../agent/logger.js';
import { connectAccount, getUserAccounts } from '../db/accounts.js';
import { getUserTier } from '../db/user-tiers.js';

const router = Router();

// In production, use environment variables
const INSTAGRAM_APP_ID = process.env.INSTAGRAM_APP_ID || '';
const INSTAGRAM_APP_SECRET = process.env.INSTAGRAM_APP_SECRET || '';
const INSTAGRAM_REDIRECT_URI = process.env.INSTAGRAM_REDIRECT_URI || 'https://feedia-production.up.railway.app/api/oauth/instagram/callback';

// Store state tokens for CSRF protection
const stateTokens = new Map<string, { userId: string; createdAt: number }>();

/**
 * Initiate Instagram OAuth flow
 * GET /api/oauth/instagram/authorize?userId={userId}
 */
router.get('/authorize', (req: Request, res: Response) => {
  try {
    const userId = req.query.userId as string;
    if (!userId) return res.status(400).json({ error: 'userId required' });

    // Generate state token (CSRF protection)
    const state = crypto.randomBytes(32).toString('hex');
    stateTokens.set(state, { userId, createdAt: Date.now() });

    // Cleanup old state tokens (>10min)
    for (const [key, val] of stateTokens.entries()) {
      if (Date.now() - val.createdAt > 10 * 60 * 1000) {
        stateTokens.delete(key);
      }
    }

    // Instagram OAuth URL
    const scope = 'instagram_basic,instagram_content_publish';
    const authUrl = `https://api.instagram.com/oauth/authorize?client_id=${INSTAGRAM_APP_ID}&redirect_uri=${encodeURIComponent(
      INSTAGRAM_REDIRECT_URI,
    )}&scope=${encodeURIComponent(scope)}&response_type=code&state=${state}`;

    return res.json({ authUrl });
  } catch (err) {
    log.error('[OAuth Authorize] Error', { error: String(err) });
    return res.status(500).json({ error: 'Authorization failed' });
  }
});

/**
 * Instagram OAuth callback
 * GET /api/oauth/instagram/callback?code={code}&state={state}
 */
router.get('/callback', async (req: Request, res: Response) => {
  try {
    const { code, state } = req.query as Record<string, string>;

    if (!code || !state) {
      return res.status(400).json({ error: 'code and state required' });
    }

    // Verify state token
    const stateData = stateTokens.get(state);
    if (!stateData) {
      return res.status(401).json({ error: 'Invalid state token' });
    }

    if (Date.now() - stateData.createdAt > 10 * 60 * 1000) {
      stateTokens.delete(state);
      return res.status(401).json({ error: 'State token expired' });
    }

    const userId = stateData.userId;
    stateTokens.delete(state);

    // Check tier limits
    const tier = await getUserTier(userId);
    if (!tier) return res.status(404).json({ error: 'User not found' });

    const maxAccounts = tier.tier === 'free' ? 1 : tier.tier === 'starter' ? 3 : tier.tier === 'pro' ? 6 : 20;
    const accounts = await getUserAccounts(userId);

    if (accounts.length >= maxAccounts) {
      return res.status(403).json({
        error: `Maximum ${maxAccounts} accounts for ${tier.tier} tier`,
        limit: maxAccounts,
        current: accounts.length,
      });
    }

    // Exchange code for token
    const tokenResponse = await fetch('https://graph.instagram.com/v18.0/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: INSTAGRAM_APP_ID,
        client_secret: INSTAGRAM_APP_SECRET,
        grant_type: 'authorization_code',
        redirect_uri: INSTAGRAM_REDIRECT_URI,
        code,
      }).toString(),
    });

    if (!tokenResponse.ok) {
      log.error('[OAuth Callback] Token exchange failed', {
        status: tokenResponse.status,
        userId,
      });
      return res.status(400).json({ error: 'Token exchange failed' });
    }

    const tokenData = (await tokenResponse.json()) as Record<string, unknown>;
    const accessToken = String(tokenData.access_token || '');
    const userId_ig = String(tokenData.user_id || '');

    if (!accessToken || !userId_ig) {
      return res.status(400).json({ error: 'Invalid token response' });
    }

    // Get user info (username)
    const userResponse = await fetch(
      `https://graph.instagram.com/v18.0/${userId_ig}?fields=username&access_token=${accessToken}`,
    );

    if (!userResponse.ok) {
      log.error('[OAuth Callback] User info failed', { status: userResponse.status });
      return res.status(400).json({ error: 'Failed to fetch user info' });
    }

    const userData = (await userResponse.json()) as Record<string, unknown>;
    const username = String(userData.username || `user_${userId_ig}`);

    // Store in database
    const account = await connectAccount(userId, 'instagram', username, userId_ig, accessToken);

    log.info('[OAuth] Instagram connected', { userId, handle: username });

    return res.json({
      ok: true,
      redirectUrl: `/studio?account=${account.id}&platform=instagram`,
      account: {
        id: account.id,
        platform: 'instagram',
        handle: username,
      },
    });
  } catch (err) {
    log.error('[OAuth Callback] Error', { error: String(err) });
    return res.status(500).json({ error: 'Callback failed' });
  }
});

export default router;
