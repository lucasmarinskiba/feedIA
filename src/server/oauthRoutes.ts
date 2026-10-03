/* eslint-disable @typescript-eslint/explicit-function-return-type */
/**
 * OAuth Routes — Instagram (Business Login directo) + TikTok Display API.
 *
 * Instagram usa el producto "API de Instagram con inicio de sesión de
 * Instagram" (api.instagram.com / graph.instagram.com) — NO Facebook Login +
 * Página vinculada (facebook.com / graph.facebook.com). El App ID que existe
 * en este proyecto (INSTAGRAM_APP_ID en Vercel/Meta) está dado de alta para
 * ese producto; usar el dialog de facebook.com con él devuelve
 * PLATFORM__INVALID_APP_ID. Esta vía además es más simple: el user_id que
 * devuelve el intercambio de token YA ES el id de la cuenta profesional de
 * Instagram, sin pasar por Páginas de Facebook.
 *
 * Ahora el flujo está atado a la sesión de usuario cuando existe, y permite
 * especificar la marca (brandId) a conectar. Si no hay sesión, fallback a la
 * marca default del servidor (modo legacy single-tenant).
 *
 *   GET /api/auth/instagram/login          → redirect to Instagram Business Login
 *   GET /api/auth/instagram/callback       → exchange code, persist long-lived token
 *   GET /api/auth/instagram/status         → estado de la conexión
 *   POST /api/auth/instagram/refresh       → refrescar long-lived token (ig_refresh_token)
 *   GET /api/auth/tiktok/login             → redirect to TikTok OAuth
 *   GET /api/auth/tiktok/callback          → exchange code, persist token
 *   POST /api/auth/disconnect              → revoke connection
 *   GET /api/auth/connections              → list connections for brand
 */

import { json, type RouteDefinition } from './http.js';
import { env } from '../config/index.js';
import { getSessionUser } from '../auth/userAccounts.js';
import { metaFetch } from '../integrations/metaApiClient.js';
import {
  issueOAuthState,
  consumeOAuthState,
  saveConnection,
  getConnection,
  deleteConnection,
  listConnectionsForBrand,
  isExpired,
  type ConnectionPlatform,
} from '../integrations/oauthConnections.js';
import { log } from '../agent/logger.js';

// Alias: a algunos les llaman "Meta App ID", a otros "Instagram App ID" — es
// el mismo client_id. Acepta cualquiera de los dos nombres de env var para no
// repetir el bug ya documentado en credential-sources-map (ELEVEN_LABS vs
// ELEVENLABS, FAL_API_KEY vs FAL_KEY: nombres distintos silenciosamente
// deshabilitan una credencial válida).
const IG_APP_ID = process.env.INSTAGRAM_APP_ID || process.env.META_APP_ID;
const IG_APP_SECRET = process.env.INSTAGRAM_APP_SECRET || process.env.META_APP_SECRET;

const IG_OAUTH_AUTHORIZE = 'https://api.instagram.com/oauth/authorize';
const IG_OAUTH_TOKEN = 'https://api.instagram.com/oauth/access_token';
const IG_GRAPH_EXCHANGE = 'https://graph.instagram.com/access_token';
const IG_SCOPES = [
  'instagram_business_basic',
  'instagram_business_manage_insights',
  'instagram_business_manage_comments',
].join(',');

const TT_OAUTH_AUTHORIZE = 'https://www.tiktok.com/v2/auth/authorize/';
const TT_OAUTH_TOKEN = 'https://open.tiktokapis.com/v2/oauth/token/';
const TT_SCOPES = ['user.info.basic', 'user.info.profile', 'user.info.stats', 'video.list'].join(',');

const SESSION_COOKIE = 'feedia_session';

const parseCookie = (cookieHeader: string | string[] | undefined, name: string): string | undefined => {
  if (!cookieHeader) return undefined;
  const header = Array.isArray(cookieHeader) ? cookieHeader[0] : cookieHeader;
  if (!header) return undefined;
  const m = header.match(new RegExp(`${name}=([^;]+)`));
  return m?.[1];
};

const headerValue = (v: string | string[] | undefined): string | undefined =>
  Array.isArray(v) ? v[0] : (v ?? undefined);

export const resolveDefaultBrandId = (brand?: { id?: string; name: string }): string | undefined =>
  brand?.id ?? brand?.name.toLowerCase().replace(/\s+/g, '-');

