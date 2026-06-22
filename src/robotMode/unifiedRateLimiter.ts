/**
 * Unified Rate Limiter — Sistema global de límites para TODAS las vías de acción.
 *
 * Filosofía: Instagram no distingue entre "acción por API" y "acción por navegador".
 * Si publicaste 15 posts hoy por API, no puedes publicar más por web. Este módulo
 * unifica los contadores para que todas las vías compartan los mismos límites.
 *
 * Combina:
 *   • rateLimiter.ts (compliance) — persistencia en disco, límites por hora/día
 *   • rateLimitSmart.ts (browser) — tiers por tamaño de cuenta, jitter
 *   • Gradual Warmup — cuentas nuevas ramp-up progresivo
 */

import {
  checkRateLimit,
  recordAction,
  RATE_LIMITS,
  type ActionType as ComplianceActionType,
} from '../compliance/rateLimiter.js';
import { getRateLimiter, inferTierFromFollowers, type RateLimitTier } from '../browserOperators/core/rateLimitSmart.js';
import { log } from '../agent/logger.js';

// ── Tipos ─────────────────────────────────────────────────────────────────────

export type UnifiedActionType =
  | 'publish'
  | 'like'
  | 'comment'
  | 'comment_reply'
  | 'dm'
  | 'dm_reply'
  | 'follow'
  | 'unfollow'
  | 'story_view'
  | 'story_reaction'
  | 'api_call'
  | 'read_insights';

export type ActionVia = 'api' | 'web' | 'computer_use' | 'app';

export interface WarmupConfig {
  /** Día actual del warmup (0 = primera semana) */
  currentDay: number;
  /** Día en que se alcanza el tier completo */
  warmupDays: number;
  /** Factor de reducción inicial (0.1 = 10% de los límites) */
  initialFactor: number;
}

export interface UnifiedRateLimitCheck {
  allowed: boolean;
  reason?: string;
  nextAvailableInSeconds?: number;
  currentCount: number;
  limit: number;
  tier: RateLimitTier;
  warmupFactor: number;
  via?: ActionVia;
}

export interface AccountContext {
  /** Seguidores actuales (para inferir tier) */
  followerCount?: number;
  /** Tier explícito (override) */
  tier?: RateLimitTier;
  /** Días desde que empezó a operar el robot */
  robotAgeDays?: number;
  /** Config de warmup (override) */
  warmup?: Partial<WarmupConfig>;
}

// ── Mapeo de acciones unificadas → acciones de compliance ─────────────────────

const UNIFIED_TO_COMPLIANCE: Record<UnifiedActionType, ComplianceActionType> = {
  publish: 'publish_post',
  like: 'like_post',
  comment: 'comment_external',
  comment_reply: 'reply_comment',
  dm: 'send_dm',
  dm_reply: 'reply_dm',
  follow: 'follow_account',
  unfollow: 'unfollow_account',
  story_view: 'story_reaction',
  story_reaction: 'story_reaction',
  api_call: 'api_call',
  read_insights: 'api_call',
};

// ── Warmup defaults ───────────────────────────────────────────────────────────

const DEFAULT_WARMUP: WarmupConfig = {
  currentDay: 0,
  warmupDays: 21, // 3 semanas para ramp-up completo
  initialFactor: 0.1,
};

/** Calcula el factor de warmup (0.1 → 1.0) basado en los días de operación */
export const calculateWarmupFactor = (cfg: WarmupConfig): number => {
  const { currentDay, warmupDays, initialFactor } = cfg;
  if (currentDay >= warmupDays) return 1.0;
  if (currentDay <= 0) return initialFactor;
  // Curva de easing cuadrática: empieza lento, acelera al final
  const progress = currentDay / warmupDays;
  const eased = progress * progress; // quadratic ease-in
  return initialFactor + (1 - initialFactor) * eased;
};

// ── Tier resolver ─────────────────────────────────────────────────────────────

const resolveTier = (ctx: AccountContext): RateLimitTier => {
  if (ctx.tier) return ctx.tier;
  if (ctx.followerCount !== undefined) return inferTierFromFollowers(ctx.followerCount);
  return 'medium';
};

// ── Límite efectivo (tier + warmup) ───────────────────────────────────────────

const getEffectiveLimit = (
  action: UnifiedActionType,
  tier: RateLimitTier,
  warmupFactor: number,
): { maxPerHour: number; maxPerDay: number; minSecondsBetween: number } => {
  const complianceType = UNIFIED_TO_COMPLIANCE[action];
  const base = RATE_LIMITS[complianceType];

  // Obtener límites del tier (más conservadores que los de compliance)
  const tierLimiter = getRateLimiter(tier);
  const tierConfig = tierLimiter.config;

  // Aplicar factor de warmup a los límites
  let maxPerHour = Math.floor(base.maxPerHour * warmupFactor);
  let maxPerDay = Math.floor(base.maxPerDay * warmupFactor);
  let minSecondsBetween = Math.ceil(base.minSecondsBetween / Math.max(warmupFactor, 0.1));

  // Si el tier es más restrictivo, aplicar el mínimo
  if (action === 'publish') {
    maxPerDay = Math.min(maxPerDay, tierConfig.maxPostsPerDay);
    minSecondsBetween = Math.max(minSecondsBetween, Math.floor(tierConfig.minDelayBetweenPostsMs / 1000));
  } else if (action === 'comment' || action === 'comment_reply') {
    maxPerHour = Math.min(maxPerHour, tierConfig.maxCommentsPerHour);
    minSecondsBetween = Math.max(minSecondsBetween, Math.floor(tierConfig.minDelayBetweenCommentsMs / 1000));
  } else if (action === 'dm' || action === 'dm_reply') {
    maxPerHour = Math.min(maxPerHour, tierConfig.maxDmsPerHour);
    minSecondsBetween = Math.max(minSecondsBetween, Math.floor(tierConfig.minDelayBetweenDmsMs / 1000));
  } else {
    maxPerHour = Math.min(maxPerHour, tierConfig.maxInteractionsPerHour);
    minSecondsBetween = Math.max(minSecondsBetween, Math.floor(tierConfig.minDelayBetweenInteractionsMs / 1000));
  }

  return { maxPerHour, maxPerDay, minSecondsBetween };
};

