// @ts-nocheck
/**
 * Multi-Format Adapter — 1 contenido → N formatos automáticamente.
 *
 * Toma un contenido base (ej: un blog post, un reel, un tema) y lo adapta
 * a TODOS los formatos de Instagram al mismo tiempo:
 *   - Carrusel (10 slides)
 *   - Reel (60s)
 *   - Stories (serie de 5)
 *   - Post estático con caption largo
 *   - Highlight para guardar
 *   - DM script para enviar a clientes
 *
 * Reemplaza al equipo entero de repurposing.
 */

import Anthropic from '@anthropic-ai/sdk';
import { log } from '../../agent/logger.js';
import type { BrandProfile } from '../../config/types.js';

const client = new Anthropic();
const MODEL = 'claude-opus-4-7';

// ── Tipos ─────────────────────────────────────────────────────────────────────

export type ContentFormat =
  | 'carousel'
  | 'reel'
  | 'story-series'
  | 'static-post'
  | 'highlight'
  | 'dm-script'
  | 'youtube-short'
  | 'tiktok'
  | 'twitter-thread'
  | 'linkedin-post'
  | 'newsletter';

export interface CarouselAdaptation {
  format: 'carousel';
  slides: Array<{ slideNumber: number; text: string; designNote: string }>;
  caption: string;
  hashtags: string[];
}

export interface ReelAdaptation {
  format: 'reel';
  hook: string;
  durationSec: number;
  script: Array<{ sec: number; visual: string; text: string }>;
  audioStrategy: string;
  caption: string;
}

export interface StorySeriesAdaptation {
  format: 'story-series';
  storyCount: number;
  stories: Array<{
    storyNumber: number;
    type: 'photo' | 'video' | 'text' | 'poll' | 'quiz' | 'question';
    content: string;
    interactiveElement?: string;
  }>;
}

export interface StaticPostAdaptation {
  format: 'static-post';
  caption: string;
  hashtags: string[];
  imageDirection: string;
}

export interface HighlightAdaptation {
  format: 'highlight';
  highlightName: string;
  coverDescription: string;
  storiesIncluded: string[];
}

export interface DMScriptAdaptation {
  format: 'dm-script';
  intro: string;
  middle: string;
  closing: string;
  variants: Record<'cold' | 'warm' | 'hot', string>;
}

export interface CrossPlatformAdaptation {
  youtubeShort: { title: string; hook: string; script: string };
  tiktok: { hook: string; trendingSound: string; script: string };
  twitterThread: { tweets: string[] };
  linkedinPost: { headline: string; body: string };
  newsletter: { subject: string; body: string };
}

export type FormatAdaptation =
  | CarouselAdaptation
  | ReelAdaptation
  | StorySeriesAdaptation
  | StaticPostAdaptation
  | HighlightAdaptation
  | DMScriptAdaptation;

export interface AdaptedContent {
  sourceContent: string;
  topic: string;
  brandId: string;
  adaptations: Partial<
    Record<
      ContentFormat,
      | FormatAdaptation
      | CrossPlatformAdaptation['youtubeShort' | 'tiktok' | 'twitterThread' | 'linkedinPost' | 'newsletter']
    >
  >;
  generatedAt: string;
  estimatedTimeSavedHours: number;
}

// ── Adaptación a formatos ─────────────────────────────────────────────────────

/** Adapta un contenido base a múltiples formatos en paralelo. */
export const adaptToMultipleFormats = async (
  brand: BrandProfile,
  source: {
    content: string; // texto base, transcript, idea
    topic: string;
    formats: ContentFormat[];
  },
): Promise<AdaptedContent> => {
  const brandId = brand.id ?? brand.name.toLowerCase().replace(/\s+/g, '-');
  log.info('[multiFormatAdapter] adapting to formats', { brand: brand.name, formats: source.formats });

  const adaptations: AdaptedContent['adaptations'] = {};

  // Ejecutar adaptaciones en paralelo
  const results = await Promise.all(
    source.formats.map(async (format) => {
      const adaptation = await adaptToSingleFormat(brand, source.content, source.topic, format);
      return { format, adaptation };
    }),
  );

  for (const { format, adaptation } of results) {
    if (adaptation) adaptations[format] = adaptation as never;
  }

  return {
    sourceContent: source.content,
    topic: source.topic,
    brandId,
    adaptations,
    generatedAt: new Date().toISOString(),
    estimatedTimeSavedHours: source.formats.length * 1.5,
  };
};

