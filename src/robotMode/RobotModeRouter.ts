/**
 * RobotModeRouter — Orquestador de acciones de Instagram, SOLO vía API oficial.
 *
 * Antes tenía 3 vías ("Robot Cauteloso": API → Playwright/Web → Computer Use
 * como "recovery"), pero para like/comment/follow/dm la API oficial NUNCA es
 * una opción soportada (Meta no expone esas acciones sobre cuentas ajenas) —
 * así que en la práctica esas cuatro acciones SIEMPRE se ejecutaban vía
 * browser automation (fingerprint spoofing) o un emulador Android controlando
 * like/comment/follow/DM sobre cuentas de terceros. Eso es exactamente
 * "engagement falso"/mass-follow/auto-DM: lo que AUTO-001/002/003 e INT-001
 * prohíben, y arriesga el baneo real de la cuenta del cliente.
 *
 * Ahora: publish/comment_reply van por la API oficial (lo único soportado).
 * like/comment/follow/dm quedan deshabilitadas acá — fallan con un error
 * claro en vez de controlar un navegador o emulador en secreto.
 *
 * Cada acción pasa por:
 *   • UnifiedRateLimiter (límites globales por tier + warmup)
 *   • Compliance Guardian (reglas de Instagram)
 *   • GlassBox Gate (supervised)
 */

import { env } from '../config/index.js';
import { log } from '../agent/logger.js';
import type { BrandProfile } from '../config/types.js';
import {
  evaluate,
  recordSuccess,
  recordFailure,
  type GuardianContext,
  type ActionCategory,
} from '../compliance/index.js';
import { actionGate } from '../glassbox/index.js';
import {
  checkUnifiedRateLimit,
  recordUnifiedAction,
  type UnifiedActionType,
  type ActionVia,
  type AccountContext,
} from './unifiedRateLimiter.js';
import { buildAccountContext, recordWarmupAction } from './warmupTracker.js';
import { checkResponseForBlocks, preSessionHealthCheck } from './blockDetection.js';

// ── Integraciones existentes ──────────────────────────────────────────────────

import { publishToInstagram } from '../integrations/meta.js';
import type { PublishRequest as ApiPublishRequest } from '../integrations/meta.js';

/** Acciones que la API oficial nunca soporta sobre cuentas ajenas — deshabilitadas, no automatizadas por navegador/emulador. */
const DISABLED_ACTION_TYPES: ReadonlySet<RobotAction['type']> = new Set(['like', 'comment', 'follow', 'dm']);

const DISABLED_REASON =
  'Esta acción (like/comment/follow/DM sobre una cuenta ajena) no está soportada por la API oficial de Instagram, y la automatización vía navegador/emulador está deshabilitada por riesgo de baneo real de la cuenta (AUTO-001/002/003, INT-001). No se ejecuta.';

// ── Tipos ─────────────────────────────────────────────────────────────────────

export type RobotAction =
  | PublishAction
  | LikeAction
  | CommentAction
  | ReplyCommentAction
  | SendDMAction
  | ReplyDMAction
  | FollowAction
  | ReadInsightsAction;

interface BaseAction {
  /** Identificador único de la acción (para trazabilidad) */
  actionId?: string;
  /** Marca/brand sobre la que opera */
  brand: BrandProfile;
  /** Contexto de la cuenta (seguidores, tier, edad del robot) */
  accountCtx?: AccountContext;
}

export interface PublishAction extends BaseAction {
  type: 'publish';
  format: 'post' | 'reel' | 'story' | 'carousel';
  mediaPaths: string[];
  caption: string;
  hashtags?: string[];
  location?: string;
  collaborator?: string;
  audioName?: string;
  shareToFeed?: boolean;
  altText?: string;
}

export interface LikeAction extends BaseAction {
  type: 'like';
  postUrl: string;
}

export interface CommentAction extends BaseAction {
  type: 'comment';
  postUrl: string;
  text: string;
}

export interface ReplyCommentAction extends BaseAction {
  type: 'comment_reply';
  commentId: string;
  text: string;
}

