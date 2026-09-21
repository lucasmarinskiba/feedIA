import type { IncomingHttpHeaders, IncomingMessage, Server, ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';
import express from 'express';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

// La lista de jobs real es enorme y no es lo que se prueba acá.
vi.mock('../../../src/scheduler/jobs.js', () => ({
  jobs: [{ name: 'bot-poll' }, { name: 'cm-inbox-tick' }, { name: 'cmo-daily-cycle' }, { name: 'calendar-dispatcher' }],
}));
vi.mock('../../../src/agent/bus.js', () => ({ emit: vi.fn() }));

import botControlRoutes from '../../../src/api/bot-control-routes.js';
import { checkAdminAccess } from '../../../src/api/controlCore.js';
import { configureBotControlStore, isBotEnabled } from '../../../src/capabilities/botControl/state.js';
import { configureReviewStore } from '../../../src/capabilities/commentBrain/reviewQueue.js';
import { buildControlRoutes } from '../../../src/server/controlRoutes.js';
import type { RouteContext } from '../../../src/server/http.js';

interface BotsBody {
  ok: boolean;
  master: { state: string; enabled: number; total: number };
  bots: Array<{ id: string; enabled: boolean; jobs?: number; views: string[] }>;
  infraJobs?: number;
  corrupt: boolean;
}

beforeEach(() => {
  vi.unstubAllEnvs();
  configureBotControlStore(null);
  configureReviewStore(null);
});

describe('checkAdminAccess', () => {
  const H = (h: Record<string, string>): IncomingHttpHeaders => h;

  it('en desarrollo sin clave configurada deja pasar (igual que el resto del panel local)', () => {
    expect(checkAdminAccess(H({}), { NODE_ENV: 'development' })).toBeNull();
    expect(checkAdminAccess(H({}), {})).toBeNull();
  });

  it('en PRODUCCIÓN sin clave configurada falla cerrado (503): estas rutas controlan el gasto', () => {
    expect(checkAdminAccess(H({}), { NODE_ENV: 'production' })).toEqual({
      status: 503,
      body: { error: 'admin-key-not-configured' },
    });
    expect(checkAdminAccess(H({}), { NODE_ENV: 'production', FEEDIA_ADMIN_KEY: '   ' })?.status).toBe(503);
  });

  it('con clave configurada exige presentarla: por X-Admin-Key, X-API-Key o Bearer', () => {
    const env = { FEEDIA_ADMIN_KEY: 'sekret' };
    expect(checkAdminAccess(H({ 'x-admin-key': 'sekret' }), env)).toBeNull();
    expect(checkAdminAccess(H({ 'x-api-key': 'sekret' }), env)).toBeNull();
    expect(checkAdminAccess(H({ authorization: 'Bearer sekret' }), env)).toBeNull();
  });

  it('sin clave o con una equivocada → 403, sin revelar nada más', () => {
    const env = { FEEDIA_ADMIN_KEY: 'sekret' };
    expect(checkAdminAccess(H({}), env)).toEqual({ status: 403, body: { error: 'forbidden' } });
    expect(checkAdminAccess(H({ 'x-admin-key': 'otra' }), env)?.status).toBe(403);
    expect(checkAdminAccess(H({ 'x-admin-key': 'sekret-extra-largo' }), env)?.status).toBe(403); // largos distintos: no revienta
    expect(checkAdminAccess(H({ authorization: 'Basic sekret' }), env)?.status).toBe(403);
  });

  it('acepta varias claves separadas por coma', () => {
    const env = { FEEDIA_ADMIN_KEY: 'uno, dos' };
    expect(checkAdminAccess(H({ 'x-admin-key': 'dos' }), env)).toBeNull();
    expect(checkAdminAccess(H({ 'x-admin-key': 'tres' }), env)?.status).toBe(403);
  });
});

describe('Express /api/bots', () => {
  let server: Server;
  let base: string;

  beforeAll(async () => {
    const app = express();
    app.use(express.json());
    app.use('/api/bots', botControlRoutes);
    await new Promise<void>((resolve) => {
      server = app.listen(0, '127.0.0.1', resolve);
    });
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/bots`;
  });
  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  const post = (path: string, body: unknown): Promise<Response> =>
    fetch(`${base}${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });

  it('GET lista los 8 bots con cuántas tareas gobierna cada uno y cuántas son infraestructura', async () => {
    const res = await fetch(base);
    const body = (await res.json()) as BotsBody;
    expect(res.status).toBe(200);
    expect(body.bots).toHaveLength(8);
    expect(body.master).toMatchObject({ state: 'all-on', total: 8 });
    expect(body.infraJobs).toBe(1); // calendar-dispatcher
    expect(body.bots.find((b) => b.id === 'dm-bot')?.jobs).toBe(2); // bot-poll + cm-inbox-tick
    expect(body.bots.find((b) => b.id === 'comment-bot')?.views).toContain('inbox');
  });

  it('el botón maestro apaga todos; después se puede reactivar UNO; y el maestro restaura los anteriores', async () => {
    const off = (await (await post('/master', { enabled: false })).json()) as BotsBody;
    expect(off.master.state).toBe('all-off');
    expect(off.bots.every((b) => !b.enabled)).toBe(true);
    expect(isBotEnabled('dm-bot')).toBe(false); // efecto real en el estado, no solo en la respuesta

    const one = (await (await post('/comment-bot/state', { enabled: true })).json()) as BotsBody;
    expect(one.master.state).toBe('partial');
    expect(one.bots.filter((b) => b.enabled).map((b) => b.id)).toEqual(['comment-bot']);

    const back = (await (await post('/master', { enabled: true })).json()) as BotsBody;
    expect(back.master.state).toBe('all-on');
  });

  it('apagar un bot individual', async () => {
    const r = (await (await post('/tiktok-bot/state', { enabled: false })).json()) as BotsBody;
    expect(r.bots.find((b) => b.id === 'tiktok-bot')?.enabled).toBe(false);
    expect(r.master.state).toBe('partial');
  });

  it('valida la entrada: cuerpo inválido → 400, bot inexistente → 404 (y no toca el estado)', async () => {
    expect((await post('/master', { enabled: 'si' })).status).toBe(400);
    expect((await post('/master', {})).status).toBe(400);
    expect((await post('/tiktok-bot/state', { enabled: 1 })).status).toBe(400);
    expect((await post('/bot-fantasma/state', { enabled: false })).status).toBe(404);
    expect(isBotEnabled('tiktok-bot')).toBe(true);
  });

  it('en producción sin FEEDIA_ADMIN_KEY: 503 en TODAS las rutas y no se cambia nada', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('FEEDIA_ADMIN_KEY', '');
    expect((await fetch(base)).status).toBe(503);
    expect((await post('/master', { enabled: false })).status).toBe(503);
    expect((await post('/ads-bot/state', { enabled: false })).status).toBe(503);
    expect(isBotEnabled('ads-bot')).toBe(true);
  });

  it('con clave configurada: sin clave 403, con clave 200 y cambia', async () => {
    vi.stubEnv('FEEDIA_ADMIN_KEY', 'sekret');
    expect((await post('/master', { enabled: false })).status).toBe(403);
    expect(isBotEnabled('ads-bot')).toBe(true);

    const ok = await fetch(`${base}/ads-bot/state`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-admin-key': 'sekret' },
      body: JSON.stringify({ enabled: false }),
    });
    expect(ok.status).toBe(200);
    expect(isBotEnabled('ads-bot')).toBe(false);
  });
});

