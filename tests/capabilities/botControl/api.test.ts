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
import { resetAccountBotStoreForTests } from '../../../src/capabilities/botControl/index.js';
import { configureBotControlStore } from '../../../src/capabilities/botControl/state.js';
import { configureReviewStore } from '../../../src/capabilities/commentBrain/reviewQueue.js';
import { upsertUserTier, type UserTier } from '../../../src/db/user-tiers.js';
import { buildControlRoutes } from '../../../src/server/controlRoutes.js';
import type { RouteContext } from '../../../src/server/http.js';

interface BotsBody {
  ok: boolean;
  master: { state: string; enabled: number; total: number; locked: number };
  bots: Array<{ id: string; enabled: boolean; locked: boolean; requiredTier: string; jobs?: number; views: string[] }>;
  infraJobs?: number;
  corrupt: boolean;
  skippedLocked?: string[];
}

let uid = 0;
/** Un userId nuevo por test: evita que el tier seedeado por un caso se filtre a otro. */
const freshUserId = (): string => `bots-test-${Date.now()}-${uid++}`;
const seedTier = (userId: string, tier: UserTier): Promise<unknown> =>
  upsertUserTier(userId, `${userId}@test.local`, tier);

beforeEach(() => {
  vi.unstubAllEnvs();
  configureBotControlStore(null);
  resetAccountBotStoreForTests();
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

describe('Express /api/bots — gate por plan, no por admin key', () => {
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

  const get = (userId: string, extraHeaders: Record<string, string> = {}): Promise<Response> =>
    fetch(base, { headers: { 'x-user-id': userId, ...extraHeaders } });

  const post = (
    path: string,
    body: unknown,
    userId: string,
    extraHeaders: Record<string, string> = {},
  ): Promise<Response> =>
    fetch(`${base}${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-user-id': userId, ...extraHeaders },
      body: JSON.stringify(body),
    });

  it('GET siempre devuelve los 8 bots (nunca se filtra la lista) con cuántas tareas gobierna cada uno', async () => {
    const res = await get(freshUserId());
    const body = (await res.json()) as BotsBody;
    expect(res.status).toBe(200);
    expect(body.bots).toHaveLength(8);
    expect(body.infraJobs).toBe(1); // calendar-dispatcher
    expect(body.bots.find((b) => b.id === 'dm-bot')?.jobs).toBe(2); // bot-poll + cm-inbox-tick
    expect(body.bots.find((b) => b.id === 'comment-bot')?.views).toContain('inbox');
  });

  it('cuenta nueva (free, sin tier seedeado): los 8 bots aparecen pero todos bloqueados, maestro all-off', async () => {
    const body = (await (await get(freshUserId())).json()) as BotsBody;
    expect(body.bots.every((b) => b.locked)).toBe(true);
    expect(body.bots.every((b) => !b.enabled)).toBe(true);
    expect(body.master).toMatchObject({ state: 'all-off', enabled: 0, locked: 8 });
  });

  it('plan starter: desbloquea comment/dm/community/tiktok, deja bloqueados content/ads/computer-use/intelligence', async () => {
    const u = freshUserId();
    await seedTier(u, 'starter');
    const body = (await (await get(u)).json()) as BotsBody;
    const locked = (id: string): boolean => !!body.bots.find((b) => b.id === id)?.locked;
    expect(locked('comment-bot')).toBe(false);
    expect(locked('dm-bot')).toBe(false);
    expect(locked('community-bot')).toBe(false);
    expect(locked('tiktok-bot')).toBe(false);
    expect(locked('content-bot')).toBe(true);
    expect(locked('ads-bot')).toBe(true);
    expect(locked('computer-use-bot')).toBe(true);
    expect(locked('intelligence-bot')).toBe(true);
  });

  it('prender un bot que el plan no cubre → 403 tier-required (no cambia nada); prender uno cubierto → 200 y persiste', async () => {
    const u = freshUserId();
    await seedTier(u, 'starter');

    const denied = await post('/content-bot/state', { enabled: true }, u);
    expect(denied.status).toBe(403);
    expect(await denied.json()).toMatchObject({ error: 'tier-required', requiredTier: 'pro', currentTier: 'starter' });

    const ok = (await (await post('/comment-bot/state', { enabled: true }, u)).json()) as BotsBody;
    expect(ok.bots.find((b) => b.id === 'comment-bot')).toMatchObject({ enabled: true, locked: false });

    // Persiste: una consulta GET separada ve el mismo estado, no solo la respuesta del POST.
    const again = (await (await get(u)).json()) as BotsBody;
    expect(again.bots.find((b) => b.id === 'comment-bot')?.enabled).toBe(true);
  });

  it('apagar un bot bloqueado nunca da 403 — bajar gasto siempre está permitido', async () => {
    const u = freshUserId(); // free: todo bloqueado
    const res = await post('/ads-bot/state', { enabled: false }, u);
    expect(res.status).toBe(200);
  });

  it('valida la entrada: cuerpo inválido → 400, bot inexistente → 404', async () => {
    const u = freshUserId();
    expect((await post('/master', { enabled: 'si' }, u)).status).toBe(400);
    expect((await post('/master', {}, u)).status).toBe(400);
    expect((await post('/tiktok-bot/state', { enabled: 1 }, u)).status).toBe(400);
    expect((await post('/bot-fantasma/state', { enabled: false }, u)).status).toBe(404);
  });

  it('en producción, sin FEEDIA_ADMIN_KEY configurada: GET y POST siguen andando (el gate ya no es la admin key)', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('FEEDIA_ADMIN_KEY', '');
    const u = freshUserId();
    await seedTier(u, 'starter');
    expect((await get(u)).status).toBe(200);
    expect((await post('/master', { enabled: false }, u)).status).toBe(200);
    expect((await post('/comment-bot/state', { enabled: true }, u)).status).toBe(200);
  });

  it('admin key válida: bypass total, sin importar el plan de la cuenta', async () => {
    vi.stubEnv('FEEDIA_ADMIN_KEY', 'sekret');
    const u = freshUserId(); // free, nunca seedeado
    const withKey = { 'x-admin-key': 'sekret' };

    const body = (await (await get(u, withKey)).json()) as BotsBody;
    expect(body.bots.every((b) => !b.locked)).toBe(true);

    const ok = await post('/ads-bot/state', { enabled: true }, u, withKey);
    expect(ok.status).toBe(200);

    // Sin la clave, la misma cuenta vuelve a estar bloqueada.
    const withoutKey = (await (await get(u)).json()) as BotsBody;
    expect(withoutKey.bots.find((b) => b.id === 'ads-bot')?.locked).toBe(true);
  });

  it('botón maestro: prender solo restaura lo que el plan permite y reporta lo que se salteó', async () => {
    const u = freshUserId();
    await seedTier(u, 'starter');
    await post('/master', { enabled: false }, u); // arranca de "todo apagado" explícito

    const body = (await (await post('/master', { enabled: true }, u)).json()) as BotsBody;
    expect(body.master.enabled).toBe(4); // comment/dm/community/tiktok
    expect(body.skippedLocked).toHaveLength(4);
    expect(body.skippedLocked).toEqual(
      expect.arrayContaining(['content-bot', 'ads-bot', 'computer-use-bot', 'intelligence-bot']),
    );
    expect(body.bots.find((b) => b.id === 'content-bot')?.enabled).toBe(false);
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
        'GET /api/comment-brain/outbox',
        'POST /api/comment-brain/outbox/:id/retry',
        'POST /api/comment-brain/outbox/:id/cancel',
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

  it('GET /api/bots y el maestro funcionan igual que en Express (con admin key: todo desbloqueado)', async () => {
    vi.stubEnv('FEEDIA_ADMIN_KEY', 'sekret');
    const withKey = { headers: { 'x-admin-key': 'sekret' } };

    const list = await call('GET', '/api/bots', withKey);
    expect(list.status).toBe(200);
    expect((list.body as BotsBody).bots).toHaveLength(8);

    const off = await call('POST', '/api/bots/master', { ...withKey, body: { enabled: false } });
    expect((off.body as BotsBody).master.state).toBe('all-off');
  });

  it('el interruptor individual usa :id y valida (con admin key: sin bloqueo por plan)', async () => {
    vi.stubEnv('FEEDIA_ADMIN_KEY', 'sekret');
    const withKey = { headers: { 'x-admin-key': 'sekret' } };

    const ok = await call('POST', '/api/bots/:id/state', {
      ...withKey,
      params: { id: 'ads-bot' },
      body: { enabled: false },
    });
    expect(ok.status).toBe(200);
    expect(
      (await call('POST', '/api/bots/:id/state', { ...withKey, params: { id: 'nope' }, body: { enabled: false } }))
        .status,
    ).toBe(404);
    expect(
      (await call('POST', '/api/bots/:id/state', { ...withKey, params: { id: 'ads-bot' }, body: {} })).status,
    ).toBe(400);
  });

  it('sin admin key: apagar funciona igual (self-service); prender algo fuera del plan da tier-required, no "forbidden"', async () => {
    const asFree = { headers: { 'x-user-id': freshUserId() } };
    const off = await call('POST', '/api/bots/master', { ...asFree, body: { enabled: false } });
    expect(off.status).toBe(200);

    const denied = await call('POST', '/api/bots/:id/state', {
      ...asFree,
      params: { id: 'comment-bot' },
      body: { enabled: true },
    });
    expect(denied).toMatchObject({ status: 403, body: { error: 'tier-required', requiredTier: 'starter' } });
  });

  it('admin key inválida no bypassea nada (sigue evaluando por plan)', async () => {
    vi.stubEnv('FEEDIA_ADMIN_KEY', 'sekret');
    const wrongKey = { headers: { 'x-admin-key': 'otra', 'x-user-id': freshUserId() } };
    const denied = await call('POST', '/api/bots/:id/state', {
      ...wrongKey,
      params: { id: 'comment-bot' },
      body: { enabled: true },
    });
    expect(denied).toMatchObject({ status: 403, body: { error: 'tier-required' } });
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
