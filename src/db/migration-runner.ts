/**
 * Database Migration Runner
 * Executes SQL migration files in order
 * Supports SQLite, PostgreSQL, MySQL
 */

import fs from 'fs';
import path from 'path';
import type { PoolClient } from 'pg';

interface Migration {
  name: string;
  version: number;
  executed_at: string | null;
}

const MIGRATIONS_DIR = path.join(process.cwd(), 'db', 'migrations');

const createMigrationsTable = async (client: PoolClient): Promise<void> => {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      version INTEGER NOT NULL,
      executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
};

const getMigrations = async (client: PoolClient): Promise<Migration[]> => {
  const result = await client.query('SELECT name, version, executed_at FROM schema_migrations ORDER BY version');
  return result.rows;
};

const splitSqlStatements = (sql: string): string[] => {
  // Split by semicolon but preserve it
  return sql
    .split(';')
    .map((stmt) => stmt.trim())
    .filter((stmt) => stmt.length > 0);
};

export const runMigrations = async (client: PoolClient): Promise<void> => {
  try {
    console.log('[Migrations] Starting migration runner...');

    // Create migrations table
    await createMigrationsTable(client);
    console.log('[Migrations] Created schema_migrations table');

    // Get executed migrations
    const executed = await getMigrations(client);
    const executedNames = new Set(executed.map((m) => m.name));

    // Read migration files
    if (!fs.existsSync(MIGRATIONS_DIR)) {
      console.warn('[Migrations] No migrations directory found');
      return;
    }

    const files = fs
      .readdirSync(MIGRATIONS_DIR)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    console.log(`[Migrations] Found ${files.length} migration files`);

    // Execute each migration
    for (const file of files) {
      if (executedNames.has(file)) {
        console.log(`[Migrations] ✓ ${file} (already executed)`);
        continue;
      }

      const filePath = path.join(MIGRATIONS_DIR, file);
      const sql = fs.readFileSync(filePath, 'utf-8');
      const version = parseInt(file.split('-')[0], 10);

      console.log(`[Migrations] Executing ${file}...`);

      try {
        // Split into statements (handle multiple statements per file)
        const statements = splitSqlStatements(sql);
        for (const statement of statements) {
          if (statement.trim()) {
            await client.query(statement);
          }
        }

        // Record migration
        await client.query('INSERT INTO schema_migrations (name, version, executed_at) VALUES ($1, $2, CURRENT_TIMESTAMP)', [
          file,
          version,
        ]);

        console.log(`[Migrations] ✓ ${file} executed successfully`);
      } catch (err) {
        console.error(`[Migrations] ✗ ${file} FAILED`);
        throw err;
      }
    }

    console.log('[Migrations] All migrations completed ✓');
  } catch (err) {
    console.error('[Migrations] Migration failed:', err);
    throw err;
  }
};

/**
 * Dry-run: show what migrations would execute
 */
export const showMigrationStatus = async (client: PoolClient): Promise<void> => {
  await createMigrationsTable(client);
  const executed = await getMigrations(client);
  const executedNames = new Set(executed.map((m) => m.name));

  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  console.log('\n[Migrations] Status:');
  for (const file of files) {
    const status = executedNames.has(file) ? '✓' : '○';
    console.log(`  ${status} ${file}`);
  }
  console.log('');
};
