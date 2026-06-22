#!/usr/bin/env node
// Cleans up stale cache keys and failed BullMQ jobs from Redis.
// Usage: node scripts/cleanup-redis.mjs [--dry-run] [--max-age-days=7]

import Redis from 'ioredis';

const redisUrl = process.env.REDIS_URL;
const dryRun = process.argv.includes('--dry-run');
const maxAgeDays = Number(process.argv.find((a) => a.startsWith('--max-age-days='))?.split('=')[1] || 7);

if (!redisUrl) {
  console.error('Missing REDIS_URL');
  process.exit(1);
}

async function main() {
  const redis = new Redis(redisUrl, {
    tls: redisUrl.startsWith('rediss://') ? { rejectUnauthorized: false } : undefined,
  });

  try {
    const cachePattern = 'feedia:cache:*';
    const cacheKeys = await redis.keys(cachePattern);
    let removed = 0;

    for (const key of cacheKeys) {
      const ttl = await redis.ttl(key);
      if (ttl < 0) {
        console.log(`${dryRun ? '[DRY-RUN]' : 'Removing'} expired cache key: ${key}`);
        if (!dryRun) await redis.del(key);
        removed++;
      }
    }

    console.log(`${dryRun ? '[DRY-RUN] Would remove' : 'Removed'} ${removed} stale cache keys.`);

    // BullMQ failed jobs older than maxAgeDays
    const queues = ['videoGenerate', 'socialPublish', 'batchAudit', 'contentForge'];
    for (const queue of queues) {
      const failed = await redis.zrangebyscore(`bull:${queue}:failed`, 0, Date.now() - maxAgeDays * 86400000);
      console.log(`${dryRun ? '[DRY-RUN]' : 'Removing'} ${failed.length} failed jobs from ${queue}`);
      if (!dryRun && failed.length) {
        await redis.zrem(`bull:${queue}:failed`, ...failed);
      }
    }
  } finally {
    await redis.quit();
  }
}

main().catch((err) => {
  console.error('Redis cleanup failed:', err.message);
  process.exit(1);
});
