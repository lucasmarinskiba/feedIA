/**
 * 2FA Service
 * TOTP (Time-based One-Time Password) + Backup codes
 * Week 3: Authentication security
 */

import crypto from 'crypto';
import { carouselDB } from '../db/postgres.js';
import { log } from '../agent/logger.js';
import { encryptionService } from './encryption-service.js';

interface TOTPSecret {
  secret: string;
  qrCode: string;
  backupCodes: string[];
}

class TwoFactorService {
  /**
   * Generate TOTP secret + backup codes
   * Uses base32 encoding (standard for authenticator apps)
   */
  generateSecret(userId: string): TOTPSecret {
    try {
      // Generate 20-byte secret
      const secret = crypto.randomBytes(20).toString('base64').replace(/\W/g, '').slice(0, 32);

      // Generate 10 backup codes
      const backupCodes = Array(10)
        .fill(null)
        .map(() => crypto.randomBytes(4).toString('hex').toUpperCase());

      // QR code data (for authenticator apps)
      const qrData = `otpauth://totp/FeedIA:${userId}?secret=${secret}&issuer=FeedIA`;

      return {
        secret,
        qrCode: qrData,
        backupCodes,
      };
    } catch (err) {
      throw new Error(`Failed to generate 2FA secret: ${err instanceof Error ? err.message : 'unknown error'}`);
    }
  }

  /**
   * Verify TOTP token (6-digit code from authenticator)
   */
  verifyToken(secret: string, token: string): boolean {
    try {
      // TOTP: time-based counter (30-second intervals)
      const counter = Math.floor(Date.now() / 1000 / 30);

      // Check current + previous + next time window (30-second tolerance)
      for (let i = -1; i <= 1; i++) {
        const hmac = crypto.createHmac('sha1', Buffer.from(secret, 'base64'));
        const buffer = Buffer.alloc(8);
        buffer.writeBigInt64BE(BigInt(counter + i), 0);

        hmac.update(buffer);
        const digest = hmac.digest();

        // Dynamic truncation (RFC 4226)
        const offset = digest[digest.length - 1] & 0xf;
        const code = (
          ((digest[offset] & 0x7f) << 24) |
          ((digest[offset + 1] & 0xff) << 16) |
          ((digest[offset + 2] & 0xff) << 8) |
          (digest[offset + 3] & 0xff)
        ) % 1000000;

        if (code === parseInt(token, 10)) {
          return true;
        }
      }

      return false;
    } catch (err) {
      log.info('Error verifying TOTP token', { error: err });
      return false;
    }
  }

  /**
   * Enable 2FA for user
   */
  async enable(userId: string, secret: string, backupCodes: string[]): Promise<boolean> {
    try {
      const pool = (carouselDB as any).pool;
      if (!pool) {
        return false;
      }

      // Encrypt backup codes
      const encrypted = encryptionService.encrypt(JSON.stringify(backupCodes), process.env.MASTER_KEY || 'default');

      await pool.query(
        `INSERT INTO two_factor_auth (user_id, secret, backup_codes, enabled)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (user_id) DO UPDATE SET
           secret = $2,
           backup_codes = $3,
           enabled = $4,
           updated_at = NOW()`,
        [userId, secret, JSON.stringify(encrypted), true],
      );

      log.info('2FA enabled for user', { user_id: userId });
      return true;
    } catch (err) {
      log.info('Error enabling 2FA', { userId, error: err });
      return false;
    }
  }

  /**
   * Disable 2FA for user
   */
  async disable(userId: string): Promise<boolean> {
    try {
      const pool = (carouselDB as any).pool;
      if (!pool) {
        return false;
      }

      await pool.query(`UPDATE two_factor_auth SET enabled = false, updated_at = NOW() WHERE user_id = $1`, [userId]);

      log.info('2FA disabled for user', { user_id: userId });
      return true;
    } catch (err) {
      log.info('Error disabling 2FA', { userId, error: err });
      return false;
    }
  }

  /**
   * Verify backup code (single-use)
   */
  async verifyBackupCode(userId: string, code: string): Promise<boolean> {
    try {
      const pool = (carouselDB as any).pool;
      if (!pool) {
        return false;
      }

      const result = await pool.query(
        `SELECT backup_codes FROM two_factor_auth WHERE user_id = $1 AND enabled = true`,
        [userId],
      );

      if (result.rows.length === 0) {
        return false;
      }

      const encrypted = (result.rows[0] as any).backup_codes;
      const decrypted = encryptionService.decrypt(encrypted, process.env.MASTER_KEY || 'default');
      const backupCodes = JSON.parse(decrypted);

      if (backupCodes.includes(code)) {
        // Remove used code
        const updatedCodes = backupCodes.filter((c: string) => c !== code);

        await pool.query(
          `UPDATE two_factor_auth SET backup_codes = $1, updated_at = NOW() WHERE user_id = $2`,
          [JSON.stringify(updatedCodes), userId],
        );

        log.info('Backup code used', { user_id: userId });
        return true;
      }

      return false;
    } catch (err) {
      log.info('Error verifying backup code', { userId, error: err });
      return false;
    }
  }

  /**
   * Check if 2FA is enabled for user
   */
  async isEnabled(userId: string): Promise<boolean> {
    try {
      const pool = (carouselDB as any).pool;
      if (!pool) {
        return false;
      }

      const result = await pool.query(`SELECT enabled FROM two_factor_auth WHERE user_id = $1`, [userId]);

      return result.rows.length > 0 && (result.rows[0] as any).enabled;
    } catch (err) {
      return false;
    }
  }
}

export const twoFactorService = new TwoFactorService();
