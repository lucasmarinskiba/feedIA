/**
 * SQLite Connection Pool
 * Local database for development/testing
 * Fallback when PostgreSQL unavailable
 */

import Database from 'better-sqlite3';
import path from 'path';

interface QueryResult {
  rows: unknown[];
  rowCount: number;
}

interface PoolConnection {
  query: (sql: string, params?: unknown[]) => Promise<QueryResult>;
  close?: () => Promise<void>;
}

let sqliteDb: Database.Database | null = null;

const initializeSQLitePool = (): PoolConnection => {
  try {
    const dbPath = path.resolve(process.cwd(), 'feedia.db');
    console.log('[SQLite] Initializing database at', { dbPath });

    sqliteDb = new Database(dbPath);
    sqliteDb.pragma('journal_mode = WAL');
    sqliteDb.pragma('foreign_keys = ON');

    console.log('[SQLite] Database initialized');

    return {
      query: async (sql: string, params?: unknown[]): Promise<QueryResult> => {
        try {
          if (!sqliteDb) throw new Error('Database not initialized');

          // Normalize query for SQLite compatibility
          let normalizedSql = sql.toLowerCase();

          // Handle RETURNING clause (PostgreSQL) -> SQLite last_insert_rowid()
          if (normalizedSql.includes('returning')) {
            const stmt = sqliteDb.prepare(sql);
            const result = stmt.run(...(params || []));
            return {
              rows: [{ id: result.lastInsertRowid }],
              rowCount: result.changes,
            };
          }

          const stmt = sqliteDb.prepare(sql);
          const result = stmt.all(...(params || []));

          return {
            rows: Array.isArray(result) ? result : [result],
            rowCount: Array.isArray(result) ? result.length : 1,
          };
        } catch (err) {
          console.error('[SQLite] Query error:', err, { sql });
          throw err;
        }
      },
      close: async (): Promise<void> => {
        if (sqliteDb) {
          sqliteDb.close();
          sqliteDb = null;
          console.log('[SQLite] Database closed');
        }
      },
    };
  } catch (err) {
    console.error('[SQLite] Failed to initialize:', String(err));
    throw err;
  }
};

export const getSQLitePool = (): PoolConnection => {
  if (!sqliteDb) {
    return initializeSQLitePool();
  }
  return {
    query: async (sql: string, params?: unknown[]): Promise<QueryResult> => {
      if (!sqliteDb) throw new Error('Database not initialized');
      const stmt = sqliteDb.prepare(sql);
      const result = stmt.all(...(params || []));
      return {
        rows: Array.isArray(result) ? result : [result],
        rowCount: Array.isArray(result) ? result.length : 1,
      };
    },
  };
};
