/**
 * Agent Backend Server — Production Agent System
 *
 * TIER 1-6 Production Hardening:
 * - Real-time data sync (webhooks)
 * - Anomaly detection
 * - Autonomous execution
 * - Observability (health checks, metrics)
 * - Disaster recovery (backups)
 * - Security (rate limiting, API keys)
 *
 * Port: 3001 (separate from main content API on 3000)
 */

import express, { Request, Response } from 'express';
import { getDb } from './database/db.js';
import { requestContextMiddleware } from './middleware/request-context.js';
import {
  securityHeadersMiddleware,
  apiKeyMiddleware,
  rateLimitMiddleware,
  auditLoggingMiddleware,
} from './middleware/security.js';
import healthCheckRoutes from './api/health-check-routes.js';
import metricsRoutes from './api/metrics-routes.js';
import realdataRoutes from './api/realdata-routes.js';
import anomalyRoutes from './api/anomaly-routes.js';
import executeRoutes from './api/execute-routes.js';
import agencySimpleRoutes from './api/agency-simple-routes.js';
import { registerTrendingRoutes } from './api/trending-endpoints.js';
import { registerTiers5_15Routes } from './api/tiers5-15-bundled.js';

const app = express();
const PORT = process.env.AGENT_PORT || 3001;

// Middleware order: context → security headers → auth → rate limit → audit
app.use(express.json());
app.use(requestContextMiddleware);
app.use(securityHeadersMiddleware);
app.use(apiKeyMiddleware);
app.use(rateLimitMiddleware);
app.use(auditLoggingMiddleware);

// Test route (for debugging)
app.get('/test', (req: Request, res: Response) => {
  res.json({ test: 'ok', path: req.path });
});

// Health & Metrics (public)
app.use('/health', healthCheckRoutes);
app.use('/metrics', metricsRoutes);

// API Routes (protected by middleware)
app.use('/api/realdata', realdataRoutes);
app.use('/api/anomaly', anomalyRoutes);
app.use('/api/execute', executeRoutes);
app.use('/api/agency', agencySimpleRoutes);

// Tiers 5-15: Autonomous Systems
registerTrendingRoutes(app);
registerTiers5_15Routes(app);

// Default route
app.get('/', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'FeedIA Agent Backend',
    version: '1.0.0',
    tiers: [
      'TIER 1: Real Data Sync',
      'TIER 2: Observability',
      'TIER 3: Tests',
      'TIER 4: Real APIs',
      'TIER 5: E2E',
      'TIER 6: Oncall + Backup + Security',
    ],
    endpoints: {
      health: 'GET /health (liveness)',
      ready: 'GET /health/ready (readiness)',
      detailed: 'GET /health/detailed (component status)',
      metrics: 'GET /metrics (Prometheus)',
      webhooks: 'POST /api/realdata/webhook/{type}',
      anomaly: 'POST /api/anomaly/scan',
      execute: 'POST /api/execute/action',
      agency_create: 'POST /api/agency/campaign/create (generate campaign)',
      agency_get: 'GET /api/agency/campaign/:id (retrieve campaign)',
      agency_metrics: 'GET /api/agency/campaign/:id/metrics (campaign analytics)',
      agency_batch: 'POST /api/agency/batch/create (batch campaigns)',
    },
  });
});

// Initialize database and start server
const startServer = async (): Promise<void> => {
  try {
    // Initialize database
    const db = getDb();
    if (db) {
      console.log('✅ Database initialized');
    }

    app.listen(PORT, () => {
      console.log(`
╔════════════════════════════════════════════════════════════════╗
║  FeedIA Agent Backend — Production System                       ║
╠════════════════════════════════════════════════════════════════╣
║  Port:    ${PORT}                                           ║
║  Status:  🟢 Running                                           ║
║  Base:    http://localhost:${PORT}                              ║
║  Health:  http://localhost:${PORT}/health                        ║
║  Metrics: http://localhost:${PORT}/metrics                       ║
╠════════════════════════════════════════════════════════════════╣
║  TIER 6: Oncall Automation + Backup + Security ✅              ║
║  - PagerDuty incident creation on critical alerts              ║
║  - Daily SQLite backup (02:00 UTC)                             ║
║  - Rate limiting (100 req/min per account)                     ║
║  - API key validation (sk_prod_*/wh_prod_*)                    ║
║  - Request audit logging with correlation IDs                 ║
║  - CORS + security headers (HSTS, X-Frame-Options)             ║
╚════════════════════════════════════════════════════════════════╝
      `);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
};

startServer();

export default app;
