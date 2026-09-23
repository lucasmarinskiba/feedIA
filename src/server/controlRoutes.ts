/**
 * Rutas del daemon para el panel de bots y la cola del Comment Brain.
 *
 * El daemon es donde corren los bots (scheduler + webhook de Meta) y donde la
 * SPA local consume la API. Toda la lógica está en src/api/controlCore.ts; acá
 * solo se adapta al formato de rutas del daemon y se aplica el guard de admin.
 */

import {
  brainApprove,
  brainDecisions,
  brainReject,
  brainResolve,
  brainReview,
  brainStatus,
  checkAdminAccess,
  listBots,
  outboxCancel,
  outboxList,
  outboxRetry,
  setBot,
  setMaster,
  type CoreResponse,
} from '../api/controlCore.js';
import { json, type RouteContext, type RouteDefinition, type RouteHandler } from './http.js';

const guarded =
  (run: (ctx: RouteContext) => CoreResponse | Promise<CoreResponse>): RouteHandler =>
  async (ctx): Promise<void> => {
    const denied = checkAdminAccess(ctx.req.headers);
    const response = denied ?? (await run(ctx));
    json(ctx.res, response.status, response.body);
  };

const respond =
  (run: (ctx: RouteContext) => CoreResponse | Promise<CoreResponse>): RouteHandler =>
  async (ctx): Promise<void> => {
    const response = await run(ctx);
    json(ctx.res, response.status, response.body);
  };

export const buildControlRoutes = (): RouteDefinition[] => [
  // /api/bots ya no pasa por `guarded` (admin-key-only) — controlCore.listBots/setBot/setMaster
  // resuelven el gate por plan internamente (ver resolveCaller); una admin key válida sigue
  // funcionando como bypass, ahora evaluada adentro en vez de acá afuera.
  { method: 'GET', pattern: '/api/bots', handler: respond((ctx) => listBots(ctx.req.headers)) },
  { method: 'POST', pattern: '/api/bots/master', handler: respond((ctx) => setMaster(ctx.req.headers, ctx.body)) },
  {
    method: 'POST',
    pattern: '/api/bots/:id/state',
    handler: respond((ctx) => setBot(ctx.params['id'] ?? '', ctx.req.headers, ctx.body)),
  },
  { method: 'GET', pattern: '/api/comment-brain/status', handler: guarded(() => brainStatus()) },
  { method: 'GET', pattern: '/api/comment-brain/review', handler: guarded((ctx) => brainReview(ctx.query)) },
  { method: 'GET', pattern: '/api/comment-brain/decisions', handler: guarded((ctx) => brainDecisions(ctx.query)) },
  {
    method: 'POST',
    pattern: '/api/comment-brain/review/:id/approve',
    handler: guarded((ctx) => brainApprove(ctx.params['id'] ?? '', ctx.body)),
  },
  {
    method: 'POST',
    pattern: '/api/comment-brain/review/:id/reject',
    handler: guarded((ctx) => brainReject(ctx.params['id'] ?? '', ctx.body)),
  },
  {
    method: 'POST',
    pattern: '/api/comment-brain/review/:id/resolve',
    handler: guarded((ctx) => brainResolve(ctx.params['id'] ?? '')),
  },
  { method: 'GET', pattern: '/api/comment-brain/outbox', handler: guarded((ctx) => outboxList(ctx.query)) },
  {
    method: 'POST',
    pattern: '/api/comment-brain/outbox/:id/retry',
    handler: guarded((ctx) => outboxRetry(ctx.params['id'] ?? '')),
  },
  {
    method: 'POST',
    pattern: '/api/comment-brain/outbox/:id/cancel',
    handler: guarded((ctx) => outboxCancel(ctx.params['id'] ?? '')),
  },
];
