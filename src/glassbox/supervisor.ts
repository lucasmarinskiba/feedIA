/**
 * GlassBox Supervisor — "Caja de Cristal"
 * ─────────────────────────────────────────────────────────────────────────
 * Gate de aprobación paso a paso para cada acción atómica del agente.
 *
 * Modos de operación:
 *   • autonomous  → ejecuta sin supervisión (registra en audit)
 *   • supervised  → cada acción espera aprobación humana con timeout
 *   • paused      → encola acciones, no ejecuta hasta reanudar
 *
 * Flujo de una acción:
 *   1. Compliance Guardian evalúa la acción
 *   2. Si el guardian bloquea → acción rechazada automáticamente
 *   3. Según el modo: ejecuta directo / espera aprobación / encola
 *   4. Al ejecutar: audit log + evento SSE
 */

import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { evaluate, audit } from '../compliance/index.js';
import type { GuardianContext, ActionCategory } from '../compliance/index.js';
import { emit } from '../agent/bus.js';
import { log } from '../agent/logger.js';
import { sendAlert } from '../integrations/notifications.js';

const STORE_FILE = resolve('data/runtime/glassbox.json');

export type GlassBoxMode = 'autonomous' | 'supervised' | 'paused';

export type ActionStatus = 'pending' | 'approved' | 'rejected' | 'executing' | 'completed' | 'failed' | 'blocked';

export interface ActionRequest {
  id: string;
  actionType: string;
  description: string;
  payload: Record<string, unknown>;
  screenshot?: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  guardianWarning?: string;
  correlationId: string;
  source: string;
  createdAt: string;
  status: ActionStatus;
  resolvedAt?: string;
  resolutionNote?: string;
  modifiedPayload?: Record<string, unknown>;
  timeoutAt: string;
  executionResult?: unknown;
  executionError?: string;
}

export interface GateOptions {
  correlationId?: string;
  source?: string;
  screenshot?: string;
  actionCategory?: ActionCategory;
  guardianContext?: Partial<GuardianContext>;
  timeoutMs?: number;
  onTimeout?: 'block' | 'approve' | 'escalate';
}

/* ── Estado global ─────────────────────────────────────────────────────── */

let currentMode: GlassBoxMode = 'autonomous';
let actionSeq = 0;
const pending = new Map<string, ActionRequest>();
const history: ActionRequest[] = [];
const resolvers = new Map<string, { resolve: (ok: boolean) => void; reject: (reason?: string) => void }>();
let modeChangeListeners: Array<(mode: GlassBoxMode, previous: GlassBoxMode) => void> = [];

const ensureDir = (): void => {
  mkdirSync(dirname(STORE_FILE), { recursive: true });
};

const loadStore = (): void => {
  if (!existsSync(STORE_FILE)) return;
  try {
    const raw = readFileSync(STORE_FILE, 'utf-8');
    const data = JSON.parse(raw) as { mode: GlassBoxMode; history: ActionRequest[] };
    currentMode = data.mode ?? 'autonomous';
    if (Array.isArray(data.history)) {
      history.push(...data.history.slice(-200));
    }
  } catch {
    /* ignore corrupt store */
  }
};

const saveStore = (): void => {
  ensureDir();
  try {
    writeFileSync(STORE_FILE, JSON.stringify({ mode: currentMode, history: history.slice(-200) }, null, 2), 'utf-8');
  } catch (err) {
    log.warn(`[GlassBox] No se pudo guardar store: ${(err as Error).message}`);
  }
};

loadStore();

/* ── API pública: modo ─────────────────────────────────────────────────── */

export const getMode = (): GlassBoxMode => currentMode;

export const setMode = (mode: GlassBoxMode): void => {
  const previous = currentMode;
  currentMode = mode;
  saveStore();
  log.info(`[GlassBox] Modo cambiado: ${previous} → ${mode}`);

  for (const listener of modeChangeListeners) {
    try {
      listener(mode, previous);
    } catch {
      /* ignore */
    }
  }

  emit({
    type: 'GlassBoxModeChanged',
    sourceAgent: 'glassbox',
    priority: 'high',
    correlationId: `gb-mode-${Date.now()}`,
    payload: { mode, previous },
  });
};

