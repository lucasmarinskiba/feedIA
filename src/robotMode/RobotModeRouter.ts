/**
 * RobotModeRouter — Orquestador inteligente de acciones de Instagram.
 *
 * Filosofía del Robot Cauteloso:
 *   1. API oficial de Meta PRIMERO (100% segura, aprobada por Meta)
 *   2. Playwright/Web SEGUNDO (para lo que la API no permite)
 *   3. Computer Use ÚLTIMO RECURSO (recovery ante cambios de UI)
 *
 * Cada acción pasa por:
 *   • UnifiedRateLimiter (límites globales por tier + warmup)
 *   • Compliance Guardian (reglas de Instagram)
 *   • GlassBox Gate (supervised para vías riesgosas)
 *   • Ejecución con fallback automático entre vías
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
import { seguirCuenta, comentarEnPost, darLike, enviarDM } from '../capabilities/computerUse/instagramActions.js';

// ── Integraciones existentes ──────────────────────────────────────────────────

import { publishToInstagram } from '../integrations/meta.js';
import type { PublishRequest as ApiPublishRequest } from '../integrations/meta.js';
import { InstagramWebOperator } from '../browserOperators/instagram/instagramWebOperator.js';

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

/** Ejecuta publicación via Web (Playwright) */
const executePublishWeb = async (action: PublishAction): Promise<RobotResult> => {
  const start = Date.now();
  const operator = new InstagramWebOperator({ brand: action.brand, headless: false, dryRun: env.dryRun });

  try {
    if (action.format === 'post' || action.format === 'carousel') {
      const result = await operator.publishPost({
        imagePaths: action.mediaPaths,
        caption: action.caption,
        hashtags: action.hashtags,
        altText: action.altText,
        location: action.location,
        collaborator: action.collaborator,
      });
      return {
        ok: result.ok,
        via: 'web',
        actionType: 'publish',
        error: result.error,
        durationMs: Date.now() - start,
        riskScore: 15,
      };
    }

    if (action.format === 'reel') {
      const result = await operator.publishReel({
        videoPath: action.mediaPaths[0]!,
        caption: action.caption,
        audioName: action.audioName,
        shareToFeed: action.shareToFeed,
      });
      return {
        ok: result.ok,
        via: 'web',
        actionType: 'publish',
        error: result.error,
        durationMs: Date.now() - start,
        riskScore: 15,
      };
    }

    if (action.format === 'story') {
      const result = await operator.publishStory({
        mediaPath: action.mediaPaths[0]!,
      });
      return {
        ok: result.ok,
        via: 'web',
        actionType: 'publish',
        error: result.error,
        durationMs: Date.now() - start,
        riskScore: 15,
      };
    }

    return {
      ok: false,
      via: 'web',
      actionType: 'publish',
      error: `Formato no soportado: ${action.format}`,
      durationMs: Date.now() - start,
      riskScore: 0,
    };
  } finally {
    await operator.closeSession();
  }
};

/** Ejecuta like via Web (la API no lo soporta para cuentas ajenas) */
const executeLikeWeb = async (action: LikeAction): Promise<RobotResult> => {
  const start = Date.now();
  const operator = new InstagramWebOperator({ brand: action.brand, headless: false, dryRun: env.dryRun });

  try {
    const result = await operator.likePost(action.postUrl);
    return {
      ok: result.ok,
      via: 'web',
      actionType: 'like',
      error: result.error,
      durationMs: Date.now() - start,
      riskScore: 20,
    };
  } finally {
    await operator.closeSession();
  }
};

/** Ejecuta comment via Web */
const executeCommentWeb = async (action: CommentAction): Promise<RobotResult> => {
  const start = Date.now();
  const operator = new InstagramWebOperator({ brand: action.brand, headless: false, dryRun: env.dryRun });

  try {
    const result = await operator.commentOnPost(action.postUrl, action.text);
    return {
      ok: result.ok,
      via: 'web',
      actionType: 'comment',
      error: result.error,
      durationMs: Date.now() - start,
      riskScore: 25,
    };
  } finally {
    await operator.closeSession();
  }
};

/** Ejecuta follow via Computer Use (la API no lo soporta y Web tampoco tiene método) */
const executeFollowComputerUse = async (action: FollowAction): Promise<RobotResult> => {
  const start = Date.now();
  const result = await seguirCuenta(action.brand, action.username);
  return {
    ok: result.ok,
    via: 'computer_use',
    actionType: 'follow',
    error: result.error,
    durationMs: Date.now() - start,
    riskScore: 30,
  };
};

/** Ejecuta like via Computer Use (recovery cuando web falla) */
const executeLikeComputerUse = async (action: LikeAction): Promise<RobotResult> => {
  const start = Date.now();
  const result = await darLike(action.brand, action.postUrl);
  return {
    ok: result.ok,
    via: 'computer_use',
    actionType: 'like',
    error: result.error,
    durationMs: Date.now() - start,
    riskScore: 25,
  };
};

/** Ejecuta comment via Computer Use (recovery cuando web falla) */
const executeCommentComputerUse = async (action: CommentAction): Promise<RobotResult> => {
  const start = Date.now();
  const result = await comentarEnPost(action.brand, {
    postUrl: action.postUrl,
    commentText: action.text,
  });
  return {
    ok: result.ok,
    via: 'computer_use',
    actionType: 'comment',
    error: result.error,
    durationMs: Date.now() - start,
    riskScore: 25,
  };
};

/** Ejecuta DM via Computer Use (recovery cuando web falla) */
const executeDmComputerUse = async (action: SendDMAction): Promise<RobotResult> => {
  const start = Date.now();
  const result = await enviarDM(action.brand, {
    username: action.username,
    message: action.message,
  });
  return {
    ok: result.ok,
    via: 'computer_use',
    actionType: 'dm',
    error: result.error,
    durationMs: Date.now() - start,
    riskScore: 25,
  };
};

/** Ejecuta DM via Web */
const executeDmWeb = async (action: SendDMAction): Promise<RobotResult> => {
  const start = Date.now();
  const operator = new InstagramWebOperator({ brand: action.brand, headless: false, dryRun: env.dryRun });

  try {
    const result = await operator.sendDM(action.username, action.message);
    return {
      ok: result.ok,
      via: 'web',
      actionType: 'dm',
      error: result.error,
      durationMs: Date.now() - start,
      riskScore: 25,
    };
  } finally {
    await operator.closeSession();
  }
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
            if (via === 'api') result = await executePublishApi(action);
            else result = await executePublishWeb(action);
            break;
          case 'like':
            if (via === 'computer_use') result = await executeLikeComputerUse(action);
            else result = await executeLikeWeb(action);
            break;
          case 'comment':
            if (via === 'computer_use') result = await executeCommentComputerUse(action);
            else result = await executeCommentWeb(action);
            break;
          case 'dm':
            if (via === 'computer_use') result = await executeDmComputerUse(action);
            else result = await executeDmWeb(action);
            break;
          case 'follow':
            result = await executeFollowComputerUse(action);
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
