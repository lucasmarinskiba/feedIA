/**
 * Veo Video Generation Routes
 * Real video rendering via Google Veo 3.1 — closes the prompt-to-video gap
 */

import { Router, Request, Response } from 'express';
import { log } from '../agent/logger.js';
import {
  startVideoGeneration,
  pollOperationStatus,
  waitForVideoGeneration,
  generateVideoAndWait,
  isVeoConfigured,
  VEO_MODELS,
} from '../services/veo-video-service.js';

const router = Router();

/**
 * POST /api/video-gen/start
 * Start a Veo video generation job (async — returns operation name to poll)
 */
router.post('/start', async (req: Request, res: Response) => {
  try {
    const { prompt, aspectRatio, durationSeconds, model, referenceImageBase64, referenceImageMimeType } = req.body;

    if (!prompt) {
      res.status(400).json({ error: 'prompt required' });
      return;
    }

    const operation = await startVideoGeneration(prompt, {
      aspectRatio,
      durationSeconds,
      model,
      referenceImageBase64,
      referenceImageMimeType,
    });

    if (!operation) {
      res.status(503).json({
        status: 'unavailable',
        error: 'Veo generation unavailable — GEMINI_API_KEY not set or the API call failed',
        note: 'Veo requires a BILLED Google Cloud project — free tier quota is 0 even with a valid key. Check https://ai.google.dev/gemini-api/docs/rate-limits',
      });
      return;
    }

    res.json({
      status: 'started',
      operationName: operation.operationName,
      nextStep: `GET /api/video-gen/status/${encodeURIComponent(operation.operationName)} to poll, or POST /api/video-gen/wait to block until ready`,
      estimatedTime: '20 seconds to 3 minutes depending on model/duration',
      metadata: { startedAt: new Date().toISOString() },
    });
  } catch (error) {
    log.error('[VeoVideo] Start failed', error);
    res.status(500).json({ error: 'Video generation start failed', message: String(error) });
  }
});

/**
 * GET /api/video-gen/status/:operationName
 * Poll a video generation job's current status (operationName must be URL-encoded)
 */
router.get('/status/:operationName', async (req: Request, res: Response) => {
  try {
    const operationName = decodeURIComponent(String(req.params.operationName));

    const status = await pollOperationStatus(operationName);

    if (!status) {
      res.status(503).json({ error: 'Status check unavailable — GEMINI_API_KEY not set or call failed' });
      return;
    }

    res.json({
      status: status.done ? (status.error ? 'failed' : 'complete') : 'processing',
      ...status,
      metadata: { checkedAt: new Date().toISOString() },
    });
  } catch (error) {
    log.error('[VeoVideo] Status check failed', error);
    res.status(500).json({ error: 'Status check failed' });
  }
});

/**
 * POST /api/video-gen/wait
 * Start generation and block until complete (or timeout) — convenience for
 * batch/queue workers that can afford to wait synchronously.
 */
router.post('/wait', async (req: Request, res: Response) => {
  try {
    const { prompt, aspectRatio, durationSeconds, model, maxWaitMs } = req.body;

    if (!prompt) {
      res.status(400).json({ error: 'prompt required' });
      return;
    }

    const result = await generateVideoAndWait(prompt, { aspectRatio, durationSeconds, model }, maxWaitMs || 180000);

    if (!result) {
      res.status(503).json({
        status: 'unavailable',
        error: 'Veo generation unavailable — GEMINI_API_KEY not set or the API call failed',
        note: 'Veo requires a BILLED Google Cloud project — free tier quota is 0 even with a valid key.',
      });
      return;
    }

    if (result.error) {
      res.status(500).json({ status: 'failed', error: result.error });
      return;
    }

    res.json({
      status: result.done ? 'complete' : 'timeout',
      videoUrl: result.videoUrl,
      hasVideoBytes: Boolean(result.videoBase64),
      metadata: { completedAt: new Date().toISOString() },
    });
  } catch (error) {
    log.error('[VeoVideo] Wait failed', error);
    res.status(500).json({ error: 'Video generation failed', message: String(error) });
  }
});

/**
 * GET /api/video-gen/health
 */
router.get('/health', async (req: Request, res: Response) => {
  try {
    res.json({
      status: 'ok',
      service: 'veo-video-generation',
      configured: isVeoConfigured(),
      purpose: 'Real video rendering (Veo 3.1) — closes the gap between guaranteed prompts and actual publishable video files',
      models: VEO_MODELS,
      requirements: [
        'GEMINI_API_KEY (same key already used for vision/embeddings)',
        'IMPORTANT: Veo requires a BILLED Google Cloud project — unlike vision/embedding calls, free-tier quota is 0',
      ],
      supportedOptions: {
        aspectRatio: ['16:9', '9:16'],
        durationSeconds: [4, 6, 8],
        imageToVideo: 'referenceImageBase64 — animate a source photo (pairs with facial-identity-preservation.ts lock)',
      },
      endpoints: {
        start: 'POST /api/video-gen/start',
        status: 'GET /api/video-gen/status/:operationName',
        wait: 'POST /api/video-gen/wait',
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    log.error('[VeoVideo] Health check failed', error);
    res.status(500).json({ error: 'Health check failed' });
  }
});

export default router;
