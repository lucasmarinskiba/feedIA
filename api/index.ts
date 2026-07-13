import express from 'express';
import type { Request, Response } from 'express';

const app = express();

app.get('/health', (req: Request, res: Response) => {
  res.json({ ok: true });
});

app.get('/api/info', (req: Request, res: Response) => {
  res.json({ name: 'FeedIA', version: '1.0.0', ok: true });
});

app.use((req: Request, res: Response) => {
  res.status(404).json({ error: 'Not found' });
});

export default (req: Request, res: Response) => app(req, res);