// ── API pública ───────────────────────────────────────────────────────────────

/**
 * Verifica si una acción está dentro de los límites globales.
 * Este check DEBE llamarse ANTES de ejecutar cualquier acción, sin importar la vía.
 */
export const checkUnifiedRateLimit = (
  action: UnifiedActionType,
  ctx: AccountContext = {},
  via?: ActionVia,
): UnifiedRateLimitCheck => {
  const tier = resolveTier(ctx);
  const warmupCfg: WarmupConfig = {
    ...DEFAULT_WARMUP,
    ...ctx.warmup,
    currentDay: ctx.robotAgeDays ?? DEFAULT_WARMUP.currentDay,
  };
  const warmupFactor = calculateWarmupFactor(warmupCfg);
  const effective = getEffectiveLimit(action, tier, warmupFactor);

  // Reutilizar el check del compliance (que tiene persistencia en disco)
  const complianceType = UNIFIED_TO_COMPLIANCE[action];
  const complianceCheck = checkRateLimit(complianceType);

  if (!complianceCheck.allowed) {
    return {
      allowed: false,
      reason: complianceCheck.reason,
      nextAvailableInSeconds: complianceCheck.nextAvailableInSeconds,
      currentCount: complianceCheck.currentCount,
      limit: complianceCheck.limit,
      tier,
      warmupFactor,
      via,
    };
  }

  // Verificar límite diario efectivo
  if (complianceCheck.currentCount >= effective.maxPerDay) {
    return {
      allowed: false,
      reason: `Límite diario efectivo alcanzado (${effective.maxPerDay} acciones/día durante warmup)`,
      nextAvailableInSeconds: complianceCheck.nextAvailableInSeconds,
      currentCount: complianceCheck.currentCount,
      limit: effective.maxPerDay,
      tier,
      warmupFactor,
      via,
    };
  }

  return {
    allowed: true,
    currentCount: complianceCheck.currentCount,
    limit: effective.maxPerHour,
    tier,
    warmupFactor,
    via,
  };
};

/**
 * Registra una acción ejecutada en el limiter global.
 * DEBE llamarse DESPUÉS de que la acción se ejecute exitosamente.
 */
export const recordUnifiedAction = (action: UnifiedActionType, via: ActionVia, ctx?: AccountContext): void => {
  const complianceType = UNIFIED_TO_COMPLIANCE[action];
  recordAction(complianceType);
  log.debug(`[UnifiedRateLimiter] ${action} registrado (vía: ${via}, tier: ${resolveTier(ctx ?? {})})`);
};

/**
 * Verifica y registra en un solo paso.
 */
export const checkAndRecordUnified = (
  action: UnifiedActionType,
  via: ActionVia,
  ctx?: AccountContext,
): UnifiedRateLimitCheck => {
  const check = checkUnifiedRateLimit(action, ctx, via);
  if (check.allowed) {
    recordUnifiedAction(action, via, ctx);
  }
  return check;
};

/**
 * Obtiene estadísticas completas de uso para una acción.
 */
export const getUnifiedStats = (
  action: UnifiedActionType,
  ctx: AccountContext = {},
): {
  tier: RateLimitTier;
  warmupFactor: number;
  effectiveLimits: { maxPerHour: number; maxPerDay: number; minSecondsBetween: number };
  complianceCheck: ReturnType<typeof checkRateLimit>;
} => {
  const tier = resolveTier(ctx);
  const warmupCfg: WarmupConfig = {
    ...DEFAULT_WARMUP,
    ...ctx.warmup,
    currentDay: ctx.robotAgeDays ?? DEFAULT_WARMUP.currentDay,
  };
  const warmupFactor = calculateWarmupFactor(warmupCfg);
  const effectiveLimits = getEffectiveLimit(action, tier, warmupFactor);
  const complianceType = UNIFIED_TO_COMPLIANCE[action];

  return {
    tier,
    warmupFactor,
    effectiveLimits,
    complianceCheck: checkRateLimit(complianceType),
  };
};

/**
 * Calcula cuántas acciones de un tipo quedan disponibles hoy.
 */
export const getRemainingActionsToday = (action: UnifiedActionType, ctx: AccountContext = {}): number => {
  const stats = getUnifiedStats(action, ctx);
  const used = stats.complianceCheck.currentCount;
  return Math.max(0, stats.effectiveLimits.maxPerDay - used);
};
