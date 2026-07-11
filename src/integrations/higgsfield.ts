/**
 * Higgsfield API client — multi-provider video/image generation hub.
 *
 * Higgsfield aggregates multiple generation backends (SeeDance, Wan 2.1,
 * Kling, and others) under a single billing account. FeedIA calls this
 * client with the user's Higgsfield API key so users pay Higgsfield directly
 * rather than managing FAL/Replicate/etc. separately.
 *
 * Async job pattern (same as FAL queue): submit → poll → fetch result.
 *
 * API base: https://api.higgsfield.ai/v1
 * Docs: https://higgsfield.ai/docs (user must check for latest endpoint shapes)
 */

import { log } from '../agent/logger.js';

const HIGGSFIELD_API_BASE = 'https://api.higgsfield.ai/v1';

export type HiggsfieldVideoModel =
  | 'seedance-v1-lite'
  | 'seedance-v1-pro'
  | 'wan-2.1-t2v'
  | 'wan-2.1-i2v'
  | 'kling-v1'
  | 'kling-v1.5'
  | 'auto'; // let Higgsfield pick best available

export type HiggsfieldImageModel =
  | 'flux-1-dev'
  | 'flux-1-schnell'
  | 'sdxl'
  | 'auto';

export interface HiggsfieldVideoRequest {
  prompt: string;
  model?: HiggsfieldVideoModel;
  aspectRatio?: '9:16' | '16:9' | '1:1' | '4:5';
  durationSeconds?: 4 | 5 | 6 | 8 | 10 | 15;
  referenceImageUrl?: string;
  negativePrompt?: string;
}

export interface HiggsfieldImageRequest {
  prompt: string;
  model?: HiggsfieldImageModel;
  aspectRatio?: '9:16' | '16:9' | '1:1' | '4:5';
  numImages?: 1 | 2 | 4;
  negativePrompt?: string;
}

export interface HiggsfieldJob {
  jobId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  resultUrl?: string;
  resultUrls?: string[];
  error?: string;
  provider?: string;
  model?: string;
}

const authHeaders = (apiKey: string): Record<string, string> => ({
  Authorization: `Bearer ${apiKey}`,
  'Content-Type': 'application/json',
});

/**
 * Submit a video generation job.
 */
