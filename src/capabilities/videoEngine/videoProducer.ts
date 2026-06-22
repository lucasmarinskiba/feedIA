/**
 * Video Producer — orquesta la generación de video con IA según formato y proveedor.
 */

import { log } from '../../agent/logger.js';
import {
  generateVideo as generateRunwayVideo,
  pollUntilComplete as pollRunway,
  isRunwayAvailable,
} from '../../integrations/runway.js';
import { generateAvatarVideo, pollUntilComplete as pollHeyGen, isHeyGenAvailable } from '../../integrations/heygen.js';
import { estimateVideoCost } from './pricing.js';
import { recordVideoUsage } from './usageTracker.js';
import type { VideoProductionInput, ProducedVideo, VideoEngineConfig } from './types.js';

const DEFAULT_DURATION = 15;

const applyCost = (video: ProducedVideo): ProducedVideo => {
  const cost = estimateVideoCost(video.provider, video.durationSec);
  return {
    ...video,
    metadata: { ...video.metadata, costEstimateUsd: cost },
  };
};

const buildRunwayPrompt = (input: VideoProductionInput): string => {
  const parts = [
    `Vertical ${input.format === 'tiktok' ? 'TikTok' : 'Instagram Reel'} for ${input.brandName}.`,
    `Topic: ${input.topic}.`,
    `Hook: ${input.script.hookVisual}.`,
    `Tone: energetic, native social media style.`,
    input.format === 'tiktok'
      ? 'Fast cuts, big text overlays, trending style.'
      : 'Smooth transitions, engaging B-roll, clear CTA.',
  ];
  return parts.join(' ');
};

const buildHeyGenScript = (input: VideoProductionInput): string => {
  return `${input.script.hookVisual}. ${input.script.caption}. ${input.script.cta}`;
};

const produceWithRunway = async (input: VideoProductionInput): Promise<ProducedVideo> => {
  const prompt = buildRunwayPrompt(input);
  log.info(`[VideoProducer] Runway prompt: ${prompt.slice(0, 100)}`);

  const task = await generateRunwayVideo({
    prompt,
    duration: (input.durationSec ?? DEFAULT_DURATION) <= 5 ? 5 : 10,
    ratio: input.vertical !== false ? '768:1280' : '1280:768',
  });

  if (task.status === 'completed' && task.url) {
    return {
      ok: true,
      videoUrl: task.url,
      provider: 'runway',
      durationSec: input.durationSec ?? DEFAULT_DURATION,
      format: input.format,
      metadata: { prompt, taskId: task.id },
    };
  }

  const completed = await pollRunway(task.id, { maxAttempts: 3, delayMs: 5_000 });
  if (completed.status === 'completed' && completed.url) {
    return {
      ok: true,
      videoUrl: completed.url,
      provider: 'runway',
      durationSec: input.durationSec ?? DEFAULT_DURATION,
      format: input.format,
      metadata: { prompt, taskId: completed.id },
    };
  }

  return {
    ok: false,
    provider: 'runway',
    durationSec: 0,
    format: input.format,
    metadata: { prompt, taskId: task.id },
    error: completed.error ?? 'Runway generation failed',
  };
};

const produceWithHeyGen = async (input: VideoProductionInput): Promise<ProducedVideo> => {
  const script = buildHeyGenScript(input);
  log.info(`[VideoProducer] HeyGen script: ${script.slice(0, 100)}`);

  const video = await generateAvatarVideo({
    script,
    vertical: input.vertical !== false,
    background: '#000000',
  });

  if (video.status === 'completed' && video.url) {
    return {
      ok: true,
      videoUrl: video.url,
      provider: 'heygen',
      durationSec: input.durationSec ?? DEFAULT_DURATION,
      format: input.format,
      metadata: { prompt: script, taskId: video.id },
    };
  }

  const completed = await pollHeyGen(video.id, { maxAttempts: 3, delayMs: 5_000 });
  if (completed.status === 'completed' && completed.url) {
    return {
      ok: true,
      videoUrl: completed.url,
      provider: 'heygen',
      durationSec: input.durationSec ?? DEFAULT_DURATION,
      format: input.format,
      metadata: { prompt: script, taskId: completed.id },
    };
  }

  return {
    ok: false,
    provider: 'heygen',
    durationSec: 0,
    format: input.format,
    metadata: { prompt: script, taskId: video.id },
    error: completed.error ?? 'HeyGen generation failed',
  };
};

