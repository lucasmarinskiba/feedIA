/**
 * Fal.ai de FeedIA — generador de imágenes con calidad profesional.
 *
 * Reemplaza al diseñador gráfico tradicional. Conecta con la App Store de modelos
 * de Fal.ai: nano-banana-2 (Google), flux-pro, ideogram, sdxl-turbo, etc.
 *
 * Docs: https://fal.ai/models  (API key vía FAL_AI_API_KEY o FAL_KEY)
 */

import { env } from '../config/index.js';
import { log } from '../agent/logger.js';

// ── Tipos ─────────────────────────────────────────────────────────────────────

export type FalModel =
  | 'nano-banana-2' // Google, top calidad fotorrealista — ~$0.04 por img
  | 'flux-pro' // Black Forest Labs, premium — ~$0.05 por img
  | 'flux-schnell' // Flux rápido y barato — ~$0.003 por img
  | 'sdxl-turbo' // SDXL Turbo, balance velocidad/calidad
  | 'ideogram-v3' // Ideogram, excelente para texto en imagen
  | 'recraft-v3' // Recraft, estilos artísticos consistentes
  | 'imagen-3'; // Google Imagen 3

export type AspectRatio = '1:1' | '9:16' | '16:9' | '4:5' | '3:4' | '2:3';
export type ImageStyle =
  | 'photographic'
  | 'illustration'
  | 'minimal'
  | '3d-render'
  | 'flat-design'
  | 'anime'
  | 'cinematic'
  | 'cyberpunk';

export interface FalGenerationInput {
  prompt: string;
  negativePrompt?: string;
  aspectRatio?: AspectRatio;
  style?: ImageStyle;
  model?: FalModel;
  numImages?: number; // default 1
  seed?: number;
  guidanceScale?: number; // 1-20
  steps?: number; // 1-50
  // Referencias visuales (image-to-image o inspiración)
  referenceImageUrl?: string;
  referenceWeight?: number; // 0-1
  // Plantilla preset
  preset?: 'instagram-post' | 'instagram-story' | 'instagram-reel-cover' | 'carousel-slide' | 'youtube-thumbnail';
}

export interface FalGenerationResult {
  ok: boolean;
  images: Array<{ url: string; width: number; height: number; seed: number }>;
  model: FalModel;
  durationMs: number;
  costUsd: number;
  prompt: string;
  error?: string;
}

// ── Configuración ─────────────────────────────────────────────────────────────

const FAL_API_KEY = process.env['FAL_AI_API_KEY'] ?? process.env['FAL_KEY'] ?? '';
const FAL_BASE = 'https://fal.run';

export const isFalAvailable = (): boolean => Boolean(FAL_API_KEY);

// Mapeo modelo → endpoint
const modelEndpoint: Record<FalModel, string> = {
  'nano-banana-2': '/fal-ai/nano-banana-2',
  'flux-pro': '/fal-ai/flux-pro/v1.1',
  'flux-schnell': '/fal-ai/flux/schnell',
  'sdxl-turbo': '/fal-ai/fast-sdxl',
  'ideogram-v3': '/fal-ai/ideogram/v3',
  'recraft-v3': '/fal-ai/recraft-v3',
  'imagen-3': '/fal-ai/imagen-3',
};

// Costo estimado por imagen
const modelCostUsd: Record<FalModel, number> = {
  'nano-banana-2': 0.04,
  'flux-pro': 0.05,
  'flux-schnell': 0.003,
  'sdxl-turbo': 0.005,
  'ideogram-v3': 0.045,
  'recraft-v3': 0.04,
  'imagen-3': 0.06,
};

// Aspect ratio → dimensiones físicas
const aspectDimensions: Record<AspectRatio, { width: number; height: number }> = {
  '1:1': { width: 1024, height: 1024 },
  '9:16': { width: 1024, height: 1792 },
  '16:9': { width: 1792, height: 1024 },
  '4:5': { width: 1024, height: 1280 },
  '3:4': { width: 1024, height: 1365 },
  '2:3': { width: 1024, height: 1536 },
};