const buildRedirectUri = (
  req: { headers: Record<string, string | string[] | undefined> },
  platform: ConnectionPlatform,
): string => {
  const proto = headerValue(req.headers['x-forwarded-proto']) || 'https';
  const host = headerValue(req.headers['x-forwarded-host']) || headerValue(req.headers.host) || 'localhost';
  return `${proto}://${host}/api/auth/${platform}/callback`;
};

const redirect = (
  res: { writeHead: (status: number, headers?: Record<string, string>) => void; end: () => void },
  url: string,
): void => {
  res.writeHead(302, { Location: url });
  res.end();
};

interface RequestContext {
  req: { headers: Record<string, string | string[] | undefined> };
  source: Record<string, string | undefined>;
}

const getRequestedBrandId = async (
  ctx: RequestContext,
  defaultBrand?: { id?: string; name: string },
): Promise<{ brandId: string; userId?: string } | null> => {
  const token = parseCookie(ctx.req.headers.cookie, SESSION_COOKIE);
  const user = token ? await getSessionUser(token) : null;
  const brandIdFromSource = ctx.source.brandId;

  if (user) {
    const brandId = brandIdFromSource || user.activeBrandId;
    if (!brandId) return null;
    if (!user.brandIds.includes(brandId)) return null;
    return { brandId, userId: user.id };
  }

  const fallback = brandIdFromSource || resolveDefaultBrandId(defaultBrand);
  if (!fallback) return null;
  return { brandId: fallback };
};

const sourceFromQuery = (query: Record<string, string>): Record<string, string | undefined> => query;
const sourceFromBody = (body: unknown): Record<string, string | undefined> => {
  const b = (body ?? {}) as Record<string, unknown>;
  return { brandId: typeof b.brandId === 'string' ? b.brandId : undefined };
};

