/**
 * Admin Dashboard Routes
 * System monitoring, metrics, agent health, optimization recommendations
 */

import { Router, Request, Response } from 'express';
import { log } from '../agent/logger.js';
import { analyticsEngine } from '../services/analytics-engine.js';
import { feedIAOrchestrator } from '../services/feedia-agents-orchestrator.js';
import { promptCache, contentCache, validationCache, embeddingCache } from '../services/cache-manager.js';
import { feedIADatabase } from '../db/database.js';
import { runHealthChecks } from '../observability/healthChecks.js';

const router = Router();

/**
 * GET /api/admin/health
 * Overall system health report
 */
router.get('/health', async (req: Request, res: Response) => {
  try {
    const dbStats = feedIADatabase.getStats();
    const agentMetrics = feedIAOrchestrator.getAgentMetrics();
    const queueStatus = feedIAOrchestrator.getQueueStatus();
    const healthReport = analyticsEngine.generateHealthReport();

    res.json({
      status: 'ok',
      systemHealth: healthReport,
      database: {
        prompts: dbStats.prompts || 0,
        variations: dbStats.variations || 0,
        content: dbStats.content || 0,
      },
      agents: {
        total: agentMetrics.length,
        avgSuccessRate: (agentMetrics.reduce((sum, a) => sum + a.successRate, 0) / agentMetrics.length).toFixed(1),
        avgLatency: (agentMetrics.reduce((sum, a) => sum + a.averageLatency, 0) / agentMetrics.length).toFixed(0),
      },
      queue: queueStatus,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    log.error('[AdminDashboard] Health check failed', error);
    res.status(500).json({ error: 'Health check failed' });
  }
});

/**
 * GET /api/admin/infra
 * External infrastructure health (Redis cache, Supabase) — real connectivity
 * checks, not just "is the env var set". Each check opens its own short-lived
 * connection and reports latency, so this is safe to poll periodically.
 */
router.get('/infra', async (req: Request, res: Response) => {
  try {
    const report = await runHealthChecks();

    res.status(report.ok ? 200 : 503).json({
      ...report,
      notes: {
        redis: !process.env.REDIS_URL
          ? 'REDIS_URL not set — cache-manager.ts stays in-memory (lost on restart)'
          : undefined,
        supabase: !process.env.SUPABASE_URL ? 'SUPABASE_URL not set — using local SQLite only' : undefined,
      },
    });
  } catch (error) {
    log.error('[AdminDashboard] Infra health check failed', error);
    res.status(500).json({ error: 'Infra health check failed' });
  }
});

/**
 * GET /api/admin/agents
 * Detailed agent metrics
 */
router.get('/agents', async (req: Request, res: Response) => {
  try {
    const agents = feedIAOrchestrator.getAgentMetrics();

    res.json({
      status: 'ok',
      agentCount: agents.length,
      agents: agents.map((agent) => ({
        id: agent.agentId,
        specialization: agent.specialization,
        tasksCompleted: agent.tasksCompleted,
        successRate: `${agent.successRate.toFixed(1)}%`,
        errorRate: `${agent.errorRate.toFixed(1)}%`,
        avgLatency: `${agent.averageLatency.toFixed(0)}ms`,
      })),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    log.error('[AdminDashboard] Agent metrics failed', error);
    res.status(500).json({ error: 'Agent metrics failed' });
  }
});

/**
 * GET /api/admin/metrics
 * Detailed system metrics
 */
router.get('/metrics', async (req: Request, res: Response) => {
  try {
    const dbStats = feedIADatabase.getStats();
    const queueStatus = feedIAOrchestrator.getQueueStatus();

    // Calculate current metrics (placeholder values)
    const metrics = analyticsEngine.calculateMetrics(
      352840, // total prompts
      28320, // base prompts
      324520, // expanded
      dbStats.content || 0, // generated content
      dbStats.content || 0, // validated content
      75.5, // avg quality
      6, // agent count
      2500, // avg agent latency
      queueStatus.completed || 0, // total tasks
    );

    res.json({
      status: 'ok',
      currentMetrics: metrics,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    log.error('[AdminDashboard] Metrics failed', error);
    res.status(500).json({ error: 'Metrics failed' });
  }
});

/**
 * GET /api/admin/recommendations
 * Optimization recommendations
 */
router.get('/recommendations', async (req: Request, res: Response) => {
  try {
    const dbStats = feedIADatabase.getStats();
    const metrics = analyticsEngine.calculateMetrics(
      352840,
      28320,
      324520,
      dbStats.content || 0,
      dbStats.content || 0,
      75.5,
      6,
      2500,
      0,
    );

    const recommendations = analyticsEngine.generateRecommendations(metrics);

    res.json({
      status: 'ok',
      recommendationCount: recommendations.length,
      critical: recommendations.filter((r) => r.severity === 'critical').length,
      high: recommendations.filter((r) => r.severity === 'high').length,
      recommendations: recommendations.sort((a, b) => {
        const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        return severityOrder[a.severity] - severityOrder[b.severity];
      }),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    log.error('[AdminDashboard] Recommendations failed', error);
    res.status(500).json({ error: 'Recommendations failed' });
  }
});

/**
 * GET /api/admin/cache
 * Cache performance metrics
 */
router.get('/cache', async (req: Request, res: Response) => {
  try {
    const stats = {
      prompts: promptCache.getStats(),
      content: contentCache.getStats(),
      validation: validationCache.getStats(),
      embeddings: embeddingCache.getStats(),
    };

    const totalHits = Object.values(stats).reduce((sum, s) => sum + s.hits, 0);
    const totalMisses = Object.values(stats).reduce((sum, s) => sum + s.misses, 0);
    const overallHitRate = totalHits + totalMisses > 0 ? (totalHits / (totalHits + totalMisses)) * 100 : 0;

    res.json({
      status: 'ok',
      overallHitRate: overallHitRate.toFixed(1),
      caches: {
        prompts: stats.prompts,
        content: stats.content,
        validation: stats.validation,
        embeddings: stats.embeddings,
      },
      totalSize: Object.values(stats).reduce((sum, s) => sum + s.size, 0),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    log.error('[AdminDashboard] Cache metrics failed', error);
    res.status(500).json({ error: 'Cache metrics failed' });
  }
});

/**
 * GET /api/admin/errors
 * Recent errors and issues
 */
router.get('/errors', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    const errors = analyticsEngine.getRecentErrors(limit);

    res.json({
      status: 'ok',
      errorCount: errors.length,
      errors,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    log.error('[AdminDashboard] Errors retrieval failed', error);
    res.status(500).json({ error: 'Errors retrieval failed' });
  }
});

/**
 * GET /api/admin/trends
 * Metrics trends over time
 */
router.get('/trends', async (req: Request, res: Response) => {
  try {
    const timeWindow = parseInt(req.query.window as string) || 60; // minutes

    const trends = analyticsEngine.getMetricsTrends(timeWindow);

    res.json({
      status: 'ok',
      trends,
      timeWindow,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    log.error('[AdminDashboard] Trends failed', error);
    res.status(500).json({ error: 'Trends failed' });
  }
});

/**
 * GET /api/admin/summary
 * Executive summary
 */
router.get('/summary', async (req: Request, res: Response) => {
  try {
    const healthReport = analyticsEngine.generateHealthReport();
    const agents = feedIAOrchestrator.getAgentMetrics();
    const queueStatus = feedIAOrchestrator.getQueueStatus();
    const cacheStats = {
      prompts: promptCache.getStats(),
      content: contentCache.getStats(),
    };

    res.json({
      status: 'ok',
      executive_summary: {
        systemStatus: healthReport.status,
        qualityScore: healthReport.summary['Avg Quality Score'],
        successRate: healthReport.summary['Success Rate'],
        errorRate: healthReport.summary['Error Rate'],
        totalPrompts: healthReport.summary['Total Prompts'],
        contentGenerated: healthReport.summary['Content Generated'],
      },
      agents: {
        active: agents.length,
        avgSuccessRate: `${(agents.reduce((sum, a) => sum + a.successRate, 0) / agents.length).toFixed(1)}%`,
      },
      queue: {
        pending: queueStatus.queued,
        processing: queueStatus.active,
        completed: queueStatus.completed,
      },
      caching: {
        promptCacheHitRate: `${cacheStats.prompts.hitRate.toFixed(1)}%`,
        contentCacheHitRate: `${cacheStats.content.hitRate.toFixed(1)}%`,
      },
      warnings: healthReport.warnings,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    log.error('[AdminDashboard] Summary failed', error);
    res.status(500).json({ error: 'Summary failed' });
  }
});

export default router;
