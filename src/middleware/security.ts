/**
 * Security Middleware — Rate Limiting + API Auth
 *
 * Flow: Request → Check auth → Check rate limit → Allow/Reject
 *
 * Features:
 * - API key validation (service-to-service)
 * - Rate limiting per account/IP
 * - Audit logging of all requests
 */

import { Request, Response, NextFunction } from 'express';
import { debug, warn } from '../services/structured-logger.js';

// ─── Rate Limiter (In-Memory) ───────────────────────────────────────────

interface RateLimitBucket {
  requests: number;
  resetAt: number;
}

class RateLimiter {
  private buckets = new Map<string, RateLimitBucket>();
  private readonly windowMs = 60 * 1000; // 1 minute
  private readonly maxRequests = 100; // per minute

  isAllowed(key: string): boolean {
    const now = Date.now();
    const bucket = this.buckets.get(key);

    if (!bucket || now > bucket.resetAt) {
      // New window
      this.buckets.set(key, {
        requests: 1,
        resetAt: now + this.windowMs,
      });
      return true;
    }

    if (bucket.requests >= this.maxRequests) {
      // Rate limited
      return false;
    }

    bucket.requests++;
    return true;
  }

  getRemainingRequests(key: string): number {
    const bucket = this.buckets.get(key);
    if (!bucket) return this.maxRequests;
    return Math.max(0, this.maxRequests - bucket.requests);
  }

  cleanup(): void {
    const now = Date.now();
    for (const [key, bucket] of this.buckets.entries()) {
      if (now > bucket.resetAt) {
        this.buckets.delete(key);
      }
    }
  }
}

const rateLimiter = new RateLimiter();

// Cleanup every 5 minutes
setInterval(() => rateLimiter.cleanup(), 5 * 60 * 1000);

// ─── API Key Validation ─────────────────────────────────────────────────

/**
 * Validate API key (X-API-Key header)
 *
 * Valid keys:
 * - Service keys: sk_prod_* (for internal services)
 * - Webhook keys: wh_prod_* (for webhook integrations)
 */
const isValidApiKey = (key: string | undefined): boolean => {
  if (!key) return false;

  // Check format
  if (!/^(sk_prod|wh_prod)_/.test(key)) {
    return false;
  }

  // TODO: Validate against API key DB
  // For now, accept any well-formed key
  debug('[security] API key validated', { keyPrefix: key.substring(0, 10) });

  return true;
};

// ─── Middleware ─────────────────────────────────────────────────────────

/**
 * Rate limiting middleware
 *
 * Usage: app.use(rateLimitMiddleware);
 */
export const rateLimitMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  // Rate limit key: account ID or IP address
  const key = req.accountId || req.ip || 'unknown';

  if (!rateLimiter.isAllowed(key)) {
    const remaining = rateLimiter.getRemainingRequests(key);

    warn('[security] Rate limit exceeded', {
      key,
      remaining,
      requestId: req.requestId,
    });

    res.status(429).json({
      error: 'Too Many Requests',
      message: 'Rate limit exceeded. Max 100 requests per minute.',
      retryAfter: 60,
    });

    return;
  }

  // Set rate limit headers
  res.setHeader('X-RateLimit-Remaining', rateLimiter.getRemainingRequests(key));
  res.setHeader('X-RateLimit-Limit', 100);
  res.setHeader('X-RateLimit-Reset', new Date(Date.now() + 60 * 1000).toISOString());

  next();
};

/**
 * API key validation middleware
 *
 * Usage: app.use('/api/webhooks', apiKeyMiddleware);
 */
export const apiKeyMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const apiKey = req.get('X-API-Key');

  // Public endpoints (health checks, metrics) don't need auth
  const publicPaths = ['/health', '/metrics', '/api/predict'];
  if (publicPaths.some((path) => req.path.startsWith(path))) {
    next();
    return;
  }

  // Webhook endpoints require API key
  if (!isValidApiKey(apiKey)) {
    warn('[security] Invalid or missing API key', {
      path: req.path,
      requestId: req.requestId,
    });

    res.status(401).json({
      error: 'Unauthorized',
      message: 'Missing or invalid X-API-Key header',
    });

    return;
  }

  // Attach key to request for logging
  (req as unknown as Record<string, unknown>).apiKey = apiKey?.substring(0, 10);

  next();
};

/**
 * Audit logging middleware
 *
 * Logs all API requests with context
 * Usage: app.use(auditLoggingMiddleware);
 */
export const auditLoggingMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const startTime = Date.now();

  // Capture response
  const originalSend = res.send;

  res.send = function (data: unknown): Response {
    const duration = Date.now() - startTime;
    const status = res.statusCode;

    // Log audit entry
    const auditEntry = {
      timestamp: new Date().toISOString(),
      requestId: req.requestId,
      accountId: req.accountId ?? undefined,
      apiKey: (req as unknown as Record<string, unknown>).apiKey,
      method: req.method,
      path: req.path,
      status,
      durationMs: duration,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    };

    // Sensitive paths get extra logging
    if (req.path.startsWith('/api/realdata') || req.path.startsWith('/api/execute')) {
      debug('[audit] Webhook/action endpoint accessed', auditEntry);
    } else if (status >= 400) {
      warn('[audit] Request failed', auditEntry);
    } else {
      debug('[audit] Request succeeded', auditEntry);
    }

    return originalSend.call(this, data);
  };

  next();
};

/**
 * CORS + security headers middleware
 */
export const securityHeadersMiddleware = (_req: Request, res: Response, next: NextFunction): void => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGINS ?? '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-API-Key, X-Account-ID, X-Request-ID');

  // Security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');

  next();
};

export default {
  rateLimitMiddleware,
  apiKeyMiddleware,
  auditLoggingMiddleware,
  securityHeadersMiddleware,
};
