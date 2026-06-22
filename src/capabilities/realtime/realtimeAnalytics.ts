/**
 * Realtime Analytics — Métricas en tiempo real con ventanas deslizantes.
 * Agregación de eventos en tiempo real para dashboards y alertas.
 */

import { log } from '../../agent/logger.js';

export interface MetricWindow {
  metric: string;
  windowSec: number;
  values: Array<{ timestamp: string; value: number }>;
  aggregated: {
    count: number;
    sum: number;
    avg: number;
    min: number;
    max: number;
    last: number;
  };
}

const windows = new Map<string, MetricWindow>();
const DEFAULT_WINDOW_SEC = 60;

export const recordMetric = (metric: string, value: number, windowSec = DEFAULT_WINDOW_SEC): MetricWindow => {
  const key = `${metric}:${windowSec}`;
  const now = new Date().toISOString();

  let win = windows.get(key);
  if (!win) {
    win = {
      metric,
      windowSec,
      values: [],
      aggregated: { count: 0, sum: 0, avg: 0, min: Infinity, max: -Infinity, last: 0 },
    };
    windows.set(key, win);
  }

  // Prune old values
  const cutoff = new Date(Date.now() - windowSec * 1000).toISOString();
  win.values = win.values.filter((v) => v.timestamp >= cutoff);

  win.values.push({ timestamp: now, value });
  win.aggregated = {
    count: win.values.length,
    sum: win.values.reduce((s, v) => s + v.value, 0),
    avg: win.values.length > 0 ? win.values.reduce((s, v) => s + v.value, 0) / win.values.length : 0,
    min: win.values.length > 0 ? Math.min(...win.values.map((v) => v.value)) : 0,
    max: win.values.length > 0 ? Math.max(...win.values.map((v) => v.value)) : 0,
    last: value,
  };

  return win;
};

export const getWindow = (metric: string, windowSec = DEFAULT_WINDOW_SEC): MetricWindow | undefined =>
  windows.get(`${metric}:${windowSec}`);

export const getAllMetrics = (): string[] => Array.from(new Set(Array.from(windows.values()).map((w) => w.metric)));

export const getDashboardSnapshot = (): Record<string, MetricWindow['aggregated']> => {
  const snapshot: Record<string, MetricWindow['aggregated']> = {};
  for (const [, win] of windows) {
    snapshot[win.metric] = win.aggregated;
  }
  return snapshot;
};

export const compareWindows = (
  metric: string,
  windowA: number,
  windowB: number,
): { change: number; changePct: number } => {
  const a = getWindow(metric, windowA)?.aggregated.avg ?? 0;
  const b = getWindow(metric, windowB)?.aggregated.avg ?? 0;
  const change = b - a;
  const changePct = a !== 0 ? Math.round((change / a) * 1000) / 10 : 0;
  return { change, changePct };
};

export const flushOldWindows = (maxAgeSec = 3600): number => {
  const cutoff = new Date(Date.now() - maxAgeSec * 1000).toISOString();
  let removed = 0;
  for (const [key, win] of windows) {
    if (win.values.length === 0 || win.values[win.values.length - 1]!.timestamp < cutoff) {
      windows.delete(key);
      removed++;
    }
  }
  if (removed > 0) log.info(`[RealtimeAnalytics] Flushed ${removed} old windows`);
  return removed;
};
