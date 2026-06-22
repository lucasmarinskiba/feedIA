/**
 * Compliance Guardian
 *
 * Gatekeeper central que evalúa CUALQUIER acción que vaya a Instagram
 * antes de que se ejecute. Implementa:
 * - Validación contra reglas de Instagram
 * - Rate limiting
 * - Auditoría
 * - Modo estricto vs permisivo
 *
 * FILOSOFÍA: Es mejor bloquear una acción legítima que permitir
 * una acción que ponga en riesgo la cuenta del cliente.
 */

import { env } from '../config/index.js';
import { log } from '../agent/logger.js';
import { INSTAGRAM_RULES, type InstagramRule, type RuleSeverity } from './instagramRules.js';
import { checkRateLimit, recordAction, type ActionType, type RateLimitCheck } from './rateLimiter.js';
import { audit, auditBlocked, type AuditAction } from './auditLog.js';

export type ActionCategory =
  | 'publish'
  | 'dm'
  | 'comment_reply'
  | 'comment_external'
  | 'like'
  | 'follow'
  | 'story_react'
  | 'bot_auto_reply'
  | 'nurture_sequence'
  | 'api_request';

export interface GuardianContext {
  /** Quién o qué inicia la acción (ej: "bot", "nurture:seq-123", "user:admin") */
  actor: string;
  /** Identificador del usuario/destinatario de Instagram (si aplica) */
  targetIgUserId?: string;
  /** ID del contenido (post, comment, story) si aplica */
  targetContentId?: string;
  /** Texto que se va a enviar/publicar (para análisis de contenido) */
  contentText?: string;
  /** Es una acción iniciada por el usuario humano (true) o automatizada (false)? */
  humanInitiated?: boolean;
}

export interface GuardianDecision {
  /** ¿Se permite la acción? */
  allowed: boolean;
  /** Si se bloqueó, ¿por qué? */
  reason?: string;
  /** Reglas violadas */
  violatedRules: InstagramRule[];
  /** Veredicto del rate limiter */
  rateLimit: RateLimitCheck;
  /** ¿Está en modo DRY_RUN? */
  dryRun: boolean;
  /** Nivel de riesgo estimado (0-100) */
  riskScore: number;
  /** Recomendaciones si se bloqueó */
  recommendations: string[];
}

interface RuleCheck {
  rule: InstagramRule;
  violated: boolean;
  reason?: string;
}

const ACTION_TO_RATE_LIMIT_TYPE: Record<ActionCategory, ActionType> = {
  publish: 'publish_post',
  dm: 'send_dm',
  comment_reply: 'reply_comment',
  comment_external: 'comment_external',
  like: 'like_post',
  follow: 'follow_account',
  story_react: 'story_reaction',
  bot_auto_reply: 'reply_dm',
  nurture_sequence: 'send_dm',
  api_request: 'api_call',
};

const ACTION_TO_AUDIT_ACTION: Record<ActionCategory, AuditAction> = {
  publish: 'PUBLISH',
  dm: 'SEND_DM',
  comment_reply: 'REPLY_COMMENT',
  comment_external: 'COMMENT_EXTERNAL',
  like: 'LIKE',
  follow: 'FOLLOW',
  story_react: 'STORY_REACT',
  bot_auto_reply: 'BOT_REPLY',
  nurture_sequence: 'NURTURE_SEND',
  api_request: 'API_REQUEST',
};

/**
 * Verifica si el contenido de texto viola reglas específicas.
 */
