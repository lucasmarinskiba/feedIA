/**
 * Worker: batchAudit
 *
 * Ejecuta audits completos de contenido, competidores o marca en background.
 */

import { createWorker } from './queue.js';
import type { Worker } from 'bullmq';
import { log } from '../agent/logger.js';

export const startAuditWorker = (): Worker | null =>
  createWorker('batchAudit', async (job): Promise<unknown> => {
    const { payload } = job.data;
    log.info(`[batchAudit] Starting job ${job.id} for account ${payload.accountId}`);

    await job.updateProgress(10);
    const auditType = (payload.auditType as string) || 'content';

    // Stub: reemplazar por lógica real de audit
    await new Promise((resolve) => setTimeout(resolve, 2000));
    await job.updateProgress(50);
    await new Promise((resolve) => setTimeout(resolve, 2000));
    await job.updateProgress(100);

    log.info(`[batchAudit] Job ${job.id} completed`);
    return {
      ok: true,
      auditType,
      score: 85,
      recommendations: ['Mejorar hooks', 'Ajustar horarios de publicación'],
    };
  });
