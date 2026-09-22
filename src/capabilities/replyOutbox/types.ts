/**
 * Tipos del outbox de respuestas a comentarios.
 *
 * El outbox es la única puerta de salida de las respuestas públicas: desacopla la DECISIÓN de responder
 * (una persona aprobó, o el brain lo hizo solo) del ENVÍO (que tiene que respetar el ritmo que Instagram
 * tolera). Sin esto, un lote de aprobaciones choca con el límite de compliance y las respuestas se pierden.
 */

export type OutboxStatus = 'queued' | 'sending' | 'sent' | 'failed' | 'cancelled' | 'expired';

/** `human`: una persona lo aprobó/escribió (sale primero, ignora horario silencioso). `auto`: lo decidió el bot. */
export type OutboxOrigin = 'human' | 'auto';

/**
 * Por qué terminó en `failed` (siempre requiere ojos humanos):
 *  - `permanent`: la red o compliance lo rechazan y reintentar no cambia nada (comentario borrado, contenido bloqueado).
 *  - `exhausted`: se agotaron los reintentos por errores transitorios.
 *  - `uncertain`: no se sabe si salió (el proceso murió o el envío no respondió). NO se reintenta solo:
 *    un duplicado público es peor que una respuesta que llega tarde.
 */
export type FailureKind = 'permanent' | 'exhausted' | 'uncertain';

export interface OutboxClaim {
  token: string;
  owner: string;
  leaseUntil: number;
}

export interface OutboxEntry {
  id: string;
  /** Un comentario recibe UNA respuesta: mismo `commentId` en cola/enviando/enviado ⇒ duplicado. */
  commentId: string;
  text: string;
  origin: OutboxOrigin;
  accountKey: string;
  handle: string;
  /** Item de la cola de revisión que originó el envío, si lo hubo. */
  reviewId?: string;
  postId?: string;
  intent?: string;
  status: OutboxStatus;
  enqueuedAt: number;
  updatedAt: number;
  /** No antes de: backoff y esperas por límite de ritmo. */
  notBefore: number;
  /** Pasado este punto una respuesta pendiente pierde sentido y no se envía. */
  expiresAt: number;
  /** Envíos realmente intentados (los esperados por ritmo/pausa no cuentan). */
  attempts: number;
  claim?: OutboxClaim;
  /** Último claim que intentó enviar: permite reconciliar una confirmación tardía. */
  lastToken?: string;
  lastError?: string;
  lastErrorCode?: string;
  failureKind?: FailureKind;
  sentAt?: number;
  /** Salió simulado (DRY_RUN): no publicó nada en la red. */
  dryRun?: boolean;
}

/** Campos que fija quien encola; el resto los pone el store. */
export interface EnqueueInput {
  commentId: string;
  text: string;
  origin: OutboxOrigin;
  accountKey: string;
  handle: string;
  reviewId?: string;
  postId?: string;
  intent?: string;
  /** Vida útil de la respuesta pendiente. */
  ttlMs: number;
}

/**
 * Eventos del log (append-only). El estado de cada entrada es el pliegue de estos eventos EN ORDEN DE ARCHIVO:
 * el orden es el árbitro cuando dos procesos compiten (ver `store.ts`).
 */
export type OutboxEvent =
  | { t: 'enqueue'; at: number; id: string; entry: EnqueueInput & { notBefore: number } }
  | { t: 'claim'; at: number; id: string; token: string; owner: string; leaseUntil: number }
  | { t: 'sent'; at: number; id: string; token: string; dryRun: boolean }
  | {
      t: 'retry';
      at: number;
      id: string;
      token: string;
      notBefore: number;
      error: string;
      code?: string;
      /** false = esperó por ritmo o pausa del sistema: no gastó un intento. */
      consumed: boolean;
    }
  | { t: 'fail'; at: number; id: string; token: string; kind: FailureKind; error: string; code?: string }
  | { t: 'recover'; at: number; id: string }
  | { t: 'cancel'; at: number; id: string }
  | { t: 'expire'; at: number; id: string }
  | { t: 'requeue'; at: number; id: string; notBefore: number; expiresAt: number }
  | { t: 'snapshot'; at: number; entry: OutboxEntry };

export interface OutboxCounts {
  queued: number;
  sending: number;
  sent: number;
  failed: number;
  cancelled: number;
  expired: number;
}

export interface OutboxSummary {
  counts: OutboxCounts;
  /** Cuántos de los `failed` no se sabe si salieron. */
  uncertain: number;
  oldestQueuedAt: number | null;
  lastSentAt: number | null;
  /** Envíos confirmados en la última hora (los simulados no cuentan). */
  sentLastHour: number;
}
