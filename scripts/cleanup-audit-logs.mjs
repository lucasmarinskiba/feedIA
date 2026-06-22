#!/usr/bin/env node
// Cleans up local audit logs and runtime artifacts older than COMPLIANCE_AUDIT_RETENTION_DAYS.
// Usage: node scripts/cleanup-audit-logs.mjs [--dry-run]

import { readdir, stat, unlink, rm } from 'fs/promises';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = dirname(__dirname);

const dryRun = process.argv.includes('--dry-run');
const retentionDays = Number(process.env.COMPLIANCE_AUDIT_RETENTION_DAYS || 90);
const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;

const dirs = [join(ROOT, 'output'), join(ROOT, 'data', 'runtime')];

async function cleanupDir(dir) {
  let removed = 0;
  try {
    const entries = await readdir(dir);
    for (const entry of entries) {
      const path = join(dir, entry);
      const s = await stat(path);
      if (s.mtimeMs < cutoff) {
        console.log(`${dryRun ? '[DRY-RUN] Would remove' : 'Removing'}: ${path}`);
        if (!dryRun) {
          await (s.isDirectory() ? rm(path, { recursive: true }) : unlink(path));
        }
        removed++;
      }
    }
  } catch (err) {
    if (err.code !== 'ENOENT') {
      console.warn(`Could not cleanup ${dir}:`, err.message);
    }
  }
  return removed;
}

async function main() {
  let total = 0;
  for (const dir of dirs) {
    total += await cleanupDir(dir);
  }
  console.log(`\n${dryRun ? '[DRY-RUN] Would remove' : 'Removed'} ${total} items older than ${retentionDays} days.`);
}

main().catch((err) => {
  console.error('Cleanup failed:', err.message);
  process.exit(1);
});
