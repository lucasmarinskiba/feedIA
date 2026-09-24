/**
 * TikTok Compliance Guardian
 *
 * Gatekeeper para cualquier acción automatizada que vaya a TikTok, análogo a
 * src/compliance/guardian.ts (Instagram) pero contra las reglas propias de
 * TikTok (src/compliance/tiktokRules.ts). Nunca aprueba nada que huela a
 * engagement falso, mass-follow/like/comment o granjas de clics — esas
 * violaciones bloquean SIEMPRE, sin importar el modo estricto.
 */

import { log } from '../agent/logger.js';
import { TIKTOK_RULES, type TikTokRule, type TikTokRuleSeverity } from './tiktokRules.js';
import { checkRateLimit, recordAction, type RateLimitCheck } from './rateLimiter.js';
import { audit, auditBlocked, type AuditAction } from './auditLog.js';

export type TikTokActionCategory =
  | 'business_dm_reply'
  | 'catalog_send'
  | 'appointment_booking'
  | 'live_moderate'
  | 'publish';

export interface TikTokGuardianContext {
  /** Quién inicia la acción (ej: "tiktok-business-bot", "live-moderator") */
  actor: string;
  /** Identificador del usuario de TikTok destinatario, si aplica */
  targetTikTokUserId?: string;
  /** ¿El usuario escribió primero? Mensajería automatizada solo es válida como respuesta. */
  userInitiatedContact?: boolean;
  /**
   * Por dónde llegó el contacto que se está respondiendo. 'dm' es el único
   * canal válido para mensajería automatizada (TT-BIZ-001) — TikTok no tiene
   * API para leer comentarios públicos y disparar un DM desde ahí (TT-AUTO-004).
   */
  contactChannel?: 'dm' | 'comment';
  /** Texto que se va a enviar/publicar/moderar */
  contentText?: string;
}

export interface TikTokGuardianDecision {
  allowed: boolean;
  reason?: string;
  violatedRules: TikTokRule[];
  rateLimit: RateLimitCheck;
  riskScore: number;
}

const ACTION_TO_RATE_LIMIT: Record<
  TikTokActionCategory,
  'tiktok_business_reply' | 'tiktok_live_moderate' | 'tiktok_publish'
> = {
  business_dm_reply: 'tiktok_business_reply',
  catalog_send: 'tiktok_business_reply',
  appointment_booking: 'tiktok_business_reply',
  live_moderate: 'tiktok_live_moderate',
  publish: 'tiktok_publish',
};

const ACTION_TO_AUDIT: Record<TikTokActionCategory, AuditAction> = {
  business_dm_reply: 'BOT_REPLY',
  catalog_send: 'BOT_REPLY',
  appointment_booking: 'BOT_REPLY',
  live_moderate: 'API_REQUEST',
  publish: 'PUBLISH',
};

/** Frases que delatan intención de comprar/generar engagement falso o automatizar como humano (TT-AUTO-001/002/003). */
const PROHIBITED_PATTERNS: Array<{ re: RegExp; code: string }> = [
  {
    re: /\b(compr\w*|vend\w*)\b[^.!?\n]{0,25}\b(seguidores|followers|likes|views|vistas|compartidos)\b/i,
    code: 'TT-AUTO-001',
  },
  { re: /\b(farm\s+de\s+likes|engagement\s+(falso|artificial)|pod\s+de\s+engagement)\b/i, code: 'TT-AUTO-001' },
  { re: /\b(\d+\s+seguidores\s+por\s+\$?\d+)\b/i, code: 'TT-AUTO-001' },
  { re: /\b(auto-?follow|mass\s+follow|seguir\s+masivamente|bot\s+para\s+seguir)\b/i, code: 'TT-AUTO-002' },
  { re: /\b(scrapear|scraping|extraer\s+seguidores|sacar\s+datos\s+de\s+perfiles)\b/i, code: 'TT-AUTO-002' },
  { re: /\b(comentarios?\s+repetitiv|coment(a|ar)\s+en\s+videos?\s+ajenos)\b/i, code: 'TT-AUTO-002' },
  { re: /\b(granja\s+de\s+(clics|dispositivos)|click\s*farm|device\s*farm)\b/i, code: 'TT-AUTO-003' },
  { re: /\b(rotar?\s+IPs?|m[uú]ltiples\s+tel[eé]fonos)\s+para\s+(vistas|views|likes)\b/i, code: 'TT-AUTO-003' },
];

