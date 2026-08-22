/**
 * Prometheus Metrics — Counters, histograms, gauges for all operations
 *
 * Flow: Operation starts → timer.start() → Operation ends → timer.end() → Record histogram
 *
 * Metrics exposed at GET /metrics (Prometheus format)
 * Use for: latency tracking, error rates, throughput monitoring
 */

import { Registry, Counter, Histogram, Gauge } from 'prom-client';

// ─── Prometheus Setup ───────────────────────────────────────────────────

export const metricsRegistry = new Registry();

// ─── Counters (monotonic increase) ──────────────────────────────────────

export const webhookReceivedCounter = new Counter({
  name: 'webhooks_received_total',
  help: 'Total webhooks received',
  labelNames: ['type', 'source'],
  registers: [metricsRegistry],
});

export const conversionRecordedCounter = new Counter({
  name: 'conversions_recorded_total',
  help: 'Total conversions recorded',
  labelNames: ['status', 'source'],
  registers: [metricsRegistry],
});

export const anomalyDetectedCounter = new Counter({
  name: 'anomalies_detected_total',
  help: 'Total anomalies detected',
  labelNames: ['type', 'severity'],
  registers: [metricsRegistry],
});

export const actionExecutedCounter = new Counter({
  name: 'actions_executed_total',
  help: 'Total autonomous actions executed',
  labelNames: ['type', 'status'],
  registers: [metricsRegistry],
});

export const apiErrorCounter = new Counter({
  name: 'api_errors_total',
  help: 'Total API errors',
  labelNames: ['endpoint', 'status'],
  registers: [metricsRegistry],
});

export const retryAttemptCounter = new Counter({
  name: 'retry_attempts_total',
  help: 'Total retry attempts',
  labelNames: ['operation', 'success'],
  registers: [metricsRegistry],
});

// ─── Agency Agents Metrics ──────────────────────────────────────────────

export const strategyLatencyHistogram = new Histogram({
  name: 'agency_strategy_latency_ms',
  help: 'Strategy director latency (ms)',
  buckets: [500, 1000, 2000, 5000, 10000],
  registers: [metricsRegistry],
});

export const strategyCounter = new Counter({
  name: 'agency_strategy_total',
  help: 'Total strategy generation calls',
  labelNames: ['accountId', 'status'],
  registers: [metricsRegistry],
});

export const artLatencyHistogram = new Histogram({
  name: 'agency_art_latency_ms',
  help: 'Art director latency (ms)',
  buckets: [500, 1000, 2000, 5000, 10000],
  registers: [metricsRegistry],
});

export const copyLatencyHistogram = new Histogram({
  name: 'agency_copy_latency_ms',
  help: 'Copywriter latency (ms)',
  buckets: [500, 1000, 2000, 5000, 10000],
  registers: [metricsRegistry],
});

export const communityLatencyHistogram = new Histogram({
  name: 'agency_community_latency_ms',
  help: 'Community manager latency (ms)',
  buckets: [100, 250, 500, 1000, 2500],
  registers: [metricsRegistry],
});

export const qaLatencyHistogram = new Histogram({
  name: 'agency_qa_latency_ms',
  help: 'QA validator latency (ms)',
  buckets: [100, 250, 500, 1000, 2500],
  registers: [metricsRegistry],
});

export const qaApprovalCounter = new Counter({
  name: 'agency_qa_approvals_total',
  help: 'Total QA approvals/rejections',
  labelNames: ['status'],
  registers: [metricsRegistry],
});

export const optimizerLatencyHistogram = new Histogram({
  name: 'agency_optimizer_latency_ms',
  help: 'Optimizer latency (ms)',
  buckets: [100, 250, 500, 1000, 2500],
  registers: [metricsRegistry],
});

export const agencyLatencyHistogram = new Histogram({
  name: 'agency_orchestration_latency_ms',
  help: 'Full agency orchestration latency (ms)',
  buckets: [2000, 5000, 10000, 20000, 30000],
  registers: [metricsRegistry],
});

export const agencyApprovalCounter = new Counter({
  name: 'agency_campaigns_total',
  help: 'Total campaigns created',
  labelNames: ['status'],
  registers: [metricsRegistry],
});

// ─── Histograms (distributions) ─────────────────────────────────────────

export const webhookLatencyHistogram = new Histogram({
  name: 'webhook_latency_ms',
  help: 'Webhook processing latency (ms)',
  labelNames: ['type'],
  buckets: [10, 50, 100, 250, 500, 1000, 2500, 5000],
  registers: [metricsRegistry],
});

export const anomalyDetectionLatencyHistogram = new Histogram({
  name: 'anomaly_detection_latency_ms',
  help: 'Anomaly detection latency (ms)',
  labelNames: ['type'],
  buckets: [50, 100, 250, 500, 1000, 2500, 5000],
  registers: [metricsRegistry],
});