/** Adapta a un solo formato específico. */
export const adaptToSingleFormat = async (
  brand: BrandProfile,
  content: string,
  topic: string,
  format: ContentFormat,
): Promise<FormatAdaptation | Record<string, unknown> | null> => {
  const prompts: Record<ContentFormat, string> = {
    carousel: `Adapta a carrusel de 7-10 slides. JSON: { "slides": [{ "slideNumber": 1, "text": "máx 25 palabras", "designNote": "" }], "caption": "", "hashtags": [] }`,
    reel: `Adapta a Reel de 30s. JSON: { "hook": "primeras 3 palabras", "durationSec": 30, "script": [{ "sec": 0, "visual": "", "text": "" }], "audioStrategy": "", "caption": "" }`,
    'story-series': `Adapta a serie de 5 Stories interactivas. JSON: { "storyCount": 5, "stories": [{ "storyNumber": 1, "type": "photo|video|text|poll|quiz|question", "content": "", "interactiveElement": "" }] }`,
    'static-post': `Adapta a post estático. JSON: { "caption": "150-300 palabras con AIDA", "hashtags": [], "imageDirection": "" }`,
    highlight: `Adapta a highlight permanente. JSON: { "highlightName": "máx 12 chars", "coverDescription": "", "storiesIncluded": [] }`,
    'dm-script': `Adapta a script de DM con 3 variantes (cold/warm/hot). JSON: { "intro": "", "middle": "", "closing": "", "variants": { "cold": "", "warm": "", "hot": "" } }`,
    'youtube-short': `Adapta a YouTube Short (60s). JSON: { "title": "máx 60 chars", "hook": "", "script": "" }`,
    tiktok: `Adapta a TikTok. JSON: { "hook": "", "trendingSound": "tipo de sonido recomendado", "script": "" }`,
    'twitter-thread': `Adapta a thread de Twitter (6-10 tweets). JSON: { "tweets": ["tweet1 (<280 chars)", "tweet2", ...] }`,
    'linkedin-post': `Adapta a post de LinkedIn (profesional). JSON: { "headline": "", "body": "300-500 palabras estructura profesional" }`,
    newsletter: `Adapta a sección de newsletter. JSON: { "subject": "asunto del email", "body": "300-500 palabras" }`,
  };

  const stream = await client.messages.stream({
    model: MODEL,
    max_tokens: 2000,
    thinking: { type: 'adaptive' },
    system: `Especialista en repurposing de contenido para Instagram.
Mantienes la esencia del mensaje pero adaptas TONO, ESTRUCTURA y CTA al formato específico.
Sin frases genéricas de IA. JSON puro.`,
    messages: [
      {
        role: 'user',
        content: `Marca: ${brand.name}
Tono: ${brand.toneOfVoice ?? 'cercano profesional'}
Tema: ${topic}

Contenido base:
"${content}"

${prompts[format]}`,
      },
    ],
  });

  const msg = await stream.finalMessage();
  const textBlock = msg.content.find((b) => b.type === 'text');
  const jsonMatch = textBlock?.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;
  const data = JSON.parse(jsonMatch[0]) as Record<string, unknown>;
  return { format, ...data } as FormatAdaptation;
};

/** Adapta a TODAS las plataformas además de Instagram. */
export const adaptCrossPlatform = async (
  brand: BrandProfile,
  content: string,
  topic: string,
): Promise<CrossPlatformAdaptation> => {
  const [yt, tk, tw, ln, nl] = await Promise.all([
    adaptToSingleFormat(brand, content, topic, 'youtube-short'),
    adaptToSingleFormat(brand, content, topic, 'tiktok'),
    adaptToSingleFormat(brand, content, topic, 'twitter-thread'),
    adaptToSingleFormat(brand, content, topic, 'linkedin-post'),
    adaptToSingleFormat(brand, content, topic, 'newsletter'),
  ]);

  return {
    youtubeShort: (yt ?? {}) as CrossPlatformAdaptation['youtubeShort'],
    tiktok: (tk ?? {}) as CrossPlatformAdaptation['tiktok'],
    twitterThread: (tw ?? {}) as CrossPlatformAdaptation['twitterThread'],
    linkedinPost: (ln ?? {}) as CrossPlatformAdaptation['linkedinPost'],
    newsletter: (nl ?? {}) as CrossPlatformAdaptation['newsletter'],
  };
};