export const onModeChange = (listener: (mode: GlassBoxMode, previous: GlassBoxMode) => void): (() => void) => {
  modeChangeListeners.push(listener);
  return () => {
    modeChangeListeners = modeChangeListeners.filter((l) => l !== listener);
  };
};

export const pause = (): void => setMode('paused');
export const resume = (): void => setMode('supervised');

/* ── Action Gate — el corazón del sistema ──────────────────────────────── */

export interface GateResult<T = unknown> {
  ok: boolean;
  result?: T;
  blocked?: boolean;
  reason?: string;
  actionId?: string;
}

const nextActionId = (): string => {
  actionSeq += 1;
  return `gb-a-${Date.now()}-${actionSeq}`;
};

const runComplianceCheck = (
  actionType: string,
  opts: GateOptions,
): { allowed: boolean; riskScore: number; reason?: string; violatedRules: string[] } => {
  try {
    const category = opts.actionCategory ?? 'api_request';
    const ctx: GuardianContext = {
      actor: opts.source ?? 'glassbox',
      contentText: typeof opts.guardianContext?.contentText === 'string' ? opts.guardianContext.contentText : undefined,
      humanInitiated: opts.guardianContext?.humanInitiated ?? false,
    };
    const decision = evaluate(category, ctx);
    return {
      allowed: decision.allowed,
      riskScore: decision.riskScore,
      reason: decision.reason,
      violatedRules: decision.violatedRules.map((r) => r.code),
    };
  } catch (err) {
    log.warn(`[GlassBox] Compliance check falló: ${(err as Error).message}`);
    return { allowed: true, riskScore: 0, violatedRules: [] };
  }
};

