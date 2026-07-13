import express from 'express';
import type { Request, Response } from 'express';
import path from 'path';
import { readFileSync, existsSync } from 'fs';

const app = express();

// Serve static files from public directory
const publicDir = path.join(process.cwd(), 'public');
app.use(express.static(publicDir));

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
    const indexPath = path.join(publicDir, 'index.html');
    if (existsSync(indexPath)) {
      const html = readFileSync(indexPath, 'utf-8');
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(html);
    } else {
      res.status(500).json({ error: 'UI not found' });
    }
  } catch (err) {
    res.status(500).json({ error: 'Could not load UI', details: String(err) });
  }
});

export default (req: Request, res: Response) => app(req, res);
