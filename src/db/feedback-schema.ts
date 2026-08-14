/**
 * Feedback Schema Initialization
 * Creates feedback table if not exists
 */

import { getPool } from './postgres-real.js';

export const initFeedbackSchema = async (): Promise<void> => {
  try {
    const pool = getPool();

    // Create feedback table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS feedback (
        id VARCHAR(255) PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        batch_id INTEGER NOT NULL,
        rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
        content TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, batch_id)
      )
    `);

    // Create index for analytics queries
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_feedback_batch_id ON feedback(batch_id)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_feedback_user_id ON feedback(user_id)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON feedback(created_at)
    `);

    console.log('[Schema] Feedback table initialized');
  } catch (err) {
    console.error('[Schema] Feedback table init failed:', err);
    throw err;
  }
};

export const initWeightsSchema = async (): Promise<void> => {
  try {
    const pool = getPool();

    // Store dynamic ranking weights after retraining
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ranking_weights (
        id VARCHAR(255) PRIMARY KEY,
        format_weight DECIMAL(3, 2) DEFAULT 0.50,
        category_weight DECIMAL(3, 2) DEFAULT 0.30,
        topic_weight DECIMAL(3, 2) DEFAULT 0.20,
        quality_boost BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('[Schema] Ranking weights table initialized');
  } catch (err) {
    console.error('[Schema] Ranking weights init failed:', err);
    throw err;
  }
};
