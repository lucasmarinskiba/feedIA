/**
 * CSRF — token HMAC-SHA256 ligado a la session.
 *
 * Flujo:
 *   - GET /api/auth/me (o cualquier GET auth) emite cookie `feedia_csrf` (no HttpOnly)
 *     y header `x-csrf-token` con el mismo valor.
 *   - Frontend lee la cookie y manda header `x-csrf-token` en POST/PUT/PATCH/DELETE.
 *   - Server valida que header === HMAC(session-token).
 *
 * Bypass: webhooks (Stripe), endpoints con `authorization: Bearer feedia_ak_*`,
 * y rutas sin sesión (login/register sin sesión previa).
 *
 * Feature flag: `CSRF_REQUIRED=true` para enforcement total. Default `false`
 * en este deploy para no romper clientes existentes.
 */

import { createHmac } from 'node:crypto';

const SECRET = process.env.CSRF_SECRET || 'feedia-csrf-dev-fallback-CHANGE-IN-PROD';
const REQUIRED = (process.env.CSRF_REQUIRED ?? 'false') === 'true';

export const issueCsrf = (sessionToken) => {
  if (!sessionToken) return '';
  return createHmac('sha256', SECRET).update(sessionToken).digest('hex').slice(0, 40);
};

const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

const EXEMPT_PATHS = [
  '/api/auth/login', // no hay sesión todavía
  '/api/auth/register',
  '/api/billing/webhook', // Stripe HMAC propio
  '/api/cron/', // crons internos
  '/api/auth/instagram/callback',
  '/api/auth/tiktok/callback',
];

const isExempt = (path) => EXEMPT_PATHS.some((p) => path === p || path.startsWith(p));
const hasBearer = (req) => /^Bearer\s+feedia_ak_/i.test(req.headers?.authorization || '');

/**
 * Devuelve true si pasa; false si bloquea (ya respondió 403).
 */
export const checkCsrf = (req, res, sessionToken) => {
  const method = (req.method || 'GET').toUpperCase();
  if (!MUTATING.has(method)) return true;
  const url = req.url || '';
  const path = url.split('?')[0];
  if (isExempt(path)) return true;
  if (hasBearer(req)) return true;
  if (!sessionToken) return true; // sin sesión, otro middleware ya rechaza
  const expected = issueCsrf(sessionToken);
  const sent = req.headers['x-csrf-token'] || '';
  if (sent && sent === expected) return true;
  if (!REQUIRED) return true; // soft-mode: solo loguea
  res.statusCode = 403;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.end(
    JSON.stringify({
      error: 'csrf-token-missing-or-invalid',
      hint: 'envia header x-csrf-token con el valor de la cookie feedia_csrf',
    }),
  );
  return false;
};

/**
 * Setea cookie y header con el token. Llamar en handlers GET de auth/me.
 */
export const setCsrfCookie = (res, sessionToken) => {
  const tok = issueCsrf(sessionToken);
  if (!tok) return;
  res.setHeader('x-csrf-token', tok);
  // Cookie NO HttpOnly (frontend la lee)
  res.setHeader('set-cookie', `feedia_csrf=${tok}; Path=/; SameSite=Lax; Secure; Max-Age=2592000`);
};
