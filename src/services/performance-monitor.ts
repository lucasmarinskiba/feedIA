/**
 * Performance Monitoring Service
 * Tracks endpoint performance, caching effectiveness, and identifies bottlenecks
 */

import type { Request, Response } from 'express';

interface PerformanceMetric {
  endpoint: string;
  method: string;
  statusCode: number;
  responseTimeMs: number;
  cachedResponse: boolean;
  dbTimeMs: number;
  payloadSizeBytes: number;
  timestamp: Date;
}

interface EndpointStats {
  endpoint: string;
  requestCount: number;
  avgResponseTimeMs: number;
  p50ResponseTimeMs: number;
  p95ResponseTimeMs: number;
  p99ResponseTimeMs: number;
  minResponseTimeMs: number;
  maxResponseTimeMs: number;
  successRate: number;
  cacheHitRate: number;
  avgPayloadSizeBytes: number;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private readonly maxMetrics = 10000; // Keep last 10k metrics
  private readonly aggregateWindow = 60000; // 60s window for aggregation
  private lastAggregateTime = Date.now();

  /**
   * Record a request's performance metrics
   */
  recordMetric(
    endpoint: string,
    method: string,
    statusCode: number,
    responseTimeMs: number,
    cachedResponse: boolean,
    dbTimeMs: number = 0,
    payloadSizeBytes: number = 0,
  ): void {
    const metric: PerformanceMetric = {
      endpoint,
      method,
      statusCode,
      responseTimeMs,
      cachedResponse,
      dbTimeMs,
      payloadSizeBytes,
      timestamp: new Date(),
    };

    this.metrics.push(metric);

    // Keep memory bounded
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }
  }

  /**
   * Get aggregated stats for an endpoint
   */
  getEndpointStats(endpoint: string): EndpointStats | null {
    const endpointMetrics = this.metrics.filter((m) => m.endpoint === endpoint);

    if (endpointMetrics.length === 0) {
      return null;
    }

    const responseTimes = endpointMetrics.map((m) => m.responseTimeMs).sort((a, b) => a - b);
    const cacheHits = endpointMetrics.filter((m) => m.cachedResponse).length;
    const successes = endpointMetrics.filter((m) => m.statusCode >= 200 && m.statusCode < 300).length;
    const avgPayloadSize = endpointMetrics.reduce((sum, m) => sum + m.payloadSizeBytes, 0) / endpointMetrics.length;

    const getPercentile = (arr: number[], p: number): number => {
      const index = Math.ceil((p / 100) * arr.length) - 1;
      return arr[Math.max(0, index)];
    };

    return {
      endpoint,
      requestCount: endpointMetrics.length,
      avgResponseTimeMs: responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length,
      p50ResponseTimeMs: getPercentile(responseTimes, 50),
      p95ResponseTimeMs: getPercentile(responseTimes, 95),
      p99ResponseTimeMs: getPercentile(responseTimes, 99),
      minResponseTimeMs: Math.min(...responseTimes),
      maxResponseTimeMs: Math.max(...responseTimes),
      successRate: (successes / endpointMetrics.length) * 100,
      cacheHitRate: (cacheHits / endpointMetrics.length) * 100,
      avgPayloadSizeBytes,
    };
  }

  /**
   * Get all endpoint stats
   */
  getAllEndpointStats(): EndpointStats[] {
    const endpoints = [...new Set(this.metrics.map((m) => m.endpoint))];
    return endpoints
      .map((ep) => this.getEndpointStats(ep))
      .filter((stats) => stats !== null) as EndpointStats[];
  }

  /**
   * Get slow endpoints (avg response time > threshold)
   */
  getSlowEndpoints(thresholdMs: number = 200): EndpointStats[] {
    return this.getAllEndpointStats().filter((stats) => stats.avgResponseTimeMs > thresholdMs);
  }

  /**
   * Get cache effectiveness
   */
  getCacheStats(): {
    overallHitRate: number;
    bestCachedEndpoint: string | null;
    worstCachedEndpoint: string | null;
    totalCacheHits: number;
    totalRequests: number;
  } {
    const totalRequests = this.metrics.length;
    const totalCacheHits = this.metrics.filter((m) => m.cachedResponse).length;

    const allStats = this.getAllEndpointStats();
    const bestCached = allStats.reduce((best, current) => {
      return current.cacheHitRate > (best?.cacheHitRate ?? 0) ? current : best;
    }, null as EndpointStats | null);

    const worstCached = allStats.reduce((worst, current) => {
      return current.cacheHitRate < (worst?.cacheHitRate ?? 100) ? current : worst;
    }, null as EndpointStats | null);

    return {
      overallHitRate: totalRequests > 0 ? (totalCacheHits / totalRequests) * 100 : 0,
      bestCachedEndpoint: bestCached?.endpoint ?? null,
      worstCachedEndpoint: worstCached?.endpoint ?? null,
      totalCacheHits,
      totalRequests,
    };
  }

  /**
   * Get database performance summary
   */
  getDbPerformance(): {
    totalDbTime: number;
    avgDbTimeMs: number;
    maxDbTimeMs: number;
    slowQueryThreshold: number;
  } {
    const dbMetrics = this.metrics.filter((m) => m.dbTimeMs > 0);

    if (dbMetrics.length === 0) {
      return {
        totalDbTime: 0,
        avgDbTimeMs: 0,
        maxDbTimeMs: 0,
        slowQueryThreshold: 100,
      };
    }

    return {
      totalDbTime: dbMetrics.reduce((sum, m) => sum + m.dbTimeMs, 0),
      avgDbTimeMs: dbMetrics.reduce((sum, m) => sum + m.dbTimeMs, 0) / dbMetrics.length,
      maxDbTimeMs: Math.max(...dbMetrics.map((m) => m.dbTimeMs)),
      slowQueryThreshold: 100,
    };
  }

  /**
   * Generate performance report
   */
  generateReport(): string {
    const allStats = this.getAllEndpointStats();
    const slowEndpoints = this.getSlowEndpoints();
    const cacheStats = this.getCacheStats();
    const dbStats = this.getDbPerformance();

    let report = '\n═══════════════════════════════════════════════════════════════\n';
    report += '                   PERFORMANCE REPORT\n';
    report += '═══════════════════════════════════════════════════════════════\n\n';

    // Summary
    report += `OVERALL METRICS\n`;
    report += `  Total Requests: ${cacheStats.totalRequests}\n`;
    report += `  Cache Hit Rate: ${cacheStats.overallHitRate.toFixed(1)}%\n`;
    report += `  Avg DB Time: ${dbStats.avgDbTimeMs.toFixed(1)}ms\n`;
    report += `  Total DB Time: ${dbStats.totalDbTime.toFixed(0)}ms\n\n`;

    // Endpoint stats
    report += `ENDPOINT PERFORMANCE (sorted by avg response time)\n`;
    report += `${'Endpoint'.padEnd(50)} ${'Requests'.padEnd(10)} ${'Avg (ms)'.padEnd(10)} ${'P95 (ms)'.padEnd(10)} ${'Cache %'.padEnd(10)}\n`;
    report += '-'.repeat(90) + '\n';

    const sortedStats = [...allStats].sort((a, b) => b.avgResponseTimeMs - a.avgResponseTimeMs);
    for (const stats of sortedStats) {
      report += `${stats.endpoint.padEnd(50)} ${stats.requestCount.toString().padEnd(10)} ${stats.avgResponseTimeMs.toFixed(1).padEnd(10)} ${stats.p95ResponseTimeMs.toFixed(1).padEnd(10)} ${stats.cacheHitRate.toFixed(1).padEnd(10)}\n`;
    }

    report += '\n';

    // Slow endpoints
    if (slowEndpoints.length > 0) {
      report += `SLOW ENDPOINTS (> 200ms)\n`;
      for (const stats of slowEndpoints) {
        report += `  ⚠ ${stats.endpoint}: ${stats.avgResponseTimeMs.toFixed(0)}ms avg, P95: ${stats.p95ResponseTimeMs.toFixed(0)}ms\n`;
      }
      report += '\n';
    }

    // Recommendations
    report += `RECOMMENDATIONS\n`;
    if (cacheStats.overallHitRate < 50) {
      report += `  1. Improve caching strategy (current hit rate: ${cacheStats.overallHitRate.toFixed(1)}%)\n`;
    }
    if (dbStats.avgDbTimeMs > 50) {
      report += `  2. Optimize database queries (avg DB time: ${dbStats.avgDbTimeMs.toFixed(1)}ms)\n`;
    }
    if (slowEndpoints.length > 0) {
      report += `  3. Add indexes for: ${slowEndpoints.map((s) => s.endpoint).join(', ')}\n`;
    }

    report += '\n═══════════════════════════════════════════════════════════════\n';

    return report;
  }

  /**
   * Clear metrics (for testing)
   */
  clear(): void {
    this.metrics = [];
    this.lastAggregateTime = Date.now();
  }

  /**
   * Export metrics for external analysis
   */
  exportMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }
}

// Singleton instance
const perfMonitor = new PerformanceMonitor();

/**
 * Middleware: Auto-record performance metrics
 */
export const performanceMiddleware = (req: Request, res: Response, next: () => void): void => {
  const startTime = Date.now();

  // Intercept response
  const originalJson = res.json.bind(res);
  res.json = ((data: unknown): Response => {
    const responseTimeMs = Date.now() - startTime;
    const payloadSizeBytes = JSON.stringify(data).length;

    perfMonitor.recordMetric(
      req.path,
      req.method,
      res.statusCode,
      responseTimeMs,
      (res.get('X-Cache') === 'HIT') || false,
      0, // dbTimeMs would be tracked separately
      payloadSizeBytes,
    );

    return originalJson(data);
  }) as typeof res.json;

  next();
};

export { perfMonitor as performanceMonitor };
export type { PerformanceMetric, EndpointStats };
