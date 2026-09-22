/**
 * Núcleo del panel de control de bots: lógica pura, sin Express ni http.
 *
 * Los bots viven en el daemon (`src/server/index.ts`: scheduler + webhook de Meta),
 * pero el servidor Express de producción también expone estas rutas. Ambos usan
 * este núcleo para no duplicar reglas ni el chequeo de acceso.
 *
 *   GET  /api/bots                    — estado de todos los bots + botón maestro
 *   POST /api/bots/master             — { enabled } apaga/enciende todos (en bloque)
 *   POST /api/bots/:id/state          — { enabled } prende/apaga un bot
 *   GET  /api/comment-brain/status    — modo + cola + topes de gasto + métrica de graduación a `balanced`
 *   GET  /api/comment-brain/review    — items pendientes de revisión
 *   GET  /api/comment-brain/decisions — decisiones humanas recientes (aprobadas / editadas / rechazadas)
 *   POST /api/comment-brain/review/:id/approve  — { text?, force? } ENVÍA el borrador (opcionalmente editado)
 *   POST /api/comment-brain/review/:id/reject   — { reason? } descarta un borrador
 *   POST /api/comment-brain/review/:id/resolve  — "ya lo resolví yo" (escalados, ignorados)
 *   GET  /api/comment-brain/outbox              — cola de envío de respuestas (?view=pending|failed|history|all)
 *   POST /api/comment-brain/outbox/:id/retry    — reintenta una respuesta fallida o vencida
 *   POST /api/comment-brain/outbox/:id/cancel   — descarta una respuesta en cola o fallida
 */

import { createHash, timingSafeEqual } from 'node:crypto';
import type { IncomingHttpHeaders } from 'node:http';
import { z } from 'zod';
import { log } from '../agent/logger.js';
import { env } from '../config/index.js';
import { getBotControlSnapshot, isBotId, setAllBots, setBotEnabled } from '../capabilities/botControl/index.js';
import {
  approveReview,
  evaluateGraduation,
  getCostGuardStats,
  isCommentBrainEnabled,
  listDecisions,
  listReviewQueue,
  markHandled,
  rejectReview,
  resolveBrainConfig,
  summarizeDecisions,
  summarizeQueue,
  type ActionResult,
} from '../capabilities/commentBrain/index.js';
import { getReplyOutbox, type OutboxActionResult, type OutboxStatus } from '../capabilities/replyOutbox/index.js';

export interface CoreResponse {
  status: number;
  body: unknown;
}

// ── Acceso ────────────────────────────────────────────────────────────────────

const parseKeys = (raw: string | undefined): string[] =>
  (raw ?? '')
    .split(',')
    .map((k) => k.trim())
    .filter((k) => k.length > 0);

const extractKey = (headers: IncomingHttpHeaders): string | null => {
  for (const name of ['x-admin-key', 'x-api-key'] as const) {
    const v = headers[name];
    if (typeof v === 'string' && v.length > 0) return v;
  }
  const auth = headers['authorization'];
  if (typeof auth === 'string' && auth.startsWith('Bearer ')) return auth.slice(7);
  return null;
};

/** Compara hashes (largo fijo): no filtra el largo de la clave ni el punto donde difiere. */
const safeMatch = (candidate: string, keys: string[]): boolean => {
  const digest = (s: string): Buffer => createHash('sha256').update(s).digest();
  const c = digest(candidate);
  let ok = false;
  for (const k of keys) if (timingSafeEqual(c, digest(k))) ok = true;
  return ok;
};

/**
 * Estas rutas exponen comentarios de terceros y permiten apagar/encender el gasto.
 *  - Con FEEDIA_ADMIN_KEY: hay que presentarla (X-Admin-Key, X-API-Key o Bearer).
 *  - Sin la clave: en producción FALLA CERRADO (503); en desarrollo pasa, igual que el resto del panel local.
 * Devuelve null si tiene acceso, o la respuesta de rechazo.
 */
export const checkAdminAccess = (
  headers: IncomingHttpHeaders,
  processEnv: NodeJS.ProcessEnv = process.env,
): CoreResponse | null => {
  const keys = parseKeys(processEnv['FEEDIA_ADMIN_KEY']);
  if (keys.length === 0) {
    return processEnv['NODE_ENV'] === 'production'
      ? { status: 503, body: { error: 'admin-key-not-configured' } }
      : null;
  }
  const presented = extractKey(headers);
  if (!presented || !safeMatch(presented, keys)) return { status: 403, body: { error: 'forbidden' } };
  return null;
};

// ── Bots ──────────────────────────────────────────────────────────────────────

const EnabledBodySchema = z.object({ enabled: z.boolean() });

const loadJobNames = async (): Promise<string[] | undefined> => {
  try {
    const { jobs } = await import('../scheduler/jobs.js');
    return jobs.map((j) => j.name);
  } catch (err) {
    log.warn(`[bots] no pude leer la lista de jobs: ${err instanceof Error ? err.message : String(err)}`);
    return undefined;
  }
};

