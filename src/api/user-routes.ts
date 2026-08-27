/**
 * User Routes
 * GET /api/users/me - Get current user profile
 * PUT /api/users/me - Update user profile
 * GET /api/users/usage - Get consumption stats
 * GET /api/users/storage - Get storage info
 * POST /api/users/api-keys - Create API key
 * GET /api/users/api-keys - List API keys
 * DELETE /api/users/api-keys/:id - Delete API key
 */

import { Express, Request, Response } from 'express';
import { executeMutation, queryAs, queryOneAs } from '../db/typed-queries.js';
import { Pool } from 'pg';
import { executeMutation, queryAs, queryOneAs } from '../db/typed-queries.js';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.DATABASE_PRIVATE_URL,
  ssl: { rejectUnauthorized: false },
});

interface AuthRequest extends Request {
  userId?: string;
}

/**
 * GET /api/users/me - Get current user profile
 */
const getCurrentUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const result = await queryAs(
      `SELECT id, email, username, tier, plan, first_name, last_name, avatar_url,
              storage_used_gb, storage_limit_gb, video_storage_used_gb, video_storage_limit_gb,
              api_calls_this_month, api_calls_limit, created_at, language, timezone, dark_mode
       FROM users WHERE id = $1 AND deleted_at IS NULL`,
      [userId],
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const user = result.rows[0];
    res.json({
      id: user.id,
      email: user.email,
      username: user.username,
      tier: user.tier,
      plan: user.plan,
      firstName: user.first_name,
      lastName: user.last_name,
      avatarUrl: user.avatar_url,
      storage: {
        usedGb: parseFloat(user.storage_used_gb),
        limitGb: user.storage_limit_gb,
        percentUsed: ((parseFloat(user.storage_used_gb) / user.storage_limit_gb) * 100).toFixed(1),
      },
      videoStorage: {
        usedGb: parseFloat(user.video_storage_used_gb),
        limitGb: user.video_storage_limit_gb,
        percentUsed:
          user.video_storage_limit_gb > 0
            ? ((parseFloat(user.video_storage_used_gb) / user.video_storage_limit_gb) * 100).toFixed(1)
            : 'N/A',
      },
      apiCalls: {
        thisMonth: user.api_calls_this_month,
        limit: user.api_calls_limit,
        percentUsed: ((user.api_calls_this_month / user.api_calls_limit) * 100).toFixed(1),
      },
      preferences: {
        language: user.language,
        timezone: user.timezone,
        darkMode: user.dark_mode,
      },
      createdAt: user.created_at,
    });
    return;
  } catch (err) {
    console.error('[User] Get profile error:', err);
    res.status(500).json({ error: 'Failed to fetch profile' });
    return;
  }
};

/**
 * PUT /api/users/me - Update user profile
 */
const updateUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { firstName, lastName, avatarUrl, language, timezone, darkMode, bio } = req.body;

    const result = await queryAs(
      `UPDATE users
       SET first_name = COALESCE($1, first_name),
           last_name = COALESCE($2, last_name),
           avatar_url = COALESCE($3, avatar_url),
           language = COALESCE($4, language),
           timezone = COALESCE($5, timezone),
           dark_mode = COALESCE($6, dark_mode),
           bio = COALESCE($7, bio),
           updated_at = NOW()
       WHERE id = $8 AND deleted_at IS NULL
       RETURNING id, email, username, first_name, last_name, avatar_url, language, timezone, dark_mode, bio`,
      [
        firstName || null,
        lastName || null,
        avatarUrl || null,
        language || null,
        timezone || null,
        darkMode !== undefined ? darkMode : null,
        bio || null,
        userId,
      ],
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({ message: 'Profile updated', user: result.rows[0] });
    return;
  } catch (err) {
    console.error('[User] Update profile error:', err);
    res.status(500).json({ error: 'Failed to update profile' });
    return;
  }
};