const checkContentRules = (text?: string): RuleCheck[] => {
  if (!text) return [];
  const results: RuleCheck[] = [];

  // CONT-003: Promesas absolutas
  const promisePatterns = [
    /\b(garantizado|guaranteed|100\s*%\s*efectivo|sin riesgo|asegurado al 100|resultados? garantizado)\b/i,
    /\b(duplica|triplica)\s+(tus\s+)?(ventas|ingresos|seguidores)\s+(en\s+\d+\s+(días|horas|semanas))?\b/i,
    /\b(gana\s+\$?[\d.,]+\s+(en\s+)?\d+\s+(días|horas|semanas))\b/i,
  ];
  for (const re of promisePatterns) {
    if (re.test(text)) {
      const rule = INSTAGRAM_RULES.find((r) => r.code === 'CONT-003')!;
      results.push({
        rule,
        violated: true,
        reason: `Detectado lenguaje de promesa absoluta: "${text.match(re)?.[0] ?? ''}"`,
      });
      break;
    }
  }

  // CONT-002: Datos personales
  const piiPatterns = [
    /\b\d{7,8}\s*[-\s]?\s*\d{1}\b/, // DNI argentino
    /\b\d{2}-?\d{8}-?\d\b/, // CUIT/CUIL
    /\b(?:\d[ -]*?){13,16}\b/, // Tarjetas
    /\+\d{1,3}\s?\d{2,4}\s?\d{4}\s?\d{4}/, // Teléfonos internacionales
  ];
  for (const re of piiPatterns) {
    if (re.test(text)) {
      const rule = INSTAGRAM_RULES.find((r) => r.code === 'CONT-002')!;
      results.push({
        rule,
        violated: true,
        reason: `Posible dato personal detectado en contenido`,
      });
      break;
    }
  }

  // CONT-004: Copyright (música)
  if (/\b(usar\s+)?(canción|música|song|track)\s+de\s+([^\s]+)/i.test(text)) {
    const rule = INSTAGRAM_RULES.find((r) => r.code === 'CONT-004')!;
    results.push({
      rule,
      violated: false, // Solo advertencia, no bloqueo automático
      reason: 'Se menciona música de terceros; verificar licencias',
    });
  }

  // INT-002: Acoso/amenazas
  const threatPatterns = [
    /\b(te\s+voy\s+a|vas\s+a\s+ver|te\s+voy\s+a\s+encontrar|me\s+vas\s+a\s+pagar)\b/i,
    /\b(matate|muerete|hijo\s+de\s+puta|concha\s+tu\s+madre|cag[oó]n)\b/i,
  ];
  for (const re of threatPatterns) {
    if (re.test(text)) {
      const rule = INSTAGRAM_RULES.find((r) => r.code === 'INT-002')!;
      results.push({
        rule,
        violated: true,
        reason: `Lenguaje potencialmente amenazante detectado`,
      });
      break;
    }
  }

  // AUTO-001: Scraping / automatización no autorizada
  const scrapingPatterns = [
    /\b(scrapear|scraping|extraer\s+seguidores|sacar\s+datos\s+de)\b/i,
    /\b(automáticamente\s+seguir|auto-follow|bot\s+para\s+seguir)\b/i,
  ];
  for (const re of scrapingPatterns) {
    if (re.test(text)) {
      const rule = INSTAGRAM_RULES.find((r) => r.code === 'AUTO-001')!;
      results.push({
        rule,
        violated: true,
        reason: `El contenido menciona prácticas de automatización no autorizada`,
      });
      break;
    }
  }

  return results;
};

/**
 * Verifica reglas basadas en el contexto de la acción.
 */
const checkContextRules = (category: ActionCategory, ctx: GuardianContext): RuleCheck[] => {
  const results: RuleCheck[] = [];

  // INT-001: Spam / mensajes masivos
  if (category === 'dm' && !ctx.humanInitiated) {
    const rule = INSTAGRAM_RULES.find((r) => r.code === 'INT-001')!;
    // Los DMs automatizados están permitidos SOLO si el usuario contactó primero
    // o está en una secuencia de nurture con opt-in
    if (!ctx.targetIgUserId) {
      results.push({
        rule,
        violated: true,
        reason: 'DM automatizado sin identificador de destinatario verificable',
      });
    }
  }

  // INT-003: Compra/venta de engagement
  if (ctx.contentText) {
    const engagementSalePatterns = [
      /\b(comprar|vender)\s+(seguidores|likes|views|comentarios|followers)\b/i,
      /\b(farm\s+de\s+likes|engagement\s+artificial)\b/i,
      /\b(1000\s+seguidores\s+por\s+\$?\d+)\b/i,
    ];
    for (const re of engagementSalePatterns) {
      if (re.test(ctx.contentText)) {
        const rule = INSTAGRAM_RULES.find((r) => r.code === 'INT-003')!;
        results.push({
          rule,
          violated: true,
          reason: `Contenido relacionado con compra/venta de engagement`,
        });
        break;
      }
    }
  }

  // AUTO-002: Elusión de medidas de seguridad
  if (ctx.contentText) {
    const evasionPatterns = [
      /\b(eludir|evadir|bypass|saltar|saltarse)\s+(l[ií]mites?|rate\s+limit|bloqueo|verificaci[oó]n)\b/i,
      /\b(us[aá]r?\s+prox(y|ies)|m[uú]ltiples\s+cuentas|cambiar\s+IP)\s+para\s+(evadir|eludir|saltar)\b/i,
      /\b(evadir|eludir)\s+(el\s+)?rate\s+limit\b/i,
      /\b(hacer\s+m[aá]s\s+requests?\s+de\s+los\s+permitidos?)\b/i,
    ];
    for (const re of evasionPatterns) {
      if (re.test(ctx.contentText)) {
        const rule = INSTAGRAM_RULES.find((r) => r.code === 'AUTO-002')!;
        results.push({
          rule,
          violated: true,
          reason: `El contenido sugiere eludir medidas de seguridad de Instagram`,
        });
        break;
      }
    }
  }

  // INT-001: Autopromoción en comentarios externos (spam encubierto)
  if (category === 'comment_external' && ctx.contentText) {
    const selfPromoPatterns = [
      /\b(seguime\s+en\s+@|seguir\s+en\s+@|visita\s+mi\s+perfil\s+@)\b/i,
      /\b(@\w+.*?tenemos\s+(el\s+)?mejor|@\w+.*?visita\s+nuestra)\b/i,
      /\b(link\s+en\s+(mi\s+)?bio|perfil\s+para\s+m[aá]s)\b/i,
    ];
    for (const re of selfPromoPatterns) {
      if (re.test(ctx.contentText)) {
        const rule = INSTAGRAM_RULES.find((r) => r.code === 'INT-001')!;
        results.push({
          rule,
          violated: true,
          reason: `Autopromoción detectada en comentario externo`,
        });
        break;
      }
    }
  }

  return results;
};