export const listBots = async (): Promise<CoreResponse> => {
  try {
    return { status: 200, body: { ok: true, ...getBotControlSnapshot(await loadJobNames()) } };
  } catch (err) {
    log.error(`[bots] list: ${err instanceof Error ? err.message : String(err)}`);
    return { status: 500, body: { error: 'bots-list' } };
  }
};

export const setMaster = async (body: unknown): Promise<CoreResponse> => {
  const parsed = EnabledBodySchema.safeParse(body);
  if (!parsed.success) return { status: 400, body: { ok: false, error: parsed.error.issues } };
  try {
    setAllBots(parsed.data.enabled);
    return listBots();
  } catch (err) {
    log.error(`[bots] master: ${err instanceof Error ? err.message : String(err)}`);
    return { status: 500, body: { error: 'bots-master' } };
  }
};

export const setBot = async (id: string, body: unknown): Promise<CoreResponse> => {
  if (!isBotId(id)) return { status: 404, body: { ok: false, error: 'unknown-bot' } };
  const parsed = EnabledBodySchema.safeParse(body);
  if (!parsed.success) return { status: 400, body: { ok: false, error: parsed.error.issues } };
  try {
    setBotEnabled(id, parsed.data.enabled);
    return listBots();
  } catch (err) {
    log.error(`[bots] set ${id}: ${err instanceof Error ? err.message : String(err)}`);
    return { status: 500, body: { error: 'bots-set' } };
  }
};

// ── Comment Brain ─────────────────────────────────────────────────────────────