export const actionGate = async <T>(
  actionType: string,
  description: string,
  executeFn: () => Promise<T>,
  opts: GateOptions = {},
): Promise<GateResult<T>> => {
  const id = nextActionId();
  const correlationId = opts.correlationId ?? `gb-${Date.now()}`;
  const source = opts.source ?? 'unknown';
  const timeoutMs = opts.timeoutMs ?? 300_000;
  const onTimeout = opts.onTimeout ?? 'block';

  // 1. Compliance check
  const compliance = runComplianceCheck(actionType, opts);
  if (!compliance.allowed) {
    audit({ action: 'COMPLIANCE_BLOCKED', outcome: 'blocked', reason: `GlassBox: ${compliance.reason}` });
    emit({
      type: 'GlassBoxActionBlocked',
      sourceAgent: 'glassbox',
      priority: 'critical',
      correlationId,
      payload: {
        actionId: id,
        actionType,
        description,
        reason: compliance.reason,
        violatedRules: compliance.violatedRules,
      },
    });
    return {
      ok: false,
      blocked: true,
      reason: `Bloqueado por Compliance Guardian: ${compliance.reason}`,
      actionId: id,
    };
  }

  // 2. Determinar riskLevel
  const riskLevel: ActionRequest['riskLevel'] =
    compliance.riskScore >= 50
      ? 'critical'
      : compliance.riskScore >= 30
        ? 'high'
        : compliance.riskScore >= 15
          ? 'medium'
          : 'low';

  // 3. Modo autonomous → ejecutar directo
  if (currentMode === 'autonomous') {
    audit({ action: 'COMPLIANCE_WARNING', outcome: 'dry_run', reason: `Autónomo: ${description}` });
    try {
      const result = await executeFn();
      return { ok: true, result, actionId: id };
    } catch (err) {
      const msg = (err as Error).message;
      audit({ action: 'COMPLIANCE_WARNING', outcome: 'failure', reason: msg });
      return { ok: false, reason: msg, actionId: id };
    }
  }

  // 4. Modo paused → encolar
  if (currentMode === 'paused') {
    const action: ActionRequest = {
      id,
      actionType,
      description,
      payload: opts.guardianContext ?? {},
      screenshot: opts.screenshot,
      riskLevel,
      guardianWarning: compliance.riskScore > 0 ? `Risk score: ${compliance.riskScore}` : undefined,
      correlationId,
      source,
      createdAt: new Date().toISOString(),
      status: 'pending',
      timeoutAt: new Date(Date.now() + timeoutMs).toISOString(),
    };
    pending.set(id, action);
    emit({
      type: 'GlassBoxActionPaused',
      sourceAgent: 'glassbox',
      priority: 'normal',
      correlationId,
      payload: { actionId: id, actionType, description, mode: 'paused' },
    });
    return { ok: false, blocked: true, reason: 'GlassBox está en modo PAUSADO. La acción fue encolada.', actionId: id };
  }

  // 5. Modo supervised → crear request y esperar aprobación
  const action: ActionRequest = {
    id,
    actionType,
    description,
    payload: opts.guardianContext ?? {},
    screenshot: opts.screenshot,
    riskLevel,
    guardianWarning: compliance.riskScore > 0 ? `Risk score: ${compliance.riskScore}` : undefined,
    correlationId,
    source,
    createdAt: new Date().toISOString(),
    status: 'pending',
    timeoutAt: new Date(Date.now() + timeoutMs).toISOString(),
  };

  pending.set(id, action);

  emit({
    type: 'GlassBoxActionPending',
    sourceAgent: 'glassbox',
    priority: riskLevel === 'critical' || riskLevel === 'high' ? 'high' : 'normal',
    correlationId,
    payload: {
      actionId: id,
      actionType,
      description,
      riskLevel,
      guardianWarning: action.guardianWarning,
      screenshot: opts.screenshot ? `${opts.screenshot.slice(0, 80)}...` : undefined,
    },
  });

  if (riskLevel === 'critical' || riskLevel === 'high') {
    sendAlert({
      severity: riskLevel === 'critical' ? 'crisis' : 'warn',
      title: `🔍 GlassBox: acción ${riskLevel} pendiente`,
      body: `${description}\nID: ${id}\nSource: ${source}`,
    }).catch(() => {});
  }

  // Esperar resolución con timeout
  const resolution = await new Promise<{ approved: boolean; note?: string } | undefined>((resolveP) => {
    const timer = setTimeout(() => {
      resolvers.delete(id);
      if (onTimeout === 'escalate') {
        sendAlert({
          severity: 'crisis',
          title: '🚨 GlassBox: timeout de aprobación',
          body: `La acción ${id} (${description}) expiró sin aprobación.`,
        }).catch(() => {});
      }
      resolveP(undefined);
    }, timeoutMs);

    resolvers.set(id, {
      resolve: (ok: boolean) => {
        clearTimeout(timer);
        resolvers.delete(id);
        resolveP({ approved: ok });
      },
      reject: (reason?: string) => {
        clearTimeout(timer);
        resolvers.delete(id);
        resolveP({ approved: false, note: reason });
      },
    });
  });

  if (!resolution) {
    action.status = onTimeout === 'approve' ? 'approved' : 'rejected';
    action.resolvedAt = new Date().toISOString();
    action.resolutionNote = `Timeout (${timeoutMs}ms) → ${onTimeout}`;
    pending.delete(id);
    history.push(action);
    saveStore();

    if (onTimeout === 'approve') {
      try {
        const result = await executeFn();
        action.status = 'completed';
        action.executionResult = result;
        audit({ action: 'COMPLIANCE_WARNING', outcome: 'success', reason: `Timeout-approve: ${description}` });
        return { ok: true, result, actionId: id };
      } catch (err) {
        action.status = 'failed';
        action.executionError = (err as Error).message;
        audit({ action: 'COMPLIANCE_WARNING', outcome: 'failure', reason: action.executionError });
        return { ok: false, reason: action.executionError, actionId: id };
      }
    }

    audit({ action: 'COMPLIANCE_BLOCKED', outcome: 'blocked', reason: `Timeout-block: ${description}` });
    return {
      ok: false,
      blocked: true,
      reason: `Timeout de aprobación (${timeoutMs}ms). Acción bloqueada.`,
      actionId: id,
    };
  }

  action.resolvedAt = new Date().toISOString();
  action.resolutionNote = resolution.note;

  if (!resolution.approved) {
    action.status = 'rejected';
    pending.delete(id);
    history.push(action);
    saveStore();
    audit({ action: 'COMPLIANCE_BLOCKED', outcome: 'blocked', reason: resolution.note ?? 'Rechazado por supervisor' });
    emit({
      type: 'GlassBoxActionRejected',
      sourceAgent: 'glassbox',
      priority: 'high',
      correlationId,
      payload: { actionId: id, actionType, description, reason: resolution.note },
    });
    return { ok: false, blocked: true, reason: resolution.note ?? 'Rechazado por supervisor', actionId: id };
  }

  action.status = 'executing';
  emit({
    type: 'GlassBoxActionExecuting',
    sourceAgent: 'glassbox',
    priority: 'normal',
    correlationId,
    payload: { actionId: id, actionType, description },
  });

  try {
    const result = await executeFn();
    action.status = 'completed';
    action.executionResult = result;
    pending.delete(id);
    history.push(action);
    saveStore();
    audit({ action: 'COMPLIANCE_WARNING', outcome: 'success', reason: `Aprobado: ${description}` });
    emit({
      type: 'GlassBoxActionCompleted',
      sourceAgent: 'glassbox',
      priority: 'normal',
      correlationId,
      payload: { actionId: id, actionType, description },
    });
    return { ok: true, result, actionId: id };
  } catch (err) {
    const msg = (err as Error).message;
    action.status = 'failed';
    action.executionError = msg;
    pending.delete(id);
    history.push(action);
    saveStore();
    audit({ action: 'COMPLIANCE_WARNING', outcome: 'failure', reason: msg });
    emit({
      type: 'GlassBoxActionFailed',
      sourceAgent: 'glassbox',
      priority: 'high',
      correlationId,
      payload: { actionId: id, actionType, description, error: msg },
    });
    return { ok: false, reason: msg, actionId: id };
  }
};

