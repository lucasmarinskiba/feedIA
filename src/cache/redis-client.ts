/**
 * Redis Client — Session cache, rate limiting, leaderboards
 * Auto-initializes if REDIS_URL env var is set
 */

import type { RedisClientType } from 'redis';
import { createClient } from 'redis';

let redisClient: RedisClientType | null = null;
let isConnected = false;

export const initRedis = async (): Promise<boolean> => {
  try {
    const redisUrl = process.env['REDIS_URL'];
    if (!redisUrl) {
      console.log('[Cache] Redis not configured (REDIS_URL not set) — using memory cache');
      return false;
    }

    redisClient = createClient({ url: redisUrl });
    redisClient.on('error', (err: Error) => console.error('[Redis] Error:', err.message));
    redisClient.on('connect', () => console.log('[Redis] Connected'));

    await redisClient.connect();
    isConnected = true;
    console.log('[Cache] Redis initialized');
    return true;
  } catch (err) {
    console.warn('[Cache] Redis connection failed:', (err as Error).message);
    console.log('[Cache] Falling back to memory cache');
    return false;
  }
};

/**
 * Cache operations
 */
export const setCache = async (key: string, value: unknown, ttl: number = 3600): Promise<void> => {
  if (!redisClient || !isConnected) return;

  try {
    await redisClient.setEx(key, ttl, JSON.stringify(value));
  } catch (err) {
    console.warn('[Cache] Set failed:', (err as Error).message);
  }
};

export const getCache = async <T>(key: string): Promise<T | null> => {
  if (!redisClient || !isConnected) return null;

  try {
    const value = await redisClient.get(key);
    return value ? (JSON.parse(value) as T) : null;
  } catch (err) {
    console.warn('[Cache] Get failed:', (err as Error).message);
    return null;
  }
};

export const deleteCache = async (key: string): Promise<void> => {
  if (!redisClient || !isConnected) return;

  try {
    await redisClient.del(key);
  } catch (err) {
    console.warn('[Cache] Delete failed:', (err as Error).message);
  }
};

/**
 * Rate limiting (token bucket algorithm)
 */
export const checkRateLimit = async (userId: string, limit: number = 100, windowSeconds: number = 60): Promise<boolean> => {
  if (!redisClient || !isConnected) return true; // Allow if Redis down

  const key = `ratelimit:${userId}`;

  try {
    const current = await redisClient.incr(key);

    if (current === 1) {
      await redisClient.expire(key, windowSeconds);
    }

    return current <= limit;
  } catch (err) {
    console.warn('[RateLimit] Check failed:', (err as Error).message);
    return true; // Fail open (allow if cache unavailable)
  }
};

/**
 * Session cache (JWT tokens)
 */
export const cacheSession = async (userId: string, sessionData: { token: string; expiresAt: number }): Promise<void> => {
  const key = `session:${userId}`;
  const ttl = Math.max(Math.floor((sessionData.expiresAt - Date.now()) / 1000), 60);
  await setCache(key, sessionData, ttl);
};

export const getSession = async (userId: string): Promise<{ token: string; expiresAt: number } | null> => getCache(`session:${userId}`);

export const invalidateSession = async (userId: string): Promise<void> => {
  await deleteCache(`session:${userId}`);
};

/**
 * Leaderboard operations (sorted sets)
 */
export const addToLeaderboard = async (leaderboardKey: string, userId: string, score: number): Promise<void> => {
  if (!redisClient || !isConnected) return;

  try {
    // node-redis v6's SortedSetMember field is `value`, not `member` --
    // this was silently throwing (caught below, so a swallowed no-op)
    // on every single leaderboard write.
    await redisClient.zAdd(leaderboardKey, { score, value: userId });
    await redisClient.expire(leaderboardKey, 86400); // 24 hour TTL
  } catch (err) {
    console.warn('[Leaderboard] Add failed:', (err as Error).message);
  }
};

export const getTopLeaderboard = async (leaderboardKey: string, limit: number = 10): Promise<Array<{ userId: string; score: number }>> => {
  if (!redisClient || !isConnected) return [];

  try {
    // zRangeByScoreWithScores doesn't exist on node-redis v6's client at
    // all (confirmed: no such file in node_modules/@redis/client) --
    // this threw "is not a function" on every call, caught below, so
    // this leaderboard has always silently returned empty. v6's
    // equivalent for "top N by score" is zRangeWithScores with REV:true
    // over the index range [0, limit-1] (REV flips ordering so index 0
    // is the highest score) -- and its reply is already {value, score}
    // objects, not blob strings needing separate parsing.
    const results = await redisClient.zRangeWithScores(leaderboardKey, 0, limit - 1, {
      REV: true,
    });
    return results.map((item) => ({ userId: item.value as string, score: item.score }));
  } catch (err) {
    console.warn('[Leaderboard] Get failed:', (err as Error).message);
    return [];
  }
};

/**
 * Health check
 */
export const redisHealthCheck = async (): Promise<boolean> => {
  if (!redisClient || !isConnected) return false;

  try {
    const pong = await redisClient.ping();
    return pong === 'PONG';
  } catch {
    return false;
  }
};

/**
 * Disconnect
 */
export const closeRedis = async (): Promise<void> => {
  if (redisClient && isConnected) {
    await redisClient.quit();
    redisClient = null;
    isConnected = false;
  }
};

export const isRedisReady = (): boolean => isConnected;
