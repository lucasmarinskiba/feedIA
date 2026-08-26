/**
 * User Accounts Management API
 * Connect / disconnect / manage multi-platform accounts (Instagram, TikTok, Facebook)
 * Independent quota tracking per account
 */

import { Router, Request, Response } from 'express';
import { log } from '../agent/logger.js';
import { toSingleString } from '../utils/query-param-helpers.js';
import { getUserTier } from '../db/user-tiers.js';
import {
  connectAccount,
  getUserAccounts,
  getAccount,
  disconnectAccount,
  updateAccountQuotaPercent,
  getOrCreateAccountQuota,
  checkAccountFormatQuota,
  incrementAccountFormatUsage,
  recordPublishedContent,
  updateContentMetrics,
  type Platform,
} from '../db/accounts.js';

const router = Router();

/**
 * List all connected accounts for user
 */
router.get('/list', async (req: Request, res: Response) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    if (!userId) return res.status(401).json({ error: 'User ID required' });

    const tier = await getUserTier(userId);
    if (!tier) return res.status(404).json({ error: 'User not found' });

    const accounts = await getUserAccounts(userId);

    return res.json({
      userId,
      tier: tier.tier,
      maxAccounts: tier.tier === 'free' ? 1 : tier.tier === 'starter' ? 3 : tier.tier === 'pro' ? 6 : 20,
      connectedAccounts: accounts.length,
      accounts: accounts.map((a) => ({
        id: a.id,
        platform: a.platform,
        handle: a.accountHandle,
        quotaPercent: a.monthlyQuotaPercent,
        connectedAt: a.createdAt,
      })),
    });
  } catch (err) {
    log.error('[Accounts List] Error', { error: String(err) });
    return res.status(500).json({ error: 'Failed to list accounts' });
  }
});

/**
 * Get account details + current quota
 */
router.get('/:accountId', async (req: Request, res: Response) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    if (!userId) return res.status(401).json({ error: 'User ID required' });

    const accountId = toSingleString(req.params.accountId);
    const account = await getAccount(accountId);

    if (!account || account.userId !== userId) {
      return res.status(404).json({ error: 'Account not found' });
    }

    const tier = await getUserTier(userId);
    if (!tier) return res.status(404).json({ error: 'User not found' });

    const quota = await getOrCreateAccountQuota(userId, accountId, tier.tier, {
      carousels: tier.carouselsLimit,
      stories: tier.storiesLimit,
      videos: tier.videosLimit,
    });

    return res.json({
      account: {
        id: account.id,
        platform: account.platform,
        handle: account.accountHandle,
        quotaPercent: account.monthlyQuotaPercent,
      },
      quota: {
        carousels: { used: quota.carouselsUsed, limit: quota.carouselsLimit },
        stories: { used: quota.storiesUsed, limit: quota.storiesLimit },
        videos: { used: quota.videosUsed, limit: quota.videosLimit },
        periodStart: quota.periodStart,
        periodEnd: quota.periodEnd,
      },
    });
  } catch (err) {
    log.error('[Accounts Get] Error', { error: String(err) });
    return res.status(500).json({ error: 'Failed to get account' });
  }
});

/**
 * Connect new account via OAuth callback
 * POST /api/accounts/connect/instagram with code from OAuth redirect
 */
router.post('/connect/:platform', async (req: Request, res: Response) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    if (!userId) return res.status(401).json({ error: 'User ID required' });

    const platform = toSingleString(req.params.platform);
    const { accountHandle, accountId, accessToken, refreshToken, expiresIn } = req.body;

    if (!['instagram', 'tiktok', 'facebook'].includes(platform)) {
      return res.status(400).json({ error: 'Invalid platform' });
    }

    if (!accountHandle || !accountId || !accessToken) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const tier = await getUserTier(userId);
    if (!tier) return res.status(404).json({ error: 'User not found' });

    const maxAccounts = tier.tier === 'free' ? 1 : tier.tier === 'starter' ? 3 : tier.tier === 'pro' ? 6 : 20;
    const currentAccounts = await getUserAccounts(userId);

    if (currentAccounts.length >= maxAccounts) {
      return res.status(403).json({
        error: `Maximum ${maxAccounts} accounts allowed for ${tier.tier} tier`,
        limit: maxAccounts,
        current: currentAccounts.length,
      });
    }

    const account = await connectAccount(
      userId,
      platform as Platform,
      accountHandle,
      accountId,
      accessToken,
      refreshToken,
      expiresIn,
    );

    log.info('[Accounts] Connected', { userId, platform, handle: accountHandle });

    return res.json({
      ok: true,
      account: {
        id: account.id,
        platform: account.platform,
        handle: account.accountHandle,
      },
    });
  } catch (err) {
    log.error('[Accounts Connect] Error', { error: String(err) });
    return res.status(500).json({ error: 'Connection failed' });
  }
});