/**
 * Calcula el score de riesgo basado en violaciones.
 */
const calculateRiskScore = (violatedRules: InstagramRule[], rateLimitCheck: RateLimitCheck): number => {
  let score = 0;

  const severityWeights: Record<RuleSeverity, number> = {
    critica: 50,
    alta: 30,
    media: 15,
    baja: 5,
  };

  for (const rule of violatedRules) {
    score += severityWeights[rule.severity];
  }

  // Penalizar si está cerca del límite de rate
  if (!rateLimitCheck.allowed) {
    score += 25;
  } else if (rateLimitCheck.currentCount / rateLimitCheck.limit > 0.8) {
    score += 10;
  }

  // Penalizar acciones automatizadas sin interacción humana previa
  // (esto se maneja en el contexto)

  return Math.min(score, 100);
};

/**
 * Genera recomendaciones basadas en violaciones.
 */
const generateRecommendations = (violatedRules: InstagramRule[], category: ActionCategory): string[] => {
  const recs: string[] = [];

  for (const rule of violatedRules) {
    if (rule.allowedExamples.length > 0) {
      recs.push(`[${rule.code}] ${rule.allowedExamples[0]}`);
    }
  }

  // Recomendaciones específicas por categoría
  if (category === 'dm' && violatedRules.some((r) => r.code === 'INT-001')) {
    recs.push('Asegúrese de que el usuario haya contactado primero o dado consentimiento explícito.');
  }

  if (category === 'comment_external' && violatedRules.some((r) => r.code === 'INT-001')) {
    recs.push('Los comentarios en cuentas ajenas deben aportar valor genuino y nunca promocionar directamente.');
  }

  if (category === 'publish' && violatedRules.some((r) => r.code.startsWith('CONT'))) {
    recs.push('Revise el contenido con el auditor de brand safety antes de publicar.');
  }

  return [...new Set(recs)];
};

/**
 * Función principal del Guardian.
 * Evalúa una acción propuesta y retorna si debe permitirse.
 *
 * USO:
 *   const decision = await guardian.evaluate('publish', { actor: 'pipeline:brief', contentText: caption });
 *   if (!decision.allowed) { // no ejecutar }
 */
