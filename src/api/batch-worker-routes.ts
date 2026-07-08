/**
 * Batch Expansion Worker Routes
 * Queue-based batch expansion with progress tracking
 */

import { Router, Request, Response } from 'express';
import { log } from '../agent/logger.js';
import { batchExpansionWorker } from '../services/batch-expansion-worker.js';
import type { BrandProfile } from '../config/types.js';

const router = Router();

/**
 * POST /api/batch/expand-all
 * Queue expansion for all batches: video (3,450) + image (12,870) + stories (10,000)
 * Returns: array of job IDs
 */
router.post('/expand-all', async (req: Request, res: Response) => {
  try {
    const brand = (req as any).brand as BrandProfile;

    const videoJobId = await batchExpansionWorker.queueBatchExpansion('batch-90');
    const imageJobId = await batchExpansionWorker.queueBatchExpansion('batch-62');
    const storiesJobId = await batchExpansionWorker.queueBatchExpansion('batch-97');

    log.info('[BatchWorker] All batches queued', {
      videoJobId,
      imageJobId,
      storiesJobId,
      brand: brand?.name,
    });

    res.json({
      status: 'queued',
      jobs: [
        { jobId: videoJobId, batch: 'batch-90', type: 'video', prompts: 3450 },
        { jobId: imageJobId, batch: 'batch-62', type: 'image', prompts: 12870 },
        { jobId: storiesJobId, batch: 'batch-97', type: 'stories', prompts: 10000 },
      ],
      totalPrompts: 26320,
      expectedExpansions: 315840,
      message: 'Batch expansion started. Monitor progress via GET /api/batch/status/:jobId',
      scalingMath: 'Video 3,450×12 + Image 12,870×12 + Stories 10,000×12 = 315,840 total',
      rateLimit: '10 seconds per prompt (Anthropic safety)',
      metadata: { queuedAt: new Date().toISOString() },
    });
  } catch (error) {
    log.error('[BatchWorker] Expand all failed', error);
    res.status(500).json({ error: 'Batch expansion failed', message: String(error) });
  }
});

/**
 * POST /api/batch/expand-batch
 * Queue expansion for specific batch
 */
router.post('/expand-batch', async (req: Request, res: Response) => {
  try {
    const { batchId } = req.body;

    if (!batchId) {
      return res.status(400).json({ error: 'batchId required' });
    }

    const jobId = await batchExpansionWorker.queueBatchExpansion(batchId);

    return res.json({
      status: 'queued',
      jobId,
      batchId,
      message: `Batch ${batchId} queued for expansion`,
      statusUrl: `/api/batch/status/${jobId}`,
      metadata: { queuedAt: new Date().toISOString() },
    });
  } catch (error) {
    log.error('[BatchWorker] Expand batch failed', error);
    return res.status(500).json({ error: 'Batch expansion failed', message: String(error) });
  }
});

/**
 * GET /api/batch/status/:jobId
 * Get job progress + status
 */
router.get('/status/:jobId', async (req: Request<{ jobId: string }>, res: Response) => {
  try {
    const { jobId } = req.params;
    const job = batchExpansionWorker.getJobStatus(jobId);

    if (!job) {
      return res.status(404).json({ error: 'Job not found', jobId });
    }

    const eta = job.status === 'in_progress'
      ? Math.ceil((job.total_prompts - job.processed_prompts) * 10 / 60) + ' minutes'
      : job.status === 'completed'
        ? 'Completed'
        : 'Queued';

    return res.json({
      jobId,
      batch: job.batch_id,
      status: job.status,
      progress: {
        percent: job.progress_percent,
        processed: job.processed_prompts,
        total: job.total_prompts,
        failed: job.failed_count,
      },
      eta,
      timestamps: {
        started: job.started_at,
        completed: job.completed_at,
      },
      error: job.error_message,
    });
  } catch (error) {
    log.error('[BatchWorker] Status check failed', error);
    return res.status(500).json({ error: 'Status check failed' });
  }
});

/**
 * GET /api/batch/jobs
 * List all active/completed jobs
 */
router.get('/jobs', async (req: Request, res: Response) => {
  try {
    const jobs = batchExpansionWorker.listJobs();
    const queueLength = batchExpansionWorker.getQueueLength();
    const isRunning = batchExpansionWorker.isWorkerRunning();

    res.json({
      status: isRunning ? 'processing' : 'idle',
      workerRunning: isRunning,
      queueLength,
      jobs: jobs.map(job => ({
        jobId: job.id,
        batch: job.batch_id,
        status: job.status,
        progress: `${job.processed_prompts}/${job.total_prompts}`,
        progressPercent: job.progress_percent,
        failed: job.failed_count,
      })),
      totalJobs: jobs.length,
      completedJobs: jobs.filter(j => j.status === 'completed').length,
      metadata: { checkedAt: new Date().toISOString() },
    });
  } catch (error) {
    log.error('[BatchWorker] Jobs list failed', error);
    res.status(500).json({ error: 'Jobs list failed' });
  }
});

/**
 * GET /api/batch/health
 * Worker health check
 */
router.get('/health', async (req: Request, res: Response) => {
  try {
    const isRunning = batchExpansionWorker.isWorkerRunning();
    const queueLength = batchExpansionWorker.getQueueLength();
    const jobs = batchExpansionWorker.listJobs();

    res.json({
      status: 'ok',
      worker: {
        running: isRunning,
        queueLength,
        totalJobs: jobs.length,
      },
      capabilities: [
        'Batch expansion (rate-limited 10s/prompt)',
        'Quality validation (ortografia, faces, products, environments)',
        'Job progress tracking',
        'Multi-batch parallel queueing',
      ],
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    log.error('[BatchWorker] Health check failed', error);
    res.status(500).json({ error: 'Health check failed' });
  }
});

export default router;