/**
 * GET /api/users/usage - Get monthly usage stats
 */
const getUserUsage = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // Get current month usage
    const currentDate = new Date();
    const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);

    const result = await queryAs(
      `SELECT
        COALESCE(SUM(api_calls), 0) as api_calls,
        COALESCE(SUM(storage_added_gb), 0) as storage_added_gb,
        COALESCE(SUM(video_storage_added_gb), 0) as video_storage_added_gb,
        COALESCE(SUM(content_generated), 0) as content_generated
       FROM user_usage
       WHERE user_id = $1 AND date >= $2`,
      [userId, monthStart.toISOString().split('T')[0]],
    );

    const usage = result.rows[0] || {
      api_calls: 0,
      storage_added_gb: 0,
      video_storage_added_gb: 0,
      content_generated: 0,
    };

    // Get user limits
    const userResult = await executeMutation(
      `SELECT api_calls_limit, api_calls_this_month, storage_limit_gb, storage_used_gb,
              video_storage_limit_gb, video_storage_used_gb, tier
       FROM users WHERE id = $1 AND deleted_at IS NULL`,
      [userId],
    );

    if (userResult.rows.length === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const user = userResult.rows[0];

    res.json({
      currentMonth: {
        apiCalls: parseInt(usage.api_calls),
        storageAddedGb: parseFloat(usage.storage_added_gb),
        videoStorageAddedGb: parseFloat(usage.video_storage_added_gb),
        contentGenerated: parseInt(usage.content_generated),
      },
      limits: {
        apiCallsLimit: user.api_calls_limit,
        apiCallsUsed: user.api_calls_this_month,
        apiCallsPercentUsed: ((user.api_calls_this_month / user.api_calls_limit) * 100).toFixed(1),
        storageLimit: user.storage_limit_gb,
        storageUsed: parseFloat(user.storage_used_gb),
        storagePercentUsed: ((parseFloat(user.storage_used_gb) / user.storage_limit_gb) * 100).toFixed(1),
        videoStorageLimit: user.video_storage_limit_gb,
        videoStorageUsed: parseFloat(user.video_storage_used_gb),
      },
      tier: user.tier,
    });
    return;
  } catch (err) {
    console.error('[User] Get usage error:', err);
    res.status(500).json({ error: 'Failed to fetch usage' });
    return;
  }
};

/**
 * GET /api/users/storage - Get storage breakdown
 */
const getUserStorage = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // Get total storage by content type
    interface StorageRow {
      file_type: string;
      count: number;
      total_mb: string;
    }

    const result = await queryAs(
      `SELECT
        file_type,
        COUNT(*) as count,
        SUM(file_size_mb) as total_mb
       FROM user_generated_content
       WHERE user_id = $1 AND deleted_at IS NULL
       GROUP BY file_type`,
      [userId],
    );

    // Get user storage info
    interface UserStorageRow {
      storage_used_gb: string;
      storage_limit_gb: number;
      video_storage_used_gb: string;
      video_storage_limit_gb: number;
    }

    const userResult = await executeMutation(
      `SELECT storage_used_gb, storage_limit_gb, video_storage_used_gb, video_storage_limit_gb
       FROM users WHERE id = $1`,
      [userId],
    );

    const user = userResult.rows[0] as UserStorageRow;
    const breakdown = (result.rows as StorageRow[]).map((row) => ({
      type: row.file_type,
      count: row.count,
      totalMb: parseFloat(row.total_mb),
      totalGb: (parseFloat(row.total_mb) / 1024).toFixed(2),
    }));

    res.json({
      total: {
        usedGb: parseFloat(user.storage_used_gb),
        limitGb: user.storage_limit_gb,
        availableGb: (user.storage_limit_gb - parseFloat(user.storage_used_gb)).toFixed(2),
        percentUsed: ((parseFloat(user.storage_used_gb) / user.storage_limit_gb) * 100).toFixed(1),
      },
      videoStorage: {
        usedGb: parseFloat(user.video_storage_used_gb),
        limitGb: user.video_storage_limit_gb,
        availableGb: (user.video_storage_limit_gb - parseFloat(user.video_storage_used_gb)).toFixed(2),
      },
      breakdown,
    });
    return;
  } catch (err) {
    console.error('[User] Get storage error:', err);
    res.status(500).json({ error: 'Failed to fetch storage info' });
    return;
  }
};

