/**
 * Stories Studio de FeedIA — fábrica de stories diarias con interactividad.
 *
 * Reemplaza al CM que cada día tiene que subir 3-7 stories. Genera secuencias
 * narrativas con polls, questions, quizzes, emoji sliders, countdowns y stickers
 * de mention/hashtag/location.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { log } from '../../agent/logger.js';
import { askJson as routerAskJson } from '../../agent/tokenRouter.js';
import { generateImage as falGenerateImage, type FalModel } from '../../integrations/falAi.js';
import { uploadToSocial } from '../../integrations/uploadPost.js';
import { extractPatterns } from '../analytics/performanceDB.js';
import { env } from '../../config/index.js';
import type { BrandProfile } from '../../config/types.js';

const STORIES_PATH = join(process.cwd(), 'data', 'community', 'stories.json');

// ── Tipos ─────────────────────────────────────────────────────────────────────

export type StoryStickerType =
  | 'poll' // binaria sí/no o A/B
  | 'question' // pregunta abierta
  | 'quiz' // multiple choice con respuesta correcta
  | 'emoji-slider' // medir intensidad con un emoji
  | 'countdown' // cuenta regresiva a una fecha
  | 'mention' // @cuenta
  | 'hashtag' // #
  | 'location' // ubicación
  | 'music' // audio
  | 'link' // link sticker
  | 'donation'; // sticker de donación

export interface StorySticker {
  type: StoryStickerType;
  text?: string;
  options?: string[]; // para poll/quiz
  correctOption?: number; // para quiz
  emoji?: string; // para emoji slider
  countdownTo?: string; // ISO date
  mention?: string;
  hashtag?: string;
  location?: string;
  linkUrl?: string;
}

export type StorySlideRole =
  | 'hook' // captura atención
  | 'context' // setup
  | 'value' // entrega del valor
  | 'interaction' // pide interacción
  | 'cta'; // cierre con CTA

export interface StorySlide {
  slideNumber: number;
  role: StorySlideRole;
  visualConcept: string;
  textOverlay: string;
  stickers: StorySticker[];
  durationSeconds: number; // 1-15 segundos por story
  audioMood?: string;
}

export interface StorySequence {
  id: string;
  title: string; // título interno (no se muestra)
  theme: string;
  intent: 'engagement' | 'awareness' | 'sales' | 'community' | 'announcement' | 'behind-the-scenes';
  slides: StorySlide[];
  scheduledFor?: string; // ISO
  status: 'draft' | 'approved' | 'scheduled' | 'published' | 'expired';
  generatedImageUrls: string[];
  publishedTo?: {
    instagram?: { uploadId: string; publishedAt: string };
    tiktok?: { uploadId: string; publishedAt: string };
  };
  metrics?: {
    impressions: number;
    reach: number;
    interactions: number;
    completionRate: number;
    swipeAwayRate: number;
  };
  createdAt: string;
  brandSnapshot: { name: string; niche: string };
}

interface StoriesStore {
  version: number;
  sequences: StorySequence[];
  preferredStickerMix: Record<StoryStickerType, number>;
  lastUpdated: string;
}

const DEFAULT_STORE: StoriesStore = {
  version: 1,
  sequences: [],
  preferredStickerMix: {
    poll: 20,
    question: 15,
    quiz: 10,
    'emoji-slider': 10,
    countdown: 5,
    mention: 5,
    hashtag: 10,
    location: 5,
    music: 10,
    link: 5,
    donation: 5,
  },
  lastUpdated: new Date().toISOString(),
};

// ── Persistencia ──────────────────────────────────────────────────────────────

const ensureDir = (): void => {
  const dir = join(process.cwd(), 'data', 'community');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
};

const loadStories = (): StoriesStore => {
  try {
    ensureDir();
    if (!existsSync(STORIES_PATH)) return structuredClone(DEFAULT_STORE);
    return JSON.parse(readFileSync(STORIES_PATH, 'utf8')) as StoriesStore;
  } catch {
    return structuredClone(DEFAULT_STORE);
  }
};

const saveStories = (store: StoriesStore): void => {
  ensureDir();
  store.lastUpdated = new Date().toISOString();
  writeFileSync(STORIES_PATH, JSON.stringify(store, null, 2), 'utf8');
};

// ── Plantillas narrativas por intent ─────────────────────────────────────────

const SEQUENCE_TEMPLATES: Record<
  StorySequence['intent'],
  { slideRoles: StorySlideRole[]; recommendedStickers: StoryStickerType[]; description: string }
> = {
  engagement: {
    slideRoles: ['hook', 'interaction', 'interaction', 'value', 'cta'],
    recommendedStickers: ['poll', 'question', 'emoji-slider'],
    description: 'Maximiza interacciones y replies — el algoritmo lo recompensa',
  },
  awareness: {
    slideRoles: ['hook', 'context', 'value', 'value', 'cta'],
    recommendedStickers: ['hashtag', 'mention', 'music', 'location'],
    description: 'Da contexto a la marca, ideal para nuevos seguidores',
  },
  sales: {
    slideRoles: ['hook', 'context', 'value', 'cta'],
    recommendedStickers: ['link', 'countdown', 'poll'],
    description: 'Hacia conversión, con countdown y link',
  },
  community: {
    slideRoles: ['hook', 'interaction', 'value', 'interaction', 'cta'],
    recommendedStickers: ['question', 'mention', 'emoji-slider', 'poll'],
    description: 'Reforzar pertenencia, generar conversación',
  },
  announcement: {
    slideRoles: ['hook', 'value', 'context', 'cta'],
    recommendedStickers: ['countdown', 'mention', 'hashtag', 'music'],
    description: 'Anuncio importante de marca o producto',
  },
  'behind-the-scenes': {
    slideRoles: ['hook', 'context', 'context', 'interaction', 'cta'],
    recommendedStickers: ['question', 'poll', 'music', 'location'],
    description: 'Detrás de escena humaniza la marca',
  },
};

// ── Generación de la secuencia ────────────────────────────────────────────────

export interface CreateSequenceInput {
  intent: StorySequence['intent'];
  topic: string;
  slideCount?: number;
  scheduledFor?: string;
  customStickers?: StoryStickerType[];
  generateImages?: boolean;
}

export const createStorySequence = async (input: CreateSequenceInput, brand: BrandProfile): Promise<StorySequence> => {
  const template = SEQUENCE_TEMPLATES[input.intent];
  const slideCount = input.slideCount ?? template.slideRoles.length;
  const stickers = input.customStickers ?? template.recommendedStickers;

  log.info(
    `[StoriesStudio] Generando secuencia de ${slideCount} stories sobre "${input.topic}" (intent: ${input.intent})`,
  );

  const patterns = extractPatterns();
  const winningTopics = patterns.topTopics
    .slice(0, 3)
    .map((t) => t.topic)
    .join(', ');

  const prompt = `Diseñá una secuencia de ${slideCount} stories de Instagram con narrativa coherente y stickers interactivos.

MARCA: ${brand.name} | Nicho: ${brand.niche}
AUDIENCIA: ${brand.audience.description}
TONO: ${brand.voice.tone.join(', ')}

TEMA: ${input.topic}
INTENT: ${input.intent} (${template.description})
ROLES DE CADA SLIDE: ${template.slideRoles.join(' → ')}
STICKERS DISPONIBLES: ${stickers.join(', ')}
${winningTopics ? `TEMAS QUE FUNCIONARON RECIENTEMENTE: ${winningTopics}` : ''}

Reglas para stories:
- Slide 1 (hook): primera línea irresistible, texto grande, 1-2 líneas máximo
- Slides intermedios: una idea por story
- Slide final (CTA): pedir acción concreta
- Interactividad: al menos 2 stickers en la secuencia (poll, question, quiz, emoji-slider)
- Cada texto en pantalla MAX 30 caracteres por línea, MAX 3 líneas

JSON:
{
  "title": "título interno de la secuencia",
  "slides": [
    {
      "slideNumber": 1,
      "role": "${template.slideRoles[0] ?? 'hook'}",
      "visualConcept": "descripción para generar imagen (qué se ve)",
      "textOverlay": "texto encima del visual",
      "stickers": [
        { "type": "poll", "text": "¿pregunta?", "options": ["opción A", "opción B"] }
      ],
      "durationSeconds": 6,
      "audioMood": "energético | íntimo | dramático | divertido | (opcional)"
    }
  ]
}`;

  const result = await routerAskJson<{
    title: string;
    slides: StorySlide[];
  }>(prompt, {
    taskType: 'creative',
    maxTokens: 3500,
    systemPrompt:
      'Sos un creative director de stories de Instagram. Tus secuencias generan interacción real y mantienen attention.',
  });

  const sequence: StorySequence = {
    id: `story-seq-${Date.now()}-${Math.floor(Math.random() * 999)}`,
    title: result.title,
    theme: input.topic,
    intent: input.intent,
    slides: result.slides,
    scheduledFor: input.scheduledFor,
    status: input.generateImages ? 'draft' : 'draft',
    generatedImageUrls: [],
    createdAt: new Date().toISOString(),
    brandSnapshot: { name: brand.name, niche: brand.niche },
  };

  // Generar imágenes si se solicita
  if (input.generateImages ?? true) {
    log.info(`[StoriesStudio] Generando ${sequence.slides.length} imágenes con Fal.ai...`);
    const imageResults = await Promise.all(
      sequence.slides.map(async (slide) => {
        const imagePrompt = `${slide.visualConcept}, ${brand.visual.mood ?? 'profesional'}, paleta ${brand.visual.palette.join(', ') || 'neutra'}, formato story 9:16, ${slide.textOverlay ? `con el texto "${slide.textOverlay}" integrado tipográficamente` : ''}`;
        const model: FalModel = slide.textOverlay && slide.textOverlay.length > 5 ? 'ideogram-v3' : 'nano-banana-2';
        return falGenerateImage({
          prompt: imagePrompt,
          aspectRatio: '9:16',
          model,
          preset: 'instagram-story',
        });
      }),
    );

    sequence.generatedImageUrls = imageResults.map((r) => r.images[0]?.url ?? '').filter((u) => u);
  }

  const store = loadStories();
  store.sequences.push(sequence);
  saveStories(store);

  return sequence;
};

// ── Publicar la secuencia ─────────────────────────────────────────────────────

export const publishSequence = async (
  sequenceId: string,
  scheduleAt?: string,
): Promise<{
  ok: boolean;
  publishedSlides: number;
  failedSlides: number;
  uploadIds: string[];
}> => {
  if (env.dryRun) {
    log.warn('[StoriesStudio] DRY RUN: simulando publicación');
    return { ok: true, publishedSlides: 0, failedSlides: 0, uploadIds: [`mock-upload-${Date.now()}`] };
  }

  const store = loadStories();
  const sequence = store.sequences.find((s) => s.id === sequenceId);
  if (!sequence) return { ok: false, publishedSlides: 0, failedSlides: 0, uploadIds: [] };

  if (sequence.generatedImageUrls.length === 0) {
    log.warn('[StoriesStudio] La secuencia no tiene imágenes generadas');
    return { ok: false, publishedSlides: 0, failedSlides: sequence.slides.length, uploadIds: [] };
  }

  const uploadIds: string[] = [];
  let published = 0;
  let failed = 0;

  for (let i = 0; i < sequence.slides.length; i++) {
    const slide = sequence.slides[i]!;
    const imageUrl = sequence.generatedImageUrls[i];
    if (!imageUrl) {
      failed++;
      continue;
    }

    try {
      const result = await uploadToSocial({
        platforms: ['instagram'],
        mediaType: 'story',
        mediaUrls: [imageUrl],
        caption: slide.textOverlay,
        scheduleAt: scheduleAt && i === 0 ? scheduleAt : undefined,
        postId: `${sequence.id}-slide-${i + 1}`,
      });
      uploadIds.push(result.uploadId);
      if (result.ok) published++;
      else failed++;
    } catch (err) {
      log.warn(`[StoriesStudio] Slide ${i + 1} falló: ${(err as Error).message}`);
      failed++;
    }
  }

  sequence.status = published > 0 ? 'published' : sequence.status;
  if (published > 0 && !sequence.publishedTo) {
    sequence.publishedTo = {
      instagram: {
        uploadId: uploadIds[0] ?? '',
        publishedAt: new Date().toISOString(),
      },
    };
  }
  saveStories(store);

  log.info(`[StoriesStudio] Publicada secuencia ${sequenceId}: ${published}/${sequence.slides.length} slides ok`);
  return { ok: published > 0, publishedSlides: published, failedSlides: failed, uploadIds };
};

// ── Plan automático del día ───────────────────────────────────────────────────

export const planDailyStories = async (brand: BrandProfile): Promise<StorySequence[]> => {
  log.info(`[StoriesStudio] Planificando stories del día para @${brand.name}`);

  // Por defecto: 3 secuencias diarias con intents distintos
  const dailyMix: Array<{ intent: StorySequence['intent']; hour: number; topicHint: string }> = [
    { intent: 'engagement', hour: 10, topicHint: 'pregunta del día / poll para interactuar' },
    { intent: 'value', hour: 14, topicHint: 'tip o valor educativo del nicho' },
    { intent: 'community', hour: 19, topicHint: 'reflexión, BTS o conversación nocturna' },
  ].map((d) => ({ ...d, intent: d.intent as StorySequence['intent'] }));

  // Generar temas con AI
  const topicPrompt = `Generá 3 temas frescos para stories de hoy de @${brand.name} (${brand.niche}).
Audiencia: ${brand.audience.description}
Tono: ${brand.voice.tone.join(', ')}

Cada tema corresponde a una secuencia distinta:
1. Engagement (mañana): algo conversacional, una pregunta o poll
2. Value (mediodía): un tip o aprendizaje rápido del nicho
3. Community (noche): reflexión, behind-the-scenes o pregunta más íntima

JSON: { "topics": ["tema 1", "tema 2", "tema 3"] }`;

  const topicResult = await routerAskJson<{ topics: string[] }>(topicPrompt, {
    taskType: 'creative',
    maxTokens: 600,
    freeOnly: true,
  }).catch(() => ({ topics: dailyMix.map((d) => d.topicHint) }));

  const sequences: StorySequence[] = [];
  for (let i = 0; i < dailyMix.length; i++) {
    const config = dailyMix[i]!;
    const topic = topicResult.topics[i] ?? config.topicHint;
    const now = new Date();
    const scheduledFor = new Date(now.getFullYear(), now.getMonth(), now.getDate(), config.hour, 0, 0).toISOString();

    const seq = await createStorySequence(
      {
        intent: config.intent,
        topic,
        slideCount: SEQUENCE_TEMPLATES[config.intent].slideRoles.length,
        scheduledFor,
        generateImages: true,
      },
      brand,
    );
    sequences.push(seq);
  }

  log.info(`[StoriesStudio] Plan diario generado: ${sequences.length} secuencias`);
  return sequences;
};

// ── Cálculo de métricas post-publicación ─────────────────────────────────────

export const recordSequenceMetrics = (
  sequenceId: string,
  metrics: NonNullable<StorySequence['metrics']>,
): StorySequence | null => {
  const store = loadStories();
  const seq = store.sequences.find((s) => s.id === sequenceId);
  if (!seq) return null;
  seq.metrics = metrics;
  saveStories(store);
  return seq;
};

// ── Consultas ────────────────────────────────────────────────────────────────

export const listSequences = (
  filters: { status?: StorySequence['status']; intent?: StorySequence['intent']; limit?: number } = {},
): StorySequence[] => {
  let seqs = loadStories().sequences;
  if (filters.status) seqs = seqs.filter((s) => s.status === filters.status);
  if (filters.intent) seqs = seqs.filter((s) => s.intent === filters.intent);
  seqs = seqs.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return filters.limit ? seqs.slice(0, filters.limit) : seqs;
};

export const getSequence = (sequenceId: string): StorySequence | null =>
  loadStories().sequences.find((s) => s.id === sequenceId) ?? null;

export const getStoriesSnapshot = (): {
  totalSequences: number;
  publishedLast7Days: number;
  scheduledUpcoming: number;
  avgInteractionsPerSeq: number;
  byIntent: Record<string, number>;
} => {
  const store = loadStories();
  const cutoff = new Date(Date.now() - 7 * 86400000).toISOString();
  const recent = store.sequences.filter((s) => s.status === 'published' && s.createdAt >= cutoff);
  const scheduled = store.sequences.filter((s) => s.status === 'scheduled');

  const byIntent: Record<string, number> = {};
  for (const s of store.sequences) {
    byIntent[s.intent] = (byIntent[s.intent] ?? 0) + 1;
  }

  const withMetrics = store.sequences.filter((s) => s.metrics);
  const avgInteractions =
    withMetrics.length > 0
      ? withMetrics.reduce((sum, s) => sum + (s.metrics?.interactions ?? 0), 0) / withMetrics.length
      : 0;

  return {
    totalSequences: store.sequences.length,
    publishedLast7Days: recent.length,
    scheduledUpcoming: scheduled.length,
    avgInteractionsPerSeq: avgInteractions,
    byIntent,
  };
};

export const exportStories = (): StoriesStore => loadStories();
