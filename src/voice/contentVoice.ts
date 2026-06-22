/**
 * contentVoice.ts — Voz Productora: contenido
 * ─────────────────────────────────────────────────────────────────────────
 * Acciones de voz para crear carruseles, reels, historias, captions y
 * contenido faceless. Delega en src/capabilities/content/index.js
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

/* ── Carousel ────────────────────────────────────────────────────────────── */

export const createCarousel = async (topic: string, slides?: number): Promise<VoiceActionResult> => {
  log.info(`[contentVoice] createCarousel: topic="${topic}" slides=${slides ?? 5}`);
  try {
    const { loadBrandProfile } = await import('../config/index.js');
    const brand = loadBrandProfile();
    const content = await import('../capabilities/content/index.js');
    const result = await content.createCarrusel(brand, topic, 'medio');
    return ok(
      `Carrusel creado sobre "${topic}" con ${slides ?? 5} láminas. Revisalo en el dashboard.`,
      `Carousel created about "${topic}" with ${slides ?? 5} slides. Check the dashboard.`,
      'content:createCarousel',
      result,
    );
  } catch (err) {
    const msg = (err as Error).message;
    log.error(`[contentVoice] createCarousel failed: ${msg}`);
    return fail(
      `No pude crear el carrusel. ${msg.slice(0, 120)}`,
      `I couldn't create the carousel. ${msg.slice(0, 120)}`,
      'content:createCarousel',
      msg,
    );
  }
};

/* ── Reel ────────────────────────────────────────────────────────────────── */

export const createReel = async (topic: string, duration?: number): Promise<VoiceActionResult> => {
  log.info(`[contentVoice] createReel: topic="${topic}" duration=${duration ?? 30}`);
  try {
    const { loadBrandProfile } = await import('../config/index.js');
    const brand = loadBrandProfile();
    const content = await import('../capabilities/content/index.js');
    const result = await content.createReel(brand, topic, (duration ?? 30) as 15 | 20 | 30 | 45 | 60);
    return ok(
      `Reel preparado sobre "${topic}" de aproximadamente ${duration ?? 30} segundos.`,
      `Reel prepared about "${topic}" around ${duration ?? 30} seconds long.`,
      'content:createReel',
      result,
    );
  } catch (err) {
    const msg = (err as Error).message;
    log.error(`[contentVoice] createReel failed: ${msg}`);
    return fail(
      `No pude crear el reel. ${msg.slice(0, 120)}`,
      `I couldn't create the reel. ${msg.slice(0, 120)}`,
      'content:createReel',
      msg,
    );
  }
};

/* ── Story ───────────────────────────────────────────────────────────────── */

export const createStory = async (topic: string): Promise<VoiceActionResult> => {
  log.info(`[contentVoice] createStory: topic="${topic}"`);
  try {
    const { loadBrandProfile } = await import('../config/index.js');
    const brand = loadBrandProfile();
    const content = await import('../capabilities/content/index.js');
    const result = await content.createStorySequence(brand, topic, 5);
    return ok(
      `Historia creada sobre "${topic}". Lista para subir.`,
      `Story created about "${topic}". Ready to upload.`,
      'content:createStory',
      result,
    );
  } catch (err) {
    const msg = (err as Error).message;
    log.error(`[contentVoice] createStory failed: ${msg}`);
    return fail(
      `No pude crear la historia. ${msg.slice(0, 120)}`,
      `I couldn't create the story. ${msg.slice(0, 120)}`,
      'content:createStory',
      msg,
    );
  }
};

/* ── Caption ─────────────────────────────────────────────────────────────── */

export const createCaption = async (context: string, format?: string): Promise<VoiceActionResult> => {
  log.info(`[contentVoice] createCaption: context="${context}" format=${format ?? 'auto'}`);
  try {
    const { loadBrandProfile } = await import('../config/index.js');
    const brand = loadBrandProfile();
    const content = await import('../capabilities/content/index.js');
    const fmt = (format ?? 'post-imagen') as 'reel' | 'carrusel' | 'post-imagen' | 'historia';
    const result = await content.createCaption(brand, context, fmt);
    return ok(
      `Caption generado para: ${context.slice(0, 60)}${context.length > 60 ? '...' : ''}.`,
      `Caption generated for: ${context.slice(0, 60)}${context.length > 60 ? '...' : ''}.`,
      'content:createCaption',
      result,
    );
  } catch (err) {
    const msg = (err as Error).message;
    log.error(`[contentVoice] createCaption failed: ${msg}`);
    return fail(
      `No pude generar el caption. ${msg.slice(0, 120)}`,
      `I couldn't generate the caption. ${msg.slice(0, 120)}`,
      'content:createCaption',
      msg,
    );
  }
};

/* ── Faceless ────────────────────────────────────────────────────────────── */

export const createFaceless = async (topic: string): Promise<VoiceActionResult> => {
  log.info(`[contentVoice] createFaceless: topic="${topic}"`);
  try {
    const { loadBrandProfile } = await import('../config/index.js');
    const brand = loadBrandProfile();
    const content = await import('../capabilities/content/index.js');
    const result = await content.createFacelessTriple(brand, topic);
    return ok(
      `Contenido faceless generado sobre "${topic}". Revisá el triple set en el dashboard.`,
      `Faceless content generated about "${topic}". Check the triple set in the dashboard.`,
      'content:createFaceless',
      result,
    );
  } catch (err) {
    const msg = (err as Error).message;
    log.error(`[contentVoice] createFaceless failed: ${msg}`);
    return fail(
      `No pude generar el contenido faceless. ${msg.slice(0, 120)}`,
      `I couldn't generate the faceless content. ${msg.slice(0, 120)}`,
      'content:createFaceless',
      msg,
    );
  }
};