/**
 * POST /api/users/api-keys - Create new API key
 */
const createApiKey = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { name, expiresIn } = req.body;

    // Generate API key
    const apiKey = `sk_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    const keyHash = require('crypto').createHash('sha256').update(apiKey).digest('hex');
    const keyPrefix = apiKey.substring(0, 10);

    // Calculate expiry
    let expiresAt = null;
    if (expiresIn === '30d') expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    else if (expiresIn === '90d') expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
    else if (expiresIn === '1y') expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

    const result = await queryAs(
      `INSERT INTO user_api_keys (user_id, key_hash, key_prefix, name, expires_at)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, key_prefix, name, expires_at, created_at`,
      [userId, keyHash, keyPrefix, name || 'API Key', expiresAt],
    );

    res.status(201).json({
      apiKey, // Only show once!
      id: result.rows[0].id,
      keyPrefix: result.rows[0].key_prefix,
      name: result.rows[0].name,
      expiresAt: result.rows[0].expires_at,
      message: 'Save this API key — you will not be able to see it again',
    });
    return;
  } catch (err) {
    console.error('[User] Create API key error:', err);
    res.status(500).json({ error: 'Failed to create API key' });
    return;
  }
};

/**
 * GET /api/users/api-keys - List API keys
 */
const listApiKeys = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const result = await queryAs(
      `SELECT id, key_prefix, name, last_used_at, expires_at, created_at, revoked_at
       FROM user_api_keys
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId],
    );

    interface ApiKeyRow {
      id: string;
      key_prefix: string;
      name: string;
      last_used_at: string | null;
      expires_at: string | null;
      created_at: string;
      revoked_at: string | null;
    }

    res.json({
      keys: (result.rows as ApiKeyRow[]).map((row) => ({
        id: row.id,
        keyPrefix: row.key_prefix,
        name: row.name,
        lastUsedAt: row.last_used_at,
        expiresAt: row.expires_at,
        createdAt: row.created_at,
        status: row.revoked_at ? 'revoked' : 'active',
      })),
    });
    return;
  } catch (err) {
    console.error('[User] List API keys error:', err);
    res.status(500).json({ error: 'Failed to list API keys' });
    return;
  }
};

/**
 * DELETE /api/users/api-keys/:id - Revoke API key
 */
const revokeApiKey = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    const keyId = req.params.id;

    if (!userId || !keyId) {
      res.status(400).json({ error: 'Missing required parameters' });
      return;
    }

    const result = await queryAs(
      `UPDATE user_api_keys
       SET revoked_at = NOW()
       WHERE id = $1 AND user_id = $2
       RETURNING id`,
      [keyId, userId],
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'API key not found' });
      return;
    }

    res.json({ message: 'API key revoked' });
    return;
  } catch (err) {
    console.error('[User] Revoke API key error:', err);
    res.status(500).json({ error: 'Failed to revoke API key' });
    return;
  }
};

export const registerUserRoutes = (app: Express): void => {
  app.get('/api/users/me', getCurrentUser);
  app.put('/api/users/me', updateUser);
  app.get('/api/users/usage', getUserUsage);
  app.get('/api/users/storage', getUserStorage);
  app.post('/api/users/api-keys', createApiKey);
  app.get('/api/users/api-keys', listApiKeys);
  app.delete('/api/users/api-keys/:id', revokeApiKey);

  console.log('[Routes] User routes registered');
};