const produceMock = (input: VideoProductionInput): ProducedVideo => {
  const format = input.format;
  const url = `https://cdn.feedia.ai/mock/video/${format}-${Date.now()}.mp4`;
  log.info(`[VideoProducer] MOCK video for ${format}: ${url}`);
  return {
    ok: true,
    videoUrl: url,
    provider: 'mock',
    durationSec: input.durationSec ?? DEFAULT_DURATION,
    format,
    metadata: { prompt: buildRunwayPrompt(input) },
  };
};

const checkBudget = (input: VideoProductionInput, config: VideoEngineConfig): boolean => {
  if (!config.maxCostUsd || config.maxCostUsd <= 0) return true;
  const rough = estimateVideoCost(input.style === 'avatar' ? 'heygen' : 'runway', input.durationSec ?? DEFAULT_DURATION);
  if (rough > config.maxCostUsd) {
    log.warn(`[VideoProducer] Costo estimado $${rough.toFixed(2)} excede presupuesto $${config.maxCostUsd}. Abortando.`);
    return false;
  }
  return true;
};

const resolveProvider = (
  input: VideoProductionInput,
  config: VideoEngineConfig,
): 'runway' | 'heygen' | 'mock' => {
  const { preferredProvider } = config;
  const style = input.style ?? 'mixed';

  // Si hay preferencia explícita y está disponible, respetarla
  if (preferredProvider === 'runway' && isRunwayAvailable()) return 'runway';
  if (preferredProvider === 'heygen' && isHeyGenAvailable()) return 'heygen';

  // Selección por estilo
  if (style === 'avatar' && isHeyGenAvailable()) return 'heygen';
  if ((style === 'broll' || style === 'mixed' || style === 'motion') && isRunwayAvailable()) return 'runway';

  // Fallback
  if (isRunwayAvailable()) return 'runway';
  if (isHeyGenAvailable()) return 'heygen';
  return 'mock';
};

export const produceVideo = async (
  input: VideoProductionInput,
  config: VideoEngineConfig = {},
): Promise<ProducedVideo> => {
  if (!checkBudget(input, config)) {
    return {
      ok: false,
      provider: 'none',
      durationSec: 0,
      format: input.format,
      metadata: { costEstimateUsd: 0 },
      error: `Presupuesto excedido (max $${config.maxCostUsd})`,
    };
  }

  if (config.dryRun ?? true) {
    const mock = applyCost(produceMock(input));
    recordVideoUsage({
      provider: mock.provider,
      format: mock.format,
      durationSec: mock.durationSec,
      costEstimateUsd: mock.metadata.costEstimateUsd ?? 0,
      taskId: mock.metadata.taskId,
      topic: input.topic,
      brandName: input.brandName,
      style: input.style,
      success: true,
    });
    return mock;
  }

  const provider = resolveProvider(input, config);

  let result: ProducedVideo;
  if (provider === 'runway') {
    result = await produceWithRunway(input);
  } else if (provider === 'heygen') {
    result = await produceWithHeyGen(input);
  } else {
    result = produceMock(input);
  }

  if (!result.ok && provider !== 'mock') {
    log.warn(`[VideoProducer] ${provider} falló. Fallback a mock.`);
    result = produceMock(input);
  }

  const final = applyCost(result);
  recordVideoUsage({
    provider: final.provider,
    format: final.format,
    durationSec: final.durationSec,
    costEstimateUsd: final.metadata.costEstimateUsd ?? 0,
    taskId: final.metadata.taskId,
    topic: input.topic,
    brandName: input.brandName,
    style: input.style,
    success: final.ok,
    error: final.error,
  });
  return final;
};

export const produceReel = async (
  script: VideoProductionInput['script'],
  topic: string,
  brandName: string,
  config?: VideoEngineConfig,
): Promise<ProducedVideo> =>
  produceVideo(
    {
      format: 'reel',
      script,
      topic,
      brandName,
      vertical: true,
      style: config?.style ?? (config?.preferredProvider === 'heygen' ? 'avatar' : 'broll'),
    },
    config,
  );

export const produceTikTok = async (
  script: VideoProductionInput['script'],
  topic: string,
  brandName: string,
  config?: VideoEngineConfig,
): Promise<ProducedVideo> =>
  produceVideo(
    {
      format: 'tiktok',
      script,
      topic,
      brandName,
      vertical: true,
      style: config?.style ?? (config?.preferredProvider === 'heygen' ? 'avatar' : 'mixed'),
    },
    config,
  );
