/**
 * Carrusel → Video para TikTok.
 *
 * Convierte un carrusel de imágenes en un video vertical 9:16 que TikTok pueda publicar.
 * Estrategia:
 * 1. Intentar renderizar un Reel en Canva usando los textos del carrusel.
 * 2. Si Canva no está disponible, fallback al motor de video IA (produceTikTok).
 * 3. En DRY_RUN devuelve un mock si no hay otra opción.
 */

import { log } from '../../agent/logger.js';
import { env } from '../../config/index.js';
import type { CarruselResult } from '../content/carrusel.js';
import type { ReelScript } from '../content/reel.js';
import { renderReelToCanva } from '../content/canvaRender.js';
import { produceTikTok } from '../videoEngine/index.js';

const buildReelFromCarrusel = (carrusel: CarruselResult): ReelScript => {
  const hookSlide = carrusel.slides[0];
  const bodySlides = carrusel.slides.slice(1, -1);
  const ctaSlide = carrusel.slides[carrusel.slides.length - 1];
  const hookVisual = hookSlide?.titulo ?? '';
  const caption = bodySlides.map((s) => s.cuerpo).join('. ') || hookSlide?.cuerpo || '';
  const cta = carrusel.cta || ctaSlide?.titulo || 'Guardalo';

  const beatDuration = Math.max(2, Math.min(5, Math.floor(60 / carrusel.slides.length)));
  const beats: ReelScript['beats'] = carrusel.slides.map((slide, idx): ReelScript['beats'][number] => ({
    segundo: idx * beatDuration,
    voiceover: `${slide.titulo}. ${slide.cuerpo}`,
    textoEnPantalla: slide.titulo,
    bRoll: slide.direccionVisual,
    transicion: idx === 0 ? 'hard-cut' : 'fade',
  }));

  return {
    hookVisual,
    beats,
    caption,
    hashtags: carrusel.hashtags,
    cta,
    audioSugerido: '',
    duracionSegundos: beats.length * beatDuration,
    notasRetencion: 'Adaptado desde carrusel para TikTok: un beat por slide.',
  };
};

const mockVideoUrl = (): string => `https://cdn.feedia.ai/mock/tiktok/carrusel-to-video-${Date.now()}.mp4`;

export const carruselToVideoUrl = async (
  input: CarruselResult | string[],
  caption?: string,
  brandName = 'brand',
  userHandle?: string,
): Promise<string | undefined> => {
  if (env.dryRun && Array.isArray(input)) {
    log.info('[CarruselToVideo] DRY_RUN: devolviendo mock video URL');
    return mockVideoUrl();
  }

  if (Array.isArray(input)) {
    log.warn('[CarruselToVideo] Solo se recibieron URLs de imágenes. Se necesita CarruselResult para generar video real.');
    return undefined;
  }

  const carrusel = input as CarruselResult;
  const reel = buildReelFromCarrusel(carrusel);

  // Opción 1: Canva reel template
  const canvaRender = await renderReelToCanva(reel, `TikTok from carousel — ${caption?.slice(0, 40) ?? ''}`, userHandle);
  if (canvaRender.ok && canvaRender.exportUrls?.[0]) {
    log.info(`[CarruselToVideo] Canva reel generado: ${canvaRender.exportUrls[0]}`);
    return canvaRender.exportUrls[0];
  }

  // Opción 2: video IA
  const video = await produceTikTok(reel, caption ?? reel.caption, brandName, { dryRun: env.dryRun });
  if (video.ok && video.videoUrl) {
    log.info(`[CarruselToVideo] Video IA generado (${video.provider}): ${video.videoUrl}`);
    return video.videoUrl;
  }

  // Opción 3: mock en dry-run como último recurso
  if (env.dryRun) {
    log.info('[CarruselToVideo] DRY_RUN fallback: mock video URL');
    return mockVideoUrl();
  }

  log.error('[CarruselToVideo] No se pudo generar video para TikTok');
  return undefined;
};