/**
 * Disconnect account
 */
router.delete('/:accountId', async (req: Request, res: Response) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    if (!userId) return res.status(401).json({ error: 'User ID required' });

    const accountId = toSingleString(req.params.accountId);
    const account = await getAccount(accountId);

    if (!account || account.userId !== userId) {
      return res.status(404).json({ error: 'Account not found' });
    }

    const success = await disconnectAccount(accountId, userId);
    if (!success) return res.status(500).json({ error: 'Disconnection failed' });

    log.info('[Accounts] Disconnected', { userId, accountId, handle: account.accountHandle });

    return res.json({ ok: true, message: 'Account disconnected' });
  } catch (err) {
    log.error('[Accounts Disconnect] Error', { error: String(err) });
    return res.status(500).json({ error: 'Disconnection failed' });
  }
});

/**
 * Update account quota allocation (% of tier's limit)
 */
router.put('/:accountId/quota', async (req: Request, res: Response) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    if (!userId) return res.status(401).json({ error: 'User ID required' });

    const accountId = toSingleString(req.params.accountId);
    const { percent } = req.body;

    if (!percent || percent < 1 || percent > 100) {
      return res.status(400).json({ error: 'Quota percent must be 1-100' });
    }

    const account = await getAccount(accountId);
    if (!account || account.userId !== userId) {
      return res.status(404).json({ error: 'Account not found' });
    }

    const success = await updateAccountQuotaPercent(accountId, percent);
    if (!success) return res.status(500).json({ error: 'Update failed' });

    return res.json({ ok: true, quotaPercent: percent });
  } catch (err) {
    log.error('[Accounts Quota] Error', { error: String(err) });
    return res.status(500).json({ error: 'Quota update failed' });
  }
});

/**
 * Check if account can generate content (quota check)
 */
router.post('/:accountId/check-quota', async (req: Request, res: Response) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    if (!userId) return res.status(401).json({ error: 'User ID required' });

    const accountId = toSingleString(req.params.accountId);
    const { format, count } = req.body;

    if (!['carousels', 'stories', 'videos'].includes(format)) {
      return res.status(400).json({ error: 'Invalid format' });
    }

    const account = await getAccount(accountId);
    if (!account || account.userId !== userId) {
      return res.status(404).json({ error: 'Account not found' });
    }

    const result = await checkAccountFormatQuota(accountId, format, count || 1);

    return res.json({
      allowed: result.allowed,
      used: result.used,
      limit: result.limit,
      remaining: result.limit - result.used,
      reason: result.reason,
    });
  } catch (err) {
    log.error('[Accounts Check Quota] Error', { error: String(err) });
    return res.status(500).json({ error: 'Quota check failed' });
  }
});

/**
 * Record published content to account
 * Called after successful post to Instagram/TikTok
 */
router.post('/:accountId/content/record', async (req: Request, res: Response) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    if (!userId) return res.status(401).json({ error: 'User ID required' });

    const accountId = toSingleString(req.params.accountId);
    const { contentId, format, publishedAt } = req.body;

    if (!['carousel', 'story', 'video', 'post'].includes(format)) {
      return res.status(400).json({ error: 'Invalid format' });
    }

    const account = await getAccount(accountId);
    if (!account || account.userId !== userId) {
      return res.status(404).json({ error: 'Account not found' });
    }

    const content = await recordPublishedContent(
      userId,
      accountId,
      account.platform,
      contentId,
      format,
      new Date(publishedAt),
    );

    // Increment quota usage
    await incrementAccountFormatUsage(
      accountId,
      format === 'carousel' ? 'carousels' : format === 'story' ? 'stories' : 'videos',
    );

    log.info('[Accounts] Content recorded', { userId, accountId, contentId, format });

    return res.json({ ok: true, contentId: content.id });
  } catch (err) {
    log.error('[Accounts Record Content] Error', { error: String(err) });
    return res.status(500).json({ error: 'Failed to record content' });
  }
});

/**
 * Update content metrics (likes, comments, etc.)
 * Called during metrics polling from Instagram/TikTok APIs
 */
router.put('/:accountId/content/:contentId/metrics', async (req: Request, res: Response) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    if (!userId) return res.status(401).json({ error: 'User ID required' });

    const contentId = toSingleString(req.params.contentId);
    const { metrics } = req.body;

    if (!metrics || typeof metrics !== 'object') {
      return res.status(400).json({ error: 'Metrics object required' });
    }

    const success = await updateContentMetrics(contentId, metrics);
    if (!success) return res.status(404).json({ error: 'Content not found' });

    return res.json({ ok: true });
  } catch (err) {
    log.error('[Accounts Update Metrics] Error', { error: String(err) });
    return res.status(500).json({ error: 'Update failed' });
  }
});

export default router;
