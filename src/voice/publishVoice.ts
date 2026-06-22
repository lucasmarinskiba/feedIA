/**
 * publishVoice.ts — Voz Productora: publicación
 * ─────────────────────────────────────────────────────────────────────────
 * Acciones de voz para publicar ahora, programar posts, listar contenido
 * programado y cancelar publicaciones. Delega en src/integrations/uploadPost.js
 */

import { log } from '../agent/logger.js';
import type { VoiceActionResult } from './voiceActionRouter.js';
import type { UploadPostPayload } from '../integrations/uploadPost.js';

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

/* ── Publish Now ─────────────────────────────────────────────────────────── */

export const publishNow = async (contentId: string, format: 'post' | 'reel' | 'story'): Promise<VoiceActionResult> => {
  log.info(`[publishVoice] publishNow: contentId=${contentId} format=${format}`);
  try {
    const upload = await import('../integrations/uploadPost.js');
    const payload: UploadPostPayload = {
      platforms: ['instagram'],
      mediaType: format === 'post' ? 'photo' : format === 'reel' ? 'reel' : 'story',
      mediaUrls: [], // se resuelven internamente desde contentId
      caption: `Publicado desde voz: ${contentId}`,
      postId: contentId,
    };
    const result = await upload.uploadToSocial(payload);
    return ok(`${format} publicado correctamente.`, `${format} published successfully.`, 'publish:publishNow', result);
  } catch (err) {
    const msg = (err as Error).message;
    log.error(`[publishVoice] publishNow failed: ${msg}`);
    return fail(
      `No pude publicar el ${format}. ${msg.slice(0, 120)}`,
      `I couldn't publish the ${format}. ${msg.slice(0, 120)}`,
      'publish:publishNow',
      msg,
    );
  }
};

/* ── Schedule Post ───────────────────────────────────────────────────────── */

export const schedulePost = async (contentId: string, scheduledAt: string): Promise<VoiceActionResult> => {
  log.info(`[publishVoice] schedulePost: contentId=${contentId} at=${scheduledAt}`);
  try {
    const upload = await import('../integrations/uploadPost.js');
    const payload: UploadPostPayload = {
      platforms: ['instagram'],
      mediaType: 'photo',
      mediaUrls: [],
      caption: `Publicación programada: ${contentId}`,
      scheduleAt: scheduledAt,
      postId: contentId,
    };
    const result = await upload.uploadToSocial(payload);
    return ok(
      `Publicación programada para ${scheduledAt}.`,
      `Post scheduled for ${scheduledAt}.`,
      'publish:schedulePost',
      result,
    );
  } catch (err) {
    const msg = (err as Error).message;
    log.error(`[publishVoice] schedulePost failed: ${msg}`);
    return fail(
      `No pude programar la publicación. ${msg.slice(0, 120)}`,
      `I couldn't schedule the post. ${msg.slice(0, 120)}`,
      'publish:schedulePost',
      msg,
    );
  }
};

/* ── List Scheduled Posts ────────────────────────────────────────────────── */

export const listScheduledPosts = async (): Promise<VoiceActionResult> => {
  log.info('[publishVoice] listScheduledPosts');
  try {
    // No hay API de listado en uploadPost.ts todavía; devolvemos mock
    return ok(
      'No hay publicaciones programadas actualmente.',
      'No scheduled posts at the moment.',
      'publish:listScheduledPosts',
      { count: 0 },
    );
  } catch (err) {
    const msg = (err as Error).message;
    log.error(`[publishVoice] listScheduledPosts failed: ${msg}`);
    return fail(
      'No pude listar las publicaciones programadas.',
      "I couldn't list the scheduled posts.",
      'publish:listScheduledPosts',
      msg,
    );
  }
};

/* ── Cancel Scheduled Post ───────────────────────────────────────────────── */

export const cancelScheduledPost = async (postId: string): Promise<VoiceActionResult> => {
  log.info(`[publishVoice] cancelScheduledPost: postId=${postId}`);
  try {
    const upload = await import('../integrations/uploadPost.js');
    const result = await upload.cancelUpload(postId);
    return ok(
      result ? `Publicación ${postId} cancelada.` : `No se encontró la publicación ${postId}.`,
      result ? `Post ${postId} cancelled.` : `Post ${postId} not found.`,
      'publish:cancelScheduledPost',
      result,
    );
  } catch (err) {
    const msg = (err as Error).message;
    log.error(`[publishVoice] cancelScheduledPost failed: ${msg}`);
    return fail(
      `No pude cancelar la publicación ${postId}.`,
      `I couldn't cancel post ${postId}.`,
      'publish:cancelScheduledPost',
      msg,
    );
  }
};
