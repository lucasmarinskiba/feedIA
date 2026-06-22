/**
 * CUA Mode Manager de FeedIA — controla si el Computer Use Agent está
 * apagado, auto-pilot, o supervisado (acompañar).
 *
 * Estados:
 *   - off:        agente NO ejecuta acciones de cursor/teclado/click. Solo lectura.
 *   - auto:       agente ejecuta libremente (sin aprobación previa).
 *   - supervised: cada acción importante requiere aprobación humana via SSE/UI.
 *
 * Cada llamada del executor de Computer Use chequea `assertCanExecute()` antes
 * de mover el cursor. El frontend puede consultar `getCuaMode()` para mostrar
 * el estado y suscribirse a `subscribeToModeChanges()` para actualizar UI.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { log } from '../../agent/logger.js';

const MODE_PATH = join(process.cwd(), 'data', 'computer-use', 'cua-mode.json');

// ── Tipos ─────────────────────────────────────────────────────────────────────

export type CuaMode = 'off' | 'auto' | 'supervised';

export interface CuaModeState {
  mode: CuaMode;
  changedAt: string;
  changedBy?: string;
  reason?: string;
  history: Array<{ from: CuaMode; to: CuaMode; at: string; reason?: string }>;
  // Cuando está en supervised: lista de acciones pendientes de aprobación
  pendingApprovals: PendingApproval[];
  // Stats agregadas
  stats: {
    totalActionsBlocked: number;
    totalActionsApproved: number;
    totalActionsRejected: number;
    lastTransitionAt?: string;
  };
}

export interface PendingApproval {
  id: string;
  createdAt: string;
  action: string; // ej: "click(540, 320) en Canva"
  context: string; // descripción de qué workflow / paso
  workflow?: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  decision?: 'approved' | 'rejected';
  decidedAt?: string;
  decidedBy?: string;
  expiresAt: string; // si no se decide en X minutos, se cancela
}

const DEFAULT_STATE: CuaModeState = {
  mode: 'off',
  changedAt: new Date().toISOString(),
  history: [],
  pendingApprovals: [],
  stats: {
    totalActionsBlocked: 0,
    totalActionsApproved: 0,
    totalActionsRejected: 0,
  },
};

// ── Persistencia ──────────────────────────────────────────────────────────────

const ensureDir = (): void => {
  const dir = join(process.cwd(), 'data', 'computer-use');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
};

const loadState = (): CuaModeState => {
  try {
    ensureDir();
    if (!existsSync(MODE_PATH)) return structuredClone(DEFAULT_STATE);
    return JSON.parse(readFileSync(MODE_PATH, 'utf8')) as CuaModeState;
  } catch {
    return structuredClone(DEFAULT_STATE);
  }
};

const saveState = (state: CuaModeState): void => {
  ensureDir();
  writeFileSync(MODE_PATH, JSON.stringify(state, null, 2), 'utf8');
};

// ── Suscripciones (in-memory pub/sub) ────────────────────────────────────────

type ModeListener = (state: CuaModeState) => void;
const listeners = new Set<ModeListener>();

export const subscribeToModeChanges = (listener: ModeListener): (() => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

const notifyListeners = (state: CuaModeState): void => {
  for (const listener of listeners) {
    try {
      listener(state);
    } catch {
      /* ignore */
    }
  }
};

// ── API pública ──────────────────────────────────────────────────────────────

export const getCuaMode = (): CuaMode => loadState().mode;

export const getCuaModeState = (): CuaModeState => loadState();

export const setCuaMode = (mode: CuaMode, options: { changedBy?: string; reason?: string } = {}): CuaModeState => {
  const state = loadState();
  const prev = state.mode;
  if (prev === mode) return state;
  state.history.push({ from: prev, to: mode, at: new Date().toISOString(), reason: options.reason });
  if (state.history.length > 100) state.history = state.history.slice(-100);
  state.mode = mode;
  state.changedAt = new Date().toISOString();
  state.changedBy = options.changedBy;
  state.reason = options.reason;
  state.stats.lastTransitionAt = state.changedAt;
  saveState(state);
  notifyListeners(state);
  log.info(`[CuaMode] ${prev} → ${mode}${options.reason ? ` (${options.reason})` : ''}`);
  return state;
};

// ── Gate: chequear antes de ejecutar acción ──────────────────────────────────

export interface CanExecuteResult {
  allowed: boolean;
  mode: CuaMode;
  reason?: string;
  requiresApproval: boolean;
  approvalId?: string;
}

