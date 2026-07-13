/**
 * Vercel Serverless Handler — ESM
 * Routes all requests to Express app
 */

import app from '../dist/server.js';

export default function handler(req, res) {
  return app(req, res);
}
