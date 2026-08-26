/**
 * Audit Logger Service
 * Logs all user actions with retention policies
 * Week 3: Compliance layer
 */

import { executeMutation, queryAs, log as dbLog } from '../db/typed-queries.js';
import { log } from '../agent/logger.js';

interface AuditEvent {
  user_id: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  details: Record<string, unknown>;
  ip_address?: string;
  user_agent?: string;
  status: 'success' | 'failure';
  timestamp?: Date;
}

interface AuditLogRow {
  id: string;
  user_id: string;
  action: string;
  resource_type: string;
  resource_id?: string | null;
  details?: string; // JSON
  ip_address?: string | null;
  user_agent?: string | null;
  status: string;
  created_at?: string;
}

class AuditLogger {
  /**
   * Log audit event
   */
  async log(event: AuditEvent): Promise<void> {
    try {
      await executeMutation(
        `INSERT INTO audit_logs (user_id, action, resource_type, resource_id, details, ip_address, user_agent, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          event.user_id,
          event.action,
          event.resource_type,
          event.resource_id || null,
          JSON.stringify(event.details),
          event.ip_address || null,
          event.user_agent || null,
          event.status,
        ],
      );

      log.info(`Audit logged: ${event.action}`, {
        user_id: event.user_id,
        resource_type: event.resource_type,
      });
    } catch (err) {
      log.info('Error logging audit event', { error: err });
      // Don't throw - audit failure shouldn't break operation
    }
  }

  /**
   * Get audit logs for user (Pro+ only)
   */
  async getUserLogs(userId: string, limit = 100, offset = 0): Promise<AuditLogRow[]> {
    try {
      return queryAs<AuditLogRow>(
        `SELECT id, action, resource_type, resource_id, details, ip_address, user_agent, status, created_at
         FROM audit_logs
         WHERE user_id = $1
         ORDER BY created_at DESC
         LIMIT $2 OFFSET $3`,
        [userId, limit, offset],
      );
    } catch (err) {
      log.info('Error fetching audit logs', { userId, error: err });
      return [];
    }
  }

  /**
   * Search audit logs by action or resource
   */
  async searchLogs(userId: string, query: string, limit = 50): Promise<AuditLogRow[]> {
    try {
      return queryAs<AuditLogRow>(
        `SELECT id, action, resource_type, resource_id, details, status, created_at
         FROM audit_logs
         WHERE user_id = $1 AND (action ILIKE $2 OR resource_type ILIKE $2)
         ORDER BY created_at DESC
         LIMIT $3`,
        [userId, `%${query}%`, limit],
      );
    } catch (err) {
      log.info('Error searching audit logs', { userId, error: err });
      return [];
    }
  }

  /**
   * Delete old audit logs based on retention policy
   */
  async cleanupOldLogs(): Promise<number> {
    try {
      // Get retention policies per user plan
      const deleted = await executeMutation(
        `DELETE FROM audit_logs
         WHERE (
           (SELECT plan FROM users WHERE id = user_id) = 'free' AND created_at < NOW() - INTERVAL '90 days'
         ) OR (
           (SELECT plan FROM users WHERE id = user_id) = 'pro' AND created_at < NOW() - INTERVAL '365 days'
         ) OR (
           (SELECT plan FROM users WHERE id = user_id) = 'premium' AND created_at < NOW() - INTERVAL '2555 days'
         )`,
      );

      log.info('Cleaned up old audit logs', { deleted });
      return deleted;
    } catch (err) {
      log.info('Error cleaning up audit logs', { error: err });
      return 0;
    }
  }

  /**
   * Export audit logs for GDPR (all user data)
   */
  async exportUserData(userId: string): Promise<Record<string, unknown> | null> {
    try {
      const logs = await queryAs<AuditLogRow>(
        `SELECT * FROM audit_logs WHERE user_id = $1 ORDER BY created_at ASC`,
        [userId],
      );

      const userRow = await queryAs<Record<string, unknown>>(
        `SELECT * FROM users WHERE id = $1`,
        [userId],
      );

      const carousels = await queryAs<Record<string, unknown>>(
        `SELECT * FROM carousels WHERE user_id = $1 ORDER BY created_at ASC`,
        [userId],
      );

      return {
        user: userRow[0] || null,
        audit_logs: logs,
        carousels,
        export_date: new Date().toISOString(),
      };
    } catch (err) {
      log.info('Error exporting user data', { userId, error: err });
      return null;
    }
  }
}

export const auditLogger = new AuditLogger();
