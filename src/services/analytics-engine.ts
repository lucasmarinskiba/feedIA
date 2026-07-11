/**
 * Analytics Engine
 * Metrics, performance tracking, optimization recommendations
 * Monitors all aspects of FeedIA operations
 */

import { log } from '../agent/logger.js';

interface SystemMetrics {
  timestamp: string;
  prompts: {
    total: number;
    base: number;
    expanded: number;
  };
  content: {
    generated: number;
    validated: number;
    quality_avg: number;
  };
  performance: {
    avg_response_time_ms: number;
    api_calls_per_minute: number;
    error_rate: number;
    success_rate: number;
  };
  agents: {
    active_count: number;
    avg_latency_ms: number;
    total_tasks: number;
  };
}

interface OptimizationRecommendation {
  category: string; // 'performance', 'quality', 'cost', 'scalability'
  severity: 'low' | 'medium' | 'high' | 'critical';
  issue: string;
  recommendation: string;
  estimatedImprovement: string;
}

class AnalyticsEngine {
  private metrics: SystemMetrics[] = [];
  private errorLog: Array<{ timestamp: string; error: string; source: string }> = [];
  private callCounter = 0;
  private startTime = Date.now();

  /**
   * Record API call
   */
  recordAPICall(endpoint: string, statusCode: number, responseTimeMs: number): void {
    this.callCounter++;

    if (statusCode >= 400) {
      this.errorLog.push({
        timestamp: new Date().toISOString(),
        error: `${statusCode} error on ${endpoint}`,
        source: endpoint,
      });
    }

    log.info('[Analytics] API call recorded', { endpoint, statusCode, responseTimeMs });
  }

  /**
   * Record content generation
   */
  recordContentGeneration(
    format: string,
    quality_score: number,
    latency_ms: number,
    success: boolean
  ): void {
    if (!success) {
      this.errorLog.push({
        timestamp: new Date().toISOString(),
        error: `Failed to generate ${format}`,
        source: 'content-generation',
      });
    }

    log.info('[Analytics] Content generated', {
      format,
      quality: quality_score,
      latency: latency_ms,
    });
  }

  /**
   * Calculate current metrics
   */
  calculateMetrics(
    totalPrompts: number,
    basePrompts: number,
    expandedPrompts: number,
    generatedContent: number,
    validatedContent: number,
    avgQuality: number,
    agentCount: number,
    avgAgentLatency: number,
    totalAgentTasks: number
  ): SystemMetrics {
    const uptime = (Date.now() - this.startTime) / 1000 / 60; // minutes
    const callsPerMinute = uptime > 0 ? this.callCounter / uptime : 0;
    const errorCount = this.errorLog.length;
    const totalCalls = this.callCounter;
    const errorRate = totalCalls > 0 ? (errorCount / totalCalls) * 100 : 0;
    const successRate = 100 - errorRate;

    const metrics: SystemMetrics = {
      timestamp: new Date().toISOString(),
      prompts: {
        total: totalPrompts,
        base: basePrompts,
        expanded: expandedPrompts,
      },
      content: {
        generated: generatedContent,
        validated: validatedContent,
        quality_avg: avgQuality,
      },
      performance: {
        avg_response_time_ms: 0, // TODO: Calculate from call log
        api_calls_per_minute: callsPerMinute,
        error_rate: Math.round(errorRate * 100) / 100,
        success_rate: Math.round(successRate * 100) / 100,
      },
      agents: {
        active_count: agentCount,
        avg_latency_ms: avgAgentLatency,
        total_tasks: totalAgentTasks,
      },
    };

    this.metrics.push(metrics);

    log.info('[Analytics] Metrics calculated', {
      totalPrompts,
      generatedContent,
      avgQuality,
      errorRate: metrics.performance.error_rate,
    });

    return metrics;
  }

