/**
 * Database Connection Pool
 * Priority: PostgreSQL → SQLite → Mock
 * Uses pg for production, SQLite for dev/testing
 */

import { createRequire } from 'node:module';

import { getFilePool } from './sqlite-pool.js';

// This file compiles to ESM, where `require` is not defined. createRequire gives
// us a CommonJS-style loader so pg can stay an optional, lazily-resolved import
// without making initializeRealPool async (which would ripple into every caller).
const require = createRequire(import.meta.url);

interface QueryResult {
  rows: unknown[];
  rowCount: number;
}

interface PoolConnection {
  query: (sql: string, params?: unknown[]) => Promise<QueryResult>;
  close?: () => Promise<void>;
}

let realPool: PoolConnection | null = null;
interface PgPoolType {
  query: (sql: string, params?: unknown[]) => Promise<{ rows: unknown[]; rowCount: number }>;
  on: (event: string, handler: (err: Error) => void) => void;
  end: () => Promise<void>;
}
let poolInstance: PgPoolType | null = null; // Store reference to actual pg pool for cleanup

// Try to load pg module
const initializeRealPool = (): PoolConnection | null => {
  try {
    // Resolved lazily so a missing pg install degrades to SQLite instead of
    // failing at module load.
    const PostgresPool = require('pg').Pool;

    if (!process.env.DATABASE_URL) {
      console.warn('[PostgreSQL] DATABASE_URL not set, trying SQLite...');
      return null;
    }

    poolInstance = new PostgresPool({
      connectionString: process.env.DATABASE_URL,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
      statement_timeout: 30000, // 30s query timeout
    });

    poolInstance.on('error', (err: Error) => {
      console.error('[PostgreSQL] Pool error:', err);
    });

    console.log('[PostgreSQL] Real connection pool initialized');
    const pool = poolInstance; // Capture for closure
    return {
      query: async (sql: string, params?: unknown[]): Promise<QueryResult> => {
        const result = await pool.query(sql, params);
        return {
          rows: result.rows,
          rowCount: result.rowCount || 0,
        };
      },
      close: async (): Promise<void> => {
        await pool.end();
      },
    };
  } catch (err) {
    console.warn('[PostgreSQL] Failed to initialize real pool:', String(err));
    return null;
  }
};

// File-based DB fallback (no native deps)
const initializeFilePool = (): PoolConnection | null => {
  try {
    const filePool = getFilePool();
    console.log('[FileDB] Fallback pool initialized (development/testing)');
    return filePool;
  } catch (err) {
    console.warn('[FileDB] Failed to initialize:', String(err));
    return null;
  }
};

// Mock pool fallback (no persistence)
const mockPool: PoolConnection = {
  query: async (sql: string, _params?: unknown[]): Promise<QueryResult> => {
    console.log('[MockPool] Query:', sql.substring(0, 50), '...');
    // Return empty rows for all queries (no persistence)
    return { rows: [], rowCount: 0 };
  },
};

// Get effective pool (priority: PostgreSQL → MemoryDB → Mock)
export const getPool = (): PoolConnection => {
  if (!realPool) {
    const pg = initializeRealPool();
    if (pg) {
      realPool = pg;
      console.log('[Pool] Using PostgreSQL');
    } else {
      const mem = initializeFilePool();
      if (mem) {
        realPool = mem;
        console.log('[Pool] Using MemoryDB (FileDB fallback)');
      } else {
        console.log('[Pool] Using Mock pool');
      }
    }
  }
  return realPool || mockPool;
};

export const isRealDatabase = (): boolean => {
  if (!realPool) {
    getPool(); // Trigger initialization
  }
  return realPool !== null && realPool !== mockPool;
};

export const closePool = async (): Promise<void> => {
  if (realPool && realPool !== mockPool && poolInstance) {
    console.log('[PostgreSQL] Closing connection pool');
    try {
      if (realPool.close) {
        await realPool.close();
      } else {
        await poolInstance.end();
      }
    } catch (err) {
      console.error('[PostgreSQL] Error closing pool:', err);
    }
  }
};
