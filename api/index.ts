import express from 'express';
import type { Request, Response } from 'express';
import path from 'path';
import { readFileSync, existsSync } from 'fs';

const app = express();
const publicDir = path.join(process.cwd(), 'public');

// Serve static files
app.use(express.static(publicDir));

app.get('/health', (req: Request, res: Response) => {
  res.json({ ok: true });
});

app.get('/api/info', (req: Request, res: Response) => {
  res.json({ name: 'FeedIA', version: '1.0.0', ok: true });
});

// SPA fallback: index.html for all other requests
app.use((req: Request, res: Response) => {
  const indexPath = path.join(publicDir, 'index.html');
  if (existsSync(indexPath)) {
    try {
      const html = readFileSync(indexPath, 'utf-8');
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(html);
    } catch {
      res.status(500).json({ error: 'Could not load UI' });
    }
  } else {
    res.status(500).json({ error: 'UI not found' });
  }
});

export default (req: Request, res: Response) => app(req, res);
