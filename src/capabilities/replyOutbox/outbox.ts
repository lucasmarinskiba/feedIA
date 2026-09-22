/**
 * Fachada del outbox: encolar, listar, reintentar, cancelar, resumir.
 *
 * Es la parte "pura" (sin importar meta, compliance ni Bot Control): todo lo externo entra por
 * `createReplyOutbox`. El cableado real vive en `runtime.ts`.
 */

import {
  createDispatcher,
  type AutoGate,
  type Dispatcher,
  type DispatcherConfig,
  type DispatcherStatus,
  type Preflight,
  type RateProbe,
} from './dispatcher.js';
import type { SendResult } from './errors.js';
import type { EnqueueResult, OutboxStore } from './store.js';
import type { EnqueueInput, OutboxEntry, OutboxStatus, OutboxSummary } from './types.js';

export interface OutboxSettings {
  minGapSec: number;
  jitterSec: number;
  maxAttempts: number;
  autoTtlMin: number;
  humanTtlMin: number;
  maxQueued: number;
}

export const DEFAULT_OUTBOX_SETTINGS: OutboxSettings = {
  minGapSec: 30,
  jitterSec: 15,
  maxAttempts: 5,
  autoTtlMin: 180,
  humanTtlMin: 1440,
  maxQueued: 200,
};

/** Compliance exige al menos 20 s entre respuestas: por debajo, el propio limitador las rechazaría. */
const COMPLIANCE_MIN_GAP_SEC = 20;

const positive = (n: number, fallback: number): number => (Number.isFinite(n) && n > 0 ? n : fallback);

/** Sanea la configuración (viene de variables de entorno: puede ser basura). */
export const normalizeSettings = (raw: Partial<OutboxSettings> = {}): OutboxSettings => {
  const d = DEFAULT_OUTBOX_SETTINGS;
  return {
    minGapSec: Math.max(COMPLIANCE_MIN_GAP_SEC, positive(raw.minGapSec ?? d.minGapSec, d.minGapSec)),
    jitterSec: Number.isFinite(raw.jitterSec) && (raw.jitterSec ?? 0) >= 0 ? (raw.jitterSec as number) : d.jitterSec,
    maxAttempts: Math.min(10, Math.max(1, Math.floor(positive(raw.maxAttempts ?? d.maxAttempts, d.maxAttempts)))),
    autoTtlMin: positive(raw.autoTtlMin ?? d.autoTtlMin, d.autoTtlMin),
    humanTtlMin: positive(raw.humanTtlMin ?? d.humanTtlMin, d.humanTtlMin),
    maxQueued: Math.max(1, Math.floor(positive(raw.maxQueued ?? d.maxQueued, d.maxQueued))),
  };
};

/** Lo que se muestra: sin el token de claim (es un secreto de coordinación entre procesos). */
export type OutboxView = Omit<OutboxEntry, 'claim' | 'lastToken'> & {
  /** Segundos estimados hasta el envío (solo en cola). */
  etaSec?: number;
  /** Cuántas salen antes (solo en cola). */
  ahead?: number;
};

export type OutboxActionResult =
  | { ok: true; entry: OutboxView }
  | { ok: false; code: 'not-found' | 'not-allowed' | 'busy' | 'duplicate' };

export interface OutboxReport {
  summary: OutboxSummary;
  dispatcher: DispatcherStatus;
  settings: OutboxSettings;
}

export interface ReplyOutbox {
  readonly store: OutboxStore;
  readonly dispatcher: Dispatcher;
  readonly settings: OutboxSettings;
  /** El TTL lo fija el origen (una persona espera más que el bot). */
  enqueue(input: Omit<EnqueueInput, 'ttlMs'>): EnqueueResult;
  view(id: string): OutboxView | undefined;
  /** Intenta despachar ya; espera a lo sumo `settleMs`. */
  kick(settleMs?: number): Promise<void>;
  list(opts?: { statuses?: readonly OutboxStatus[]; limit?: number }): OutboxView[];
  retry(id: string): Promise<OutboxActionResult>;
  cancel(id: string): OutboxActionResult;
  report(): OutboxReport;
  start(): void;
  stop(): Promise<void>;
}

