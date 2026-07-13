/**
 * Vercel Serverless Handler — Exports Express app for Vercel
 * Maps incoming requests to src/server.ts Express app
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

// Dynamic import to avoid circular dependency issues
let app: any;

const getApp = async () => {
  if (!app) {
    const module = await import('../src/server.js');
    app = module.default || module.app;
  }
  return app;
};

export default async (req: VercelRequest, res: VercelResponse) => {
  try {
    const expressApp = await getApp();
    if (!expressApp) {
      res.status(500).json({ error: 'Server not initialized', ok: false });
      return;
    }
    expressApp(req, res);
  } catch (error) {
    console.error('[Vercel Handler] Fatal error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
      ok: false,
    });
  }
};
