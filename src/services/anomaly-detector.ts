/**
 * Anomaly Detector — Identify critical deviations from baseline
 *
 * Flow: Live metrics → Compare vs baseline → Flag anomalies → Calculate severity
 *
 * Tunable per account. Baselines learned from historical data (TODO: implement ML).
 * Current: deterministic thresholds, but tunable via account settings.
 */

import { log } from '../agent/logger.js';

// ─── Types ──────────────────────────────────────────────────────────────

export interface AnomalyThresholds {
  viralScoreDropPercent: number; // e.g., 50 = drop >50% triggers alert
  churnAccelerationMultiplier: number; // e.g., 2 = 2x baseline churn
  leadStallDays: number; // e.g., 7 = no new leads in 7 days
  roiCollapsePercent: number; // e.g., 50 = ROI drops >50%
}

export interface Anomaly {
  type: 'viralDrop' | 'churnAcceleration' | 'leadStall' | 'roiCollapse';
  severity: 'critical' | 'high' | 'medium';
  detected: string; // ISO timestamp
  baseline: number;
  current: number;
  deviation: number; // percent
  details: Record<string, unknown>;
}

export interface AnomalyScanResult {
  accountId: string;
  timestamp: string;
  anomalies: Anomaly[];
  hasAnomalies: boolean;
  severity: 'critical' | 'high' | 'medium' | 'none';
}

// ─── Default Thresholds ────────────────────────────────────────────────

const DEFAULT_THRESHOLDS: AnomalyThresholds = {
  viralScoreDropPercent: 50,
  churnAccelerationMultiplier: 2,
  leadStallDays: 7,
  roiCollapsePercent: 50,
};

// ─── Anomaly Detection Functions ────────────────────────────────────────

/**
 * Detect viral score drop >X%
 *
 * Baseline: historical 7-day avg. Current: last 24h
 * Alert if: (baseline - current) / baseline > threshold
 */
export const detectViralDrop = (
  baseline: number,
  current: number,
  threshold: number = DEFAULT_THRESHOLDS.viralScoreDropPercent,
): Anomaly | null => {
  if (baseline <= 0) return null; // No baseline, can't compare

  const dropPercent = ((baseline - current) / baseline) * 100;

  if (dropPercent > threshold) {
    const severity: 'critical' | 'high' | 'medium' =
      dropPercent > 75 ? 'critical' : dropPercent > 50 ? 'high' : 'medium';
    return {
      type: 'viralDrop',
      severity,
      detected: new Date().toISOString(),
      baseline,
      current,
      deviation: dropPercent,
      details: { baselineWindow: '7d', currentWindow: '24h' },
    };
  }

  return null;
};

/**
 * Detect churn rate acceleration >X multiplier
 *
 * Baseline: historical daily churn %. Current: today's churn %
 * Alert if: current / baseline > multiplier
 */
export const detectChurnAcceleration = (
  baseline: number,
  current: number,
  multiplier: number = DEFAULT_THRESHOLDS.churnAccelerationMultiplier,
): Anomaly | null => {
  if (baseline <= 0) return null;

  const acceleration = current / baseline;

  if (acceleration > multiplier) {
    const severity: 'critical' | 'high' | 'medium' =
      acceleration > 3 ? 'critical' : acceleration > 2 ? 'high' : 'medium';
    return {
      type: 'churnAcceleration',
      severity,
      detected: new Date().toISOString(),
      baseline,
      current,
      deviation: (acceleration - 1) * 100, // Convert to percent increase
      details: { accelerationMultiplier: acceleration },
    };
  }

  return null;
};

/**
 * Detect lead signal stall >X days
 *
 * Baseline: last signal received timestamp. Current: now
 * Alert if: time since last signal > threshold days
 */
export const detectLeadStall = (
  lastSignalTimestamp: string,
  thresholdDays: number = DEFAULT_THRESHOLDS.leadStallDays,
): Anomaly | null => {
  const lastSignal = new Date(lastSignalTimestamp).getTime();
  const now = Date.now();
  const stallDays = (now - lastSignal) / (1000 * 60 * 60 * 24);

  if (stallDays > thresholdDays) {
    const severity: 'critical' | 'high' | 'medium' = stallDays > 14 ? 'critical' : stallDays > 7 ? 'high' : 'medium';
    return {
      type: 'leadStall',
      severity,
      detected: new Date().toISOString(),
      baseline: 0, // Not comparable to baseline
      current: stallDays,
      deviation: stallDays - thresholdDays,
      details: { lastSignalAt: lastSignalTimestamp, daysSinceSignal: stallDays.toFixed(1) },
    };
  }

  return null;
};

