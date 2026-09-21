/**
 * Guardas de gasto del Comment Brain: se evalúan ANTES de llamar al LLM.
 *
 *  - duplicado:      el mismo comentario llega por webhook Y por polling, o Meta reintenta el
 *                    webhook, o un reinicio re-consulta la última hora. Se persiste para que
 *                    reiniciar no vuelva a pagar lo ya procesado.
 *  - eco-propio:     el texto es (casi) idéntico a una respuesta que YA enviamos: es nuestro
 *                    propio comentario volviendo por el webhook. Procesarlo es gasto puro y
 *                    abre la puerta a un bucle de respuestas.
 *  - tope-por-autor: una persona insistente no debería consumir el presupuesto.
 *  - tope-por-hora:  un post viral (miles de comentarios) no debe quemar el presupuesto del día.
 */

import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { log } from '../../agent/logger.js';
import { env } from '../../config/index.js';
import { similarity } from './validators.js';

export type SkipReason = 'duplicado' | 'eco-propio' | 'tope-por-autor' | 'tope-por-hora';

export interface CostGuardConfig {
  /** 0 = sin tope. */
  maxPerAuthorPerHour: number;
  /** 0 = sin tope. */
  maxPerHour: number;
}

const HOUR_MS = 60 * 60 * 1000;
const MAX_SEEN = 2000;
const COMPACT_AFTER_LINES = 4000;
const ECHO_SIMILARITY = 0.9;
const DEFAULT_SEEN_PATH = resolve('data/runtime/comment-brain-seen.txt');

const positiveOr = (value: number, fallback: number): number =>
  Number.isFinite(value) && value >= 0 ? Math.floor(value) : fallback;

export const resolveCostGuardConfig = (): CostGuardConfig => ({
  maxPerAuthorPerHour: positiveOr(env.bot.commentBrain.maxPerAuthorPerHour, 5),
  maxPerHour: positiveOr(env.bot.commentBrain.maxPerHour, 120),
});

let seenPath: string | null = DEFAULT_SEEN_PATH;
let seenHydrated = false;
const seen = new Set<string>();
const processedAt: Array<{ t: number; handle: string }> = [];
const skipped: Record<SkipReason, number> = { duplicado: 0, 'eco-propio': 0, 'tope-por-autor': 0, 'tope-por-hora': 0 };
let statsSince = Date.now();

/** Cambia (o desactiva con null) el archivo de ids vistos. Los tests lo usan para no escribir en data/. */
export const configureCostGuards = (opts: { seenPath: string | null }): void => {
  seenPath = opts.seenPath;
  resetCostGuards();
};

/** Vacía memoria y contadores. No borra el archivo. */
export const resetCostGuards = (): void => {
  seen.clear();
  processedAt.length = 0;
  for (const k of Object.keys(skipped) as SkipReason[]) skipped[k] = 0;
  seenHydrated = false;
  statsSince = Date.now();
};

const hydrateSeen = (): void => {
  if (seenHydrated) return;
  seenHydrated = true;
  if (!seenPath || !existsSync(seenPath)) return;
  try {
    const lines = readFileSync(seenPath, 'utf-8').split('\n').filter(Boolean);
    for (const id of lines.slice(-MAX_SEEN)) seen.add(id);
    if (lines.length > COMPACT_AFTER_LINES) writeFileSync(seenPath, `${[...seen].join('\n')}\n`, 'utf-8');
  } catch (err) {
    log.warn(`[CommentBrain] no pude leer los ids vistos: ${err instanceof Error ? err.message : String(err)}`);
  }
};

const rememberSeen = (id: string): void => {
  seen.add(id);
  if (seen.size > MAX_SEEN) {
    const oldest = seen.values().next().value;
    if (oldest !== undefined) seen.delete(oldest);
  }
  if (!seenPath) return;
  try {
    mkdirSync(dirname(seenPath), { recursive: true });
    appendFileSync(seenPath, `${id}\n`, 'utf-8');
  } catch {
    // No poder persistir no debe frenar las respuestas: solo se pierde la protección tras un reinicio.
  }
};

export interface GuardInput {
  commentId?: string;
  handle: string;
  text: string;
  /** Respuestas que esta cuenta ya envió (para detectar el eco de las propias). */
  recentReplies: string[];
}

/**
 * ¿Hay que saltarse este comentario sin gastar nada? Si devuelve null, se registra como
 * procesado (cuenta para los topes) y la ejecución sigue.
 */
export const checkCostGuards = (
  input: GuardInput,
  cfg: CostGuardConfig,
  now: number = Date.now(),
): SkipReason | null => {
  hydrateSeen();

  const skip = (reason: SkipReason): SkipReason => {
    skipped[reason] += 1;
    return reason;
  };

  if (input.commentId && seen.has(input.commentId)) return skip('duplicado');

  if (input.text.trim().length >= 12 && input.recentReplies.some((r) => similarity(input.text, r) >= ECHO_SIMILARITY)) {
    if (input.commentId) rememberSeen(input.commentId);
    return skip('eco-propio');
  }

  // Ventana deslizante de 1 hora.
  while (processedAt.length > 0 && now - (processedAt[0]?.t ?? now) > HOUR_MS) processedAt.shift();

  const author = input.handle.toLowerCase();
  if (cfg.maxPerAuthorPerHour > 0 && processedAt.filter((p) => p.handle === author).length >= cfg.maxPerAuthorPerHour) {
    return skip('tope-por-autor');
  }
  if (cfg.maxPerHour > 0 && processedAt.length >= cfg.maxPerHour) return skip('tope-por-hora');

  processedAt.push({ t: now, handle: author });
  if (input.commentId) rememberSeen(input.commentId);
  return null;
};

export interface CostGuardStats {
  since: string;
  processedLastHour: number;
  skipped: Record<SkipReason, number>;
  limits: CostGuardConfig;
}

export const getCostGuardStats = (now: number = Date.now()): CostGuardStats => ({
  since: new Date(statsSince).toISOString(),
  processedLastHour: processedAt.filter((p) => now - p.t <= HOUR_MS).length,
  skipped: { ...skipped },
  limits: resolveCostGuardConfig(),
});
