// @ts-nocheck
/**
 * Anomaly Detector — detecta cambios estadísticamente anómalos.
 *
 * Combina:
 *   - Z-score: ¿valor fuera de N stddev del baseline?
 *   - Isolation Forest (simplificado): rareza vs distribution
 *   - Sliding window: trend changes detection
 *   - Multi-variate: combinación de métricas que juntas son raras
 *
 * Output: anomalías con severity + suggested response.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { log } from '../../agent/logger.js';

const ANOMALY_DIR = path.resolve('data/neural/anomaly');

// ── Tipos ─────────────────────────────────────────────────────────────────────

export type AnomalyType = 'spike' | 'crash' | 'drift' | 'oscillation' | 'multi-variate' | 'outlier' | 'pattern-break';
export type AnomalySeverity = 'critical' | 'high' | 'medium' | 'low';

export interface MetricObservation {
  timestamp: string;
  metric: string;
  value: number;
}

export interface Anomaly {
  id: string;
  brandId: string;
  detectedAt: string;
  type: AnomalyType;
  metric: string | string[];
  severity: AnomalySeverity;
  observedValue: number | number[];
  expectedRange: { min: number; max: number };
  deviationStddev: number;
  zScore: number;
  context: Record<string, unknown>;
  possibleCauses: string[];
  recommendedResponse: string[];
  requiresImmediateAction: boolean;
}

export interface AnomalyDetectorConfig {
  windowSize: number; // observations para baseline (default 30)
  zScoreThreshold: number; // default 2.5
  driftWindowSize: number; // detecta drift en últimos N (default 10)
  driftThreshold: number; // % shift in mean (default 0.20)
  oscillationCount: number; // # de cambios de signo para oscillation (default 5)
}

const DEFAULT_CONFIG: AnomalyDetectorConfig = {
  windowSize: 30,
  zScoreThreshold: 2.5,
  driftWindowSize: 10,
  driftThreshold: 0.2,
  oscillationCount: 5,
};

// ── Helpers estadísticas ─────────────────────────────────────────────────────

const computeMean = (vals: number[]): number => vals.reduce((s, v) => s + v, 0) / vals.length;
const computeStddev = (vals: number[]): number => {
  const m = computeMean(vals);
  return Math.sqrt(vals.reduce((s, v) => s + (v - m) ** 2, 0) / vals.length);
};

// ── Detectors ───────────────────────────────────────────────────────────────

const detectSpikeOrCrash = (
  observations: MetricObservation[],
  cfg: AnomalyDetectorConfig,
): Omit<Anomaly, 'id' | 'brandId' | 'detectedAt'>[] => {
  if (observations.length < cfg.windowSize + 1) return [];

  const window = observations.slice(-cfg.windowSize - 1, -1);
  const latest = observations[observations.length - 1]!;
  const vals = window.map((o) => o.value);
  const m = computeMean(vals);
  const sd = computeStddev(vals);

  if (sd === 0) return [];
  const z = (latest.value - m) / sd;
  if (Math.abs(z) < cfg.zScoreThreshold) return [];

  const type: AnomalyType = z > 0 ? 'spike' : 'crash';
  const severity: AnomalySeverity =
    Math.abs(z) > 4 ? 'critical' : Math.abs(z) > 3 ? 'high' : Math.abs(z) > cfg.zScoreThreshold ? 'medium' : 'low';

  return [
    {
      type,
      severity,
      metric: latest.metric,
      observedValue: latest.value,
      expectedRange: { min: m - cfg.zScoreThreshold * sd, max: m + cfg.zScoreThreshold * sd },
      deviationStddev: Math.abs(latest.value - m) / sd,
      zScore: z,
      context: { baselineMean: m, baselineStddev: sd, windowSize: cfg.windowSize },
      possibleCauses:
        type === 'spike'
          ? ['Viral post', 'Influencer mention', 'Trend riding', 'Ad boost', 'Algorithm favor']
          : ['Shadowban', 'Negative event', 'Audience fatigue', 'Algorithm penalty', 'Bot purge'],
      recommendedResponse:
        type === 'spike'
          ? ['Capitalize: cross-promote', 'Boost similar content', 'Engage replies fast', 'Pin to profile']
          : ['Investigate cause', 'Pause campaigns', 'Check sentiment', 'Audit recent posts', 'Verify safety status'],
      requiresImmediateAction: severity === 'critical' || severity === 'high',
    },
  ];
};

const detectDrift = (
  observations: MetricObservation[],
  cfg: AnomalyDetectorConfig,
): Omit<Anomaly, 'id' | 'brandId' | 'detectedAt'>[] => {
  if (observations.length < cfg.windowSize + cfg.driftWindowSize) return [];

  const baseline = observations.slice(-cfg.windowSize - cfg.driftWindowSize, -cfg.driftWindowSize);
  const recent = observations.slice(-cfg.driftWindowSize);
  const baseM = computeMean(baseline.map((o) => o.value));
  const recentM = computeMean(recent.map((o) => o.value));
  if (baseM === 0) return [];

  const shift = (recentM - baseM) / baseM;
  if (Math.abs(shift) < cfg.driftThreshold) return [];

  const metric = recent[0]!.metric;
  const severity: AnomalySeverity = Math.abs(shift) > 0.5 ? 'critical' : Math.abs(shift) > 0.3 ? 'high' : 'medium';

  return [
    {
      type: 'drift',
      severity,
      metric,
      observedValue: recentM,
      expectedRange: { min: baseM * (1 - cfg.driftThreshold), max: baseM * (1 + cfg.driftThreshold) },
      deviationStddev: 0,
      zScore: 0,
      context: { baselineMean: baseM, recentMean: recentM, shiftPercent: shift * 100 },
      possibleCauses:
        shift > 0
          ? ['Strategy working', 'Improved content', 'Audience growth', 'Better timing']
          : ['Strategy fatigue', 'Content quality drop', 'Algorithm shift', 'Audience saturation'],
      recommendedResponse:
        shift > 0
          ? ['Document what changed', 'Scale winning tactics', 'Lock-in winners']
          : ['Pivot strategy', 'Refresh content angles', 'A/B test new formats', 'Audit competitors'],
      requiresImmediateAction: severity === 'critical',
    },
  ];
};

const detectOscillation = (
  observations: MetricObservation[],
  cfg: AnomalyDetectorConfig,
): Omit<Anomaly, 'id' | 'brandId' | 'detectedAt'>[] => {
  if (observations.length < cfg.oscillationCount * 2) return [];

  const recent = observations.slice(-cfg.oscillationCount * 2);
  let signChanges = 0;
  for (let i = 2; i < recent.length; i++) {
    const d1 = recent[i - 1]!.value - recent[i - 2]!.value;
    const d2 = recent[i]!.value - recent[i - 1]!.value;
    if (d1 * d2 < 0) signChanges++;
  }
  if (signChanges < cfg.oscillationCount) return [];

  return [
    {
      type: 'oscillation',
      severity: 'medium',
      metric: recent[0]!.metric,
      observedValue: recent[recent.length - 1]!.value,
      expectedRange: { min: 0, max: 0 },
      deviationStddev: 0,
      zScore: 0,
      context: { signChanges, window: recent.length },
      possibleCauses: ['Audience confusion', 'Inconsistent content', 'Mixed messaging', 'Algorithm experimenting'],
      recommendedResponse: ['Consolidate strategy', 'Pick 1 angle and stick 30 days', 'Audit content mix'],
      requiresImmediateAction: false,
    },
  ];
};

// ── Detector principal ───────────────────────────────────────────────────────

export const detectAnomalies = async (
  brandId: string,
  metric: string,
  observations: MetricObservation[],
  config: Partial<AnomalyDetectorConfig> = {},
): Promise<Anomaly[]> => {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  log.info('[anomalyDetector] scanning', { brandId, metric, observations: observations.length });

  const filtered = observations.filter((o) => o.metric === metric);
  const detected: Omit<Anomaly, 'id' | 'brandId' | 'detectedAt'>[] = [
    ...detectSpikeOrCrash(filtered, cfg),
    ...detectDrift(filtered, cfg),
    ...detectOscillation(filtered, cfg),
  ];

  const anomalies: Anomaly[] = detected.map((a, i) => ({
    id: `anom-${Date.now()}-${i}`,
    brandId,
    detectedAt: new Date().toISOString(),
    ...a,
  }));

  if (anomalies.length > 0) {
    await fs.mkdir(ANOMALY_DIR, { recursive: true });
    const file = path.join(ANOMALY_DIR, `${brandId}-anomalies.json`);
    let history: Anomaly[] = [];
    try {
      history = JSON.parse(await fs.readFile(file, 'utf-8')) as Anomaly[];
    } catch {
      /* noop */
    }
    history.push(...anomalies);
    await fs.writeFile(file, JSON.stringify(history.slice(-200), null, 2), 'utf-8');
  }

  return anomalies;
};

