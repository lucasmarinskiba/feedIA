/**
 * Audit Log para acciones de Instagram
 *
 * Toda acción que interactúe con Instagram debe ser registrada aquí.
 * Esto permite:
 * - Demostrar cumplimiento ante Meta si se cuestiona una acción
 * - Debugging de problemas de cuenta
 * - Detección de patrones anómalos
 * - Transparencia para los usuarios del sistema
 */

import { appendFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { log } from '../agent/logger.js';

const AUDIT_DIR = resolve('data/runtime/audit');

export type AuditAction =
  | 'PUBLISH'
  | 'SEND_DM'
  | 'REPLY_COMMENT'
  | 'DELETE_COMMENT'
  | 'LIKE'
  | 'FOLLOW'
  | 'UNFOLLOW'
  | 'STORY_REACT'
  | 'COMMENT_EXTERNAL'
  | 'API_REQUEST'
  | 'BOT_REPLY'
  | 'NURTURE_SEND'
  | 'WEBHOOK_RECEIVE'
  | 'COMPLIANCE_BLOCKED'
  | 'COMPLIANCE_WARNING';

export type AuditOutcome = 'success' | 'failure' | 'blocked' | 'dry_run';

export interface AuditEntry {
  /** Timestamp ISO 8601 */
  timestamp: string;
  /** Identificador único de la entrada */
  id: string;
  /** Tipo de acción */
  action: AuditAction;
  /** Resultado */
  outcome: AuditOutcome;
  /** ID de usuario/destinatario (si aplica) */
  targetUserId?: string;
  /** ID del post/comentario (si aplica) */
  targetContentId?: string;
  /** Resumen del contenido (truncado, nunca datos sensibles) */
  contentSummary?: string;
  /** Razón de bloqueo o fallo */
  reason?: string;
  /** Reglas de compliance involucradas */
  complianceRules?: string[];
  /** Rate limit info */
  rateLimitInfo?: {
    currentCount: number;
    limit: number;
  };
  /** Versión del sistema */
  systemVersion: string;
  /** DRY_RUN mode */
  dryRun?: boolean;
}

const ensureAuditDir = (): void => {
  if (!existsSync(AUDIT_DIR)) mkdirSync(AUDIT_DIR, { recursive: true });
};

const getAuditFilePath = (): string => {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10); // YYYY-MM-DD
  return resolve(AUDIT_DIR, `audit-${dateStr}.ndjson`);
};

const generateId = (): string => {
  const now = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 8);
  return `${now}-${rand}`;
};

/**
 * Registra una entrada en el audit log.
 * Esta función es síncrona para garantizar que no se pierdan eventos.
 */
export const audit = (entry: Omit<AuditEntry, 'timestamp' | 'id' | 'systemVersion'>): void => {
  try {
    ensureAuditDir();

    const fullEntry: AuditEntry = {
      ...entry,
      timestamp: new Date().toISOString(),
      id: generateId(),
      systemVersion: process.env.npm_package_version ?? '0.1.0',
    };

    const line = JSON.stringify(fullEntry) + '\n';
    appendFileSync(getAuditFilePath(), line, 'utf-8');

    // También loguear eventos importantes al logger principal
    if (entry.outcome === 'blocked' || entry.outcome === 'failure') {
      log.warn(`[AUDIT] ${entry.action} ${entry.outcome}${entry.reason ? `: ${entry.reason}` : ''}`);
    } else if (entry.action === 'PUBLISH' || entry.action === 'SEND_DM') {
      log.info(`[AUDIT] ${entry.action} ${entry.outcome}${entry.dryRun ? ' [DRY_RUN]' : ''}`);
    }
  } catch (err) {
    // Nunca debe fallar el audit log, pero registramos el error
    log.error(`[AUDIT] Fallo al escribir audit log: ${err instanceof Error ? err.message : String(err)}`);
  }
};

/**
 * Helper para registrar un intento bloqueado por compliance.
 */
export const auditBlocked = (
  _action: AuditAction,
  reason: string,
  options?: {
    targetUserId?: string;
    targetContentId?: string;
    contentSummary?: string;
    complianceRules?: string[];
    dryRun?: boolean;
  },
): void => {
  audit({
    action: 'COMPLIANCE_BLOCKED',
    outcome: 'blocked',
    reason,
    ...options,
  });
};

/**
 * Helper para registrar una advertencia de compliance.
 */
export const auditWarning = (
  _action: AuditAction,
  reason: string,
  options?: {
    targetUserId?: string;
    targetContentId?: string;
    contentSummary?: string;
    complianceRules?: string[];
    dryRun?: boolean;
  },
): void => {
  audit({
    action: 'COMPLIANCE_WARNING',
    outcome: 'failure',
    reason,
    ...options,
  });
};

/**
 * Sanitiza contenido para el audit log.
 * Nunca almacenar datos personales completos (emails, teléfonos, DNI, etc.)
 */
export const sanitizeForAudit = (text: string, maxLength = 200): string => {
  if (!text) return '';

  // Truncar
  let sanitized = text.slice(0, maxLength);
  if (text.length > maxLength) sanitized += '...';

  // Ocultar posibles datos personales
  // Emails
  sanitized = sanitized.replace(/\S+@\S+\.\S+/g, '[EMAIL]');
  // Teléfonos (patrones comunes)
  sanitized = sanitized.replace(/\+?\d[\d\s\-]{7,20}\d/g, '[TEL]');
  // Números largos (posibles DNI/CUIT/tarjetas)
  sanitized = sanitized.replace(/\b\d{8,}\b/g, '[NUM]');

  return sanitized;
};