export const buildOAuthRoutes = (defaultBrand?: { id?: string; name: string }): RouteDefinition[] => [
  // ── Instagram (Business Login directo) ──────────────────────────────────
  {
    method: 'GET',
    pattern: '/api/auth/instagram/login',
    handler: async ({ req, res, query }) => {
      if (!IG_APP_ID) {
        json(res, 500, { error: 'INSTAGRAM_APP_ID no configurado' });
        return;
      }
      const requested = await getRequestedBrandId({ req, source: sourceFromQuery(query) }, defaultBrand);
      if (!requested) {
        json(res, 400, { error: 'brandId requerido o usuario sin marca activa' });
        return;
      }
      const redirectAfter = query.redirectAfter ?? '/';
      const state = await issueOAuthState({
        brandId: requested.brandId,
        platform: 'instagram',
        redirectAfter,
        userId: requested.userId,
      });
      const redirectUri = buildRedirectUri(req, 'instagram');
      const url = `${IG_OAUTH_AUTHORIZE}?client_id=${IG_APP_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(IG_SCOPES)}&state=${state}&response_type=code`;
      redirect(res, url);
    },
  },
  {
    method: 'GET',
    pattern: '/api/auth/instagram/callback',
    handler: async ({ req, res, query }) => {
      const { code, state, error: oauthError } = query;
      if (oauthError) {
        json(res, 400, { error: `OAuth error: ${oauthError}` });
        return;
      }
      if (!code || !state) {
        json(res, 400, { error: 'Faltan code o state' });
        return;
      }

      const stateData = await consumeOAuthState(state);
      if (!stateData || stateData.platform !== 'instagram') {
        json(res, 400, { error: 'state inválido o expirado' });
        return;
      }

      if (!IG_APP_ID || !IG_APP_SECRET) {
        json(res, 500, { error: 'INSTAGRAM_APP_ID/SECRET no configurados' });
        return;
      }

      const redirectUri = buildRedirectUri(req, 'instagram');
      try {
        // Paso 1: code → access_token de corta duración (1h) + user_id. Este
        // user_id YA ES la cuenta profesional de Instagram — no hace falta
        // pasar por Páginas de Facebook.
        const tokenRes = await metaFetch(
          IG_OAUTH_TOKEN,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
              client_id: IG_APP_ID,
              client_secret: IG_APP_SECRET,
              grant_type: 'authorization_code',
              redirect_uri: redirectUri,
              code,
            }).toString(),
          },
          { description: 'Instagram OAuth token exchange', maxAttempts: 3 },
        );
        const tokenData = (await tokenRes.json()) as {
          access_token?: string;
          user_id?: string | number;
        };
        const shortToken = tokenData.access_token;
        const igUserId = tokenData.user_id ? String(tokenData.user_id) : '';
        if (!shortToken || !igUserId) {
          json(res, 502, { error: 'No access_token/user_id recibido' });
          return;
        }

        // Paso 2: corta duración → larga duración (~60 días).
        const longRes = await metaFetch(
          `${IG_GRAPH_EXCHANGE}?grant_type=ig_exchange_token&client_secret=${IG_APP_SECRET}&access_token=${shortToken}`,
          {},
          { description: 'Instagram long-lived token exchange', maxAttempts: 3 },
        );
        const longData = (await longRes.json()) as { access_token?: string; expires_in?: number };
        const longLivedToken = longData.access_token ?? shortToken;
        const expiresIn = longData.expires_in ?? 5_184_000;

        await saveConnection({
          platform: 'instagram',
          brandId: stateData.brandId,
          accessToken: longLivedToken,
          expiresAtIso: new Date(Date.now() + expiresIn * 1000).toISOString(),
          metadata: { igBusinessId: igUserId },
          connectedAt: new Date().toISOString(),
        });
        redirect(res, `${stateData.redirectAfter ?? '/'}?connected=instagram&brandId=${stateData.brandId}`);
      } catch (err) {
        log.error('[oauthRoutes] IG callback error', { err: String(err) });
        json(res, 500, { error: 'OAuth callback error', detail: err instanceof Error ? err.message : String(err) });
      }
    },
  },
  {
    method: 'GET',
    pattern: '/api/auth/instagram/status',
    handler: async ({ req, res, query }) => {
      const requested = await getRequestedBrandId({ req, source: sourceFromQuery(query) }, defaultBrand);
      if (!requested) {
        json(res, 400, { error: 'brandId requerido' });
        return;
      }
      const conn = await getConnection(requested.brandId, 'instagram');
      if (!conn) {
        json(res, 200, { connected: false, brandId: requested.brandId });
        return;
      }
      json(res, 200, {
        connected: true,
        expired: isExpired(conn),
        brandId: requested.brandId,
        igBusinessId: conn.metadata?.igBusinessId,
        expiresAt: conn.expiresAtIso,
        scope: conn.scope,
      });
    },
  },
  {
    method: 'POST',
    pattern: '/api/auth/instagram/refresh',
    handler: async ({ req, res, body }) => {
      const requested = await getRequestedBrandId({ req, source: sourceFromBody(body) }, defaultBrand);
      if (!requested) {
        json(res, 400, { error: 'brandId requerido' });
        return;
      }
      const conn = await getConnection(requested.brandId, 'instagram');
      if (!conn?.accessToken) {
        json(res, 404, { error: 'No hay conexión de Instagram para refrescar' });
        return;
      }
      try {
        // ig_refresh_token solo necesita el token actual (ya de larga
        // duración) — nada de client_id/secret, a diferencia del exchange inicial.
        const refreshRes = await metaFetch(
          `https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${conn.accessToken}`,
          {},
          { description: 'Instagram OAuth refresh', maxAttempts: 3 },
        );
        const data = (await refreshRes.json()) as { access_token?: string; expires_in?: number };
        if (!data.access_token) {
          json(res, 502, { error: 'No access_token en refresh' });
          return;
        }
        await saveConnection({
          ...conn,
          accessToken: data.access_token,
          expiresAtIso: new Date(Date.now() + (data.expires_in ?? 5_184_000) * 1000).toISOString(),
          lastRefreshedAt: new Date().toISOString(),
        });
        json(res, 200, { ok: true, brandId: requested.brandId, expiresIn: data.expires_in });
      } catch (err) {
        log.error('[oauthRoutes] IG refresh error', { err: String(err) });
        json(res, 500, { error: 'Refresh failed', detail: err instanceof Error ? err.message : String(err) });
      }
    },
  },

  // ── TikTok Display API ──────────────────────────────────────────────────
  {
    method: 'GET',
    pattern: '/api/auth/tiktok/login',
    handler: async ({ req, res, query }) => {
      const clientKey = env.tiktok.clientKey || process.env.TIKTOK_CLIENT_KEY;
      if (!clientKey) {
        json(res, 500, { error: 'TIKTOK_CLIENT_KEY no configurado' });
        return;
      }
      const requested = await getRequestedBrandId({ req, source: sourceFromQuery(query) }, defaultBrand);
      if (!requested) {
        json(res, 400, { error: 'brandId requerido o usuario sin marca activa' });
        return;
      }
      const redirectAfter = query.redirectAfter ?? '/';
      const state = await issueOAuthState({
        brandId: requested.brandId,
        platform: 'tiktok',
        redirectAfter,
        userId: requested.userId,
      });
      const redirectUri = buildRedirectUri(req, 'tiktok');
      const url = `${TT_OAUTH_AUTHORIZE}?client_key=${clientKey}&scope=${encodeURIComponent(TT_SCOPES)}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`;
      redirect(res, url);
    },
  },
  {
    method: 'GET',
    pattern: '/api/auth/tiktok/callback',
    handler: async ({ req, res, query }) => {
      const { code, state, error: oauthError } = query;
      if (oauthError) {
        json(res, 400, { error: `OAuth error: ${oauthError}` });
        return;
      }
      if (!code || !state) {
        json(res, 400, { error: 'Faltan code o state' });
        return;
      }

      const stateData = await consumeOAuthState(state);
      if (!stateData || stateData.platform !== 'tiktok') {
        json(res, 400, { error: 'state inválido o expirado' });
        return;
      }

      const clientKey = env.tiktok.clientKey || process.env.TIKTOK_CLIENT_KEY;
      const clientSecret = env.tiktok.clientSecret || process.env.TIKTOK_CLIENT_SECRET;
      if (!clientKey || !clientSecret) {
        json(res, 500, { error: 'TIKTOK_CLIENT_KEY/SECRET no configurados' });
        return;
      }

      const redirectUri = buildRedirectUri(req, 'tiktok');
      try {
        const tokenBody = new URLSearchParams({
          client_key: clientKey,
          client_secret: clientSecret,
          code,
          grant_type: 'authorization_code',
          redirect_uri: redirectUri,
        });
        const tokenRes = await fetch(TT_OAUTH_TOKEN, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: tokenBody.toString(),
        });
        if (!tokenRes.ok) {
          const errText = await tokenRes.text();
          json(res, 502, { error: 'Token exchange failed', detail: errText.slice(0, 300) });
          return;
        }
        const data = (await tokenRes.json()) as {
          access_token?: string;
          refresh_token?: string;
          expires_in?: number;
          open_id?: string;
          scope?: string;
        };
        if (!data.access_token) {
          json(res, 502, { error: 'No access_token recibido', detail: JSON.stringify(data).slice(0, 200) });
          return;
        }
        await saveConnection({
          platform: 'tiktok',
          brandId: stateData.brandId,
          accessToken: data.access_token,
          refreshToken: data.refresh_token,
          openId: data.open_id,
          scope: data.scope,
          expiresAtIso: data.expires_in ? new Date(Date.now() + data.expires_in * 1000).toISOString() : undefined,
          connectedAt: new Date().toISOString(),
        });
        redirect(res, `${stateData.redirectAfter ?? '/'}?connected=tiktok&brandId=${stateData.brandId}`);
      } catch (err) {
        log.error('[oauthRoutes] TT callback error', { err: String(err) });
        json(res, 500, { error: 'OAuth callback error', detail: err instanceof Error ? err.message : String(err) });
      }
    },
  },

  // ── Manage connections ──────────────────────────────────────────────────
  {
    method: 'GET',
    pattern: '/api/auth/connections',
    handler: async ({ req, res, query }) => {
      const requested = await getRequestedBrandId({ req, source: sourceFromQuery(query) }, defaultBrand);
      if (!requested) {
        json(res, 400, { error: 'brandId requerido' });
        return;
      }
      const conns = await listConnectionsForBrand(requested.brandId);
      json(
        res,
        200,
        conns.map((c) => ({
          platform: c.platform,
          connectedAt: c.connectedAt,
          expiresAtIso: c.expiresAtIso,
          expired: isExpired(c),
          openId: c.openId,
          scope: c.scope,
          metadata: c.metadata,
        })),
      );
    },
  },
  {
    method: 'POST',
    pattern: '/api/auth/disconnect',
    handler: async ({ req, res, body }) => {
      const requested = await getRequestedBrandId({ req, source: sourceFromBody(body) }, defaultBrand);
      if (!requested) {
        json(res, 400, { error: 'brandId requerido' });
        return;
      }
      const b = (body ?? {}) as { platform?: ConnectionPlatform };
      if (!b.platform || (b.platform !== 'instagram' && b.platform !== 'tiktok')) {
        json(res, 400, { error: 'platform requerido (instagram|tiktok)' });
        return;
      }
      const ok = await deleteConnection(requested.brandId, b.platform);
      json(res, 200, { ok, brandId: requested.brandId, platform: b.platform });
    },
  },
];
