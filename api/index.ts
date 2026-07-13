/**
 * Vercel Handler — Full FeedIA API
 * Imports compiled Express app (89 endpoints) from dist/server.js
 */

import { default as app } from '../dist/server.js';
import type { Request, Response } from 'express';

export default (req: Request, res: Response) => {
  return app(req, res);
};
