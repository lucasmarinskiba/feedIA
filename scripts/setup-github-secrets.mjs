#!/usr/bin/env node
// Sets GitHub Actions secrets from .env.staging and .env.production files.
// Requires GitHub CLI (gh) authenticated.
// Usage: node scripts/setup-github-secrets.mjs

import { readFile } from 'fs/promises';
import { spawn } from 'child_process';
import { existsSync } from 'fs';

const envFiles = ['.env.staging', '.env.production'];

async function runGhSecretSet(key, value, env = null) {
  return new Promise((resolve, reject) => {
    const args = ['secret', 'set', key];
    if (env) args.push('--env', env);
    const child = spawn('gh', args, {
      stdio: ['pipe', 'inherit', 'inherit'],
    });
    child.stdin.write(value);
    child.stdin.end();
    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`gh secret set ${key} failed with code ${code}`));
    });
  });
}

async function parseEnvFile(path) {
  if (!existsSync(path)) {
    console.warn(`File not found: ${path}`);
    return [];
  }
  const content = await readFile(path, 'utf-8');
  const secrets = [];
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!key) continue;
    secrets.push({ key, value });
  }
  return secrets;
}

async function main() {
  // Check gh CLI
  const ghCheck = await new Promise((resolve) => {
    const child = spawn('gh', ['auth', 'status'], { stdio: 'ignore' });
    child.on('close', (code) => resolve(code === 0));
  });

  if (!ghCheck) {
    console.error('GitHub CLI (gh) is not authenticated. Run: gh auth login');
    process.exit(1);
  }

  for (const file of envFiles) {
    const env = file === '.env.staging' ? 'staging' : 'production';
    const secrets = await parseEnvFile(file);

    if (secrets.length === 0) {
      console.log(`No secrets found in ${file}; skipping.`);
      continue;
    }

    console.log(`\nSetting ${secrets.length} secrets for environment: ${env}`);
    for (const { key, value } of secrets) {
      if (!value) {
        console.log(`  ⚠️  Skipping empty ${key}`);
        continue;
      }
      try {
        await runGhSecretSet(key, value, env);
        console.log(`  ✅ ${key}`);
      } catch (err) {
        console.error(`  ❌ ${key}: ${err.message}`);
      }
    }
  }

  // Repository-level secrets (not environment-specific)
  const repoSecretsFile = '.env.repo-secrets';
  if (existsSync(repoSecretsFile)) {
    const secrets = await parseEnvFile(repoSecretsFile);
    console.log(`\nSetting ${secrets.length} repository-level secrets`);
    for (const { key, value } of secrets) {
      if (!value) {
        console.log(`  ⚠️  Skipping empty ${key}`);
        continue;
      }
      try {
        await runGhSecretSet(key, value);
        console.log(`  ✅ ${key}`);
      } catch (err) {
        console.error(`  ❌ ${key}: ${err.message}`);
      }
    }
  }

  console.log('\nDone. Review empty secrets and set them manually via GitHub UI if needed.');
}

main().catch((err) => {
  console.error('Setup failed:', err.message);
  process.exit(1);
});
