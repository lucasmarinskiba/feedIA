/**
 * RobotMode — Modo Robot Cauteloso para Instagram
 *
 * Orquestador inteligente que elige la vía más segura para cada acción:
 *   API oficial → Playwright web → Computer Use (recovery)
 *
 * Exporta:
 *   • executeRobotAction: ejecuta cualquier acción con routing automático
 *   • checkUnifiedRateLimit: verifica límites globales antes de actuar
 *   • getRemainingActionsToday: cuántas acciones quedan hoy
 *   • getUnifiedStats: estadísticas de rate limiting
 */

export { executeRobotAction, getRobotModeStatus, clearRobotModeHistory } from './RobotModeRouter.js';
export type {
  RobotAction,
  RobotResult,
  PublishAction,
  LikeAction,
  CommentAction,
  ReplyCommentAction,
  SendDMAction,
  ReplyDMAction,
  FollowAction,
  ReadInsightsAction,
} from './RobotModeRouter.js';

export {
  checkUnifiedRateLimit,
  recordUnifiedAction,
  checkAndRecordUnified,
  getUnifiedStats,
  getRemainingActionsToday,
  calculateWarmupFactor,
} from './unifiedRateLimiter.js';
export type {
  UnifiedActionType,
  ActionVia,
  AccountContext,
  UnifiedRateLimitCheck,
  WarmupConfig,
} from './unifiedRateLimiter.js';

export {
  buildAccountContext,
  recordWarmupAction,
  getWarmupState,
  getWarmupStats,
  addWarmupAlert,
  resetWarmupState,
} from './warmupTracker.js';
export type { WarmupState } from './warmupTracker.js';

export {
  scanForBlocks,
  checkResponseForBlocks,
  triggerKillSwitch,
  setKillSwitch,
  isKillSwitchEnabled,
  preSessionHealthCheck,
  analyzeShadowbanSignals,
} from './blockDetection.js';
export type { BlockIndicator, BlockScanResult, BlockSeverity, ShadowbanSignals } from './blockDetection.js';