export const actionExecutionLatencyHistogram = new Histogram({
  name: 'action_execution_latency_ms',
  help: 'Action execution latency (ms)',
  labelNames: ['type'],
  buckets: [100, 250, 500, 1000, 2500, 5000, 10000],
  registers: [metricsRegistry],
});

export const apiLatencyHistogram = new Histogram({
  name: 'api_latency_ms',
  help: 'API endpoint latency (ms)',
  labelNames: ['endpoint', 'method'],
  buckets: [10, 50, 100, 250, 500, 1000],
  registers: [metricsRegistry],
});

// ─── Gauges (point-in-time values) ──────────────────────────────────────

export const activeConnectionsGauge = new Gauge({
  name: 'active_connections',
  help: 'Active websocket/long-poll connections',
  registers: [metricsRegistry],
});

export const queuedActionsGauge = new Gauge({
  name: 'queued_actions',
  help: 'Pending autonomous actions in queue',
  registers: [metricsRegistry],
});

export const circuitBreakerStateGauge = new Gauge({
  name: 'circuit_breaker_state',
  help: 'Circuit breaker state (0=closed, 1=half-open, 2=open)',
  labelNames: ['service'],
  registers: [metricsRegistry],
});

export const healthcheckStatusGauge = new Gauge({
  name: 'healthcheck_status',
  help: 'Health check status (1=healthy, 0=unhealthy)',
  labelNames: ['component'],
  registers: [metricsRegistry],
});

// ─── Timer Utility ──────────────────────────────────────────────────────

/**
 * Time an operation and record histogram
 *
 * Usage: const timer = startTimer('api_request'); ... timer.observe();
 */
export class MetricsTimer {
  private startTime = Date.now();

  constructor(
    private histogram: Histogram,
    private labels?: Record<string, string>,
  ) {}

  observe(): number {
    const duration = Date.now() - this.startTime;
    if (this.labels) {
      this.histogram.observe(this.labels, duration);
    } else {
      this.histogram.observe(duration);
    }
    return duration;
  }
}

export const startTimer = (
  histogram: Histogram,
  labels?: Record<string, string>,
): MetricsTimer => new MetricsTimer(histogram, labels);

// ─── Metrics Export ─────────────────────────────────────────────────────

/**
 * Get all metrics in Prometheus text format
 *
 * Used by GET /metrics endpoint
 */
export const getMetricsText = async (): Promise<string> => metricsRegistry.metrics();

// ─── Batch Operations ───────────────────────────────────────────────────

/**
 * Record webhook received + latency
 */
export const recordWebhookMetrics = (type: string, source: string, latencyMs: number): void => {
  webhookReceivedCounter.inc({ type, source });
  webhookLatencyHistogram.observe({ type }, latencyMs);
};

/**
 * Record conversion with status
 */
export const recordConversionMetrics = (status: 'success' | 'error', source: string): void => {
  conversionRecordedCounter.inc({ status, source });
};

/**
 * Record detected anomaly
 */
export const recordAnomalyMetrics = (type: string, severity: 'critical' | 'high' | 'medium'): void => {
  anomalyDetectedCounter.inc({ type, severity });
};

/**
 * Record executed action
 */
export const recordActionMetrics = (type: string, status: 'completed' | 'failed', latencyMs: number): void => {
  actionExecutedCounter.inc({ type, status });
  actionExecutionLatencyHistogram.observe({ type }, latencyMs);
};

/**
 * Record API error
 */
export const recordApiError = (endpoint: string, statusCode: number): void => {
  apiErrorCounter.inc({ endpoint, status: String(statusCode) });
};

/**
 * Record API latency
 */
export const recordApiLatency = (endpoint: string, method: string, latencyMs: number): void => {
  apiLatencyHistogram.observe({ endpoint, method }, latencyMs);
};

/**
 * Set circuit breaker state
 */
export const setCircuitBreakerState = (service: string, state: 'closed' | 'half-open' | 'open'): void => {
  const stateValue = state === 'closed' ? 0 : state === 'half-open' ? 1 : 2;
  circuitBreakerStateGauge.set({ service }, stateValue);
};

/**
 * Set health check status
 */
export const setHealthcheckStatus = (component: string, healthy: boolean): void => {
  healthcheckStatusGauge.set({ component }, healthy ? 1 : 0);
};

export default {
  metricsRegistry,
  getMetricsText,
  recordWebhookMetrics,
  recordConversionMetrics,
  recordAnomalyMetrics,
  recordActionMetrics,
  recordApiError,
  recordApiLatency,
  setCircuitBreakerState,
  setHealthcheckStatus,
  startTimer,
};
