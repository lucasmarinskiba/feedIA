#!/usr/bin/env node
// Pre-deploy validation runner.
// Usage: node scripts/setup-all.mjs

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function run(cmd, args = []) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      cwd: join(__dirname, '..'),
      stdio: 'inherit',
      shell: process.platform === 'win32',
    });
    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Command failed with code ${code}`));
    });
  });
}

async function main() {
  console.log('\n🔍 1/4 Validating environment variables...\n');
  await run('node', ['scripts/validate-env.mjs', '--strict']);

  console.log('\n🔍 2/4 Checking Supabase connectivity...\n');
  await run('node', ['scripts/setup-supabase.mjs']);

  console.log('\n🔍 3/4 Checking Redis connectivity...\n');
  await run('node', ['scripts/setup-redis.mjs']);

  console.log('\n🔍 4/4 Running build verification...\n');
  await run('npm', ['run', 'verify']);

  console.log('\n✅ All pre-deploy checks passed. You can now deploy to Vercel + workers host.');
}

main().catch((err) => {
  console.error('\n❌ Setup failed:', err.message);
  process.exit(1);
});
