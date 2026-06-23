/**
 * Carousel Designer Pro API Routes
 * POST /api/skills/carousel-designer-pro/generate
 * GET /api/skills/carousel-designer-pro/status/:jobId
 * GET /api/skills/carousel-designer-pro/download/:jobId
 */

import type { RouteDefinition, RouteHandler } from './http.js';
import { json, text } from './http.js';
import { createJob, getJob, startJob, failJob, addLog, updateProgress, completeJob } from '../capabilities/carouselDesigner/jobQueue.js';
import { designCarouselPinterest } from '../capabilities/carouselDesigner/carouselDesignerPro.js';
import type { CarouselDesignerProInput } from '../capabilities/carouselDesigner/carouselDesignerPro.js';
import { log } from '../agent/logger.js';

/**
 * Process carousel job asynchronously.
 * Called in background after job creation.
 */
const processCarouselJobAsync = async (jobId: string, input: CarouselDesignerProInput): Promise<void> => {
  try {
    startJob(jobId);
    addLog(jobId, 'Starting carousel generation...');

    updateProgress(jobId, 10);
    addLog(jobId, 'Generating base carousel...');

    // Call main orchestrator
    const result = await designCarouselPinterest(input);

    updateProgress(jobId, 80);
    addLog(jobId, 'Generating animations and exports...');

    // Complete job
    completeJob(
      jobId,
      result.slides,
      result.animations,
      result.exports,
      result.aestheticScore || 0,
    );

    addLog(jobId, `Carousel ready (score: ${result.aestheticScore})`);
    log.info(`[Carousel] Job ${jobId} completed`);
  } catch (err) {
    const errMsg = (err as Error).message;
    failJob(jobId, errMsg);
    log.error(`[Carousel] Job ${jobId} failed: ${errMsg}`);
  }
};

/**
 * POST /api/skills/carousel-designer-pro/generate
 * Create + queue carousel job
 */
const generateHandler: RouteHandler = async (ctx) => {
  try {
    let body = '';
    ctx.req.on('data', (chunk) => {
      body += chunk.toString();
    });

    ctx.req.on('end', async () => {
      try {
        const input: CarouselDesignerProInput = JSON.parse(body);

        // Validate
        if (!input.prompt) {
          json(ctx.res, 400, { error: 'prompt required' });
          return;
        }

        // Create job
        const job = createJob(input.prompt);

        // Start async processing (fire-and-forget)
        void processCarouselJobAsync(job.id, input);

        // Return immediately with jobId
        json(ctx.res, 202, {
          jobId: job.id,
          status: 'queued',
          createdAt: job.createdAt,
          statusUrl: `/api/skills/carousel-designer-pro/status/${job.id}`,
        });
      } catch (err) {
        json(ctx.res, 400, { error: (err as Error).message });
      }
    });
  } catch (err) {
    json(ctx.res, 500, { error: (err as Error).message });
  }
};

/**
 * GET /api/skills/carousel-designer-pro/status/:jobId
 * Poll job status
 */
const statusHandler: RouteHandler = async (ctx) => {
  try {
    const url = ctx.req.url || '';
    const jobId = url.split('/').pop();

    if (!jobId) {
      json(ctx.res, 400, { error: 'jobId required' });
      return;
    }

    const job = getJob(jobId);
    if (!job) {
      json(ctx.res, 404, { error: 'job not found' });
      return;
    }

    // Return job status + last 5 log entries
    json(ctx.res, 200, {
      jobId: job.id,
      status: job.status,
      progress: job.progress,
      createdAt: job.createdAt,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
      error: job.error,
      aestheticScore: job.aestheticScore,
      readyToPublish: job.readyToPublish,
      exports: job.exports,
      log: job.log.slice(-5), // Last 5 entries
    });
  } catch (err) {
    json(ctx.res, 500, { error: (err as Error).message });
  }
};

/**
 * GET /api/skills/carousel-designer-pro/download/:jobId
 * Download carousel ZIP
 */
const downloadHandler: RouteHandler = async (ctx) => {
  try {
    const url = ctx.req.url || '';
    const jobId = url.split('/').pop();

    if (!jobId) {
      json(ctx.res, 400, { error: 'jobId required' });
      return;
    }

    const job = getJob(jobId);
    if (!job) {
      json(ctx.res, 404, { error: 'job not found' });
      return;
    }

    // If still running, return 202
    if (job.status === 'queued' || job.status === 'running') {
      json(ctx.res, 202, {
        jobId: job.id,
        status: job.status,
        progress: job.progress,
        message: 'Job still processing',
      });
      return;
    }

    // If failed, return error
    if (job.status === 'error') {
      json(ctx.res, 400, {
        jobId: job.id,
        status: 'error',
        error: job.error,
      });
      return;
    }

    // Job done: return download URLs
    json(ctx.res, 200, {
      jobId: job.id,
      status: 'done',
      htmlPreview: job.exports?.htmlPreview,
      mp4Url: job.exports?.mp4Url,
      zipUrl: job.exports?.zipUrl,
      aestheticScore: job.aestheticScore,
      readyToPublish: job.readyToPublish,
    });
  } catch (err) {
    json(ctx.res, 500, { error: (err as Error).message });
  }
};

/**
 * Export routes
 */
export const carouselDesignerRoutes: RouteDefinition[] = [
  {
    method: 'POST',
    pattern: '/api/skills/carousel-designer-pro/generate',
    handler: generateHandler,
  },
  {
    method: 'GET',
    pattern: '/api/skills/carousel-designer-pro/status/:jobId',
    handler: statusHandler,
  },
  {
    method: 'GET',
    pattern: '/api/skills/carousel-designer-pro/download/:jobId',
    handler: downloadHandler,
  },
];
