/**
 * Observability — ring buffer en KV de los últimos N errores + métricas básicas.
 * Solo accesible vía `/api/admin/*` (owner-only).
 *
 * En producción se recomienda conectar Sentry (configurar SENTRY_DSN) y
 * Logtail/Better Stack para observabilidad avanzada. Este módulo actúa
 * como fallback y como capa de alertas críticas.
 */
import * as store from './_store.js';

const LOG_KEY = 'feedia:obs:errors';
const STATS_PREFIX = 'feedia:obs:stat';
const MAX_ENTRIES = 500;
const ALERT_COOLDOWN_MS = 15 * 60 * 1000;
const ALERT_SENT_KEY = 'feedia:obs:alert_sent';

const safeStr = (s, n = 800) => String(s ?? '').slice(0, n);

export const logError = async ({ req, err, ctx }) => {
  try {
    const entry = {
      ts: Date.now(),
      path: req?.url ? new URL(req.url, 'http://x').pathname : '?',
      method: req?.method || '?',
      userId: ctx?.userId || null,
      ip: (req?.headers?.['x-forwarded-for'] || req?.socket?.remoteAddress || '').toString().split(',')[0].trim(),
      ua: safeStr(req?.headers?.['user-agent'], 200),
      error: safeStr(err?.stack || err?.message || err, 1500),
      ctxNote: ctx?.note ? safeStr(ctx.note, 300) : null,
    };
    await store.lpush(LOG_KEY, entry);
    await store.ltrim(LOG_KEY, 0, MAX_ENTRIES - 1);
    // Hourly counters
    const hour = new Date().toISOString().slice(0, 13); // YYYY-MM-DDTHH
    await store.incr(`${STATS_PREFIX}:errors:${hour}`);
    await store.expire(`${STATS_PREFIX}:errors:${hour}`, 86400 * 2);
    // Alerta crítica si el error parece grave
    if (isCriticalError(err)) await triggerAlert('critical_error', entry);
  } catch {
    /* no romper handler por fallo de obs */
  }
};

export const logHit = async ({ path, method }) => {
  try {
    const hour = new Date().toISOString().slice(0, 13);
    await store.incr(`${STATS_PREFIX}:hits:${hour}`);
    await store.expire(`${STATS_PREFIX}:hits:${hour}`, 86400 * 2);
    if (method && path) {
      const key = `${STATS_PREFIX}:path:${hour}:${method}:${path.slice(0, 80)}`;
      await store.incr(key);
      await store.expire(key, 86400 * 2);
    }
  } catch {
    /* idem */
  }
};

export const logCreditUsage = async (userId, cost) => {
  try {
    const hour = new Date().toISOString().slice(0, 13);
    await store.incrBy(`${STATS_PREFIX}:credits:${hour}`, cost);
    await store.expire(`${STATS_PREFIX}:credits:${hour}`, 86400 * 2);
    await store.incrBy(`${STATS_PREFIX}:credits:user:${userId}:${hour}`, cost);
    await store.expire(`${STATS_PREFIX}:credits:user:${userId}:${hour}`, 86400 * 2);
  } catch {
    /* idem */
  }
};

export const logRateLimit = async (userId, path) => {
  try {
    const hour = new Date().toISOString().slice(0, 13);
    await store.incr(`${STATS_PREFIX}:ratelimit:${hour}`);
    await store.expire(`${STATS_PREFIX}:ratelimit:${hour}`, 86400 * 2);
    await store.incr(`${STATS_PREFIX}:ratelimit:user:${userId}:${hour}`);
    await store.expire(`${STATS_PREFIX}:ratelimit:user:${userId}:${hour}`, 86400 * 2);
    await triggerAlert('rate_limit_spike', { userId, path, hour });
  } catch {
    /* idem */
  }
};

export const getErrors = async (limit = 100) => {
  const raw = await store.lrange(LOG_KEY, 0, Math.min(limit, MAX_ENTRIES) - 1);
  return raw
    .map((x) =>
      typeof x === 'string'
        ? (() => {
            try {
              return JSON.parse(x);
            } catch {
              return null;
            }
          })()
        : x,
    )
    .filter(Boolean);
};

export const getStats = async () => {
  const now = new Date();
  const hoursBack = 24;
  const hits = [];
  const errors = [];
  const credits = [];
  const ratelimits = [];
  for (let i = 0; i < hoursBack; i++) {
    const d = new Date(now.getTime() - i * 3600 * 1000);
    const hour = d.toISOString().slice(0, 13);
    const h = await store.get(`${STATS_PREFIX}:hits:${hour}`);
    const e = await store.get(`${STATS_PREFIX}:errors:${hour}`);
    const c = await store.get(`${STATS_PREFIX}:credits:${hour}`);
    const r = await store.get(`${STATS_PREFIX}:ratelimit:${hour}`);
    hits.push({ hour, count: Number(h) || 0 });
    errors.push({ hour, count: Number(e) || 0 });
    credits.push({ hour, count: Number(c) || 0 });
    ratelimits.push({ hour, count: Number(r) || 0 });
  }
  const total24h = hits.reduce((s, h) => s + h.count, 0);
  const errors24h = errors.reduce((s, e) => s + e.count, 0);
  return {
    hits24h: total24h,
    errors24h,
    credits24h: credits.reduce((s, c) => s + c.count, 0),
    rateLimits24h: ratelimits.reduce((s, r) => s + r.count, 0),
    errorRate: total24h ? ((errors24h / total24h) * 100).toFixed(2) + '%' : '0%',
    hitsHourly: hits.reverse(),
    errorsHourly: errors.reverse(),
    creditsHourly: credits.reverse(),
    rateLimitsHourly: ratelimits.reverse(),
  };
};

const isCriticalError = (err) => {
  const msg = String(err?.message || err).toLowerCase();
  return msg.includes('out of memory') || msg.includes('unhandled') || msg.includes('fatal') || msg.includes('crash');
};

const alertWebhookUrl = () => process.env.ALERT_WEBHOOK_URL || process.env.SLACK_WEBHOOK_URL;

const triggerAlert = async (type, payload) => {
  try {
    const key = `${ALERT_SENT_KEY}:${type}`;
    const last = Number(await store.get(key)) || 0;
    if (Date.now() - last < ALERT_COOLDOWN_MS) return;
    await store.set(key, Date.now());
    await store.expire(key, 86400);

    const url = alertWebhookUrl();
    if (url) {
      await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          text: `🚨 FeedIA alert: ${type}`,
          payload,
          ts: new Date().toISOString(),
        }),
      });
    }
    // También encolamos un email al owner si hay email queue configurado
    if (process.env.ALERT_EMAIL) {
      const emailQueue = await import('./_emailQueue.js').catch(() => null);
      if (emailQueue?.enqueue) {
        await emailQueue.enqueue(process.env.ALERT_EMAIL, `FeedIA alert: ${type}`, JSON.stringify(payload, null, 2));
      }
    }
  } catch {
    /* no romper por fallo de alerta */
  }
};

export const getMonitoringDashboard = async () => {
  const [stats, recentErrors] = await Promise.all([getStats(), getErrors(50)]);
  return {
    ok: true,
    generatedAt: new Date().toISOString(),
    stats,
    recentErrors,
    alerts: {
      webhookConfigured: !!alertWebhookUrl(),
      alertEmailConfigured: !!process.env.ALERT_EMAIL,
      sentryConfigured: !!process.env.SENTRY_DSN,
    },
  };
};
