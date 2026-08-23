/**
 * Database Migration Runner
 * Executes SQL schema files against PostgreSQL
 */

import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

async function runMigrations(): Promise<void> {
  const connectionString = process.env.DATABASE_URL || process.env.DATABASE_PRIVATE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL or DATABASE_PRIVATE_URL not set in environment');
  }

  const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });

  try {
    // Load and execute schema files in order
    const schemaFiles = [
      'src/db/carousel-storage-schema.sql',
      'src/db/video-storage-schema.sql',
      'src/db/analytics-schema.sql',
    ];

    for (const file of schemaFiles) {
      const filePath = path.resolve(process.cwd(), file);
      if (!fs.existsSync(filePath)) {
        console.log(`Skipping ${file} (not found)`);
        continue;
      }

      const sql = fs.readFileSync(filePath, 'utf-8');
      console.log(`Running migration: ${file}`);
      await pool.query(sql);
      console.log(`✓ ${file} completed`);
    }

    console.log('\n✓ All migrations completed successfully');
  } catch (err) {
    console.error('Migration failed:', err instanceof Error ? err.message : err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigrations().catch(console.error);
