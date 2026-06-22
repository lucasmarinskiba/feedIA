// @ts-nocheck
/**
 * TikTok Content Adapter — Adapta contenido de Instagram a formato nativo TikTok.
 * TikTok premia: 9:16 vertical, hooks en <1s, texto grande, sonidos trending, <21s.
 */

import type { BrandProfile } from '../../config/types.js';
import type { ReelScript } from '../content/reel.js';
import type { CarruselResult } from '../content/carrusel.js';
import { recommendTemplate, type TikTokTemplate } from './videoTemplates.js';
import { suggestSoundForContent } from './soundSync.js';
import { fetchTikTokTrends } from './trendEngine.js';

export interface TikTokContentPlan {
  platform: 'tiktok';
  adaptedCaption: string;
  hashtags: string[];
  durationSec: number;
  aspectRatio: '9:16';
  template: TikTokTemplate;
  sound: { name: string; bpm: number; reason: string };
  trendingHashtags: string[];
  textOverlayStrategy: string;
  hookRewrite: string;
  ctaRewrite: string;
  originalFormat: 'reel' | 'carrusel';
}

const MAX_TIKTOK_CAPTION_LENGTH = 2200;
const TARGET_TIKTOK_DURATION_SEC = 21;

const rewriteHookForTikTok = (hook: string): string => {
  const clean = hook.replace(/[.!?]+$/, '').trim();
  if (clean.length <= 60) return clean;
  return `${clean.slice(0, 57)}...`;
};

const rewriteCtaForTikTok = (cta?: string): string => {
  if (!cta) return '¿Qué opinás? Comentá 👇';
  const lower = cta.toLowerCase();
  if (lower.includes('link') || lower.includes('bio')) return 'Más info en mi perfil 👆';
  if (lower.includes('compra') || lower.includes('shop')) return 'Guardá esto para después 💾';
  return '¿Te pasó? Contame en los comentarios 👇';
};

export const adaptReelToTikTok = async (brand: BrandProfile, reel: ReelScript): Promise<TikTokContentPlan> => {
  const contentType = brand.voice?.contentPillars?.[0] ?? 'education';
  const template = recommendTemplate(contentType, reel.duracionSeg ?? 30);
  const sound = suggestSoundForContent(contentType, TARGET_TIKTOK_DURATION_SEC);
  const trends = await fetchTikTokTrends({ type: 'hashtag', limit: 5 });
  const trendingHashtags = trends.map((t) => t.name).slice(0, 3);

  const adaptedCaption = `${reel.hookVisual}\n\n${reel.cta ? reel.cta : ''}`.slice(0, MAX_TIKTOK_CAPTION_LENGTH);

  return {
    platform: 'tiktok',
    adaptedCaption,
    hashtags: [`#${brand.handle ?? brand.name.replace(/\s+/g, '')}`, ...trendingHashtags, '#fyp', '#viral', '#parati'],
    durationSec: Math.min(reel.duracionSegundos ?? 30, TARGET_TIKTOK_DURATION_SEC),
    aspectRatio: '9:16',
    template,
    sound,
    trendingHashtags,
    textOverlayStrategy: 'Texto grande en primer 1s, sincronizado a beat drops. Máx 5 palabras por overlay.',
    hookRewrite: rewriteHookForTikTok(reel.hookVisual),
    ctaRewrite: rewriteCtaForTikTok(reel.cta),
    originalFormat: 'reel',
  };
};

export const adaptCarruselToTikTok = async (
  brand: BrandProfile,
  carrusel: CarruselResult,
): Promise<TikTokContentPlan> => {
  const contentType = brand.voice?.contentPillars?.[0] ?? 'education';
  const template = recommendTemplate(contentType, TARGET_TIKTOK_DURATION_SEC);
  const sound = suggestSoundForContent(contentType, TARGET_TIKTOK_DURATION_SEC);
  const trends = await fetchTikTokTrends({ type: 'hashtag', limit: 5 });
  const trendingHashtags = trends.map((t) => t.name).slice(0, 3);

  const firstSlide = carrusel.slides[0];
  const hook = firstSlide?.titulo ?? brand.name;
  const cta = carrusel.cta ?? firstSlide?.titulo ?? '';

  return {
    platform: 'tiktok',
    adaptedCaption: `${hook}\n\n${cta}`.slice(0, MAX_TIKTOK_CAPTION_LENGTH),
    hashtags: [`#${brand.handle ?? brand.name.replace(/\s+/g, '')}`, ...trendingHashtags, '#fyp', '#viral', '#tips'],
    durationSec: TARGET_TIKTOK_DURATION_SEC,
    aspectRatio: '9:16',
    template,
    sound,
    trendingHashtags,
    textOverlayStrategy: 'Convertir cada slide en frame de 3-4s con texto animado. Hook en frame 0.',
    hookRewrite: rewriteHookForTikTok(hook),
    ctaRewrite: rewriteCtaForTikTok(cta),
    originalFormat: 'carrusel',
  };
};

export const adaptContentToTikTok = async (
  brand: BrandProfile,
  content: { reel?: ReelScript; carrusel?: CarruselResult },
): Promise<TikTokContentPlan> => {
  if (content.reel) return adaptReelToTikTok(brand, content.reel);
  if (content.carrusel) return adaptCarruselToTikTok(brand, content.carrusel);
  throw new Error('TikTok adapter requires reel or carrusel content');
};
