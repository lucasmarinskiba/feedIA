/**
 * Queue API — encolar jobs en BullMQ desde Vercel Functions.
 *
 * No ejecuta workers aquí; solo encola y consulta estado.
 * Requiere REDIS_URL con conexión TCP.
 */

import { Queue } from 'bullmq';

const redisUrl = process.env.REDIS_URL;
const connection = redisUrl
  ? {
      url: redisUrl,
      tls: redisUrl.startsWith('rediss://')
        ? { rejectUnauthorized: (process.env.REDIS_TLS_REJECT_UNAUTHORIZED ?? '0') !== '0' }
        : undefined,
    }
  : undefined;

const VALID_JOBS = ['videoGenerate', 'socialPublish', 'batchAudit', 'contentForge'];

const queues = {};

const getQueue = (name) => {
  if (!redisUrl) return null;
  if (!queues[name]) {
    queues[name] = new Queue(name, {
      connection,
      defaultJobOptions: {
        attempts: Number(process.env.MAX_JOB_ATTEMPTS) || 3,
        backoff: { type: 'exponential', delay: 5000 },
      },
    });
  }
  return queues[name];
};

export const isQueueEnabled = () => Boolean(redisUrl && (process.env.WORKERS_ENABLED ?? 'true') !== 'false');

export const enqueueJob = async (body) => {
  const { name, payload, accountId, userId } = body || {};
  if (!isQueueEnabled()) return { ok: false, error: 'Queue disabled: REDIS_URL not configured' };
  if (!VALID_JOBS.includes(name)) return { ok: false, error: `Invalid job name. Valid: ${VALID_JOBS.join(', ')}` };

  const queue = getQueue(name);
  try {
    const job = await queue.add(
      name,
      { name, payload, accountId, userId },
      {
        jobId: `${name}:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`,
      },
    );
    return { ok: true, id: job.id, name };
  } catch (err) {
    return { ok: false, error: err.message };
  }
};

export const getJobStatus = async (name, id) => {
  if (!isQueueEnabled()) return { ok: false, error: 'Queue disabled' };
  const queue = getQueue(name);
  try {
    const job = await queue.getJob(id);
    if (!job) return { ok: false, error: 'Job not found' };
    const state = await job.getState();
    return {
      ok: true,
      status: {
        id: job.id,
        state,
        progress: job.progress,
        result: job.returnvalue,
        error: job.failedReason,
      },
    };
  } catch (err) {
    return { ok: false, error: err.message };
  }
};
