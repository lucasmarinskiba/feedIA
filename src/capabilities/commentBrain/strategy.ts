/**
 * Política de respuesta: clasificación → qué hacer.
 *
 * 100% determinista y testeable. Es el "criterio de CM": qué se responde solo,
 * qué se redacta pero espera aprobación, qué se escala y qué se ignora.
 * Las reglas están ordenadas de más a menos restrictivas; la primera que
 * aplica gana.
 */

import type { BrainConfig, Classification, CommentKind, ReplyMode, ReplyPlan } from './types.js';

export interface PlanContext {
  /** El comentario o el post tocan un tema donde cualquier chiste es inapropiado. */
  sensitiveTopic: boolean;
}

/** Hostilidad a partir de la cual un troll/ataque deja de ser "ignorar" y pasa a moderación humana. */
const MODERATION_HOSTILITY = 0.7;
/** En modo balanced el humor exige más seguridad que una respuesta neutral. */
const WIT_MIN_CONFIDENCE = 0.75;
const FULL_AUTONOMY_MIN_CONFIDENCE = 0.6;

const HUMOR_MODES: ReadonlySet<ReplyMode> = new Set<ReplyMode>(['witty-comeback', 'playful-banter']);

const baseMode = (kind: CommentKind): ReplyMode | null => {
  switch (kind) {
    case 'praise':
      return 'thank';
    case 'tag-friend':
      return 'playful-banter';
    case 'banter':
      return 'playful-banter';
    case 'question':
      return 'answer';
    case 'purchase-intent':
      return 'sales-handoff';
    case 'complaint':
      return 'empathize-resolve';
    case 'criticism':
      return 'acknowledge-critique';
    default:
      return null;
  }
};

/**
 * Modo de respuesta según tipo + sarcasmo.
 *  - Sarcasmo "critical": hay un reclamo real debajo → nunca se bromea a costa de quien reclama.
 *  - Sarcasmo "playful" en banter/crítica liviana → contraataque ingenioso.
 */
const selectMode = (c: Classification): ReplyMode | null => {
  const mode = baseMode(c.kind);
  if (!mode) return null;

  if (c.sarcasm.present && c.sarcasm.stance === 'critical') {
    return c.kind === 'complaint' ? 'empathize-resolve' : 'acknowledge-critique';
  }
  if (c.sarcasm.present && c.sarcasm.stance === 'playful' && (c.kind === 'banter' || c.kind === 'criticism')) {
    return 'witty-comeback';
  }
  return mode;
};

export const decidePlan = (c: Classification, cfg: BrainConfig, ctx: PlanContext): ReplyPlan => {
  // 1. Intentos de manipular al bot: no se responde ni se alimenta.
  if (c.promptInjection) {
    return { action: 'ignore', reasons: ['intento de prompt injection en el comentario'] };
  }

  // 2. Escalamiento duro: legal, salud, amenazas, autolesión, riesgo alto, odio.
  if (c.hardFlags.length > 0) {
    return { action: 'escalate', reasons: [`regla dura: ${c.hardFlags.join(', ')}`] };
  }
  if (c.risk === 'high') {
    return { action: 'escalate', reasons: ['riesgo alto'] };
  }
  if (c.kind === 'hate') {
    return { action: 'escalate', reasons: ['odio/acoso: moderación humana'] };
  }

  // 3. Lo que no merece respuesta.
  if (c.kind === 'spam' || c.kind === 'emoji-only') {
    return { action: 'ignore', reasons: [`${c.kind}: sin respuesta`] };
  }
  if (c.kind === 'troll' || (c.sarcasm.present && c.sarcasm.stance === 'hostile')) {
    return c.hostility >= MODERATION_HOSTILITY
      ? { action: 'escalate', reasons: ['provocación hostil: moderación humana'] }
      : { action: 'ignore', reasons: ['provocación de mala fe: no se le da escenario'] };
  }

  const mode = selectMode(c);
  if (!mode) {
    return { action: 'ignore', reasons: [`${c.kind}: sin señal que justifique responder`] };
  }

  // 4. Cuándo se redacta pero NO se envía.
  const reasons: string[] = [];
  const threshold =
    cfg.autonomy === 'full' ? Math.min(cfg.minConfidence, FULL_AUTONOMY_MIN_CONFIDENCE) : cfg.minConfidence;
  const witThreshold = cfg.autonomy === 'full' ? threshold : Math.max(threshold, WIT_MIN_CONFIDENCE);

  if (cfg.autonomy === 'suggest') reasons.push('modo sugerencia: nada se envía solo');
  if (c.source === 'heuristic') reasons.push('clasificado por reglas (LLM no disponible)');
  if (c.confidence < threshold) reasons.push(`confianza ${c.confidence.toFixed(2)} < ${threshold.toFixed(2)}`);
  if (mode === 'witty-comeback' && c.confidence < witThreshold) {
    reasons.push(`humor exige confianza ≥ ${witThreshold.toFixed(2)}`);
  }
  if (c.risk === 'medium') reasons.push('riesgo medio');
  if (HUMOR_MODES.has(mode) && ctx.sensitiveTopic) reasons.push('tema sensible: sin humor automático');
  if (c.kind === 'complaint' && c.sarcasm.present) reasons.push('reclamo con sarcasmo: lo revisa una persona');

  return reasons.length > 0
    ? { action: 'draft-for-review', mode, reasons }
    : { action: 'reply', mode, reasons: ['política: respuesta automática'] };
};
