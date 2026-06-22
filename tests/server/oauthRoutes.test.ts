import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Readable } from 'node:stream';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { createRequestHandler } from '../../src/server/http.js';
import { buildOAuthRoutes } from '../../src/server/oauthRoutes.js';
import { issueOAuthState, deleteConnection, listConnectionsForBrand } from '../../src/integrations/oauthConnections.js';
import { metaFetch } from '../../src/integrations/metaApiClient.js';

vi.mock('../../src/integrations/metaApiClient.js', () => ({
  metaFetch: vi.fn(),
}));

const mockedMetaFetch = vi.mocked(metaFetch);

const brand = { id: 'test-brand-oauth', name: 'Test Brand' };

const createMockRes = (): ServerResponse & { statusCode: number; headers: Record<string, unknown>; body: string } => {
  const res: Record<string, unknown> = { statusCode: 0, headers: {}, body: '' };
  res.setHeader = (k: string, v: unknown): typeof res => {
    res.headers[k] = v;
    return res as typeof res;
  };
  res.writeHead = (status: number, headers?: Record<string, unknown>): typeof res => {
    res.statusCode = status;
    if (headers) Object.assign(res.headers, headers);
    return res as typeof res;
  };
  res.end = (chunk?: string | Buffer): typeof res => {
    res.body += chunk?.toString() ?? '';
    return res as typeof res;
  };
  return res as ServerResponse & { statusCode: number; headers: Record<string, unknown>; body: string };
};

const createMockReq = (
  method: string,
  url: string,
  bodyObj?: unknown,
  extraHeaders: Record<string, string> = {},
): IncomingMessage => {
  const req = new Readable({ read() {} }) as unknown as IncomingMessage;
  req.method = method;
  req.url = url;
  req.headers = {
    host: 'localhost:3000',
    ...(bodyObj ? { 'content-type': 'application/json' } : {}),
    ...extraHeaders,
  };
  if (bodyObj) {
    req.push(Buffer.from(JSON.stringify(bodyObj)));
  }
  req.push(null);
  return req;
};

const runRoute = async (
  routes: ReturnType<typeof buildOAuthRoutes>,
  method: string,
  url: string,
  bodyObj?: unknown,
  extraHeaders?: Record<string, string>,
): Promise<{ status: number; headers: Record<string, unknown>; body: string }> => {
  const req = createMockReq(method, url, bodyObj, extraHeaders);
  const res = createMockRes();
  return new Promise((resolve) => {
    const originalEnd = res.end.bind(res);
    res.end = (chunk?: string | Buffer): typeof res => {
      originalEnd(chunk);
      resolve({ status: res.statusCode, headers: res.headers, body: res.body });
      return res;
    };
    createRequestHandler(routes)(req, res);
  });
};

const jsonResponse = (body: string): unknown => {
  try {
    return JSON.parse(body);
  } catch {
    return null;
  }
};

const mockMetaResponses = (igBusinessId = 'IG123'): void => {
  mockedMetaFetch.mockImplementation(async (input: string | URL | Request) => {
    const url = typeof input === 'string' ? input : input.toString();
    if (url.includes('grant_type=fb_exchange_token')) {
      return new Response(JSON.stringify({ access_token: 'LONG_LIVED_TOKEN', expires_in: 5_184_000 }));
    }
    if (url.includes('/me/accounts')) {
      return new Response(
        JSON.stringify({
          data: [{ id: 'PAGE1', name: 'Test Page', access_token: 'PAGE_TOKEN' }],
        }),
      );
    }
    if (url.includes('/PAGE1?fields=instagram_business_account')) {
      return new Response(JSON.stringify({ instagram_business_account: { id: igBusinessId } }));
    }
    // Token exchange inicial.
    return new Response(JSON.stringify({ access_token: 'SHORT_LIVED_TOKEN', expires_in: 3_600 }));
  });
};

