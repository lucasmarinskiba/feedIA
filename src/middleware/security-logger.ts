/**
 * Security audit logger
 *
 * Structured events for security-relevant actions.
 * Used by auth, rate-limiter, and input-sanitizer middleware.
 * All events written to stdout (Railway captures to log aggregator).
 *
 * NEVER log: full API keys, passwords, tokens, PII body content.
 */

import { Request } from 'express';

type SecurityEventType = 'auth_success' | 'auth_failure' | 'rate_limit_hit' | 'suspicious_input' | 'request';

interface SecurityEvent {
  event: SecurityEventType;
  timestamp: string;
  ip: string;
  method: string;
  path: string;
  user_agent: string;
  key_hash?: string;
  reason?: string;
  group?: string;
  detail?: string;
}

const getIp = (req: Request): string => {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') return forwarded.split(',')[0]?.trim() ?? '0.0.0.0';
  return req.socket?.remoteAddress ?? '0.0.0.0';
};

const getUserAgent = (req: Request): string => {
  const ua = req.headers['user-agent'];
  if (!ua) return 'unknown';
  // Truncate long user-agents (some bots send very long strings)
  return ua.slice(0, 256);
};

const emit = (event: SecurityEvent): void => {
  // JSON log line — Railway/Datadog/CloudWatch all parse structured JSON
  process.stdout.write(JSON.stringify({ level: 'security', ...event }) + '\n');
};

export const securityLogger = {
  authSuccess: (req: Request): void => {
    emit({
      event: 'auth_success',
      timestamp: new Date().toISOString(),
      ip: getIp(req),
      method: req.method,
      path: req.path,
      user_agent: getUserAgent(req),
      key_hash: req.apiKeyHash,
    });
  },

  authFailure: (req: Request, reason: 'missing_key' | 'invalid_key' | 'admin_denied'): void => {
    emit({
      event: 'auth_failure',
      timestamp: new Date().toISOString(),
      ip: getIp(req),
      method: req.method,
      path: req.path,
      user_agent: getUserAgent(req),
      reason,
    });
  },

  rateLimitHit: (req: Request, ip: string, group: string): void => {
    emit({
      event: 'rate_limit_hit',
      timestamp: new Date().toISOString(),
      ip,
      method: req.method,
      path: req.path,
      user_agent: getUserAgent(req),
      group,
    });
  },

  suspiciousInput: (req: Request, detail: string): void => {
    emit({
      event: 'suspicious_input',
      timestamp: new Date().toISOString(),
      ip: getIp(req),
      method: req.method,
      path: req.path,
      user_agent: getUserAgent(req),
      // Only log pattern name + field path, never the actual value
      detail: detail.split(':').slice(0, 2).join(':'),
    });
  },

  request: (req: Request): void => {
    emit({
      event: 'request',
      timestamp: new Date().toISOString(),
      ip: getIp(req),
      method: req.method,
      path: req.path,
      user_agent: getUserAgent(req),
    });
  },
};

// Augment Request type for apiKeyHash attached by auth.ts
declare global {
  namespace Express {
    interface Request {
      apiKeyHash?: string;
    }
  }
}