export const submitVideoGeneration = async (
  apiKey: string,
  request: HiggsfieldVideoRequest
): Promise<HiggsfieldJob | null> => {
  try {
    const body = {
      prompt: request.prompt,
      model: request.model || 'auto',
      aspect_ratio: request.aspectRatio || '9:16',
      duration: request.durationSeconds || 5,
      reference_image_url: request.referenceImageUrl,
      negative_prompt: request.negativePrompt,
    };

    const res = await fetch(`${HIGGSFIELD_API_BASE}/video/generate`, {
      method: 'POST',
      headers: authHeaders(apiKey),
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errBody = await res.text();
      log.warn('[Higgsfield] Video submit failed', {
        status: res.status,
        body: errBody.slice(0, 300),
      });
      return null;
    }

    const json = (await res.json()) as { job_id?: string; id?: string; status?: string };
    const jobId = json.job_id || json.id;
    if (!jobId) {
      log.warn('[Higgsfield] No job_id in video submit response');
      return null;
    }

    log.info('[Higgsfield] Video job submitted', { jobId, model: request.model });
    return { jobId, status: 'pending' };
  } catch (error) {
    log.warn('[Higgsfield] Video submit threw', { error: String(error) });
    return null;
  }
};

/**
 * Submit an image generation job.
 */
export const submitImageGeneration = async (
  apiKey: string,
  request: HiggsfieldImageRequest
): Promise<HiggsfieldJob | null> => {
  try {
    const body = {
      prompt: request.prompt,
      model: request.model || 'auto',
      aspect_ratio: request.aspectRatio || '4:5',
      num_images: request.numImages || 1,
      negative_prompt: request.negativePrompt,
    };

    const res = await fetch(`${HIGGSFIELD_API_BASE}/image/generate`, {
      method: 'POST',
      headers: authHeaders(apiKey),
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errBody = await res.text();
      log.warn('[Higgsfield] Image submit failed', {
        status: res.status,
        body: errBody.slice(0, 300),
      });
      return null;
    }

    const json = (await res.json()) as {
      job_id?: string;
      id?: string;
      images?: string[];
      urls?: string[];
    };

    if (json.images || json.urls) {
      const urls = json.images || json.urls || [];
      return { jobId: 'sync', status: 'completed', resultUrls: urls, resultUrl: urls[0] };
    }

    const jobId = json.job_id || json.id;
    if (!jobId) {
      log.warn('[Higgsfield] No job_id in image submit response');
      return null;
    }

    log.info('[Higgsfield] Image job submitted', { jobId, model: request.model });
    return { jobId, status: 'pending' };
  } catch (error) {
    log.warn('[Higgsfield] Image submit threw', { error: String(error) });
    return null;
  }
};

/**
 * Poll job status.
 */
export const pollJob = async (
  apiKey: string,
  jobId: string,
  type: 'video' | 'image' = 'video'
): Promise<HiggsfieldJob | null> => {
  if (jobId === 'sync') return null;

  try {
    const res = await fetch(`${HIGGSFIELD_API_BASE}/${type}/jobs/${jobId}`, {
      headers: authHeaders(apiKey),
    });

    if (!res.ok) {
      log.warn('[Higgsfield] Poll failed', { status: res.status, jobId });
      return null;
    }

    const json = (await res.json()) as {
      status?: string;
      state?: string;
      result_url?: string;
      video_url?: string;
      image_urls?: string[];
      urls?: string[];
      error?: string;
      provider?: string;
      model?: string;
    };

    const status = (json.status || json.state || 'pending') as HiggsfieldJob['status'];
    const resultUrl = json.result_url || json.video_url;
    const resultUrls = json.image_urls || json.urls;

    return {
      jobId,
      status,
      resultUrl,
      resultUrls,
      error: json.error,
      provider: json.provider,
      model: json.model,
    };
  } catch (error) {
    log.warn('[Higgsfield] Poll threw', { error: String(error) });
    return null;
  }
};

/**
 * Poll until done or timeout.
 */
export const waitForJob = async (
  apiKey: string,
  job: HiggsfieldJob,
  type: 'video' | 'image' = 'video',
  maxWaitMs = 180000,
  pollIntervalMs = 8000
): Promise<HiggsfieldJob | null> => {
  if (job.status === 'completed') return job;

  const start = Date.now();
  let current = job;

  while (Date.now() - start < maxWaitMs) {
    const polled = await pollJob(apiKey, current.jobId, type);
    if (!polled) return null;

    if (polled.status === 'completed') {
      log.info('[Higgsfield] Job completed', {
        jobId: job.jobId,
        provider: polled.provider,
        model: polled.model,
      });
      return polled;
    }

    if (polled.status === 'failed') {
      log.warn('[Higgsfield] Job failed', { jobId: job.jobId, error: polled.error });
      return polled;
    }

    current = polled;
    await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
  }

  log.warn('[Higgsfield] Job timed out', { jobId: job.jobId, maxWaitMs });
  return { ...current, status: 'failed', error: 'Timed out' };
};

/** Convenience: submit video + wait. */
export const generateVideoAndWait = async (
  apiKey: string,
  request: HiggsfieldVideoRequest,
  maxWaitMs = 180000
): Promise<HiggsfieldJob | null> => {
  const job = await submitVideoGeneration(apiKey, request);
  if (!job) return null;
  return waitForJob(apiKey, job, 'video', maxWaitMs);
};

/** Convenience: submit image + wait. */
export const generateImageAndWait = async (
  apiKey: string,
  request: HiggsfieldImageRequest,
  maxWaitMs = 60000
): Promise<HiggsfieldJob | null> => {
  const job = await submitImageGeneration(apiKey, request);
  if (!job) return null;
  if (job.status === 'completed') return job;
  return waitForJob(apiKey, job, 'image', maxWaitMs);
};