export interface SendDMAction extends BaseAction {
  type: 'dm';
  username: string;
  message: string;
}

export interface ReplyDMAction extends BaseAction {
  type: 'dm_reply';
  username: string;
  message: string;
}

export interface FollowAction extends BaseAction {
  type: 'follow';
  username: string;
}

export interface ReadInsightsAction extends BaseAction {
  type: 'read_insights';
  period: '7_dias' | '30_dias' | '90_dias';
}

export interface RobotResult {
  ok: boolean;
  via: ActionVia | 'none';
  actionType: UnifiedActionType;
  postId?: string;
  url?: string;
  error?: string;
  durationMs: number;
  riskScore: number;
  glassboxActionId?: string;
  fallbackUsed?: boolean;
}

// ── Registro de historial por vía (para decisiones inteligentes) ──────────────

interface ViaHistory {
  successCount: number;
  failureCount: number;
  lastSuccessAt?: number;
  lastFailureAt?: number;
  lastFailureReason?: string;
}

const viaHistory: Record<string, Record<ActionVia, ViaHistory>> = {};

const getHistoryKey = (brand: BrandProfile, actionType: UnifiedActionType): string => `${brand.name}:${actionType}`;

const getViaHistory = (brand: BrandProfile, actionType: UnifiedActionType, via: ActionVia): ViaHistory => {
  const key = getHistoryKey(brand, actionType);
  if (!viaHistory[key]) {
    viaHistory[key] = {
      api: { successCount: 0, failureCount: 0 },
      web: { successCount: 0, failureCount: 0 },
      computer_use: { successCount: 0, failureCount: 0 },
      app: { successCount: 0, failureCount: 0 },
    };
  }
  return viaHistory[key]![via];
};

const recordViaResult = (
  brand: BrandProfile,
  actionType: UnifiedActionType,
  via: ActionVia,
  ok: boolean,
  error?: string,
): void => {
  const h = getViaHistory(brand, actionType, via);
  if (ok) {
    h.successCount++;
    h.lastSuccessAt = Date.now();
  } else {
    h.failureCount++;
    h.lastFailureAt = Date.now();
    h.lastFailureReason = error;
  }
};

// ── Decision engine: ¿qué vía usar? ───────────────────────────────────────────

/**
 * Determina si la Meta API está disponible y saludable.
 */
const isApiAvailable = (): boolean => !!env.meta.accessToken && !!env.meta.igBusinessId;

/**
 * Determina si una acción PUEDE hacerse por API oficial.
 */
const canUseApiFor = (action: RobotAction): boolean => {
  switch (action.type) {
    case 'publish':
      // API soporta: post, reel, carousel. No soporta: story con stickers, collab posts
      if (action.format === 'story') return false;
      if (action.collaborator) return false;
      return true;
    case 'comment_reply':
      // API soporta reply a comentarios
      return true;
    case 'read_insights':
      return true;
    case 'dm':
      // API no soporta enviar DMs (solo webhook externo)
      return false;
    case 'like':
    case 'comment':
    case 'follow':
      // API no soporta engagement en cuentas ajenas
      return false;
    default:
      return false;
  }
};

/**
 * Determina si una acción REQUIERE web/app (no hay alternativa API).
 */
const requiresWebOrApp = (action: RobotAction): boolean => {
  if (!canUseApiFor(action)) return true;
  return false;
};

/**
 * Score de confianza en una vía (0-100). Más alto = más probable que funcione.
 */
const getViaConfidence = (brand: BrandProfile, actionType: UnifiedActionType, via: ActionVia): number => {
  const h = getViaHistory(brand, actionType, via);
  const total = h.successCount + h.failureCount;
  if (total === 0) return 50; // neutral
  const successRate = h.successCount / total;
  // Penalizar si falló recientemente (últimas 5 min)
  const recentFailurePenalty = h.lastFailureAt && Date.now() - h.lastFailureAt < 5 * 60 * 1000 ? -30 : 0;
  return Math.max(0, Math.min(100, successRate * 100 + recentFailurePenalty));
};

/**
 * Decisión de vía con fallback planificado.
 */
