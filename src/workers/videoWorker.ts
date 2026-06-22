/**
 * Worker: videoGenerate
 *
 * Procesa generación de reels/videos en background.
 * En modo real llamaría a Replicate/FFmpeg; en modo demo simula el trabajo.
 */

import { createWorker } from './queue.js';
import type { Worker } from 'bullmq';
import { log } from '../agent/logger.js';

export const startVideoWorker = (): Worker | null =>
  createWorker('videoGenerate', async (job): Promise<unknown> => {
    const { payload } = job.data;
    log.info(`[videoGenerate] Starting job ${job.id} for account ${payload.accountId}`);

    await job.updateProgress(10);
    // 1. Validar input
    const topic = (payload.topic as string) || 'reel';
    await job.updateProgress(30);

    // 2. Generar script/assets (stub; reemplazar por llamada real)
    await new Promise((resolve) => setTimeout(resolve, 2000));
    await job.updateProgress(70);

    // 3. Renderizar video (stub)
    await new Promise((resolve) => setTimeout(resolve, 2000));
    await job.updateProgress(100);

    log.info(`[videoGenerate] Job ${job.id} done`);
    return {
      ok: true,
      videoUrl: `https://cdn.feedia.ai/videos/${job.id}.mp4`,
      topic,
      durationSec: 15,
    };
  });
