/**
 * Runway ML API Integration — Gen-3 Alpha para generación de video.
 * Usa la API REST de Runway cuando RUNWAY_API_KEY está configurada.
 * Fallback a browser operator si la API no está disponible.
 */
import { log } from '../../agent/logger.js';

export interface RunwayGenerateOptions {
  prompt: string;
  negativePrompt?: string;
  duration?: 5 | 10;
  ratio?: '1280:768' | '768:1280';
  seed?: number;
}

export interface RunwayImageToVideoOptions {
  imageUrl: string;
  prompt?: string;
  seed?: number;
}

export interface RunwayResult {
  ok: boolean;
  taskId?: string;
  outputUrl?: string;
  error?: string;
}

const RUNWAY_API_BASE = 'https://api.runwayml.com/v1';

export const generateVideoWithRunway = async (opts: RunwayGenerateOptions): Promise<RunwayResult> => {
  const apiKey = process.env.RUNWAY_API_KEY;
  if (!apiKey) {
    return { ok: false, error: 'RUNWAY_API_KEY no configurada' };
  }

  try {
    log.info(`[RunwayAPI] Generando video: "${opts.prompt.slice(0, 50)}..."`);

    const res = await fetch(`${RUNWAY_API_BASE}/text-to-video`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: opts.prompt,
        negative_prompt: opts.negativePrompt,
        duration: opts.duration ?? 5,
        ratio: opts.ratio ?? '768:1280',
        seed: opts.seed,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      return { ok: false, error: `Runway API error ${res.status}: ${text}` };
    }

    const data = (await res.json()) as { id: string; output?: string[] };
    return { ok: true, taskId: data.id, outputUrl: data.output?.[0] };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
};

export const imageToVideoWithRunway = async (opts: RunwayImageToVideoOptions): Promise<RunwayResult> => {
  const apiKey = process.env.RUNWAY_API_KEY;
  if (!apiKey) {
    return { ok: false, error: 'RUNWAY_API_KEY no configurada' };
  }

  try {
    const res = await fetch(`${RUNWAY_API_BASE}/image-to-video`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image_url: opts.imageUrl,
        prompt: opts.prompt,
        seed: opts.seed,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      return { ok: false, error: `Runway API error ${res.status}: ${text}` };
    }

    const data = (await res.json()) as { id: string; output?: string[] };
    return { ok: true, taskId: data.id, outputUrl: data.output?.[0] };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
};

export const checkRunwayTask = async (taskId: string): Promise<RunwayResult> => {
  const apiKey = process.env.RUNWAY_API_KEY;
  if (!apiKey) return { ok: false, error: 'RUNWAY_API_KEY no configurada' };

  try {
    const res = await fetch(`${RUNWAY_API_BASE}/tasks/${taskId}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    const data = (await res.json()) as { status: string; output?: string[] };
    if (data.status === 'succeeded') {
      return { ok: true, taskId, outputUrl: data.output?.[0] };
    }
    return { ok: false, error: `Estado: ${data.status}` };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
};