describe('oauthRoutes', () => {
  let routes: ReturnType<typeof buildOAuthRoutes>;

  beforeEach(() => {
    vi.stubEnv('META_APP_ID', 'meta-app-id');
    vi.stubEnv('META_APP_SECRET', 'meta-app-secret');
    vi.stubEnv('OAUTH_TOKEN_SECRET', 'oauth-secret-32-bytes-long!!!');
    routes = buildOAuthRoutes(brand);
  });

  afterEach(async () => {
    mockedMetaFetch.mockReset();
    for (const platform of ['instagram', 'tiktok'] as const) {
      await deleteConnection(brand.id, platform);
    }
    vi.unstubAllEnvs();
  });

  describe('Instagram login', () => {
    it('devuelve 500 si META_APP_ID no está configurado', async () => {
      vi.unstubAllEnvs();
      const localRoutes = buildOAuthRoutes(brand);
      const res = await runRoute(localRoutes, 'GET', '/api/auth/instagram/login');
      expect(res.status).toBe(500);
      expect(jsonResponse(res.body)).toEqual({ error: 'META_APP_ID no configurado' });
    });

    it('redirige a Meta OAuth con un state válido', async () => {
      const res = await runRoute(routes, 'GET', '/api/auth/instagram/login?redirectAfter=/dashboard');
      expect(res.status).toBe(302);
      const location = String(res.headers.Location ?? '');
      expect(location).toContain('https://www.facebook.com/v18.0/dialog/oauth');
      expect(location).toContain('client_id=meta-app-id');
      expect(location).toContain('state=');
      expect(location).toContain('redirect_uri=https%3A%2F%2Flocalhost%3A3000%2Fapi%2Fauth%2Finstagram%2Fcallback');
    });
  });

  describe('Instagram callback', () => {
    it('intercambia code, resuelve IG business account y persiste token cifrado', async () => {
      mockMetaResponses('IG123');
      const state = await issueOAuthState({ brandId: brand.id, platform: 'instagram', redirectAfter: '/ok' });

      const res = await runRoute(routes, 'GET', `/api/auth/instagram/callback?code=CODE&state=${state}`);

      expect(res.status).toBe(302);
      const location = String(res.headers.Location ?? '');
      expect(location).toContain('/ok');
      expect(location).toContain('connected=instagram');

      const conn = await listConnectionsForBrand(brand.id);
      expect(conn).toHaveLength(1);
      expect(conn[0]!.platform).toBe('instagram');
      expect(conn[0]!.accessToken).toBe('LONG_LIVED_TOKEN');
      expect(conn[0]!.metadata?.igBusinessId).toBe('IG123');
    });

    it('redirige con error si no hay cuenta de Instagram Business vinculada', async () => {
      // Sobrescribir lookup para no devolver IG business account.
      mockedMetaFetch.mockImplementation(async (input: string | URL | Request) => {
        const url = typeof input === 'string' ? input : input.toString();
        if (url.includes('/PAGE1?fields=instagram_business_account')) {
          return new Response(JSON.stringify({}));
        }
        if (url.includes('grant_type=fb_exchange_token')) {
          return new Response(JSON.stringify({ access_token: 'LONG_LIVED_TOKEN', expires_in: 5_184_000 }));
        }
        if (url.includes('/me/accounts')) {
          return new Response(JSON.stringify({ data: [{ id: 'PAGE1', name: 'Test Page', access_token: 'PAGE_TOKEN' }] }));
        }
        return new Response(JSON.stringify({ access_token: 'SHORT_LIVED_TOKEN', expires_in: 3_600 }));
      });

      const state = await issueOAuthState({ brandId: brand.id, platform: 'instagram', redirectAfter: '/ok' });
      const res = await runRoute(routes, 'GET', `/api/auth/instagram/callback?code=CODE&state=${state}`);

      expect(res.status).toBe(302);
      const location = String(res.headers.Location ?? '');
      expect(location).toContain('oauth_error=no_ig_business_account');
      const conns = await listConnectionsForBrand(brand.id);
      expect(conns).toHaveLength(0);
    });

    it('rechaza state inválido', async () => {
      const res = await runRoute(routes, 'GET', '/api/auth/instagram/callback?code=CODE&state=invalid');
      expect(res.status).toBe(400);
      expect(jsonResponse(res.body)).toEqual({ error: 'state inválido o expirado' });
    });
  });

  describe('Instagram status', () => {
    it('indica no conectado cuando no hay token', async () => {
      const res = await runRoute(routes, 'GET', '/api/auth/instagram/status');
      expect(res.status).toBe(200);
      expect(jsonResponse(res.body)).toMatchObject({ connected: false, brandId: brand.id });
    });

    it('devuelve estado de conexión con metadatos', async () => {
      mockMetaResponses('IG123');
      const state = await issueOAuthState({ brandId: brand.id, platform: 'instagram' });
      await runRoute(routes, 'GET', `/api/auth/instagram/callback?code=CODE&state=${state}`);

      const res = await runRoute(routes, 'GET', '/api/auth/instagram/status');
      expect(res.status).toBe(200);
      expect(jsonResponse(res.body)).toMatchObject({
        connected: true,
        expired: false,
        brandId: brand.id,
        igBusinessId: 'IG123',
        pageId: 'PAGE1',
      });
    });
  });

  describe('Instagram refresh', () => {
    it('refresca el token de larga duración', async () => {
      mockMetaResponses('IG123');
      const state = await issueOAuthState({ brandId: brand.id, platform: 'instagram' });
      await runRoute(routes, 'GET', `/api/auth/instagram/callback?code=CODE&state=${state}`);

      mockedMetaFetch.mockImplementation(async () =>
        new Response(JSON.stringify({ access_token: 'REFRESHED_TOKEN', expires_in: 5_184_000 })),
      );

      const res = await runRoute(routes, 'POST', '/api/auth/instagram/refresh', { brandId: brand.id });
      expect(res.status).toBe(200);
      expect(jsonResponse(res.body)).toMatchObject({ ok: true, brandId: brand.id, expiresIn: 5_184_000 });

      const conns = await listConnectionsForBrand(brand.id);
      expect(conns[0]!.accessToken).toBe('REFRESHED_TOKEN');
    });
  });

  describe('connections management', () => {
    it('lista y desconecta cuentas', async () => {
      mockMetaResponses('IG123');
      const state = await issueOAuthState({ brandId: brand.id, platform: 'instagram' });
      await runRoute(routes, 'GET', `/api/auth/instagram/callback?code=CODE&state=${state}`);

      const listRes = await runRoute(routes, 'GET', '/api/auth/connections');
      expect(listRes.status).toBe(200);
      const list = jsonResponse(listRes.body) as Array<Record<string, unknown>>;
      expect(list).toHaveLength(1);
      expect(list[0]!.platform).toBe('instagram');

      const disconnectRes = await runRoute(routes, 'POST', '/api/auth/disconnect', {
        brandId: brand.id,
        platform: 'instagram',
      });
      expect(disconnectRes.status).toBe(200);
      expect(jsonResponse(disconnectRes.body)).toMatchObject({ ok: true, brandId: brand.id, platform: 'instagram' });

      const after = await listConnectionsForBrand(brand.id);
      expect(after).toHaveLength(0);
    });
  });
});
