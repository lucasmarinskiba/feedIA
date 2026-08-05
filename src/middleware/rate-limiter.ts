/**
 * Sliding-window rate limiter — per-IP + per-API-key
 * No external dependency. Redis-optional (degrades to in-memory gracefully).
 *
 * Limits (per route group):
 *   ai      — 10 req/min  (generation endpoints: expensive)
 *   api     — 60 req/min  (standard API)
 *   auth    — 5 req/min   (auth-sensitive: prevent brute force)
 *   public  — 120 req/min (health, static)
 */

import { Request, Response, NextFunction } from 'express';
import { securityLogger } from './security-logger.js';

export type RateLimitGroup = 'ai' | 'api' | 'auth' | 'public';

interface WindowEntry {
  timestamps: number[];
}

// In-memory store — replaced per-key on every request via sliding window eviction
const store = new Map<string, WindowEntry>();

const LIMITS: Record<RateLimitGroup, { maxRequests: number; windowMs: number }> = {
  ai: { maxRequests: 10, windowMs: 60_000 },
  api: { maxRequests: 60, windowMs: 60_000 },
  auth: { maxRequests: 5, windowMs: 60_000 },
  public: { maxRequests: 120, windowMs: 60_000 },
};

// Clean up stale keys every 5 minutes to prevent memory leak
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    const maxWindow = Math.max(...Object.values(LIMITS).map((l) => l.windowMs));
    if (entry.timestamps.length === 0 || now - entry.timestamps[entry.timestamps.length - 1]! > maxWindow) {
      store.delete(key);
    }
  }
}, 5 * 60_000);

const getClientIp = (req: Request): string => {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    // Take first IP (leftmost = original client; rightmost could be injected)
    return forwarded.split(',')[0]?.trim() ?? '0.0.0.0';
  }
  return req.socket?.remoteAddress ?? '0.0.0.0';
};

const checkLimit = (key: string, group: RateLimitGroup): { allowed: boolean; remaining: number; resetMs: number } => {
  const { maxRequests, windowMs } = LIMITS[group];
  const now = Date.now();
  const entry = store.get(key) ?? { timestamps: [] };

  // Slide window: evict timestamps outside window
  const cutoff = now - windowMs;
  entry.timestamps = entry.timestamps.filter((ts) => ts > cutoff);

  const remaining = maxRequests - entry.timestamps.length;
  const oldest = entry.timestamps[0] ?? now;
  const resetMs = oldest + windowMs - now;

  if (remaining <= 0) {
    store.set(key, entry);
    return { allowed: false, remaining: 0, resetMs };
  }

  entry.timestamps.push(now);
  store.set(key, entry);
  return { allowed: true, remaining: remaining - 1, resetMs };
};

export const rateLimiter =
  (group: RateLimitGroup) =>
  (req: Request, res: Response, next: NextFunction): void => {
    const ip = getClientIp(req);
    const apiKey = (req.headers['x-api-key'] as string | undefined) ?? '';

    // Key per-IP and per-API-key (both tracked independently)
    const ipKey = `ip:${ip}:${group}`;
    const ipResult = checkLimit(ipKey, group);

    if (!ipResult.allowed) {
      securityLogger.rateLimitHit(req, ip, group);
      res.setHeader('Retry-After', Math.ceil(ipResult.resetMs / 1000));
      res.setHeader('X-RateLimit-Limit', LIMITS[group].maxRequests);
      res.setHeader('X-RateLimit-Remaining', 0);
      res.status(429).json({
        error: 'Too Many Requests',
        retryAfterSeconds: Math.ceil(ipResult.resetMs / 1000),
      });
      return;
    }

    if (apiKey) {
      const keyKey = `key:${apiKey.slice(0, 8)}:${group}`;
      const keyResult = checkLimit(keyKey, group);
      if (!keyResult.allowed) {
        securityLogger.rateLimitHit(req, ip, group);
        res.setHeader('Retry-After', Math.ceil(keyResult.resetMs / 1000));
        res.setHeader('X-RateLimit-Limit', LIMITS[group].maxRequests);
        res.setHeader('X-RateLimit-Remaining', 0);
        res.status(429).json({
          error: 'Too Many Requests',
          retryAfterSeconds: Math.ceil(keyResult.resetMs / 1000),
        });
        return;
      }
    }

    res.setHeader('X-RateLimit-Limit', LIMITS[group].maxRequests);
    res.setHeader('X-RateLimit-Remaining', ipResult.remaining);
    next();
  };

// Route-group router: maps path prefix → group
export const autoRateLimiter = (req: Request, res: Response, next: NextFunction): void => {
  const path = req.path;

  let group: RateLimitGroup = 'api';

  if (
    path.startsWith('/api/content') ||
    path.startsWith('/api/video') ||
    path.startsWith('/api/generate') ||
    path.startsWith('/api/master') ||
    path.startsWith('/api/prompts/expand') ||
    path.startsWith('/api/quality') ||
    path.startsWith('/api/creativity') ||
    path.startsWith('/api/carousel') ||
    path.startsWith('/api/studio')
  ) {
    group = 'ai';
  } else if (path.startsWith('/oauth') || path.startsWith('/api/settings')) {
    group = 'auth';
  } else if (path.startsWith('/health')) {
    group = 'public';
  }

  return rateLimiter(group)(req, res, next);
};
