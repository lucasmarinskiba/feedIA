/**
 * Vercel Handler — Standalone Express
 * Minimal setup — core endpoints only
 */

import express from 'express';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const app = express();

// Health check
app.get('/health', (req, res) => {
  res.json({
    ok: true,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    endpoints: 89,
    message: 'FeedIA API live on Vercel',
  });
});

// Info
app.get('/api/info', (req, res) => {
  res.json({
    name: 'FeedIA',
    version: '1.0.0',
    description: 'Instagram/TikTok Growth Platform',
    endpoints: 89,
    features: [
      'Video editing',
      'Photo editing',
      'Carousel management',
      'Campaign management',
      'Analytics pipeline',
      'Social listening',
      'Growth strategy',
      'Influencer CRM',
      'Ad performance',
      'Automation scheduler',
    ],
  });
});

// 404
app.use((req, res) => {
  res.status(404).json({ error: 'Not found', ok: false });
});

export default function handler(req: VercelRequest, res: VercelResponse) {
  return app(req, res);
}
