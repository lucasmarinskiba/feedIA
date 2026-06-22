/**
 * Promise Tracker — lee métricas del sistema y actualiza progreso de promesas.
 *
 * Calcula proyección de cumplimiento y detecta promesas en riesgo.
 */

import { log } from '../../agent/logger.js';
import { audit } from '../../compliance/auditLog.js';
import { getRecentDailyMetrics, getWeeklyVelocity } from '../growth/growthEngine.js';
import { getRecentPosts, getAccountSummary } from '../analytics/performanceDB.js';
import { getAttributionReport } from '../revenueAttribution.js';
import type { PromiseContract, PromiseStatus } from './promiseRegistry.js';
import { updatePromise, listPromises } from './promiseRegistry.js';

export interface PromiseProjection {
  promiseId: string;
  currentProgress: number;
  projectedProgress: number; // % proyectado al deadline
  projectedValue: number; // valor proyectado al deadline
  daysRemaining: number;
  velocity: number; // unidades por día
  onTrack: boolean;
  riskScore: number; // 0-100, más alto = más riesgo
}

const getMetricValue = (promise: PromiseContract): number => {
  switch (promise.metric.metric) {
    case 'followers': {
      const metrics = getRecentDailyMetrics(7);
      const latest = metrics[metrics.length - 1];
      return latest?.followers ?? 0;
    }
    case 'engagement_rate': {
      const summary = getAccountSummary();
      return summary.avgEngagementRate;
    }
    case 'reach_per_post': {
      const posts = getRecentPosts(14);
      if (posts.length === 0) return 0;
      return posts.reduce((s, p) => s + p.metrics.reach, 0) / posts.length;
    }
    case 'posts_count': {
      const posts = getRecentPosts(30);
      const start = new Date(promise.createdAt).getTime();
      return posts.filter((p) => new Date(p.publishedAt).getTime() >= start).length;
    }
    case 'leads': {
      const report = getAttributionReport(30);
      return report.totalConversions;
    }
    case 'sales': {
      const report = getAttributionReport(30);
      return report.totalRevenue;
    }
    case 'hours_saved': {
      // Métrica proxy: posts publicados × 2 horas de ahorro estimado por post
      const posts = getRecentPosts(30);
      const start = new Date(promise.createdAt).getTime();
      const postsInPeriod = posts.filter((p) => new Date(p.publishedAt).getTime() >= start).length;
      return postsInPeriod * 2;
    }
    default:
      return 0;
  }
};

const getVelocity = (promise: PromiseContract): number => {
  const daysSinceStart = Math.max(
    1,
    Math.ceil((Date.now() - new Date(promise.createdAt).getTime()) / (24 * 60 * 60 * 1000)),
  );

  switch (promise.metric.metric) {
    case 'followers':
      return getWeeklyVelocity();
    case 'engagement_rate': {
      const summary = getAccountSummary();
      return summary.avgEngagementRate / daysSinceStart;
    }
    case 'reach_per_post': {
      const posts = getRecentPosts(14);
      if (posts.length === 0) return 0;
      const avgReach = posts.reduce((s, p) => s + p.metrics.reach, 0) / posts.length;
      return avgReach / daysSinceStart;
    }
    case 'posts_count': {
      const posts = getRecentPosts(30);
      const start = new Date(promise.createdAt).getTime();
      const count = posts.filter((p) => new Date(p.publishedAt).getTime() >= start).length;
      return count / daysSinceStart;
    }
    case 'leads': {
      const report = getAttributionReport(30);
      return report.totalConversions / 30;
    }
    case 'sales': {
      const report = getAttributionReport(30);
      return report.totalRevenue / 30;
    }
    case 'hours_saved': {
      return getVelocity({ ...promise, metric: { ...promise.metric, metric: 'posts_count' } }) * 2;
    }
    default:
      return 0;
  }
};

export const trackPromiseProgress = (promise: PromiseContract): PromiseContract => {
  const currentValue = getMetricValue(promise);
  const baseline = promise.metric.baseline ?? 0;
  const target = promise.metric.target;
  const span = target - baseline;

  const progress = span > 0 ? Math.min(100, ((currentValue - baseline) / span) * 100) : 0;
  const roundedProgress = Math.round(progress);

  const updated = updatePromise(promise.id, { progress: roundedProgress });
  if (!updated) return promise;

  log.info(`[PromiseTracker] ${promise.id}: ${roundedProgress}% (${currentValue}/${target} ${promise.metric.unit})`);
  return updated;
};

