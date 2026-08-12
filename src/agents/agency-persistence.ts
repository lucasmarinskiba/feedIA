/**
 * Agency Persistence Layer (TIER 8 Phase 2)
 * PostgreSQL campaigns storage + retrieval
 * Phase 5: Real PostgreSQL support via DATABASE_URL
 */

import { getPool, isRealDatabase } from '../db/postgres-real.js';
import type { CampaignOutput } from './agency-orchestrator.js';

/**
 * Initialize campaigns table (if not exists)
 */
export const initializeCampaignsTable = async (): Promise<void> => {
  try {
    const dbStatus = isRealDatabase() ? 'real PostgreSQL' : 'mock pool';
    console.log(`[TIER 8 Phase 5] Initializing campaigns table (${dbStatus})`);

    await getPool().query(`
      CREATE TABLE IF NOT EXISTS agency_campaigns (
        id TEXT PRIMARY KEY,
        account_id TEXT NOT NULL,
        version INTEGER DEFAULT 1,
        strategy JSONB NOT NULL,
        art JSONB,
        copy JSONB,
        engagement JSONB,
        validation JSONB,
        status TEXT DEFAULT 'draft',
        total_tokens INTEGER DEFAULT 0,
        estimated_cost DECIMAL(10, 6) DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        INDEX idx_account_id (account_id),
        INDEX idx_created_at (created_at)
      );
    `);
    console.log('[TIER 8] Campaigns table initialized');
  } catch (err) {
    console.error('[TIER 8] Failed to initialize campaigns table:', err);
    throw err;
  }
};

/**
 * Save campaign to PostgreSQL
 */
export const saveCampaign = async (campaign: CampaignOutput, accountId: string): Promise<void> => {
  try {
    await getPool().query(
      `INSERT INTO agency_campaigns
       (id, account_id, strategy, art, copy, engagement, validation, status, total_tokens, estimated_cost, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())`,
      [
        campaign.campaignId,
        accountId,
        JSON.stringify(campaign.strategy),
        JSON.stringify(campaign.art),
        JSON.stringify(campaign.copy),
        JSON.stringify(campaign.engagement),
        JSON.stringify(campaign.validation),
        'approved',
        campaign.totalTokens,
        campaign.estimatedCost,
      ]
    );
    console.log(`[TIER 8] Campaign ${campaign.campaignId} persisted to PostgreSQL`);
  } catch (err) {
    console.error('[TIER 8] Failed to save campaign:', err);
    throw err;
  }
};

/**
 * Load campaign from PostgreSQL
 * With schema validation to prevent data corruption
 */
export const loadCampaign = async (campaignId: string): Promise<CampaignOutput | null> => {
  try {
    const result = await getPool().query(
      `SELECT * FROM agency_campaigns WHERE id = $1`,
      [campaignId]
    );

    if (!result.rows || result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0] as any;

    // Validate required fields
    if (!row.id || typeof row.id !== 'string') {
      throw new Error('Invalid campaign ID from database');
    }
    if (!row.strategy || typeof row.strategy !== 'object') {
      throw new Error('Invalid strategy field from database');
    }
    if (typeof row.total_tokens !== 'number' || typeof row.estimated_cost !== 'number') {
      throw new Error('Invalid token/cost fields from database');
    }

    return {
      campaignId: row.id,
      strategy: row.strategy,
      art: row.art || {},
      copy: row.copy || {},
      engagement: row.engagement || {},
      validation: row.validation || { approved: false, score: 0, issues: [] },
      totalTokens: row.total_tokens,
      estimatedCost: row.estimated_cost,
    };
  } catch (err) {
    console.error('[TIER 8] Failed to load campaign:', err);
    throw new Error(`Campaign load failed: ${String(err)}`);
  }
};

/**
 * List campaigns for account
 */
export const listCampaigns = async (
  accountId: string,
  limit: number = 20,
  offset: number = 0
): Promise<{ campaigns: unknown[]; total: number }> => {
  try {
    const countResult = await getPool().query(
      `SELECT COUNT(*) as count FROM agency_campaigns WHERE account_id = $1`,
      [accountId]
    );

    const dataResult = await getPool().query(
      `SELECT id, strategy, status, estimated_cost, created_at FROM agency_campaigns
       WHERE account_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [accountId, limit, offset]
    );

    return {
      campaigns: dataResult.rows || [],
      total: countResult.rows?.[0]?.count || 0,
    };
  } catch (err) {
    console.error('[TIER 8] Failed to list campaigns:', err);
    return { campaigns: [], total: 0 };
  }
};

/**
 * Update campaign status
 */
export const updateCampaignStatus = async (campaignId: string, status: string): Promise<void> => {
  try {
    await getPool().query(
      `UPDATE agency_campaigns SET status = $1, updated_at = NOW() WHERE id = $2`,
      [status, campaignId]
    );
    console.log(`[TIER 8] Campaign ${campaignId} status updated to ${status}`);
  } catch (err) {
    console.error('[TIER 8] Failed to update campaign status:', err);
  }
};
