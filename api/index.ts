import express from 'express';
import type { Request, Response } from 'express';
import path from 'path';
import { readFileSync, existsSync, statSync } from 'fs';

const app = express();
const publicDir = path.join(process.cwd(), 'public');

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Log config at startup
console.log('[FeedIA]', 'publicDir:', publicDir, 'exists:', existsSync(publicDir));

// Import orchestration routes
try {
  const orchestrationRoutes = require('../src/api/routes/index').default;
  app.use('/api', orchestrationRoutes);
  console.log('[FeedIA] Orchestration routes loaded');
} catch (err) {
  console.error('[FeedIA] Failed to load orchestration routes:', err);
}

// Serve static files with explicit middleware
app.use((req: Request, res: Response, next) => {
  if (req.path === '/' || req.path.startsWith('/api/')) {
    return next();
  }

  const filePath = path.join(publicDir, req.path);
  if (existsSync(filePath) && statSync(filePath).isFile()) {
    try {
      const content = readFileSync(filePath, 'utf-8');
      const ext = path.extname(req.path);
      const contentTypes: Record<string, string> = {
        '.js': 'application/javascript; charset=utf-8',
        '.css': 'text/css; charset=utf-8',
        '.html': 'text/html; charset=utf-8',
        '.json': 'application/json',
        '.svg': 'image/svg+xml',
        '.png': 'image/png',
      };
      res.setHeader('Content-Type', contentTypes[ext] || 'application/octet-stream');
      res.send(content);
      return;
    } catch (err) {
      console.error('[FeedIA] Static file error:', req.path, err);
    }
  }
  next();
});

app.get('/health', (req: Request, res: Response) => {
  res.json({ ok: true });
});

app.get('/debug', (req: Request, res: Response) => {
  res.json({
    status: 'debug',
    publicDir,
    cwdExists: existsSync(publicDir),
    indexHtmlExists: existsSync(path.join(publicDir, 'index.html')),
  });
});

app.get('/files', (req: Request, res: Response) => {
  try {
    const fs = require('fs');
    const files = fs.readdirSync(publicDir);
    res.json({ publicDir, filesCount: files.length, files: files.slice(0, 20) });
  } catch (err) {
    res.json({ error: String(err), publicDir });
  }
});

// SPA fallback: index.html for all other requests
app.use((req: Request, res: Response) => {
  const indexPath = path.join(publicDir, 'index.html');
  if (existsSync(indexPath)) {
    try {
      const html = readFileSync(indexPath, 'utf-8');
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(html);
    } catch (err) {
      console.error('[FeedIA] SPA fallback error:', err);
      res.status(500).json({ error: 'SPA load failed', path: indexPath, ts: new Date().toISOString() });
    }
  } else {
    console.error('[FeedIA] index.html not found at', indexPath);
    res.status(500).json({
      error: 'NO INDEX HTML FOUND',
      path: indexPath,
      publicDir,
      exists: existsSync(publicDir),
      ts: new Date().toISOString(),
    });
  }
});

export default (req: Request, res: Response) => {
  console.log('[FeedIA]', req.method, req.path);
  app(req, res);
};
