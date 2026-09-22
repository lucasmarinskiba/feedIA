/**
 * Comment Brain — el "criterio de CM" para comentarios públicos.
 *
 *   clasificar (tipo + sarcasmo + riesgo)
 *     → política (responder / borrador / escalar / ignorar)
 *       → redactar (3 candidatas, modo según situación)
 *         → validar (reglas duras) → enviar o mandar a revisión
 *
 * El módulo NO envía nada: devuelve una decisión. Quien lo llama (orquestador
 * de respuestas) hace el envío por los canales con compliance y GlassBox.
 *
 * `decideReply` es la decisión pura (sin cola, sin memoria, sin eventos): sirve
 * para evaluar offline. `handleComment` = `decideReply` + efectos.
 */

import { log } from '../../agent/logger.js';
import { env } from '../../config/index.js';
import { classifyComment } from './classifier.js';
import { checkCostGuards, resolveCostGuardConfig, type CostGuardConfig, type SkipReason } from './costGuards.js';
import { isSensitiveTopic, neutralClassification } from './heuristics.js';
import type { CommentLlm } from './llm.js';
import { writeReply } from './replyWriter.js';
import { enqueueReview, getRecentReplies, rememberReply } from './reviewQueue.js';
import { decidePlan } from './strategy.js';
import type {
  Autonomy,
  BrainConfig,
  BrainResult,
  CommentInput,
  ReplyMode,
  ValidationIssue,
  WrittenReply,
} from './types.js';
import { hasBlockingIssue, validateReply, type ValidateOptions } from './validators.js';

export * from './types.js';
export { classifyComment } from './classifier.js';
export { decidePlan } from './strategy.js';
export { validateReply, hasBlockingIssue, similarity } from './validators.js';
export { getPostContext, getThreadContext } from './postContext.js';
export { listReviewQueue, resolveReview, summarizeQueue, configureReviewStore } from './reviewQueue.js';
export { getCostGuardStats, configureCostGuards, resetCostGuards } from './costGuards.js';
export { approveReview, rejectReview, markHandled, type ActionResult, type ActionFailure } from './reviewActions.js';
export {
  configureDecisionStore,
  evaluateGraduation,
  listDecisions,
  summarizeDecisions,
  GRADUATION_THRESHOLDS,
  type DecisionRecord,
  type ReviewOutcome,
} from './reviewDecisions.js';

/** Umbral de "calidad del chiste" que el propio modelo debe declarar para enviar humor sin revisión. */
const HUMOR_MIN_CONFIDENCE = 0.6;
const HUMOR_MODES: ReadonlySet<ReplyMode> = new Set<ReplyMode>(['witty-comeback', 'playful-banter']);
/** Ruido obvio: no vale la pena auditarlo a mano en modo sombra. */
const NOISE_KINDS: ReadonlySet<string> = new Set(['spam', 'emoji-only']);

/**
 * Fail-safe: cualquier valor que no sea exactamente "balanced" o "full" cae a
 * `suggest` (modo sombra). Un typo en la variable nunca puede SUBIR la autonomía.
 */
export const parseAutonomy = (raw: string): Autonomy => (raw === 'balanced' || raw === 'full' ? raw : 'suggest');

export const resolveBrainConfig = (): BrainConfig => ({
  autonomy: parseAutonomy(env.bot.commentBrain.autonomy),
  minConfidence: env.bot.escalateThreshold,
});

export const isCommentBrainEnabled = (): boolean => env.bot.commentBrain.enabled;

export interface BrainDeps {
  llm?: CommentLlm;
  config?: BrainConfig;
  /** Topes de gasto. `null` los desactiva (tests / evaluación); sin definir, salen de la configuración. */
  costGuards?: CostGuardConfig | null;
  promiseVerdict?: ValidateOptions['promiseVerdict'];
}

const issueCodes = (issues: ValidationIssue[]): string =>
  issues
    .filter((i) => i.severity === 'block')
    .map((i) => i.code)
    .join(', ');

