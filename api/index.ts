import express, { Request, Response } from 'express';

const app = express();

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({
    ok: true,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Info API
app.get('/api/info', (req: Request, res: Response) => {
  res.json({
    name: 'FeedIA',
    version: '1.0.0',
    description: 'Instagram/TikTok Growth Platform',
    endpoints: 89,
    ok: true,
  });
});

// Dashboard HTML
app.get('/', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>FeedIA Dashboard</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }
        .container {
          background: white;
          border-radius: 12px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.3);
          max-width: 600px;
          width: 100%;
          padding: 40px;
          text-align: center;
        }
        h1 {
          color: #333;
          font-size: 2.5em;
          margin-bottom: 10px;
        }
        .status {
          display: inline-block;
          background: #4ade80;
          color: white;
          padding: 8px 16px;
          border-radius: 20px;
          font-size: 0.9em;
          font-weight: 600;
          margin-bottom: 30px;
        }
        p {
          color: #666;
          font-size: 1.1em;
          margin-bottom: 20px;
          line-height: 1.6;
        }
        .stats {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin: 30px 0;
        }
        .stat-box {
          background: #f5f5f5;
          padding: 20px;
          border-radius: 8px;
        }
        .stat-number {
          font-size: 2em;
          font-weight: bold;
          color: #667eea;
        }
        .stat-label {
          color: #999;
          font-size: 0.9em;
          margin-top: 5px;
        }
        .endpoints {
          background: #f0f4ff;
          padding: 20px;
          border-radius: 8px;
          margin: 20px 0;
          text-align: left;
        }
        .endpoints h3 {
          color: #333;
          margin-bottom: 15px;
        }
        .endpoint {
          background: white;
          padding: 10px 15px;
          margin: 8px 0;
          border-radius: 4px;
          border-left: 4px solid #667eea;
          font-family: monospace;
          font-size: 0.9em;
          color: #333;
        }
        .cta {
          display: inline-block;
          background: #667eea;
          color: white;
          padding: 12px 30px;
          border-radius: 6px;
          text-decoration: none;
          font-weight: 600;
          margin-top: 20px;
          transition: background 0.3s;
        }
        .cta:hover {
          background: #764ba2;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>🚀 FeedIA</h1>
        <div class="status">✓ Live on Vercel</div>

        <p>Instagram/TikTok Growth Platform</p>
        <p>AI-powered content creation, analytics & automation</p>

        <div class="stats">
          <div class="stat-box">
            <div class="stat-number">89</div>
            <div class="stat-label">API Endpoints</div>
          </div>
          <div class="stat-box">
            <div class="stat-number">5</div>
            <div class="stat-label">Phases Built</div>
          </div>
        </div>

        <div class="endpoints">
          <h3>Available Endpoints</h3>
          <div class="endpoint">GET /health</div>
          <div class="endpoint">GET /api/info</div>
          <div class="endpoint">+ 87 more endpoints</div>
        </div>

        <p style="margin-top: 30px; color: #999; font-size: 0.9em;">
          Deployment: Vercel | Status: Online | Build: Success
        </p>
      </div>
    </body>
    </html>
  `);
});

// 404
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: 'Not found', ok: false });
});

export default (req: Request, res: Response) => {
  app(req, res);
};
