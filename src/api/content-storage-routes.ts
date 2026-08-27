/**
 * Content Storage Routes
 * POST /api/content - Create content record (posts, videos, carousels)
 * GET /api/content - List user's content
 * GET /api/content/:id - Get content details
 * PUT /api/content/:id - Update content
 * DELETE /api/content/:id - Archive/delete content
 * POST /api/content/:id/publish - Publish to platform
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
 * POST /api/content - Create content record
 */
const createContent = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const {
      title,
      description,
      contentType,
      fileUrl,
      fileSize,
      fileSizeUnit = 'mb',
      platform,
      folderId,
      metadata,
    } = req.body;

    // Validate
    if (!contentType || !fileUrl) {
      res.status(400).json({ error: 'Missing required fields: contentType, fileUrl' });
      return;
    }

    // Convert file size to MB
    let fileSizeMb = parseFloat(fileSize);
    if (fileSizeUnit === 'gb') fileSizeMb = fileSizeMb * 1024;
    else if (fileSizeUnit === 'kb') fileSizeMb = fileSizeMb / 1024;

    // Create content record
    const result = await queryAs(
      `INSERT INTO user_generated_content
       (user_id, content_type, title, description, file_url, file_size_mb, file_type, platform, status, metadata, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'draft', $9, NOW(), NOW())
       RETURNING id, user_id, content_type, title, status, created_at`,
      [
        userId,
        contentType,
        title || 'Untitled',
        description || '',
        fileUrl,
        fileSizeMb,
        contentType,
        platform || 'instagram',
        JSON.stringify(metadata || {}),
      ],
    );

    const contentId = result.rows[0].id;

    // Add to folder if specified
    if (folderId) {
      await executeMutation(
        `INSERT INTO content_folders (content_id, folder_id, created_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT DO NOTHING`,
        [contentId, folderId],
      );
    }

    // Update user storage
    await executeMutation(`UPDATE users SET storage_used_gb = storage_used_gb + $1 WHERE id = $2`, [
      fileSizeMb / 1024,
      userId,
    ]);

    // Track usage
    const today = new Date().toISOString().split('T')[0];
    await executeMutation(
      `INSERT INTO user_usage (user_id, date, storage_added_gb, content_generated, created_at)
       VALUES ($1, $2, $3, 1, NOW())
       ON CONFLICT(user_id, date) DO UPDATE SET
         storage_added_gb = user_usage.storage_added_gb + $3,
         content_generated = user_usage.content_generated + 1`,
      [userId, today, fileSizeMb / 1024],
    );

    res.status(201).json({
      id: contentId,
      message: 'Content created successfully',
      contentType,
      fileSize: fileSize + fileSizeUnit,
    });
    return;
  } catch (err) {
    console.error('[Content] Create error:', err);
    res.status(500).json({ error: 'Failed to create content' });
    return;
  }
};

/**
 * GET /api/content - List user's content with pagination
 */
const listContent = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const page = parseInt((req.query.page as string) || '1');
    const limit = Math.min(parseInt((req.query.limit as string) || '20'), 100);
    const status = req.query.status as string;
    const platform = req.query.platform as string;
    const offset = (page - 1) * limit;

    // Build query
    let query = `SELECT id, title, content_type, platform, status, file_size_mb, views, likes, engagement_rate, created_at, published_at FROM user_generated_content WHERE user_id = $1 AND deleted_at IS NULL`;
    const params: (string | number)[] = [userId];

    if (status) {
      query += ` AND status = $${params.length + 1}`;
      params.push(status);
    }
    if (platform) {
      query += ` AND platform = $${params.length + 1}`;
      params.push(platform);
    }

    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    // Get total count
    const countResult = await executeMutation(
      `SELECT COUNT(*) as total FROM user_generated_content WHERE user_id = $1 AND deleted_at IS NULL ${status ? `AND status = '${status}'` : ''} ${platform ? `AND platform = '${platform}'` : ''}`,
      [userId],
    );
    const total = parseInt(countResult.rows[0].total);

    // Get paginated results
    const result = await queryAs(query, params);

    interface ContentRow {
      id: string;
      title: string;
      content_type: string;
      platform: string;
      status: string;
      file_size_mb: number;
      views: number;
      likes: number;
      engagement_rate: number;
      created_at: string;
      published_at: string | null;
    }

    res.json({
      items: result.rows as ContentRow[],
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
    return;
  } catch (err) {
    console.error('[Content] List error:', err);
    res.status(500).json({ error: 'Failed to list content' });
    return;
  }
};

