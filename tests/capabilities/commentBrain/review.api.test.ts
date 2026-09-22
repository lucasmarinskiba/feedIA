import type { IncomingMessage, Server, ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';
import express from 'express';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../src/agent/bus.js', () => ({ emit: vi.fn() }));
vi.mock('../../../src/integrations/meta.js', () => ({
  replyToComment: vi.fn(async () => ({ ok: true })),
  fetchMediaContext: vi.fn(async () => null),
  fetchCommentThread: vi.fn(async () => null),
}));
vi.mock('../../../src/config/brandRegistry.js', async () => {
  const { makeBrand } = await import('./helpers.js');
  return { getActiveBrand: vi.fn(() => makeBrand()) };
});

import commentBrainRoutes from '../../../src/api/comment-brain-routes.js';
import { getActiveBrand } from '../../../src/config/brandRegistry.js';
import { env } from '../../../src/config/index.js';
import {
  configureDecisionStore,
  listDecisions,
  recordDecision,
} from '../../../src/capabilities/commentBrain/reviewDecisions.js';
import {
  configureReviewStore,
  enqueueReview,
  listReviewQueue,
  resetBrainMemory,
} from '../../../src/capabilities/commentBrain/reviewQueue.js';
import { replyToComment } from '../../../src/integrations/meta.js';
import { buildControlRoutes } from '../../../src/server/controlRoutes.js';
import type { RouteContext } from '../../../src/server/http.js';
import { cls, makeBrand } from './helpers.js';

let server: Server;
let base: string;

beforeAll(async () => {
  const app = express();
  app.use(express.json());
  app.use('/api/comment-brain', commentBrainRoutes);
  await new Promise<void>((resolve) => {
    server = app.listen(0, '127.0.0.1', resolve);
  });
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/comment-brain`;
});
afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

beforeEach(() => {
  vi.unstubAllEnvs();
  configureReviewStore(null);
  configureDecisionStore(null);
  resetBrainMemory();
  vi.mocked(replyToComment).mockReset();
  vi.mocked(replyToComment).mockResolvedValue({ ok: true });
  vi.mocked(getActiveBrand).mockImplementation(() => makeBrand());
});

const DRAFT = 'Nos declaramos culpables de tener zapatillas lindas';
const seed = (over: Partial<Parameters<typeof enqueueReview>[0]> = {}): string =>
  enqueueReview({
    accountKey: 'brand-test',
    commentId: 'c-1',
    handle: 'vecina_23',
    commentText: 'Uy sí, re difícil comprar zapatillas lindas 😏',
    action: 'draft-for-review',
    mode: 'witty-comeback',
    draft: DRAFT,
    reasons: ['modo sugerencia'],
    classification: cls({ kind: 'banter', sarcasm: { present: true, stance: 'playful' } }),
    wouldHaveReplied: true,
    ...over,
  }).id;

const post = (path: string, body?: unknown): Promise<Response> =>
  fetch(`${base}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

interface ApproveBody {
  ok: boolean;
  outcome?: string;
  sent?: boolean;
  dryRun?: boolean;
  finalText?: string;
  error?: string;
  issues?: Array<{ code: string }>;
}

describe('POST /review/:id/approve', () => {
  it('aprueba, envía por replyToComment al comentario correcto y responde si salió de verdad o fue simulado', async () => {
    const id = seed();
    const res = await post(`/review/${id}/approve`, {});
    const body = (await res.json()) as ApproveBody;

    expect(res.status).toBe(200);
    expect(body).toMatchObject({ ok: true, outcome: 'approved-as-is', finalText: DRAFT });
    expect(body.dryRun).toBe(env.dryRun); // honesto: con DRY_RUN activo no salió nada
    expect(body.sent).toBe(!env.dryRun);
    expect(replyToComment).toHaveBeenCalledWith('c-1', DRAFT);
    expect(listReviewQueue()).toHaveLength(0);
  });

  it('sin cuerpo también funciona (aprobar tal cual)', async () => {
    const id = seed();
    expect((await post(`/review/${id}/approve`)).status).toBe(200);
  });

  it('con texto editado se envía el editado y queda registrado como editado', async () => {
    const id = seed();
    const res = await post(`/review/${id}/approve`, { text: 'Culpables, sí, y sin culpa' });
    expect(((await res.json()) as ApproveBody).outcome).toBe('approved-edited');
    expect(replyToComment).toHaveBeenCalledWith('c-1', 'Culpables, sí, y sin culpa');
  });

  it('un texto que los validadores bloquean → 422 con los motivos, NO se envía; con force:true sí', async () => {
    const id = seed();
    const blocked = await post(`/review/${id}/approve`, { text: 'Mirá www.zapatosnorte.com' });
    const body = (await blocked.json()) as ApproveBody;
    expect(blocked.status).toBe(422);
    expect(body.error).toBe('validation');
    expect(body.issues?.some((i) => i.code === 'contacto-o-link')).toBe(true);
    expect(replyToComment).not.toHaveBeenCalled();
    expect(listReviewQueue()).toHaveLength(1);

    const forced = await post(`/review/${id}/approve`, { text: 'Mirá www.zapatosnorte.com', force: true });
    expect(forced.status).toBe(200);
    expect(replyToComment).toHaveBeenCalledTimes(1);
  });

  it('valida la entrada: cuerpo mal formado → 400', async () => {
    const id = seed();
    expect((await post(`/review/${id}/approve`, { text: '' })).status).toBe(400);
    expect((await post(`/review/${id}/approve`, { text: 'x'.repeat(2300) })).status).toBe(400);
    expect((await post(`/review/${id}/approve`, { force: 'si' })).status).toBe(400);
    expect(replyToComment).not.toHaveBeenCalled();
  });

  it('404 si no existe y 409 si no es un borrador (escalamiento) o ya no se puede aprobar', async () => {
    expect((await post('/review/nope/approve', {})).status).toBe(404);
    const esc = seed({ action: 'escalate', draft: undefined });
    const r = await post(`/review/${esc}/approve`, {});
    expect(r.status).toBe(409);
    expect(((await r.json()) as ApproveBody).error).toBe('not-reviewable');
  });

  it('si Meta rechaza el envío → 502 y el item sigue en la cola para reintentar', async () => {
    vi.mocked(replyToComment).mockResolvedValue({ ok: false, error: 'token expirado' });
    const id = seed();
    const res = await post(`/review/${id}/approve`, {});
    expect(res.status).toBe(502);
    expect(listReviewQueue()).toHaveLength(1);
    expect(listDecisions()).toHaveLength(0);
  });

  it('sin perfil de marca no se puede validar → 503 y no se envía', async () => {
    vi.mocked(getActiveBrand).mockImplementation(() => {
      throw new Error('sin brand.json');
    });
    const id = seed();
    const res = await post(`/review/${id}/approve`, {});
    expect(res.status).toBe(503);
    expect(replyToComment).not.toHaveBeenCalled();
  });

  it('la respuesta de error no filtra rutas ni stack', async () => {
    vi.mocked(getActiveBrand).mockImplementation(() => {
      throw new Error('ENOENT C:\\Users\\Usuario\\secret\\brand.json');
    });
    const id = seed();
    const text = await (await post(`/review/${id}/approve`, {})).text();
    expect(text).not.toMatch(/Usuario|secret|ENOENT/);
  });
});

describe('POST /review/:id/reject y /resolve', () => {
  it('rechazar registra el motivo y saca el item; no envía', async () => {
    const id = seed();
    const res = await post(`/review/${id}/reject`, { reason: 'no va con la marca' });
    expect(res.status).toBe(200);
    expect(replyToComment).not.toHaveBeenCalled();
    expect(listDecisions()[0]).toMatchObject({ outcome: 'rejected', reason: 'no va con la marca' });
  });

  it('rechazar un escalamiento → 409; un id inexistente → 404; motivo demasiado largo → 400', async () => {
    const esc = seed({ action: 'escalate', draft: undefined });
    expect((await post(`/review/${esc}/reject`, {})).status).toBe(409);
    expect((await post('/review/nope/reject', {})).status).toBe(404);
    const id = seed();
    expect((await post(`/review/${id}/reject`, { reason: 'x'.repeat(400) })).status).toBe(400);
  });

  it('"ya lo resolví" funciona con escalamientos y queda registrado como resuelto por fuera', async () => {
    const esc = seed({ action: 'escalate', draft: undefined });
    expect((await post(`/review/${esc}/resolve`)).status).toBe(200);
    expect(listDecisions()[0]?.outcome).toBe('handled-elsewhere');
    expect((await post(`/review/${esc}/resolve`)).status).toBe(404);
  });
});

describe('GET /status y /decisions', () => {
  const dec = (outcome: 'approved-as-is' | 'rejected'): void => {
    recordDecision({
      itemId: 'i',
      accountKey: 'b',
      handle: 'h',
      commentText: 'c',
      kind: 'banter',
      sarcasm: null,
      mode: 'thank',
      wouldHaveReplied: true,
      outcome,
    });
  };

  it('el estado trae la métrica de graduación con qué falta y por qué', async () => {
    dec('approved-as-is');
    dec('rejected');
    const s = (await (await fetch(`${base}/status`)).json()) as {
      graduation: {
        ready: boolean;
        sample: number;
        needed: number;
        blockers: string[];
        thresholds: { minSample: number };
      };
      decisions: { total: number; rejected: number; shadow: { sample: number } };
    };
    expect(s.graduation).toMatchObject({ ready: false, sample: 2, needed: s.graduation.thresholds.minSample - 2 });
    expect(s.graduation.blockers[0]).toMatch(/faltan revisiones/);
    expect(s.decisions).toMatchObject({ total: 2, rejected: 1 });
  });

  it('/decisions lista las más nuevas y valida el límite', async () => {
    dec('approved-as-is');
    dec('rejected');
    const r = (await (await fetch(`${base}/decisions?limit=1`)).json()) as {
      count: number;
      items: Array<{ outcome: string }>;
    };
    expect(r.count).toBe(1);
    expect(r.items[0]?.outcome).toBe('rejected');
    expect((await fetch(`${base}/decisions?limit=0`)).status).toBe(400);
    expect((await fetch(`${base}/decisions?limit=9999`)).status).toBe(400);
  });
});

describe('guard de admin en las rutas nuevas', () => {
  it('en producción sin clave: 503; con clave configurada: 403 sin ella y funciona con ella', async () => {
    const id = seed();
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('FEEDIA_ADMIN_KEY', '');
    expect((await post(`/review/${id}/approve`, {})).status).toBe(503);
    expect((await post(`/review/${id}/reject`, {})).status).toBe(503);
    expect((await fetch(`${base}/decisions`)).status).toBe(503);

    vi.stubEnv('FEEDIA_ADMIN_KEY', 'sekret');
    expect((await post(`/review/${id}/approve`, {})).status).toBe(403);
    expect(replyToComment).not.toHaveBeenCalled();

    const ok = await fetch(`${base}/review/${id}/approve`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-admin-key': 'sekret' },
      body: '{}',
    });
    expect(ok.status).toBe(200);
  });
});

describe('rutas del daemon', () => {
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
    opts: { params?: Record<string, string>; body?: unknown; query?: Record<string, string> } = {},
  ): Promise<{ status: number; body: unknown }> => {
    const route = buildControlRoutes().find((r) => r.method === method && r.pattern === pattern);
    if (!route) throw new Error(`ruta no registrada: ${method} ${pattern}`);
    const { res, result } = fakeRes();
    await route.handler({
      req: { headers: {} } as IncomingMessage,
      res,
      params: opts.params ?? {},
      query: opts.query ?? {},
      body: opts.body,
      rawBody: Buffer.alloc(0),
    } as RouteContext);
    return result();
  };

  it('registra approve, reject y decisions', () => {
    const routes = buildControlRoutes().map((r) => `${r.method} ${r.pattern}`);
    expect(routes).toEqual(
      expect.arrayContaining([
        'POST /api/comment-brain/review/:id/approve',
        'POST /api/comment-brain/review/:id/reject',
        'GET /api/comment-brain/decisions',
      ]),
    );
  });

  it('aprobar por el daemon envía y responde igual que Express', async () => {
    const id = seed();
    const r = await call('POST', '/api/comment-brain/review/:id/approve', { params: { id }, body: {} });
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({ ok: true, outcome: 'approved-as-is' });
    expect(replyToComment).toHaveBeenCalledTimes(1);
  });

  it('rechazar y listar decisiones por el daemon', async () => {
    const id = seed();
    expect(
      (await call('POST', '/api/comment-brain/review/:id/reject', { params: { id }, body: { reason: 'no' } })).status,
    ).toBe(200);
    const list = await call('GET', '/api/comment-brain/decisions', { query: { limit: '5' } });
    expect((list.body as { count: number }).count).toBe(1);
  });
});