// Preset → configuración
const presetConfigs: Record<NonNullable<FalGenerationInput['preset']>, Partial<FalGenerationInput>> = {
  'instagram-post': { aspectRatio: '4:5', model: 'nano-banana-2' },
  'instagram-story': { aspectRatio: '9:16', model: 'flux-pro' },
  'instagram-reel-cover': { aspectRatio: '9:16', model: 'nano-banana-2' },
  'carousel-slide': { aspectRatio: '4:5', model: 'recraft-v3' },
  'youtube-thumbnail': { aspectRatio: '16:9', model: 'ideogram-v3' },
};

// ── Generación principal ──────────────────────────────────────────────────────

export const generateImage = async (input: FalGenerationInput): Promise<FalGenerationResult> => {
  const start = Date.now();

  // Aplicar preset
  let cfg: FalGenerationInput = { ...input };
  if (cfg.preset && presetConfigs[cfg.preset]) {
    cfg = { ...presetConfigs[cfg.preset], ...cfg };
  }
  const model = cfg.model ?? 'nano-banana-2';
  const aspectRatio = cfg.aspectRatio ?? '4:5';
  const dims = aspectDimensions[aspectRatio];
  const numImages = cfg.numImages ?? 1;

  // Modo dryRun o sin API key
  if (env.dryRun || !isFalAvailable()) {
    log.warn(`[FalAi] MOCK: dryRun o sin API key. Modelo: ${model}, prompt: "${cfg.prompt.slice(0, 60)}..."`);
    return {
      ok: true,
      images: Array.from({ length: numImages }, () => ({
        url: `https://mock-fal-cdn.example.com/img-${Date.now()}-${Math.floor(Math.random() * 9999)}.jpg`,
        width: dims.width,
        height: dims.height,
        seed: cfg.seed ?? Math.floor(Math.random() * 10_000_000),
      })),
      model,
      durationMs: Date.now() - start,
      costUsd: modelCostUsd[model] * numImages,
      prompt: cfg.prompt,
    };
  }

  log.info(`[FalAi] Generando ${numImages} imagen(es) con ${model} (${aspectRatio})...`);

  const endpoint = modelEndpoint[model];
  const requestBody: Record<string, unknown> = {
    prompt: cfg.prompt,
    image_size: { width: dims.width, height: dims.height },
    num_images: numImages,
    num_inference_steps: cfg.steps ?? 28,
    guidance_scale: cfg.guidanceScale ?? 7.5,
  };
  if (cfg.seed) requestBody['seed'] = cfg.seed;
  if (cfg.negativePrompt) requestBody['negative_prompt'] = cfg.negativePrompt;
  if (cfg.referenceImageUrl) {
    requestBody['image_url'] = cfg.referenceImageUrl;
    requestBody['strength'] = cfg.referenceWeight ?? 0.7;
  }

  try {
    const response = await fetch(`${FAL_BASE}${endpoint}`, {
      method: 'POST',
      headers: {
        Authorization: `Key ${FAL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errText = await response.text();
      log.error(`[FalAi] Error HTTP ${response.status}: ${errText.slice(0, 200)}`);
      return {
        ok: false,
        images: [],
        model,
        durationMs: Date.now() - start,
        costUsd: 0,
        prompt: cfg.prompt,
        error: `HTTP ${response.status}: ${errText.slice(0, 200)}`,
      };
    }

    const data = (await response.json()) as {
      images?: Array<{ url: string; width?: number; height?: number; content_type?: string }>;
      seed?: number;
    };

    const images = (data.images ?? []).map((img) => ({
      url: img.url,
      width: img.width ?? dims.width,
      height: img.height ?? dims.height,
      seed: data.seed ?? Math.floor(Math.random() * 10_000_000),
    }));

    const result: FalGenerationResult = {
      ok: true,
      images,
      model,
      durationMs: Date.now() - start,
      costUsd: modelCostUsd[model] * images.length,
      prompt: cfg.prompt,
    };
    log.info(
      `[FalAi] ✓ ${images.length} imagen(es) generadas en ${result.durationMs}ms (${result.costUsd.toFixed(3)} USD)`,
    );
    return result;
  } catch (err) {
    const msg = (err as Error).message;
    log.error(`[FalAi] Error de red: ${msg}`);
    return {
      ok: false,
      images: [],
      model,
      durationMs: Date.now() - start,
      costUsd: 0,
      prompt: cfg.prompt,
      error: msg,
    };
  }
};

// ── Generación batch (carruseles, A/B testing) ───────────────────────────────

export const generateBatch = async (
  prompts: Array<{ prompt: string; preset?: FalGenerationInput['preset']; aspectRatio?: AspectRatio }>,
  baseConfig: Partial<FalGenerationInput> = {},
): Promise<FalGenerationResult[]> => {
  log.info(`[FalAi] Batch de ${prompts.length} imágenes`);
  const results = await Promise.all(
    prompts.map((p) =>
      generateImage({
        ...baseConfig,
        prompt: p.prompt,
        preset: p.preset ?? baseConfig.preset,
        aspectRatio: p.aspectRatio ?? baseConfig.aspectRatio,
      }),
    ),
  );
  return results;
};

// ── Prompt engineering (construir buen prompt visual) ───────────────────────

export interface VisualBriefInput {
  subject: string; // qué se muestra
  style?: ImageStyle;
  mood?: string; // ej: "minimalista", "vibrante", "premium"
  brandColors?: string[]; // ej: ["#3FB8C9", "#E85A2C"]
  composition?: string; // ej: "primer plano centrado", "regla de tercios"
  lighting?: string; // ej: "luz natural", "estudio", "dramática"
  textOverlay?: string; // texto a integrar (Ideogram-v3 lo hace bien)
  forbidden?: string[]; // elementos a evitar
}

export const buildPromptFromBrief = (
  brief: VisualBriefInput,
): { prompt: string; negativePrompt: string; suggestedModel: FalModel } => {
  const parts: string[] = [brief.subject];

  if (brief.style) parts.push(`estilo ${brief.style}`);
  if (brief.mood) parts.push(`mood ${brief.mood}`);
  if (brief.composition) parts.push(brief.composition);
  if (brief.lighting) parts.push(`iluminación ${brief.lighting}`);
  if (brief.brandColors) parts.push(`paleta de color: ${brief.brandColors.join(', ')}`);
  if (brief.textOverlay) parts.push(`con el texto "${brief.textOverlay}" integrado tipográficamente, legible`);

  parts.push('alta calidad', 'detallado', '4K', 'composición editorial');

  const negativeBase = [
    'baja calidad',
    'borroso',
    'pixelado',
    'distorsionado',
    'mal anatomía',
    'texto ilegible',
    'marca de agua',
  ];
  if (brief.forbidden) negativeBase.push(...brief.forbidden);

  const suggestedModel: FalModel = brief.textOverlay
    ? 'ideogram-v3' // mejor para texto integrado
    : brief.style === 'photographic'
      ? 'nano-banana-2' // mejor para fotorrealismo
      : brief.style === 'illustration' || brief.style === 'flat-design'
        ? 'recraft-v3' // mejor para ilustración
        : 'flux-pro';

  return {
    prompt: parts.join(', '),
    negativePrompt: negativeBase.join(', '),
    suggestedModel,
  };
};

// ── Generación de carrusel completo ──────────────────────────────────────────

export interface CarouselSlideInput {
  slideNumber: number;
  title: string;
  body?: string;
  visualConcept: string;
}

export const generateCarousel = async (
  slides: CarouselSlideInput[],
  baseStyle: VisualBriefInput,
): Promise<{ slides: Array<{ slideNumber: number; image: FalGenerationResult }>; totalCostUsd: number }> => {
  log.info(`[FalAi] Generando carrusel de ${slides.length} slides`);
  const results = await Promise.all(
    slides.map(async (s) => {
      const brief: VisualBriefInput = {
        ...baseStyle,
        subject: s.visualConcept,
        textOverlay: s.title,
      };
      const { prompt, negativePrompt, suggestedModel } = buildPromptFromBrief(brief);
      const image = await generateImage({
        prompt,
        negativePrompt,
        model: suggestedModel,
        preset: 'carousel-slide',
      });
      return { slideNumber: s.slideNumber, image };
    }),
  );
  const totalCostUsd = results.reduce((s, r) => s + r.image.costUsd, 0);
  return { slides: results, totalCostUsd };
};

// ── Catálogo de modelos disponibles ──────────────────────────────────────────

export const listAvailableModels = (): Array<{
  id: FalModel;
  name: string;
  bestFor: string;
  costUsd: number;
  speedScore: number; // 1-10
  qualityScore: number; // 1-10
}> => [
  {
    id: 'nano-banana-2',
    name: 'Nano Banana 2 (Google)',
    bestFor: 'Fotorrealismo, productos, lifestyle',
    costUsd: 0.04,
    speedScore: 7,
    qualityScore: 10,
  },
  {
    id: 'flux-pro',
    name: 'Flux Pro 1.1',
    bestFor: 'Composiciones complejas, premium',
    costUsd: 0.05,
    speedScore: 6,
    qualityScore: 10,
  },
  {
    id: 'flux-schnell',
    name: 'Flux Schnell',
    bestFor: 'Drafts rápidos, iteración masiva',
    costUsd: 0.003,
    speedScore: 10,
    qualityScore: 7,
  },
  {
    id: 'sdxl-turbo',
    name: 'SDXL Turbo',
    bestFor: 'Balance velocidad/calidad genérica',
    costUsd: 0.005,
    speedScore: 9,
    qualityScore: 7,
  },
  {
    id: 'ideogram-v3',
    name: 'Ideogram V3',
    bestFor: 'Texto integrado en imagen, tipografía',
    costUsd: 0.045,
    speedScore: 6,
    qualityScore: 9,
  },
  {
    id: 'recraft-v3',
    name: 'Recraft V3',
    bestFor: 'Estilos ilustrados, flat design',
    costUsd: 0.04,
    speedScore: 7,
    qualityScore: 9,
  },
  {
    id: 'imagen-3',
    name: 'Imagen 3 (Google)',
    bestFor: 'Calidad fotográfica premium',
    costUsd: 0.06,
    speedScore: 5,
    qualityScore: 10,
  },
];

// ── Tracking de gasto ────────────────────────────────────────────────────────

const spendingLog: Array<{ at: string; model: FalModel; costUsd: number }> = [];

export const trackSpending = (result: FalGenerationResult): void => {
  if (result.ok && result.costUsd > 0) {
    spendingLog.push({ at: new Date().toISOString(), model: result.model, costUsd: result.costUsd });
    if (spendingLog.length > 1000) spendingLog.shift();
  }
};

export const getSpendingSummary = (): {
  totalUsd: number;
  byModel: Record<string, number>;
  last7DaysUsd: number;
  entries: number;
} => {
  const cutoff = Date.now() - 7 * 86400000;
  const last7 = spendingLog.filter((e) => new Date(e.at).getTime() >= cutoff);
  const byModel: Record<string, number> = {};
  for (const e of spendingLog) {
    byModel[e.model] = (byModel[e.model] ?? 0) + e.costUsd;
  }
  return {
    totalUsd: spendingLog.reduce((s, e) => s + e.costUsd, 0),
    byModel,
    last7DaysUsd: last7.reduce((s, e) => s + e.costUsd, 0),
    entries: spendingLog.length,
  };
};
