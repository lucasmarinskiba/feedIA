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

// Static file serving - JS
app.get('/:filename.js', (req: Request, res: Response) => {
  const filePath = path.join(publicDir, req.params.filename + '.js');
  if (existsSync(filePath)) {
    try {
      const content = readFileSync(filePath, 'utf-8');
      res.setHeader('Content-Type', 'application/javascript');
      res.send(content);
    } catch {
      res.status(500).json({ error: 'Error reading JS file' });
    }
  } else {
    res.status(404).json({ error: 'JS file not found' });
  }
});

// Static file serving - CSS
app.get('/:filename.css', (req: Request, res: Response) => {
  const filePath = path.join(publicDir, req.params.filename + '.css');
  if (existsSync(filePath)) {
    try {
      const content = readFileSync(filePath, 'utf-8');
      res.setHeader('Content-Type', 'text/css; charset=utf-8');
      res.send(content);
    } catch {
      res.status(500).json({ error: 'Error reading CSS file' });
    }
  } else {
    res.status(404).json({ error: 'CSS file not found' });
  }
});

// SPA fallback: serve index.html for non-API, non-static routes
app.use((req: Request, res: Response) => {
  // Only treat explicit API paths as errors, not the root rewrite
  if (req.path !== '/' && req.path.startsWith('/api')) {
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
