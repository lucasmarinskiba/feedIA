/**
 * Sistema de Alertas Proactivas de Compliance
 *
 * Monitorea el estado del sistema y envía alertas cuando:
 * - Rate limits se acercan a la saturación
 * - El guardian bloquea acciones
 * - Hay cambios de configuración riesgosos
 * - El contenido generado tiene score de riesgo elevado
 *
 * Uso:
 *   import { checkAndAlert } from './compliance/alerts.js';
 *   await checkAndAlert(); // corre todas las verificaciones de alerta
 */

import { env } from '../config/index.js';
import { log } from '../agent/logger.js';
import { sendAlert } from '../integrations/notifications.js';
import { getRateLimitStats } from './rateLimiter.js';
import { audit } from './auditLog.js';

export type AlertSeverity = 'info' | 'warning' | 'critical';

export interface ComplianceAlert {
  id: string;
  timestamp: string;
  severity: AlertSeverity;
  category: 'rate-limit' | 'compliance-block' | 'security' | 'content-risk' | 'configuration';
  title: string;
  message: string;
  recommendation: string;
  acknowledged: boolean;
}

// const ALERT_HISTORY_FILE = 'data/runtime/alerts.json'; // persistencia futura

let alertHistory: ComplianceAlert[] = [];

const generateAlertId = (): string => `ALT-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

const shouldThrottle = (category: string, minMinutes = 30): boolean => {
  const cutoff = Date.now() - minMinutes * 60 * 1000;
  const recent = alertHistory.filter((a) => a.category === category && new Date(a.timestamp).getTime() > cutoff);
  return recent.length > 0;
};

/** 1. Alerta si rate limits están cerca de saturación */
export const alertRateLimits = async (): Promise<ComplianceAlert | null> => {
  const stats = getRateLimitStats();
  const entries = Object.entries(stats);
  if (entries.length === 0) return null;

  const critical = entries.filter(([, s]) => s.count / s.limit >= 0.95);
  const warning = entries.filter(([, s]) => {
    const pct = s.count / s.limit;
    return pct >= 0.8 && pct < 0.95;
  });

  if (critical.length > 0 && !shouldThrottle('rate-limit-critical', 15)) {
    const alert: ComplianceAlert = {
      id: generateAlertId(),
      timestamp: new Date().toISOString(),
      severity: 'critical',
      category: 'rate-limit',
      title: `Rate limit CRÍTICO: ${critical.length} acciones al 95%+`,
      message: critical.map(([k, s]) => `${k}: ${s.count}/${s.limit}`).join('; '),
      recommendation:
        'Pausar operaciones hasta que los límites se reseteen. Revisar si hay un loop o comportamiento anómalo.',
      acknowledged: false,
    };
    return alert;
  }

  if (warning.length > 0 && !shouldThrottle('rate-limit-warning', 60)) {
    const alert: ComplianceAlert = {
      id: generateAlertId(),
      timestamp: new Date().toISOString(),
      severity: 'warning',
      category: 'rate-limit',
      title: `Rate limit elevado: ${warning.length} acciones al 80%+`,
      message: warning.map(([k, s]) => `${k}: ${s.count}/${s.limit}`).join('; '),
      recommendation: 'Reducir frecuencia de acciones o esperar a que se reseteen los límites.',
      acknowledged: false,
    };
    return alert;
  }

  return null;
};

/** 2. Alerta si hay bloqueos de compliance recientes */
export const alertComplianceBlocks = async (): Promise<ComplianceAlert | null> =>
  // Esta función se integra con el audit log
  // En una implementación completa, leería el audit log de las últimas horas
  // Por ahora, es un stub que puede ser llamado desde el guardian
  null;

/** 3. Alerta de seguridad: configuración cambiada */
export const alertSecurityConfig = async (): Promise<ComplianceAlert | null> => {
  if (!env.compliance.acceptedTerms && !shouldThrottle('security-terms', 1440)) {
    const alert: ComplianceAlert = {
      id: generateAlertId(),
      timestamp: new Date().toISOString(),
      severity: 'critical',
      category: 'security',
      title: 'Términos de compliance no aceptados',
      message: 'COMPLIANCE_ACCEPTED_TERMS=false. El sistema está operando sin aceptación explícita de términos.',
      recommendation: 'Leer TERMS_OF_SERVICE.md y configurar COMPLIANCE_ACCEPTED_TERMS=true.',
      acknowledged: false,
    };
    return alert;
  }

  if (!env.compliance.strictMode && !shouldThrottle('security-strict', 1440)) {
    const alert: ComplianceAlert = {
      id: generateAlertId(),
      timestamp: new Date().toISOString(),
      severity: 'warning',
      category: 'configuration',
      title: 'Modo estricto desactivado',
      message: 'COMPLIANCE_STRICT_MODE=false. El sistema permite violaciones de severidad MEDIA.',
      recommendation: 'Considerar activar COMPLIANCE_STRICT_MODE=true para máxima protección.',
      acknowledged: false,
    };
    return alert;
  }

  return null;
};

/** 4. Alerta de contenido de riesgo medio-alto */
export const alertContentRisk = (riskScore: number, contentSummary: string): ComplianceAlert | null => {
  if (riskScore >= 60 && !shouldThrottle('content-risk', 30)) {
    const alert: ComplianceAlert = {
      id: generateAlertId(),
      timestamp: new Date().toISOString(),
      severity: 'warning',
      category: 'content-risk',
      title: `Contenido con score de riesgo alto: ${riskScore}/100`,
      message: `Contenido: "${contentSummary.slice(0, 100)}..."`,
      recommendation: 'Revisar manualmente antes de aprobar. Considerar regenerar con prompts más seguros.',
      acknowledged: false,
    };
    return alert;
  }
  return null;
};

/** Enviar alerta por Slack/webhook */
export const dispatchAlert = async (alert: ComplianceAlert): Promise<void> => {
  alertHistory.push(alert);

  // Limitar historial a últimas 100 alertas
  if (alertHistory.length > 100) {
    alertHistory = alertHistory.slice(-100);
  }

  log.warn(`[ALERTA ${alert.severity.toUpperCase()}] ${alert.title}: ${alert.message}`);

  audit({
    action: 'COMPLIANCE_WARNING',
    outcome: 'failure',
    reason: `[${alert.severity}] ${alert.title}: ${alert.message}`,
    dryRun: env.dryRun,
  });

  // Enviar notificación si está configurada
  try {
    await sendAlert({
      severity: alert.severity === 'critical' ? 'crisis' : alert.severity === 'warning' ? 'warn' : 'info',
      title: alert.title,
      body: `${alert.message}\n\nRecomendación: ${alert.recommendation}`,
    });
  } catch (err) {
    log.error(`No se pudo enviar alerta a Slack: ${err instanceof Error ? err.message : String(err)}`);
  }
};

/** Ejecutar todas las verificaciones de alerta */
export const checkAndAlert = async (): Promise<ComplianceAlert[]> => {
  const triggered: ComplianceAlert[] = [];

  const rateLimitAlert = await alertRateLimits();
  if (rateLimitAlert) {
    await dispatchAlert(rateLimitAlert);
    triggered.push(rateLimitAlert);
  }

  const securityAlert = await alertSecurityConfig();
  if (securityAlert) {
    await dispatchAlert(securityAlert);
    triggered.push(securityAlert);
  }

  const blockAlert = await alertComplianceBlocks();
  if (blockAlert) {
    await dispatchAlert(blockAlert);
    triggered.push(blockAlert);
  }

  return triggered;
};

/** Obtener historial de alertas */
export const getAlertHistory = (limit = 50): ComplianceAlert[] => alertHistory.slice(-limit);

/** Acknowledge una alerta */
export const acknowledgeAlert = (alertId: string): boolean => {
  const alert = alertHistory.find((a) => a.id === alertId);
  if (alert) {
    alert.acknowledged = true;
    return true;
  }
  return false;
};
