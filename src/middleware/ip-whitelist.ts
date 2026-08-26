/**
 * IP Whitelist Middleware
 * Restricts access by IP for Pro+ users
 * Week 3: Network security
 */

import { Request, Response, NextFunction } from 'express';
import { queryOneAs, queryAs, executeMutation } from '../db/typed-queries.js';
import { log } from '../agent/logger.js';

declare global {
  namespace Express {
    interface Request {
      userId: string;
    }
  }
}

interface UserPlanRow {
  plan: string;
}

interface IpAddressRow {
  ip_address: string;
}

interface WhitelistedIpRow {
  ip_address: string;
  description: string | null;
  created_at: string;
}

export interface WhitelistedIp {
  ip: string;
  description: string | null;
  created_at: string;
}

/**
 * Extract client IP from request
 */
function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0]?.trim() ?? '0.0.0.0';
  }
  return req.socket?.remoteAddress || '0.0.0.0';
}

/**
 * IP whitelist middleware
 * Only allow if user's plan has IP whitelist enabled and IP is whitelisted
 */
export const ipWhitelistMiddleware = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Get user ID (assumes auth middleware sets this)
    const userId = req.userId;

    if (!userId) {
      next(); // No auth, skip IP check
      return;
    }

    // Get user plan
    const userRow = await queryOneAs<UserPlanRow>(`SELECT plan FROM users WHERE id = $1`, [userId]);

    if (!userRow) {
      res.status(401).json({ error: 'User not found' });
      return;
    }

    const plan = userRow.plan;

    // Only Pro+ have IP whitelist
    if (plan === 'free') {
      next(); // No restriction
      return;
    }

    // Get whitelisted IPs for user
    const ipRows = await queryAs<IpAddressRow>(`SELECT ip_address FROM ip_whitelist WHERE user_id = $1 AND enabled = true`, [
      userId,
    ]);

    if (ipRows.length === 0) {
      // No IPs whitelisted = deny access (Pro+ must configure)
      res.status(403).json({
        error: 'No whitelisted IPs configured. Please add your IP in account settings.',
      });
      return;
    }

    const whitelistedIps = ipRows.map((row) => row.ip_address);
    const clientIp = getClientIp(req);

    if (!whitelistedIps.includes(clientIp)) {
      log.info('IP whitelist violation', { user_id: userId, client_ip: clientIp });
      res.status(403).json({
        error: 'Access denied. Your IP is not whitelisted.',
      });
      return;
    }

    // Log access
    await executeMutation(
      `INSERT INTO audit_logs (user_id, action, resource_type, details, ip_address, status)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [userId, 'API_ACCESS', 'API', JSON.stringify({ endpoint: req.path }), clientIp, 'success'],
    );

    next();
  } catch (err) {
    log.info('Error in IP whitelist middleware', { error: err });
    next(); // Fail open (don't block on error)
  }
};

/**
 * Get whitelisted IPs for user
 */
export async function getWhitelistedIps(userId: string): Promise<WhitelistedIp[]> {
  try {
    const rows = await queryAs<WhitelistedIpRow>(
      `SELECT ip_address, description, created_at FROM ip_whitelist
       WHERE user_id = $1 AND enabled = true
       ORDER BY created_at DESC`,
      [userId],
    );

    return rows.map((row) => ({
      ip: row.ip_address,
      description: row.description,
      created_at: row.created_at,
    }));
  } catch (err) {
    log.info('Error fetching whitelisted IPs', { userId, error: err });
    return [];
  }
}

/**
 * Add IP to whitelist
 */
export async function addWhitelistedIp(userId: string, ip: string, description?: string): Promise<boolean> {
  try {
    // Validate IP format
    if (!isValidIp(ip)) {
      throw new Error('Invalid IP format');
    }

    await executeMutation(
      `INSERT INTO ip_whitelist (user_id, ip_address, description, enabled)
       VALUES ($1, $2, $3, true)
       ON CONFLICT (user_id, ip_address) DO UPDATE SET enabled = true`,
      [userId, ip, description || null],
    );

    log.info('IP added to whitelist', { user_id: userId, ip });
    return true;
  } catch (err) {
    log.info('Error adding whitelisted IP', { userId, error: err });
    return false;
  }
}

/**
 * Remove IP from whitelist
 */
export async function removeWhitelistedIp(userId: string, ip: string): Promise<boolean> {
  try {
    await executeMutation(`DELETE FROM ip_whitelist WHERE user_id = $1 AND ip_address = $2`, [userId, ip]);

    log.info('IP removed from whitelist', { user_id: userId, ip });
    return true;
  } catch (err) {
    log.info('Error removing whitelisted IP', { userId, error: err });
    return false;
  }
}

/**
 * Validate IP address (v4 or v6)
 */
function isValidIp(ip: string): boolean {
  // IPv4
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (ipv4Regex.test(ip)) {
    return ip.split('.').every((octet) => parseInt(octet, 10) <= 255);
  }

  // IPv6 (simplified)
  const ipv6Regex = /^[\da-f:]+$/i;
  return ipv6Regex.test(ip) && ip.split(':').length >= 3;
}
