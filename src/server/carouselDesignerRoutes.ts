/**
 * Carousel Designer Pro Routes — API endpoints for Pinterest-inspired carousel generation.
 *
 * POST   /api/skills/carousel-designer-pro/generate  → Start job, return jobId
 * GET    /api/skills/carousel-designer-pro/status/:jobId → Job status + progress
 * GET    /api/skills/carousel-designer-pro/download/:jobId → Download ZIP
 */

import { type RouteDefinition, json } from './http.js';
import { jobQueue } from '../capabilities/carouselDesigner/jobQueue.js';
import { designCarouselPinterest } from '../capabilities/carouselDesigner/carouselDesignerPro.js';
import { carouselExporter } from '../capabilities/carouselDesigner/carouselExporter.js';

/**
 * POST /api/skills/carousel-designer-pro/generate
 * Start a new carousel generation job.
 *
 * Request body:
 * {
 *   prompt: string;
 *   brandId?: string;
 *   style?: 'warm-organic' | 'bold-playful' | 'dark-premium' | 'clean-editorial';
 *   slideCount?: number;
 *   animationStyle?: 'fade' | 'slideLeft' | 'slideUp' | 'zoom' | 'rotate';
 *   includeVideo?: boolean;
 *   includeMusic?: boolean;
 * }
 */
const handleGenerateCarousel: RouteDefinition = {
  method: 'POST',
  pattern: '/api/skills/carousel-designer-pro/generate',
  async handler(req, res) {
    try {
      const body = (req.body || {}) as Record<string, unknown>;

      // Validate required fields
      if (!body.prompt || typeof body.prompt !== 'string') {
        res.statusCode = 400;
        res.end(json({ error: 'Missing required field: prompt' }));
        return;
      }

      // Create job
      const job = jobQueue.createJob({
        prompt: body.prompt as string,
        brandId: body.brandId as string | undefined,
        style: (body.style || 'bold-playful') as any,
        slideCount: (body.slideCount || 10) as number,
        animationStyle: (body.animationStyle || 'fade') as any,
        includeVideo: body.includeVideo !== false,
        includeMusic: body.includeMusic !== false,
      });

      // Start async processing (fire and forget, don't await)
      processCarouselJobAsync(job.id).catch((err) => {
        jobQueue.failJob(job.id, `Processing failed: ${err.message}`);
      });

      res.statusCode = 202;
      res.end(
        json({
          jobId: job.id,
          status: 'queued',
          createdAt: job.createdAt,
          statusUrl: `/api/skills/carousel-designer-pro/status/${job.id}`,
        }),
      );
    } catch (error) {
      res.statusCode = 500;
      res.end(json({ error: `Failed to start job: ${error}` }));
    }
  },
};

/**
 * GET /api/skills/carousel-designer-pro/status/:jobId
 * Poll job status and progress.
 */
const handleStatusCarousel: RouteDefinition = {
  method: 'GET',
  pattern: '/api/skills/carousel-designer-pro/status/:jobId',
  handler(req, res) {
    try {
      const jobId = (req.params as Record<string, string>).jobId;

      if (!jobId) {
        res.statusCode = 400;
        res.end(json({ error: 'Missing jobId' }));
        return;
      }

      const job = jobQueue.getJob(jobId);

      if (!job) {
        res.statusCode = 404;
        res.end(json({ error: `Job not found: ${jobId}` }));
        return;
      }

      const response: Record<string, unknown> = {
        jobId: job.id,
        status: job.status,
        progress: job.progress || 0,
        createdAt: job.createdAt,
        startedAt: job.startedAt,
        completedAt: job.completedAt,
      };

      if (job.status === 'done' && job.exports) {
        response.exports = {
          htmlPreview: job.exports.htmlPreview ? '[HTML available]' : null,
          slides: job.exports.slides ? job.exports.slides.length : 0,
          mp4Url: job.exports.mp4Url || null,
          cssFile: job.exports.cssFile ? '[CSS available]' : null,
          zipUrl: job.exports.zipUrl,
        };
        response.aestheticScore = job.aestheticScore;
      }

      if (job.status === 'error') {
        response.error = job.error;
      }

      if (job.log && job.log.length > 0) {
        response.log = job.log.slice(-5); // Last 5 log entries
      }

      res.statusCode = 200;
      res.end(json(response));
    } catch (error) {
      res.statusCode = 500;
      res.end(json({ error: `Failed to get status: ${error}` }));
    }
  },
};

