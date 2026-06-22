/**
 * videoVoice.ts — Voz Productora: video
 * ─────────────────────────────────────────────────────────────────────────
 * Acciones de voz para crear reels faceless, generar video y consultar
 * el estado del pipeline. Delega en src/capabilities/video/index.js
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

/* ── Create Faceless Reel ────────────────────────────────────────────────── */

export const createFacelessReel = async (topic: string): Promise<VoiceActionResult> => {
  log.info(`[videoVoice] createFacelessReel: topic="${topic}"`);
  try {
    const { loadBrandProfile } = await import('../config/index.js');
    const brand = loadBrandProfile();
    const video = await import('../capabilities/video/index.js');
    const result = await video.runReelPipeline({
      topic,
      brandId: brand.name,
      targetDuration: 30,
      generateImages: true,
    });
    return ok(
      `Reel faceless generado sobre "${topic}". Revisá el pipeline de video.`,
      `Faceless reel generated about "${topic}". Check the video pipeline.`,
      'video:createFacelessReel',
      result,
    );
  } catch (err) {
    const msg = (err as Error).message;
    log.error(`[videoVoice] createFacelessReel failed: ${msg}`);
    return fail(
      `No pude crear el reel faceless. ${msg.slice(0, 120)}`,
      `I couldn't create the faceless reel. ${msg.slice(0, 120)}`,
      'video:createFacelessReel',
      msg,
    );
  }
};

/* ── Generate Video ──────────────────────────────────────────────────────── */

export const generateVideo = async (contentId: string): Promise<VoiceActionResult> => {
  log.info(`[videoVoice] generateVideo: contentId=${contentId}`);
  try {
    const { loadBrandProfile } = await import('../config/index.js');
    const brand = loadBrandProfile();
    const video = await import('../capabilities/video/index.js');
    const script: import('../capabilities/video/types.js').VideoScript = {
      title: contentId,
      hook: `Descubrí el secreto de ${contentId}`,
      scenes: [{ text: contentId, duration: 5 }],
      cta: 'Seguime para más',
      durationSeconds: 5,
    };
    const result = await video.generateVideo({ script, brandId: brand.name });
    return ok(
      `Video generado para el contenido ${contentId}.`,
      `Video generated for content ${contentId}.`,
      'video:generateVideo',
      result,
    );
  } catch (err) {
    const msg = (err as Error).message;
    log.error(`[videoVoice] generateVideo failed: ${msg}`);
    return fail(
      `No pude generar el video. ${msg.slice(0, 120)}`,
      `I couldn't generate the video. ${msg.slice(0, 120)}`,
      'video:generateVideo',
      msg,
    );
  }
};

/* ── Get Video Pipeline Status ───────────────────────────────────────────── */

export const getVideoPipelineStatus = async (): Promise<VoiceActionResult> => {
  log.info('[videoVoice] getVideoPipelineStatus');
  try {
    const { env } = await import('../config/index.js');
    const status = {
      pipeline: 'video',
      active: true,
      dryRun: env.dryRun,
      timestamp: new Date().toISOString(),
    };
    return ok(
      'El pipeline de video está activo. Consultá el dashboard para más detalles.',
      'The video pipeline is active. Check the dashboard for more details.',
      'video:getVideoPipelineStatus',
      status,
    );
  } catch (err) {
    const msg = (err as Error).message;
    log.error(`[videoVoice] getVideoPipelineStatus failed: ${msg}`);
    return fail(
      'No pude consultar el estado del pipeline de video.',
      "I couldn't check the video pipeline status.",
      'video:getVideoPipelineStatus',
      msg,
    );
  }
};
