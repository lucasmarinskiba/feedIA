/**
 * API Key authentication middleware
 *
 * Keys read from env:
 *   FEEDIA_API_KEY      — standard API access (required for all /api/* routes)
 *   FEEDIA_ADMIN_KEY    — admin access (/api/admin/*)
 *
 * Multiple keys: comma-separated (FEEDIA_API_KEY=key1,key2,key3)
 * Header: X-API-Key or Authorization: Bearer <key>
 *
 * Timing-safe comparison prevents timing oracle attacks.
 * If FEEDIA_API_KEY is not set, auth is skipped (dev mode).
 */

import { Request, Response, NextFunction } from 'express';
import { timingSafeEqual, createHash } from 'crypto';
import { securityLogger } from './security-logger.js';

const parseKeyList = (env: string | undefined): Buffer[] => {
  if (!env) return [];
  return env
    .split(',')
    .map((k) => k.trim())
    .filter((k) => k.length > 0)
    .map((k) => Buffer.from(k, 'utf8'));
};

// Load keys once at module init — no per-request env reads
const API_KEYS: Buffer[] = parseKeyList(process.env.FEEDIA_API_KEY);
const ADMIN_KEYS: Buffer[] = parseKeyList(process.env.FEEDIA_ADMIN_KEY);

const AUTH_ENABLED = API_KEYS.length > 0;
const ADMIN_ENABLED = ADMIN_KEYS.length > 0;

const extractKey = (req: Request): string | null => {
  const xApiKey = req.headers['x-api-key'];
  if (typeof xApiKey === 'string' && xApiKey.length > 0) return xApiKey;

  const authHeader = req.headers['authorization'];
  if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }

  return null;
};

const timingSafeMatch = (candidate: string, validKeys: Buffer[]): boolean => {
  if (validKeys.length === 0) return false;
  const candidateBuf = Buffer.from(candidate, 'utf8');

  let matched = false;
  for (const key of validKeys) {
    // Always compare all keys (prevent early-exit timing leak)
    // Pad to same length before comparison
    const a =
      candidateBuf.length === key.length
        ? candidateBuf
        : Buffer.concat([candidateBuf, Buffer.alloc(Math.max(0, key.length - candidateBuf.length))]);
    const b =
      candidateBuf.length === key.length
        ? key
        : Buffer.concat([key, Buffer.alloc(Math.max(0, candidateBuf.length - key.length))]);

    try {
      if (a.length === b.length && timingSafeEqual(a, b)) {
        matched = true;
      }
    } catch {
      // length mismatch — already handled above, but never crash
    }
  }
  return matched;
};

// Public paths that skip auth entirely
const PUBLIC_PATHS = new Set(['/health', '/health/scaling', '/']);

const isPublicPath = (path: string): boolean => {
  if (PUBLIC_PATHS.has(path)) return true;
  if (path.startsWith('/oauth/instagram')) return true; // OAuth flow
  return false;
};

/**
 * Authenticate all /api/* routes.
 * No-op if FEEDIA_API_KEY env var not set (dev mode).
 */
export const apiKeyAuth = (req: Request, res: Response, next: NextFunction): void => {
  if (!AUTH_ENABLED) {
    next();
    return;
  }

  if (isPublicPath(req.path)) {
    next();
    return;
  }

  // Only enforce on /api/* paths
  if (!req.path.startsWith('/api/') && !req.path.startsWith('/oauth/')) {
    next();
    return;
  }

  const key = extractKey(req);

  if (!key) {
    securityLogger.authFailure(req, 'missing_key');
    res
      .status(401)
      .json({
        error: 'Unauthorized',
        message: 'API key required. Use X-API-Key header or Authorization: Bearer <key>.',
      });
    return;
  }

  if (!timingSafeMatch(key, API_KEYS)) {
    securityLogger.authFailure(req, 'invalid_key');
    // Same response as missing key — don't reveal whether key exists
    res.status(401).json({ error: 'Unauthorized', message: 'Invalid API key.' });
    return;
  }

  securityLogger.authSuccess(req);
  next();
};

/**
 * Require admin key for /api/admin/* routes.
 * Stacked after apiKeyAuth — user must have both valid API key AND admin key.
 */
export const adminKeyAuth = (req: Request, res: Response, next: NextFunction): void => {
  if (!ADMIN_ENABLED) {
    next();
    return;
  }

  const key = extractKey(req);

  if (!key || !timingSafeMatch(key, ADMIN_KEYS)) {
    securityLogger.authFailure(req, 'admin_denied');
    res.status(403).json({ error: 'Forbidden', message: 'Admin access required.' });
    return;
  }

  next();
};

// Attach key hash (first 8 chars only) to req for downstream logging
declare global {
  namespace Express {
    interface Request {
      apiKeyHash?: string;
    }
  }
}

export const attachKeyContext = (req: Request, _res: Response, next: NextFunction): void => {
  const key = extractKey(req);
  if (key) {
    // Store truncated hash — never log full key
    req.apiKeyHash = createHash('sha256').update(key).digest('hex').slice(0, 12);
  }
  next();
};
