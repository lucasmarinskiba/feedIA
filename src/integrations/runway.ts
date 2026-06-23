/**
 * Runway ML integration — generación de video con IA.
 * Docs: https://docs.runwayml.com
 */

import { log } from '../agent/logger.js';

const RUNWAY_API_KEY = process.env['RUNWAY_API_KEY'] ?? '';
const RUNWAY_BASE = 'https://api.runwayml.com/v1';
const DRY_RUN = process.env['DRY_RUN'] === 'true';

export interface RunwayGenerationInput {
  prompt: string;
  promptImage?: string; // URL de imagen de referencia
  duration?: 5 | 10;
  ratio?: '1280:768' | '768:1280' | '1280:1280';
}

export interface RunwayTask {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  url?: string;
  error?: string;
}

const mockGenerate = (input: RunwayGenerationInput): RunwayTask => {
  log.info(`[Runway] MOCK generate: ${input.prompt.slice(0, 60)}`);
  return {
    id: `mock-runway-${Date.now()}`,
    status: 'completed',
    url: `https://cdn.feedia.ai/mock/runway/${Date.now()}.mp4`,
  };
};

export const generateVideo = async (input: RunwayGenerationInput): Promise<RunwayTask> => {
  if (DRY_RUN || !RUNWAY_API_KEY) {
    return mockGenerate(input);
  }

  try {
    const response = await fetch(`${RUNWAY_BASE}/tasks`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RUNWAY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        task_type: 'gen3a_turbo',
        prompt_text: input.prompt,
        ...(input.promptImage ? { prompt_image: input.promptImage } : {}),
        duration: input.duration ?? 5,
        ratio: input.ratio ?? '768:1280',
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Runway API error ${response.status}: ${text}`);
    }

    const data = (await response.json()) as { id: string };
    return { id: data.id, status: 'pending' };
  } catch (err) {
    log.warn(`[Runway] Generate failed: ${(err as Error).message}. Fallback to mock.`);
    return mockGenerate(input);
  }
};

export const getTask = async (taskId: string): Promise<RunwayTask> => {
  if (taskId.startsWith('mock-')) {
    return { id: taskId, status: 'completed', url: `https://cdn.feedia.ai/mock/runway/${Date.now()}.mp4` };
  }

  try {
    const response = await fetch(`${RUNWAY_BASE}/tasks/${taskId}`, {
      headers: { Authorization: `Bearer ${RUNWAY_API_KEY}` },
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Runway API error ${response.status}: ${text}`);
    }
    const data = (await response.json()) as RunwayTask;
    return data;
  } catch (err) {
    return { id: taskId, status: 'failed', error: (err as Error).message };
  }
};

export const pollUntilComplete = async (
  taskId: string,
  opts: { maxAttempts?: number; delayMs?: number } = {},
): Promise<RunwayTask> => {
  const { maxAttempts = 30, delayMs = 10_000 } = opts;
  for (let i = 0; i < maxAttempts; i++) {
    const task = await getTask(taskId);
    if (task.status === 'completed' || task.status === 'failed') return task;
    log.info(`[Runway] Task ${taskId} status: ${task.status}. Waiting...`);
    await new Promise((r) => setTimeout(r, delayMs));
  }
  return { id: taskId, status: 'failed', error: 'Polling timeout' };
};

export const isRunwayAvailable = (): boolean => Boolean(RUNWAY_API_KEY);

/**
 * Generate animated MP4 video from carousel PNG slides.
 * Creates a video with slide transitions + animations.
 *
 * @param pngSlides Array of slide URLs or local paths
 * @param timings Array of { slideId, delay, duration, animation } for transitions
 * @param options { duration, quality, music }
 * @returns Promise<{ mp4Url: string; duration: number }>
 */
export const generateAnimatedCarousel = async (
  pngSlides: string[],
  timings: Array<{ slideId: number; delay: number; duration: number; animation: string }>,
  options?: { duration?: number; quality?: 'low' | 'medium' | 'high'; musicUrl?: string },
): Promise<{ mp4Url: string; duration: number } | null> => {
  if (!RUNWAY_API_KEY) {
    log.warn('[Runway] RUNWAY_API_KEY not configured. MP4 generation skipped. Fallback: PNG export.');
    return null;
  }

  try {
    // Calculate total duration from timings
    const totalDurationMs = Math.max(
      ...timings.map((t) => t.delay + t.duration),
      (options?.duration || 30) * 1000,
    );
    const totalDurationS = totalDurationMs / 1000;

    // Build prompt describing the carousel video
    const slideDescriptions = pngSlides
      .slice(0, 3)
      .map((_, i) => `Slide ${i + 1}`)
      .join(', ');
    const transitionDesc = timings[0]?.animation || 'fade';

    const prompt = `
Create a carousel video with ${pngSlides.length} slides.
Slides: ${slideDescriptions}...
Total duration: ${totalDurationS}s
Transitions: ${transitionDesc} effect between slides
Style: smooth, professional carousel animation
${options?.musicUrl ? 'Add background music' : ''}
`;

    // Call Runway API to generate video
    log.info(`[Runway] Starting carousel video generation: ${pngSlides.length} slides, ${totalDurationS}s`);

    const response = await fetch(`${RUNWAY_BASE}/tasks`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RUNWAY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        task_type: 'gen3a_turbo',
        prompt_text: prompt,
        prompt_image: pngSlides[0], // Use first slide as reference
        duration: Math.min(60, Math.ceil(totalDurationS)),
        ratio: '1080:1350', // Instagram carousel aspect ratio
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Runway API error ${response.status}: ${text}`);
    }

    const taskData = (await response.json()) as { id: string };
    log.info(`[Runway] Task created: ${taskData.id}`);

    // Poll for completion (max 5 min for carousel video)
    const task = await pollUntilComplete(taskData.id, {
      maxAttempts: 30,
      delayMs: 10_000, // 10s between polls
    });

    if (task.status === 'failed' || !task.url) {
      throw new Error(`Runway task failed: ${task.error}`);
    }

    log.info(`[Runway] Carousel video ready: ${task.url}`);
    return {
      mp4Url: task.url,
      duration: totalDurationS,
    };
  } catch (err) {
    const errMsg = (err as Error).message;
    log.warn(`[Runway] Carousel generation failed: ${errMsg}. Fallback to PNG export.`);
    return null; // Fallback: export PNG only
  }
};

export const runway = {
  generateVideo,
  getTask,
  pollUntilComplete,
  generateAnimatedCarousel,
  isRunwayAvailable,
};
