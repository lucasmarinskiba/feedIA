/**
 * User accounts + sessions for Vercel serverless deploy.
 * KV-backed (Upstash/Vercel KV). Falls back to in-memory if KV not configured.
 *
 * Keys:
 *   feedia:user:byEmail:{email-lowercase} → userId
 *   feedia:user:{userId}                   → { id, email, displayName, plan, createdAt, passwordHash, passwordSalt }
 *   feedia:session:{token}                 → { userId, createdAt, expiresAt, userAgent, ip }
 *   feedia:user:{userId}:token:{platform}  → OAuth token blob (set by _auth.js)
 *   feedia:user:{userId}:connections       → ["instagram","tiktok"]
 *
 * Fuente de verdad ÚNICA de usuarios/sesiones (unificado 2026-08-26 — antes
 * existía un segundo sistema paralelo en desuso, _auth-real.js, con JWT +
 * Map in-memory sin persistencia real; se retiró a favor de este).
 *
 * Endpoints handled here:
 *   POST /api/auth/register   { email, password, displayName, plan? }
 *   POST /api/auth/signup     alias de register (mismo flujo, misma sesión)
 *   POST /api/auth/login      { email, password }
 *   POST /api/auth/logout
 *   GET  /api/auth/me
 *   GET  /api/auth/connections
 *   POST /api/auth/disconnect { platform }
 *   PUT  /api/auth/password   { old_password, new_password } — requiere sesión
 *   POST /api/auth/password/reset-request { email } — envía email con token (1h)
 *   POST /api/auth/password/reset-confirm { token, new_password }
 */

import crypto from 'node:crypto';
import * as store from './_store.js';
import { issueCsrf } from './_csrf.js';
import { emailService } from './_email.js';

// CSRF cookie (no HttpOnly — el frontend la lee).
const buildCsrfCookie = (sessionToken, expiresAt) => {
  const tok = issueCsrf(sessionToken);
  const expires = new Date(expiresAt).toUTCString();
  return `feedia_csrf=${tok}; Path=/; SameSite=Lax; Secure; Expires=${expires}`;
};

// Login lockout: 10 fallos en 15min → 30min de bloqueo.
const LOGIN_FAIL_LIMIT = 10;
const LOGIN_FAIL_WINDOW = 900; // 15min
const LOGIN_LOCK_DURATION = 1800; // 30min

const checkLockout = async (email) => {
  const lockKey = `feedia:authlock:${email}`;
  const locked = await store.get(lockKey);
  if (locked) {
    const remaining = await store.ttl(lockKey).catch(() => LOGIN_LOCK_DURATION);
    return { locked: true, retryAfterSec: Math.max(60, remaining) };
  }
  return { locked: false };
};

const recordAuthFail = async (email) => {
  const failKey = `feedia:authfail:${email}`;
  const fails = await store.incr(failKey);
  if (fails === 1) await store.expire(failKey, LOGIN_FAIL_WINDOW);
  if (fails >= LOGIN_FAIL_LIMIT) {
    await store.set(`feedia:authlock:${email}`, { lockedAt: Date.now() });
    await store.expire(`feedia:authlock:${email}`, LOGIN_LOCK_DURATION);
    await store.del(failKey);
  }
};

const clearAuthFails = async (email) => {
  await store.del(`feedia:authfail:${email}`);
};

const SESSION_COOKIE = 'feedia_session';
const SESSION_TTL_MS = 30 * 86_400_000;
const PBKDF2_ITER = 100_000;
const PBKDF2_KEYLEN = 64;
const PBKDF2_DIGEST = 'sha512';

const json = (res, code, body, extraHeaders) => {
  res.statusCode = code;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.setHeader('cache-control', 'no-store');
  if (extraHeaders) for (const [k, v] of Object.entries(extraHeaders)) res.setHeader(k, v);
  res.end(JSON.stringify(body));
};

const parseCookies = (header) => {
  const out = {};
  if (!header) return out;
  for (const part of header.split(';')) {
    const [k, ...rest] = part.trim().split('=');
    out[k] = decodeURIComponent(rest.join('='));
  }
  return out;
};

