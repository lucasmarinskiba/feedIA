/**
 * Acciones humanas sobre la cola de revisión: aprobar (con o sin edición), rechazar
 * y "ya lo resolví yo". Lógica de dominio pura: la API solo traduce el resultado a HTTP.
 *
 * Aprobar ENVÍA el comentario, así que:
 *  - El texto final (aunque lo haya escrito una persona) pasa por los mismos validadores que los del
 *    bot. Si bloquean, no se envía salvo `force` explícito: la persona manda, pero un error tonto
 *    (un link, un precio inventado, una respuesta calcada) no debería salir por accidente.
 *  - Aprobar ENCOLA la respuesta en el outbox (`capabilities/replyOutbox`), que la despacha respetando el ritmo
 *    que tolera Instagram, con compliance, GlassBox y modo emergencia como cualquier otro envío. Si la cola está
 *    libre sale en el acto; si no, queda en cola y la API lo dice (`delivery: 'queued'`). La decisión de la
 *    persona ya está tomada: el item sale de la cola de revisión y lo que falle después se ve en "Envíos".
 *  - Un doble clic no manda dos comentarios: cerrojo por item y, además, un comentario admite UNA respuesta en el outbox.
 *  - Con el outbox desactivado (REPLY_OUTBOX_ENABLED=false) o pasando `deps.send`, se envía en el acto como antes:
 *    si falla, el item SIGUE en la cola y no se registra ninguna decisión.
 */

import { log } from '../../agent/logger.js';
import { getActiveBrand } from '../../config/brandRegistry.js';
import { env } from '../../config/index.js';
import type { BrandProfile } from '../../config/types.js';
import { replyToComment } from '../../integrations/meta.js';
import { getReplyOutbox, type ReplyOutbox } from '../replyOutbox/index.js';
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
  | 'queue-full'
  | 'outbox-unavailable'
  | 'busy';

/**
 * Qué pasó con el envío al aprobar:
 *  - `sent`: salió en el acto (o quedó simulado con DRY_RUN).
 *  - `queued`: quedó en la cola de envío; sale respetando el ritmo (`etaSec` aproximado).
 *  - `failed`: el primer intento fue rechazado y no se reintenta solo; queda en "Envíos" para decidir.
 */
export type Delivery = 'sent' | 'queued' | 'failed';

export type ActionResult =
  | {
      ok: true;
      outcome: ReviewOutcome;
      /** Salió de verdad por la red (false con DRY_RUN activo o si todavía está en cola). */
      sent: boolean;
      dryRun: boolean;
      finalText?: string;
      delivery?: Delivery;
      outboxId?: string;
      etaSec?: number;
      /** Último error del envío, si lo hubo (informativo). */
      deliveryNote?: string;
    }
  | { ok: false; code: ActionFailure; error?: string; issues?: ValidationIssue[] };

export type Sender = (commentId: string, text: string) => Promise<{ ok: boolean; error?: string }>;

export interface ActionDeps {
  /** Envío directo, sin cola (tests, scripts). Si se pasa, `outbox` no se usa salvo que se indique explícitamente. */
  send?: Sender;
  /** Outbox a usar. `null` fuerza envío directo. Sin definir: el del proceso, si está activo. */
  outbox?: ReplyOutbox | null;
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
    const outbox = deps.outbox !== undefined ? deps.outbox : deps.send ? null : getReplyOutbox();
    const forcedNote = blocked
      ? `forzado pese a: ${issues
          .filter((i) => i.severity === 'block')
          .map((i) => i.code)
          .join(', ')}`
      : undefined;

    return outbox
      ? await approveViaOutbox(item, item.commentId, finalText, outbox, dryRun, forcedNote)
      : await approveInline(item, item.commentId, finalText, deps.send ?? replyToComment, dryRun, forcedNote);
  } finally {
    inFlight.delete(id);
  }
};

const outcomeFor = (item: ReviewItem, finalText: string): ReviewOutcome =>
  finalText === (item.draft ?? '').trim() ? 'approved-as-is' : 'approved-edited';

/** Envío directo (sin cola): si falla, el item sigue en la cola de revisión. */
const approveInline = async (
  item: ReviewItem,
  commentId: string,
  finalText: string,
  send: Sender,
  dryRun: boolean,
  forcedNote: string | undefined,
): Promise<ActionResult> => {
  const res = await send(commentId, finalText);
  if (!res.ok) {
    log.warn(`[CommentReview] envío falló para ${item.id}: ${res.error ?? 'sin detalle'}`);
    return { ok: false, code: 'send-failed', error: res.error };
  }

  const outcome = outcomeFor(item, finalText);
  // Recién con el envío confirmado: recordar (anti-repetición y anti-eco), registrar la decisión y sacar de la cola.
  rememberReply(item.accountKey, finalText);
  recordDecision({
    ...baseRecord(item),
    outcome,
    finalText,
    sent: !dryRun,
    ...(forcedNote ? { reason: forcedNote } : {}),
  });
  resolveReview(item.id);
  return { ok: true, outcome, sent: !dryRun, dryRun, finalText, delivery: 'sent' };
};

/** Encola y deja que el despachador decida cuándo sale. La decisión humana queda registrada desde ya. */
const approveViaOutbox = async (
  item: ReviewItem,
  commentId: string,
  finalText: string,
  outbox: ReplyOutbox,
  dryRun: boolean,
  forcedNote: string | undefined,
): Promise<ActionResult> => {
  const enq = outbox.enqueue({
    commentId,
    text: finalText,
    origin: 'human',
    accountKey: item.accountKey,
    handle: item.handle,
    reviewId: item.id,
  });
  if (!enq.ok) {
    log.warn(`[CommentReview] no pude encolar ${item.id}: ${enq.reason} ${enq.detail ?? ''}`);
    return { ok: false, code: enq.reason === 'full' ? 'queue-full' : 'outbox-unavailable', error: enq.detail };
  }

  const entry = enq.entry;
  // Reintento de una aprobación anterior que se cortó antes de cerrar el item: es la MISMA aprobación.
  const sameApproval = enq.duplicate && entry.origin === 'human' && entry.reviewId === item.id;
  // Otra respuesta ya cubre este comentario (p. ej. la mandó el bot): no se manda una segunda.
  const coveredElsewhere = enq.duplicate && !sameApproval;
  const text = sameApproval ? entry.text : finalText;

  if (!coveredElsewhere) await outbox.kick();
  const now = outbox.view(entry.id);
  const delivered = now?.status === 'sent';
  const sent = delivered && !dryRun;
  const delivery: Delivery = delivered ? 'sent' : now?.status === 'failed' ? 'failed' : 'queued';
  const outcome: ReviewOutcome = coveredElsewhere ? 'handled-elsewhere' : outcomeFor(item, text);

  if (!coveredElsewhere) rememberReply(item.accountKey, text);
  recordDecision({
    ...baseRecord(item),
    outcome,
    ...(coveredElsewhere
      ? { reason: `ya había una respuesta en la cola de envío (${entry.id})` }
      : { finalText: text, sent, ...(forcedNote ? { reason: forcedNote } : {}) }),
    outboxId: entry.id,
  });
  resolveReview(item.id);

  return {
    ok: true,
    outcome,
    sent,
    dryRun,
    finalText: text,
    delivery,
    outboxId: entry.id,
    ...(delivery === 'queued' && now?.etaSec !== undefined ? { etaSec: now.etaSec } : {}),
    ...(now?.lastError ? { deliveryNote: now.lastError } : {}),
  };
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
