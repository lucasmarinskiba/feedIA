import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { log } from '../agent/logger.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const RUNTIME_DIR = join(__dirname, '../../data/runtime');
const HEALTH_FILE = join(RUNTIME_DIR, 'health.json');

export interface HealthRecord {
  agentId: string;
  lastSuccess: string | null;
  lastFailure: string | null;
  failureCount: number;
  successCount: number;
  consecutiveFailures: number;
  status: 'healthy' | 'degraded' | 'critical' | 'disabled';
  lastError?: string;
  recoveryAttempts: number;
  disabledUntil?: string;
}

export interface SystemHealth {
  updatedAt: string;
  overallStatus: 'healthy' | 'degraded' | 'critical';
  agents: Record<string, HealthRecord>;
  errors: Array<{ timestamp: string; source: string; message: string; resolved: boolean }>;
  selfHealingActions: Array<{ timestamp: string; action: string; target: string; result: string }>;
}

const ensureDir = (): void => {
  if (!existsSync(RUNTIME_DIR)) mkdirSync(RUNTIME_DIR, { recursive: true });
};

const loadHealth = (): SystemHealth => {
  ensureDir();
  if (!existsSync(HEALTH_FILE)) {
    return {
      updatedAt: new Date().toISOString(),
      overallStatus: 'healthy',
      agents: {},
      errors: [],
      selfHealingActions: [],
    };
  }
  try {
    return JSON.parse(readFileSync(HEALTH_FILE, 'utf8')) as SystemHealth;
  } catch {
    return {
      updatedAt: new Date().toISOString(),
      overallStatus: 'healthy',
      agents: {},
      errors: [],
      selfHealingActions: [],
    };
  }
};

const saveHealth = (health: SystemHealth): void => {
  ensureDir();
  // Keep last 100 errors and 100 healing actions
  health.errors = health.errors.slice(-100);
  health.selfHealingActions = health.selfHealingActions.slice(-100);
  health.updatedAt = new Date().toISOString();
  writeFileSync(HEALTH_FILE, JSON.stringify(health, null, 2), 'utf8');
};

export const recordSuccess = (agentId: string): void => {
  const health = loadHealth();
  const record = health.agents[agentId] ?? {
    agentId,
    lastSuccess: null,
    lastFailure: null,
    failureCount: 0,
    successCount: 0,
    consecutiveFailures: 0,
    status: 'healthy',
    recoveryAttempts: 0,
  };

  record.lastSuccess = new Date().toISOString();
  record.successCount += 1;
  record.consecutiveFailures = 0;
  record.status = 'healthy';
  record.disabledUntil = undefined;
  health.agents[agentId] = record;

  saveHealth(health);
};

export const recordFailure = (agentId: string, error: string): void => {
  const health = loadHealth();
  const record = health.agents[agentId] ?? {
    agentId,
    lastSuccess: null,
    lastFailure: null,
    failureCount: 0,
    successCount: 0,
    consecutiveFailures: 0,
    status: 'healthy',
    recoveryAttempts: 0,
  };

  record.lastFailure = new Date().toISOString();
  record.failureCount += 1;
  record.consecutiveFailures += 1;
  record.lastError = error.slice(0, 500);

  // Escalación de estado
  if (record.consecutiveFailures >= 5) {
    record.status = 'critical';
    // Auto-disable por 30 minutos después de 5 fallos consecutivos
    const disabledUntil = new Date(Date.now() + 30 * 60 * 1000);
    record.disabledUntil = disabledUntil.toISOString();
    log.warn(`[SelfHealing] Agente ${agentId} CRITICAL — deshabilitado hasta ${disabledUntil.toLocaleTimeString()}`);
  } else if (record.consecutiveFailures >= 3) {
    record.status = 'degraded';
  }

  health.agents[agentId] = record;
  health.errors.push({
    timestamp: new Date().toISOString(),
    source: agentId,
    message: error.slice(0, 300),
    resolved: false,
  });

  saveHealth(health);
};

export const isAgentHealthy = (agentId: string): boolean => {
  const health = loadHealth();
  const record = health.agents[agentId];
  if (!record) return true;
  if (record.status === 'disabled') return false;
  if (record.disabledUntil && new Date(record.disabledUntil) > new Date()) return false;
  return record.status !== 'critical';
};

export const triggerSelfHealing = async (): Promise<{
  actionsCount: number;
  actions: string[];
}> => {
  const health = loadHealth();
  const actions: string[] = [];

  for (const [agentId, record] of Object.entries(health.agents)) {
    // Auto-rehabilitar agentes deshabilitados cuyo tiempo ya pasó
    if (record.disabledUntil && new Date(record.disabledUntil) <= new Date()) {
      record.status = 'degraded';
      record.disabledUntil = undefined;
      record.consecutiveFailures = 0;
      record.recoveryAttempts += 1;
      const action = `Rehabilitado agente ${agentId} (recovery attempt #${record.recoveryAttempts})`;
      actions.push(action);
      health.selfHealingActions.push({
        timestamp: new Date().toISOString(),
        action: 'rehabilitate',
        target: agentId,
        result: 'rehabilitated',
      });
      log.info(`[SelfHealing] ${action}`);
    }

    // Limpiar errores resueltos (agentes que ahora están healthy)
    if (record.status === 'healthy' && record.consecutiveFailures === 0) {
      const unresolvedErrors = health.errors.filter((e) => e.source === agentId && !e.resolved);
      for (const error of unresolvedErrors) error.resolved = true;
      if (unresolvedErrors.length > 0) {
        actions.push(`Marcados ${unresolvedErrors.length} errores de ${agentId} como resueltos`);
      }
    }
  }

  // Calcular estado global
  const allRecords = Object.values(health.agents);
  const criticalCount = allRecords.filter((r) => r.status === 'critical').length;
  const degradedCount = allRecords.filter((r) => r.status === 'degraded').length;
  health.overallStatus = criticalCount > 0 ? 'critical' : degradedCount > 0 ? 'degraded' : 'healthy';

  saveHealth(health);
  return { actionsCount: actions.length, actions };
};

export const getSystemHealth = (): SystemHealth => loadHealth();

export const resetAgentHealth = (agentId: string): void => {
  const health = loadHealth();
  delete health.agents[agentId];
  saveHealth(health);
  log.info(`[SelfHealing] Health de ${agentId} reseteado`);
};
