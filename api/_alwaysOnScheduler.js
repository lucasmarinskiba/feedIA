/**
 * Always-On Scheduler — Premium feature.
 *
 * Vercel Hobby plan limita cron a daily. Para true always-on (cada 5min)
 * Premium user setea external cron (cron-job.org / GitHub Actions / EasyCron)
 * apuntando a /api/cron/always-on-tick con header Authorization: Bearer ${CRON_SECRET}.
 *
 * Vercel cron daily como baseline. Endpoint también accesible vía external trigger.
 *
 * Cada tick:
 *   1. Lista users con autopilot enabled
 *   2. Run autopilot tick + dispatch actions según plan tier
 *   3. Skip si user agotó quota diaria
 *
 * Frecuencia efectiva por plan (vía external cron):
 *   Premium: cada 5 min (288 ticks/día)
 *   Gold: cada 10 min (144 ticks/día)
 *   Pro: cada 30 min (48 ticks/día)
 *   Starter: cada 2hs (12 ticks/día)
 *   Free: cada 4hs (6 ticks/día)
 *
 * Endpoint usa cap diario para auto-throttle por plan.
 */

import * as store from './_store.js';
import { hasFeature } from './_planFeatures.js';

const ALWAYS_ON_KEY = 'feedia:scheduler:always-on:lastrun';

const listAllUserIds = async () => {
  // En prod: KV index. Aquí scan limited.
  const keys = await store.keys('feedia:user:u_');
  return keys.filter((k) => /^feedia:user:u_[0-9a-f]+$/.test(k)).map((k) => k.replace('feedia:user:', ''));
};

const tickForUser = async (userId, planId) => {
  // Check plan
  if (!hasFeature(planId, 'autopilot.enabled')) return { userId, skipped: 'no-autopilot' };
  // Check throttle per plan
  const ticksPerDay = planId === 'premium' ? 288 : planId === 'gold' ? 144 : planId === 'pro' ? 48 : 12;
  const today = new Date().toISOString().slice(0, 10);
  const tickKey = `feedia:user:${userId}:autopilot:ticks:${today}`;
  const ticks = Number((await store.get(tickKey)) || 0);
  if (ticks >= ticksPerDay) return { userId, skipped: 'daily-cap-reached', ticks, cap: ticksPerDay };

  // Run autopilot
  try {
    const { runFreeAutopilotTick } = await import('./_freeComputerUse.js');
    const result = await runFreeAutopilotTick({ userId, metrics: {} });
    await store.set(tickKey, ticks + 1);
    await store.set(`feedia:user:${userId}:autopilot:lasttick`, {
      ...result,
      executedAt: new Date().toISOString(),
      planId,
    });
    return { userId, planId, executed: true, recommendedActions: result.recommendedActions?.length || 0 };
  } catch (err) {
    return { userId, error: String(err.message || err) };
  }
};

export const runAlwaysOnTick = async () => {
  const startedAt = Date.now();
  const userIds = await listAllUserIds();
  const results = { premium: [], gold: [], pro: [], starter: [], free: [], skipped: 0, errors: 0 };

  for (const userId of userIds) {
    const user = await store.get(`feedia:user:${userId}`);
    if (!user) continue;
    const planId = user.plan || 'free';
    const tickResult = await tickForUser(userId, planId);
    if (results[planId]) results[planId].push(tickResult);
    if (tickResult.skipped) results.skipped++;
    if (tickResult.error) results.errors++;
  }

  await store.set(ALWAYS_ON_KEY, {
    ranAt: new Date().toISOString(),
    durationMs: Date.now() - startedAt,
    totalUsers: userIds.length,
    summary: {
      premium: results.premium.length,
      gold: results.gold.length,
      pro: results.pro.length,
      starter: results.starter.length,
      free: results.free.length,
      skipped: results.skipped,
      errors: results.errors,
    },
  });

  return { summary: { totalUsers: userIds.length, results } };
};

export const handleAlwaysOnCron = async (req, res, path, m) => {
  const json = (code, body) => {
    res.statusCode = code;
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify(body));
  };

  if (path === '/api/cron/always-on-tick' && (m === 'GET' || m === 'POST')) {
    // Vercel cron auth header
    if (process.env.CRON_SECRET) {
      const provided = req.headers['authorization'] || '';
      if (provided !== `Bearer ${process.env.CRON_SECRET}`) {
        return json(401, { error: 'unauthorized cron' });
      }
    }
    const result = await runAlwaysOnTick();
    json(200, result);
    return true;
  }

  if (path === '/api/cron/status' && m === 'GET') {
    const last = await store.get(ALWAYS_ON_KEY);
    json(200, { lastRun: last || null });
    return true;
  }

  return false;
};
