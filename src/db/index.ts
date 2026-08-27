/**
 * FeedIA Database Manager
 * Handles connection pooling, migrations, and query execution
 * Supports PostgreSQL (production) + SQLite (fallback)
 */

import type { PoolClient } from 'pg';
import { runMigrations, showMigrationStatus } from './migration-runner.js';
import { executeMutation, queryAs } from './typed-queries.js';

interface DatabaseConfig {
  host?: string;
  port?: number;
  database?: string;
  user?: string;
  password?: string;
  max_pool_size?: number;
}

let pool: PoolClient | null = null;
let isPostgres = false;

const parseDbUrl = (url: string): DatabaseConfig => {
  try {
    const u = new URL(url);
    return {
      host: u.hostname,
      port: parseInt(u.port, 10) || 5432,
      database: u.pathname.slice(1),
      user: u.username,
      password: u.password,
    };
  } catch {
    return {};
  }
};

/**
 * Initialize database connection
 * Tries PostgreSQL first, falls back to SQLite if not available
 */
export const initializeDatabase = async (): Promise<void> => {
  const dbUrl = process.env['DATABASE_URL'];
  const dbProvider = process.env['DB_PROVIDER'] || 'auto';

  console.log('[DB] Initializing database...');

  try {
    if (dbProvider === 'postgres' || (dbProvider === 'auto' && dbUrl)) {
      // Try PostgreSQL
      const config = parseDbUrl(dbUrl || '');
      if (config.host) {
        try {
          const { Pool } = await import('pg');
          const pgPool = new Pool(config);
          pool = await pgPool.connect();
          isPostgres = true;
          console.log('[DB] Connected to PostgreSQL');

          // Run migrations
          await showMigrationStatus(pool);
          await runMigrations(pool);
          return;
        } catch (err) {
          console.warn('[DB] PostgreSQL connection failed:', (err as Error).message);
          if (dbProvider === 'postgres') throw err; // Fail if explicitly requested
        }
      }
    }

    // Fallback to SQLite
    console.log('[DB] Using SQLite (file-based)');
    isPostgres = false;
    // SQLite initialization handled by sqlite-pool.ts
  } catch (err) {
    console.error('[DB] Database initialization failed:', err);
    throw err;
  }
};

/**
 * Execute a query
 */
export const query = async (sql: string, params?: unknown[]): Promise<{ rows: unknown[]; rowCount: number }> => {
  if (!pool && isPostgres) {
    throw new Error('[DB] Database not initialized');
  }

  if (isPostgres && pool) {
    const result = await queryAs(sql, params);
    return {
      rows: result.rows,
      rowCount: result.rowCount || 0,
    };
  }

  // SQLite fallback
  throw new Error('[DB] SQLite fallback not implemented yet');
};

/**
 * Transaction wrapper
 */
export const transaction = async <T>(callback: (client: PoolClient) => Promise<T>): Promise<T> => {
  if (!pool || !isPostgres) {
    throw new Error('[DB] Transactions only supported with PostgreSQL');
  }

  await executeMutation('BEGIN');
  try {
    const result = await callback(pool);
    await executeMutation('COMMIT');
    return result;
  } catch (err) {
    await executeMutation('ROLLBACK');
    throw err;
  }
};

/**
 * Close database connection
 */
export const close = async (): Promise<void> => {
  if (pool) {
    await pool.end();
    pool = null;
  }
};

/**
 * Health check
 */
export const healthCheck = async (): Promise<boolean> => {
  try {
    if (isPostgres && pool) {
      const result = await queryAs('SELECT 1');
      return result.rowCount === 1;
    }
    return false;
  } catch {
    return false;
  }
};
