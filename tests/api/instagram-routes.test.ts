import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import express from 'express';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/integrations/metaAccountResolver.js', () => ({
  resolveMetaCredentials: vi.fn(async () => null),
}));
vi.mock('../../src/integrations/metaApiClient.js', () => ({
  metaFetch: vi.fn(async () => new Response('{}', { status: 200 })),
}));

import instagramRoutes from '../../src/api/instagram-routes.js';
import { configureBotControlStore, setBotEnabled } from '../../src/capabilities/botControl/state.js';
import { configureIceBreakerStore } from '../../src/capabilities/instagram/iceBreakers.js';
import { configureRateLimitStore } from '../../src/compliance/rateLimiter.js';

let server: Server;
let base: string;

beforeAll(async () => {
  const app = express();
  app.use(express.json());
  app.use('/api/instagram', instagramRoutes);
  await new Promise<void>((resolve) => {
    server = app.listen(0, '127.0.0.1', resolve);
  });
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/instagram`;
});
afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

beforeEach(() => {
  vi.unstubAllEnvs();
  configureBotControlStore(null);
  configureIceBreakerStore(null);
  configureRateLimitStore(null);
});

describe('GET /api/instagram/ice-breakers/:accountId', () => {
  it('con instagram-bot prendido (default), devuelve el menú', async () => {
    const res = await fetch(`${base}/ice-breakers/acct-1`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { iceBreakers: unknown[] };
    expect(body.iceBreakers.length).toBeGreaterThan(0);
  });

  it('con instagram-bot apagado, 409', async () => {
    setBotEnabled('instagram-bot', false);
    const res = await fetch(`${base}/ice-breakers/acct-1`);
    expect(res.status).toBe(409);
    expect((await res.json()).error).toBe('instagram-bot-disabled');
  });

  it('en producción sin FEEDIA_ADMIN_KEY: 503 (falla cerrado)', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('FEEDIA_ADMIN_KEY', '');
    const res = await fetch(`${base}/ice-breakers/acct-1`);
    expect(res.status).toBe(503);
  });
});

describe('PUT /api/instagram/ice-breakers/:accountId', () => {
  const put = (accountId: string, body: unknown): Promise<Response> =>
    fetch(`${base}/ice-breakers/${accountId}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });

  it('guarda un menú válido', async () => {
    const res = await put('acct-1', { iceBreakers: [{ question: '¿Cuánto tarda el envío?', payload: 'IB_SHIP' }] });
    expect(res.status).toBe(200);
    expect((await res.json()).ok).toBe(true);
  });

  it('rechaza cuerpo inválido (falta payload)', async () => {
    const res = await put('acct-1', { iceBreakers: [{ question: 'sin payload' }] });
    expect(res.status).toBe(400);
  });

  it('rechaza más de 4 opciones a nivel de schema', async () => {
    const iceBreakers = Array.from({ length: 5 }, (_, i) => ({ question: `Q${i}`, payload: `P${i}` }));
    const res = await put('acct-1', { iceBreakers });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/instagram/ice-breakers/:accountId/sync', () => {
  it('sin credenciales de Meta configuradas, responde 502 con no-credentials', async () => {
    const res = await fetch(`${base}/ice-breakers/acct-1/sync`, { method: 'POST' });
    expect(res.status).toBe(502);
    expect((await res.json()).error).toBe('no-credentials');
  });

  it('con instagram-bot apagado, 409 sin intentar sync', async () => {
    setBotEnabled('instagram-bot', false);
    const res = await fetch(`${base}/ice-breakers/acct-1/sync`, { method: 'POST' });
    expect(res.status).toBe(409);
  });
});
