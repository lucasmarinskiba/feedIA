import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import express from 'express';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../src/agent/bus.js', () => ({ emit: vi.fn() }));

import commentBrainRoutes from '../../../src/api/comment-brain-routes.js';
import { configureReviewStore, enqueueReview } from '../../../src/capabilities/commentBrain/reviewQueue.js';
import { cls } from './helpers.js';

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
});

const seed = (over: Partial<Parameters<typeof enqueueReview>[0]> = {}): string =>
  enqueueReview({
    accountKey: 'brand-test',
    handle: 'vecina_23',
    commentText: 'Excelente servicio, solo tardaron 3 semanas 👏',
    action: 'draft-for-review',
    mode: 'empathize-resolve',
    draft: 'Lamentamos la demora, te escribimos por DM',
    reasons: ['riesgo medio'],
    classification: cls({ kind: 'complaint' }),
    wouldHaveReplied: false,
    ...over,
  }).id;

describe('GET /status', () => {
  it('informa el modo activo (suggest por defecto) y el resumen de la cola', async () => {
    seed({ wouldHaveReplied: true });
    const res = await fetch(`${base}/status`);
    const body = (await res.json()) as {
      ok: boolean;
      enabled: boolean;
      autonomy: string;
      queue: { total: number; wouldHaveReplied: number };
    };

    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.autonomy).toBe('suggest');
    expect(body.queue).toMatchObject({ total: 1, wouldHaveReplied: 1 });
  });
});

describe('GET /review', () => {
  it('lista con comentario, borrador y motivos, y filtra por acción', async () => {
    seed({ handle: 'a' });
    seed({ handle: 'b', action: 'escalate', draft: undefined });

    const all = (await (await fetch(`${base}/review`)).json()) as {
      count: number;
      items: Array<{ handle: string; draft?: string }>;
    };
    expect(all.count).toBe(2);
    expect(all.items[1]).toMatchObject({ handle: 'a', draft: 'Lamentamos la demora, te escribimos por DM' });

    const only = (await (await fetch(`${base}/review?action=escalate`)).json()) as { items: Array<{ handle: string }> };
    expect(only.items.map((i) => i.handle)).toEqual(['b']);
  });

  it('rechaza filtros inválidos con 400', async () => {
    expect((await fetch(`${base}/review?action=borrar-todo`)).status).toBe(400);
    expect((await fetch(`${base}/review?limit=99999`)).status).toBe(400);
  });
});

describe('POST /review/:id/resolve', () => {
  it('saca el item de la cola; un id inexistente da 404', async () => {
    const id = seed();
    const ok = await fetch(`${base}/review/${id}/resolve`, { method: 'POST' });
    expect(ok.status).toBe(200);

    const after = (await (await fetch(`${base}/review`)).json()) as { count: number };
    expect(after.count).toBe(0);
    expect((await fetch(`${base}/review/${id}/resolve`, { method: 'POST' })).status).toBe(404);
  });
});

describe('guard de producción', () => {
  it('en producción SIN FEEDIA_ADMIN_KEY falla cerrado (503) y no expone nada', async () => {
    seed();
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('FEEDIA_ADMIN_KEY', '');

    for (const [method, path] of [
      ['GET', '/status'],
      ['GET', '/review'],
      ['POST', '/review/x/resolve'],
    ] as const) {
      const res = await fetch(`${base}${path}`, { method });
      expect(res.status, `${method} ${path}`).toBe(503);
      expect(await res.json()).toEqual({ error: 'admin-key-not-configured' });
    }
  });

  it('con FEEDIA_ADMIN_KEY el router VALIDA la clave: sin ella 403 y con ella 200', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('FEEDIA_ADMIN_KEY', 'k');
    expect((await fetch(`${base}/status`)).status).toBe(403);
    expect((await fetch(`${base}/status`, { headers: { 'x-admin-key': 'equivocada' } })).status).toBe(403);
    expect((await fetch(`${base}/status`, { headers: { 'x-admin-key': 'k' } })).status).toBe(200);
  });
});