const buildCookie = (token, expiresAt) => {
  const expires = new Date(expiresAt).toUTCString();
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Secure; Expires=${expires}`;
};

const clearCookie = () =>
  `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Secure; Expires=Thu, 01 Jan 1970 00:00:00 GMT`;

const hashPassword = (password, salt) => {
  const useSalt = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, useSalt, PBKDF2_ITER, PBKDF2_KEYLEN, PBKDF2_DIGEST).toString('hex');
  return { hash, salt: useSalt };
};

const verifyPassword = (password, hash, salt) => {
  const candidate = crypto.pbkdf2Sync(password, salt, PBKDF2_ITER, PBKDF2_KEYLEN, PBKDF2_DIGEST).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(candidate, 'hex'), Buffer.from(hash, 'hex'));
};

const newId = () => `u_${crypto.randomBytes(10).toString('hex')}`;
const newToken = () => crypto.randomBytes(32).toString('base64url');

const isProd = process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production';
const OWNER_EMAIL = (process.env.OWNER_EMAIL || (isProd ? undefined : 'dev-owner@localhost')).toLowerCase();

if (isProd && !process.env.OWNER_EMAIL) {
  throw new Error('[CRITICAL] OWNER_EMAIL must be set in production.');
}

const sanitizeUser = (u) => ({
  id: u.id,
  email: u.email,
  displayName: u.displayName,
  plan: u.plan,
  role: u.role,
  createdAt: u.createdAt,
  connectedPlatforms: u.connectedPlatforms || [],
});

const applyOwnerIfNeeded = (user) => {
  if (user.email === OWNER_EMAIL) {
    user.plan = 'owner';
    user.role = 'owner';
  }
  return user;
};

export const getSessionFromReq = async (req) => {
  const cookies = parseCookies(req.headers.cookie);
  const token = cookies[SESSION_COOKIE];
  if (!token) return null;
  const session = await store.get(`feedia:session:${token}`);
  if (!session) return null;
  if (Date.now() > new Date(session.expiresAt).getTime()) {
    await store.del(`feedia:session:${token}`);
    return null;
  }
  const user = await store.get(`feedia:user:${session.userId}`);
  if (!user) return null;
  return { token, user, session };
};

const createSession = async (userId, req) => {
  const token = newToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();
  await store.set(`feedia:session:${token}`, {
    userId,
    createdAt: new Date().toISOString(),
    expiresAt,
    userAgent: req.headers['user-agent'] || '',
    ip: req.headers['x-forwarded-for'] || '',
  });
  return { token, expiresAt };
};

export const handleUsers = async (req, res, path, m, body) => {
  // ── Register (alias: /api/auth/signup — mismo flujo, misma fuente de verdad) ──
  if ((path === '/api/auth/register' || path === '/api/auth/signup') && m === 'POST') {
    const b = body || {};
    const email = String(b.email || '')
      .trim()
      .toLowerCase();
    const password = String(b.password || '');
    const displayName = String(b.displayName || b.name || '').trim();
    const plan = String(b.plan || 'free');

    if (!email || !password || !displayName) {
      json(res, 400, { error: 'email, password, displayName requeridos' });
      return true;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      json(res, 400, { error: 'Email inválido' });
      return true;
    }
    if (password.length < 8) {
      json(res, 400, { error: 'Password mínimo 8 caracteres' });
      return true;
    }

    const existing = await store.get(`feedia:user:byEmail:${email}`);
    if (existing) {
      json(res, 409, { error: 'Email ya registrado' });
      return true;
    }

    const { hash, salt } = hashPassword(password);
    const user = applyOwnerIfNeeded({
      id: newId(),
      email,
      displayName,
      plan,
      passwordHash: hash,
      passwordSalt: salt,
      createdAt: new Date().toISOString(),
      connectedPlatforms: [],
    });
    await store.set(`feedia:user:${user.id}`, user);
    await store.set(`feedia:user:byEmail:${email}`, user.id);

    const { token, expiresAt } = await createSession(user.id, req);
    const cookies = [buildCookie(token, expiresAt), buildCsrfCookie(token, expiresAt)];
    json(res, 201, { user: sanitizeUser(user) }, { 'set-cookie': cookies });
    return true;
  }

  // ── Login ───────────────────────────────────────────────────────────────
  if (path === '/api/auth/login' && m === 'POST') {
    const b = body || {};
    const email = String(b.email || '')
      .trim()
      .toLowerCase();
    const password = String(b.password || '');
    if (!email || !password) {
      json(res, 400, { error: 'email y password requeridos' });
      return true;
    }

    // Lockout check antes de verificar password (defensa brute-force)
    const lock = await checkLockout(email);
    if (lock.locked) {
      json(res, 423, {
        error: 'account-locked',
        message: `Demasiados intentos fallidos. Reintentá en ${Math.ceil(lock.retryAfterSec / 60)} min.`,
        retryAfterSec: lock.retryAfterSec,
      });
      return true;
    }

    const userId = await store.get(`feedia:user:byEmail:${email}`);
    if (!userId) {
      await recordAuthFail(email);
      json(res, 401, { error: 'Credenciales inválidas' });
      return true;
    }
    const user = await store.get(`feedia:user:${userId}`);
    if (!user) {
      await recordAuthFail(email);
      json(res, 401, { error: 'Credenciales inválidas' });
      return true;
    }

    let ok = false;
    try {
      ok = verifyPassword(password, user.passwordHash, user.passwordSalt);
    } catch {
      ok = false;
    }
    if (!ok) {
      await recordAuthFail(email);
      json(res, 401, { error: 'Credenciales inválidas' });
      return true;
    }

    // Login exitoso → limpiar contador
    await clearAuthFails(email);

    // Re-apply owner elevation on every login (handles existing accounts pre-feature)
    const elevated = applyOwnerIfNeeded({ ...user });
    if (elevated.plan !== user.plan || elevated.role !== user.role) {
      await store.set(`feedia:user:${user.id}`, { ...user, plan: elevated.plan, role: elevated.role });
    }

    const { token, expiresAt } = await createSession(user.id, req);
    const cookies = [buildCookie(token, expiresAt), buildCsrfCookie(token, expiresAt)];
    json(res, 200, { user: sanitizeUser(elevated) }, { 'set-cookie': cookies });
    return true;
  }

  // ── Logout ──────────────────────────────────────────────────────────────
  if (path === '/api/auth/logout' && m === 'POST') {
    const cookies = parseCookies(req.headers.cookie);
    const token = cookies[SESSION_COOKIE];
    if (token) await store.del(`feedia:session:${token}`);
    json(res, 200, { ok: true }, { 'set-cookie': clearCookie() });
    return true;
  }

  // ── Me ──────────────────────────────────────────────────────────────────
  if (path === '/api/auth/me' && m === 'GET') {
    const ctx = await getSessionFromReq(req);
    if (!ctx) {
      json(res, 401, { error: 'no session' });
      return true;
    }
    // Refresh CSRF cookie en cada /me (mismo session token → mismo CSRF token).
    const cookies2 = ctx.token ? [buildCsrfCookie(ctx.token, Date.now() + SESSION_TTL_MS)] : undefined;
    json(res, 200, { user: sanitizeUser(ctx.user) }, cookies2 ? { 'set-cookie': cookies2 } : undefined);
    return true;
  }

  // ── Connections ─────────────────────────────────────────────────────────
  if (path === '/api/auth/connections' && m === 'GET') {
    const ctx = await getSessionFromReq(req);
    if (!ctx) {
      json(res, 401, { error: 'no session' });
      return true;
    }
    const out = [];
    for (const platform of ['instagram', 'tiktok']) {
      const tok = await store.get(`feedia:user:${ctx.user.id}:token:${platform}`);
      if (tok && tok.access_token) {
        out.push({
          platform,
          connected: true,
          connectedAt: tok.saved_at,
          expiresAt: tok.expires_at ? new Date(tok.expires_at).toISOString() : null,
          handle: tok.handle || null,
          displayName: tok.display_name || null,
        });
      } else {
        out.push({ platform, connected: false });
      }
    }
    json(res, 200, out);
    return true;
  }

  if (path === '/api/auth/disconnect' && m === 'POST') {
    const ctx = await getSessionFromReq(req);
    if (!ctx) {
      json(res, 401, { error: 'no session' });
      return true;
    }
    const platform = String((body || {}).platform || '');
    if (!['instagram', 'tiktok'].includes(platform)) {
      json(res, 400, { error: 'platform inválido' });
      return true;
    }
    await store.del(`feedia:user:${ctx.user.id}:token:${platform}`);
    json(res, 200, { ok: true });
    return true;
  }

  // ── Cambio de password (requiere sesión + password actual) ────────────────
  if (path === '/api/auth/password' && m === 'PUT') {
    const ctx = await getSessionFromReq(req);
    if (!ctx) {
      json(res, 401, { error: 'no session' });
      return true;
    }
    const { old_password, new_password } = body || {};
    if (!old_password || !new_password) {
      json(res, 400, { error: 'old_password, new_password requeridos' });
      return true;
    }
    if (String(new_password).length < 8) {
      json(res, 400, { error: 'new_password mínimo 8 caracteres' });
      return true;
    }
    let ok = false;
    try {
      ok = verifyPassword(old_password, ctx.user.passwordHash, ctx.user.passwordSalt);
    } catch {
      ok = false;
    }
    if (!ok) {
      json(res, 400, { error: 'password actual incorrecta' });
      return true;
    }
    const { hash, salt } = hashPassword(new_password);
    await store.set(`feedia:user:${ctx.user.id}`, { ...ctx.user, passwordHash: hash, passwordSalt: salt });
    json(res, 200, { ok: true });
    return true;
  }

  // ── Password reset — request (envía email con token, sin revelar si el email existe) ──
  const RESET_TOKEN_TTL_SEC = 3600; // 1h
  if (path === '/api/auth/password/reset-request' && m === 'POST') {
    const email = String((body || {}).email || '')
      .trim()
      .toLowerCase();
    if (!email) {
      json(res, 400, { error: 'email requerido' });
      return true;
    }
    const userId = await store.get(`feedia:user:byEmail:${email}`);
    if (userId) {
      const token = newToken();
      await store.set(`feedia:passwordreset:${token}`, { userId, email });
      await store.expire(`feedia:passwordreset:${token}`, RESET_TOKEN_TTL_SEC);
      try {
        await emailService.send(email, 'password_reset', { reset_token: token });
      } catch {
        /* best-effort — no bloquea la respuesta */
      }
    }
    // Respuesta idéntica exista o no el email — evita user enumeration.
    json(res, 200, { ok: true, message: 'Si el email existe, se envió un link de recuperación.' });
    return true;
  }

  // ── Password reset — confirm (token + nueva password) ──────────────────────
  if (path === '/api/auth/password/reset-confirm' && m === 'POST') {
    const { token, new_password } = body || {};
    if (!token || !new_password) {
      json(res, 400, { error: 'token, new_password requeridos' });
      return true;
    }
    if (String(new_password).length < 8) {
      json(res, 400, { error: 'new_password mínimo 8 caracteres' });
      return true;
    }
    const resetKey = `feedia:passwordreset:${token}`;
    const reset = await store.get(resetKey);
    if (!reset) {
      json(res, 400, { error: 'token inválido o expirado' });
      return true;
    }
    const user = await store.get(`feedia:user:${reset.userId}`);
    if (!user) {
      json(res, 404, { error: 'usuario no encontrado' });
      return true;
    }
    const { hash, salt } = hashPassword(new_password);
    await store.set(`feedia:user:${user.id}`, { ...user, passwordHash: hash, passwordSalt: salt });
    await store.del(resetKey);
    await clearAuthFails(user.email);
    json(res, 200, { ok: true });
    return true;
  }

  return false;
};
