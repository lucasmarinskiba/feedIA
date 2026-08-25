/**
 * Initialize quota usage log table
 * Tracks all generation + charges with idempotent generationId constraint
 * Prevents double-charging if generation pipeline retries
 */

import { getPool } from '../db/postgres-real.js';
import { log } from '../agent/logger.js';

export const initializeQuotaLogging = async (): Promise<void> => {
  try {
    await getPool().query(`
      CREATE TABLE IF NOT EXISTS quota_usage_log (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL REFERENCES user_tiers(user_id) ON DELETE CASCADE,
        format VARCHAR(50) NOT NULL CHECK (format IN ('carousels', 'stories', 'videos')),
        generation_id VARCHAR(255) NOT NULL UNIQUE,
        count INTEGER DEFAULT 1,
        recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_user_format (user_id, format, recorded_at),
        INDEX idx_generation_id (generation_id)
      )
    `);

    log.info('[DB] quota_usage_log table initialized');
  } catch (err) {
    log.error('[DB Init] quota_usage_log failed', { error: String(err) });
    throw err;
  }
};
