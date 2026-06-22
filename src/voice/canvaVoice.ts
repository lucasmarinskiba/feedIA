/**
 * canvaVoice.ts — Voz Productora: diseño en Canva
 * ─────────────────────────────────────────────────────────────────────────
 * Acciones de voz para diseñar carruseles, renderizar reels, exportar
 * diseños y conectar cuentas de Canva. Delega en src/integrations/canva.js
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

/* ── Design Carousel ─────────────────────────────────────────────────────── */

export const designCarousel = async (topic: string): Promise<VoiceActionResult> => {
  log.info(`[canvaVoice] designCarousel: topic=${topic}`);
  try {
    const { loadBrandProfile } = await import('../config/index.js');
    const brand = loadBrandProfile();
    const content = await import('../capabilities/content/index.js');
    const carrusel = await content.createCarrusel(brand, topic, 'medio');
    const result = await content.renderCarruselToCanva(carrusel, topic);
    return ok(
      `Carrusel diseñado en Canva para "${topic}".`,
      `Carousel designed in Canva for "${topic}".`,
      'canva:designCarousel',
      result,
    );
  } catch (err) {
    const msg = (err as Error).message;
    log.error(`[canvaVoice] designCarousel failed: ${msg}`);
    return fail(
      `No pude diseñar el carrusel en Canva. ${msg.slice(0, 120)}`,
      `I couldn't design the carousel in Canva. ${msg.slice(0, 120)}`,
      'canva:designCarousel',
      msg,
    );
  }
};

/* ── Render Reel ─────────────────────────────────────────────────────────── */

export const renderReel = async (topic: string): Promise<VoiceActionResult> => {
  log.info(`[canvaVoice] renderReel: topic=${topic}`);
  try {
    const { loadBrandProfile } = await import('../config/index.js');
    const brand = loadBrandProfile();
    const content = await import('../capabilities/content/index.js');
    const reel = await content.createReel(brand, topic, 30);
    const result = await content.renderReelToCanva(reel, topic);
    return ok(
      `Reel renderizado en Canva para "${topic}".`,
      `Reel rendered in Canva for "${topic}".`,
      'canva:renderReel',
      result,
    );
  } catch (err) {
    const msg = (err as Error).message;
    log.error(`[canvaVoice] renderReel failed: ${msg}`);
    return fail(
      `No pude renderizar el reel en Canva. ${msg.slice(0, 120)}`,
      `I couldn't render the reel in Canva. ${msg.slice(0, 120)}`,
      'canva:renderReel',
      msg,
    );
  }
};

/* ── Export Design ───────────────────────────────────────────────────────── */

export const exportDesign = async (designId: string, format?: string): Promise<VoiceActionResult> => {
  log.info(`[canvaVoice] exportDesign: designId=${designId} format=${format ?? 'png'}`);
  try {
    const canva = await import('../integrations/canva.js');
    const request = {
      designId,
      format: (format ?? 'png') as 'png' | 'jpg' | 'pdf' | 'mp4' | 'gif',
    };
    const result = await canva.exportDesign(request);
    return ok(
      `Diseño ${designId} exportado en formato ${format ?? 'png'}.`,
      `Design ${designId} exported as ${format ?? 'png'}.`,
      'canva:exportDesign',
      result,
    );
  } catch (err) {
    const msg = (err as Error).message;
    log.error(`[canvaVoice] exportDesign failed: ${msg}`);
    return fail(
      `No pude exportar el diseño. ${msg.slice(0, 120)}`,
      `I couldn't export the design. ${msg.slice(0, 120)}`,
      'canva:exportDesign',
      msg,
    );
  }
};

/* ── Connect Canva Account ───────────────────────────────────────────────── */

export const connectCanvaAccount = async (handle: string): Promise<VoiceActionResult> => {
  log.info(`[canvaVoice] connectCanvaAccount: handle=${handle}`);
  try {
    const canvaAuth = await import('../integrations/canvaAuth.js');
    const token = await canvaAuth.getUserAccessToken(handle);
    if (!token) {
      return fail(
        `No se encontró token para la cuenta ${handle}. Iniciá sesión primero.`,
        `No token found for account ${handle}. Please log in first.`,
        'canva:connectCanvaAccount',
        { handle },
      );
    }
    return ok(
      `Cuenta de Canva ${handle} conectada correctamente.`,
      `Canva account ${handle} connected successfully.`,
      'canva:connectCanvaAccount',
      { handle, connected: true },
    );
  } catch (err) {
    const msg = (err as Error).message;
    log.error(`[canvaVoice] connectCanvaAccount failed: ${msg}`);
    return fail(
      `No pude conectar la cuenta de Canva. ${msg.slice(0, 120)}`,
      `I couldn't connect the Canva account. ${msg.slice(0, 120)}`,
      'canva:connectCanvaAccount',
      msg,
    );
  }
};