const checkContentRules = (text?: string): TikTokRule[] => {
  if (!text) return [];
  const hits: TikTokRule[] = [];
  for (const { re, code } of PROHIBITED_PATTERNS) {
    if (re.test(text)) {
      const rule = TIKTOK_RULES.find((r) => r.code === code);
      if (rule && !hits.includes(rule)) hits.push(rule);
    }
  }
  return hits;
};

const checkContextRules = (category: TikTokActionCategory, ctx: TikTokGuardianContext): TikTokRule[] => {
  const hits: TikTokRule[] = [];
  const isMessaging =
    category === 'business_dm_reply' || category === 'catalog_send' || category === 'appointment_booking';

  if (isMessaging) {
    // TT-AUTO-004: TikTok no tiene API para leer un comentario público y
    // disparar un DM desde ahí — eso siempre es scraping/automatización de
    // navegador en la sombra. Se chequea PRIMERO y bloquea sin importar lo
    // demás: no hay forma legítima de que esto pase.
    if (ctx.contactChannel === 'comment') {
      const rule = TIKTOK_RULES.find((r) => r.code === 'TT-AUTO-004');
      if (rule) hits.push(rule);
    }

    // TT-BIZ-001: mensajería automatizada solo como RESPUESTA a alguien que ya
    // escribió — nunca mass-messaging a cuentas que no iniciaron contacto.
    if (!ctx.userInitiatedContact || !ctx.targetTikTokUserId) {
      const rule = TIKTOK_RULES.find((r) => r.code === 'TT-BIZ-001');
      if (rule) hits.push(rule);
    }
  }

  return hits;
};

const calculateRiskScore = (violated: TikTokRule[], rateLimit: RateLimitCheck): number => {
  const weights: Record<TikTokRuleSeverity, number> = { critica: 50, alta: 30, media: 15, baja: 5 };
  let score = violated.reduce((s, r) => s + weights[r.severity], 0);
  if (!rateLimit.allowed) score += 25;
  return Math.min(score, 100);
};

/**
 * Evalúa una acción propuesta hacia TikTok. Cualquier violación `critica`
 * (engagement falso, mass-follow/scraping, click farms) bloquea siempre, sin
 * excepción de modo estricto/permisivo — a diferencia del guardian de
 * Instagram, acá no hay gris: esas tres reglas son shadowban/ban directo.
 */
export const evaluate = (category: TikTokActionCategory, ctx: TikTokGuardianContext): TikTokGuardianDecision => {
  const violated = [...checkContentRules(ctx.contentText), ...checkContextRules(category, ctx)];
  const rateLimitType = ACTION_TO_RATE_LIMIT[category];
  const rateLimit = checkRateLimit(rateLimitType, ctx.targetTikTokUserId);

  const hasCritical = violated.some((r) => r.severity === 'critica');
  const hasHigh = violated.some((r) => r.severity === 'alta');

  let allowed = true;
  let reason: string | undefined;

  if (hasCritical) {
    allowed = false;
    reason = `Bloqueado — violación crítica de las normas de TikTok: ${violated
      .filter((r) => r.severity === 'critica')
      .map((r) => `[${r.code}] ${r.description}`)
      .join('; ')}`;
  } else if (hasHigh) {
    allowed = false;
    reason = `Bloqueado — ${violated
      .filter((r) => r.severity === 'alta')
      .map((r) => `[${r.code}] ${r.description}`)
      .join('; ')}`;
  } else if (!rateLimit.allowed) {
    allowed = false;
    reason = rateLimit.reason;
  }

  if (!allowed) {
    log.warn(`[TikTokGuardian] ${category} bloqueado: ${reason}`);
    auditBlocked(ACTION_TO_AUDIT[category], reason ?? 'Bloqueado por compliance TikTok', {
      targetUserId: ctx.targetTikTokUserId,
      contentSummary: ctx.contentText?.slice(0, 100),
      complianceRules: violated.map((r) => r.code),
    });
  }

  return { allowed, reason, violatedRules: violated, rateLimit, riskScore: calculateRiskScore(violated, rateLimit) };
};

export const recordSuccess = (category: TikTokActionCategory, ctx: TikTokGuardianContext): void => {
  const rateLimitType = ACTION_TO_RATE_LIMIT[category];
  recordAction(rateLimitType, ctx.targetTikTokUserId);
  audit({
    action: ACTION_TO_AUDIT[category],
    outcome: 'success',
    targetUserId: ctx.targetTikTokUserId,
    contentSummary: ctx.contentText?.slice(0, 100),
    dryRun: false,
  });
};
