/**
 * Acciones humanas sobre la cola de revisión: aprobar (con o sin edición), rechazar
 * y "ya lo resolví yo". Lógica de dominio pura: la API solo traduce el resultado a HTTP.
 *
 * Aprobar ENVÍA el comentario, así que:
 *  - El texto final (aunque lo haya escrito una persona) pasa por los mismos validadores que los del
 *    bot. Si bloquean, no se envía salvo `force` explícito: la persona manda, pero un error tonto
 *    (un link, un precio inventado, una respuesta calcada) no debería salir por accidente.
 *  - El envío va por `replyToComment`, con compliance, GlassBox y modo emergencia como cualquier otro.
 *  - Un doble clic no manda dos comentarios: hay un cerrojo por item mientras el envío está en vuelo.
 *  - Si el envío falla, el item SIGUE en la cola y no se registra ninguna decisión.
 */

import { log } from '../../agent/logger.js';
import { getActiveBrand } from '../../config/brandRegistry.js';
import { env } from '../../config/index.js';
import type { BrandProfile } from '../../config/types.js';
import { replyToComment } from '../../integrations/meta.js';
import { recordDecision, type DecisionRecord, type ReviewOutcome } from './reviewDecisions.js';
import { getRecentReplies, getReviewItem, rememberReply, resolveReview, type ReviewItem } from './reviewQueue.js';
import type { ValidationIssue } from './types.js';
import { hasBlockingIssue, validateReply } from './validators.js';

export type ActionFailure =
  | 'not-found'
  | 'not-reviewable'
  | 'no-comment-id'
  | 'empty-text'
  | 'validation'
  | 'brand-unavailable'
  | 'send-failed'
  | 'busy';

export type ActionResult =
  | { ok: true; outcome: ReviewOutcome; sent: boolean; dryRun: boolean; finalText?: string }
  | { ok: false; code: ActionFailure; error?: string; issues?: ValidationIssue[] };

export type Sender = (commentId: string, text: string) => Promise<{ ok: boolean; error?: string }>;

export interface ActionDeps {
  send?: Sender;
  getBrand?: () => BrandProfile;
  /** Sin definir, sale de la configuración (DRY_RUN). */
  dryRun?: boolean;
}

/** Una persona puede escribir más largo que el bot (el bot apunta a ~160), pero no un ensayo. */
const HUMAN_MAX_CHARS = 500;

const inFlight = new Set<string>();

const baseRecord = (
  item: ReviewItem,
): Pick<
  DecisionRecord,
  'itemId' | 'accountKey' | 'handle' | 'commentText' | 'kind' | 'sarcasm' | 'mode' | 'wouldHaveReplied' | 'draft'
> => ({
  itemId: item.id,
  accountKey: item.accountKey,
  handle: item.handle,
  commentText: item.commentText,
  kind: item.classification.kind,
  sarcasm: item.classification.sarcasm.present ? item.classification.sarcasm.stance : null,
  mode: item.mode,
  wouldHaveReplied: item.wouldHaveReplied,
  draft: item.draft,
});

export interface ApproveOptions {
  /** Texto editado. Sin definir se envía el borrador tal cual. */
  text?: string;
  /** Enviar aunque los validadores bloqueen (decisión explícita de la persona). */
  force?: boolean;
}

export const approveReview = async (
  id: string,
  opts: ApproveOptions = {},
  deps: ActionDeps = {},
): Promise<ActionResult> => {
  const item = getReviewItem(id);
  if (!item) return { ok: false, code: 'not-found' };
  if (item.action !== 'draft-for-review')
    return { ok: false, code: 'not-reviewable', error: 'solo los borradores se aprueban' };
  if (!item.commentId) return { ok: false, code: 'no-comment-id', error: 'el comentario no tiene id de la red' };

  const finalText = (opts.text ?? item.draft ?? '').trim();
  if (!finalText) return { ok: false, code: 'empty-text' };

  if (inFlight.has(id)) return { ok: false, code: 'busy', error: 'ya se está enviando' };

  let brand: BrandProfile;
  try {
    brand = (deps.getBrand ?? getActiveBrand)();
  } catch (err) {
    return { ok: false, code: 'brand-unavailable', error: err instanceof Error ? err.message : String(err) };
  }

  const issues = validateReply(finalText, {
    brand,
    commenterHandle: item.handle,
    recentReplies: getRecentReplies(item.accountKey),
    facts: [],
    maxChars: HUMAN_MAX_CHARS,
  });
  const blocked = hasBlockingIssue(issues);
  if (blocked && !opts.force) return { ok: false, code: 'validation', issues };

  inFlight.add(id);
  try {
    const dryRun = deps.dryRun ?? env.dryRun;
    const res = await (deps.send ?? replyToComment)(item.commentId, finalText);
    if (!res.ok) {
      log.warn(`[CommentReview] envío falló para ${id}: ${res.error ?? 'sin detalle'}`);
      return { ok: false, code: 'send-failed', error: res.error };
    }

    const outcome: ReviewOutcome = finalText === (item.draft ?? '').trim() ? 'approved-as-is' : 'approved-edited';
    const forcedNote = blocked
      ? `forzado pese a: ${issues
          .filter((i) => i.severity === 'block')
          .map((i) => i.code)
          .join(', ')}`
      : undefined;

    // Recién con el envío confirmado: recordar (anti-repetición y anti-eco), registrar la decisión y sacar de la cola.
    rememberReply(item.accountKey, finalText);
    recordDecision({
      ...baseRecord(item),
      outcome,
      finalText,
      sent: !dryRun,
      ...(forcedNote ? { reason: forcedNote } : {}),
    });
    resolveReview(id);
    return { ok: true, outcome, sent: !dryRun, dryRun, finalText };
  } finally {
    inFlight.delete(id);
  }
};

export const rejectReview = (id: string, reason?: string): ActionResult => {
  const item = getReviewItem(id);
  if (!item) return { ok: false, code: 'not-found' };
  if (item.action !== 'draft-for-review') {
    return { ok: false, code: 'not-reviewable', error: 'solo los borradores se rechazan; usá "ya lo resolví"' };
  }
  if (inFlight.has(id)) return { ok: false, code: 'busy', error: 'ya se está enviando' };

  recordDecision({ ...baseRecord(item), outcome: 'rejected', ...(reason ? { reason } : {}) });
  resolveReview(id);
  return { ok: true, outcome: 'rejected', sent: false, dryRun: env.dryRun };
};

/** Escalamientos, ignorados de auditoría o algo que la persona atendió por otro lado. No cuenta para la métrica de aprobación. */
export const markHandled = (id: string): ActionResult => {
  const item = getReviewItem(id);
  if (!item) return { ok: false, code: 'not-found' };
  if (inFlight.has(id)) return { ok: false, code: 'busy', error: 'ya se está enviando' };

  recordDecision({ ...baseRecord(item), outcome: 'handled-elsewhere' });
  resolveReview(id);
  return { ok: true, outcome: 'handled-elsewhere', sent: false, dryRun: env.dryRun };
};
