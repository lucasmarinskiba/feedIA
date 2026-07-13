/**
 * Vercel Serverless Handler
 * Wraps Express app for Vercel compatibility
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import app from '../src/server.js';

export default function handler(req: VercelRequest, res: VercelResponse) {
  return app(req, res);
}
