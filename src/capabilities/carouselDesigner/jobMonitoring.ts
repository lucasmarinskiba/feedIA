/**
 * Job Monitoring — Metrics + dashboard for carousel jobs.
 */

import { getJob, listJobs, updateJob } from './jobQueue.js';
import { log } from '../../agent/logger.js';

export interface JobMetrics {
  totalJobs: number;
  completed: number;
  running: number;
  failed: number;
  avgDurationMs: number;
  successRate: number;
  recentJobs: Array<{
    id: string;
    prompt: string;
    status: string;
    progress: number;
    duration?: number;
  }>;
}

/**
 * Get job metrics for monitoring.
 */
export const getJobMetrics = (): JobMetrics => {
  const allJobs = listJobs();
  const completed = allJobs.filter((j) => j.status === 'done');
  const running = allJobs.filter((j) => j.status === 'running');
  const failed = allJobs.filter((j) => j.status === 'error');

  const durations = completed
    .map((j) => {
      if (j.completedAt && j.createdAt) {
        return new Date(j.completedAt).getTime() - new Date(j.createdAt).getTime();
      }
      return 0;
    })
    .filter((d) => d > 0);

  const avgDurationMs = durations.length > 0 ? durations.reduce((a, b) => a + b) / durations.length : 0;
  const successRate = allJobs.length > 0 ? (completed.length / allJobs.length) * 100 : 0;

  return {
    totalJobs: allJobs.length,
    completed: completed.length,
    running: running.length,
    failed: failed.length,
    avgDurationMs: Math.round(avgDurationMs),
    successRate: Math.round(successRate),
    recentJobs: allJobs.slice(0, 10).map((j) => ({
      id: j.id,
      prompt: j.prompt.substring(0, 50),
      status: j.status,
      progress: j.progress,
      duration:
        j.completedAt && j.createdAt
          ? new Date(j.completedAt).getTime() - new Date(j.createdAt).getTime()
          : undefined,
    })),
  };
};

/**
 * Retry failed job.
 */
export const retryFailedJob = (jobId: string): boolean => {
  const job = getJob(jobId);
  if (!job || job.status !== 'error') {
    return false;
  }

  updateJob(jobId, {
    status: 'queued',
    progress: 0,
    error: undefined,
    log: [...(job.log || []), `[${new Date().toISOString()}] Retry requested`],
  });

  log.info(`[JobMonitor] Job ${jobId} queued for retry`);
  return true;
};

/**
 * Generate HTML dashboard for job monitoring.
 */
export const generateMonitoringDashboard = (): string => {
  const metrics = getJobMetrics();

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Carousel Designer — Job Monitor</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 20px; background: #0f0f12; color: #e0e0e0; }
    .container { max-width: 1200px; margin: 0 auto; }
    h1 { margin-top: 0; }
    .metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 20px 0; }
    .metric { background: #1a1a1f; padding: 20px; border-radius: 8px; border-left: 4px solid #e91e8c; }
    .metric-value { font-size: 28px; font-weight: bold; color: #00d9ff; }
    .metric-label { font-size: 12px; text-transform: uppercase; color: #999; margin-top: 8px; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #333; }
    th { background: #1a1a1f; font-weight: 600; }
    tr:hover { background: #1a1a1f; }
    .status { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; }
    .status.done { background: #4caf50; color: white; }
    .status.running { background: #2196f3; color: white; }
    .status.error { background: #f44336; color: white; }
    .status.queued { background: #ff9800; color: white; }
    .progress-bar { background: #333; height: 6px; border-radius: 3px; overflow: hidden; }
    .progress-fill { background: #4caf50; height: 100%; transition: width 0.3s; }
  </style>
</head>
<body>
  <div class="container">
    <h1>📊 Carousel Designer — Job Monitor</h1>

    <div class="metrics">
      <div class="metric">
        <div class="metric-value">${metrics.totalJobs}</div>
        <div class="metric-label">Total Jobs</div>
      </div>
      <div class="metric">
        <div class="metric-value">${metrics.completed}</div>
        <div class="metric-label">Completed</div>
      </div>
      <div class="metric">
        <div class="metric-value">${metrics.running}</div>
        <div class="metric-label">Running</div>
      </div>
      <div class="metric">
        <div class="metric-value">${metrics.failed}</div>
        <div class="metric-label">Failed</div>
      </div>
      <div class="metric">
        <div class="metric-value">${(metrics.avgDurationMs / 1000).toFixed(1)}s</div>
        <div class="metric-label">Avg Duration</div>
      </div>
      <div class="metric">
        <div class="metric-value">${metrics.successRate}%</div>
        <div class="metric-label">Success Rate</div>
      </div>
    </div>

    <h2>Recent Jobs</h2>
    <table>
      <thead>
        <tr>
          <th>Job ID</th>
          <th>Prompt</th>
          <th>Status</th>
          <th>Progress</th>
          <th>Duration</th>
        </tr>
      </thead>
      <tbody>
        ${metrics.recentJobs
          .map(
            (job) => `
          <tr>
            <td><code style="font-size: 11px; color: #aaa;">${job.id.substring(0, 16)}...</code></td>
            <td>${job.prompt}</td>
            <td><span class="status ${job.status}">${job.status.toUpperCase()}</span></td>
            <td>
              <div class="progress-bar">
                <div class="progress-fill" style="width: ${job.progress}%;"></div>
              </div>
              ${job.progress}%
            </td>
            <td>${job.duration ? (job.duration / 1000).toFixed(1) + 's' : '—'}</td>
          </tr>
        `,
          )
          .join('')}
      </tbody>
    </table>
  </div>
</body>
</html>
  `;
};

export const jobMonitoring = {
  getJobMetrics,
  retryFailedJob,
  generateMonitoringDashboard,
};
