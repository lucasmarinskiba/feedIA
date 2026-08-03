/**
 * Audit Logger Service
 * Logs all user actions with retention policies
 * Week 3: Compliance layer
 */

import { carouselDB } from '../db/postgres.js';
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

class AuditLogger {
  /**
   * Log audit event
   */
  async log(event: AuditEvent): Promise<void> {
    try {
      const pool = (carouselDB as any).pool;
      if (!pool) {
        log.info('Warning: PostgreSQL pool not available for audit logging');
        return;
      }

      await pool.query(
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
  async getUserLogs(userId: string, limit = 100, offset = 0) {
    try {
      const pool = (carouselDB as any).pool;
      if (!pool) {
        return [];
      }

      const result = await pool.query(
        `SELECT id, action, resource_type, resource_id, details, ip_address, user_agent, status, created_at
         FROM audit_logs
         WHERE user_id = $1
         ORDER BY created_at DESC
         LIMIT $2 OFFSET $3`,
        [userId, limit, offset],
      );

      return result.rows;
    } catch (err) {
      log.info('Error fetching audit logs', { userId, error: err });
      return [];
    }
  }

  /**
   * Search audit logs by action or resource
   */
  async searchLogs(userId: string, query: string, limit = 50) {
    try {
      const pool = (carouselDB as any).pool;
      if (!pool) {
        return [];
      }

      const result = await pool.query(
        `SELECT id, action, resource_type, resource_id, details, status, created_at
         FROM audit_logs
         WHERE user_id = $1 AND (action ILIKE $2 OR resource_type ILIKE $2)
         ORDER BY created_at DESC
         LIMIT $3`,
        [userId, `%${query}%`, limit],
      );

      return result.rows;
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
      const pool = (carouselDB as any).pool;
      if (!pool) {
        return 0;
      }

      // Get retention policies per user plan
      const result = await pool.query(
        `DELETE FROM audit_logs
         WHERE (
           (SELECT plan FROM users WHERE id = user_id) = 'free' AND created_at < NOW() - INTERVAL '90 days'
         ) OR (
           (SELECT plan FROM users WHERE id = user_id) = 'pro' AND created_at < NOW() - INTERVAL '365 days'
         ) OR (
           (SELECT plan FROM users WHERE id = user_id) = 'premium' AND created_at < NOW() - INTERVAL '2555 days'
         )
         RETURNING id`,
      );

      const deleted = result.rowCount || 0;
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
  async exportUserData(userId: string) {
    try {
      const pool = (carouselDB as any).pool;
      if (!pool) {
        return null;
      }

      const logsResult = await pool.query(`SELECT * FROM audit_logs WHERE user_id = $1 ORDER BY created_at ASC`, [
        userId,
      ]);

      const userResult = await pool.query(`SELECT * FROM users WHERE id = $1`, [userId]);

      const carouselsResult = await pool.query(
        `SELECT * FROM carousels WHERE user_id = $1 ORDER BY created_at ASC`,
        [userId],
      );

      return {
        user: userResult.rows[0] || null,
        audit_logs: logsResult.rows,
        carousels: carouselsResult.rows,
        export_date: new Date().toISOString(),
      };
    } catch (err) {
      log.info('Error exporting user data', { userId, error: err });
      return null;
    }
  }
}

export const auditLogger = new AuditLogger();
