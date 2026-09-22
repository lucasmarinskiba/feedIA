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
 *   GET  /api/comment-brain/status    — modo del Comment Brain + cola + topes de gasto
 *   GET  /api/comment-brain/review    — items pendientes de revisión
 *   POST /api/comment-brain/review/:id/resolve
 */

import { createHash, timingSafeEqual } from 'node:crypto';
import type { IncomingHttpHeaders } from 'node:http';
import { z } from 'zod';
import { log } from '../agent/logger.js';
import { getBotControlSnapshot, isBotId, setAllBots, setBotEnabled } from '../capabilities/botControl/index.js';
import {
  getCostGuardStats,
  isCommentBrainEnabled,
  listReviewQueue,
  resolveBrainConfig,
  resolveReview,
  summarizeQueue,
} from '../capabilities/commentBrain/index.js';

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
  env: NodeJS.ProcessEnv = process.env,
): CoreResponse | null => {
  const keys = parseKeys(env['FEEDIA_ADMIN_KEY']);
  if (keys.length === 0) {
    return env['NODE_ENV'] === 'production' ? { status: 503, body: { error: 'admin-key-not-configured' } } : null;
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

export const brainStatus = (): CoreResponse => {
  try {
    const config = resolveBrainConfig();
    return {
      status: 200,
      body: {
        ok: true,
        enabled: isCommentBrainEnabled(),
        autonomy: config.autonomy,
        minConfidence: config.minConfidence,
        // En `suggest` nada se envía solo: `wouldHaveReplied` mide cuánto se habría automatizado.
        queue: summarizeQueue(),
        costGuards: getCostGuardStats(),
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

export const brainResolve = (id: string): CoreResponse => {
  try {
    return resolveReview(id)
      ? { status: 200, body: { ok: true, resolved: id } }
      : { status: 404, body: { ok: false, error: 'not-found' } };
  } catch (err) {
    log.error(`[comment-brain] resolve: ${err instanceof Error ? err.message : String(err)}`);
    return { status: 500, body: { error: 'comment-brain-resolve' } };
  }
};
