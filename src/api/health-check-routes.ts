/**
 * Health Check Routes — Liveness, readiness, detailed status
 *
 * GET /health — liveness (server up)
 * GET /health/ready — readiness (dependencies OK)
 * GET /health/detailed — full system status
 *
 * Used by: Kubernetes, load balancers, monitoring
 */

import { Router, Request, Response } from 'express';
import { setHealthcheckStatus } from '../services/prometheus-metrics.js';
import { info, warn } from '../services/structured-logger.js';
import { getDb } from '../database/db.js';

const router = Router();

// ─── Health Check Status ────────────────────────────────────────────────

interface ComponentHealth {
  name: string;
  healthy: boolean;
  latencyMs?: number;
  error?: string;
}

const componentStatus: Map<string, ComponentHealth> = new Map([
  ['database', { name: 'database', healthy: true }],
  ['cache', { name: 'cache', healthy: true }],
  ['redis', { name: 'redis', healthy: true }],
  ['externalAPIs', { name: 'externalAPIs', healthy: true }],
]);

/**
 * Liveness — Is server running?
 *
 * Returns 200 if server is up (regardless of dependencies)
 */
router.get('/', (_req: Request, res: Response): void => {
  return res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

/**
 * Readiness — Are dependencies OK?
 *
 * Returns 200 if ready to accept traffic, 503 if degraded
 */
router.get('/ready', async (_req: Request, res: Response): Promise<void> => {
  const checks = await performReadinessChecks();
  const allHealthy = checks.every((c) => c.healthy);

  const statusCode = allHealthy ? 200 : 503;
  const status = allHealthy ? 'ready' : 'not_ready';

  return res.status(statusCode).json({
    status,
    timestamp: new Date().toISOString(),
    checks,
  });
});

/**
 * Detailed Status — Full system health report
 *
 * Returns 200 with detailed per-component status
 */
router.get('/detailed', async (_req: Request, res: Response): Promise<void> => {
  const details = await getDetailedHealthStatus();
  const allHealthy = Object.values(details.components).every((c) => c.healthy);

  const statusCode = allHealthy ? 200 : 503;

  return res.status(statusCode).json({
    status: allHealthy ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    ...details,
  });
});

// ─── Readiness Checks ───────────────────────────────────────────────────

/**
 * Perform readiness checks on critical components
 */
const performReadinessChecks = async (): Promise<ComponentHealth[]> => {
  const checks: ComponentHealth[] = [];

  // Database check (SQLite)
  try {
    const dbStart = Date.now();
    const db = getDb();
    const result = db.prepare('SELECT 1 as ok').get() as Record<string, unknown> | undefined;
    const dbLatency = Date.now() - dbStart;
    const dbHealthy = result?.ok === 1 && dbLatency < 1000;
    checks.push({
      name: 'database',
      healthy: dbHealthy,
      latencyMs: dbLatency,
    });
    setHealthcheckStatus('database', dbHealthy);
  } catch (err) {
    checks.push({
      name: 'database',
      healthy: false,
      error: String(err),
    });
    setHealthcheckStatus('database', false);
  }

  // Cache check (in-memory, always up)
  try {
    const cacheStart = Date.now();
    // In-memory cache always up
    const cacheLatency = Date.now() - cacheStart;
    const cacheHealthy = cacheLatency < 100;
    checks.push({
      name: 'cache',
      healthy: cacheHealthy,
      latencyMs: cacheLatency,
    });
    setHealthcheckStatus('cache', cacheHealthy);
  } catch (err) {
    checks.push({
      name: 'cache',
      healthy: false,
      error: String(err),
    });
    setHealthcheckStatus('cache', false);
  }

  // External API check (Meta Graph API)
  try {
    const apiStart = Date.now();
    const apiToken = process.env.META_ACCESS_TOKEN;
    if (!apiToken) {
      throw new Error('META_ACCESS_TOKEN not configured');
    }
    // TODO: HEAD request to Graph API
    const apiLatency = Date.now() - apiStart;
    const apiHealthy = apiLatency < 2000;
    checks.push({
      name: 'externalAPIs',
      healthy: apiHealthy,
      latencyMs: apiLatency,
    });
    setHealthcheckStatus('externalAPIs', apiHealthy);
  } catch (err) {
    checks.push({
      name: 'externalAPIs',
      healthy: false,
      error: String(err),
    });
    setHealthcheckStatus('externalAPIs', false);
  }

  return checks;
};

// ─── Detailed Status Report ─────────────────────────────────────────────

/**
 * Get detailed health status with component breakdown
 */
const getDetailedHealthStatus = async (): Promise<{
  components: Record<string, ComponentHealth>;
  summary: { healthy: number; degraded: number };
}> => {
  const checks = await performReadinessChecks();
  const components: Record<string, ComponentHealth> = {};

  checks.forEach((c) => {
    components[c.name] = c;
  });

  const healthy = checks.filter((c) => c.healthy).length;
  const degraded = checks.length - healthy;

  return {
    components,
    summary: { healthy, degraded },
  };
};

// ─── Manual Health Status Update ────────────────────────────────────────

/**
 * Update component health status (called by services when failures detected)
 */
export const updateComponentHealth = (component: string, healthy: boolean, error?: string): void => {
  const status: ComponentHealth = { name: component, healthy, error };
  componentStatus.set(component, status);
  setHealthcheckStatus(component, healthy);

  if (healthy) {
    info(`[health-check] component recovered`, { component });
  } else {
    warn(`[health-check] component degraded`, { component, error });
  }
};

export default router;