export interface CreateOutboxOptions {
  store: OutboxStore;
  send: (commentId: string, text: string) => Promise<SendResult>;
  settings?: Partial<OutboxSettings>;
  now?: () => number;
  rng?: () => number;
  owner?: string;
  dispatcher?: Partial<DispatcherConfig>;
  probeRate?: () => RateProbe;
  isDryRun?: () => boolean;
  autoGate?: (at: number) => AutoGate;
  preflight?: () => Preflight;
  onDelivered?: (entry: OutboxEntry) => void;
  onFailed?: (entry: OutboxEntry) => void;
}

export const createReplyOutbox = (opts: CreateOutboxOptions): ReplyOutbox => {
  const settings = normalizeSettings(opts.settings);
  const now = opts.now ?? Date.now;
  const { store } = opts;

  const dispatcher = createDispatcher({
    store,
    send: opts.send,
    now,
    rng: opts.rng,
    owner: opts.owner,
    config: {
      minGapMs: settings.minGapSec * 1000,
      jitterMs: settings.jitterSec * 1000,
      maxAttempts: settings.maxAttempts,
      ...opts.dispatcher,
    },
    probeRate: opts.probeRate,
    isDryRun: opts.isDryRun,
    autoGate: opts.autoGate,
    preflight: opts.preflight,
    onDelivered: opts.onDelivered,
    onFailed: opts.onFailed,
  });

  const ttlFor = (origin: EnqueueInput['origin']): number =>
    (origin === 'human' ? settings.humanTtlMin : settings.autoTtlMin) * 60_000;

  const toView = (e: OutboxEntry, est?: { etaMs: number; ahead: number }): OutboxView => {
    const safe: Partial<OutboxEntry> = { ...e };
    delete safe.claim;
    delete safe.lastToken;
    const base = safe as Omit<OutboxEntry, 'claim' | 'lastToken'>;
    return est ? { ...base, etaSec: Math.ceil(est.etaMs / 1000), ahead: est.ahead } : base;
  };

  const view = (id: string): OutboxView | undefined => {
    const e = store.get(id);
    if (!e) return undefined;
    return toView(e, e.status === 'queued' ? dispatcher.estimates().get(id) : undefined);
  };

  return {
    store,
    dispatcher,
    settings,

    enqueue: (input) => store.enqueue({ ...input, ttlMs: ttlFor(input.origin) }),

    view,

    kick: (settleMs) => dispatcher.kick(settleMs),

    list: (o = {}) => {
      const estimates = dispatcher.estimates();
      return store.list(o).map((e) => toView(e, e.status === 'queued' ? estimates.get(e.id) : undefined));
    },

    retry: async (id) => {
      const e = store.get(id);
      if (!e) return { ok: false, code: 'not-found' };
      if (e.status === 'sending') return { ok: false, code: 'busy' };
      if (e.status !== 'failed' && e.status !== 'expired') return { ok: false, code: 'not-allowed' };
      if (!store.requeue(id, ttlFor(e.origin))) return { ok: false, code: 'duplicate' };
      await dispatcher.kick(1500);
      const after = view(id);
      return after ? { ok: true, entry: after } : { ok: false, code: 'not-found' };
    },

    cancel: (id) => {
      const e = store.get(id);
      if (!e) return { ok: false, code: 'not-found' };
      if (e.status === 'sending') return { ok: false, code: 'busy' };
      if (e.status !== 'queued' && e.status !== 'failed') return { ok: false, code: 'not-allowed' };
      if (!store.cancel(id)) return { ok: false, code: 'busy' };
      const after = view(id);
      return after ? { ok: true, entry: after } : { ok: false, code: 'not-found' };
    },

    report: () => ({ summary: store.summary(), dispatcher: dispatcher.status(), settings }),

    start: () => dispatcher.start(),
    stop: () => dispatcher.stop(),
  };
};
