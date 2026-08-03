/**
 * Security API Routes
 * 2FA + IP Whitelist + Audit Logs
 * Week 3: Pro+ features
 */

import express, { Request, Response } from 'express';
import { twoFactorService } from '../services/2fa-service.js';
import { auditLogger } from '../services/audit-logger.js';
import { addWhitelistedIp, removeWhitelistedIp, getWhitelistedIps } from '../middleware/ip-whitelist.js';
import { carouselDB } from '../db/postgres.js';
import { log } from '../agent/logger.js';

const router = express.Router();

// Helper: get user ID from request
const getUserId = (req: Request): string => (req.query.user_id as string) || (req.body.user_id as string) || 'demo-user';

// ============================================================
// 1. SETUP 2FA
// ============================================================
router.post('/api/users/:user_id/2fa/setup', async (req: Request, res: Response) => {
  try {
    const userId = req.params.user_id as string;

    // Generate secret + backup codes
    const secret = twoFactorService.generateSecret(userId);

    return res.json({
      secret: secret.secret,
      qr_code: secret.qrCode,
      backup_codes: secret.backupCodes,
      instruction: 'Scan QR code with authenticator app (Google Authenticator, Authy, etc)',
    });
  } catch (err) {
    log.info('Error setting up 2FA', { error: err });
    return res.status(500).json({ error: 'Failed to setup 2FA' });
  }
});

// ============================================================
// 2. VERIFY 2FA TOKEN (Enable 2FA)
// ============================================================
router.post('/api/users/:user_id/2fa/verify', async (req: Request, res: Response) => {
  try {
    const userId = req.params.user_id as string;
    const { secret, token, backup_codes } = req.body;

    if (!secret || !token) {
      return res.status(400).json({ error: 'secret and token required' });
    }

    // Verify TOTP token
    if (!twoFactorService.verifyToken(secret, token)) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Enable 2FA
    const enabled = await twoFactorService.enable(userId, secret, backup_codes);

    if (!enabled) {
      return res.status(500).json({ error: 'Failed to enable 2FA' });
    }

    // Log audit event
    await auditLogger.log({
      user_id: userId,
      action: 'ENABLE_2FA',
      resource_type: 'security',
      details: { method: 'TOTP' },
      status: 'success',
    });

    return res.json({
      status: 'enabled',
      message: 'Two-factor authentication enabled successfully',
      backup_codes,
    });
  } catch (err) {
    log.info('Error verifying 2FA', { error: err });
    return res.status(500).json({ error: 'Failed to verify 2FA' });
  }
});

// ============================================================
// 3. DISABLE 2FA
// ============================================================
router.post('/api/users/:user_id/2fa/disable', async (req: Request, res: Response) => {
  try {
    const userId = req.params.user_id as string;
    const { password } = req.body; // Require password for security

    if (!password) {
      return res.status(400).json({ error: 'password required for security' });
    }

    // In production, verify password first
    // For now, just disable 2FA

    const disabled = await twoFactorService.disable(userId);

    if (!disabled) {
      return res.status(500).json({ error: 'Failed to disable 2FA' });
    }

    await auditLogger.log({
      user_id: userId,
      action: 'DISABLE_2FA',
      resource_type: 'security',
      details: {},
      status: 'success',
    });

    return res.json({ status: 'disabled' });
  } catch (err) {
    log.info('Error disabling 2FA', { error: err });
    return res.status(500).json({ error: 'Failed to disable 2FA' });
  }
});

// ============================================================
// 4. ADD IP TO WHITELIST
// ============================================================
router.post('/api/users/:user_id/ip-whitelist', async (req: Request, res: Response) => {
  try {
    const userId = req.params.user_id as string;
    const { ip_address, description } = req.body;

    if (!ip_address) {
      return res.status(400).json({ error: 'ip_address required' });
    }

    const added = await addWhitelistedIp(userId, ip_address, description);

    if (!added) {
      return res.status(400).json({ error: 'Invalid IP or failed to add' });
    }

    await auditLogger.log({
      user_id: userId,
      action: 'ADD_IP_WHITELIST',
      resource_type: 'security',
      details: { ip_address },
      status: 'success',
    });

    return res.json({ status: 'added', ip_address });
  } catch (err) {
    log.info('Error adding IP whitelist', { error: err });
    return res.status(500).json({ error: 'Failed to add IP' });
  }
});

