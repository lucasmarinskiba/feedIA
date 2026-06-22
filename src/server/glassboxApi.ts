/**
 * GlassBox API Routes
 * ─────────────────────────────────────────────────────────────────────────
 * Endpoints REST y SSE para supervisión en tiempo real del agente.
 */

import type { RouteDefinition } from './http.js';
import { json } from './http.js';
import type { ServerResponse } from 'node:http';
import {
  getStatus,
  getMode,
  setMode,
  pause,
  resume,
  getPendingActions,
  getAction,
  getActionHistory,
  approveAction,
  rejectAction,
  modifyAction,
  approveAllPending,
  rejectAllPending,
  type GlassBoxMode,
} from '../glassbox/index.js';
import { subscribeActionStream } from '../glassbox/index.js';
import { buildCostAttributionDashboard } from '../capabilities/consumption/costAttribution.js';
import { getVideoUsage, getTotalVideoCostUsd } from '../capabilities/videoEngine/usageTracker.js';
import { getJobStatus } from '../workers/queue.js';

const isValidMode = (m: string): m is GlassBoxMode => m === 'autonomous' || m === 'supervised' || m === 'paused';

export const buildGlassBoxRoutes = (): RouteDefinition[] => [
  {
    method: 'GET',
    pattern: '/api/glassbox/status',
    handler: ({ res }): void => {
      json(res, 200, getStatus());
    },
  },
  {
    method: 'POST',
    pattern: '/api/glassbox/mode',
    handler: ({ res, body }): void => {
      const b = body as Record<string, unknown> | null;
      const mode = typeof b?.['mode'] === 'string' ? b['mode'] : '';
      if (!isValidMode(mode)) {
        json(res, 400, { error: 'Modo inválido. Usar: autonomous, supervised, paused' });
        return;
      }
      setMode(mode);
      json(res, 200, { mode: getMode(), message: `Modo cambiado a ${mode}` });
    },
  },
  {
    method: 'POST',
    pattern: '/api/glassbox/pause',
    handler: ({ res }): void => {
      pause();
      json(res, 200, { mode: getMode(), message: 'GlassBox pausado' });
    },
  },
  {
    method: 'POST',
    pattern: '/api/glassbox/resume',
    handler: ({ res }): void => {
      resume();
      json(res, 200, { mode: getMode(), message: 'GlassBox reanudado en modo supervisado' });
    },
  },
  {
    method: 'GET',
    pattern: '/api/glassbox/pending',
    handler: ({ res }): void => {
      json(res, 200, { pending: getPendingActions() });
    },
  },
  {
    method: 'GET',
    pattern: '/api/glassbox/history',
    handler: ({ res, query }): void => {
      const limit = Math.min(200, Math.max(1, Number(query['limit'] ?? 50)));
      json(res, 200, { history: getActionHistory(limit) });
    },
  },
  {
    method: 'GET',
    pattern: '/api/glassbox/actions/:id',
    handler: ({ res, params }): void => {
      const action = getAction(params['id'] ?? '');
      if (!action) {
        json(res, 404, { error: 'Acción no encontrada' });
        return;
      }
      json(res, 200, action);
    },
  },
  {
    method: 'POST',
    pattern: '/api/glassbox/actions/:id/approve',
    handler: ({ res, params, body }): void => {
      const id = params['id'] ?? '';
      const note =
        typeof (body as Record<string, unknown> | null)?.['note'] === 'string'
          ? String((body as Record<string, unknown>)['note'])
          : undefined;
      const ok = approveAction(id, note);
      if (!ok) {
        json(res, 404, { error: 'Acción no encontrada o ya resuelta' });
        return;
      }
      json(res, 200, { approved: true, actionId: id });
    },
  },
  {
    method: 'POST',
    pattern: '/api/glassbox/actions/:id/reject',
    handler: ({ res, params, body }): void => {
      const id = params['id'] ?? '';
      const reason =
        typeof (body as Record<string, unknown> | null)?.['reason'] === 'string'
          ? String((body as Record<string, unknown>)['reason'])
          : undefined;
      const ok = rejectAction(id, reason);
      if (!ok) {
        json(res, 404, { error: 'Acción no encontrada o ya resuelta' });
        return;
      }
      json(res, 200, { rejected: true, actionId: id });
    },
  },
  {
    method: 'POST',
    pattern: '/api/glassbox/actions/:id/modify',
    handler: ({ res, params, body }): void => {
      const id = params['id'] ?? '';
      const payload = (body as Record<string, unknown> | null)?.['payload'];
      if (!payload || typeof payload !== 'object') {
        json(res, 400, { error: 'Se requiere payload en el body' });
        return;
      }
      const ok = modifyAction(id, payload as Record<string, unknown>);
      if (!ok) {
        json(res, 404, { error: 'Acción no encontrada o ya resuelta' });
        return;
      }
      json(res, 200, { modified: true, actionId: id });
    },
  },
  {
    method: 'POST',
    pattern: '/api/glassbox/actions/approve-all',
    handler: ({ res, body }): void => {
      const note =
        typeof (body as Record<string, unknown> | null)?.['note'] === 'string'
          ? String((body as Record<string, unknown>)['note'])
          : undefined;
      const result = approveAllPending(note);
      json(res, 200, result);
    },
  },
  {
    method: 'POST',
    pattern: '/api/glassbox/actions/reject-all',
    handler: ({ res, body }): void => {
      const reason =
        typeof (body as Record<string, unknown> | null)?.['reason'] === 'string'
          ? String((body as Record<string, unknown>)['reason'])
          : undefined;
      const result = rejectAllPending(reason);
      json(res, 200, result);
    },
  },
  {
    method: 'GET',
    pattern: '/api/glassbox/stream',
    handler: ({ res }): void => {
      subscribeActionStream(res as ServerResponse);
    },
  },
  {
    method: 'GET',
    pattern: '/api/glassbox/costs',
    handler: ({ res }): void => {
      const dashboard = buildCostAttributionDashboard();
      const videoTotal = getTotalVideoCostUsd();
      json(res, 200, { ...dashboard, videoTotal });
    },
  },
  {
    method: 'GET',
    pattern: '/api/glassbox/costs/video',
    handler: ({ res, query }): void => {
      const brandName = query['brandName'];
      const since = query['since'];
      const usage = getVideoUsage({ brandName, since });
      const total = getTotalVideoCostUsd({ brandName, since });
      json(res, 200, { total, count: usage.length, usage: usage.slice(-100) });
    },
  },
  {
    method: 'GET',
    pattern: '/api/glassbox/post-production/:jobId',
    handler: async ({ res, params }): Promise<void> => {
      const jobId = params['jobId'] ?? '';
      const status = await getJobStatus('videoPostProduction', jobId);
      if (!status) {
        json(res, 404, { error: 'Job no encontrado o colas deshabilitadas' });
        return;
      }
      json(res, 200, status);
    },
  },
];
