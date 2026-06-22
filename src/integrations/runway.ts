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