/**
 * GET /api/content/:id - Get content details
 */
const getContent = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    const contentId = req.params.id;

    if (!userId || !contentId) {
      res.status(400).json({ error: 'Missing parameters' });
      return;
    }

    const result = await queryAs(
      `SELECT * FROM user_generated_content
       WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL`,
      [contentId, userId],
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Content not found' });
      return;
    }

    res.json(result.rows[0]);
    return;
  } catch (err) {
    console.error('[Content] Get error:', err);
    res.status(500).json({ error: 'Failed to fetch content' });
    return;
  }
};

/**
 * PUT /api/content/:id - Update content
 */
const updateContent = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    const contentId = req.params.id;

    if (!userId || !contentId) {
      res.status(400).json({ error: 'Missing parameters' });
      return;
    }

    const { title, description, tags, metadata } = req.body;

    const result = await queryAs(
      `UPDATE user_generated_content
       SET title = COALESCE($1, title),
           description = COALESCE($2, description),
           tags = COALESCE($3, tags),
           metadata = COALESCE($4::jsonb, metadata),
           updated_at = NOW()
       WHERE id = $5 AND user_id = $6 AND deleted_at IS NULL
       RETURNING id, title, description, updated_at`,
      [title || null, description || null, tags || null, metadata ? JSON.stringify(metadata) : null, contentId, userId],
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Content not found' });
      return;
    }

    res.json({ message: 'Content updated', content: result.rows[0] });
    return;
  } catch (err) {
    console.error('[Content] Update error:', err);
    res.status(500).json({ error: 'Failed to update content' });
    return;
  }
};

/**
 * DELETE /api/content/:id - Soft delete content
 */
const deleteContent = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    const contentId = req.params.id;

    if (!userId || !contentId) {
      res.status(400).json({ error: 'Missing parameters' });
      return;
    }

    // Get file size before deletion
    const getResult = await executeMutation(
      `SELECT file_size_mb FROM user_generated_content WHERE id = $1 AND user_id = $2`,
      [contentId, userId],
    );

    if (getResult.rows.length === 0) {
      res.status(404).json({ error: 'Content not found' });
      return;
    }

    const fileSizeMb = getResult.rows[0].file_size_mb;

    // Soft delete
    await executeMutation(`UPDATE user_generated_content SET deleted_at = NOW() WHERE id = $1 AND user_id = $2`, [
      contentId,
      userId,
    ]);

    // Update storage
    await executeMutation(`UPDATE users SET storage_used_gb = GREATEST(0, storage_used_gb - $1) WHERE id = $2`, [
      fileSizeMb / 1024,
      userId,
    ]);

    res.json({ message: 'Content deleted' });
    return;
  } catch (err) {
    console.error('[Content] Delete error:', err);
    res.status(500).json({ error: 'Failed to delete content' });
    return;
  }
};

/**
 * POST /api/content/:id/publish - Mark as published
 */
const publishContent = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    const contentId = req.params.id;
    const { publishedUrl, platform } = req.body;

    if (!userId || !contentId) {
      res.status(400).json({ error: 'Missing parameters' });
      return;
    }

    const result = await queryAs(
      `UPDATE user_generated_content
       SET status = 'published', published_at = NOW(), platform = COALESCE($1, platform),
           metadata = jsonb_set(metadata, '{published_url}', to_jsonb($2::text))
       WHERE id = $3 AND user_id = $4 AND deleted_at IS NULL
       RETURNING id, status, published_at`,
      [platform || null, publishedUrl || null, contentId, userId],
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Content not found' });
      return;
    }

    res.json({ message: 'Content published', content: result.rows[0] });
    return;
  } catch (err) {
    console.error('[Content] Publish error:', err);
    res.status(500).json({ error: 'Failed to publish content' });
    return;
  }
};

export const registerContentStorageRoutes = (app: Express): void => {
  app.post('/api/content', createContent);
  app.get('/api/content', listContent);
  app.get('/api/content/:id', getContent);
  app.put('/api/content/:id', updateContent);
  app.delete('/api/content/:id', deleteContent);
  app.post('/api/content/:id/publish', publishContent);

  console.log('[Routes] Content storage routes registered');
};
