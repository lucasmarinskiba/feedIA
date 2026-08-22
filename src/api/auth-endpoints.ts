/**
 * Authentication Endpoints
 * POST /api/auth/register - Create user account
 * POST /api/auth/login - Login user (returns access token + refresh token)
 * POST /api/auth/refresh - Refresh access token using refresh token
 * POST /api/auth/logout - Revoke all sessions
 */

import type { Request, Response } from 'express';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import {
  upsertUser,
  getUserByEmail,
  createRefreshToken,
  rotateRefreshToken,
  revokeAllSessions,
  updateLastLogin,
} from '../db/client.js';

const JWT_SECRET = process.env['JWT_SECRET'] || 'dev-secret-key';
const JWT_EXPIRY = '15m'; // Access token expiry

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
}

/**
 * POST /api/auth/register
 * Create new user account
 */
export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, username } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password required' });
      return;
    }

    // Check if user exists
    const existing = await getUserByEmail(email);
    if (existing) {
      res.status(409).json({ error: 'User already exists' });
      return;
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Create user
    const user = await upsertUser(email, passwordHash, username);

    // Create refresh token
    const { token: refreshToken, expiresAt } = await createRefreshToken(user.id);

    // Generate access token
    const accessToken = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, {
      expiresIn: JWT_EXPIRY,
    });

    res.status(201).json({
      user: { id: user.id, email: user.email, username: user.username },
      accessToken,
      refreshToken,
      expiresIn: JWT_EXPIRY,
    });
  } catch (err) {
    console.error('[Auth] Register error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
};

/**
 * POST /api/auth/login
 * Login user (email + password)
 */
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password required' });
      return;
    }

    // Get user
    const user = await getUserByEmail(email);
    if (!user) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    // Verify password
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    // Update last login
    await updateLastLogin(user.id);

    // Create refresh token
    const { token: refreshToken } = await createRefreshToken(user.id);

    // Generate access token
    const accessToken = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, {
      expiresIn: JWT_EXPIRY,
    });

    res.json({
      user: { id: user.id, email: user.email, username: user.username },
      accessToken,
      refreshToken,
      expiresIn: JWT_EXPIRY,
    });
  } catch (err) {
    console.error('[Auth] Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
};

/**
 * POST /api/auth/refresh
 * Refresh access token using refresh token
 */
export const refresh = async (req: Request, res: Response): Promise<void> => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      res.status(400).json({ error: 'Refresh token required' });
      return;
    }

    // Rotate refresh token
    const newTokens = await rotateRefreshToken(refreshToken);
    if (!newTokens) {
      res.status(401).json({ error: 'Invalid or expired refresh token' });
      return;
    }

    // Generate new access token (need to get user info from old token or db)
    // For now, issue generic token
    const accessToken = jwt.sign({ refreshed: true }, JWT_SECRET, {
      expiresIn: JWT_EXPIRY,
    });

    res.json({
      accessToken,
      refreshToken: newTokens.token,
      expiresIn: JWT_EXPIRY,
    });
  } catch (err) {
    console.error('[Auth] Refresh error:', err);
    res.status(500).json({ error: 'Token refresh failed' });
  }
};

/**
 * POST /api/auth/logout
 * Revoke all sessions (logout all devices)
 */
export const logout = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).userId; // Set by auth middleware
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    await revokeAllSessions(userId);
    res.json({ message: 'Logged out from all devices' });
  } catch (err) {
    console.error('[Auth] Logout error:', err);
    res.status(500).json({ error: 'Logout failed' });
  }
};

/**
 * Middleware: Verify JWT and attach userId to request
 */
export const verifyJWT = (req: Request, res: Response, next: () => void): void => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      res.status(401).json({ error: 'Missing authorization token' });
      return;
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    (req as any).userId = (decoded as any).userId;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
};
