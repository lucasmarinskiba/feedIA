/**
 * Authentication Database Queries
 * User login, session management, token refresh
 */

import { randomUUID, randomBytes } from 'node:crypto';
import { query, transaction } from './index.js';
import type { User, UserSession } from './schema.js';

/**
 * Create or update user
 */
export const upsertUser = async (email: string, passwordHash: string, username?: string): Promise<User> => {
  const result = await query(
    `INSERT INTO users (id, email, password_hash, username, created_at, updated_at)
     VALUES (gen_random_uuid(), $1, $2, $3, NOW(), NOW())
     ON CONFLICT (email) DO UPDATE SET updated_at = NOW()
     RETURNING *`,
    [email, passwordHash, username]
  );
  return result.rows[0] as User;
};

/**
 * Get user by email
 */
export const getUserByEmail = async (email: string): Promise<User | null> => {
  const result = await query('SELECT * FROM users WHERE email = $1', [email]);
  return (result.rows[0] as User) || null;
};

/**
 * Get user by ID
 */
export const getUserById = async (id: string): Promise<User | null> => {
  const result = await query('SELECT * FROM users WHERE id = $1', [id]);
  return (result.rows[0] as User) || null;
};

/**
 * Create refresh token session
 * Returns refresh token + expiry
 */
export const createRefreshToken = async (userId: string): Promise<{ token: string; expiresAt: Date }> => {
  const sessionId = randomUUID();
  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  await query(
    `INSERT INTO user_sessions (id, user_id, refresh_token, refresh_token_expires_at, created_at)
     VALUES ($1, $2, $3, $4, NOW())`,
    [sessionId, userId, token, expiresAt]
  );

  return { token, expiresAt };
};

/**
 * Validate and rotate refresh token
 * Old token is deleted, new one issued
 */
export const rotateRefreshToken = async (oldToken: string): Promise<{ token: string; expiresAt: Date } | null> => transaction(async (client) => {
    // Verify old token exists and not expired
    const result = await client.query(
      `SELECT id, user_id FROM user_sessions
       WHERE refresh_token = $1 AND refresh_token_expires_at > NOW()`,
      [oldToken]
    );

    if (result.rowCount === 0) {
      return null; // Token invalid or expired
    }

    const session = result.rows[0];

    // Delete old token
    await client.query('DELETE FROM user_sessions WHERE id = $1', [session.id]);

    // Create new token
    const newToken = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await client.query(
      `INSERT INTO user_sessions (id, user_id, refresh_token, refresh_token_expires_at, created_at)
       VALUES (gen_random_uuid(), $1, $2, $3, NOW())`,
      [session.user_id, newToken, expiresAt]
    );

    return { token: newToken, expiresAt };
  });

/**
 * Revoke all sessions for user (logout all devices)
 */
export const revokeAllSessions = async (userId: string): Promise<void> => {
  await query('DELETE FROM user_sessions WHERE user_id = $1', [userId]);
};

/**
 * Revoke specific session
 */
export const revokeSession = async (token: string): Promise<void> => {
  await query('DELETE FROM user_sessions WHERE refresh_token = $1', [token]);
};

/**
 * Update last login time
 */
export const updateLastLogin = async (userId: string): Promise<void> => {
  await query('UPDATE users SET last_login = NOW() WHERE id = $1', [userId]);
};

/**
 * Get active sessions for user
 */
export const getUserSessions = async (userId: string): Promise<UserSession[]> => {
  const result = await query(
    `SELECT * FROM user_sessions
     WHERE user_id = $1 AND refresh_token_expires_at > NOW()
     ORDER BY created_at DESC`,
    [userId]
  );
  return result.rows as UserSession[];
};