// ============================================================
// 5. GET WHITELISTED IPs
// ============================================================
router.get('/api/users/:user_id/ip-whitelist', async (req: Request, res: Response) => {
  try {
    const userId = req.params.user_id as string;

    const ips = await getWhitelistedIps(userId);

    return res.json({ ips });
  } catch (err) {
    log.info('Error fetching IP whitelist', { error: err });
    return res.status(500).json({ error: 'Failed to fetch IPs' });
  }
});

// ============================================================
// 6. REMOVE IP FROM WHITELIST
// ============================================================
router.delete('/api/users/:user_id/ip-whitelist/:ip', async (req: Request, res: Response) => {
  try {
    const userId = req.params.user_id as string;
    const ip = req.params.ip as string;

    const removed = await removeWhitelistedIp(userId, ip);

    if (!removed) {
      return res.status(404).json({ error: 'IP not found' });
    }

    await auditLogger.log({
      user_id: userId,
      action: 'REMOVE_IP_WHITELIST',
      resource_type: 'security',
      details: { ip_address: ip },
      status: 'success',
    });

    return res.json({ status: 'removed' });
  } catch (err) {
    log.info('Error removing IP whitelist', { error: err });
    return res.status(500).json({ error: 'Failed to remove IP' });
  }
});

// ============================================================
// 7. GET AUDIT LOGS
// ============================================================
router.get('/api/audit-logs', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const offset = parseInt(req.query.offset as string) || 0;

    // Verify Pro+ plan
    const pool = (carouselDB as any).pool;
    if (!pool) {
      return res.status(500).json({ error: 'Database unavailable' });
    }

    const userResult = await pool.query(`SELECT plan FROM users WHERE id = $1`, [userId]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const plan = userResult.rows[0].plan;
    if (plan === 'free') {
      return res.status(403).json({ error: 'Audit logs available for Pro+ users only' });
    }

    const logs = await auditLogger.getUserLogs(userId, limit, offset);

    return res.json({
      logs,
      count: logs.length,
      limit,
      offset,
    });
  } catch (err) {
    log.info('Error fetching audit logs', { error: err });
    return res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

// ============================================================
// 8. EXPORT USER DATA (GDPR)
// ============================================================
router.post('/api/users/:user_id/export', async (req: Request, res: Response) => {
  try {
    const userId = req.params.user_id as string;

    const data = await auditLogger.exportUserData(userId);

    if (!data) {
      return res.status(500).json({ error: 'Failed to export data' });
    }

    await auditLogger.log({
      user_id: userId,
      action: 'EXPORT_DATA',
      resource_type: 'security',
      details: { reason: 'GDPR' },
      status: 'success',
    });

    return res.json(data);
  } catch (err) {
    log.info('Error exporting user data', { error: err });
    return res.status(500).json({ error: 'Failed to export data' });
  }
});

// ============================================================
// 9. DELETE ACCOUNT (GDPR Right to be Forgotten)
// ============================================================
router.delete('/api/users/:user_id', async (req: Request, res: Response) => {
  try {
    const userId = req.params.user_id as string;
    const { confirm_delete } = req.body;

    if (confirm_delete !== true) {
      return res.status(400).json({ error: 'confirm_delete required' });
    }

    const pool = (carouselDB as any).pool;
    if (!pool) {
      return res.status(500).json({ error: 'Database unavailable' });
    }

    // Delete cascades: users → carousels → slides → audit logs
    await pool.query(
      `DELETE FROM users WHERE id = $1`,
      [userId],
    );

    return res.json({
      status: 'deleted',
      message: 'Your account and all associated data has been permanently deleted',
    });
  } catch (err) {
    log.info('Error deleting account', { error: err });
    return res.status(500).json({ error: 'Failed to delete account' });
  }
});

export default router;