/**
 * Llamar ANTES de ejecutar una acción de Computer Use.
 * - off:        siempre devuelve { allowed: false }
 * - auto:       siempre { allowed: true }
 * - supervised: crea pendingApproval y devuelve { allowed: false, requiresApproval: true, approvalId }
 *               El caller debe esperar la decisión con waitForApproval(approvalId).
 */
export const canExecuteAction = (input: {
  action: string;
  context: string;
  workflow?: string;
  riskLevel?: PendingApproval['riskLevel'];
}): CanExecuteResult => {
  const state = loadState();

  if (state.mode === 'off') {
    state.stats.totalActionsBlocked++;
    saveState(state);
    return {
      allowed: false,
      mode: 'off',
      reason: 'CUA está apagado. Activá el modo Auto o Supervisado desde el topbar.',
      requiresApproval: false,
    };
  }

  if (state.mode === 'auto') {
    return { allowed: true, mode: 'auto', requiresApproval: false };
  }

  // supervised: crear pending approval
  const approval: PendingApproval = {
    id: `app-${Date.now()}-${Math.floor(Math.random() * 999)}`,
    createdAt: new Date().toISOString(),
    action: input.action,
    context: input.context,
    workflow: input.workflow,
    riskLevel: input.riskLevel ?? 'medium',
    expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5min para decidir
  };
  state.pendingApprovals.push(approval);
  if (state.pendingApprovals.length > 50) state.pendingApprovals = state.pendingApprovals.slice(-50);
  saveState(state);
  notifyListeners(state);

  return {
    allowed: false,
    mode: 'supervised',
    requiresApproval: true,
    approvalId: approval.id,
    reason: 'Esperando aprobación humana',
  };
};

// ── Approval helpers ──────────────────────────────────────────────────────────

export const approveAction = (approvalId: string, by?: string): PendingApproval | null => {
  const state = loadState();
  const approval = state.pendingApprovals.find((a) => a.id === approvalId);
  if (!approval) return null;
  approval.decision = 'approved';
  approval.decidedAt = new Date().toISOString();
  approval.decidedBy = by;
  state.stats.totalActionsApproved++;
  saveState(state);
  notifyListeners(state);
  return approval;
};

export const rejectAction = (approvalId: string, by?: string, reason?: string): PendingApproval | null => {
  const state = loadState();
  const approval = state.pendingApprovals.find((a) => a.id === approvalId);
  if (!approval) return null;
  approval.decision = 'rejected';
  approval.decidedAt = new Date().toISOString();
  approval.decidedBy = by;
  if (reason) approval.context += ` [Rechazado: ${reason}]`;
  state.stats.totalActionsRejected++;
  saveState(state);
  notifyListeners(state);
  return approval;
};

/**
 * Polling helper: espera hasta que una approval se decida o expire.
 * Devuelve el approval final con su decisión (o null si expiró).
 */
export const waitForApproval = async (
  approvalId: string,
  options: { pollIntervalMs?: number } = {},
): Promise<PendingApproval | null> => {
  const pollInterval = options.pollIntervalMs ?? 1000;
  for (;;) {
    const state = loadState();
    const approval = state.pendingApprovals.find((a) => a.id === approvalId);
    if (!approval) return null;
    if (approval.decision) return approval;
    // Expirar si pasó el tiempo
    if (new Date(approval.expiresAt).getTime() < Date.now()) {
      approval.decision = 'rejected';
      approval.decidedAt = new Date().toISOString();
      approval.decidedBy = 'system-timeout';
      saveState(state);
      return approval;
    }
    await new Promise<void>((r) => setTimeout(r, pollInterval));
  }
};

export const listPendingApprovals = (): PendingApproval[] => loadState().pendingApprovals.filter((a) => !a.decision);

export const cleanupExpiredApprovals = (): number => {
  const state = loadState();
  const now = Date.now();
  let cleaned = 0;
  for (const a of state.pendingApprovals) {
    if (!a.decision && new Date(a.expiresAt).getTime() < now) {
      a.decision = 'rejected';
      a.decidedAt = new Date().toISOString();
      a.decidedBy = 'system-timeout';
      cleaned++;
    }
  }
  if (cleaned > 0) saveState(state);
  return cleaned;
};

// ── Stats ────────────────────────────────────────────────────────────────────

export const getCuaModeStats = (): {
  currentMode: CuaMode;
  pendingCount: number;
  stats: CuaModeState['stats'];
  recentTransitions: CuaModeState['history'];
} => {
  const state = loadState();
  return {
    currentMode: state.mode,
    pendingCount: state.pendingApprovals.filter((a) => !a.decision).length,
    stats: state.stats,
    recentTransitions: state.history.slice(-10).reverse(),
  };
};