interface ViaDecision {
  primary: ActionVia;
  fallbacks: ActionVia[];
  reason: string;
}

const decideVia = (action: RobotAction): ViaDecision => {
  const { brand } = action;
  const actionType = action.type;

  // Caso 1: API disponible y acción soportada → API first
  if (isApiAvailable() && canUseApiFor(action)) {
    const apiConfidence = getViaConfidence(brand, actionType, 'api');
    if (apiConfidence > 20) {
      return {
        primary: 'api',
        fallbacks: ['web', 'computer_use'],
        reason: 'API oficial disponible y soportada para esta acción',
      };
    }
  }

  // Caso 2: Requiere web/app → web primero, computer_use como recovery
  if (requiresWebOrApp(action)) {
    const webConfidence = getViaConfidence(brand, actionType, 'web');
    const cuConfidence = getViaConfidence(brand, actionType, 'computer_use');

    if (webConfidence >= cuConfidence) {
      return {
        primary: 'web',
        fallbacks: ['computer_use'],
        reason: 'Acción requiere navegador (no soportada por API). Playwright primero, Computer Use como recovery.',
      };
    }
    return {
      primary: 'computer_use',
      fallbacks: ['web'],
      reason: 'Acción requiere navegador. Computer Use tiene mejor historial reciente.',
    };
  }

  // Caso 3: API no disponible pero la acción teóricamente la soporta
  return {
    primary: 'web',
    fallbacks: ['computer_use'],
    reason: 'API no configurada. Fallback a navegador.',
  };
};

// ── Guardian context builder ──────────────────────────────────────────────────

const buildGuardianContext = (action: RobotAction): GuardianContext => {
  const base: GuardianContext = {
    actor: `robotMode:${action.type}`,
    humanInitiated: false,
  };

  switch (action.type) {
    case 'publish':
      base.contentText = action.caption;
      return base;
    case 'comment_reply':
      base.contentText = action.text;
      base.targetContentId = action.commentId;
      return base;
    case 'comment':
      base.contentText = action.text;
      base.targetContentId = action.postUrl;
      return base;
    case 'dm':
    case 'dm_reply':
      base.contentText = action.message;
      base.targetIgUserId = action.username;
      return base;
    case 'follow':
      base.targetIgUserId = action.username;
      return base;
    default:
      return base;
  }
};

const actionTypeToCategory = (action: RobotAction): ActionCategory => {
  switch (action.type) {
    case 'publish':
      return 'publish';
    case 'like':
      return 'like';
    case 'comment':
      return 'comment_external';
    case 'read_insights':
      return 'api_request';
    case 'comment_reply':
      return 'comment_reply';
    case 'dm':
      return 'dm';
    case 'dm_reply':
      return 'bot_auto_reply';
    case 'follow':
      return 'follow';
    case 'read_insights':
      return 'api_request';
    default:
      return 'api_request';
  }
};

// ── Ejecutores por vía ────────────────────────────────────────────────────────

/** Ejecuta publicación via API oficial */
const executePublishApi = async (action: PublishAction): Promise<RobotResult> => {
  const start = Date.now();
  const apiReq: ApiPublishRequest = {
    format:
      action.format === 'post' || action.format === 'carousel'
        ? 'carrusel'
        : action.format === 'reel'
          ? 'reel'
          : 'imagen',
    mediaUrls: action.mediaPaths,
    caption: [action.caption, ...(action.hashtags ?? [])].join(' '),
    scheduledAt: undefined,
    firstComment: '',
  };

  const result = await publishToInstagram(apiReq);

  return {
    ok: result.ok,
    via: 'api',
    actionType: 'publish',
    postId: result.postId,
    url: result.url,
    error: result.error,
    durationMs: Date.now() - start,
    riskScore: 0,
  };
};

// ── Router principal ──────────────────────────────────────────────────────────