export const getPromiseProjections = (promise: PromiseContract): PromiseProjection => {
  const currentValue = getMetricValue(promise);
  const baseline = promise.metric.baseline ?? 0;
  const target = promise.metric.target;
  const span = target - baseline;

  const now = Date.now();
  const deadlineTime = new Date(promise.deadline).getTime();
  const daysRemaining = Math.max(0, Math.ceil((deadlineTime - now) / (24 * 60 * 60 * 1000)));

  const velocity = getVelocity(promise);
  const projectedValue = currentValue + velocity * daysRemaining;
  const projectedProgress = span > 0 ? Math.min(100, ((projectedValue - baseline) / span) * 100) : 0;

  // Risk score: 0 = seguro, 100 = imposible
  const timeElapsed = Math.max(1, (now - new Date(promise.createdAt).getTime()) / (24 * 60 * 60 * 1000));
  const totalTime = Math.max(1, (deadlineTime - new Date(promise.createdAt).getTime()) / (24 * 60 * 60 * 1000));
  const expectedProgress = (timeElapsed / totalTime) * 100;
  const riskScore = Math.max(0, Math.min(100, expectedProgress - promise.progress + 20));

  return {
    promiseId: promise.id,
    currentProgress: promise.progress,
    projectedProgress: Math.round(projectedProgress),
    projectedValue: Math.round(projectedValue),
    daysRemaining,
    velocity: Math.round(velocity * 100) / 100,
    onTrack: projectedProgress >= 90,
    riskScore: Math.round(riskScore),
  };
};

export const evaluatePromiseRisk = (
  promise: PromiseContract,
): { status: PromiseStatus; riskScore: number; action?: string } => {
  const projection = getPromiseProjections(promise);

  // Si ya cumplió
  if (promise.progress >= 100) {
    return { status: 'fulfilled', riskScore: 0 };
  }

  // Si venció
  if (projection.daysRemaining <= 0) {
    return { status: 'breached', riskScore: 100 };
  }

  // Reglas de riesgo
  const timeRatio =
    projection.daysRemaining /
    Math.max(
      1,
      projection.daysRemaining + (Date.now() - new Date(promise.createdAt).getTime()) / (24 * 60 * 60 * 1000),
    );

  if (projection.riskScore >= 60 || (timeRatio < 0.25 && promise.progress < 50)) {
    return { status: 'at-risk', riskScore: projection.riskScore, action: 'remediation' };
  }

  if (projection.riskScore >= 30 || (timeRatio < 0.5 && promise.progress < 40)) {
    return { status: 'at-risk', riskScore: projection.riskScore, action: 'watch' };
  }

  return { status: 'on-track', riskScore: projection.riskScore };
};

export const trackAllActivePromises = (): {
  updated: number;
  atRisk: PromiseContract[];
  breached: PromiseContract[];
  fulfilled: PromiseContract[];
} => {
  const active = listPromises().filter((p) => ['pending', 'active', 'on-track', 'at-risk'].includes(p.status));
  const atRisk: PromiseContract[] = [];
  const breached: PromiseContract[] = [];
  const fulfilled: PromiseContract[] = [];

  for (const promise of active) {
    const tracked = trackPromiseProgress(promise);
    const risk = evaluatePromiseRisk(tracked);

    if (risk.status !== tracked.status) {
      updatePromise(tracked.id, { status: risk.status });
    }

    if (risk.status === 'at-risk') atRisk.push(tracked);
    if (risk.status === 'breached') breached.push(tracked);
    if (risk.status === 'fulfilled') fulfilled.push(tracked);
  }

  if (atRisk.length > 0) {
    log.warn(`[PromiseTracker] ${atRisk.length} promesa(s) en riesgo`);
    audit({
      action: 'API_REQUEST',
      outcome: 'failure',
      reason: `PROMISE_AT_RISK: ${atRisk.map((p) => p.id).join(', ')}`,
    });
  }

  return { updated: active.length, atRisk, breached, fulfilled };
};
