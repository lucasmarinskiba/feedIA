/**
 * Cableado real del outbox: archivo de log, envío por `replyToComment`, límite de compliance,
 * interruptor del bot, horario silencioso y pausas del sistema (emergencia, GlassBox).
 *
 * Un único outbox por proceso. El daemon y el servidor Express arrancan el suyo; si comparten
 * archivo (mismo host), el protocolo de claim del store evita el doble envío.
 */

import { resolve } from 'node:path';
import { emit } from '../../agent/bus.js';
import { log } from '../../agent/logger.js';
import { isEmergencyActive, recordFailure, recordSuccess, type GuardianContext } from '../../compliance/index.js';
import { RATE_LIMITS, checkRateLimit } from '../../compliance/rateLimiter.js';
import { env } from '../../config/index.js';
import { getMode as getGlassBoxMode } from '../../glassbox/supervisor.js';
import { replyToComment } from '../../integrations/meta.js';
import { isQuietHour } from '../bot/safetyRails.js';
import { isBotEnabled } from '../botControl/index.js';
import type { AutoGate, Preflight, RateProbe } from './dispatcher.js';
import { createReplyOutbox, normalizeSettings, type OutboxSettings, type ReplyOutbox } from './outbox.js';
import { createFileLog, createOutboxStore } from './store.js';
import type { OutboxEntry } from './types.js';

const OUTBOX_PATH = resolve('data/runtime/reply-outbox.jsonl');

export const isReplyOutboxEnabled = (): boolean => env.bot.replyOutbox.enabled;

export const resolveOutboxSettings = (): OutboxSettings => normalizeSettings(env.bot.replyOutbox);

const probeRate = (): RateProbe => {
  const c = checkRateLimit('reply_comment');
  return {
    allowed: c.allowed,
    ...(c.nextAvailableInSeconds !== undefined ? { waitSec: c.nextAvailableInSeconds } : {}),
    ...(c.reason ? { reason: c.reason } : {}),
    count: c.currentCount,
    limit: RATE_LIMITS.reply_comment.maxPerHour,
  };
};

/** Lo que envía el bot respeta su interruptor y el horario silencioso; lo que aprobó una persona, no. */
const autoGate = (at: number): AutoGate => {
  if (!isBotEnabled('comment-bot')) return { open: false, reason: 'comment-bot apagado' };
  if (isQuietHour(new Date(at))) return { open: false, reason: 'horario silencioso' };
  return { open: true };
};

/** Pausas que afectan a TODO envío. Con esto no se intenta (y no se acumulan acciones pendientes en GlassBox). */
const preflight = (): Preflight => {
  if (isEmergencyActive()) return { ok: false, code: 'emergency', reason: 'modo emergencia activo', waitMs: 60_000 };
  if (getGlassBoxMode() === 'paused') {
    return { ok: false, code: 'glassbox-paused', reason: 'GlassBox en pausa', waitMs: 60_000 };
  }
  if (!env.compliance.acceptedTerms) {
    return { ok: false, code: 'terms-not-accepted', reason: 'términos de compliance sin aceptar', waitMs: 300_000 };
  }
  return { ok: true };
};

const guardianCtx = (e: OutboxEntry): GuardianContext => ({
  actor: 'bot:auto-reply',
  targetIgUserId: e.handle,
  targetContentId: e.postId ?? e.commentId,
  contentText: e.text,
  humanInitiated: false,
});

const onDelivered = (e: OutboxEntry): void => {
  log.success(
    `[ReplyOutbox] respuesta ${e.dryRun ? 'simulada' : 'enviada'} a ${e.handle} (${e.origin}, intento ${e.attempts})`,
  );
  // Paridad con el camino anterior: el bot registraba cada auto-respuesta exitosa en compliance.
  if (e.origin === 'auto') recordSuccess('bot_auto_reply', guardianCtx(e), e.commentId);
};

const onFailed = (e: OutboxEntry): void => {
  if (e.origin === 'auto') recordFailure('bot_auto_reply', guardianCtx(e), e.lastError ?? 'fallo de envío');
  // Un fallo que necesita a una persona tiene que ser visible fuera de los logs.
  emit({
    type: 'ReplyDeliveryFailed',
    sourceAgent: 'reply-outbox',
    priority: e.failureKind === 'uncertain' ? 'high' : 'normal',
    correlationId: e.id,
    payload: {
      outboxId: e.id,
      handle: e.handle,
      origin: e.origin,
      failureKind: e.failureKind,
      error: e.lastError,
      code: e.lastErrorCode,
    },
  });
};

let instance: ReplyOutbox | null = null;
/** Solo tests: reemplaza el outbox del proceso (o lo desactiva con `null`). `undefined` = comportamiento normal. */
let override: ReplyOutbox | null | undefined;

/** El outbox del proceso, o `null` si está desactivado (REPLY_OUTBOX_ENABLED=false): en ese caso se envía en el acto. */
export const getReplyOutbox = (): ReplyOutbox | null => {
  if (override !== undefined) return override;
  if (!isReplyOutboxEnabled()) return null;
  if (!instance) {
    const settings = resolveOutboxSettings();
    instance = createReplyOutbox({
      store: createOutboxStore({ log: createFileLog(OUTBOX_PATH), maxQueued: settings.maxQueued }),
      send: replyToComment,
      settings,
      probeRate,
      isDryRun: () => env.dryRun,
      autoGate,
      preflight,
      onDelivered,
      onFailed,
    });
  }
  return instance;
};

/** Arranca el despacho en segundo plano. Idempotente. */
export const startReplyOutbox = (): void => {
  const outbox = getReplyOutbox();
  if (!outbox) {
    log.info('[ReplyOutbox] desactivado (REPLY_OUTBOX_ENABLED=false): las respuestas se envían en el acto');
    return;
  }
  outbox.start();
  log.info('[ReplyOutbox] despachador iniciado');
};

export const stopReplyOutbox = async (): Promise<void> => {
  if (instance) await instance.stop();
};

/** Solo para tests. */
export const setReplyOutboxForTests = (outbox: ReplyOutbox | null | undefined): void => {
  override = outbox;
  instance = null;
};
