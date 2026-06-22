/**
 * Health Monitor — Monitoreo de salud del sistema en tiempo real.
 * Pulso periódico, métricas vitales, y alertas automáticas.
 */

import { log } from '../../agent/logger.js';

export interface HealthPulse {
  timestamp: string;
  cpuLoad: number; // 0-100
  memoryUsageMb: number;
  activeAgents: number;
  pendingTasks: number;
  failedTasksLastHour: number;
  avgResponseTimeMs: number;
  status: 'healthy' | 'degraded' | 'critical';
}

export interface HealthAlert {
  id: string;
  metric: string;
  value: number;
  threshold: number;
  severity: 'warning' | 'critical';
  timestamp: string;
  acknowledged: boolean;
}

const pulses: HealthPulse[] = [];
const alerts: HealthAlert[] = [];
const MAX_PULSES = 100;
const MAX_ALERTS = 100;

const calculateStatus = (pulse: Omit<HealthPulse, 'status'>): HealthPulse['status'] => {
  if (pulse.cpuLoad > 90 || pulse.memoryUsageMb > 1024 || pulse.failedTasksLastHour > 10) return 'critical';
  if (pulse.cpuLoad > 70 || pulse.memoryUsageMb > 512 || pulse.failedTasksLastHour > 5) return 'degraded';
  return 'healthy';
};

export const recordPulse = (opts?: Partial<Omit<HealthPulse, 'timestamp' | 'status'>>): HealthPulse => {
  const pulse: HealthPulse = {
    timestamp: new Date().toISOString(),
    cpuLoad: opts?.cpuLoad ?? 30,
    memoryUsageMb: opts?.memoryUsageMb ?? 128,
    activeAgents: opts?.activeAgents ?? 5,
    pendingTasks: opts?.pendingTasks ?? 0,
    failedTasksLastHour: opts?.failedTasksLastHour ?? 0,
    avgResponseTimeMs: opts?.avgResponseTimeMs ?? 200,
    status: 'healthy',
  };

  pulse.status = calculateStatus(pulse);
  pulses.push(pulse);
  if (pulses.length > MAX_PULSES) pulses.shift();

  // Auto-generate alerts
  if (pulse.cpuLoad > 80) {
    alerts.push({
      id: `ha-${Date.now()}-cpu`,
      metric: 'cpuLoad',
      value: pulse.cpuLoad,
      threshold: 80,
      severity: pulse.cpuLoad > 90 ? 'critical' : 'warning',
      timestamp: pulse.timestamp,
      acknowledged: false,
    });
  }
  if (pulse.failedTasksLastHour > 5) {
    alerts.push({
      id: `ha-${Date.now()}-fail`,
      metric: 'failedTasks',
      value: pulse.failedTasksLastHour,
      threshold: 5,
      severity: pulse.failedTasksLastHour > 10 ? 'critical' : 'warning',
      timestamp: pulse.timestamp,
      acknowledged: false,
    });
  }
  if (alerts.length > MAX_ALERTS) alerts.shift();

  log.info(`[Health] Pulse: ${pulse.status} | CPU ${pulse.cpuLoad}% | Pending ${pulse.pendingTasks}`);
  return pulse;
};

export const getLatestPulse = (): HealthPulse | undefined => pulses[pulses.length - 1];

export const getPulseHistory = (limit = 24): HealthPulse[] => pulses.slice(-limit);

export const getAlerts = (opts?: { severity?: string; acknowledged?: boolean; limit?: number }): HealthAlert[] => {
  let result = alerts.slice();
  if (opts?.severity) result = result.filter((a) => a.severity === opts.severity);
  if (opts?.acknowledged !== undefined) result = result.filter((a) => a.acknowledged === opts.acknowledged);
  return result.slice(-(opts?.limit ?? 20));
};

export const acknowledgeAlert = (id: string): boolean => {
  const alert = alerts.find((a) => a.id === id);
  if (!alert) return false;
  alert.acknowledged = true;
  return true;
};

export const getHealthSummary = (): {
  currentStatus: HealthPulse['status'];
  uptimePct: number;
  totalAlerts24h: number;
  unacknowledgedCritical: number;
} => {
  const recent = pulses.slice(-24);
  const healthyCount = recent.filter((p) => p.status === 'healthy').length;
  const uptimePct = recent.length > 0 ? Math.round((healthyCount / recent.length) * 100) : 100;
  const recentAlerts = alerts.filter((a) => !a.acknowledged);
  return {
    currentStatus: getLatestPulse()?.status ?? 'healthy',
    uptimePct,
    totalAlerts24h: recentAlerts.length,
    unacknowledgedCritical: recentAlerts.filter((a) => a.severity === 'critical').length,
  };
};
