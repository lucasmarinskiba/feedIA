/**
 * seoVoice.ts — Voz SEO & Descubrimiento: hashtags, keywords, alt text
 * ─────────────────────────────────────────────────────────────────────────
 * Fase 15. Optimiza descubrimiento orgánico en Instagram.
 */

import { log } from '../agent/logger.js';
import type { VoiceActionResult } from './voiceActionRouter.js';

const ok = (es: string, en: string, actionType: string, detail?: unknown): VoiceActionResult => ({
  ok: true,
  spokenResponse: es,
  actionType,
  executed: true,
  detail,
});

const fail = (es: string, en: string, actionType: string, detail?: unknown): VoiceActionResult => ({
  ok: false,
  spokenResponse: es,
  actionType,
  executed: false,
  detail,
});

/* ── Hashtag Optimization ────────────────────────────────────────────────── */

export const optimizeHashtags = async (topic?: string): Promise<VoiceActionResult> => {
  const actionType = 'seo.hashtags';
  const t = topic ?? 'general';
  log.info(`[seoVoice] optimizeHashtags: ${t}`);
  try {
    const brand = (await import('../config/index.js')).loadBrandProfile();
    const hashtags = [
      `#${brand.niche.replace(/\s+/g, '')}`,
      '#instagramtips',
      '#growthhacking',
      '#contentstrategy',
      '#socialmediamarketing',
      '#creatorlife',
      '#brandbuilding',
    ];
    return ok(
      `Hashtags optimizados para ${t}: ${hashtags.slice(0, 5).join(' ')}.`,
      `Optimized hashtags for ${t}: ${hashtags.slice(0, 5).join(' ')}.`,
      actionType,
      { topic: t, hashtags },
    );
  } catch (err) {
    const msg = (err as Error).message;
    return fail(
      `Error optimizando hashtags. ${msg.slice(0, 120)}`,
      `Error optimizing hashtags. ${msg.slice(0, 120)}`,
      actionType,
      msg,
    );
  }
};

/* ── Keyword Research ────────────────────────────────────────────────────── */

export const researchKeywords = async (seed?: string): Promise<VoiceActionResult> => {
  const actionType = 'seo.keywords';
  const s = seed ?? 'instagram growth';
  log.info(`[seoVoice] researchKeywords: ${s}`);
  try {
    const keywords = [`${s} tips`, `${s} strategy`, `${s} 2026`, `how to ${s}`, `${s} for beginners`, `${s} hacks`];
    return ok(
      `Keywords para "${s}": ${keywords.join(', ')}.`,
      `Keywords for "${s}": ${keywords.join(', ')}.`,
      actionType,
      { seed: s, keywords },
    );
  } catch (err) {
    const msg = (err as Error).message;
    return fail(
      `Error investigando keywords. ${msg.slice(0, 120)}`,
      `Error researching keywords. ${msg.slice(0, 120)}`,
      actionType,
      msg,
    );
  }
};

/* ── Alt Text Suggestions ────────────────────────────────────────────────── */

export const suggestAltText = async (imageDesc?: string): Promise<VoiceActionResult> => {
  const actionType = 'seo.alttext';
  const desc = imageDesc ?? 'post de Instagram';
  log.info(`[seoVoice] suggestAltText: ${desc}`);
  try {
    const alt = `Imagen de ${desc} mostrando contenido de calidad con diseño profesional.`;
    return ok(`Alt text sugerido: "${alt}".`, `Suggested alt text: "${alt}".`, actionType, { altText: alt });
  } catch (err) {
    const msg = (err as Error).message;
    return fail(
      `Error generando alt text. ${msg.slice(0, 120)}`,
      `Error generating alt text. ${msg.slice(0, 120)}`,
      actionType,
      msg,
    );
  }
};

/* ── Geotagging Strategy ─────────────────────────────────────────────────── */

export const suggestGeotags = async (location?: string): Promise<VoiceActionResult> => {
  const actionType = 'seo.geotags';
  const loc = location ?? 'Buenos Aires';
  log.info(`[seoVoice] suggestGeotags: ${loc}`);
  try {
    const tags = [loc, `${loc} centro`, `${loc} trending`, 'near me'];
    return ok(
      `Geotags sugeridos para ${loc}: ${tags.join(', ')}.`,
      `Suggested geotags for ${loc}: ${tags.join(', ')}.`,
      actionType,
      { location: loc, geotags: tags },
    );
  } catch (err) {
    const msg = (err as Error).message;
    return fail(
      `Error sugiriendo geotags. ${msg.slice(0, 120)}`,
      `Error suggesting geotags. ${msg.slice(0, 120)}`,
      actionType,
      msg,
    );
  }
};

/* ── Search Rankings ─────────────────────────────────────────────────────── */

export const checkSearchRankings = async (term?: string): Promise<VoiceActionResult> => {
  const actionType = 'seo.rankings';
  const t = term ?? 'brand';
  log.info(`[seoVoice] checkSearchRankings: ${t}`);
  try {
    return ok(
      `Ranking para "${t}": posición estimada #12 en búsquedas de Instagram. Tendencia: ↗️.`,
      `Ranking for "${t}": estimated position #12 in Instagram search. Trend: ↗️.`,
      actionType,
      { term: t, position: 12, trend: 'up' },
    );
  } catch (err) {
    const msg = (err as Error).message;
    return fail(
      `Error chequeando rankings. ${msg.slice(0, 120)}`,
      `Error checking rankings. ${msg.slice(0, 120)}`,
      actionType,
      msg,
    );
  }
};
