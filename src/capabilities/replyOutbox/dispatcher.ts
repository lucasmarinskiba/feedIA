/**
 * Despachador del outbox: saca UNA respuesta por vez, respetando el ritmo que Instagram tolera.
 *
 * Cada `tickOnce()` hace, en orden:
 *   1. Mantenimiento: declara `uncertain` lo que un dueño muerto dejó a medias y vence lo que ya no sirve.
 *   2. Pausas: sistema en pausa (token vencido, emergencia, GlassBox) → no se toca nada.
 *   3. Elegibilidad: las respuestas del bot esperan si el bot está apagado o es horario silencioso; las de una persona no.
 *   4. Ritmo: separación mínima con jitter (para no parecer un metrónomo) y el límite de compliance por hora/día.
 *   5. Claim → envío → resultado clasificado (ver `errors.ts`).
 *
 * Todo lo externo (reloj, azar, envío, límite de compliance, puertas) entra por `deps`: el módulo
 * no importa compliance ni Bot Control, y se prueba con reloj falso y sin red.
 */

import { hostname } from 'node:os';
import { log } from '../../agent/logger.js';
import { classifySendFailure, type SendResult } from './errors.js';
import type { OutboxStore } from './store.js';
import type { FailureKind, OutboxEntry } from './types.js';

export interface RateProbe {
  allowed: boolean;
  /** Segundos hasta que el limitador vuelva a permitir. */
  waitSec?: number;
  reason?: string;
  count: number;
  limit: number;
}

export type Preflight = { ok: true } | { ok: false; code: string; reason: string; waitMs: number };
export type AutoGate = { open: true } | { open: false; reason: string };

export interface DispatcherConfig {
  /** Separación mínima entre dos envíos. Debe superar la del limitador de compliance (20 s). */
  minGapMs: number;
  /** Se suma al azar a la separación para que el ritmo no sea de máquina. */
  jitterMs: number;
  maxAttempts: number;
  backoffBaseMs: number;
  backoffMaxMs: number;
  /** Más que el máximo de espera de GlassBox en modo supervisado (5 min): si no, se declararía incierto algo que sigue vivo. */
  sendTimeoutMs: number;
  /** Cuánto vale un claim antes de considerar muerto al dueño. */
  leaseMs: number;
  minPollMs: number;
  maxPollMs: number;
  /** Fracción del tope horario que se reserva a respuestas de personas (el bot no la puede gastar). */
  humanHeadroom: number;
}

export const DEFAULT_DISPATCHER_CONFIG: DispatcherConfig = {
  minGapMs: 30_000,
  jitterMs: 15_000,
  maxAttempts: 5,
  backoffBaseMs: 60_000,
  backoffMaxMs: 30 * 60_000,
  sendTimeoutMs: 330_000,
  leaseMs: 360_000,
  minPollMs: 1_000,
  maxPollMs: 15_000,
  humanHeadroom: 0.2,
};

export interface DispatcherDeps {
  store: OutboxStore;
  send: (commentId: string, text: string) => Promise<SendResult>;
  now?: () => number;
  rng?: () => number;
  owner?: string;
  config?: Partial<DispatcherConfig>;
  /** Estado del limitador de compliance para respuestas a comentarios. */
  probeRate?: () => RateProbe;
  isDryRun?: () => boolean;
  /** Puertas que solo aplican a lo que envía el bot (interruptor del bot, horario silencioso). */
  autoGate?: (at: number) => AutoGate;
  /** Puerta global: si dice que no, no se envía nada (ni de personas). */
  preflight?: () => Preflight;
  onDelivered?: (entry: OutboxEntry) => void;
  onFailed?: (entry: OutboxEntry) => void;
}

export type TickOutcome =
  | { kind: 'sent'; id: string }
  | { kind: 'failed'; id: string; failure: FailureKind }
  | { kind: 'retry'; id: string; code: string }
  | { kind: 'idle'; wakeAt: number | null }
  | { kind: 'held'; wakeAt: number; reason: string }
  | { kind: 'throttled'; wakeAt: number; reason: string }
  | { kind: 'lost-claim' };

