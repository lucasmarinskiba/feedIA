import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';

const app = express();
app.use(express.json());

// Determine static directory — works in both local and Vercel
const possiblePaths = [
  path.join(__dirname, '..', 'dist-static'),
  path.join(process.cwd(), 'dist-static'),
  path.join(process.cwd(), 'src', 'server', 'static'),
  '/var/task/dist-static',
];

let staticDir = '';
for (const p of possiblePaths) {
  if (fs.existsSync(p)) {
    staticDir = p;
    break;
  }
}

if (staticDir) {
  app.use(express.static(staticDir, { maxAge: '1h' }));
}

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({ ok: true, timestamp: new Date().toISOString(), uptime: process.uptime(), staticDir });
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

// Placeholder endpoints
app.get('/api/personalization/css', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/css');
  res.send('/* Personalization CSS */');
});

app.post('/api/video/edit', (req: Request, res: Response) => {
  res.json({ message: 'Video edit', status: 'available' });
});

app.post('/api/photo/edit', (req: Request, res: Response) => {
  res.json({ message: 'Photo edit', status: 'available' });
});

app.post('/api/carousel/create', (req: Request, res: Response) => {
  res.json({ message: 'Carousel create', status: 'available' });
});

app.post('/api/campaigns', (req: Request, res: Response) => {
  res.json({ message: 'Campaign create', status: 'available' });
});

app.get('/api/campaigns', (req: Request, res: Response) => {
  res.json({ campaigns: [] });
});

app.get('/api/analytics/summary', (req: Request, res: Response) => {
  res.json({ summary: {} });
});

app.post('/api/analytics/record', (req: Request, res: Response) => {
  res.json({ ok: true });
});

app.post('/api/content/carousel', (req: Request, res: Response) => {
  res.json({ ok: true });
});

app.post('/api/content/reel', (req: Request, res: Response) => {
  res.json({ ok: true });
});

app.post('/api/influencers', (req: Request, res: Response) => {
  res.json({ ok: true });
});

app.get('/api/influencers', (req: Request, res: Response) => {
  res.json({ influencers: [] });
});

app.get('/api/dashboard/overview', (req: Request, res: Response) => {
  res.json({
    followers: 10000,
    engagement: 8.5,
    reach: 50000,
  });
});

app.get('/api/sala-ejecutiva/overview', (req: Request, res: Response) => {
  res.json({
    campaigns: [],
    analytics: {},
    influencers: [],
    status: 'online',
  });
});

// SPA fallback — serve index.html for unmatched routes
app.get('*', (req: Request, res: Response) => {
  if (staticDir) {
    const indexPath = path.join(staticDir, 'index.html');
    if (fs.existsSync(indexPath)) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.sendFile(indexPath);
      return;
    }
  }

  res.status(404).json({
    error: 'Not found',
    staticDir,
    __dirname,
    cwd: process.cwd(),
  });
});

export default (req: Request, res: Response) => {
  app(req, res);
};
