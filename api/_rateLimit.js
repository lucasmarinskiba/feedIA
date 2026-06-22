/**
 * Rate limiter — token bucket simple en KV (INCR + EXPIRE).
 *
 * Devuelve `true` si permitido, `false` si rate-limited (ya respondió 429).
 *
 * Uso:
 *   if (!(await rateLimit(req, res, `login:${ipOf(req)}`, 5, 300))) return;
 *
 * Owner bypass: si `userPlan === 'owner'` o `userRole === 'owner'` → skip.
 */

import * as store from './_store.js';
import { logCreditUsage, logRateLimit } from './_obs.js';

const ENABLED = (process.env.RATE_LIMIT_ENABLED ?? 'true') !== 'false';

export const ipOf = (req) => {
  const xff = req.headers?.['x-forwarded-for'] || '';
  const first = String(xff).split(',')[0].trim();
  return first || req.socket?.remoteAddress || 'unknown';
};

const isOwner = (user) => user && (user.role === 'owner' || user.plan === 'owner');

/**
 * @param {object} req
 * @param {object} res
 * @param {string} key  ej `login:1.2.3.4`, `forge:userId`
 * @param {number} limit  permitido por ventana
 * @param {number} windowSec  ventana en segundos
 * @param {object} [opts]  { user, skipResponse }
 * @returns {Promise<boolean>}  true = ok, false = bloqueado (ya respondió 429)
 */
export const rateLimit = async (req, res, key, limit, windowSec, opts = {}) => {
  if (!ENABLED) return true;
  if (isOwner(opts.user)) return true;
  const bucketKey = `feedia:rl:${key}`;
  let count;
  try {
    count = await store.incr(bucketKey);
    if (count === 1) await store.expire(bucketKey, windowSec);
  } catch {
    return true; // si KV falla, no bloquees al usuario
  }
  if (count > limit) {
    if (opts.user?.id) logRateLimit(opts.user.id, key).catch(() => undefined);
    if (!opts.skipResponse) {
      const remaining = await store.ttl(bucketKey).catch(() => windowSec);
      res.statusCode = 429;
      res.setHeader('retry-after', String(Math.max(1, remaining)));
      res.setHeader('content-type', 'application/json; charset=utf-8');
      res.setHeader('x-ratelimit-limit', String(limit));
      res.setHeader('x-ratelimit-remaining', '0');
      res.end(
        JSON.stringify({
          error: 'rate-limited',
          limit,
          windowSec,
          retryAfterSec: Math.max(1, remaining),
          message: 'Demasiadas peticiones. Esperá un momento.',
        }),
      );
    }
    return false;
  }
  if (!opts.skipResponse) {
    res.setHeader('x-ratelimit-limit', String(limit));
    res.setHeader('x-ratelimit-remaining', String(Math.max(0, limit - count)));
  }
  return true;
};

// Presets por categoría de endpoint
export const LIMITS = {
  login: { limit: 5, window: 300 },
  register: { limit: 3, window: 3600 },
  forge: { limit: 30, window: 3600 },
  studio: { limit: 30, window: 3600 },
  branding: { limit: 20, window: 3600 },
  cu: { limit: 30, window: 3600 },
  hooks: { limit: 60, window: 3600 },
  chat: { limit: 120, window: 3600 },
  voice: { limit: 60, window: 3600 },
  global: { limit: 200, window: 3600 },
};

// Costos por acción costosa (créditos consumidos por llamada).
// El bucket se recarga cada hora según el plan del usuario.
export const ACTION_COSTS = {
  llm_basic: 1, // captions, hooks simples
  llm_advanced: 3, // strategists, planners
  image_generate: 5, // DALL-E, Replicate image
  video_generate: 15, // generación de reels/videos
  computer_use: 8, // sesiones de computer use
  social_publish: 4, // publicar IG/TT
  social_sync: 2, // sync de insights
  audit_full: 6, // audits completos
  growth_council: 8, // orquestador multi-agente (research + audience + hooks + sounds + visuals + strategy)
  tt_script: 3, // generación de guion TikTok con LLM
  hooks_gen: 2, // generación de set de hooks con LLM
};

const CREDIT_WINDOW_SEC = 3600;

const getPlanCredits = (plan) => {
  const map = {
    owner: 999999,
    enterprise: 5000,
    business: 2500,
    pro: 1000,
    premium: 800,
    gold: 600,
    starter: 300,
    free: 100,
  };
  return map[plan] ?? map.free;
};

const creditKey = (userId) => `feedia:credits:${userId}`;
const usageKey = (userId) => `feedia:credits:usage:${userId}`;

/**
 * Consume créditos de un usuario para una acción costosa.
 * @returns {Promise<{ allowed: boolean, remaining: number, cost: number, resetInSec: number }>}
 */
export const checkCost = async (user, action) => {
  if (!user) return { allowed: false, remaining: 0, cost: 0, resetInSec: 0 };
  if (user.role === 'owner' || user.plan === 'owner') {
    return { allowed: true, remaining: 999999, cost: ACTION_COSTS[action] || 1, resetInSec: 0 };
  }
  const cost = ACTION_COSTS[action] || 1;
  const maxCredits = getPlanCredits(user.plan);
  const ck = creditKey(user.id);
  const uk = usageKey(user.id);

  let used = 0;
  try {
    used = Number(await store.get(uk)) || 0;
  } catch {
    used = 0;
  }

  if (used + cost > maxCredits) {
    const ttl = await store.ttl(uk).catch(() => CREDIT_WINDOW_SEC);
    return { allowed: false, remaining: Math.max(0, maxCredits - used), cost, resetInSec: ttl };
  }

  try {
    await store.incrBy(uk, cost);
    const currentTtl = await store.ttl(uk).catch(() => -1);
    if (currentTtl <= 0) await store.expire(uk, CREDIT_WINDOW_SEC);
    logCreditUsage(user.id, cost).catch(() => undefined);
  } catch {
    return { allowed: true, remaining: maxCredits - used - cost, cost, resetInSec: CREDIT_WINDOW_SEC };
  }

  return { allowed: true, remaining: maxCredits - used - cost, cost, resetInSec: CREDIT_WINDOW_SEC };
};

/**
 * Middleware de costo: devuelve true si se permite; si no, responde 429.
 */
export const costLimit = async (req, res, user, action) => {
  const result = await checkCost(user, action);
  res.setHeader('x-credits-remaining', String(result.remaining));
  res.setHeader('x-credits-cost', String(result.cost));
  if (!result.allowed) {
    res.statusCode = 429;
    res.setHeader('content-type', 'application/json; charset=utf-8');
    res.setHeader('retry-after', String(result.resetInSec));
    res.end(
      JSON.stringify({
        error: 'credits-exhausted',
        message: 'Límite de créditos horarios alcanzado. Esperá o actualizá tu plan.',
        remaining: result.remaining,
        resetInSec: result.resetInSec,
      }),
    );
    return false;
  }
  return true;
};
