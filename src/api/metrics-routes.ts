/**
 * Metrics Routes — Prometheus /metrics endpoint
 *
 * GET /metrics — returns all collected metrics in Prometheus text format
 * GET /metrics/summary — returns JSON summary of key metrics
 *
 * Consumed by: Prometheus, Grafana, monitoring dashboards
 */

import { Router, Request, Response } from 'express';
import { getMetricsText, metricsRegistry } from '../services/prometheus-metrics.js';
import { startTimer, recordApiLatency } from '../services/prometheus-metrics.js';
import { apiLatencyHistogram } from '../services/prometheus-metrics.js';

const router = Router();

/**
 * Prometheus metrics in text format
 *
 * Standard endpoint for Prometheus scrape target
 */
router.get('/', async (req: Request, res: Response): Promise<void> => {
  const timer = startTimer(apiLatencyHistogram, { endpoint: '/metrics', method: 'GET' });

  try {
    const metrics = await getMetricsText();
    res.set('Content-Type', metricsRegistry.contentType);
    res.send(metrics);
  } catch (err) {
    res.status(500).json({
      error: 'Failed to collect metrics',
      message: String(err),
    });
  }

  recordApiLatency('/metrics', 'GET', timer.observe());
});

/**
 * Metrics summary in JSON
 *
 * Simpler format for dashboards that don't parse Prometheus text
 */
router.get('/summary', async (req: Request, res: Response): Promise<void> => {
  const timer = startTimer(apiLatencyHistogram, { endpoint: '/metrics/summary', method: 'GET' });

  try {
    // Return simple status summary (extensible for more metrics)
    const summary = {
      timestamp: new Date().toISOString(),
      status: 'ok',
      note: 'Use /metrics for full Prometheus format',
    };

    res.json(summary);
  } catch (err) {
    res.status(500).json({
      error: 'Failed to summarize metrics',
      message: String(err),
    });
  }

  recordApiLatency('/metrics/summary', 'GET', timer.observe());
});

export default router;