describe('rutas del daemon (donde corren los bots)', () => {
  const fakeRes = (): { res: ServerResponse; result: () => { status: number; body: unknown } } => {
    const state = { statusCode: 200, body: '' };
    const res = {
      get statusCode(): number {
        return state.statusCode;
      },
      set statusCode(v: number) {
        state.statusCode = v;
      },
      setHeader: (): void => undefined,
      end: (b?: string): void => {
        state.body = b ?? '';
      },
    } as unknown as ServerResponse;
    return { res, result: () => ({ status: state.statusCode, body: state.body ? JSON.parse(state.body) : null }) };
  };

  const call = async (
    method: string,
    pattern: string,
    opts: {
      headers?: IncomingHttpHeaders;
      body?: unknown;
      params?: Record<string, string>;
      query?: Record<string, string>;
    } = {},
  ): Promise<{ status: number; body: unknown }> => {
    const route = buildControlRoutes().find((r) => r.method === method && r.pattern === pattern);
    if (!route) throw new Error(`ruta no registrada: ${method} ${pattern}`);
    const { res, result } = fakeRes();
    await route.handler({
      req: { headers: opts.headers ?? {} } as IncomingMessage,
      res,
      params: opts.params ?? {},
      query: opts.query ?? {},
      body: opts.body,
      rawBody: Buffer.alloc(0),
    } as RouteContext);
    return result();
  };

  it('registra exactamente las rutas esperadas', () => {
    expect(
      buildControlRoutes()
        .map((r) => `${r.method} ${r.pattern}`)
        .sort(),
    ).toEqual(
      [
        'GET /api/bots',
        'POST /api/bots/master',
        'POST /api/bots/:id/state',
        'GET /api/comment-brain/status',
        'GET /api/comment-brain/review',
        'GET /api/comment-brain/decisions',
        'POST /api/comment-brain/review/:id/approve',
        'POST /api/comment-brain/review/:id/reject',
        'POST /api/comment-brain/review/:id/resolve',
      ].sort(),
    );
  });

  it('ninguna ruta es ambigua: el daemon matchea por cantidad de segmentos y toma la primera, así que un patrón estático no puede convivir con uno con :param en la misma posición', () => {
    const routes = buildControlRoutes();
    const couldMatchSame = (a: string, b: string): boolean => {
      const pa = a.split('/').filter(Boolean);
      const pb = b.split('/').filter(Boolean);
      return (
        pa.length === pb.length &&
        pa.every((seg, i) => seg === pb[i] || seg.startsWith(':') || (pb[i] ?? '').startsWith(':'))
      );
    };
    for (const [i, a] of routes.entries()) {
      for (const b of routes.slice(i + 1)) {
        if (a.method !== b.method) continue;
        expect(couldMatchSame(a.pattern, b.pattern), `${a.method} ${a.pattern}  ↔  ${b.pattern}`).toBe(false);
      }
    }
  });

  it('GET /api/bots y el maestro funcionan igual que en Express', async () => {
    const list = await call('GET', '/api/bots');
    expect(list.status).toBe(200);
    expect((list.body as BotsBody).bots).toHaveLength(8);

    const off = await call('POST', '/api/bots/master', { body: { enabled: false } });
    expect((off.body as BotsBody).master.state).toBe('all-off');
    expect(isBotEnabled('comment-bot')).toBe(false);
  });

  it('el interruptor individual usa :id y valida', async () => {
    const ok = await call('POST', '/api/bots/:id/state', { params: { id: 'ads-bot' }, body: { enabled: false } });
    expect(ok.status).toBe(200);
    expect(isBotEnabled('ads-bot')).toBe(false);
    expect(
      (await call('POST', '/api/bots/:id/state', { params: { id: 'nope' }, body: { enabled: false } })).status,
    ).toBe(404);
    expect((await call('POST', '/api/bots/:id/state', { params: { id: 'ads-bot' }, body: {} })).status).toBe(400);
  });

  it('respeta el guard de admin (403 sin clave) y no cambia nada', async () => {
    vi.stubEnv('FEEDIA_ADMIN_KEY', 'sekret');
    const denied = await call('POST', '/api/bots/master', { body: { enabled: false } });
    expect(denied).toEqual({ status: 403, body: { error: 'forbidden' } });
    expect(isBotEnabled('comment-bot')).toBe(true);

    const allowed = await call('POST', '/api/bots/master', {
      body: { enabled: false },
      headers: { 'x-admin-key': 'sekret' },
    });
    expect(allowed.status).toBe(200);
    expect(isBotEnabled('comment-bot')).toBe(false);
  });

  it('las rutas de la cola del Comment Brain también están y también están protegidas', async () => {
    const status = await call('GET', '/api/comment-brain/status');
    expect(status.status).toBe(200);
    expect(status.body).toMatchObject({ ok: true, autonomy: 'suggest', costGuards: { limits: expect.anything() } });

    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('FEEDIA_ADMIN_KEY', '');
    expect((await call('GET', '/api/comment-brain/review')).status).toBe(503);
  });
});