/**
 * GET /api/skills/carousel-designer-pro/download/:jobId
 * Download carousel as ZIP (PNG slides + CSS + MP4 + metadata).
 */
const handleDownloadCarousel: RouteDefinition = {
  method: 'GET',
  pattern: '/api/skills/carousel-designer-pro/download/:jobId',
  handler(req, res) {
    try {
      const jobId = (req.params as Record<string, string>).jobId;

      if (!jobId) {
        res.statusCode = 400;
        res.end(json({ error: 'Missing jobId' }));
        return;
      }

      const job = jobQueue.getJob(jobId);

      if (!job) {
        res.statusCode = 404;
        res.end(json({ error: `Job not found: ${jobId}` }));
        return;
      }

      if (job.status !== 'done') {
        res.statusCode = 202;
        res.end(
          json({
            error: `Job not ready. Status: ${job.status}. Progress: ${job.progress}%`,
            statusUrl: `/api/skills/carousel-designer-pro/status/${jobId}`,
          }),
        );
        return;
      }

      if (!job.exports || !job.exports.zipUrl) {
        res.statusCode = 500;
        res.end(json({ error: 'ZIP not available for this job' }));
        return;
      }

      // In production, stream ZIP file here
      // For now, return redirect to ZIP URL
      res.statusCode = 200;
      res.end(
        json({
          message: 'Carousel ready for download',
          downloadUrl: job.exports.zipUrl,
          htmlPreview: job.exports.htmlPreview ? 'Available' : null,
          mp4Url: job.exports.mp4Url || null,
        }),
      );
    } catch (error) {
      res.statusCode = 500;
      res.end(json({ error: `Failed to download: ${error}` }));
    }
  },
};

/**
 * Async job processor — runs in background.
 * Executes: designCarouselPinterest → createCarouselExport → mark done.
 */
async function processCarouselJobAsync(jobId: string): Promise<void> {
  const job = jobQueue.startJob(jobId);
  if (!job) throw new Error(`Job ${jobId} not found`);

  try {
    jobQueue.addLog(jobId, '▶ Starting carousel generation...');
    jobQueue.updateProgress(jobId, 10);

    // Step 1: Generate carousel with Pinterest aesthetics
    jobQueue.addLog(jobId, '→ Refining prompt & generating slides...');
    jobQueue.updateProgress(jobId, 20);

    const carousel = await designCarouselPinterest(job.input);

    jobQueue.addLog(jobId, `✓ Generated ${carousel.slides.length} slides`);
    jobQueue.updateProgress(jobId, 60);

    // Step 2: Create export package (ZIP with files)
    jobQueue.addLog(jobId, '→ Creating export package...');
    jobQueue.updateProgress(jobId, 75);

    const exportPkg = await carouselExporter.createCarouselExport({
      jobId,
      slides: carousel.slides.map((s, idx) => ({
        slide: idx + 1,
        path: `slide-${idx + 1}.png`, // Placeholder path
      })),
      cssFile: carousel.animations.css,
      mp4Url: carousel.exports.mp4Url,
      metadata: {
        prompt: job.input.prompt,
        style: carousel.style,
        aestheticScore: carousel.aestheticScore,
        totalDuration: carousel.animations.totalDuration,
        createdAt: job.createdAt,
      },
    });

    jobQueue.addLog(jobId, `✓ Export created: ${exportPkg.zipPath}`);
    jobQueue.updateProgress(jobId, 90);

    // Step 3: Mark job as complete
    jobQueue.completeJob(jobId, {
      slides: carousel.slides,
      animations: carousel.animations,
      exports: {
        htmlPreview: carousel.exports.htmlPreview,
        slides: carousel.exports.slides,
        mp4Url: carousel.exports.mp4Url,
        cssFile: carousel.exports.cssFile,
        zipUrl: exportPkg.downloadUrl,
        zipPath: exportPkg.zipPath,
      },
      aestheticScore: carousel.aestheticScore,
    });

    jobQueue.addLog(jobId, `✓ Job completed successfully`);
    jobQueue.updateProgress(jobId, 100);
  } catch (error) {
    jobQueue.failJob(jobId, `${error}`);
    jobQueue.addLog(jobId, `✗ Error: ${error}`);
  }
}

export const carouselDesignerRoutes = [handleGenerateCarousel, handleStatusCarousel, handleDownloadCarousel];
