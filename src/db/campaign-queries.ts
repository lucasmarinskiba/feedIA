/**
 * Campaign Database Queries
 * CRUD operations for campaigns (System 1: Curation)
 */

import { query } from './index.js';
import type { Campaign } from './schema.js';

/**
 * Create campaign
 */
export const createCampaign = async (
  userId: string,
  name: string,
  data: Partial<Campaign>
): Promise<Campaign> => {
  const result = await query(
    `INSERT INTO campaigns (id, user_id, name, description, platform, niche, status, created_at, updated_at)
     VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, NOW(), NOW())
     RETURNING *`,
    [userId, name, data.description, data.platform || 'all', data.niche, data.status || 'draft']
  );
  return result.rows[0] as Campaign;
};

/**
 * Get campaign by ID
 */
export const getCampaignById = async (id: string): Promise<Campaign | null> => {
  const result = await query('SELECT * FROM campaigns WHERE id = $1', [id]);
  return (result.rows[0] as Campaign) || null;
};

/**
 * List campaigns for user (paginated)
 */
export const listCampaigns = async (
  userId: string,
  options: { skip?: number; limit?: number; status?: string; platform?: string } = {}
): Promise<{ campaigns: Campaign[]; total: number }> => {
  const skip = options.skip || 0;
  const limit = options.limit || 50;

  let whereClause = 'WHERE user_id = $1';
  let paramIndex = 2;
  const params: unknown[] = [userId];

  if (options.status) {
    whereClause += ` AND status = $${paramIndex}`;
    params.push(options.status);
    paramIndex++;
  }

  if (options.platform) {
    whereClause += ` AND platform = $${paramIndex}`;
    params.push(options.platform);
    paramIndex++;
  }

  // Get total count
  const countResult = await query(`SELECT COUNT(*) as count FROM campaigns ${whereClause}`, params);
  const total = (countResult.rows[0] as { count: number }).count;

  // Get paginated results
  const result = await query(
    `SELECT * FROM campaigns ${whereClause}
     ORDER BY created_at DESC
     LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
    [...params, limit, skip]
  );

  return {
    campaigns: result.rows as Campaign[],
    total,
  };
};

/**
 * Update campaign
 */
export const updateCampaign = async (id: string, updates: Partial<Campaign>): Promise<Campaign> => {
  const fields: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  if (updates.name !== undefined) {
    fields.push(`name = $${paramIndex}`);
    values.push(updates.name);
    paramIndex++;
  }

  if (updates.description !== undefined) {
    fields.push(`description = $${paramIndex}`);
    values.push(updates.description);
    paramIndex++;
  }

  if (updates.status !== undefined) {
    fields.push(`status = $${paramIndex}`);
    values.push(updates.status);
    paramIndex++;
  }

  if (updates.platform !== undefined) {
    fields.push(`platform = $${paramIndex}`);
    values.push(updates.platform);
    paramIndex++;
  }

  if (updates.niche !== undefined) {
    fields.push(`niche = $${paramIndex}`);
    values.push(updates.niche);
    paramIndex++;
  }

  fields.push(`updated_at = NOW()`);

  values.push(id);
  const sql = `UPDATE campaigns SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`;

  const result = await query(sql, values);
  return result.rows[0] as Campaign;
};

/**
 * Delete campaign (soft delete via status)
 */
export const archiveCampaign = async (id: string): Promise<void> => {
  await query('UPDATE campaigns SET status = $1, updated_at = NOW() WHERE id = $2', ['archived', id]);
};

/**
 * Publish campaign (set published_at timestamp)
 */
export const publishCampaign = async (id: string): Promise<Campaign> => {
  const result = await query(
    'UPDATE campaigns SET status = $1, published_at = NOW(), updated_at = NOW() WHERE id = $2 RETURNING *',
    ['active', id]
  );
  return result.rows[0] as Campaign;
};

/**
 * Schedule campaign for future publish
 */
export const scheduleCampaign = async (id: string, scheduledFor: Date): Promise<Campaign> => {
  const result = await query(
    'UPDATE campaigns SET status = $1, scheduled_for = $2, updated_at = NOW() WHERE id = $3 RETURNING *',
    ['active', scheduledFor, id]
  );
  return result.rows[0] as Campaign;
};

/**
 * Get campaigns due for publishing (scheduled_for <= now)
 */
export const getScheduledCampaigns = async (): Promise<Campaign[]> => {
  const result = await query(
    `SELECT * FROM campaigns
     WHERE status = 'active' AND scheduled_for <= NOW() AND published_at IS NULL
     ORDER BY scheduled_for ASC`,
    []
  );
  return result.rows as Campaign[];
};

/**
 * Pause campaign
 */
export const pauseCampaign = async (id: string): Promise<Campaign> => {
  const result = await query(
    'UPDATE campaigns SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
    ['paused', id]
  );
  return result.rows[0] as Campaign;
};
