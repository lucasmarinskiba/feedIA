import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import express from 'express';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/agent/tokenRouter.js', () => ({
  ask: vi.fn(async () => ({ text: 'Respuesta de prueba' })),
}));

import tiktokRoutes from '../../src/api/tiktok-routes.js';
import { configureBotControlStore, setBotEnabled } from '../../src/capabilities/botControl/state.js';
import { configureRateLimitStore } from '../../src/compliance/rateLimiter.js';

let server: Server;
let base: string;

beforeAll(async () => {
  const app = express();
  app.use(express.json());
  app.use('/api/tiktok', tiktokRoutes);
  await new Promise<void>((resolve) => {
    server = app.listen(0, '127.0.0.1', resolve);
  });
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/tiktok`;
});
afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

beforeEach(() => {
  vi.unstubAllEnvs();
  configureBotControlStore(null);
  configureRateLimitStore(null);
});

const post = (path: string, body: unknown): Promise<Response> =>
  fetch(`${base}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });

describe('POST /api/tiktok/business/respond', () => {
  it('con tiktok-bot prendido (default), responde a un mensaje entrante', async () => {
    const res = await post('/business/respond', { senderId: 'u1', text: '¿cuánto cuesta?' });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { sent: boolean; text: string };
    expect(body.sent).toBe(true);
    expect(body.text).toBeTruthy();
  });

  it('con tiktok-bot apagado, 409 sin generar ni evaluar nada', async () => {
    setBotEnabled('tiktok-bot', false);
    const res = await post('/business/respond', { senderId: 'u1', text: 'hola' });
    expect(res.status).toBe(409);
    expect((await res.json()).error).toBe('tiktok-bot-disabled');
  });

  it('cuerpo inválido → 400', async () => {
    expect((await post('/business/respond', { text: 'sin senderId' })).status).toBe(400);
  });

  it('en producción sin FEEDIA_ADMIN_KEY: 503 (contenido de terceros, falla cerrado)', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('FEEDIA_ADMIN_KEY', '');
    const res = await post('/business/respond', { senderId: 'u1', text: 'hola' });
    expect(res.status).toBe(503);
  });
});

describe('POST /api/tiktok/live/moderate', () => {
  it('clasifica un lote de comentarios', async () => {
    const res = await post('/live/moderate', {
      comments: [
        { id: '1', authorUsername: 'a', text: 'genial!' },
        { id: '2', authorUsername: 'b', text: 'bit.ly/spam click here' },
      ],
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { verdicts: Array<{ action: string }> };
    expect(body.verdicts).toHaveLength(2);
  });

  it('con tiktok-bot apagado, 409', async () => {
    setBotEnabled('tiktok-bot', false);
    const res = await post('/live/moderate', { comments: [{ id: '1', authorUsername: 'a', text: 'hola' }] });
    expect(res.status).toBe(409);
  });

  it('lote vacío → 400', async () => {
    expect((await post('/live/moderate', { comments: [] })).status).toBe(400);
  });
});