export const evaluate = (category: ActionCategory, ctx: GuardianContext): GuardianDecision => {
  const violations: RuleCheck[] = [];

  // 1. Verificar reglas de contenido
  if (ctx.contentText) {
    violations.push(...checkContentRules(ctx.contentText));
  }

  // 2. Verificar reglas de contexto
  violations.push(...checkContextRules(category, ctx));

  // 3. Verificar rate limits
  const rateLimitType = ACTION_TO_RATE_LIMIT_TYPE[category];
  const rateLimitCheck = checkRateLimit(rateLimitType, ctx.targetIgUserId);

  if (!rateLimitCheck.allowed) {
    // La violación de rate limit no es una "regla de Instagram" per se,
    // pero bloqueamos la acción
    log.warn(`Rate limit excedido para ${category}: ${rateLimitCheck.reason}`);
  }

  // 4. Separar violaciones reales de advertencias
  const violatedRules = violations.filter((v) => v.violated).map((v) => v.rule);
  const warnings = violations.filter((v) => !v.violated);

  // 5. Decidir si se permite
  const hasCritical = violatedRules.some((r) => r.severity === 'critica');
  const hasHigh = violatedRules.some((r) => r.severity === 'alta');

  // Modo estricto: bloquea también violaciones de media severidad
  const strictMode = env.compliance?.strictMode ?? true;

  let allowed = true;
  let reason: string | undefined;

  if (hasCritical) {
    allowed = false;
    reason = `Violación CRÍTICA de compliance: ${violatedRules
      .filter((r) => r.severity === 'critica')
      .map((r) => `[${r.code}] ${r.description}`)
      .join('; ')}`;
  } else if (hasHigh) {
    allowed = false;
    reason = `Violación ALTA de compliance: ${violatedRules
      .filter((r) => r.severity === 'alta')
      .map((r) => `[${r.code}] ${r.description}`)
      .join('; ')}`;
  } else if (strictMode && violatedRules.some((r) => r.severity === 'media')) {
    allowed = false;
    reason = `Violación MEDIA de compliance (modo estricto activo): ${violatedRules
      .filter((r) => r.severity === 'media')
      .map((r) => `[${r.code}] ${r.description}`)
      .join('; ')}`;
  } else if (!rateLimitCheck.allowed) {
    allowed = false;
    reason = rateLimitCheck.reason;
  }

  // 6. Loguear advertencias (no bloqueantes)
  for (const w of warnings) {
    log.warn(`[GUARDIAN] Advertencia [${w.rule.code}]: ${w.reason}`);
  }

  // 7. Si se bloquea, registrar en audit log
  if (!allowed) {
    auditBlocked(ACTION_TO_AUDIT_ACTION[category], reason ?? 'Bloqueado por compliance', {
      targetUserId: ctx.targetIgUserId,
      targetContentId: ctx.targetContentId,
      contentSummary: ctx.contentText?.slice(0, 100),
      complianceRules: violatedRules.map((r) => r.code),
      dryRun: env.dryRun,
    });
  }

  const riskScore = calculateRiskScore(violatedRules, rateLimitCheck);

  return {
    allowed,
    reason,
    violatedRules,
    rateLimit: rateLimitCheck,
    dryRun: env.dryRun,
    riskScore,
    recommendations: generateRecommendations(violatedRules, category),
  };
};

/**
 * Registra una acción exitosa en el rate limiter y audit log.
 * Llamar DESPUÉS de que la acción se ejecute correctamente.
 */
export const recordSuccess = (category: ActionCategory, ctx: GuardianContext, contentId?: string): void => {
  const rateLimitType = ACTION_TO_RATE_LIMIT_TYPE[category];
  recordAction(rateLimitType, ctx.targetIgUserId);

  audit({
    action: ACTION_TO_AUDIT_ACTION[category],
    outcome: env.dryRun ? 'dry_run' : 'success',
    targetUserId: ctx.targetIgUserId,
    targetContentId: contentId ?? ctx.targetContentId,
    contentSummary: ctx.contentText?.slice(0, 100),
    dryRun: env.dryRun,
    rateLimitInfo: {
      currentCount: checkRateLimit(rateLimitType, ctx.targetIgUserId).currentCount,
      limit: RATE_LIMITS[rateLimitType]?.maxPerHour ?? 0,
    },
  });
};

/**
 * Registra un fallo en el audit log.
 */
export const recordFailure = (category: ActionCategory, ctx: GuardianContext, error: string): void => {
  audit({
    action: ACTION_TO_AUDIT_ACTION[category],
    outcome: 'failure',
    targetUserId: ctx.targetIgUserId,
    targetContentId: ctx.targetContentId,
    contentSummary: ctx.contentText?.slice(0, 100),
    reason: error,
    dryRun: env.dryRun,
  });
};

// Re-exportar RATE_LIMITS para uso en otros módulos
import { RATE_LIMITS } from './rateLimiter.js';
export { RATE_LIMITS };
