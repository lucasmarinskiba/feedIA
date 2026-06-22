/**
 * GlassBox — Caja de Cristal
 * ─────────────────────────────────────────────────────────────────────────
 * Sistema de supervisión en tiempo real del agente. Cada acción atómica
 * pasa por un gate de aprobación antes de ejecutarse.
 *
 * Exporta:
 *   • Supervisor: actionGate, modo, aprobar/rechazar/modificar
 *   • ActionStream: SSE para dashboard en tiempo real
 *   • ComplianceBridge: evaluación automática de reglas Instagram
 */

export {
  actionGate,
  approveAction,
  rejectAction,
  modifyAction,
  approveAllPending,
  rejectAllPending,
  getMode,
  setMode,
  pause,
  resume,
  getPendingActions,
  getActionHistory,
  getAction,
  getStatus,
  onModeChange,
  type GlassBoxMode,
  type ActionRequest,
  type ActionStatus,
  type GateOptions,
  type GateResult,
} from './supervisor.js';

export {
  subscribe as subscribeActionStream,
  emitActionPending,
  emitActionApproved,
  emitActionRejected,
  emitActionModified,
  emitActionExecuting,
  emitActionCompleted,
  emitActionFailed,
  emitScreenshotUpdate,
  getPeerCount,
  type GbStreamEvent,
} from './actionStream.js';

export {
  evaluateAction,
  requiresForcedSupervision,
  getViolationDetails,
  type ComplianceResult,
} from './complianceBridge.js';
