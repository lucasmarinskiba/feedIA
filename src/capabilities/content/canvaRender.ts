/**
 * Canva Render — adaptador de contenido generado → diseños de Canva.
 *
 * Soporta:
 * - Carruseles (PNG por slide)
 * - Reels (MP4)
 * - Historias (PNG)
 * - Posts de feed 1:1 (PNG)
 *
 * Opcionalmente rellena campos de imagen generando assets vía imageGen + uploadAsset.
 */

import { autofillTemplate, exportDesign, uploadAsset, type CanvaField } from '../../integrations/canva.js';
import { validateCanvaTemplate, type TemplateValidationResult } from '../../integrations/canvaTemplateValidator.js';
import { generateImage } from '../../integrations/imageGen.js';
import { env } from '../../config/index.js';
import { log } from '../../agent/logger.js';
import type { CarruselResult } from './carrusel.js';
import type { ReelScript } from './reel.js';
import type { StorySequence } from './stories.js';

export interface RenderedDesign {
  ok: boolean;
  designId?: string;
  designUrl?: string;
  exportUrls?: string[];
  error?: string;
  validation?: TemplateValidationResult;
  fallback?: boolean;
}

export interface CanvaRenderOptions {
  usarImagenAI?: boolean;
}

const buildSlideFields = (slides: Array<{ titulo: string; cuerpo: string }>): Record<string, CanvaField> => {
  const fields: Record<string, CanvaField> = {};
  slides.forEach((slide, idx) => {
    const n = idx + 1;
    fields[`titulo_${n}`] = { type: 'text', text: slide.titulo };
    fields[`cuerpo_${n}`] = { type: 'text', text: slide.cuerpo };
  });
  return fields;
};

