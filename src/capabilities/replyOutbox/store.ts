/**
 * Store del outbox: log de eventos append-only + proyección en memoria.
 *
 * El archivo es la única fuente de verdad. Cada operación es "anexar evento → releer → mirar el
 * resultado": nunca se aplica un cambio local sin pasar por el log. Así, dos procesos sobre el mismo
 * archivo (daemon + servidor Express en el mismo host) ven exactamente el mismo estado.
 *
 * Exclusión mutua (claim): quien quiere enviar anexa un `claim` con un token único y relee. El pliegue
 * es determinista y respeta el ORDEN DEL ARCHIVO: el primer `claim` sobre una entrada `queued` gana;
 * cualquier otro `claim` posterior sobre la misma entrada se ignora. Los perdedores lo ven al releer
 * (su token no quedó) y no envían. Un `append` de una línea chica es atómico en el SO, así que el orden
 * de archivo es un orden total.
 *
 * Envío como MUCHO UNA VEZ: si el dueño de un claim muere (lease vencido), la entrada NO se reencola:
 * pasa a `failed`/`uncertain` para que una persona verifique. Reenviar podría duplicar una respuesta
 * pública, que es peor que una respuesta tardía.
 */

import { randomBytes, randomUUID } from 'node:crypto';
import {
  appendFileSync,
  closeSync,
  existsSync,
  mkdirSync,
  openSync,
  readSync,
  renameSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { dirname } from 'node:path';
import { log } from '../../agent/logger.js';
import type {
  EnqueueInput,
  FailureKind,
  OutboxCounts,
  OutboxEntry,
  OutboxEvent,
  OutboxOrigin,
  OutboxStatus,
  OutboxSummary,
} from './types.js';

// ── Log ───────────────────────────────────────────────────────────────────────

export interface EventLog {
  append(event: OutboxEvent): void;
  /** Eventos nuevos desde la última lectura. `reset`: el archivo se reescribió (compactación) — replegar desde cero. */
  readNew(): { events: OutboxEvent[]; reset: boolean };
  /** Cantidad de líneas leídas desde el último reset (dispara la compactación). */
  lineCount(): number;
  rewrite(events: OutboxEvent[]): void;
}

/** Log en archivo JSONL. Lee incrementalmente por offset y descarta líneas corruptas o a medio escribir. */
export const createFileLog = (path: string): EventLog => {
  let offset = 0;
  let ino = -1;
  let lines = 0;

  const parse = (raw: string, out: OutboxEvent[]): void => {
    for (const line of raw.split('\n')) {
      if (!line.trim()) continue;
      lines += 1;
      try {
        out.push(JSON.parse(line) as OutboxEvent);
      } catch {
        // línea corrupta (corte a mitad de escritura): se descarta
      }
    }
  };

  return {
    append: (event) => {
      mkdirSync(dirname(path), { recursive: true });
      appendFileSync(path, `${JSON.stringify(event)}\n`, 'utf-8');
    },
    readNew: () => {
      const events: OutboxEvent[] = [];
      if (!existsSync(path)) return { events, reset: false };
      const st = statSync(path);
      let reset = false;
      if ((ino !== -1 && st.ino !== ino) || st.size < offset) {
        reset = true;
        offset = 0;
        lines = 0;
      }
      ino = st.ino;
      if (st.size === offset) return { events, reset };

      const fd = openSync(path, 'r');
      try {
        const buf = Buffer.alloc(st.size - offset);
        const n = readSync(fd, buf, 0, buf.length, offset);
        const chunk = buf.subarray(0, n);
        // Solo hasta el último salto de línea: el resto puede ser una escritura en curso de otro proceso.
        const lastNl = chunk.lastIndexOf(0x0a);
        if (lastNl === -1) return { events, reset };
        parse(chunk.subarray(0, lastNl + 1).toString('utf-8'), events);
        offset += lastNl + 1;
      } finally {
        closeSync(fd);
      }
      return { events, reset };
    },
    lineCount: () => lines,
    rewrite: (events) => {
      mkdirSync(dirname(path), { recursive: true });
      const tmp = `${path}.${process.pid}.tmp`;
      writeFileSync(tmp, events.map((e) => JSON.stringify(e)).join('\n') + (events.length ? '\n' : ''), 'utf-8');
      renameSync(tmp, path);
      offset = 0;
      ino = -1;
      lines = 0;
    },
  };
};

/** Log en memoria compartible: cada `open()` es un "proceso" con su propio cursor. Para tests y modo sin disco. */
export const createMemoryLogs = (): { open: () => EventLog } => {
  let events: OutboxEvent[] = [];
  let generation = 0;
  return {
    open: (): EventLog => {
      let cursor = 0;
      let seenGeneration = generation;
      return {
        append: (event) => {
          events.push(event);
        },
        readNew: () => {
          const reset = seenGeneration !== generation;
          if (reset) {
            cursor = 0;
            seenGeneration = generation;
          }
          const fresh = events.slice(cursor);
          cursor = events.length;
          return { events: fresh, reset };
        },
        lineCount: () => events.length,
        rewrite: (next) => {
          events = [...next];
          generation += 1;
          seenGeneration = generation;
          // Quien compacta vuelve a leer los snapshots: su proyección se reconstruye desde el log nuevo.
          cursor = 0;
        },
      };
    },
  };
};

// ── Proyección ────────────────────────────────────────────────────────────────

interface State {
  entries: Map<string, OutboxEntry>;
  /** Última entrada por comentario: base del chequeo de duplicados. */
  latestByComment: Map<string, string>;
}

const ACTIVE: ReadonlySet<OutboxStatus> = new Set<OutboxStatus>(['queued', 'sending', 'sent']);
const TERMINAL: ReadonlySet<OutboxStatus> = new Set<OutboxStatus>(['sent', 'failed', 'cancelled', 'expired']);

const emptyState = (): State => ({ entries: new Map(), latestByComment: new Map() });

/** Pliegue determinista: la misma secuencia de eventos da el mismo estado en cualquier proceso. */
const fold = (state: State, ev: OutboxEvent): void => {
  if (ev.t === 'snapshot') {
    state.entries.set(ev.entry.id, { ...ev.entry });
    const current = state.latestByComment.get(ev.entry.commentId);
    const currentEntry = current ? state.entries.get(current) : undefined;
    if (!currentEntry || ACTIVE.has(ev.entry.status) || !ACTIVE.has(currentEntry.status)) {
      state.latestByComment.set(ev.entry.commentId, ev.entry.id);
    }
    return;
  }

  if (ev.t === 'enqueue') {
    if (state.entries.has(ev.id)) return;
    const prevId = state.latestByComment.get(ev.entry.commentId);
    const prev = prevId ? state.entries.get(prevId) : undefined;
    // Otro proceso ganó la carrera para este comentario: este enqueue queda como duplicado.
    if (prev && ACTIVE.has(prev.status)) return;
    const { notBefore, ttlMs, ...rest } = ev.entry;
    state.entries.set(ev.id, {
      ...rest,
      id: ev.id,
      status: 'queued',
      enqueuedAt: ev.at,
      updatedAt: ev.at,
      notBefore,
      expiresAt: ev.at + ttlMs,
      attempts: 0,
    });
    state.latestByComment.set(ev.entry.commentId, ev.id);
    return;
  }

  const e = state.entries.get(ev.id);
  if (!e) return;
  const touch = (): void => {
    e.updatedAt = ev.at;
  };

  switch (ev.t) {
    case 'claim':
      // Solo el primer claim sobre una entrada en cola gana.
      if (e.status !== 'queued') return;
      e.status = 'sending';
      e.claim = { token: ev.token, owner: ev.owner, leaseUntil: ev.leaseUntil };
      e.lastToken = ev.token;
      touch();
      return;
    case 'sent': {
      const owner = e.status === 'sending' && e.claim?.token === ev.token;
      // Confirmación tardía: el dueño estaba lento, alguien declaró `uncertain`, pero sí salió.
      const late = e.status === 'failed' && e.failureKind === 'uncertain' && e.lastToken === ev.token;
      if (!owner && !late) return;
      e.status = 'sent';
      e.sentAt = ev.at;
      e.dryRun = ev.dryRun;
      e.attempts += 1;
      delete e.claim;
      delete e.failureKind;
      delete e.lastError;
      delete e.lastErrorCode;
      touch();
      return;
    }
    case 'retry':
      if (e.status !== 'sending' || e.claim?.token !== ev.token) return;
      e.status = 'queued';
      e.notBefore = ev.notBefore;
      e.lastError = ev.error;
      if (ev.code) e.lastErrorCode = ev.code;
      else delete e.lastErrorCode;
      if (ev.consumed) e.attempts += 1;
      delete e.claim;
      touch();
      return;
    case 'fail':
      if (e.status !== 'sending' || e.claim?.token !== ev.token) return;
      e.status = 'failed';
      e.failureKind = ev.kind;
      e.lastError = ev.error;
      if (ev.code) e.lastErrorCode = ev.code;
      else delete e.lastErrorCode;
      e.attempts += 1;
      delete e.claim;
      touch();
      return;
    case 'recover':
      // Lease vencido: el dueño murió o quedó colgado. No se sabe si salió → a revisión humana.
      if (e.status !== 'sending' || !e.claim || e.claim.leaseUntil > ev.at) return;
      e.status = 'failed';
      e.failureKind = 'uncertain';
      e.lastError = 'interrumpido: no se sabe si la respuesta salió';
      e.lastErrorCode = 'interrupted';
      e.attempts += 1;
      delete e.claim;
      touch();
      return;
    case 'cancel':
      if (e.status !== 'queued' && e.status !== 'failed') return;
      e.status = 'cancelled';
      delete e.failureKind;
      touch();
      return;
    case 'expire':
      if (e.status !== 'queued' || e.expiresAt > ev.at) return;
      e.status = 'expired';
      touch();
      return;
    case 'requeue':
      if (e.status !== 'failed' && e.status !== 'expired') return;
      e.status = 'queued';
      e.attempts = 0;
      e.notBefore = ev.notBefore;
      e.expiresAt = ev.expiresAt;
      delete e.failureKind;
      delete e.lastError;
      delete e.lastErrorCode;
      state.latestByComment.set(e.commentId, e.id);
      touch();
      return;
  }
};

// ── Store ─────────────────────────────────────────────────────────────────────

export type EnqueueResult =
  | { ok: true; entry: OutboxEntry; duplicate: boolean }
  | { ok: false; reason: 'full' | 'invalid' | 'storage'; detail?: string };

export interface StoreOptions {
  log: EventLog;
  now?: () => number;
  /** Tope de entradas activas (en cola + enviando) para el bot. */
  maxQueued?: number;
  /** Cupo extra que solo usan las aprobaciones humanas: con la cola llena de automáticas, una persona igual puede aprobar. */
  humanReserve?: number;
  /** Cuánto se conserva una entrada terminada. */
  retentionMs?: number;
  /** Compactar el log al arrancar si tiene más líneas que esto. */
  compactAfterLines?: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_TEXT = 2200;
const MAX_TERMINAL_IN_MEMORY = 2000;
export const HUMAN_RESERVE = 50;

const ORIGIN_PRIORITY: Record<OutboxOrigin, number> = { human: 1, auto: 0 };

const emptyCounts = (): OutboxCounts => ({ queued: 0, sending: 0, sent: 0, failed: 0, cancelled: 0, expired: 0 });

export interface OutboxStore {
  /** Relee el log y pliega lo nuevo. Barato si no hay cambios. */
  sync(): void;
  enqueue(input: EnqueueInput): EnqueueResult;
  get(id: string): OutboxEntry | undefined;
  list(opts?: { statuses?: readonly OutboxStatus[]; limit?: number }): OutboxEntry[];
  /** Pendientes cuyo `notBefore` ya llegó, en orden de despacho (personas primero, luego más viejos). */
  due(now: number): OutboxEntry[];
  /** Tomar la entrada para enviarla. `null` si otro proceso la tomó primero. */
  claim(id: string, owner: string, leaseMs: number): OutboxEntry | null;
  markSent(id: string, token: string, dryRun: boolean): boolean;
  markRetry(
    id: string,
    token: string,
    r: { notBefore: number; error: string; code?: string; consumed: boolean },
  ): boolean;
  markFailed(id: string, token: string, r: { kind: FailureKind; error: string; code?: string }): boolean;
  /** Declara `uncertain` las entradas cuyo dueño no volvió. Devuelve las ids afectadas. */
  recoverStale(): string[];
  /** Vence las pendientes que ya no tienen sentido. Devuelve las ids afectadas. */
  expireDue(): string[];
  cancel(id: string): boolean;
  requeue(id: string, ttlMs: number): boolean;
  /** Próximo instante en que algo cambia por sí solo (fin de backoff, vencimiento). null si no hay nada. */
  nextEventAt(): number | null;
  lastSentAt(): number | null;
  summary(): OutboxSummary;
  compact(): void;
}

export const createOutboxStore = (opts: StoreOptions): OutboxStore => {
  const now = opts.now ?? Date.now;
  const eventLog = opts.log;
  const maxQueued = opts.maxQueued ?? 200;
  const humanReserve = opts.humanReserve ?? HUMAN_RESERVE;
  const retentionMs = opts.retentionMs ?? 7 * DAY_MS;
  const compactAfter = opts.compactAfterLines ?? 4000;
  let state = emptyState();
  let started = false;

  const pruneTerminal = (): void => {
    const terminal = [...state.entries.values()].filter((e) => TERMINAL.has(e.status));
    if (terminal.length <= MAX_TERMINAL_IN_MEMORY) return;
    terminal.sort((a, b) => a.updatedAt - b.updatedAt);
    for (const e of terminal.slice(0, terminal.length - MAX_TERMINAL_IN_MEMORY)) state.entries.delete(e.id);
  };

  const sync = (): void => {
    const { events, reset } = eventLog.readNew();
    if (reset) state = emptyState();
    for (const ev of events) fold(state, ev);
    if (events.length > 0) pruneTerminal();
  };

  const commit = (ev: OutboxEvent): void => {
    eventLog.append(ev);
    sync();
  };

  const compact = (): void => {
    sync();
    const cutoff = now() - retentionMs;
    const keep = [...state.entries.values()].filter((e) => !TERMINAL.has(e.status) || e.updatedAt >= cutoff);
    keep.sort((a, b) => a.enqueuedAt - b.enqueuedAt);
    eventLog.rewrite(keep.map((entry): OutboxEvent => ({ t: 'snapshot', at: now(), entry })));
    state = emptyState();
    sync();
  };

  const ensureStarted = (): void => {
    if (started) return;
    started = true;
    try {
      sync();
      if (eventLog.lineCount() > compactAfter) compact();
    } catch (err) {
      log.warn(`[ReplyOutbox] no pude leer el log: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const refresh = (): void => {
    ensureStarted();
    sync();
  };

  const activeCount = (): number => {
    let n = 0;
    for (const e of state.entries.values()) if (e.status === 'queued' || e.status === 'sending') n += 1;
    return n;
  };

  const snapshotOf = (e: OutboxEntry | undefined): OutboxEntry | undefined => (e ? { ...e } : undefined);

  return {
    sync: refresh,

    enqueue: (input) => {
      refresh();
      const commentId = input.commentId.trim();
      const text = input.text.trim();
      if (!commentId) return { ok: false, reason: 'invalid', detail: 'commentId vacío' };
      if (!text) return { ok: false, reason: 'invalid', detail: 'texto vacío' };
      if (text.length > MAX_TEXT)
        return { ok: false, reason: 'invalid', detail: `texto de más de ${MAX_TEXT} caracteres` };
      if (!(input.ttlMs > 0)) return { ok: false, reason: 'invalid', detail: 'ttl inválido' };

      const existingId = state.latestByComment.get(commentId);
      const existing = existingId ? state.entries.get(existingId) : undefined;
      if (existing && ACTIVE.has(existing.status)) return { ok: true, entry: { ...existing }, duplicate: true };

      const cap = input.origin === 'human' ? maxQueued + humanReserve : maxQueued;
      if (activeCount() >= cap) return { ok: false, reason: 'full', detail: `hay ${activeCount()} respuestas en cola` };

      const id = `ob-${now().toString(36)}-${randomBytes(4).toString('hex')}`;
      try {
        commit({ t: 'enqueue', at: now(), id, entry: { ...input, commentId, text, notBefore: now() } });
      } catch (err) {
        // Sin disco no hay garantía de durabilidad: se avisa en vez de aceptar algo que se perdería.
        const detail = err instanceof Error ? err.message : String(err);
        log.error(`[ReplyOutbox] no pude persistir el envío: ${detail}`);
        return { ok: false, reason: 'storage', detail };
      }

      const entry = state.entries.get(id);
      if (entry) return { ok: true, entry: { ...entry }, duplicate: false };
      // Otro proceso encoló el mismo comentario en el mismo instante y ganó el orden de archivo.
      const winnerId = state.latestByComment.get(commentId);
      const winner = winnerId ? state.entries.get(winnerId) : undefined;
      return winner
        ? { ok: true, entry: { ...winner }, duplicate: true }
        : { ok: false, reason: 'invalid', detail: 'no se pudo registrar' };
    },

    get: (id) => {
      refresh();
      return snapshotOf(state.entries.get(id));
    },

    list: (o = {}) => {
      refresh();
      const wanted = o.statuses ? new Set<OutboxStatus>(o.statuses) : null;
      const rows = [...state.entries.values()].filter((e) => !wanted || wanted.has(e.status));
      rows.sort((a, b) => b.updatedAt - a.updatedAt);
      return rows.slice(0, o.limit ?? 100).map((e) => ({ ...e }));
    },

    due: (at) => {
      refresh();
      const rows = [...state.entries.values()].filter((e) => e.status === 'queued' && e.notBefore <= at);
      rows.sort((a, b) => ORIGIN_PRIORITY[b.origin] - ORIGIN_PRIORITY[a.origin] || a.enqueuedAt - b.enqueuedAt);
      return rows.map((e) => ({ ...e }));
    },

    claim: (id, owner, leaseMs) => {
      refresh();
      const e = state.entries.get(id);
      if (!e || e.status !== 'queued') return null;
      const token = randomUUID();
      const at = now();
      commit({ t: 'claim', at, id, token, owner, leaseUntil: at + leaseMs });
      const after = state.entries.get(id);
      return after?.status === 'sending' && after.claim?.token === token ? { ...after } : null;
    },

    markSent: (id, token, dryRun) => {
      commit({ t: 'sent', at: now(), id, token, dryRun });
      return state.entries.get(id)?.status === 'sent';
    },

    markRetry: (id, token, r) => {
      commit({ t: 'retry', at: now(), id, token, ...r });
      const e = state.entries.get(id);
      return e?.status === 'queued' && e.lastError === r.error;
    },

    markFailed: (id, token, r) => {
      commit({ t: 'fail', at: now(), id, token, ...r });
      return state.entries.get(id)?.status === 'failed';
    },

    recoverStale: () => {
      refresh();
      const at = now();
      const stale = [...state.entries.values()].filter(
        (e) => e.status === 'sending' && e.claim && e.claim.leaseUntil <= at,
      );
      for (const e of stale) eventLog.append({ t: 'recover', at, id: e.id });
      if (stale.length > 0) sync();
      return stale.filter((e) => state.entries.get(e.id)?.status === 'failed').map((e) => e.id);
    },

    expireDue: () => {
      refresh();
      const at = now();
      const due = [...state.entries.values()].filter((e) => e.status === 'queued' && e.expiresAt <= at);
      for (const e of due) eventLog.append({ t: 'expire', at, id: e.id });
      if (due.length > 0) sync();
      return due.filter((e) => state.entries.get(e.id)?.status === 'expired').map((e) => e.id);
    },

    cancel: (id) => {
      refresh();
      const e = state.entries.get(id);
      if (!e || (e.status !== 'queued' && e.status !== 'failed')) return false;
      commit({ t: 'cancel', at: now(), id });
      return state.entries.get(id)?.status === 'cancelled';
    },

    requeue: (id, ttlMs) => {
      refresh();
      const e = state.entries.get(id);
      if (!e || (e.status !== 'failed' && e.status !== 'expired')) return false;
      // Un comentario, una respuesta: si ya hay otra activa para el mismo comentario, no se duplica.
      const latestId = state.latestByComment.get(e.commentId);
      const latest = latestId ? state.entries.get(latestId) : undefined;
      if (latest && latest.id !== e.id && ACTIVE.has(latest.status)) return false;
      const at = now();
      commit({ t: 'requeue', at, id, notBefore: at, expiresAt: at + ttlMs });
      return state.entries.get(id)?.status === 'queued';
    },

    nextEventAt: () => {
      refresh();
      let next: number | null = null;
      for (const e of state.entries.values()) {
        const candidate =
          e.status === 'queued'
            ? Math.min(e.notBefore, e.expiresAt)
            : e.status === 'sending' && e.claim
              ? e.claim.leaseUntil
              : null;
        if (candidate !== null && (next === null || candidate < next)) next = candidate;
      }
      return next;
    },

    lastSentAt: () => {
      refresh();
      let last: number | null = null;
      for (const e of state.entries.values())
        if (e.sentAt !== undefined && (last === null || e.sentAt > last)) last = e.sentAt;
      return last;
    },

    summary: () => {
      refresh();
      const counts = emptyCounts();
      let uncertain = 0;
      let oldestQueuedAt: number | null = null;
      let lastSentAt: number | null = null;
      let sentLastHour = 0;
      const hourAgo = now() - 60 * 60 * 1000;
      for (const e of state.entries.values()) {
        counts[e.status] += 1;
        if (e.status === 'failed' && e.failureKind === 'uncertain') uncertain += 1;
        if (e.status === 'queued' && (oldestQueuedAt === null || e.enqueuedAt < oldestQueuedAt))
          oldestQueuedAt = e.enqueuedAt;
        if (e.sentAt !== undefined) {
          if (lastSentAt === null || e.sentAt > lastSentAt) lastSentAt = e.sentAt;
          if (!e.dryRun && e.sentAt >= hourAgo) sentLastHour += 1;
        }
      }
      return { counts, uncertain, oldestQueuedAt, lastSentAt, sentLastHour };
    },

    compact,
  };
};
