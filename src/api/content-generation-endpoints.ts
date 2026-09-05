/**
 * Content Generation Endpoints (System 1: Curation)
 * POST /api/content/generate - AI-powered content generation
 * GET /api/content/:id - Get content by ID
 * POST /api/content/:id/publish - Publish to platform
 * DELETE /api/content/:id - Delete content
 */

import type { Request, Response } from 'express';
import { query } from '../db/client.js';
import type { Content } from '../db/client.js';

/**
 * POST /api/content/generate
 * Generate AI content for campaign
 */
export const generateContent = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).userId;
    const { campaignId, type, quantity = 1, prompt } = req.body;

    if (!campaignId || !type) {
      res.status(400).json({ error: 'campaignId and type required' });
      return;
    }

    // Verify campaign ownership
    const campaignResult = await query(
      'SELECT * FROM campaigns WHERE id = $1 AND user_id = $2',
      [campaignId, userId]
    );

    if (campaignResult.rowCount === 0) {
      res.status(404).json({ error: 'Campaign not found' });
      return;
    }

    const campaign = campaignResult.rows[0] as { name: string };

    // Queue content generation job
    const jobId = crypto.randomUUID();
    const generatedContent: Content[] = [];

    // Mock: Generate content (in production, call Claude API or other LLM)
    for (let i = 0; i < quantity; i++) {
      const contentId = crypto.randomUUID();

      const content = {
        id: contentId,
        campaign_id: campaignId,
        user_id: userId,
        type,
        title: `${campaign.name} - ${type} #${i + 1}`,
        description: prompt || `Generated ${type} for ${campaign.name}`,
        status: 'ready' as const,
        created_at: new Date(),
        updated_at: new Date(),
      };

      // Insert into database
      await query(
        `INSERT INTO content (id, campaign_id, user_id, type, title, description, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())`,
        [
          content.id,
          content.campaign_id,
          content.user_id,
          content.type,
          content.title,
          content.description,
          content.status,
        ]
      );

      generatedContent.push(content);
    }

    res.status(201).json({
      jobId,
      generated: quantity,
      content: generatedContent.map((c) => ({
        id: c.id,
        title: c.title,
        type: c.type,
        status: c.status,
      })),
    });
    return;
  } catch (err) {
    console.error('[Content] Generation error:', err);
    res.status(500).json({ error: 'Content generation failed' });
    return;
  }
};

/**
 * GET /api/content/:id
 * Get content details
 */
export const getContent = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;

    const result = await query('SELECT * FROM content WHERE id = $1 AND user_id = $2', [id, userId]);

    if (result.rowCount === 0) {
      res.status(404).json({ error: 'Content not found' });
      return;
    }

    res.json(result.rows[0]);
    return;
  } catch (err) {
    console.error('[Content] Get error:', err);
    res.status(500).json({ error: 'Retrieval failed' });
    return;
  }
};

/**
 * POST /api/content/:id/publish
 * Publish content to platform
 */
export const publishContent = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;
    const { platform = 'tiktok' } = req.body;

    // Verify ownership
    const result = await query(
      'SELECT * FROM content WHERE id = $1 AND user_id = $2 AND status = $3',
      [id, userId, 'ready']
    );

    if (result.rowCount === 0) {
      res.status(404).json({ error: 'Content not found or not ready' });
      return;
    }

    const content = result.rows[0] as Content;

    // Mock: Publish to platform (in production, call platform API)
    // Platform-specific publish logic would go here

    // Update status
    await query('UPDATE content SET status = $1, published_at = NOW() WHERE id = $2', ['published', id]);

    // Record analytics event
    await query(
      `INSERT INTO analytics_events (id, content_id, user_id, event_type, platform, metric_value, timestamp)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, NOW())`,
      [id, userId, 'published', platform, 1]
    );

    res.json({
      message: 'Content published',
      id,
      platform,
      publishedAt: new Date().toISOString(),
    });
    return;
  } catch (err) {
    console.error('[Content] Publish error:', err);
    res.status(500).json({ error: 'Publishing failed' });
    return;
  }
};

/**
 * GET /api/content
 * List content for campaign
 */
export const listContent = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).userId;
    const { campaignId, status, limit = '50', offset = '0' } = req.query;

    let whereClause = 'WHERE user_id = $1';
    let paramIndex = 2;
    const params: unknown[] = [userId];

    if (campaignId) {
      whereClause += ` AND campaign_id = $${paramIndex}`;
      params.push(campaignId);
      paramIndex++;
    }

    if (status) {
      whereClause += ` AND status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    const result = await query(
      `SELECT * FROM content ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, parseInt(limit as string, 10), parseInt(offset as string, 10)]
    );

    res.json({
      content: result.rows,
      total: result.rowCount,
    });
    return;
  } catch (err) {
    console.error('[Content] List error:', err);
    res.status(500).json({ error: 'List retrieval failed' });
    return;
  }
};

/**
 * DELETE /api/content/:id
 * Delete content
 */
export const deleteContent = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;

    // Verify ownership + not published
    const result = await query(
      'SELECT * FROM content WHERE id = $1 AND user_id = $2 AND status != $3',
      [id, userId, 'published']
    );

    if (result.rowCount === 0) {
      res.status(400).json({ error: 'Cannot delete published content' });
      return;
    }

    await query('DELETE FROM content WHERE id = $1', [id]);

    res.json({ message: 'Content deleted' });
    return;
  } catch (err) {
    console.error('[Content] Delete error:', err);
    res.status(500).json({ error: 'Deletion failed' });
    return;
  }
};
