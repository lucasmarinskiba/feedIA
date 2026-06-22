/**
 * Worker: socialPublish
 *
 * Publica contenido en Instagram en background usando la cola BullMQ.
 * Lee el post desde CalendarQueue, ejecuta publishToInstagram, actualiza
 * estado y registra reintentos con exponential backoff.
 */

import { createWorker } from './queue.js';
import type { Worker } from 'bullmq';
import { log } from '../agent/logger.js';
import { publishToInstagram } from '../integrations/meta.js';
import { getCalendarPost, markPublishing, markPublished, markFailed } from '../database/calendarQueue.js';
import { env } from '../config/index.js';

interface PublishPayload {
  postId: string;
  accountId: string;
}

const isPublishPayload = (payload: unknown): payload is PublishPayload =>
  typeof payload === 'object' &&
  payload !== null &&
  typeof (payload as PublishPayload).postId === 'string' &&
  typeof (payload as PublishPayload).accountId === 'string';

export const startPublishWorker = (): Worker | null =>
  createWorker('socialPublish', async (job) => {
    const { payload } = job.data;
    if (!isPublishPayload(payload)) {
      throw new Error('[socialPublish] Payload inválido: se requiere postId y accountId');
    }

    const { postId, accountId } = payload;
    log.info(`[socialPublish] Starting job ${job.id} for account ${accountId}, post ${postId}`);
    await job.updateProgress(10);

    const post = await getCalendarPost(postId);
    if (!post) {
      throw new Error(`[socialPublish] Post no encontrado: ${postId}`);
    }
    if (post.accountId !== accountId) {
      throw new Error(`[socialPublish] Account mismatch: ${accountId} vs ${post.accountId}`);
    }
    if (post.status === 'published') {
      log.info(`[socialPublish] Post ${postId} ya publicado, skip`);
      return { ok: true, skipped: true, postId };
    }
    if (post.status === 'cancelled') {
      log.info(`[socialPublish] Post ${postId} cancelado, skip`);
      return { ok: true, skipped: true, postId };
    }

    if (post.mediaUrls.length === 0) {
      await markFailed(postId, 'No hay media URLs para publicar');
      throw new Error('[socialPublish] No media URLs');
    }

    await markPublishing(postId);
    await job.updateProgress(40);

    const format = post.format === 'carrusel' ? 'carrusel' : post.format === 'historia' ? 'historia' : 'reel';

    if (env.dryRun) {
      log.info(`[DRY_RUN] socialPublish ${postId}: publicaría ${format} con ${post.mediaUrls.length} medios`);
      await markPublished(postId, `dry-run-${Date.now()}`);
      await job.updateProgress(100);
      return {
        ok: true,
        platform: 'instagram',
        postId,
        publishedAt: new Date().toISOString(),
        metaPostId: `dry-run-${Date.now()}`,
      };
    }

    try {
      const result = await publishToInstagram({
        format,
        caption: post.caption ?? '',
        mediaUrls: post.mediaUrls,
        scheduledAt: post.scheduledAt,
        firstComment: post.firstComment,
        accountId,
      });

      await job.updateProgress(80);

      if (!result.ok) {
        await markFailed(postId, result.error ?? 'Error desconocido al publicar');
        throw new Error(`[socialPublish] publishToInstagram failed: ${result.error ?? 'unknown'}`);
      }

      await markPublished(postId, result.postId ?? `meta-${Date.now()}`);
      await job.updateProgress(100);

      log.info(`[socialPublish] Job ${job.id} published to Instagram`, {
        postId,
        metaPostId: result.postId,
      });

      return {
        ok: true,
        platform: 'instagram',
        postId,
        publishedAt: new Date().toISOString(),
        metaPostId: result.postId,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await markFailed(postId, msg);
      throw err;
    }
  });
