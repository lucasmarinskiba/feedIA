#!/usr/bin/env node
// Validates required environment variables for production deploy.
// Usage: node scripts/validate-env.mjs [--strict] [--env=staging|production]

import 'dotenv/config';

const args = process.argv.slice(2);
const strict = args.includes('--strict');
const envArg = args.find((a) => a.startsWith('--env='));
const env = envArg ? envArg.split('=')[1] : process.env.NODE_ENV || 'production';

const commonRequired = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'REDIS_URL', 'SESSION_SECRET'];
const commonRecommended = ['SUPABASE_ANON_KEY', 'ANTHROPIC_API_KEY', 'NODE_ENV'];

const envSpecific = {
  staging: {
    required: ['PUBLIC_BASE_URL'],
    recommended: ['RENDER_DEPLOY_HOOK_STAGING', 'RAILWAY_TOKEN_STAGING', 'FLY_API_TOKEN_STAGING'],
  },
  production: {
    required: ['PUBLIC_BASE_URL'],
    recommended: ['RENDER_DEPLOY_HOOK_PROD', 'RAILWAY_TOKEN_PROD', 'FLY_API_TOKEN_PROD', 'SENTRY_DSN'],
  },
};

const specific = envSpecific[env] || { required: [], recommended: [] };

const groups = [
  {
    name: 'Supabase',
    required: ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'],
    recommended: ['SUPABASE_ANON_KEY'],
  },
  {
    name: 'Redis / Upstash (workers + cache + observability)',
    required: ['REDIS_URL'],
  },
  {
    name: 'Auth / Sessions',
    required: ['SESSION_SECRET'],
    recommended: ['NODE_ENV'],
  },
  {
    name: 'AI / Media',
    recommended: ['ANTHROPIC_API_KEY'],
  },
  {
    name: `Deploy (${env})`,
    required: specific.required,
    recommended: specific.recommended,
  },
  {
    name: 'Monitoring alerts',
    recommended: ['ADMIN_WEBHOOK_URL', 'ALERT_EMAIL'],
  },
];

let exitCode = 0;

console.log(`\nValidating environment: ${env}\n`);

for (const group of groups) {
  const missing = (group.required || []).filter((k) => !process.env[k]);
  const missingRec = (group.recommended || []).filter((k) => !process.env[k]);

  console.log(`[${group.name}]`);
  if (missing.length) {
    console.log(`  ❌ Missing required: ${missing.join(', ')}`);
    exitCode = 1;
  }
  if (missingRec.length) {
    console.log(`  ⚠️  Missing recommended: ${missingRec.join(', ')}`);
  }
  if (!missing.length && !missingRec.length) {
    console.log('  ✅ OK');
  }
}

function assertUrl(key) {
  const val = process.env[key];
  if (!val) return;
  try {
    new URL(val);
  } catch {
    console.log(`\n❌ ${key} is not a valid URL`);
    exitCode = 1;
  }
}

assertUrl('SUPABASE_URL');
assertUrl('REDIS_URL');
if (process.env.PUBLIC_BASE_URL) assertUrl('PUBLIC_BASE_URL');

if (strict && exitCode === 0) {
  console.log('\n✅ All required environment variables are present.');
} else if (exitCode) {
  console.log('\n❌ Fix missing required variables before deploying.');
}

process.exit(exitCode);
