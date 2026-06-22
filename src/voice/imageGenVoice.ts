/**
 * imageGenVoice.ts — Voz Productora: generación de imágenes
 * ─────────────────────────────────────────────────────────────────────────
 * Acciones de voz para generar imágenes individuales o en lote, listar
 * modelos disponibles y verificar disponibilidad. Delega en
 * src/integrations/falAi.js y src/integrations/imageGen.js
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

/* ── Generate Image ──────────────────────────────────────────────────────── */

export const generateImage = async (prompt: string, model?: string): Promise<VoiceActionResult> => {
  log.info(`[imageGenVoice] generateImage: model=${model ?? 'auto'}`);
  log.debug(`[imageGenVoice] prompt="${prompt.slice(0, 200)}"`);

  try {
    // Preferimos falAi si está disponible; fallback a imageGen
    const fal = await import('../integrations/falAi.js').catch(() => null);
    if (fal && fal.generateImage) {
      type FalModel = import('../integrations/falAi.js').FalModel;
      const result = await fal.generateImage({
        prompt,
        model: (model as FalModel) ?? 'flux-pro',
        aspectRatio: '1:1',
        numImages: 1,
      });
      return ok(
        `Imagen generada con ${model ?? 'fal.ai'}. Lista en el dashboard.`,
        `Image generated with ${model ?? 'fal.ai'}. Ready in the dashboard.`,
        'imageGen:generateImage',
        result,
      );
    }

    const imgGen = await import('../integrations/imageGen.js');
    const result = await imgGen.generateImage({
      prompt,
      aspectRatio: '1:1',
      count: 1,
    });
    return ok(
      `Imagen generada con ${result.provider ?? 'imageGen'}. Lista en el dashboard.`,
      `Image generated with ${result.provider ?? 'imageGen'}. Ready in the dashboard.`,
      'imageGen:generateImage',
      result,
    );
  } catch (err) {
    const msg = (err as Error).message;
    log.error(`[imageGenVoice] generateImage failed: ${msg}`);
    return fail(
      `No pude generar la imagen. ${msg.slice(0, 120)}`,
      `I couldn't generate the image. ${msg.slice(0, 120)}`,
      'imageGen:generateImage',
      msg,
    );
  }
};

/* ── Generate Image Batch ────────────────────────────────────────────────── */

export const generateImageBatch = async (prompts: string[], model?: string): Promise<VoiceActionResult> => {
  log.info(`[imageGenVoice] generateImageBatch: count=${prompts.length} model=${model ?? 'auto'}`);
  try {
    const results: unknown[] = [];
    for (const prompt of prompts) {
      const res = await generateImage(prompt, model);
      results.push(res.detail);
    }
    return ok(
      `Lote de ${prompts.length} imágenes generado. Revisá el dashboard.`,
      `Batch of ${prompts.length} images generated. Check the dashboard.`,
      'imageGen:generateImageBatch',
      results,
    );
  } catch (err) {
    const msg = (err as Error).message;
    log.error(`[imageGenVoice] generateImageBatch failed: ${msg}`);
    return fail(
      `Falló la generación por lotes. ${msg.slice(0, 120)}`,
      `Batch generation failed. ${msg.slice(0, 120)}`,
      'imageGen:generateImageBatch',
      msg,
    );
  }
};

/* ── List Image Models ───────────────────────────────────────────────────── */

export const listImageModels = async (): Promise<VoiceActionResult> => {
  log.info('[imageGenVoice] listImageModels');
  const models = ['nano-banana-2', 'flux-pro', 'flux-schnell', 'sdxl-turbo', 'ideogram-v3', 'recraft-v3', 'imagen-3'];
  return ok(
    `Modelos disponibles: ${models.join(', ')}.`,
    `Available models: ${models.join(', ')}.`,
    'imageGen:listImageModels',
    models,
  );
};

/* ── Is Image Gen Available ──────────────────────────────────────────────── */

export const isImageGenAvailable = async (): Promise<VoiceActionResult> => {
  log.info('[imageGenVoice] isImageGenAvailable');
  try {
    const fal = await import('../integrations/falAi.js').catch(() => null);
    const { env } = await import('../config/index.js');
    const available = !!(fal?.isFalAvailable?.() || env.imageGen.replicateToken);
    return ok(
      available ? 'La generación de imágenes está disponible.' : 'La generación de imágenes no está configurada.',
      available ? 'Image generation is available.' : 'Image generation is not configured.',
      'imageGen:isImageGenAvailable',
      { available },
    );
  } catch (err) {
    const msg = (err as Error).message;
    log.error(`[imageGenVoice] isImageGenAvailable failed: ${msg}`);
    return fail(
      'No pude verificar la disponibilidad de generación de imágenes.',
      "I couldn't check image generation availability.",
      'imageGen:isImageGenAvailable',
      msg,
    );
  }
};
