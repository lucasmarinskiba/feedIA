#!/usr/bin/env node
// Connectivity check for Redis / Upstash from local env.
// Usage: node scripts/setup-redis.mjs

import 'dotenv/config';
import Redis from 'ioredis';

const redisUrl = process.env.REDIS_URL;

if (!redisUrl) {
  console.error('Missing REDIS_URL');
  process.exit(1);
}

async function check() {
  const redis = new Redis(redisUrl, {
    tls: redisUrl.startsWith('rediss://') ? { rejectUnauthorized: false } : undefined,
    maxRetriesPerRequest: 1,
    connectTimeout: 10000,
  });

  try {
    const pong = await redis.ping();
    console.log(`✅ Redis reachable. PING = ${pong}`);
    await redis.quit();
  } catch (err) {
    console.error('❌ Cannot reach Redis:', err.message);
    process.exit(1);
  }
}

check();
