/**
 * Role-Based Access Control Middleware
 * Verifies user tier permissions before executing endpoint
 */

import type { Request, Response } from 'express';
import { query } from '../db/client.js';
import type { UserTier } from '../db/client.js';

/**
 * Role permissions map
 */
const PERMISSIONS = {
  free: {
    campaigns: 5,
    batch_size: 1,
    custom_branding: false,
    analytics_depth: 'basic' as const,
    api_calls_per_month: 10000,
  },
  pro: {
    campaigns: 50,
    batch_size: 10,
    custom_branding: true,
    analytics_depth: 'advanced' as const,
    api_calls_per_month: 100000,
  },
  agency: {
    campaigns: 'unlimited',
    batch_size: 100,
    custom_branding: true,
    analytics_depth: 'advanced' as const,
    api_calls_per_month: 1000000,
  },
};

/**
 * Middleware: Check user tier + enforce limits
 * Attach tier to request
 */
export const checkTier = async (req: Request, res: Response, next: () => void): Promise<void> => {
  try {
    const userId = (req as any).userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // Get user tier
    const result = await query('SELECT * FROM user_tiers WHERE user_id = $1', [userId]);
    if (result.rowCount === 0) {
      res.status(404).json({ error: 'User tier not found' });
      return;
    }

    const tier = result.rows[0] as UserTier;
    (req as any).userTier = tier;
    (req as any).permissions = PERMISSIONS[tier.tier];

    next();
  } catch (err) {
    console.error('[RBAC] Tier check error:', err);
    res.status(500).json({ error: 'Permission check failed' });
  }
};

/**
 * Middleware: Check campaign limit
 * Verify user hasn't exceeded campaign quota
 */
export const checkCampaignLimit = async (req: Request, res: Response, next: () => void): Promise<void> => {
  try {
    const userId = (req as any).userId;
    const tier = (req as any).userTier as UserTier;

    if (tier.tier === 'agency') {
      next();
      return;
    }

    // Check limit
    if (tier.campaigns_used_this_month >= tier.campaigns_limit) {
      res.status(403).json({
        error: 'Campaign limit reached',
        limit: tier.campaigns_limit,
        used: tier.campaigns_used_this_month,
        tier: tier.tier,
      });
      return;
    }

    next();
  } catch (err) {
    console.error('[RBAC] Campaign limit check error:', err);
    res.status(500).json({ error: 'Campaign limit check failed' });
  }
};

/**
 * Middleware: Check batch size limit
 */
export const checkBatchLimit = async (req: Request, res: Response, next: () => void): Promise<void> => {
  try {
    const permissions = (req as any).permissions;
    const { items } = req.body;

    const limit = permissions.batch_size === 'unlimited' ? 1000 : permissions.batch_size;

    if (items && Array.isArray(items) && items.length > limit) {
      res.status(403).json({
        error: 'Batch size limit exceeded',
        limit,
        requested: items.length,
        tier: (req as any).userTier.tier,
      });
      return;
    }

    next();
  } catch (err) {
    console.error('[RBAC] Batch limit check error:', err);
    res.status(500).json({ error: 'Batch limit check failed' });
  }
};

/**
 * Middleware: Check branding permissions
 */
export const checkBrandingPermission = async (req: Request, res: Response, next: () => void): Promise<void> => {
  try {
    const permissions = (req as any).permissions;

    if (!permissions.custom_branding) {
      res.status(403).json({
        error: 'Custom branding not available on this tier',
        tier: (req as any).userTier.tier,
        upgrade_to: 'pro',
      });
      return;
    }

    next();
  } catch (err) {
    console.error('[RBAC] Branding permission check error:', err);
    res.status(500).json({ error: 'Permission check failed' });
  }
};

/**
 * Middleware: Check analytics depth
 */
export const checkAnalyticsAccess = async (req: Request, res: Response, next: () => void): Promise<void> => {
  try {
    const permissions = (req as any).permissions;
    const requestedDepth = req.query['depth'] || 'basic';

    if (requestedDepth === 'advanced' && permissions.analytics_depth === 'basic') {
      res.status(403).json({
        error: 'Advanced analytics not available on this tier',
        tier: (req as any).userTier.tier,
        upgrade_to: 'pro',
      });
      return;
    }

    next();
  } catch (err) {
    console.error('[RBAC] Analytics access check error:', err);
    res.status(500).json({ error: 'Permission check failed' });
  }
};

/**
 * Middleware: Increment campaign usage
 * Call this after campaign creation
 */
export const incrementCampaignUsage = async (req: Request, res: Response, next: () => void): Promise<void> => {
  try {
    const userId = (req as any).userId;
    const tier = (req as any).userTier as UserTier;

    if (tier.tier !== 'agency') {
      await query(
        'UPDATE user_tiers SET campaigns_used_this_month = campaigns_used_this_month + 1 WHERE user_id = $1',
        [userId]
      );
    }

    next();
  } catch (err) {
    console.error('[RBAC] Campaign usage increment error:', err);
    res.status(500).json({ error: 'Usage tracking failed' });
  }
};

/**
 * Get user tier info (for diagnostics)
 */
export const getTierInfo = async (userId: string): Promise<any> => {
  const result = await query('SELECT * FROM user_tiers WHERE user_id = $1', [userId]);
  if (result.rowCount === 0) return null;

  const tier = result.rows[0] as UserTier;
  return {
    tier: tier.tier,
    permissions: PERMISSIONS[tier.tier],
    usage: {
      campaigns: `${tier.campaigns_used_this_month}/${tier.campaigns_limit}`,
    },
  };
};