/** Decisión completa (clasificar → política → redactar → validar), sin efectos secundarios. */
export const decideReply = async (input: CommentInput, deps: BrainDeps = {}): Promise<BrainResult> => {
  const config = deps.config ?? resolveBrainConfig();
  const accountKey = input.brand.id ?? input.brand.name;

  // Modo sombra: se corre la política `balanced` completa (para saber qué HABRÍA hecho) y recién al
  // final se degrada cualquier envío a borrador. Así la cola muestra la decisión real, no una genérica.
  const shadowMode = config.autonomy === 'suggest';
  const planConfig: BrainConfig = shadowMode ? { ...config, autonomy: 'balanced' } : config;

  const classification = await classifyComment(input, { llm: deps.llm });
  const sensitiveTopic = isSensitiveTopic(input.text, input.post?.caption);
  const plan = decidePlan(classification, planConfig, { sensitiveTopic });
  const shadow = shadowMode ? { wouldHaveReplied: false } : undefined;

  if (plan.action === 'ignore') {
    return { action: 'ignore', classification, plan, issues: [], reasons: plan.reasons, shadow };
  }
  if (plan.action === 'escalate' || !plan.mode) {
    return { action: 'escalate', classification, plan, issues: [], reasons: plan.reasons, shadow };
  }

  const mode = plan.mode;
  const reasons = [...plan.reasons];
  let action = plan.action;

  const validateOpts: ValidateOptions = {
    brand: input.brand,
    commenterHandle: input.handle,
    recentReplies: getRecentReplies(accountKey),
    facts: input.facts ?? [],
    promiseVerdict: deps.promiseVerdict,
  };

  let written: WrittenReply | null = null;
  try {
    written = await writeReply(input, classification, mode, {
      llm: deps.llm,
      recentReplies: validateOpts.recentReplies,
    });
  } catch (err) {
    reasons.push(`redacción falló: ${err instanceof Error ? err.message : String(err)}`);
    action = 'draft-for-review';
  }

  let text: string | undefined;
  let issues: ValidationIssue[] = [];

  if (written) {
    // Primero la elegida por el modelo; si no pasa validación, la primera candidata que sí pase.
    text = written.text;
    issues = validateReply(text, validateOpts);
    if (hasBlockingIssue(issues)) {
      for (const candidate of written.candidates) {
        if (candidate === written.text) continue;
        const candidateIssues = validateReply(candidate, validateOpts);
        if (!hasBlockingIssue(candidateIssues)) {
          text = candidate;
          issues = candidateIssues;
          break;
        }
      }
    }

    if (hasBlockingIssue(issues)) {
      reasons.push(`validación: ${issueCodes(issues)}`);
      action = 'draft-for-review';
    }
    if (action === 'reply' && (written.needsHuman || (mode === 'answer' && !written.grounded))) {
      reasons.push(
        `sin respaldo suficiente: ${written.needsHumanReason || 'la respuesta no está en los datos verificados'}`,
      );
      action = 'draft-for-review';
    }
    if (action === 'reply' && HUMOR_MODES.has(mode) && written.humorConfidence < HUMOR_MIN_CONFIDENCE) {
      reasons.push(`humor flojo (${written.humorConfidence.toFixed(2)}): mejor que lo vea una persona`);
      action = 'draft-for-review';
    }
  }

  if (shadowMode && shadow) {
    shadow.wouldHaveReplied = action === 'reply';
    if (action === 'reply') {
      action = 'draft-for-review';
      reasons.push('modo sugerencia: nada se envía solo');
    }
  }

  return {
    action,
    reply: text,
    candidates: written?.candidates,
    classification,
    plan,
    issues,
    reasons,
    shadow,
  };
};

const skippedResult = (reason: SkipReason): BrainResult => {
  const why = `omitido sin gastar LLM: ${reason}`;
  return {
    action: 'ignore',
    classification: neutralClassification(why),
    plan: { action: 'ignore', reasons: [why] },
    issues: [],
    reasons: [why],
  };
};

export const handleComment = async (input: CommentInput, deps: BrainDeps = {}): Promise<BrainResult> => {
  const accountKey = input.brand.id ?? input.brand.name;

  // Antes de gastar nada: duplicados, ecos de nuestras propias respuestas y topes por autor/hora.
  if (deps.costGuards !== null) {
    const skip = checkCostGuards(
      {
        commentId: input.commentId,
        handle: input.handle,
        text: input.text,
        recentReplies: getRecentReplies(accountKey),
      },
      deps.costGuards ?? resolveCostGuardConfig(),
    );
    if (skip) {
      log.info(`[CommentBrain] @${input.handle} omitido (${skip})`);
      return skippedResult(skip);
    }
  }

  const result = await decideReply(input, deps);
  const { classification, plan } = result;

  log.info(
    `[CommentBrain] @${input.handle} → ${classification.kind}${classification.sarcasm.present ? `+sarcasmo(${classification.sarcasm.stance})` : ''} ` +
      `conf=${classification.confidence.toFixed(2)} → ${result.action}${plan.mode ? `/${plan.mode}` : ''}`,
  );

  // En modo sombra también se auditan los "ignorados" que NO son ruido obvio: es donde se ven los falsos negativos.
  const auditableIgnore =
    result.action === 'ignore' && result.shadow !== undefined && !NOISE_KINDS.has(classification.kind);

  if (result.action === 'reply' && result.reply) {
    rememberReply(accountKey, result.reply);
  } else if (result.action === 'escalate' || result.action === 'draft-for-review' || auditableIgnore) {
    enqueueReview({
      accountKey,
      commentId: input.commentId,
      handle: input.handle,
      commentText: input.text,
      action: result.action as 'escalate' | 'draft-for-review' | 'ignore',
      mode: plan.mode,
      draft: result.action === 'draft-for-review' ? result.reply : undefined,
      reasons: result.reasons,
      classification,
      ...(result.shadow ? { wouldHaveReplied: result.shadow.wouldHaveReplied } : {}),
    });
  }
  return result;
};
