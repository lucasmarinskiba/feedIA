import { env } from '../config/index.js';
import { log } from '../agent/logger.js';

export type ImageGenProvider = 'replicate' | 'openai' | 'flux' | 'sdxl' | 'none';

export interface ImageGenRequest {
  prompt: string;
  aspectRatio: '1:1' | '4:5' | '9:16' | '16:9';
  style?: string;
  negativePrompt?: string;
  seed?: number;
  count?: number;
}

export interface ImageGenResult {
  ok: boolean;
  urls?: string[];
  provider: ImageGenProvider;
  error?: string;
}

const aspectRatioToSize = (ar: ImageGenRequest['aspectRatio']): { width: number; height: number } => {
  switch (ar) {
    case '1:1':
      return { width: 1024, height: 1024 };
    case '4:5':
      return { width: 1024, height: 1280 };
    case '9:16':
      return { width: 1080, height: 1920 };
    case '16:9':
      return { width: 1920, height: 1080 };
    default:
      return { width: 1024, height: 1024 };
  }
};

const replicate = async (req: ImageGenRequest): Promise<ImageGenResult> => {
  if (!env.imageGen.replicateToken) {
    return { ok: false, provider: 'replicate', error: 'REPLICATE_API_TOKEN faltante' };
  }
  const size = aspectRatioToSize(req.aspectRatio);
  const body = {
    input: {
      prompt: req.style ? `${req.prompt}, ${req.style}` : req.prompt,
      aspect_ratio: req.aspectRatio,
      width: size.width,
      height: size.height,
      num_outputs: req.count ?? 1,
      ...(req.negativePrompt ? { negative_prompt: req.negativePrompt } : {}),
      ...(req.seed !== undefined ? { seed: req.seed } : {}),
    },
  };
  const res = await fetch(
    `https://api.replicate.com/v1/models/${env.imageGen.replicateModel ?? 'black-forest-labs/flux-schnell'}/predictions`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.imageGen.replicateToken}`,
        'Content-Type': 'application/json',
        Prefer: 'wait',
      },
      body: JSON.stringify(body),
    },
  );
  if (!res.ok) {
    return { ok: false, provider: 'replicate', error: `${res.status}: ${await res.text()}` };
  }
  const data = (await res.json()) as { output?: string | string[]; error?: string };
  if (data.error) return { ok: false, provider: 'replicate', error: data.error };
  const output = Array.isArray(data.output) ? data.output : data.output ? [data.output] : [];
  return { ok: true, provider: 'replicate', urls: output };
};

const openai = async (req: ImageGenRequest): Promise<ImageGenResult> => {
  if (!env.imageGen.openaiKey) {
    return { ok: false, provider: 'openai', error: 'OPENAI_API_KEY faltante' };
  }
  const size = req.aspectRatio === '9:16' ? '1024x1792' : req.aspectRatio === '16:9' ? '1792x1024' : '1024x1024';
  const res = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.imageGen.openaiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: env.imageGen.openaiModel ?? 'dall-e-3',
      prompt: req.style ? `${req.prompt}. Style: ${req.style}` : req.prompt,
      size,
      n: req.count ?? 1,
      quality: 'hd',
    }),
  });
  if (!res.ok) {
    return { ok: false, provider: 'openai', error: `${res.status}: ${await res.text()}` };
  }
  const data = (await res.json()) as { data?: Array<{ url: string }> };
  return {
    ok: true,
    provider: 'openai',
    urls: (data.data ?? []).map((d) => d.url),
  };
};

export const generateImage = async (req: ImageGenRequest): Promise<ImageGenResult> => {
  const provider = env.imageGen.provider;
  if (env.dryRun) {
    log.info(`[DRY RUN] generateImage (${provider}): "${req.prompt.slice(0, 60)}..."`);
    const placeholderColors = ['1c1c1c', '262626', 'ff5f1f'];
    const idx = Math.floor(Math.random() * placeholderColors.length);
    const colorHex = placeholderColors[idx] ?? '1c1c1c';
    const size = aspectRatioToSize(req.aspectRatio);
    return {
      ok: true,
      provider,
      urls: [
        `https://placehold.co/${size.width}x${size.height}/${colorHex}/f5f5f5/png?text=${encodeURIComponent(req.prompt.slice(0, 30))}`,
      ],
    };
  }
  switch (provider) {
    case 'replicate':
      return replicate(req);
    case 'openai':
      return openai(req);
    case 'none':
    default:
      return {
        ok: false,
        provider: 'none',
        error: 'IMAGE_GEN_PROVIDER=none o no configurado',
      };
  }
};
