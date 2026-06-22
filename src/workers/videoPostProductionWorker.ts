/**
 * Video Post-Production Worker
 *
 * Procesa jobs de refinado de video vía CapCut o InShot. Está pensado para
 * correr en el proceso largo de workers (no en Vercel Functions).
 *
 * Cada job espera la respuesta async del webhook de CapCut/InShot (hasta 10 min).
 * En modo supervisado, la operación pasa por `actionGate` antes de ejecutarse.
 */

import type { Job } from 'bullmq';
import { createWorker } from './queue.js';
import { CapCutEngine } from '../studio/engines/capcutEngine.js';
import { InShotEngine } from '../studio/engines/inshotEngine.js';
import { env } from '../config/index.js';
import { log } from '../agent/logger.js';
import { actionGate } from '../glassbox/index.js';
import { trackCost } from '../capabilities/consumption/costAttribution.js';
import type { FeediaJob } from './queue.js';

export interface VideoPostProductionPayload {
  provider: 'capcut' | 'inshot';
  requestId: string;
  videoUrl: string;
  audioUrl?: string;
  recipe?: string;
  brandName?: string;
  title?: string;
  durationSec?: number;
  webhookReturnUrl?: string;
}

const parsePayload = (job: Job<FeediaJob>): VideoPostProductionPayload => {
  return job.data.payload as unknown as VideoPostProductionPayload;
};

const runPostProduction = async (payload: VideoPostProductionPayload) => {
  const { provider, requestId, videoUrl, audioUrl, recipe, brandName, title, durationSec, webhookReturnUrl } = payload;
  const assets: import('../studio/types.js').ContentAsset[] = [
    { id: 'video-base', type: 'video', source: 'generated', url: videoUrl },
  ];
  if (audioUrl) assets.push({ id: 'audio-base', type: 'audio', source: 'generated', url: audioUrl });

  const request: import('../studio/types.js').RenderRequest = {
    id: requestId,
    format: 'mp4',
    title: title ?? 'Post-producción',
    brandProfileId: 'default',
    assets,
    fields: {},
    options: { durationSec },
  };

  if (provider === 'inshot') {
    const engine = new InShotEngine({ recipe: recipe as InShotEngine['recipe'], brandName, webhookReturnUrl, timeoutMs: 10 * 60 * 1000 });
    return engine.render(request);
  }

  const engine = new CapCutEngine({ recipe: recipe as CapCutEngine['recipe'], brandName, webhookReturnUrl, timeoutMs: 10 * 60 * 1000 });
  return engine.render(request);
};

export const processVideoPostProduction = async (job: Job<FeediaJob>): Promise<{ ok: boolean; refinedUrl?: string; provider: string; error?: string }> => {
  const payload = parsePayload(job);
  log.info(`[VideoPostProductionWorker] Job ${job.id}: ${payload.provider} / ${payload.requestId}`);

  if (env.dryRun) {
    const sim = `https://${payload.provider}.com/export/simulated-${payload.requestId}.mp4`;
    log.info(`[VideoPostProductionWorker] DRY_RUN: ${sim}`);
    trackCost({
      model: payload.provider,
      inputTokens: 0,
      outputTokens: 0,
      costUsd: 0,
      workflow: 'brief-to-publish',
      agent: 'videoPostProductionWorker',
      feature: 'post-production',
      metadata: { provider: payload.provider, recipe: payload.recipe, requestId: payload.requestId, dryRun: true },
    });
    return { ok: true, refinedUrl: sim, provider: payload.provider };
  }

  const gate = await actionGate(
    'video_post_production',
    `Refinar video con ${payload.provider} (recipe: ${payload.recipe ?? 'default'})`,
    () => runPostProduction(payload),
    {
      source: 'videoPostProductionWorker',
      correlationId: payload.requestId,
      timeoutMs: 12 * 60 * 1000,
      onTimeout: 'escalate',
    },
  );

  if (!gate.ok || !gate.result) {
    const error = gate.reason ?? 'Post-producción rechazada o fallida';
    log.warn(`[VideoPostProductionWorker] Gate/execution failed: ${error}`);
    return { ok: false, provider: payload.provider, error };
  }

  const result = gate.result;
  const refinedUrl = result.artifactUrls?.[0];

  trackCost({
    model: payload.provider,
    inputTokens: 0,
    outputTokens: 0,
    costUsd: 0, // CapCut/InShot no tienen costo API directo; actualizar si se cobra por uso.
    workflow: 'brief-to-publish',
    agent: 'videoPostProductionWorker',
    feature: 'post-production',
    metadata: { provider: payload.provider, recipe: payload.recipe, requestId: payload.requestId, refinedUrl },
  });

  return { ok: result.ok, refinedUrl, provider: payload.provider, error: result.error };
};

export const startVideoPostProductionWorker = (): ReturnType<typeof createWorker> => {
  return createWorker('videoPostProduction', processVideoPostProduction);
};
