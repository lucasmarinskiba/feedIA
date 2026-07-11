/**
 * Veo Video Generation Service
 * Real video generation via Google Veo 3.1 (Gemini API family, same
 * GEMINI_API_KEY already configured for vision/embeddings — no new account).
 *
 * This closes FeedIA's biggest remaining gap: every pipeline this session
 * (Brújula, autonomous-generator, content-routes, master-content-pipeline)
 * produces a fully-guaranteed PROMPT, but nothing actually rendered a video
 * file. This service takes that final prompt and renders real video.
 *
 * Veo uses a long-running operation pattern (predictLongRunning), unlike the
 * synchronous vision/embedding calls in gemini-vision-client.ts:
 *   1. startVideoGeneration() kicks off the job, returns an operation name
 *   2. pollOperationStatus() checks progress
 *   3. waitForVideoGeneration() polls until done or timeout, returns the
 *      video URL/bytes when ready
 *
 * IMPORTANT — verified live against the real API (2026-07-08): request shape
 * below is confirmed correct (the call reached quota validation, not a 400
 * shape error). However Veo generation requires a BILLED Google Cloud
 * project — it returned 429 RESOURCE_EXHAUSTED even though the same
 * GEMINI_API_KEY works fine for free-tier vision/embedding calls. This is a
 * billing/plan requirement, not a bug: enable billing on the Gemini API
 * project at https://ai.google.dev/gemini-api/docs/rate-limits before this
 * will actually generate video. Degrades gracefully like every other real-
 * model service in this project — never throws, returns null + logs why.
 */

import { log } from '../agent/logger.js';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const API_BASE = 'https://generativelanguage.googleapis.com/v1beta';

export type VeoModel = 'veo-3.1-generate-preview' | 'veo-3.1-fast-generate-preview' | 'veo-3.1-lite-generate-preview';

export const VEO_MODELS: Record<'best' | 'fast' | 'lite', VeoModel> = {
  best: 'veo-3.1-generate-preview', // highest quality, slowest, most expensive
  fast: 'veo-3.1-fast-generate-preview', // balanced
  lite: 'veo-3.1-lite-generate-preview', // cheapest/fastest, lower fidelity
};

export const isVeoConfigured = (): boolean => Boolean(GEMINI_API_KEY);

export interface VeoGenerationOptions {
  aspectRatio?: '16:9' | '9:16';
  durationSeconds?: 4 | 6 | 8; // Veo 3.1 supported clip lengths
  model?: VeoModel;
  referenceImageBase64?: string; // image-to-video: animate a source image (pairs with facial-identity-preservation.ts)
  referenceImageMimeType?: string;
}

export interface VeoOperation {
  operationName: string;
  done: boolean;
  videoUrl?: string;
  videoBase64?: string;
  error?: string;
}

/**
 * Start a Veo video generation job. Returns immediately with an operation
 * name to poll — video generation takes 20s-a few minutes depending on
 * model/duration, so this is never a synchronous call.
 */
export async function startVideoGeneration(
  prompt: string,
  options: VeoGenerationOptions = {}
): Promise<VeoOperation | null> {
  if (!GEMINI_API_KEY) {
    log.warn('[VeoVideo] GEMINI_API_KEY not set — cannot start video generation');
    return null;
  }

  const model = options.model || VEO_MODELS.fast;

  const instance: Record<string, unknown> = { prompt };
  if (options.referenceImageBase64) {
    instance.image = {
      bytesBase64Encoded: options.referenceImageBase64,
      mimeType: options.referenceImageMimeType || 'image/jpeg',
    };
  }

  try {
    const response = await fetch(`${API_BASE}/models/${model}:predictLongRunning?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        instances: [instance],
        parameters: {
          aspectRatio: options.aspectRatio || '9:16',
          durationSeconds: options.durationSeconds || 8,
        },
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      log.warn('[VeoVideo] Generation start failed', {
        status: response.status,
        model,
        body: body.slice(0, 400),
        billingNote:
          response.status === 429
            ? 'Veo requires a billed Google Cloud project — free-tier quota is 0 even with a valid API key'
            : undefined,
      });
      return null;
    }

    const json = (await response.json()) as { name?: string };
    if (!json.name) {
      log.warn('[VeoVideo] No operation name in response');
      return null;
    }

    log.info('[VeoVideo] Generation started', { operationName: json.name, model });

    return { operationName: json.name, done: false };
  } catch (error) {
    log.warn('[VeoVideo] Generation start threw', { error: String(error) });
    return null;
  }
}

/**
 * Poll a Veo operation's current status.
 */
export async function pollOperationStatus(operationName: string): Promise<VeoOperation | null> {
  if (!GEMINI_API_KEY) return null;

  try {
    const response = await fetch(`${API_BASE}/${operationName}?key=${GEMINI_API_KEY}`);

    if (!response.ok) {
      const body = await response.text();
      log.warn('[VeoVideo] Poll failed', { status: response.status, body: body.slice(0, 200) });
      return null;
    }

    const json = (await response.json()) as {
      name: string;
      done?: boolean;
      error?: { message?: string };
      response?: {
        generateVideoResponse?: {
          generatedSamples?: Array<{ video?: { uri?: string; bytesBase64Encoded?: string } }>;
        };
      };
    };

    if (json.error) {
      return { operationName, done: true, error: json.error.message || 'Unknown Veo error' };
    }

    if (!json.done) {
      return { operationName, done: false };
    }

    const sample = json.response?.generateVideoResponse?.generatedSamples?.[0];
    return {
      operationName,
      done: true,
      videoUrl: sample?.video?.uri,
      videoBase64: sample?.video?.bytesBase64Encoded,
    };
  } catch (error) {
    log.warn('[VeoVideo] Poll threw', { error: String(error) });
    return null;
  }
}

/**
 * Poll until the video is ready or maxWaitMs elapses. Veo typically takes
 * 20s-3min; polls every 10s by default.
 */
export async function waitForVideoGeneration(
  operationName: string,
  maxWaitMs: number = 180000,
  pollIntervalMs: number = 10000
): Promise<VeoOperation | null> {
  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitMs) {
    const status = await pollOperationStatus(operationName);

    if (!status) return null;
    if (status.done) {
      log.info('[VeoVideo] Generation complete', {
        operationName,
        hasVideo: Boolean(status.videoUrl || status.videoBase64),
        error: status.error,
      });
      return status;
    }

    await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
  }

  log.warn('[VeoVideo] Generation timed out', { operationName, maxWaitMs });
  return { operationName, done: false, error: 'Timed out waiting for generation' };
}

/**
 * Convenience: start + wait in one call for callers that don't need to
 * manage polling themselves (e.g. a queue worker that can afford to block).
 */
export async function generateVideoAndWait(
  prompt: string,
  options: VeoGenerationOptions = {},
  maxWaitMs: number = 180000
): Promise<VeoOperation | null> {
  const started = await startVideoGeneration(prompt, options);
  if (!started) return null;

  return waitForVideoGeneration(started.operationName, maxWaitMs);
}
