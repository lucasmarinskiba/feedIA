/**
 * SeeDance Video Generation Service (via FAL)
 * Real video generation fallback for when Veo 3.1 is unavailable — same
 * FAL_KEY already configured for real-upscale-service.ts. Closes the
 * single-point-of-failure gap: previously Veo was the only video renderer,
 * so a Gemini outage/billing issue meant zero video generation capability.
 *
 * ByteDance's Seedance model, accessed through FAL's queue API (async job
 * pattern, same as Veo's predictLongRunning — submit, poll, fetch result).
 *
 * Verified live (2026-07-08): fal-ai/bytedance/seedance/v1/lite/text-to-video
 * is a real, valid FAL model endpoint (confirmed via error-signature
 * comparison — a garbage model path returns 404 "Application not found",
 * this path returns 403 "Exhausted balance", meaning auth+routing succeeded
 * and only the FAL account's billing blocked the call). Same billing
 * requirement as FAL's clarity-upscaler used elsewhere in this project —
 * top up credit at fal.ai/dashboard/billing.
 */

import { log } from '../agent/logger.js';

const FAL_KEY = process.env.FAL_KEY;
const FAL_QUEUE_BASE = 'https://queue.fal.run';

export type SeedanceModel = 'fal-ai/bytedance/seedance/v1/lite/text-to-video' | 'fal-ai/bytedance/seedance/v1/pro/text-to-video';

export const SEEDANCE_MODELS: Record<'lite' | 'pro', SeedanceModel> = {
  lite: 'fal-ai/bytedance/seedance/v1/lite/text-to-video', // cheaper/faster
  pro: 'fal-ai/bytedance/seedance/v1/pro/text-to-video', // higher quality
};

export const isSeedanceConfigured = (): boolean => Boolean(FAL_KEY);

export interface SeedanceOptions {
  aspectRatio?: '16:9' | '9:16' | '1:1';
  durationSeconds?: 5 | 10;
  model?: SeedanceModel;
}

export interface SeedanceJob {
  requestId: string;
  statusUrl: string;
  done: boolean;
  videoUrl?: string;
  error?: string;
}

/**
 * Start a SeeDance video generation job via FAL's async queue API.
 */
export async function startSeedanceGeneration(
  prompt: string,
  options: SeedanceOptions = {}
): Promise<SeedanceJob | null> {
  if (!FAL_KEY) {
    log.warn('[SeeDance] FAL_KEY not set — cannot start video generation');
    return null;
  }

  const model = options.model || SEEDANCE_MODELS.lite;

  try {
    const response = await fetch(`${FAL_QUEUE_BASE}/${model}`, {
      method: 'POST',
      headers: { Authorization: `Key ${FAL_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt,
        aspect_ratio: options.aspectRatio || '9:16',
        duration: String(options.durationSeconds || 5),
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      log.warn('[SeeDance] Generation start failed', {
        status: response.status,
        model,
        body: body.slice(0, 300),
        billingNote: response.status === 403 ? 'FAL account balance exhausted — top up at fal.ai/dashboard/billing' : undefined,
      });
      return null;
    }

    const json = (await response.json()) as { request_id?: string; status_url?: string };
    if (!json.request_id) {
      log.warn('[SeeDance] No request_id in response');
      return null;
    }

    log.info('[SeeDance] Generation started', { requestId: json.request_id, model });

    return {
      requestId: json.request_id,
      statusUrl: json.status_url || `${FAL_QUEUE_BASE}/${model}/requests/${json.request_id}/status`,
      done: false,
    };
  } catch (error) {
    log.warn('[SeeDance] Generation start threw', { error: String(error) });
    return null;
  }
}

/**
 * Poll a SeeDance job's status via FAL's queue API.
 */
export async function pollSeedanceStatus(job: SeedanceJob, model: SeedanceModel = SEEDANCE_MODELS.lite): Promise<SeedanceJob | null> {
  if (!FAL_KEY) return null;

  try {
    const statusRes = await fetch(job.statusUrl, {
      headers: { Authorization: `Key ${FAL_KEY}` },
    });

    if (!statusRes.ok) {
      const body = await statusRes.text();
      log.warn('[SeeDance] Status check failed', { status: statusRes.status, body: body.slice(0, 200) });
      return null;
    }

    const statusJson = (await statusRes.json()) as { status?: string };

    if (statusJson.status !== 'COMPLETED') {
      return { ...job, done: false };
    }

    const resultRes = await fetch(`${FAL_QUEUE_BASE}/${model}/requests/${job.requestId}`, {
      headers: { Authorization: `Key ${FAL_KEY}` },
    });

    if (!resultRes.ok) {
      return { ...job, done: true, error: `Result fetch failed: ${resultRes.status}` };
    }

    const resultJson = (await resultRes.json()) as { video?: { url?: string } };

    return { ...job, done: true, videoUrl: resultJson.video?.url };
  } catch (error) {
    log.warn('[SeeDance] Status poll threw', { error: String(error) });
    return null;
  }
}

/**
 * Poll until done or timeout — SeeDance typically takes 30s-2min.
 */
export async function waitForSeedanceGeneration(
  job: SeedanceJob,
  model: SeedanceModel = SEEDANCE_MODELS.lite,
  maxWaitMs: number = 150000,
  pollIntervalMs: number = 8000
): Promise<SeedanceJob | null> {
  const startTime = Date.now();
  let current = job;

  while (Date.now() - startTime < maxWaitMs) {
    const status = await pollSeedanceStatus(current, model);
    if (!status) return null;
    if (status.done) {
      log.info('[SeeDance] Generation complete', { requestId: job.requestId, hasVideo: Boolean(status.videoUrl) });
      return status;
    }
    current = status;
    await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
  }

  log.warn('[SeeDance] Generation timed out', { requestId: job.requestId, maxWaitMs });
  return { ...current, done: false, error: 'Timed out waiting for generation' };
}

/** Convenience: start + wait in one call. */
export async function generateSeedanceVideoAndWait(
  prompt: string,
  options: SeedanceOptions = {},
  maxWaitMs: number = 150000
): Promise<SeedanceJob | null> {
  const started = await startSeedanceGeneration(prompt, options);
  if (!started) return null;
  return waitForSeedanceGeneration(started, options.model || SEEDANCE_MODELS.lite, maxWaitMs);
}
