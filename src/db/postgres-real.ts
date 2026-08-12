/**
 * PostgreSQL Real Connection Pool
 * Uses pg library for production database access
 * Fallback to mock when DATABASE_URL unavailable
 */

interface QueryResult {
  rows: unknown[];
  rowCount: number;
}

interface PoolConnection {
  query: (sql: string, params?: unknown[]) => Promise<QueryResult>;
}

let realPool: PoolConnection | null = null;

// Try to load pg module
const initializeRealPool = (): PoolConnection | null => {
  try {
    // Dynamic import to avoid hard dependency
    const PostgresPool = require('pg').Pool;

    if (!process.env.DATABASE_URL) {
      console.warn('[PostgreSQL] DATABASE_URL not set, using mock pool');
      return null;
    }

    const pool = new PostgresPool({
      connectionString: process.env.DATABASE_URL,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    pool.on('error', (err: Error) => {
      console.error('[PostgreSQL] Pool error:', err);
    });

    console.log('[PostgreSQL] Real connection pool initialized');
    return {
      query: async (sql: string, params?: unknown[]): Promise<QueryResult> => {
        const result = await pool.query(sql, params);
        return {
          rows: result.rows,
          rowCount: result.rowCount || 0,
        };
      },
    };
  } catch (err) {
    console.warn('[PostgreSQL] Failed to initialize real pool:', String(err));
    return null;
  }
};

// Mock pool fallback
const mockPool: PoolConnection = {
  query: async (sql: string, params?: unknown[]): Promise<QueryResult> => {
    console.log('[MockPool] Query:', sql.substring(0, 50), '...');
    // Return empty rows for all queries (no persistence)
    return { rows: [], rowCount: 0 };
  },
};

// Get effective pool
export const getPool = (): PoolConnection => {
  if (!realPool) {
    realPool = initializeRealPool();
  }
  return realPool || mockPool;
};

export const isRealDatabase = (): boolean => {
  if (!realPool) {
    realPool = initializeRealPool();
  }
  return realPool !== null && realPool !== mockPool;
};

export const closePool = async (): Promise<void> => {
  if (realPool && realPool !== mockPool) {
    console.log('[PostgreSQL] Closing connection pool');
    try {
      // Type assertion needed because we don't have pg types
      const poolInstance = (realPool as any).pool;
      if (poolInstance) {
        await poolInstance.end();
      }
    } catch (err) {
      console.error('[PostgreSQL] Error closing pool:', err);
    }
  }
};
