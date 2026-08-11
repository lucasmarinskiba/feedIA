/**
 * Request Context Middleware — Distributed Tracing
 *
 * Flow: Incoming request → Generate/extract request ID → Attach to context
 * Propagates through: logs, metrics, DB queries, outbound API calls
 *
 * Headers:
 * - X-Request-ID: unique ID for entire request chain
 * - X-Account-ID: account scope (for multi-tenancy)
 * - X-Trace-Parent: W3C Trace Context parent (optional)
 */

import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'node:crypto';

// Request-scoped context
declare global {
  namespace Express {
    interface Request {
      requestId: string;
      accountId: string | null;
      traceParent: string | null;
    }
  }
}

/**
 * Generate or extract request ID
 *
 * Priority:
 * 1. X-Request-ID header (from upstream)
 * 2. X-Trace-Parent header (W3C format)
 * 3. Generate new UUID
 */
const getOrGenerateRequestId = (req: Request): string => {
  // Check if already set (by upstream proxy)
  const existingId = req.get('X-Request-ID');
  if (existingId) return existingId;

  // Check W3C Trace Context
  const traceParent = req.get('traceparent');
  if (traceParent) {
    // Format: version-trace_id-parent_id-trace_flags
    const parts = traceParent.split('-');
    if (parts.length >= 2 && parts[1]) {
      return parts[1]; // Extract trace_id
    }
  }

  // Generate new
  return randomUUID();
};

/**
 * Request context middleware
 *
 * Attaches request ID, account ID, and trace parent to request
 * Propagates to all downstream handlers via req.requestId, etc.
 *
 * Usage in server.ts:
 * app.use(requestContextMiddleware);
 */
export const requestContextMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  // Extract IDs from headers
  req.requestId = getOrGenerateRequestId(req);
  req.accountId = req.get('X-Account-ID') || null;
  req.traceParent = req.get('traceparent') || null;

  // Propagate request ID in response headers
  res.setHeader('X-Request-ID', req.requestId);
  if (req.accountId) {
    res.setHeader('X-Account-ID', req.accountId);
  }

  // Add to response locals for logging/metrics
  res.locals.requestId = req.requestId;
  res.locals.accountId = req.accountId;

  next();
};

/**
 * Logging middleware that includes request context
 *
 * Logs every request with duration + request ID
 */
export const requestLoggingMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const startTime = Date.now();

  // Capture original send
  const originalSend = res.send;

  // Override send to log after response
  res.send = function (data: unknown) {
    const duration = Date.now() - startTime;
    const status = res.statusCode;

    const logLevel = status >= 500 ? 'error' : status >= 400 ? 'warn' : 'info';
    const logData = {
      requestId: req.requestId,
      accountId: req.accountId,
      method: req.method,
      path: req.path,
      status,
      durationMs: duration,
      userAgent: req.get('user-agent'),
    };

    if (logLevel === 'error') {
      console.error('[request]', logData);
    } else if (logLevel === 'warn') {
      console.warn('[request]', logData);
    } else {
      console.log('[request]', logData);
    }

    return originalSend.call(this, data);
  };

  next();
};

export default {
  requestContextMiddleware,
  requestLoggingMiddleware,
};