/* ── Resolución manual de acciones ─────────────────────────────────────── */

export const approveAction = (id: string, note?: string): boolean => {
  const resolver = resolvers.get(id);
  if (!resolver) return false;
  const action = pending.get(id);
  if (action) action.resolutionNote = note;
  resolver.resolve(true);
  return true;
};

export const rejectAction = (id: string, reason?: string): boolean => {
  const resolver = resolvers.get(id);
  if (!resolver) return false;
  const action = pending.get(id);
  if (action) action.resolutionNote = reason;
  resolver.reject(reason);
  return true;
};

export const modifyAction = (id: string, newPayload: Record<string, unknown>): boolean => {
  const action = pending.get(id);
  if (!action) return false;
  action.modifiedPayload = { ...action.payload, ...newPayload };
  action.payload = action.modifiedPayload;
  emit({
    type: 'GlassBoxActionModified',
    sourceAgent: 'glassbox',
    priority: 'normal',
    correlationId: action.correlationId,
    payload: { actionId: id, actionType: action.actionType, modifiedPayload: action.modifiedPayload },
  });
  return true;
};

/* ── Queries ───────────────────────────────────────────────────────────── */

export const getPendingActions = (): ActionRequest[] =>
  [...pending.values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt));

export const getActionHistory = (limit = 50): ActionRequest[] =>
  [...history].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, limit);

export const getAction = (id: string): ActionRequest | undefined => pending.get(id) ?? history.find((a) => a.id === id);

export const getStatus = (): {
  mode: GlassBoxMode;
  pendingCount: number;
  historyCount: number;
  recentActions: ActionRequest[];
} => ({
  mode: currentMode,
  pendingCount: pending.size,
  historyCount: history.length,
  recentActions: getActionHistory(10),
});

/* ── Bulk operations ───────────────────────────────────────────────────── */

export const approveAllPending = (note?: string): { approved: number; skipped: number } => {
  let approved = 0;
  let skipped = 0;
  for (const [id, action] of pending) {
    if (action.status !== 'pending') {
      skipped++;
      continue;
    }
    if (approveAction(id, note)) {
      approved++;
    } else {
      skipped++;
    }
  }
  log.info(`[GlassBox] Bulk approve: ${approved} aprobadas, ${skipped} skipped`);
  return { approved, skipped };
};

export const rejectAllPending = (reason?: string): { rejected: number; skipped: number } => {
  let rejected = 0;
  let skipped = 0;
  for (const [id, action] of pending) {
    if (action.status !== 'pending') {
      skipped++;
      continue;
    }
    if (rejectAction(id, reason)) {
      rejected++;
    } else {
      skipped++;
    }
  }
  log.info(`[GlassBox] Bulk reject: ${rejected} rechazadas, ${skipped} skipped`);
  return { rejected, skipped };
};