const fetchImageAsBuffer = async (url: string): Promise<Buffer> => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`fetch image failed ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
};

const uploadImageFromUrl = async (
  url: string,
  filename: string,
  userHandle?: string,
): Promise<string | undefined> => {
  try {
    const buf = await fetchImageAsBuffer(url);
    const up = await uploadAsset({ fileBytes: buf, filename, mimeType: 'image/png', userHandle });
    if (!up.ok || !up.assetId) {
      log.warn(`[CanvaRender] uploadAsset failed for ${filename}: ${up.error}`);
      return undefined;
    }
    return up.assetId;
  } catch (err) {
    log.warn(`[CanvaRender] uploadImageFromUrl error: ${(err as Error).message}`);
    return undefined;
  }
};

const generateAndUploadImage = async (
  prompt: string,
  aspectRatio: '1:1' | '4:5' | '9:16',
  filename: string,
  userHandle?: string,
): Promise<string | undefined> => {
  const img = await generateImage({ prompt, aspectRatio });
  if (!img.ok || !img.urls?.[0]) {
    log.warn(`[CanvaRender] imageGen failed: ${img.error}`);
    return undefined;
  }
  return uploadImageFromUrl(img.urls[0], filename, userHandle);
};

const validateBeforeRender = async (
  format: 'carrusel' | 'reel' | 'historia' | 'postImagen',
  templateId: string,
  userHandle?: string,
): Promise<TemplateValidationResult | undefined> => {
  const validation = await validateCanvaTemplate(format, templateId, userHandle);
  if (!validation.ok) {
    log.warn(
      `[CanvaRender] Template ${format} (${templateId}) no pasa validación: ${validation.missingFields.join(', ')}`,
    );
  }
  return validation;
};

export const renderCarruselToCanva = async (
  carrusel: CarruselResult,
  titulo: string,
  userHandle?: string,
  opts: CanvaRenderOptions = {},
): Promise<RenderedDesign> => {
  const templateId = env.canva.templates.carrusel;
  if (!templateId) {
    log.warn('CANVA_TEMPLATE_CARRUSEL no configurado. Usando fallback de imagen IA.');
    return fallbackCarrusel(carrusel);
  }

  const validation = await validateBeforeRender('carrusel', templateId, userHandle);
  const data = buildSlideFields(carrusel.slides);
  data['hashtags'] = { type: 'text', text: carrusel.hashtags.join(' ') };

  if (opts.usarImagenAI) {
    for (let i = 0; i < carrusel.slides.length; i += 1) {
      const slide = carrusel.slides[i]!;
      const prompt = `Instagram carousel slide: ${slide.titulo}. ${slide.cuerpo}. Visual: ${slide.direccionVisual}`;
      const assetId = await generateAndUploadImage(
        prompt,
        carrusel.formatoOptimo ?? '4:5',
        `carrusel-slide-${i + 1}.png`,
        userHandle,
      );
      if (assetId) {
        data[`imagen_${i + 1}`] = { type: 'image', asset_id: assetId };
      }
    }
  }

  const fill = await autofillTemplate({ brandTemplateId: templateId, title: titulo, data, userHandle });
  if (!fill.ok || !fill.designId) {
    return { ok: false, error: fill.error, validation: validation ?? undefined };
  }
  const exp = await exportDesign({ designId: fill.designId, format: 'png', quality: 'high', userHandle });
  return {
    ok: exp.ok,
    designId: fill.designId,
    ...(fill.designUrl ? { designUrl: fill.designUrl } : {}),
    ...(exp.urls ? { exportUrls: exp.urls } : {}),
    ...(exp.error ? { error: exp.error } : {}),
    validation: validation ?? undefined,
  };
};

export const renderReelToCanva = async (
  reel: ReelScript,
  titulo: string,
  userHandle?: string,
  opts: CanvaRenderOptions = {},
): Promise<RenderedDesign> => {
  const templateId = env.canva.templates.reel;
  if (!templateId) {
    log.warn('CANVA_TEMPLATE_REEL no configurado. briefToPublish debería fallback a video IA.');
    return { ok: false, error: 'CANVA_TEMPLATE_REEL faltante' };
  }

  const validation = await validateBeforeRender('reel', templateId, userHandle);
  const data: Record<string, CanvaField> = {
    hook_visual: { type: 'text', text: reel.hookVisual },
    cta: { type: 'text', text: reel.cta },
    audio_sugerido: { type: 'text', text: reel.audioSugerido },
  };

  for (let i = 0; i < reel.beats.slice(0, 8).length; i += 1) {
    const beat = reel.beats[i]!;
    const n = i + 1;
    data[`texto_pantalla_${n}`] = { type: 'text', text: beat.textoEnPantalla };
    if (opts.usarImagenAI && beat.bRoll) {
      const assetId = await generateAndUploadImage(
        `Vertical 9:16 B-roll for Instagram Reel: ${beat.bRoll}`,
        '9:16',
        `reel-broll-${n}.png`,
        userHandle,
      );
      if (assetId) {
        data[`broll_${n}`] = { type: 'image', asset_id: assetId };
      }
    } else if (beat.bRoll) {
      // Si el template espera imagen, el texto no servirá; se deja vacío para no romper.
      // Se recomienda activar usarImagenAI o usar plantillas con campos de texto para broll.
      data[`broll_${n}`] = { type: 'text', text: beat.bRoll };
    }
  }

  const fill = await autofillTemplate({ brandTemplateId: templateId, title: titulo, data, userHandle });
  if (!fill.ok || !fill.designId) {
    return { ok: false, error: fill.error, validation: validation ?? undefined };
  }
  const exp = await exportDesign({ designId: fill.designId, format: 'mp4', quality: 'high', userHandle });
  return {
    ok: exp.ok,
    designId: fill.designId,
    ...(fill.designUrl ? { designUrl: fill.designUrl } : {}),
    ...(exp.urls ? { exportUrls: exp.urls } : {}),
    ...(exp.error ? { error: exp.error } : {}),
    validation: validation ?? undefined,
  };
};

export const renderStorySequenceToCanva = async (
  story: StorySequence,
  titulo: string,
  userHandle?: string,
  opts: CanvaRenderOptions = {},
): Promise<RenderedDesign> => {
  const templateId = env.canva.templates.historia;
  if (!templateId) {
    log.warn('CANVA_TEMPLATE_HISTORIA no configurado. Usando fallback de imagen IA.');
    return fallbackStorySequence(story);
  }

  const validation = await validateBeforeRender('historia', templateId, userHandle);
  const data: Record<string, CanvaField> = {};
  story.slides.forEach((slide, idx) => {
    const n = idx + 1;
    data[`story_${n}`] = { type: 'text', text: slide.textoPrincipal };
    if (opts.usarImagenAI && slide.visual) {
      // Las imágenes se suben de forma asíncrona fuera del loop; se manejan abajo.
    }
  });

  if (opts.usarImagenAI) {
    for (let i = 0; i < story.slides.length; i += 1) {
      const slide = story.slides[i]!;
      if (!slide.visual) continue;
      const assetId = await generateAndUploadImage(
        `Instagram Story 9:16: ${slide.textoPrincipal}. Visual: ${slide.visual}`,
        '9:16',
        `story-slide-${i + 1}.png`,
        userHandle,
      );
      if (assetId) {
        data[`story_imagen_${i + 1}`] = { type: 'image', asset_id: assetId };
      }
    }
  }

  const fill = await autofillTemplate({ brandTemplateId: templateId, title: titulo, data, userHandle });
  if (!fill.ok || !fill.designId) {
    return { ok: false, error: fill.error, validation: validation ?? undefined };
  }
  const exp = await exportDesign({ designId: fill.designId, format: 'png', quality: 'high', userHandle });
  return {
    ok: exp.ok,
    designId: fill.designId,
    ...(fill.designUrl ? { designUrl: fill.designUrl } : {}),
    ...(exp.urls ? { exportUrls: exp.urls } : {}),
    ...(exp.error ? { error: exp.error } : {}),
    validation: validation ?? undefined,
  };
};

export const renderPostToCanva = async (
  headline: string,
  body: string,
  cta: string,
  titulo: string,
  userHandle?: string,
  opts: CanvaRenderOptions = {},
): Promise<RenderedDesign> => {
  const templateId = env.canva.templates.postImagen;
  if (!templateId) {
    log.warn('CANVA_TEMPLATE_POST_IMAGEN no configurado. Usando fallback de imagen IA.');
    return fallbackPost(headline, body);
  }

  const validation = await validateBeforeRender('postImagen', templateId, userHandle);
  const data: Record<string, CanvaField> = {
    post_headline: { type: 'text', text: headline },
    post_body: { type: 'text', text: body },
    post_cta: { type: 'text', text: cta },
  };

  if (opts.usarImagenAI) {
    const assetId = await generateAndUploadImage(
      `Instagram feed post 1:1: ${headline}. ${body}`,
      '1:1',
      'post-image.png',
      userHandle,
    );
    if (assetId) {
      data['post_image'] = { type: 'image', asset_id: assetId };
    }
  }

  const fill = await autofillTemplate({ brandTemplateId: templateId, title: titulo, data, userHandle });
  if (!fill.ok || !fill.designId) {
    return { ok: false, error: fill.error, validation: validation ?? undefined };
  }
  const exp = await exportDesign({ designId: fill.designId, format: 'png', quality: 'high', userHandle });
  return {
    ok: exp.ok,
    designId: fill.designId,
    ...(fill.designUrl ? { designUrl: fill.designUrl } : {}),
    ...(exp.urls ? { exportUrls: exp.urls } : {}),
    ...(exp.error ? { error: exp.error } : {}),
    validation: validation ?? undefined,
  };
};

// ── Fallbacks internos (cuando no hay templates Canva configurados) ───────────

const fallbackCarrusel = async (carrusel: CarruselResult): Promise<RenderedDesign> => {
  const urls: string[] = [];
  for (let i = 0; i < carrusel.slides.length; i += 1) {
    const slide = carrusel.slides[i]!;
    const prompt = `Instagram carousel slide ${i + 1}: ${slide.titulo}. ${slide.cuerpo}. Visual: ${slide.direccionVisual}`;
    const img = await generateImage({ prompt, aspectRatio: carrusel.formatoOptimo ?? '4:5' });
    if (img.ok && img.urls?.[0]) urls.push(img.urls[0]);
  }
  const ok = urls.length === carrusel.slides.length;
  return {
    ok,
    exportUrls: urls,
    fallback: true,
    error: ok ? undefined : 'Fallback de imagen IA no pudo generar todas las slides',
  };
};

const fallbackStorySequence = async (story: StorySequence): Promise<RenderedDesign> => {
  const urls: string[] = [];
  for (let i = 0; i < story.slides.length; i += 1) {
    const slide = story.slides[i]!;
    const prompt = `Instagram Story 9:16: ${slide.textoPrincipal}. Visual: ${slide.visual ?? 'on-brand imagery'}`;
    const img = await generateImage({ prompt, aspectRatio: '9:16' });
    if (img.ok && img.urls?.[0]) urls.push(img.urls[0]);
  }
  const ok = urls.length === story.slides.length;
  return {
    ok,
    exportUrls: urls,
    fallback: true,
    error: ok ? undefined : 'Fallback de imagen IA no pudo generar todas las stories',
  };
};

const fallbackPost = async (headline: string, body: string): Promise<RenderedDesign> => {
  const prompt = `Instagram feed post 1:1: ${headline}. ${body}`;
  const img = await generateImage({ prompt, aspectRatio: '1:1' });
  const url = img.ok ? img.urls?.[0] : undefined;
  return {
    ok: Boolean(url),
    exportUrls: url ? [url] : [],
    fallback: true,
    error: url ? undefined : 'Fallback de imagen IA falló',
  };
};
