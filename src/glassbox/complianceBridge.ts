/**
 * GlassBox Compliance Bridge
 * ─────────────────────────────────────────────────────────────────────────
 * Puente entre el GlassBox Supervisor y el Compliance Guardian.
 * Cada ActionRequest se evalúa contra las reglas de Instagram ANTES
 * de entrar al gate. Si el guardian bloquea → acción rechazada automática.
 * Si advierte → llega al gate con flag amarilla.
 */

import { evaluate, INSTAGRAM_RULES } from '../compliance/index.js';
import type { GuardianContext, GuardianDecision, ActionCategory } from '../compliance/index.js';
import { log } from '../agent/logger.js';

export interface ComplianceResult {
  allowed: boolean;
  riskScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  reason?: string;
  violatedRules: string[];
  recommendations: string[];
  guardianDecision: GuardianDecision;
}

/**
 * Evalúa una acción propuesta contra el Compliance Guardian.
 * Devuelve un resultado enriquecido con riskLevel calculado.
 */
export const evaluateAction = (
  actionType: string,
  description: string,
  context?: Partial<GuardianContext>,
): ComplianceResult => {
  try {
    const category = mapActionTypeToCategory(actionType);

    const ctx: GuardianContext = {
      actor: context?.actor ?? 'glassbox',
      contentText: context?.contentText ?? description,
      humanInitiated: context?.humanInitiated ?? false,
    };

    const decision = evaluate(category, ctx);

    const riskLevel: ComplianceResult['riskLevel'] =
      decision.riskScore >= 50
        ? 'critical'
        : decision.riskScore >= 30
          ? 'high'
          : decision.riskScore >= 15
            ? 'medium'
            : 'low';

    return {
      allowed: decision.allowed,
      riskScore: decision.riskScore,
      riskLevel,
      reason: decision.reason,
      violatedRules: decision.violatedRules.map((r) => r.code),
      recommendations: decision.recommendations,
      guardianDecision: decision,
    };
  } catch (err) {
    log.warn(`[ComplianceBridge] Evaluación falló para ${actionType}: ${(err as Error).message}`);
    return {
      allowed: true,
      riskScore: 0,
      riskLevel: 'low',
      violatedRules: [],
      recommendations: ['Verificación manual recomendada'],
      guardianDecision: {
        allowed: true,
        riskScore: 0,
        reason: 'Evaluación de compliance no disponible',
        violatedRules: [],
        recommendations: [],
        rateLimit: { allowed: true, currentCount: 0, limit: 0 },
        dryRun: true,
      },
    };
  }
};

/**
 * Determina si una acción de Computer Use requiere supervisión forzada
 * independientemente del modo actual.
 */
export const requiresForcedSupervision = (actionType: string): boolean => {
  const writeActions = new Set([
    'publish',
    'send_dm',
    'reply_comment',
    'delete_comment',
    'follow',
    'unfollow',
    'share',
    'comment',
    'computer_click',
    'computer_type',
    'computer_drag',
  ]);
  return writeActions.has(actionType.toLowerCase());
};

/**
 * Devuelve un resumen legible de las reglas violadas con sus descripciones.
 */
export const getViolationDetails = (
  violatedRuleCodes: string[],
): Array<{ code: string; description: string; severity: string }> =>
  violatedRuleCodes.map((code) => {
    const rule = INSTAGRAM_RULES.find((r) => r.code === code);
    return {
      code,
      description: rule?.description ?? code,
      severity: rule?.severity ?? 'unknown',
    };
  });

/* ── Helpers privados ──────────────────────────────────────────────────── */

const mapActionTypeToCategory = (actionType: string): ActionCategory => {
  const t = actionType.toLowerCase();
  if (t.includes('publish') || t.includes('post') || t.includes('share')) return 'publish';
  if (t.includes('dm') || t.includes('message') || t.includes('send')) return 'dm';
  if (t.includes('comment') || t.includes('reply')) return 'comment_reply';
  if (t.includes('follow') || t.includes('unfollow')) return 'follow';
  if (t.includes('like') || t.includes('save')) return 'like';
  if (t.includes('scrape') || t.includes('extract')) return 'api_request';
  return 'api_request';
};
