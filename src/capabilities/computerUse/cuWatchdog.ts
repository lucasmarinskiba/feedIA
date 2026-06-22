// @ts-nocheck
/**
 * CU Watchdog — timeouts + cancellation para Computer Use.
 *
 * Evita que sesiones se cuelguen:
 *   - Timeout por acción individual (5s default)
 *   - Timeout por turn completo (60s default)
 *   - Timeout global de sesión (5min default)
 *   - AbortController para cancelación mid-run
 *   - Cleanup automático
 *
 * Cada sesión registra su watchdog. cancelSession(id) aborta todo.
 */

import { log } from '../../agent/logger.js';

// ── Tipos ─────────────────────────────────────────────────────────────────────

export interface WatchdogConfig {
  actionTimeoutMs: number; // default 8000
  turnTimeoutMs: number; // default 60000
  sessionTimeoutMs: number; // default 300000 (5 min)
}

interface ActiveWatchdog {
  sessionId: string;
  abortController: AbortController;
  startedAt: number;
  sessionTimer: NodeJS.Timeout;
  config: WatchdogConfig;
  cancelled: boolean;
}

const DEFAULT_CONFIG: WatchdogConfig = {
  actionTimeoutMs: 8_000,
  turnTimeoutMs: 60_000,
  sessionTimeoutMs: 300_000,
};

const activeWatchdogs = new Map<string, ActiveWatchdog>();

// ── API ───────────────────────────────────────────────────────────────────────

export const startWatchdog = (
  sessionId: string,
  config: Partial<WatchdogConfig> = {},
): { signal: AbortSignal; isCancelled: () => boolean } => {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const abortController = new AbortController();
  const sessionTimer = setTimeout(() => {
    log.warn('[cuWatchdog] session timeout reached, aborting', { sessionId, ms: cfg.sessionTimeoutMs });
    abortController.abort(new Error('Session timeout'));
    const wd = activeWatchdogs.get(sessionId);
    if (wd) wd.cancelled = true;
  }, cfg.sessionTimeoutMs);

  const wd: ActiveWatchdog = {
    sessionId,
    abortController,
    startedAt: Date.now(),
    sessionTimer,
    config: cfg,
    cancelled: false,
  };
  activeWatchdogs.set(sessionId, wd);
  log.info('[cuWatchdog] started', { sessionId, sessionTimeoutMs: cfg.sessionTimeoutMs });

  return {
    signal: abortController.signal,
    isCancelled: () => wd.cancelled,
  };
};

export const stopWatchdog = (sessionId: string): void => {
  const wd = activeWatchdogs.get(sessionId);
  if (!wd) return;
  clearTimeout(wd.sessionTimer);
  activeWatchdogs.delete(sessionId);
  log.info('[cuWatchdog] stopped', { sessionId, elapsedMs: Date.now() - wd.startedAt });
};

export const cancelSession = (sessionId: string, reason = 'user-cancelled'): boolean => {
  const wd = activeWatchdogs.get(sessionId);
  if (!wd) return false;
  wd.cancelled = true;
  wd.abortController.abort(new Error(reason));
  clearTimeout(wd.sessionTimer);
  activeWatchdogs.delete(sessionId);
  log.warn('[cuWatchdog] cancelled', { sessionId, reason });
  return true;
};

export const isCancelled = (sessionId: string): boolean => {
  const wd = activeWatchdogs.get(sessionId);
  return wd?.cancelled ?? false;
};

export const listActiveWatchdogs = (): Array<{ sessionId: string; elapsedMs: number; cancelled: boolean }> => {
  return [...activeWatchdogs.values()].map((wd) => ({
    sessionId: wd.sessionId,
    elapsedMs: Date.now() - wd.startedAt,
    cancelled: wd.cancelled,
  }));
};

// ── Helpers para wrappear acciones con timeout ────────────────────────────────

/**
 * Ejecuta una promise con timeout. Si excede, lanza error.
 */
export const withTimeout = async <T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage = 'Operation timed out',
): Promise<T> => {
  let timer: NodeJS.Timeout | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${errorMessage} (${timeoutMs}ms)`)), timeoutMs);
  });
  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timer) clearTimeout(timer);
  }
};

/**
 * Ejecuta una acción de CU con timeout configurable.
 */
export const withActionTimeout = <T>(sessionId: string, promise: Promise<T>, customMs?: number): Promise<T> => {
  const wd = activeWatchdogs.get(sessionId);
  const ms = customMs ?? wd?.config.actionTimeoutMs ?? DEFAULT_CONFIG.actionTimeoutMs;
  return withTimeout(promise, ms, `[CU action] ${sessionId}`);
};

export const withTurnTimeout = <T>(sessionId: string, promise: Promise<T>, customMs?: number): Promise<T> => {
  const wd = activeWatchdogs.get(sessionId);
  const ms = customMs ?? wd?.config.turnTimeoutMs ?? DEFAULT_CONFIG.turnTimeoutMs;
  return withTimeout(promise, ms, `[CU turn] ${sessionId}`);
};