/**
 * Detect ROI collapse >X%
 *
 * Baseline: expected ROI given spend. Current: actual ROI
 * Alert if: (baseline - current) / baseline > threshold
 */
export const detectROICollapse = (
  baseline: number,
  current: number,
  threshold: number = DEFAULT_THRESHOLDS.roiCollapsePercent,
): Anomaly | null => {
  if (baseline <= 0) return null;

  const collapsePercent = ((baseline - current) / baseline) * 100;

  if (collapsePercent > threshold) {
    const severity: 'critical' | 'high' | 'medium' =
      collapsePercent > 75 ? 'critical' : collapsePercent > 50 ? 'high' : 'medium';
    return {
      type: 'roiCollapse',
      severity,
      detected: new Date().toISOString(),
      baseline,
      current,
      deviation: collapsePercent,
      details: { expectedROI: baseline, actualROI: current },
    };
  }

  return null;
};

/**
 * Run full anomaly scan
 *
 * Checks all 4 anomaly types, returns prioritized list (critical first)
 */
export const runFullAnomalyScan = (
  metrics: {
    viralScoreBaseline: number;
    viralScoreCurrent: number;
    churnBaselinePercent: number;
    churnCurrentPercent: number;
    lastLeadSignalTimestamp: string;
    roiBaseline: number;
    roiCurrent: number;
  },
  thresholds: Partial<AnomalyThresholds> = {},
): AnomalyScanResult => {
  const mergedThresholds = { ...DEFAULT_THRESHOLDS, ...thresholds };
  const anomalies: Anomaly[] = [];

  // Detect all anomalies
  const viralDrop = detectViralDrop(
    metrics.viralScoreBaseline,
    metrics.viralScoreCurrent,
    mergedThresholds.viralScoreDropPercent,
  );
  if (viralDrop) anomalies.push(viralDrop);

  const churnAccel = detectChurnAcceleration(
    metrics.churnBaselinePercent,
    metrics.churnCurrentPercent,
    mergedThresholds.churnAccelerationMultiplier,
  );
  if (churnAccel) anomalies.push(churnAccel);

  const leadStall = detectLeadStall(metrics.lastLeadSignalTimestamp, mergedThresholds.leadStallDays);
  if (leadStall) anomalies.push(leadStall);

  const roiCollapse = detectROICollapse(metrics.roiBaseline, metrics.roiCurrent, mergedThresholds.roiCollapsePercent);
  if (roiCollapse) anomalies.push(roiCollapse);

  // Determine overall severity: highest among all anomalies
  const severityRank: Record<'critical' | 'high' | 'medium', number> = { critical: 0, high: 1, medium: 2 };
  let overallSeverity: 'critical' | 'high' | 'medium' | 'none' = 'none';

  if (anomalies.length > 0) {
    const ranks = anomalies.map((a) => severityRank[a.severity] ?? 2).sort((a, b) => a - b);
    const minRank = ranks[0];
    if (minRank === 0) overallSeverity = 'critical';
    else if (minRank === 1) overallSeverity = 'high';
    else overallSeverity = 'medium';
  }

  const result: AnomalyScanResult = {
    accountId: metrics.viralScoreBaseline >= 0 ? 'unknown' : 'unknown', // Placeholder
    timestamp: new Date().toISOString(),
    anomalies,
    hasAnomalies: anomalies.length > 0,
    severity: overallSeverity,
  };

  log.info('[anomaly-detector] scan complete', {
    anomalyCount: anomalies.length,
    hasAnomalies: result.hasAnomalies,
    severity: result.severity,
    types: anomalies.map((a) => a.type),
  });

  return result;
};

export default {
  detectViralDrop,
  detectChurnAcceleration,
  detectLeadStall,
  detectROICollapse,
  runFullAnomalyScan,
  DEFAULT_THRESHOLDS,
};
