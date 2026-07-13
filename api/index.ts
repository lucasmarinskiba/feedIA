import express from 'express';
import type { Request, Response } from 'express';
import path from 'path';
import { readFileSync } from 'fs';

const app = express();

// Serve static files from public directory (copied from dist-static by build)
app.use(express.static(path.join(__dirname, '../public')));

app.get('/health', (req: Request, res: Response) => {
  res.json({ ok: true });
});

app.get('/api/info', (req: Request, res: Response) => {
  res.json({ name: 'FeedIA', version: '1.0.0', ok: true });
});

// SPA fallback: serve index.html for non-API routes
app.use((req: Request, res: Response) => {
  if (req.path.startsWith('/api')) {
    res.status(404).json({ error: 'API endpoint not found' });
    return;
  }
  try {
    const indexPath = path.join(__dirname, '../public/index.html');
    const html = readFileSync(indexPath, 'utf-8');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch {
    res.status(500).json({ error: 'Could not load UI' });
  }
});

export default (req: Request, res: Response) => app(req, res);
