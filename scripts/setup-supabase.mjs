#!/usr/bin/env node
// Connectivity check for Supabase from local env.
// Usage: node scripts/setup-supabase.mjs

import 'dotenv/config';

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

async function check() {
  try {
    const res = await fetch(`${url}/rest/v1/`, {
      method: 'HEAD',
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
      },
    });
    if (res.ok || res.status === 401 || res.status === 405) {
      console.log('✅ Supabase reachable.');
    } else {
      console.error(`❌ Supabase returned ${res.status}`);
      process.exit(1);
    }
  } catch (err) {
    console.error('❌ Cannot reach Supabase:', err.message);
    process.exit(1);
  }
}

check();
