/**
 * Redis-backed rate limiter middleware
 * Limits requests per user/IP
 */

import type { Request, Response, NextFunction } from 'express';
import { checkRateLimit } from '../cache/redis-client.js';

interface RateLimitConfig {
  limit: number;
  windowSeconds: number;
  keyGenerator?: (req: Request) => string;
}

const defaultConfig: RateLimitConfig = {
  limit: 100,
  windowSeconds: 60,
  keyGenerator: (req: Request) => {
    const userId = (req as any).userId || req.ip || 'anonymous';
    return `ratelimit:${userId}`;
  },
};

export const redisRateLimiter = (config: Partial<RateLimitConfig> = {}) => {
  const merged = { ...defaultConfig, ...config };

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = (req as any).userId || req.ip || 'anonymous';
      const allowed = await checkRateLimit(userId, merged.limit, merged.windowSeconds);

      if (!allowed) {
        res.status(429).json({
          error: 'Rate limit exceeded',
          retryAfter: merged.windowSeconds,
        });
        return;
      }

      next();
    } catch (err) {
      console.error('[RateLimit] Check error:', err);
      next(); // Fail open on error
    }
  };
};

/**
 * Strict rate limiter for auth endpoints (lower limits)
 */
export const authRateLimiter = redisRateLimiter({
  limit: 5,
  windowSeconds: 60, // 5 attempts per minute
});

/**
 * API rate limiter for general endpoints
 */
export const apiRateLimiter = redisRateLimiter({
  limit: 100,
  windowSeconds: 60,
});

/**
 * Generous rate limiter for authenticated users
 */
export const authenticatedRateLimiter = redisRateLimiter({
  limit: 1000,
  windowSeconds: 60,
});
