/**
 * Worker: contentForge
 *
 * Ejecuta tareas complejas de generación de contenido con IA en background,
 * principalmente brief-to-publish. El resultado se guarda en CalendarQueue
 * como draft/scheduled para que publishWorker haga la publicación real.
 */

import { createWorker } from './queue.js';
import type { Worker } from 'bullmq';
import { log } from '../agent/logger.js';
import { briefToPublish, type BriefRequest } from '../capabilities/pipelines/briefToPublish.js';
import { getBrandProfileForAccount } from '../database/accountBrands.js';
import { insertCalendarPost } from '../database/calendarQueue.js';
import { env } from '../config/index.js';

interface ContentForgePayload {
  task: 'brief-to-publish';
  accountId: string;
  brief: BriefRequest;
}

const isContentForgePayload = (payload: unknown): payload is ContentForgePayload =>
  typeof payload === 'object' &&
  payload !== null &&
  typeof (payload as ContentForgePayload).task === 'string' &&
  typeof (payload as ContentForgePayload).accountId === 'string' &&
  typeof (payload as ContentForgePayload).brief === 'object';

export const startContentForgeWorker = (): Worker | null =>
  createWorker('contentForge', async (job) => {
    const { payload } = job.data;
    if (!isContentForgePayload(payload)) {
      throw new Error('[contentForge] Payload inválido: se requiere task, accountId y brief');
    }

    const { accountId, brief } = payload;
    log.info(`[contentForge] Starting job ${job.id} for account ${accountId}`);
    await job.updateProgress(10);

    const brand = await getBrandProfileForAccount(accountId);
    if (!brand) {
      throw new Error(`[contentForge] BrandProfile no encontrado para account ${accountId}`);
    }
    await job.updateProgress(20);

    if (payload.task === 'brief-to-publish') {
      // Forzar modo borrador para que no publique directamente;
      // el publishWorker se encarga de la publicación programada.
      const outcome = await briefToPublish(brand, {
        ...brief,
        requiereAprobacionHumana: true,
        modoConfianza: false,
      });
      await job.updateProgress(70);

      if (!outcome.render?.ok && !outcome.video?.ok) {
        throw new Error(
          `[contentForge] No se pudo renderizar contenido: ${outcome.render?.error ?? outcome.video?.error ?? 'sin asset'}`,
        );
      }

      const mediaUrls = outcome.render?.exportUrls?.length
        ? outcome.render.exportUrls
        : outcome.video?.videoUrl
          ? [outcome.video.videoUrl]
          : [];

      const caption = outcome.publicacion?.ok
        ? (outcome.caption?.media ?? '')
        : `${outcome.caption?.media ?? ''}\n\n${outcome.hashtagsFinal.join(' ')}`;

      const post = await insertCalendarPost({
        accountId,
        format: brief.formato,
        caption,
        mediaUrls,
        firstComment: outcome.caption?.primerComentarioRecomendado,
        status: brief.scheduledAt ? 'scheduled' : 'draft',
        scheduledAt: brief.scheduledAt,
        metadata: {
          brief,
          hashtags: outcome.hashtagsFinal,
          hashtagsBanned: outcome.hashtagsBaneados,
          safety: outcome.safety,
          qualityGate: outcome.qualityGate,
          visualQAReal: outcome.visualQAReal,
          dryRun: env.dryRun,
        },
      });
      await job.updateProgress(100);

      log.info(`[contentForge] Job ${job.id} done — post ${post.id} creado (${post.status})`);
      return {
        ok: true,
        task: payload.task,
        postId: post.id,
        status: post.status,
        format: post.format,
      };
    }

    throw new Error(`[contentForge] task no soportado: ${payload.task}`);
  });
