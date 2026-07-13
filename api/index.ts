import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';

const app = express();
app.use(express.json());

// Serve static files from dist-static (copy of src/server/static)
const staticDir = path.join(__dirname, '..', 'dist-static');
app.use(express.static(staticDir, { maxAge: '1h' }));

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({ ok: true, timestamp: new Date().toISOString(), uptime: process.uptime() });
});

// API Info
app.get('/api/info', (req: Request, res: Response) => {
  res.json({
    name: 'FeedIA',
    version: '1.0.0',
    description: 'Instagram/TikTok Growth Platform',
    endpoints: 89,
    ok: true,
  });
});

// Placeholder API endpoints (referenced by index.html)
app.get('/api/personalization/css', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/css');
  res.send('/* Personalization CSS */');
});

// Video endpoints
app.post('/api/video/edit', (req: Request, res: Response) => {
  res.json({ message: 'Video edit', status: 'available' });
});

app.post('/api/video/trim', (req: Request, res: Response) => {
  res.json({ message: 'Video trim', status: 'available' });
});

// Photo endpoints
app.post('/api/photo/edit', (req: Request, res: Response) => {
  res.json({ message: 'Photo edit', status: 'available' });
});

// Carousel endpoints
app.post('/api/carousel/create', (req: Request, res: Response) => {
  res.json({ message: 'Carousel create', status: 'available' });
});

// Campaign endpoints
app.post('/api/campaigns', (req: Request, res: Response) => {
  res.json({ message: 'Campaign create', status: 'available' });
});

app.get('/api/campaigns', (req: Request, res: Response) => {
  res.json({ campaigns: [] });
});

// Analytics endpoints
app.get('/api/analytics/summary', (req: Request, res: Response) => {
  res.json({ summary: {} });
});

app.post('/api/analytics/record', (req: Request, res: Response) => {
  res.json({ ok: true });
});

// Content endpoints
app.post('/api/content/carousel', (req: Request, res: Response) => {
  res.json({ ok: true });
});

app.post('/api/content/reel', (req: Request, res: Response) => {
  res.json({ ok: true });
});

// Influencer endpoints
app.post('/api/influencers', (req: Request, res: Response) => {
  res.json({ ok: true });
});

app.get('/api/influencers', (req: Request, res: Response) => {
  res.json({ influencers: [] });
});

// Dashboard endpoints
app.get('/api/dashboard/overview', (req: Request, res: Response) => {
  res.json({
    followers: 10000,
    engagement: 8.5,
    reach: 50000,
  });
});

// Sala Ejecutiva endpoints
app.get('/api/sala-ejecutiva/overview', (req: Request, res: Response) => {
  res.json({
    campaigns: [],
    analytics: {},
    influencers: [],
    status: 'online',
  });
});

// SPA fallback — serve index.html for any unmatched routes
app.get('*', (req: Request, res: Response) => {
  const indexPath = path.join(staticDir, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.sendFile(indexPath);
  } else {
    res.status(404).json({ error: 'Not found' });
  }
});

export default (req: Request, res: Response) => {
  app(req, res);
};
