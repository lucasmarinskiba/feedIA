/**
 * Agency Metrics (TIER 8 Phase 4)
 * Prometheus metrics for orchestration + batch processing
 */

interface AgencyMetrics {
  totalCampaigns: number;
  successfulCampaigns: number;
  failedCampaigns: number;
  totalTokensUsed: number;
  totalCostEstimated: number;
  averageLatencyMs: number;
  batchesProcessed: number;
  averageBatchSize: number;
  lastCampaignTimestamp: string;
}

class AgencyMetricsCollector {
  private campaigns: Array<{ timestamp: string; latencyMs: number; tokens: number; cost: number; status: string }> = [];
  private batches: Array<{ timestamp: string; size: number; completedMs: number; failedCount: number }> = [];

  recordCampaign(latencyMs: number, tokens: number, cost: number, status: 'success' | 'failed'): void {
    this.campaigns.push({
      timestamp: new Date().toISOString(),
      latencyMs,
      tokens,
      cost,
      status,
    });
  }

  recordBatch(size: number, completedMs: number, failedCount: number): void {
    this.batches.push({
      timestamp: new Date().toISOString(),
      size,
      completedMs,
      failedCount,
    });
  }

  getMetrics(): AgencyMetrics {
    const successful = this.campaigns.filter((c) => c.status === 'success').length;
    const failed = this.campaigns.filter((c) => c.status === 'failed').length;
    const totalTokens = this.campaigns.reduce((sum, c) => sum + c.tokens, 0);
    const totalCost = this.campaigns.reduce((sum, c) => sum + c.cost, 0);
    const avgLatency = this.campaigns.length > 0 ? this.campaigns.reduce((sum, c) => sum + c.latencyMs, 0) / this.campaigns.length : 0;
    const avgBatchSize = this.batches.length > 0 ? this.batches.reduce((sum, b) => sum + b.size, 0) / this.batches.length : 0;

    return {
      totalCampaigns: this.campaigns.length,
      successfulCampaigns: successful,
      failedCampaigns: failed,
      totalTokensUsed: totalTokens,
      totalCostEstimated: totalCost,
      averageLatencyMs: Math.round(avgLatency),
      batchesProcessed: this.batches.length,
      averageBatchSize: Math.round(avgBatchSize),
      lastCampaignTimestamp: this.campaigns[this.campaigns.length - 1]?.timestamp || 'never',
    };
  }

  getPrometheusFormat(): string {
    const metrics = this.getMetrics();
    return `# HELP agency_campaigns_total Total campaigns processed
# TYPE agency_campaigns_total counter
agency_campaigns_total{status="success"} ${metrics.successfulCampaigns}
agency_campaigns_total{status="failed"} ${metrics.failedCampaigns}

# HELP agency_tokens_used Total tokens consumed
# TYPE agency_tokens_used counter
agency_tokens_used ${metrics.totalTokensUsed}

# HELP agency_cost_estimated Total cost (USD)
# TYPE agency_cost_estimated gauge
agency_cost_estimated ${metrics.totalCostEstimated.toFixed(4)}

# HELP agency_latency_ms Average campaign latency
# TYPE agency_latency_ms gauge
agency_latency_ms ${metrics.averageLatencyMs}

# HELP agency_batches_total Batches processed
# TYPE agency_batches_total counter
agency_batches_total ${metrics.batchesProcessed}

# HELP agency_batch_size_avg Average batch size
# TYPE agency_batch_size_avg gauge
agency_batch_size_avg ${metrics.averageBatchSize}
`;
  }

  reset(): void {
    this.campaigns = [];
    this.batches = [];
  }
}

// Global singleton
export const metricsCollector = new AgencyMetricsCollector();

export const getHealthCheck = () => ({
  status: 'healthy',
  service: 'agency-orchestration',
  version: 'TIER 8 Phase 4',
  metrics: metricsCollector.getMetrics(),
  timestamp: new Date().toISOString(),
});
