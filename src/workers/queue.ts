/**
 * BullMQ Queue Configuration
 *
 * FeedIA usa colas de trabajo para tareas pesadas que no deben bloquear
 * el request HTTP en Vercel Functions:
 *  - videoGenerate
 *  - socialPublish
 *  - batchAudit
 *  - contentForge (tareas complejas de IA)
 *
 * Requiere REDIS_URL con conexión TCP (BullMQ no usa REST).
 */

import { Queue, Worker, Job } from 'bullmq';
import { log } from '../agent/logger.js';

import type { ConnectionOptions } from 'bullmq';

const redisUrl = process.env.REDIS_URL;

export const isQueueEnabled = (): boolean => Boolean(redisUrl && (process.env.WORKERS_ENABLED ?? 'true') !== 'false');

const buildConnection = (): ConnectionOptions | undefined => {
  if (!redisUrl) return undefined;
  return {
    url: redisUrl,
    tls: redisUrl.startsWith('rediss://')
      ? { rejectUnauthorized: (process.env.REDIS_TLS_REJECT_UNAUTHORIZED ?? '0') !== '0' }
      : undefined,
  };
};

export type JobName = 'videoGenerate' | 'videoPostProduction' | 'socialPublish' | 'batchAudit' | 'contentForge';

export interface FeediaJob {
  name: JobName;
  payload: Record<string, unknown>;
  accountId?: string;
  userId?: string;
  metadata?: Record<string, unknown>;
}

const queues: Record<JobName, Queue | null> = {
  videoGenerate: null,
  videoPostProduction: null,
  socialPublish: null,
  batchAudit: null,
  contentForge: null,
};

export const getQueue = (name: JobName): Queue | null => {
  if (!isQueueEnabled()) return null;
  if (!queues[name]) {
    queues[name] = new Queue(name, {
      connection: buildConnection()!,
      defaultJobOptions: {
        attempts: Number(process.env.MAX_JOB_ATTEMPTS) || 3,
        backoff: { type: 'exponential', delay: 5000 },
      },
    });
  }
  return queues[name];
};

export const addJob = async (job: FeediaJob): Promise<{ ok: boolean; id?: string; error?: string }> => {
  const queue = getQueue(job.name);
  if (!queue) return { ok: false, error: 'Queues disabled: REDIS_URL not configured' };
  try {
    const bullJob = await queue.add(job.name, job, {
      jobId: `${job.name}:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`,
    });
    return { ok: true, id: bullJob.id as string };
  } catch (err) {
    log.error(`[Queue] Failed to add ${job.name}: ${(err as Error).message}`);
    return { ok: false, error: (err as Error).message };
  }
};

export const getJobStatus = async (
  name: JobName,
  id: string,
): Promise<{ id: string; state: string; progress?: number; result?: unknown; error?: string } | null> => {
  const queue = getQueue(name);
  if (!queue) return null;
  const job = await queue.getJob(id);
  if (!job) return null;
  const state = await job.getState();
  return {
    id: job.id as string,
    state,
    progress: job.progress as number | undefined,
    result: job.returnvalue,
    error: job.failedReason,
  };
};

export const closeQueues = async (): Promise<void> => {
  for (const q of Object.values(queues)) {
    if (q) await q.close();
  }
};

// Worker factory para procesar jobs. Se usa en el proceso largo (Render/Railway/Fly).
export const createWorker = (name: JobName, processor: (job: Job<FeediaJob>) => Promise<unknown>): Worker | null => {
  if (!isQueueEnabled()) {
    log.warn(`[Worker] ${name} disabled: REDIS_URL not configured`);
    return null;
  }
  const worker = new Worker(name, processor, {
    connection: buildConnection()!,
    concurrency: Number(process.env.WORKER_CONCURRENCY) || 3,
  });
  worker.on('completed', (job) => log.info(`[Worker] ${name}:${job.id} completed`));
  worker.on('failed', (job, err) => log.error(`[Worker] ${name}:${job?.id} failed: ${err.message}`));
  return worker;
};
