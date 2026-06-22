import Redis from 'ioredis';

export interface HealthCheckResult {
  status: 'ok' | 'error';
  latencyMs: number;
  message?: string;
}

export interface HealthReport {
  ok: boolean;
  version: string;
  timestamp: string;
  checks: {
    redis?: HealthCheckResult;
    supabase?: HealthCheckResult;
  };
}

const checkRedis = async (): Promise<HealthCheckResult> => {
  const url = process.env.REDIS_URL;
  if (!url) return { status: 'error', latencyMs: 0, message: 'REDIS_URL not configured' };

  const start = Date.now();
  const redis = new Redis(url, {
    tls: url.startsWith('rediss://') ? { rejectUnauthorized: false } : undefined,
    maxRetriesPerRequest: 1,
    connectTimeout: 5000,
  });

  try {
    await redis.ping();
    return { status: 'ok', latencyMs: Date.now() - start };
  } catch (err) {
    return { status: 'error', latencyMs: Date.now() - start, message: (err as Error).message };
  } finally {
    await redis.quit();
  }
};

const checkSupabase = async (): Promise<HealthCheckResult> => {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return { status: 'error', latencyMs: 0, message: 'Supabase not configured' };

  const start = Date.now();
  try {
    const res = await fetch(`${url}/rest/v1/`, {
      method: 'HEAD',
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    });
    if (res.ok || res.status === 401 || res.status === 405) {
      return { status: 'ok', latencyMs: Date.now() - start };
    }
    return { status: 'error', latencyMs: Date.now() - start, message: `HTTP ${res.status}` };
  } catch (err) {
    return { status: 'error', latencyMs: Date.now() - start, message: (err as Error).message };
  }
};

export const runHealthChecks = async (): Promise<HealthReport> => {
  const [redis, supabase] = await Promise.all([checkRedis(), checkSupabase()]);
  const ok = redis.status === 'ok' && supabase.status === 'ok';

  return {
    ok,
    version: process.env.VERCEL_GIT_COMMIT_SHA || process.env.GITHUB_SHA || 'dev',
    timestamp: new Date().toISOString(),
    checks: { redis, supabase },
  };
};
