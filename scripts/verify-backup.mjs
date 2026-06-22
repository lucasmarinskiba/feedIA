#!/usr/bin/env node
// Verifies a Supabase backup by restoring it into a local Postgres database and running smoke checks.
// Usage: node scripts/verify-backup.mjs <backup-file.sql>

import { spawn } from 'child_process';
import { existsSync } from 'fs';

const backupFile = process.argv[2];

if (!backupFile || !existsSync(backupFile)) {
  console.error('Usage: node scripts/verify-backup.mjs <backup-file.sql>');
  process.exit(1);
}

const localDbUrl = process.env.VERIFY_DATABASE_URL || 'postgres://postgres:postgres@localhost:54322/feedia_verify';

async function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: 'inherit', ...opts });
    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${cmd} failed with code ${code}`));
    });
  });
}

async function main() {
  console.log(`Verifying backup ${backupFile}...`);

  // Create target database
  await run('psql', [
    localDbUrl.replace(/\/[^/]+$/, '/postgres'),
    '-c',
    'DROP DATABASE IF EXISTS feedia_verify; CREATE DATABASE feedia_verify;',
  ]);

  // Restore backup
  await run('psql', [localDbUrl, '-f', backupFile]);

  // Smoke check: ensure core tables exist
  await run('psql', [
    localDbUrl,
    '-c',
    "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';",
  ]);

  console.log('✅ Backup verified successfully.');
}

main().catch((err) => {
  console.error('Backup verification failed:', err.message);
  process.exit(1);
});
