/**
 * Instagram Compliance Module
 *
 * Sistema integral de cumplimiento para operaciones en Instagram.
 * Protege las cuentas de clientes garantizando que todas las acciones
 * respeten los Términos de Uso, Estándares de Comunidad y Developer Policies
 * de Meta/Instagram.
 *
 * Uso básico:
 *   import { guardian } from './compliance/index.js';
 *
 *   const decision = guardian.evaluate('publish', {
 *     actor: 'pipeline:brief-to-publish',
 *     contentText: caption,
 *     humanInitiated: false,
 *   });
 *
 *   if (!decision.allowed) {
 *     console.log('Bloqueado:', decision.reason);
 *     console.log('Recomendaciones:', decision.recommendations);
 *     return;
 *   }
 *
 *   // Ejecutar acción...
 *   guardian.recordSuccess('publish', ctx, postId);
 */

export { INSTAGRAM_RULES, CRITICAL_RULE_CODES, getRulesByCategory } from './instagramRules.js';
export type { InstagramRule, RuleSeverity, RuleCategory } from './instagramRules.js';

export { evaluate, recordSuccess, recordFailure, RATE_LIMITS } from './guardian.js';
export type { GuardianDecision, GuardianContext, ActionCategory } from './guardian.js';

export { checkRateLimit, recordAction, checkAndRecord, resetRateLimits, getRateLimitStats } from './rateLimiter.js';
export type { ActionType, RateLimitCheck } from './rateLimiter.js';

export { audit, auditBlocked, auditWarning, sanitizeForAudit } from './auditLog.js';
export type { AuditEntry, AuditAction, AuditOutcome } from './auditLog.js';

export {
  runPreFlightCheck,
  verifyTermsAccepted,
  verifyEnvConfig,
  verifyDryRunState,
  verifyAuditLogWritable,
  verifyDiskSpace,
  verifyRateLimitStatus,
  verifyComplianceRulesLoaded,
  verifyBrandProfile,
  verifyStrictMode,
  verifyNoAntiBanModules,
} from './preflight.js';
export type { PreFlightCheck, PreFlightReport, PreFlightStatus } from './preflight.js';

export {
  runHealthChecks,
  checkDiskSpace,
  checkRateLimits,
  checkMetaApi,
  checkTermsAccepted,
  checkCrisisState,
  checkBackup,
  checkDryRunDuration,
} from './healthCheck.js';
export type { HealthCheck, HealthReport, HealthStatus } from './healthCheck.js';

export {
  checkAndAlert,
  alertRateLimits,
  alertSecurityConfig,
  alertContentRisk,
  dispatchAlert,
  getAlertHistory,
  acknowledgeAlert,
} from './alerts.js';
export type { ComplianceAlert, AlertSeverity } from './alerts.js';

export { runWeeklyAudit, runMonthlyAudit, runQuarterlyAudit } from './auditor.js';
export type { AuditReport } from './auditor.js';

export { emergencyStop, resumeOperations, isEmergencyActive, checkEmergencyBeforeAction } from './emergency.js';
export type { EmergencyState } from './emergency.js';

export { createBackup, listBackups, restoreBackup, purgeOldBackups } from './backup.js';
export type { BackupEntry } from './backup.js';

export { runDisasterRecovery, createEmergencyBackup } from './disasterRecovery.js';
export type { RecoveryReport } from './disasterRecovery.js';

export { generateClientReport, sendWeeklyClientReport } from './clientReports.js';
export type { ClientReport } from './clientReports.js';

export { trackVersion, getVersions, approveVersion, rejectVersion, compareVersions } from './contentVersions.js';
export type { ContentVersion, ContentHistory } from './contentVersions.js';

export {
  recordWebhookEvent,
  recordApiCall,
  analyzeWebhookHealth,
  analyzeApiHealth,
  getMonitoringStats,
} from './webhookMonitor.js';
export type { WebhookEvent, ApiCall } from './webhookMonitor.js';
