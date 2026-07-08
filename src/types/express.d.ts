import type { BrandProfile } from '../config/types.js';

/**
 * Extends Express's Request type with the `brand` field attached by the
 * mock-brand-context middleware in server.ts. Ambient module augmentation —
 * no import needed in consuming files, `req.brand` is just typed correctly
 * everywhere, removing the need for `(req as any).brand` casts.
 */
declare global {
  namespace Express {
    interface Request {
      brand?: BrandProfile;
    }
  }
}

export {};
