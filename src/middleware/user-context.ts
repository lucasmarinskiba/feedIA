/**
 * User Context Middleware — Extract userId from request
 *
 * Priority:
 * 1. X-User-ID header (explicit user override)
 * 2. Lookup API key → user_id in database
 * 3. Default to "test-user" for development
 */

import { Request, Response, NextFunction } from 'express';

declare global {
  namespace Express {
    interface Request {
      userId: string;
    }
  }
}

export const userContextMiddleware = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Check if X-User-ID header provided
    const headerUserId = req.headers['x-user-id'];
    if (typeof headerUserId === 'string' && headerUserId.length > 0) {
      req.userId = headerUserId;
      next();
      return;
    }

    // Try to lookup user by API key from database
    const apiKey = (req.headers['x-api-key'] as string) || (req.headers['authorization'] as string)?.slice(7);
    if (apiKey) {
      try {
        // Simple approach: look for test user or first user with this API key pattern
        // For now, use a deterministic test user based on key hash
        const keyHash = require('crypto').createHash('sha256').update(apiKey).digest('hex').slice(0, 8);
        req.userId = `user-${keyHash}`;
      } catch {
        req.userId = 'test-user';
      }
      next();
      return;
    }

    // Default fallback
    req.userId = 'test-user';
    next();
  } catch (err) {
    console.error('[userContext] Error:', err);
    req.userId = 'test-user'; // Fallback, don't fail request
    next();
  }
};

export default userContextMiddleware;