/**
 * Ejecuta una acción de Instagram eligiendo automáticamente la vía más segura.
 *
 * Flujo:
 *   1. Rate limit check (unificado, global)
 *   2. Compliance Guardian evalúa la acción
 *   3. Decisión de vía (API → Web → Computer Use)
 *   4. GlassBox gate (supervised para vías riesgosas)
 *   5. Ejecución con fallback automático
 *   6. Registro de resultado para decisiones futuras
 */
export const executeRobotAction = async (action: RobotAction): Promise<RobotResult> => {
  const start = Date.now();
  const actionId = action.actionId ?? `robot-${Date.now()}`;
  const unifiedType = action.type as UnifiedActionType;

  // like/comment/follow/dm: la API oficial nunca las soporta sobre cuentas
  // ajenas, y la automatización por navegador/emulador está deshabilitada —
  // fallar rápido y claro, sin tocar un navegador ni un emulador.
  if (DISABLED_ACTION_TYPES.has(action.type)) {
    log.warn(`[RobotModeRouter] ${action.type} deshabilitado: ${DISABLED_REASON}`);
    return {
      ok: false,
      via: 'none',
      actionType: unifiedType,
      error: DISABLED_REASON,
      durationMs: Date.now() - start,
      riskScore: 0,
    };
  }
  if (action.type === 'publish' && requiresWebOrApp(action)) {
    const reason = `El formato "${action.format}"${action.collaborator ? ' con colaborador' : ''} no está soportado por la API oficial, y la publicación por navegador está deshabilitada por riesgo de baneo. Publicá esto manualmente.`;
    return {
      ok: false,
      via: 'none',
      actionType: unifiedType,
      error: reason,
      durationMs: Date.now() - start,
      riskScore: 0,
    };
  }
  if (action.type === 'publish' && !isApiAvailable()) {
    const reason =
      'La cuenta de Instagram no tiene credenciales de la API de Meta configuradas. Conectá la cuenta vía OAuth — no hay fallback por navegador.';
    return {
      ok: false,
      via: 'none',
      actionType: unifiedType,
      error: reason,
      durationMs: Date.now() - start,
      riskScore: 0,
    };
  }

  // Autocompletar accountCtx si no se proporcionó
  const accountCtx = action.accountCtx ?? buildAccountContext(action.brand);

  log.step(`[RobotModeRouter] Ejecutando ${action.type} (id: ${actionId}, día: ${accountCtx.robotAgeDays ?? 0})`);

  // Health check antes de operar
  const health = await preSessionHealthCheck();
  if (!health.ok) {
    log.warn(`[RobotModeRouter] Health check advierte: ${health.warnings.join('; ')}`);
  }

  // ── 1. Rate Limit Check ────────────────────────────────────────────────────
  const rateCheck = checkUnifiedRateLimit(unifiedType, accountCtx);
  if (!rateCheck.allowed) {
    log.warn(`[RobotModeRouter] Rate limit bloqueó ${action.type}: ${rateCheck.reason}`);
    return {
      ok: false,
      via: 'none',
      actionType: unifiedType,
      error: `Rate limit: ${rateCheck.reason}`,
      durationMs: Date.now() - start,
      riskScore: 0,
    };
  }

  // ── 2. Compliance Guardian ─────────────────────────────────────────────────
  const guardianCtx = buildGuardianContext(action);
  const guardianDecision = evaluate(actionTypeToCategory(action), guardianCtx);
  if (!guardianDecision.allowed) {
    log.error(`[RobotModeRouter] Guardian bloqueó ${action.type}: ${guardianDecision.reason}`);
    return {
      ok: false,
      via: 'none',
      actionType: unifiedType,
      error: `Compliance: ${guardianDecision.reason}`,
      durationMs: Date.now() - start,
      riskScore: guardianDecision.riskScore,
    };
  }

  // ── 3. Decisión de vía ─────────────────────────────────────────────────────
  const viaDecision = decideVia(action);
  log.info(`[RobotModeRouter] Vía elegida: ${viaDecision.primary} (fallbacks: ${viaDecision.fallbacks.join(', ')})`);

  // ── 4. Ejecución con fallback ──────────────────────────────────────────────
  const viasToTry: ActionVia[] = [viaDecision.primary, ...viaDecision.fallbacks];
  let lastError: string | undefined;

  for (const via of viasToTry) {
    const viaStart = Date.now();

    // GlassBox gate (más estricto para vías riesgosas)
    const gateResult = await actionGate(
      `robot_${action.type}_${via}`,
      `RobotMode: ${action.type} vía ${via} para ${action.brand.name}`,
      async () => {
        // Ejecutar la acción
        let result: RobotResult;

        switch (action.type) {
          case 'publish':
            // El guard de arriba ya garantiza via === 'api' acá (web deshabilitado).
            result = await executePublishApi(action);
            break;
          default:
            result = {
              ok: false,
              via,
              actionType: unifiedType,
              error: `Acción ${action.type} no implementada para vía ${via}`,
              durationMs: Date.now() - viaStart,
              riskScore: 0,
            };
        }

        // Verificar si la respuesta contiene indicadores de bloqueo
        if (result.error) {
          await checkResponseForBlocks(result.error, `${action.type} vía ${via}`);
        }

        return result;
      },
      {
        source: 'robot-mode-router',
        correlationId: actionId,
        actionCategory: actionTypeToCategory(action),
        guardianContext: guardianCtx,
        timeoutMs: 300_000,
      },
    );

    if (!gateResult.ok) {
      lastError = `GlassBox bloqueó: ${gateResult.reason}`;
      recordViaResult(action.brand, unifiedType, via, false, lastError);
      recordWarmupAction(action.brand, false);
      continue; // intentar fallback
    }

    const result = gateResult.result as RobotResult;

    if (result.ok) {
      // Éxito: registrar y retornar
      recordUnifiedAction(unifiedType, via, accountCtx);
      recordSuccess(actionTypeToCategory(action), guardianCtx, actionId);
      recordViaResult(action.brand, unifiedType, via, true);
      recordWarmupAction(action.brand, true);

      log.success(`[RobotModeRouter] ${action.type} OK vía ${via} en ${Date.now() - start}ms`);
      return {
        ...result,
        durationMs: Date.now() - start,
        riskScore: guardianDecision.riskScore,
        glassboxActionId: gateResult.actionId,
        fallbackUsed: via !== viaDecision.primary,
      };
    }

    // Falló esta vía, registrar e intentar fallback
    lastError = result.error ?? `Fallo en vía ${via}`;
    recordViaResult(action.brand, unifiedType, via, false, lastError);
    recordFailure(actionTypeToCategory(action), guardianCtx, lastError);
    recordWarmupAction(action.brand, false);
    log.warn(`[RobotModeRouter] ${action.type} falló vía ${via}: ${lastError}. Intentando fallback...`);
  }

  // Todas las vías fallaron
  log.error(`[RobotModeRouter] ${action.type} falló en todas las vías. Último error: ${lastError}`);
  return {
    ok: false,
    via: 'none',
    actionType: unifiedType,
    error: `Todas las vías fallaron. Último error: ${lastError}`,
    durationMs: Date.now() - start,
    riskScore: guardianDecision.riskScore,
  };
};

// ── Queries ───────────────────────────────────────────────────────────────────

/**
 * Devuelve el estado actual del router para una marca.
 */
export const getRobotModeStatus = (
  brand: BrandProfile,
): {
  apiAvailable: boolean;
  history: Record<string, Record<ActionVia, ViaHistory>>;
} => ({
  apiAvailable: isApiAvailable(),
  history: viaHistory[getHistoryKey(brand, 'publish')]
    ? { [getHistoryKey(brand, 'publish')]: viaHistory[getHistoryKey(brand, 'publish')]! }
    : {},
});

/**
 * Resetea el historial de una marca (útil para tests).
 */
export const clearRobotModeHistory = (brand?: BrandProfile): void => {
  if (brand) {
    const prefix = `${brand.name}:`;
    for (const key of Object.keys(viaHistory)) {
      if (key.startsWith(prefix)) delete viaHistory[key];
    }
  } else {
    for (const key of Object.keys(viaHistory)) {
      delete viaHistory[key];
    }
  }
};
