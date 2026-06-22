/* eslint-disable @typescript-eslint/explicit-function-return-type */
/**
 * OAuth Routes — Instagram (Meta Graph) + TikTok Display API.
 *
 * Ahora el flujo está atado a la sesión de usuario cuando existe, y permite
 * especificar la marca (brandId) a conectar. Si no hay sesión, fallback a la
 * marca default del servidor (modo legacy single-tenant).
 *
 *   GET /api/auth/instagram/login          → redirect to Meta OAuth
 *   GET /api/auth/instagram/callback       → exchange code, persist token cifrado
 *   GET /api/auth/instagram/status         → estado de la conexión
 *   POST /api/auth/instagram/refresh       → refrescar long-lived token
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

const META_OAUTH_AUTHORIZE = 'https://www.facebook.com/v18.0/dialog/oauth';
const META_OAUTH_TOKEN = 'https://graph.facebook.com/v18.0/oauth/access_token';
const META_SCOPES = [
  'instagram_basic',
  'instagram_content_publish',
  'pages_show_list',
  'pages_read_engagement',
  'business_management',
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

const resolveDefaultBrandId = (brand?: { id?: string; name: string }): string | undefined =>
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
  // ── Instagram (Meta Graph) ──────────────────────────────────────────────
  {
    method: 'GET',
    pattern: '/api/auth/instagram/login',
    handler: async ({ req, res, query }) => {
      const clientId = process.env.META_APP_ID;
      if (!clientId) {
        json(res, 500, { error: 'META_APP_ID no configurado' });
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
      const url = `${META_OAUTH_AUTHORIZE}?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(META_SCOPES)}&state=${state}&response_type=code`;
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

      const clientId = process.env.META_APP_ID;
      const clientSecret = process.env.META_APP_SECRET;
      if (!clientId || !clientSecret) {
        json(res, 500, { error: 'META_APP_ID/SECRET no configurados' });
        return;
      }

      const redirectUri = buildRedirectUri(req, 'instagram');
      try {
        const tokenUrl =
          `${META_OAUTH_TOKEN}?client_id=${clientId}&client_secret=${clientSecret}` +
          `&redirect_uri=${encodeURIComponent(redirectUri)}&code=${code}`;
        const tokenRes = await metaFetch(tokenUrl, {}, { description: 'Meta OAuth token exchange', maxAttempts: 3 });
        const tokenData = (await tokenRes.json()) as {
          access_token?: string;
          expires_in?: number;
          token_type?: string;
        };
        const shortToken = tokenData.access_token;
        if (!shortToken) {
          json(res, 502, { error: 'No access_token recibido' });
          return;
        }

        const longLivedUrl =
          `https://graph.facebook.com/v18.0/oauth/access_token?grant_type=fb_exchange_token` +
          `&client_id=${clientId}&client_secret=${clientSecret}&fb_exchange_token=${shortToken}`;
        const longRes = await metaFetch(longLivedUrl, {}, { description: 'Meta OAuth long-lived token', maxAttempts: 3 });
        const longData = (await longRes.json()) as { access_token?: string; expires_in?: number };
        const longLivedToken = longData.access_token ?? shortToken;
        const expiresIn = longData.expires_in ?? tokenData.expires_in ?? 5_184_000;

        const pageMapping = await resolveInstagramBusinessAccount(longLivedToken);
        if (!pageMapping.igBusinessId) {
          log.warn('[oauthRoutes] No se encontró cuenta de Instagram Business', { brandId: stateData.brandId });
          redirect(
            res,
            `${stateData.redirectAfter ?? '/'}?oauth_error=no_ig_business_account&pages=${encodeURIComponent(JSON.stringify(pageMapping.availablePages))}`,
          );
          return;
        }

        await saveConnection({
          platform: 'instagram',
          brandId: stateData.brandId,
          accessToken: longLivedToken,
          expiresAtIso: new Date(Date.now() + expiresIn * 1000).toISOString(),
          metadata: { igBusinessId: pageMapping.igBusinessId ?? '', pageId: pageMapping.pageId ?? '' },
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
        pageId: conn.metadata?.pageId,
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
      const clientId = process.env.META_APP_ID;
      const clientSecret = process.env.META_APP_SECRET;
      if (!clientId || !clientSecret) {
        json(res, 500, { error: 'META_APP_ID/SECRET no configurados' });
        return;
      }
      try {
        const refreshUrl =
          `https://graph.facebook.com/v18.0/oauth/access_token?grant_type=fb_exchange_token` +
          `&client_id=${clientId}&client_secret=${clientSecret}&fb_exchange_token=${conn.accessToken}`;
        const refreshRes = await metaFetch(refreshUrl, {}, { description: 'Meta OAuth refresh', maxAttempts: 3 });
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

interface PageMapping {
  igBusinessId?: string;
  pageId?: string;
  availablePages: Array<{ pageId: string; pageName?: string; igBusinessId?: string }>;
}

const resolveInstagramBusinessAccount = async (accessToken: string): Promise<PageMapping> => {
  const result: PageMapping = { availablePages: [] };
  try {
    const pagesRes = await metaFetch(
      `https://graph.facebook.com/v18.0/me/accounts?access_token=${accessToken}`,
      {},
      { description: 'Meta pages list', maxAttempts: 2 },
    );
    const pagesData = (await pagesRes.json()) as {
      data?: Array<{ id: string; name?: string; access_token: string }>;
    };
    for (const page of pagesData.data ?? []) {
      const igRes = await metaFetch(
        `https://graph.facebook.com/v18.0/${page.id}?fields=instagram_business_account&access_token=${page.access_token}`,
        {},
        { description: 'Meta IG business account lookup', maxAttempts: 2 },
      );
      const igData = (await igRes.json()) as { instagram_business_account?: { id: string } };
      const entry: PageMapping['availablePages'][number] = {
        pageId: page.id,
        pageName: page.name,
        igBusinessId: igData.instagram_business_account?.id,
      };
      result.availablePages.push(entry);
      if (igData.instagram_business_account?.id && !result.igBusinessId) {
        result.pageId = page.id;
        result.igBusinessId = igData.instagram_business_account.id;
      }
    }
  } catch (err) {
    log.warn('[oauthRoutes] IG business id resolve failed', { err: String(err) });
  }
  return result;
};
