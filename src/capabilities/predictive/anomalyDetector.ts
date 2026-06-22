/**
 * Anomaly Detector — Detecta anomalías en métricas de performance.
 * Usa desviación estándar y reglas de negocio para flaggear comportamientos raros.
 */

import { log } from '../../agent/logger.js';

export interface MetricSeries {
  metricName: string;
  values: Array<{ date: string; value: number }>;
}

export interface Anomaly {
  metricName: string;
  date: string;
  value: number;
  expectedRange: [number, number];
  severity: 'low' | 'medium' | 'high' | 'critical';
  type: 'spike' | 'drop' | 'pattern_break';
  description: string;
}

const calculateStats = (values: number[]): { mean: number; stdDev: number } => {
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
  return { mean, stdDev: Math.sqrt(variance) };
};

export const detectAnomalies = (series: MetricSeries, thresholdStdDev = 2): Anomaly[] => {
  const { values } = series;
  if (values.length < 7) {
    log.info(`[Anomaly] ${series.metricName}: insufficient data (${values.length} points)`);
    return [];
  }

  const numericValues = values.map((v) => v.value);
  const { mean, stdDev } = calculateStats(numericValues);

  const anomalies: Anomaly[] = [];

  for (let i = 3; i < values.length; i++) {
    const current = values[i]!;
    const prev = values[i - 1]!;
    const prev3 = values.slice(i - 3, i).map((v) => v.value);
    const localMean = prev3.reduce((s, v) => s + v, 0) / prev3.length;

    const zScore = stdDev > 0 ? (current.value - mean) / stdDev : 0;
    const localZ = stdDev > 0 ? (current.value - localMean) / stdDev : 0;

    let severity: Anomaly['severity'] = 'low';
    if (Math.abs(zScore) > 3) severity = 'critical';
    else if (Math.abs(zScore) > 2.5) severity = 'high';
    else if (Math.abs(zScore) > thresholdStdDev) severity = 'medium';

    if (Math.abs(zScore) > thresholdStdDev || Math.abs(localZ) > thresholdStdDev) {
      const type: Anomaly['type'] =
        current.value > prev.value * 1.5 ? 'spike' : current.value < prev.value * 0.5 ? 'drop' : 'pattern_break';

      anomalies.push({
        metricName: series.metricName,
        date: current.date,
        value: current.value,
        expectedRange: [
          Math.round((mean - thresholdStdDev * stdDev) * 100) / 100,
          Math.round((mean + thresholdStdDev * stdDev) * 100) / 100,
        ],
        severity,
        type,
        description: `${series.metricName} ${type} on ${current.date}: ${current.value} (expected ${Math.round(mean)} ± ${Math.round(stdDev)})`,
      });
    }
  }

  log.info(`[Anomaly] ${series.metricName}: ${anomalies.length} anomalies detected`);
  return anomalies;
};

export const detectAnomaliesBatch = (seriesList: MetricSeries[], thresholdStdDev = 2): Anomaly[] =>
  seriesList.flatMap((s) => detectAnomalies(s, thresholdStdDev));
