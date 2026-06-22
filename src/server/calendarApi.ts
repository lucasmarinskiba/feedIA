/**
 * Calendar API — endpoints REST para gestionar posts programados/publicados.
 *
 * Integra CalendarQueue + ContentForge worker + Publish worker.
 */

import { json, type RouteDefinition } from './http.js';
import {
  listCalendarPostsByAccount,
  getCalendarPost,
  cancelCalendarPost,
  type CalendarPostStatus,
} from '../database/calendarQueue.js';
import { getBrandProfileForAccount } from '../database/accountBrands.js';
import { addJob, getJobStatus } from '../workers/queue.js';
import type { BriefRequest } from '../capabilities/pipelines/briefToPublish.js';
import { log } from '../agent/logger.js';

const isString = (v: unknown): v is string => typeof v === 'string';

const isBriefRequest = (v: unknown): v is BriefRequest =>
  typeof v === 'object' &&
  v !== null &&
  isString((v as BriefRequest).idea) &&
  ((v as BriefRequest).formato === 'reel' || (v as BriefRequest).formato === 'carrusel');

const validStatus = (v: unknown): v is CalendarPostStatus =>
  v === 'draft' || v === 'scheduled' || v === 'publishing' || v === 'published' || v === 'failed' || v === 'cancelled';

export const buildCalendarRoutes = (): RouteDefinition[] => [
  {
    method: 'GET',
    pattern: '/api/calendar/posts',
    handler: async ({ res, query }): Promise<void> => {
      const accountId = query.accountId;
      if (!isString(accountId)) {
        json(res, 400, { error: 'accountId requerido' });
        return;
      }
      const status = validStatus(query.status) ? query.status : undefined;
      const from = isString(query.from) ? query.from : undefined;
      const to = isString(query.to) ? query.to : undefined;
      const limit = isString(query.limit) ? Number(query.limit) : 100;
      const posts = await listCalendarPostsByAccount(accountId, { status, from, to, limit });
      json(res, 200, { ok: true, posts });
    },
  },
  {
    method: 'GET',
    pattern: '/api/calendar/posts/:id',
    handler: async ({ res, params }): Promise<void> => {
      const post = await getCalendarPost(params.id ?? '');
      if (!post) {
        json(res, 404, { error: 'Post no encontrado' });
        return;
      }
      json(res, 200, { ok: true, post });
    },
  },
  {
    method: 'POST',
    pattern: '/api/calendar/schedule',
    handler: async ({ res, body }): Promise<void> => {
      if (!body || typeof body !== 'object') {
        json(res, 400, { error: 'Body requerido' });
        return;
      }
      const { accountId, brief } = body as { accountId?: unknown; brief?: unknown };
      if (!isString(accountId)) {
        json(res, 400, { error: 'accountId requerido' });
        return;
      }
      if (!isBriefRequest(brief)) {
        json(res, 400, { error: 'brief inválido' });
        return;
      }
      const brand = await getBrandProfileForAccount(accountId);
      if (!brand) {
        json(res, 404, { error: 'Cuenta no encontrada o sin BrandProfile' });
        return;
      }
      const result = await addJob({
        name: 'contentForge',
        payload: { task: 'brief-to-publish', accountId, brief },
        accountId,
      });
      if (!result.ok) {
        json(res, 500, { error: 'No se pudo encolar la tarea', details: result.error });
        return;
      }
      log.info(`[calendarApi] schedule encolado: ${result.id} para account ${accountId}`);
      json(res, 202, { ok: true, jobId: result.id, status: 'queued' });
    },
  },
  {
    method: 'POST',
    pattern: '/api/calendar/publish-now',
    handler: async ({ res, body }): Promise<void> => {
      if (!body || typeof body !== 'object') {
        json(res, 400, { error: 'Body requerido' });
        return;
      }
      const { accountId, brief } = body as { accountId?: unknown; brief?: unknown };
      if (!isString(accountId)) {
        json(res, 400, { error: 'accountId requerido' });
        return;
      }
      if (!isBriefRequest(brief)) {
        json(res, 400, { error: 'brief inválido' });
        return;
      }
      const brand = await getBrandProfileForAccount(accountId);
      if (!brand) {
        json(res, 404, { error: 'Cuenta no encontrada o sin BrandProfile' });
        return;
      }
      const result = await addJob({
        name: 'contentForge',
        payload: { task: 'brief-to-publish', accountId, brief },
        accountId,
      });
      if (!result.ok) {
        json(res, 500, { error: 'No se pudo encolar la tarea', details: result.error });
        return;
      }
      json(res, 202, { ok: true, jobId: result.id, status: 'queued' });
    },
  },
  {
    method: 'POST',
    pattern: '/api/calendar/posts/:id/cancel',
    handler: async ({ res, params }): Promise<void> => {
      const post = await getCalendarPost(params.id ?? '');
      if (!post) {
        json(res, 404, { error: 'Post no encontrado' });
        return;
      }
      if (post.status === 'published') {
        json(res, 400, { error: 'No se puede cancelar un post ya publicado' });
        return;
      }
      await cancelCalendarPost(post.id);
      json(res, 200, { ok: true, postId: post.id, status: 'cancelled' });
    },
  },
  {
    method: 'GET',
    pattern: '/api/calendar/jobs/:queue/:id',
    handler: async ({ res, params }): Promise<void> => {
      const queueName = params.queue;
      const jobId = params.id;
      if (!queueName || !jobId) {
        json(res, 400, { error: 'queue e id requeridos' });
        return;
      }
      if (
        queueName !== 'socialPublish' &&
        queueName !== 'contentForge' &&
        queueName !== 'videoGenerate' &&
        queueName !== 'batchAudit'
      ) {
        json(res, 400, { error: 'Cola inválida' });
        return;
      }
      const status = await getJobStatus(queueName, jobId);
      if (!status) {
        json(res, 404, { error: 'Job no encontrado' });
        return;
      }
      json(res, 200, { ok: true, status });
    },
  },
];