const ReviewQuerySchema = z.object({
  action: z.enum(['draft-for-review', 'escalate', 'ignore']).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

/** Estado de la cola de envío para el panel: lo justo para saber si algo espera, falla o está en pausa. */
const outboxOverview = (): unknown => {
  const outbox = getReplyOutbox();
  return outbox ? { enabled: true, ...outbox.report() } : { enabled: false };
};

export const brainStatus = (): CoreResponse => {
  try {
    const config = resolveBrainConfig();
    return {
      status: 200,
      body: {
        ok: true,
        enabled: isCommentBrainEnabled(),
        // Con DRY_RUN activo, aprobar un borrador registra la decisión pero NO publica: la UI tiene que decirlo.
        dryRun: env.dryRun,
        autonomy: config.autonomy,
        minConfidence: config.minConfidence,
        // En `suggest` nada se envía solo: `wouldHaveReplied` mide cuánto se habría automatizado.
        queue: summarizeQueue(),
        // Evidencia para pasar a `balanced`: de lo que se habría enviado sin supervisión, cuánto aprobó una persona tal cual.
        graduation: evaluateGraduation(),
        decisions: summarizeDecisions(),
        costGuards: getCostGuardStats(),
        outbox: outboxOverview(),
      },
    };
  } catch (err) {
    log.error(`[comment-brain] status: ${err instanceof Error ? err.message : String(err)}`);
    return { status: 500, body: { error: 'comment-brain-status' } };
  }
};

export const brainReview = (query: Record<string, unknown>): CoreResponse => {
  const parsed = ReviewQuerySchema.safeParse(query);
  if (!parsed.success) return { status: 400, body: { ok: false, error: parsed.error.issues } };
  try {
    const items = listReviewQueue({ action: parsed.data.action, limit: parsed.data.limit });
    return { status: 200, body: { ok: true, count: items.length, items } };
  } catch (err) {
    log.error(`[comment-brain] review: ${err instanceof Error ? err.message : String(err)}`);
    return { status: 500, body: { error: 'comment-brain-review' } };
  }
};

/** Traduce el resultado de dominio a HTTP. Los detalles internos (rutas, stack) nunca salen al cliente. */
const actionResponse = (r: ActionResult): CoreResponse => {
  if (r.ok) {
    return {
      status: 200,
      body: {
        ok: true,
        outcome: r.outcome,
        sent: r.sent,
        dryRun: r.dryRun,
        ...(r.finalText ? { finalText: r.finalText } : {}),
        // Con cola de envío, aprobar no implica que ya salió: la UI tiene que poder decirlo.
        ...(r.delivery ? { delivery: r.delivery } : {}),
        ...(r.outboxId ? { outboxId: r.outboxId } : {}),
        ...(r.etaSec !== undefined ? { etaSec: r.etaSec } : {}),
        ...(r.deliveryNote ? { deliveryNote: r.deliveryNote } : {}),
      },
    };
  }
  switch (r.code) {
    case 'not-found':
      return { status: 404, body: { ok: false, error: 'not-found' } };
    case 'not-reviewable':
    case 'no-comment-id':
    case 'busy':
      return { status: 409, body: { ok: false, error: r.code, detail: r.error } };
    case 'empty-text':
      return { status: 400, body: { ok: false, error: 'empty-text' } };
    case 'validation':
      return { status: 422, body: { ok: false, error: 'validation', issues: r.issues ?? [] } };
    case 'brand-unavailable':
      return { status: 503, body: { ok: false, error: 'brand-unavailable' } };
    case 'queue-full':
    case 'outbox-unavailable':
      return { status: 503, body: { ok: false, error: r.code, detail: r.error } };
    case 'send-failed':
      return { status: 502, body: { ok: false, error: 'send-failed', detail: r.error } };
  }
};

const ApproveBodySchema = z.object({
  text: z.string().min(1).max(2200).optional(),
  force: z.boolean().optional(),
});
const RejectBodySchema = z.object({ reason: z.string().max(300).optional() });
const DecisionsQuerySchema = z.object({ limit: z.coerce.number().int().min(1).max(200).default(50) });

/** Aprueba (y ENVÍA) un borrador, opcionalmente editado. `force` envía aunque los validadores bloqueen. */
export const brainApprove = async (id: string, body: unknown): Promise<CoreResponse> => {
  const parsed = ApproveBodySchema.safeParse(body ?? {});
  if (!parsed.success) return { status: 400, body: { ok: false, error: parsed.error.issues } };
  try {
    return actionResponse(await approveReview(id, parsed.data));
  } catch (err) {
    log.error(`[comment-brain] approve: ${err instanceof Error ? err.message : String(err)}`);
    return { status: 500, body: { error: 'comment-brain-approve' } };
  }
};

export const brainReject = (id: string, body: unknown): CoreResponse => {
  const parsed = RejectBodySchema.safeParse(body ?? {});
  if (!parsed.success) return { status: 400, body: { ok: false, error: parsed.error.issues } };
  try {
    return actionResponse(rejectReview(id, parsed.data.reason));
  } catch (err) {
    log.error(`[comment-brain] reject: ${err instanceof Error ? err.message : String(err)}`);
    return { status: 500, body: { error: 'comment-brain-reject' } };
  }
};

export const brainDecisions = (query: Record<string, unknown>): CoreResponse => {
  const parsed = DecisionsQuerySchema.safeParse(query);
  if (!parsed.success) return { status: 400, body: { ok: false, error: parsed.error.issues } };
  try {
    const items = listDecisions(parsed.data.limit);
    return { status: 200, body: { ok: true, count: items.length, items } };
  } catch (err) {
    log.error(`[comment-brain] decisions: ${err instanceof Error ? err.message : String(err)}`);
    return { status: 500, body: { error: 'comment-brain-decisions' } };
  }
};

/** "Ya lo resolví yo": saca el item de la cola y lo registra, sin contar para la métrica de aprobación. */
export const brainResolve = (id: string): CoreResponse => {
  try {
    const r = markHandled(id);
    return r.ok ? { status: 200, body: { ok: true, resolved: id } } : actionResponse(r);
  } catch (err) {
    log.error(`[comment-brain] resolve: ${err instanceof Error ? err.message : String(err)}`);
    return { status: 500, body: { error: 'comment-brain-resolve' } };
  }
};

// ── Cola de envío ─────────────────────────────────────────────────────────────

const VIEW_STATUSES: Record<'pending' | 'failed' | 'history', readonly OutboxStatus[]> = {
  pending: ['queued', 'sending'],
  failed: ['failed'],
  history: ['sent', 'cancelled', 'expired'],
};

const OutboxQuerySchema = z.object({
  view: z.enum(['pending', 'failed', 'history', 'all']).default('pending'),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

export const outboxList = (query: Record<string, unknown>): CoreResponse => {
  const parsed = OutboxQuerySchema.safeParse(query);
  if (!parsed.success) return { status: 400, body: { ok: false, error: parsed.error.issues } };
  try {
    const outbox = getReplyOutbox();
    if (!outbox) return { status: 200, body: { ok: true, enabled: false, count: 0, items: [] } };
    const { view, limit } = parsed.data;
    const items = outbox.list({ ...(view === 'all' ? {} : { statuses: VIEW_STATUSES[view] }), limit });
    return { status: 200, body: { ok: true, enabled: true, count: items.length, items, ...outbox.report() } };
  } catch (err) {
    log.error(`[reply-outbox] list: ${err instanceof Error ? err.message : String(err)}`);
    return { status: 500, body: { error: 'reply-outbox-list' } };
  }
};

const outboxActionResponse = (r: OutboxActionResult): CoreResponse =>
  r.ok
    ? { status: 200, body: { ok: true, item: r.entry } }
    : { status: r.code === 'not-found' ? 404 : 409, body: { ok: false, error: r.code } };

export const outboxRetry = async (id: string): Promise<CoreResponse> => {
  const outbox = getReplyOutbox();
  if (!outbox) return { status: 409, body: { ok: false, error: 'outbox-disabled' } };
  try {
    return outboxActionResponse(await outbox.retry(id));
  } catch (err) {
    log.error(`[reply-outbox] retry: ${err instanceof Error ? err.message : String(err)}`);
    return { status: 500, body: { error: 'reply-outbox-retry' } };
  }
};

export const outboxCancel = (id: string): CoreResponse => {
  const outbox = getReplyOutbox();
  if (!outbox) return { status: 409, body: { ok: false, error: 'outbox-disabled' } };
  try {
    return outboxActionResponse(outbox.cancel(id));
  } catch (err) {
    log.error(`[reply-outbox] cancel: ${err instanceof Error ? err.message : String(err)}`);
    return { status: 500, body: { error: 'reply-outbox-cancel' } };
  }
};
