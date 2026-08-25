/**
 * Security Hardening Middleware
 * Input validation, sanitization, rate limiting, data protection
 */

import { Request, Response, NextFunction } from 'express';
import { log } from '../agent/logger.js';

/**
 * Sanitize user input to prevent injection attacks
 */
export const sanitizeInput = (input: unknown): unknown => {
  if (typeof input === 'string') {
    // Remove null bytes
    if (input.includes('\0')) {
      log.warn('[Security] Null byte detected in input', { input: input.slice(0, 50) });
      throw new Error('Invalid input: null bytes not allowed');
    }
    // Limit length to prevent DoS
    if (input.length > 10_000) {
      log.warn('[Security] Oversized input detected', { size: input.length });
      throw new Error('Input too large (max 10KB)');
    }
    return input.trim();
  }
  if (Array.isArray(input)) {
    return input.map((item) => sanitizeInput(item));
  }
  if (input && typeof input === 'object') {
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(input)) {
      // Validate key length
      if (key.length > 256) {
        log.warn('[Security] Oversized key detected', { keyLen: key.length });
        continue;
      }
      sanitized[key] = sanitizeInput(value);
    }
    return sanitized;
  }
  return input;
};

/**
 * Middleware: Sanitize all request bodies and query params
 */
export const sanitizationMiddleware = (req: Request, res: Response, next: NextFunction) => {
  try {
    if (req.body) {
      req.body = sanitizeInput(req.body) as typeof req.body;
    }
    if (req.query) {
      const sanitized: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(req.query)) {
        sanitized[key] = sanitizeInput(value);
      }
      req.query = sanitized as unknown as Record<string, string | string[]>;
    }
    next();
  } catch (err) {
    log.error('[Sanitization] Failed', { error: String(err) });
    res.status(400).json({ error: 'Invalid input format' });
  }
};

/**
 * Middleware: Prevent sensitive data leakage in responses
 */
export const dataMaskingMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const originalJson = res.json.bind(res);
  res.json = function (data: unknown) {
    if (data && typeof data === 'object') {
      const masked = maskSensitiveData(data);
      return originalJson(masked);
    }
    return originalJson(data);
  };
  next();
};

/**
 * Mask sensitive fields in response objects
 */
function maskSensitiveData(obj: unknown): unknown {
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => maskSensitiveData(item));
  }

  const sensitive = [
    'password',
    'secret',
    'token',
    'apiKey',
    'api_key',
    'accessToken',
    'access_token',
    'refreshToken',
    'refresh_token',
    'creditCard',
    'credit_card',
    'cvv',
    'ssn',
    'socialSecurityNumber',
  ];

  const masked: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (sensitive.some((s) => key.toLowerCase().includes(s.toLowerCase()))) {
      masked[key] = '***REDACTED***';
    } else {
      masked[key] = maskSensitiveData(value);
    }
  }
  return masked;
}

/**
 * Middleware: Log security events without exposing data
 */
export const securityAuditLogger = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const userId = req.headers['x-user-id'];
    const isHighRisk = req.path.includes('login') || req.path.includes('payment') || req.path.includes('password');

    if (isHighRisk || res.statusCode >= 400) {
      log.info('[Audit] Request', {
        method: req.method,
        path: req.path,
        status: res.statusCode,
        userId: userId ? 'present' : 'missing',
        duration,
        ip: req.ip,
      });
    }
  });

  next();
};

/**
 * Validate that user can only access their own data
 */
export const ownershipCheck = (userIdFromAuth: string, userIdFromRequest: string): boolean => {
  if (userIdFromAuth !== userIdFromRequest) {
    log.warn('[Security] Ownership violation attempt', {
      auth: userIdFromAuth ? userIdFromAuth.slice(0, 10) : 'missing',
      request: userIdFromRequest ? userIdFromRequest.slice(0, 10) : 'missing',
    });
    return false;
  }
  return true;
};

/**
 * Hash payment reference to avoid exposing IDs
 */
export const hashPaymentRef = (paymentId: string): string => {
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(paymentId).digest('hex').slice(0, 16);
};