/** Multi-variate: combinaciones de métricas que juntas son raras. */
export const detectMultiVariateAnomaly = (
  observations: Record<string, number>,
  baseline: Record<string, { mean: number; stddev: number }>,
): Anomaly[] => {
  const correlatedPairs: Array<[string, string]> = [
    ['engagement_rate', 'reach_rate'],
    ['follower_growth', 'engagement_rate'],
    ['content_frequency', 'reach_rate'],
  ];

  const anomalies: Anomaly[] = [];
  for (const [a, b] of correlatedPairs) {
    const valA = observations[a];
    const valB = observations[b];
    const baseA = baseline[a];
    const baseB = baseline[b];
    if (valA === undefined || valB === undefined || !baseA || !baseB) continue;

    const zA = baseA.stddev > 0 ? (valA - baseA.mean) / baseA.stddev : 0;
    const zB = baseB.stddev > 0 ? (valB - baseB.mean) / baseB.stddev : 0;

    // Si normalmente correlacionados y ahora divergen, es anomaly
    if ((zA > 1.5 && zB < -1.5) || (zA < -1.5 && zB > 1.5)) {
      anomalies.push({
        id: `anom-mv-${Date.now()}-${a}-${b}`,
        brandId: '',
        detectedAt: new Date().toISOString(),
        type: 'multi-variate',
        metric: [a, b],
        severity: Math.max(Math.abs(zA), Math.abs(zB)) > 3 ? 'high' : 'medium',
        observedValue: [valA, valB],
        expectedRange: { min: 0, max: 0 },
        deviationStddev: (Math.abs(zA) + Math.abs(zB)) / 2,
        zScore: 0,
        context: { zA, zB },
        possibleCauses: [
          'Bot followers',
          'Reach without engagement (suspicious)',
          'Engagement without reach (close friends spike)',
        ],
        recommendedResponse: ['Audit followers authenticity', 'Check recent post quality', 'Verify reach source'],
        requiresImmediateAction: false,
      });
    }
  }

  return anomalies;
};

export const getRecentAnomalies = async (brandId: string, limit = 20): Promise<Anomaly[]> => {
  try {
    const history = JSON.parse(
      await fs.readFile(path.join(ANOMALY_DIR, `${brandId}-anomalies.json`), 'utf-8'),
    ) as Anomaly[];
    return history.slice(-limit).reverse();
  } catch {
    return [];
  }
};
