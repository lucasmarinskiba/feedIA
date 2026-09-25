/**
 * /api/engagement/* used to be mounted with NO auth at all — publicly
 * reachable, letting anyone trigger automated like/comment/follow/
 * story-view on third-party Instagram accounts (real cost + real ban risk
 * for the connected account, since getInstagramToken() ignores accountId
 * and always resolves the first connected account). Two independent fixes,
 * both covered here: the underlying execution is now a hard no-op
 * (computer-use-orchestrator.test.ts), and this mount now requires the
 * admin key like every other sensitive route in this codebase.
 */
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import express from 'express';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import engagementRoutes from '../../src/api/engagement-routes.js';
import { checkAdminAccess } from '../../src/api/controlCore.js';

let server: Server;
let base: string;

beforeAll(async () => {
  const app = express();
  app.use(express.json());
  app.use('/api/engagement', (req, res, next) => {
    const denied = checkAdminAccess(req.headers);
    if (denied) {
      res.status(denied.status).json(denied.body);
      return;
    }
    next();
  });
  app.use('/api/engagement', engagementRoutes);
  await new Promise<void>((resolve) => {
    server = app.listen(0, '127.0.0.1', resolve);
  });
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/engagement`;
});
afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

beforeEach(() => {
  vi.unstubAllEnvs();
});

describe('POST /api/engagement/execute', () => {
  it('en producción sin FEEDIA_ADMIN_KEY: falla cerrado (era público antes de este fix)', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('FEEDIA_ADMIN_KEY', '');
    const res = await fetch(`${base}/execute`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ accountId: 'acct-1', action: 'follow', targetAccountId: 'alguien' }),
    });
    expect(res.status).toBe(503);
  });

  it('con acceso (dev), la acción de engagement igual queda deshabilitada — nunca ejecuta', async () => {
    const res = await fetch(`${base}/execute`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ accountId: 'acct-1', action: 'like', targetPostId: 'xyz' }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean; error?: string };
    expect(body.ok).toBe(false);
    expect(body.error).toMatch(/deshabilitad/i);
  });

  it('sin accountId/action → 400', async () => {
    const res = await fetch(`${base}/execute`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/engagement/schedule-routine', () => {
  it('nunca ejecuta ninguna acción (rutina deshabilitada)', async () => {
    const res = await fetch(`${base}/schedule-routine`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ accountId: 'acct-1' }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { executed: number; skipped: number; errors: number };
    expect(body.executed).toBe(0);
  });
});
