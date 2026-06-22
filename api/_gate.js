/**
 * Gate handler — endpoints públicos para consultar/gastar quota,
 * + helper `gateRequest()` que protege cualquier endpoint con plan limits.
 */

import { getSessionFromReq } from './_users.js';
import { getUsageSummary, checkQuota, recordUsage, PLAN_LIMITS } from './_usage.js';

const json = (res, code, body) => {
  res.statusCode = code;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.setHeader('cache-control', 'no-store');
  res.end(JSON.stringify(body));
};

export const handleGate = async (req, res, path, m, body) => {
  // GET /api/usage/summary → barras de progreso del user actual
  if (path === '/api/usage/summary' && m === 'GET') {
    const ctx = await getSessionFromReq(req);
    if (!ctx) {
      json(res, 401, { error: 'no session' });
      return true;
    }
    const summary = await getUsageSummary(ctx.user.id, ctx.user.plan || 'free');
    json(res, 200, summary);
    return true;
  }

  // POST /api/usage/check → ¿puedo hacer esta acción? (no consume)
  if (path === '/api/usage/check' && m === 'POST') {
    const ctx = await getSessionFromReq(req);
    if (!ctx) {
      json(res, 401, { error: 'no session' });
      return true;
    }
    const { kind, opts } = body || {};
    if (!kind) {
      json(res, 400, { error: 'kind requerido' });
      return true;
    }
    const result = await checkQuota(ctx.user.id, ctx.user.plan || 'free', kind, opts || {});
    json(res, 200, result);
    return true;
  }

  // POST /api/usage/record → consumir cuota manualmente (uso interno)
  if (path === '/api/usage/record' && m === 'POST') {
    const ctx = await getSessionFromReq(req);
    if (!ctx) {
      json(res, 401, { error: 'no session' });
      return true;
    }
    const { kind, amount, extra } = body || {};
    if (!kind) {
      json(res, 400, { error: 'kind requerido' });
      return true;
    }
    const usage = await recordUsage(ctx.user.id, kind, amount ?? 1, extra || {});
    json(res, 200, usage);
    return true;
  }

  // GET /api/plans/limits → tabla pública de límites (para pricing.html UI)
  if (path === '/api/plans/limits' && m === 'GET') {
    json(res, 200, PLAN_LIMITS);
    return true;
  }

  return false;
};

/**
 * Middleware: enforces gate ANTES de ejecutar handler.
 * Uso:
 *   const gate = await gateRequest(req, res, 'post');
 *   if (!gate.ok) return; // gate ya respondió 402
 *   // ... do work ...
 *   await recordUsage(gate.userId, 'post');
 */
export const gateRequest = async (req, res, kind, opts = {}) => {
  const ctx = await getSessionFromReq(req);
  if (!ctx) {
    json(res, 401, { error: 'no session', requiresAuth: true });
    return { ok: false };
  }
  // Owner bypass — unlimited access, no quota checks
  if (ctx.user.role === 'owner' || ctx.user.plan === 'owner') {
    return { ok: true, userId: ctx.user.id, plan: 'owner', user: ctx.user, ownerBypass: true };
  }
  const result = await checkQuota(ctx.user.id, ctx.user.plan || 'free', kind, opts);
  if (!result.ok) {
    json(res, 402, {
      error: 'quota-exceeded',
      kind,
      ...result,
      currentPlan: ctx.user.plan || 'free',
      upgradeUrl: '/pricing.html',
    });
    return { ok: false };
  }
  return { ok: true, userId: ctx.user.id, plan: ctx.user.plan || 'free', user: ctx.user };
};