export interface DispatcherStatus {
  started: boolean;
  holdUntil: number | null;
  holdReason: string | null;
  nextSlotAt: number | null;
  autoGate: AutoGate;
  rate: RateProbe | null;
}

export interface Estimate {
  /** Cuántas respuestas salen antes (0 = es la próxima). */
  ahead: number;
  /** Aproximado: no modela que el tope horario de compliance puede alargar una cola larga. */
  etaMs: number;
}

export interface Dispatcher {
  tickOnce(): Promise<TickOutcome>;
  /** Intenta despachar ya (sin esperar al próximo ciclo); espera como mucho `settleMs` a que termine. */
  kick(settleMs?: number): Promise<void>;
  start(): void;
  stop(): Promise<void>;
  status(): DispatcherStatus;
  estimates(): Map<string, Estimate>;
}

class SendTimeoutError extends Error {}

const withTimeout = <T>(work: Promise<T>, ms: number): Promise<T> =>
  new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new SendTimeoutError(`sin respuesta en ${ms}ms`)), ms);
    work.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e: unknown) => {
        clearTimeout(timer);
        reject(e instanceof Error ? e : new Error(String(e)));
      },
    );
  });

export const createDispatcher = (deps: DispatcherDeps): Dispatcher => {
  const { store } = deps;
  const now = deps.now ?? Date.now;
  const rng = deps.rng ?? Math.random;
  const cfg: DispatcherConfig = { ...DEFAULT_DISPATCHER_CONFIG, ...deps.config };
  const owner = deps.owner ?? `${hostname()}:${process.pid}`;

  let holdUntil = 0;
  let holdReason: string | null = null;
  let nextSlotAt = 0;
  let running: Promise<TickOutcome> | null = null;
  let started = false;
  let timer: NodeJS.Timeout | null = null;

  const hold = (code: string, reason: string, until: number): void => {
    holdUntil = Math.max(holdUntil, until);
    holdReason = `${code}: ${reason}`;
    log.warn(`[ReplyOutbox] despacho en pausa hasta ${new Date(holdUntil).toISOString()} — ${holdReason}`);
  };

  const gapMs = (): number => cfg.minGapMs + Math.floor(rng() * cfg.jitterMs);

  const backoffMs = (attempt: number): number => {
    const exp = Math.min(cfg.backoffBaseMs * 2 ** Math.max(0, attempt - 1), cfg.backoffMaxMs);
    return Math.round(exp * (0.75 + rng() * 0.5));
  };

  const safely = (fn: (() => void) | undefined): void => {
    try {
      fn?.();
    } catch (err) {
      log.warn(`[ReplyOutbox] hook falló: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const fire = (hook: ((e: OutboxEntry) => void) | undefined, id: string): void => {
    const e = store.get(id);
    if (e) safely(() => hook?.(e));
  };

  /** Elegibles hoy: las del bot dependen de las puertas y del cupo reservado a personas. */
  const eligible = (due: OutboxEntry[], at: number, rate: RateProbe | null): OutboxEntry[] => {
    const gate = deps.autoGate?.(at) ?? { open: true as const };
    const reserved = rate ? Math.ceil(rate.limit * cfg.humanHeadroom) : 0;
    const botHasBudget = !rate || rate.count < rate.limit - reserved;
    return due.filter((e) => e.origin === 'human' || (gate.open && botHasBudget));
  };

  const idleWake = (at: number): number | null => {
    const next = store.nextEventAt();
    if (next === null) return null;
    // Algo ya vencido pero no elegible (bot apagado, horario silencioso): se revisa despacio, no en bucle.
    return next <= at ? at + cfg.maxPollMs : next;
  };

  const tickOnce = async (): Promise<TickOutcome> => {
    const t0 = now();
    store.sync();

    for (const id of store.recoverStale()) {
      log.warn(`[ReplyOutbox] ${id} quedó a medias: se marca incierto (no se reenvía solo)`);
      fire(deps.onFailed, id);
    }
    for (const id of store.expireDue()) log.info(`[ReplyOutbox] ${id} venció sin enviarse`);

    if (holdUntil > t0) return { kind: 'held', wakeAt: holdUntil, reason: holdReason ?? 'pausa' };
    const pre = deps.preflight?.();
    if (pre && !pre.ok) {
      hold(pre.code, pre.reason, t0 + pre.waitMs);
      return { kind: 'held', wakeAt: holdUntil, reason: holdReason ?? pre.reason };
    }

    const due = store.due(t0);
    if (due.length === 0) return { kind: 'idle', wakeAt: idleWake(t0) };

    const rate = deps.probeRate?.() ?? null;
    const candidates = eligible(due, t0, rate);
    if (candidates.length === 0) return { kind: 'idle', wakeAt: idleWake(t0) };

    const paceAt = Math.max(nextSlotAt, (store.lastSentAt() ?? 0) + cfg.minGapMs);
    if (t0 < paceAt) return { kind: 'throttled', wakeAt: paceAt, reason: 'separación entre respuestas' };
    if (rate && !rate.allowed) {
      const wait = Math.max(1, rate.waitSec ?? 60) * 1000;
      return {
        kind: 'throttled',
        wakeAt: t0 + wait + Math.floor(rng() * 3000),
        reason: rate.reason ?? 'límite de compliance',
      };
    }

    const target = candidates[0];
    if (!target) return { kind: 'idle', wakeAt: idleWake(t0) };
    const claimed = store.claim(target.id, owner, cfg.leaseMs);
    if (!claimed?.claim) return { kind: 'lost-claim' };
    const { id } = claimed;
    const { token } = claimed.claim;

    let result: SendResult;
    try {
      result = await withTimeout(deps.send(claimed.commentId, claimed.text), cfg.sendTimeoutMs);
    } catch (err) {
      if (err instanceof SendTimeoutError) {
        // No se sabe si salió: NO se reintenta solo.
        store.markFailed(id, token, {
          kind: 'uncertain',
          error: 'el envío no respondió a tiempo: puede haber salido',
          code: 'send-timeout',
        });
        fire(deps.onFailed, id);
        return { kind: 'failed', id, failure: 'uncertain' };
      }
      result = { ok: false, error: err instanceof Error ? err.message : String(err) };
    }

    const t1 = now();
    if (result.ok) {
      store.markSent(id, token, deps.isDryRun?.() ?? false);
      nextSlotAt = t1 + gapMs();
      fire(deps.onDelivered, id);
      return { kind: 'sent', id };
    }

    const cls = classifySendFailure(result);
    switch (cls.kind) {
      case 'rate-limited': {
        // El limitador sabe mejor que nadie cuánto falta; el texto del error es la red de seguridad.
        const probed = deps.probeRate?.();
        const waitMs = probed && !probed.allowed ? Math.max(1, probed.waitSec ?? 1) * 1000 : cls.waitMs;
        store.markRetry(id, token, {
          notBefore: t1 + waitMs + Math.floor(rng() * 3000),
          error: cls.message,
          code: cls.code,
          consumed: false,
        });
        return { kind: 'retry', id, code: cls.code };
      }
      case 'hold':
        hold(cls.code, cls.message, t1 + cls.waitMs);
        store.markRetry(id, token, { notBefore: t1 + cls.waitMs, error: cls.message, code: cls.code, consumed: false });
        return { kind: 'retry', id, code: cls.code };
      case 'transient': {
        const attempt = claimed.attempts + 1;
        if (attempt >= cfg.maxAttempts) {
          store.markFailed(id, token, { kind: 'exhausted', error: cls.message, code: cls.code });
          log.error(`[ReplyOutbox] ${id} agotó ${attempt} intentos: ${cls.message}`);
          fire(deps.onFailed, id);
          return { kind: 'failed', id, failure: 'exhausted' };
        }
        store.markRetry(id, token, {
          notBefore: t1 + backoffMs(attempt),
          error: cls.message,
          code: cls.code,
          consumed: true,
        });
        return { kind: 'retry', id, code: cls.code };
      }
      case 'permanent':
        store.markFailed(id, token, { kind: 'permanent', error: cls.message, code: cls.code });
        log.error(`[ReplyOutbox] ${id} rechazada (${cls.code}): ${cls.message}`);
        fire(deps.onFailed, id);
        return { kind: 'failed', id, failure: 'permanent' };
    }
  };

  /** Un solo tick a la vez por proceso; los `kick` concurrentes esperan al que ya corre. */
  const runTick = (): Promise<TickOutcome> => {
    if (running) return running;
    running = tickOnce().finally(() => {
      running = null;
    });
    return running;
  };

  const clampWake = (wakeAt: number | null): number => {
    const delta = wakeAt === null ? cfg.maxPollMs : wakeAt - now();
    return Math.min(cfg.maxPollMs, Math.max(cfg.minPollMs, delta));
  };

  const schedule = (ms: number): void => {
    if (!started) return;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => void loop(), ms);
    timer.unref();
  };

  const loop = async (): Promise<void> => {
    timer = null;
    if (!started) return;
    let next = cfg.maxPollMs;
    try {
      const out = await runTick();
      if (out.kind === 'idle') next = clampWake(out.wakeAt);
      else if (out.kind === 'held' || out.kind === 'throttled') next = clampWake(out.wakeAt);
      else next = cfg.minPollMs;
    } catch (err) {
      // Un error inesperado no debe matar el ciclo: se loguea y se reintenta despacio.
      log.error(`[ReplyOutbox] tick falló: ${err instanceof Error ? err.message : String(err)}`);
    }
    schedule(next);
  };

  const orderedQueue = (): OutboxEntry[] => {
    const queued = store.list({ statuses: ['queued'], limit: 1000 });
    return queued.sort(
      (a, b) => (b.origin === 'human' ? 1 : 0) - (a.origin === 'human' ? 1 : 0) || a.enqueuedAt - b.enqueuedAt,
    );
  };

  return {
    tickOnce: runTick,

    kick: async (settleMs = 3000): Promise<void> => {
      let settle: NodeJS.Timeout | undefined;
      const timeout = new Promise<void>((resolve) => {
        settle = setTimeout(resolve, settleMs);
        settle.unref();
      });
      try {
        await Promise.race([
          runTick().then(
            () => undefined,
            (err: unknown) =>
              log.error(`[ReplyOutbox] kick falló: ${err instanceof Error ? err.message : String(err)}`),
          ),
          timeout,
        ]);
      } finally {
        if (settle) clearTimeout(settle);
      }
      schedule(cfg.minPollMs);
    },

    start: (): void => {
      if (started) return;
      started = true;
      schedule(0);
    },

    stop: async (): Promise<void> => {
      started = false;
      if (timer) clearTimeout(timer);
      timer = null;
      if (running) await running.catch(() => undefined);
    },

    status: (): DispatcherStatus => {
      const at = now();
      return {
        started,
        holdUntil: holdUntil > at ? holdUntil : null,
        holdReason: holdUntil > at ? holdReason : null,
        nextSlotAt: nextSlotAt > at ? nextSlotAt : null,
        autoGate: deps.autoGate?.(at) ?? { open: true },
        rate: deps.probeRate?.() ?? null,
      };
    },

    estimates: (): Map<string, Estimate> => {
      const at = now();
      const rate = deps.probeRate?.();
      const paceWait = Math.max(0, Math.max(nextSlotAt, (store.lastSentAt() ?? 0) + cfg.minGapMs) - at);
      const rateWait = rate && !rate.allowed ? Math.max(1, rate.waitSec ?? 1) * 1000 : 0;
      const holdWait = Math.max(0, holdUntil - at);
      const first = Math.max(paceWait, rateWait, holdWait);
      const avgGap = cfg.minGapMs + cfg.jitterMs / 2;
      const out = new Map<string, Estimate>();
      orderedQueue().forEach((e, i) => {
        out.set(e.id, { ahead: i, etaMs: Math.max(first, Math.max(0, e.notBefore - at)) + i * avgGap });
      });
      return out;
    },
  };
};
