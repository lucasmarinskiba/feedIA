/**
 * Performance Monitoring
 * Track response times, cache hits, DB queries
 */

interface PerfMetric {
  timestamp: Date;
  endpoint: string;
  method: string;
  duration: number; // ms
  statusCode: number;
  cacheHit: boolean;
  dbQueries: number;
}

class PerformanceMonitor {
  private metrics: PerfMetric[] = [];
  private maxMetrics = 10000;

  record(metric: PerfMetric): void {
    this.metrics.push(metric);

    // Trim old metrics if over limit
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }
  }

  /**
   * Endpoint statistics
   */
  getEndpointStats(endpoint: string, method: string = 'GET'): {
    calls: number;
    avgDuration: number;
    p50: number;
    p95: number;
    p99: number;
    errorRate: number;
    cacheHitRate: number;
  } {
    const filtered = this.metrics.filter(
      m => m.endpoint === endpoint && m.method === method
    );

    if (filtered.length === 0) {
      return {
        calls: 0,
        avgDuration: 0,
        p50: 0,
        p95: 0,
        p99: 0,
        errorRate: 0,
        cacheHitRate: 0,
      };
    }

    const durations = filtered.map(m => m.duration).sort((a, b) => a - b);
    const errors = filtered.filter(m => m.statusCode >= 400).length;
    const cacheHits = filtered.filter(m => m.cacheHit).length;

    return {
      calls: filtered.length,
      avgDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
      p50: durations[Math.floor(durations.length * 0.5)],
      p95: durations[Math.floor(durations.length * 0.95)],
      p99: durations[Math.floor(durations.length * 0.99)],
      errorRate: errors / filtered.length,
      cacheHitRate: cacheHits / filtered.length,
    };
  }

  /**
   * Slowest endpoints
   */
  getSlowEndpoints(limit = 10): Array<{
    endpoint: string;
    method: string;
    avgDuration: number;
    calls: number;
  }> {
    const endpoints = new Map<string, PerfMetric[]>();

    for (const metric of this.metrics) {
      const key = `${metric.method}:${metric.endpoint}`;
      if (!endpoints.has(key)) {
        endpoints.set(key, []);
      }
      endpoints.get(key)!.push(metric);
    }

    return Array.from(endpoints.entries())
      .map(([key, metrics]) => {
        const [method, endpoint] = key.split(':');
        const avgDuration =
          metrics.reduce((a, m) => a + m.duration, 0) / metrics.length;
        return { endpoint, method, avgDuration, calls: metrics.length };
      })
      .sort((a, b) => b.avgDuration - a.avgDuration)
      .slice(0, limit);
  }

  /**
   * Cache hit statistics
   */
  getCacheStats(): {
    totalRequests: number;
    cacheHits: number;
    hitRate: number;
  } {
    const total = this.metrics.length;
    const hits = this.metrics.filter(m => m.cacheHit).length;

    return {
      totalRequests: total,
      cacheHits: hits,
      hitRate: total > 0 ? hits / total : 0,
    };
  }

  /**
   * System health summary
   */
  getSystemHealth(): {
    uptime: number;
    totalRequests: number;
    avgResponseTime: number;
    errorRate: number;
    healthStatus: 'healthy' | 'degraded' | 'critical';
  } {
    if (this.metrics.length === 0) {
      return {
        uptime: 0,
        totalRequests: 0,
        avgResponseTime: 0,
        errorRate: 0,
        healthStatus: 'healthy',
      };
    }

    const durations = this.metrics.map(m => m.duration);
    const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
    const errors = this.metrics.filter(m => m.statusCode >= 500).length;
    const errorRate = errors / this.metrics.length;

    let healthStatus: 'healthy' | 'degraded' | 'critical' = 'healthy';
    if (errorRate > 0.05) healthStatus = 'degraded';
    if (errorRate > 0.1 || avgDuration > 5000) healthStatus = 'critical';

    return {
      uptime: Date.now() - this.metrics[0].timestamp.getTime(),
      totalRequests: this.metrics.length,
      avgResponseTime: avgDuration,
      errorRate,
      healthStatus,
    };
  }

  /**
   * Export metrics for alerting
   */
  exportJSON() {
    return {
      timestamp: new Date().toISOString(),
      summary: this.getSystemHealth(),
      cache: this.getCacheStats(),
      slowEndpoints: this.getSlowEndpoints(5),
      totalMetricsRecorded: this.metrics.length,
    };
  }

  clear(): void {
    this.metrics = [];
  }
}

export const perfMonitor = new PerformanceMonitor();

/**
 * Express middleware for automatic performance tracking
 */
export const perfMiddleware = (req: any, res: any, next: any) => {
  const startTime = Date.now();
  const originalJson = res.json.bind(res);

  res.json = function (data: unknown) {
    const duration = Date.now() - startTime;
    const cacheHit = res.getHeader('x-cache') === 'HIT';
    const dbQueries = parseInt(res.getHeader('x-db-queries') || '0');

    perfMonitor.record({
      timestamp: new Date(),
      endpoint: req.path,
      method: req.method,
      duration,
      statusCode: res.statusCode,
      cacheHit,
      dbQueries,
    });

    // Log if slow
    if (duration > 1000) {
      console.warn(`⚠️  Slow endpoint: ${req.method} ${req.path} (${duration}ms)`);
    }

    return originalJson(data);
  };

  next();
};
