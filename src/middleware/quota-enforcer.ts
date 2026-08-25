/**
 * Quota Enforcer Middleware
 * Prevents unlimited content generation by checking & charging quotas
 * Atomic: check → generate → increment (no charges on failure)
 */

import { Request, Response, NextFunction } from 'express';
import { log } from '../agent/logger.js';
import { getPool } from '../db/postgres-real.js';
import { getOrCreateUserTier, tierConfig } from '../db/user-tiers.js';

export interface QuotaContext {
  userId: string;
  format: 'carousels' | 'stories' | 'videos';
  requestedCount: number;
  tier: string;
  allowed: boolean;
  used: number;
  limit: number;
  reason?: string;
}

/**
 * Check if user has quota available
 * Does NOT increment usage (read-only)
 */
export const checkFormatQuota = async (
  userId: string,
  format: 'carousels' | 'stories' | 'videos',
  requestedCount: number = 1,
): Promise<QuotaContext> => {
  try {
    const tier = await getOrCreateUserTier(userId);
    if (!tier) {
      return {
        userId,
        format,
        requestedCount,
        tier: 'unknown',
        allowed: false,
        used: 0,
        limit: 0,
        reason: 'User tier error',
      };
    }

    // Get tier limits
    const tierLimits = tierConfig[tier.tier];
    const formatKey = `${format}Limit` as keyof typeof tierLimits;
    const usageKey = `${format}UsedThisMonth` as keyof typeof tier;

    const limit = (tierLimits[formatKey] || 0) as number;
    const used = (tier[usageKey] || 0) as number;
    const available = limit - used;

    const allowed = available >= requestedCount;

    if (!allowed) {
      log.warn('[Quota] Limit reached', {
        userId,
        format,
        tier: tier.tier,
        requested: requestedCount,
        used,
        limit,
      });
    }

    return {
      userId,
      format,
      requestedCount,
      tier: tier.tier,
      allowed,
      used,
      limit,
      reason: !allowed ? `${format}: ${used}/${limit} used` : undefined,
    };
  } catch (err) {
    log.error('[Quota] Check error', { error: String(err), userId, format });
    return {
      userId,
      format,
      requestedCount,
      tier: 'error',
      allowed: false,
      used: 0,
      limit: 0,
      reason: 'Quota check failed',
    };
  }
};

/**
 * Increment quota usage ONLY after successful generation
 * Idempotent: same (userId, format, generationId) = no double-charge
 */
export const commitFormatUsage = async (
  userId: string,
  format: 'carousels' | 'stories' | 'videos',
  generationId: string,
  count: number = 1,
): Promise<boolean> => {
  try {
    const usageKey = `${format}UsedThisMonth` as keyof typeof tierConfig.free;

    // Atomic: INSERT OR IGNORE on unique constraint
    // Prevents duplicate charges if called twice with same generationId
    const result = await getPool().query(
      `INSERT INTO quota_usage_log (user_id, format, generation_id, count, recorded_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (generation_id) DO NOTHING`,
      [userId, format, generationId, count],
    );

    if (result.rowCount === 0) {
      // Already recorded (idempotent)
      log.info('[Quota] Already charged', { userId, format, generationId });
      return true;
    }

    // Update user tier table
    await getPool().query(
      `UPDATE user_tiers
       SET ${usageKey} = ${usageKey} + $1,
           updated_at = NOW()
       WHERE user_id = $2`,
      [count, userId],
    );

    log.info('[Quota] Charged', { userId, format, generationId, count });
    return true;
  } catch (err) {
    log.error('[Quota] Commit failed', { error: String(err), userId, format, generationId });
    return false;
  }
};

/**
 * Middleware: reject request if quota exhausted
 * Usage: app.post('/api/carousels/create', quotaCheckMiddleware('carousels', 1), handler)
 */
export const quotaCheckMiddleware = (format: 'carousels' | 'stories' | 'videos', count: number = 1) => async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.headers['x-user-id'] as string;
      if (!userId) {
        return res.status(401).json({ error: 'User ID required' });
      }

      const quota = await checkFormatQuota(userId, format, count);

      if (!quota.allowed) {
        return res.status(403).json({
          error: `${format.slice(0, -1)} limit reached`,
          format,
          used: quota.used,
          limit: quota.limit,
          remaining: Math.max(0, quota.limit - quota.used),
          tier: quota.tier,
        });
      }

      // Store in request for later use (Type: Record<string, unknown>)
      const extReq = req as unknown as Record<string, unknown>;
      extReq.quotaContext = quota;
      next();
    } catch (err) {
      log.error('[Quota Middleware] Error', { error: String(err) });
      res.status(500).json({ error: 'Quota check failed' });
    }
  };

/**
 * Charge quota AFTER successful generation
 * Should be called in success path only
 */
export const chargeQuota = async (req: Request, format: 'carousels' | 'stories' | 'videos', generationId: string): Promise<boolean> => {
  const userId = req.headers['x-user-id'] as string;
  if (!userId) return false;

  return await commitFormatUsage(userId, format, generationId, 1);
};