  /**
   * Generate optimization recommendations
   */
  generateRecommendations(currentMetrics: SystemMetrics): OptimizationRecommendation[] {
    const recommendations: OptimizationRecommendation[] = [];

    // Performance checks
    if (currentMetrics.performance.error_rate > 5) {
      recommendations.push({
        category: 'performance',
        severity: 'high',
        issue: 'Error rate exceeds 5%',
        recommendation: 'Review error logs and scale error handling capacity',
        estimatedImprovement: '3-5% error reduction',
      });
    }

    if (currentMetrics.agents.avg_latency_ms > 5000) {
      recommendations.push({
        category: 'performance',
        severity: 'high',
        issue: 'Agent latency >5s average',
        recommendation: 'Add more agent workers or optimize task distribution',
        estimatedImprovement: '40-50% latency reduction',
      });
    }

    // Quality checks
    if (currentMetrics.content.quality_avg < 70) {
      recommendations.push({
        category: 'quality',
        severity: 'critical',
        issue: 'Average content quality <70',
        recommendation: 'Strengthen quality validation and refinement pipeline',
        estimatedImprovement: '15-20 point quality increase',
      });
    }

    // Scalability checks
    if (currentMetrics.prompts.total > 300000 && currentMetrics.agents.active_count < 5) {
      recommendations.push({
        category: 'scalability',
        severity: 'medium',
        issue: 'Large prompt library with few agents',
        recommendation: 'Scale agent count proportionally (1 agent per 50K prompts)',
        estimatedImprovement: 'Linear throughput improvement',
      });
    }

    // Cost optimization
    if (currentMetrics.performance.api_calls_per_minute > 100) {
      recommendations.push({
        category: 'cost',
        severity: 'medium',
        issue: 'High API call rate (>100/min)',
        recommendation: 'Implement prompt caching and batch processing',
        estimatedImprovement: '30-40% API cost reduction',
      });
    }

    log.info('[Analytics] Recommendations generated', {
      count: recommendations.length,
      critical: recommendations.filter(r => r.severity === 'critical').length,
    });

    return recommendations;
  }

  /**
   * Get recent errors
   */
  getRecentErrors(limit: number = 20): Array<{ timestamp: string; error: string; source: string }> {
    return this.errorLog.slice(-limit).reverse();
  }

  /**
   * Get metrics trends
   */
  getMetricsTrends(timeWindowMinutes: number = 60): Record<string, any> {
    const now = Date.now();
    const windowMs = timeWindowMinutes * 60 * 1000;

    const recentMetrics = this.metrics.filter(m => {
      const mTime = new Date(m.timestamp).getTime();
      return now - mTime <= windowMs;
    });

    if (recentMetrics.length === 0) {
      return { status: 'no_data', timeWindow: timeWindowMinutes };
    }

    const first = recentMetrics[0]!;
    const last = recentMetrics[recentMetrics.length - 1]!;

    return {
      timeWindow: timeWindowMinutes,
      dataPoints: recentMetrics.length,
      contentGenerated: {
        start: first.content.generated,
        end: last.content.generated,
        delta: last.content.generated - first.content.generated,
      },
      qualityTrend: {
        start: first.content.quality_avg,
        end: last.content.quality_avg,
        delta: last.content.quality_avg - first.content.quality_avg,
      },
      errorRate: {
        start: first.performance.error_rate,
        end: last.performance.error_rate,
        delta: last.performance.error_rate - first.performance.error_rate,
      },
      agentLatency: {
        start: first.agents.avg_latency_ms,
        end: last.agents.avg_latency_ms,
        delta: last.agents.avg_latency_ms - first.agents.avg_latency_ms,
      },
    };
  }

  /**
   * Generate health report
   */
  generateHealthReport(): Record<string, any> {
    if (this.metrics.length === 0) {
      return { status: 'no_metrics_yet' };
    }

    const latest = this.metrics[this.metrics.length - 1]!;

    const healthStatus =
      latest.content.quality_avg >= 75 &&
      latest.performance.error_rate < 5 &&
      latest.performance.success_rate > 95
        ? 'healthy'
        : 'needs_attention';

    return {
      status: healthStatus,
      timestamp: latest.timestamp,
      summary: {
        'Total Prompts': latest.prompts.total.toLocaleString(),
        'Content Generated': latest.content.generated.toLocaleString(),
        'Avg Quality Score': latest.content.quality_avg.toFixed(1),
        'Success Rate': `${latest.performance.success_rate.toFixed(1)}%`,
        'Error Rate': `${latest.performance.error_rate.toFixed(1)}%`,
        'Active Agents': latest.agents.active_count,
        'Avg Agent Latency': `${latest.agents.avg_latency_ms}ms`,
      },
      systemLoad: {
        apiCallsPerMinute: latest.performance.api_calls_per_minute.toFixed(1),
        totalAgentTasks: latest.agents.total_tasks.toLocaleString(),
      },
      warnings: latest.performance.error_rate > 5 ? ['High error rate'] : [],
    };
  }
}

export const analyticsEngine = new AnalyticsEngine();
