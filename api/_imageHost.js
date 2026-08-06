/**
 * Image Host — garantiza URL pública para cada slide de carrusel, sea cual
 * sea su origen.
 *
 * Por qué: Instagram Graph API NO acepta data-URLs ni SVG para publicar
 * (necesita image_url pública HTTPS). Los slides del composer SVG propio
 * (_carouselComposer.js) llegan como data-URLs base64 — este módulo los
 * rasteriza (sharp, ya dependencia del monorepo) y sube a FAL storage
 * (mismo FAL_KEY que ya usa refineWithFal en _brandStudio.js, sin
 * credenciales nuevas). Los slides exportados vía Canva Connect ya vienen
 * con URL pública real (aunque el campo se llame "dataUrl" por legado) —
 * esos pasan directo, sin costo ni rasterizado.
 *
 * Costo: FAL storage upload es almacenamiento, no inferencia — no consume
 * los mismos créditos que generación/upscale de imagen.
 */

import sharp from 'sharp';

const ENV = process.env;

/** Convierte un data-URL SVG (o buffer SVG crudo) a un Buffer PNG. */
export const svgToPng = async (svgInput, { width = 1080 } = {}) => {
  let svgBuffer;
  if (typeof svgInput === 'string' && svgInput.startsWith('data:')) {
    const base64 = svgInput.split(',')[1] || '';
    svgBuffer = Buffer.from(base64, 'base64');
  } else if (typeof svgInput === 'string') {
    svgBuffer = Buffer.from(svgInput, 'utf-8');
  } else {
    svgBuffer = svgInput;
  }

  return sharp(svgBuffer, { density: 300 }).resize({ width, withoutEnlargement: false }).png().toBuffer();
};

/**
 * Sube un Buffer a FAL storage y devuelve una URL pública HTTPS.
 * Flujo de 2 pasos documentado por FAL: initiate (obtiene upload_url +
 * file_url) → PUT del buffer crudo a upload_url. file_url queda servible
 * de inmediato por el CDN de FAL.
 */
export const uploadBufferPublic = async (buffer, { contentType = 'image/png', fileName = 'slide.png' } = {}) => {
  if (!ENV.FAL_KEY) return { error: 'no-fal-key', message: 'FAL_KEY no configurada — no se puede hostear la imagen.' };
  try {
    const initRes = await fetch('https://rest.alpha.fal.ai/storage/upload/initiate', {
      method: 'POST',
      headers: { Authorization: `Key ${ENV.FAL_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ content_type: contentType, file_name: fileName }),
    });
    if (!initRes.ok) {
      return {
        error: 'fal-initiate',
        message: `FAL initiate ${initRes.status}: ${(await initRes.text()).slice(0, 200)}`,
      };
    }
    const { upload_url, file_url } = await initRes.json();
    if (!upload_url || !file_url)
      return { error: 'fal-initiate', message: 'Respuesta de FAL sin upload_url/file_url.' };

    const putRes = await fetch(upload_url, {
      method: 'PUT',
      headers: { 'Content-Type': contentType },
      body: buffer,
    });
    if (!putRes.ok) {
      return { error: 'fal-upload', message: `FAL upload ${putRes.status}: ${(await putRes.text()).slice(0, 200)}` };
    }

    return { ok: true, url: file_url };
  } catch (err) {
    return { error: 'fal-exception', message: String(err?.message || err) };
  }
};

/**
 * Atajo: un slide → URL pública, sea cual sea su forma de entrada.
 * - Ya es URL pública (http/https, ej: export de Canva) → pasa directo, $0.
 * - Es data-URL (SVG del composer propio) → rasteriza + sube a FAL.
 */
export const hostSlide = async (slideUrlOrDataUrl, { width = 1080, fileName = 'slide.png' } = {}) => {
  if (/^https?:\/\//.test(slideUrlOrDataUrl || '')) {
    return { ok: true, url: slideUrlOrDataUrl };
  }
  let png;
  try {
    png = await svgToPng(slideUrlOrDataUrl, { width });
  } catch (err) {
    return { error: 'rasterize', message: String(err?.message || err) };
  }
  return uploadBufferPublic(png, { contentType: 'image/png', fileName });
};

/**
 * Hostea todos los slides de un carrusel en paralelo (con límite de
 * concurrencia razonable) y devuelve las URLs en el mismo orden, o el
 * primer error encontrado (falla rápido — un carrusel con slides faltantes
 * no debe publicarse a medias). Slides ya públicos (Canva) pasan gratis;
 * solo los data-URL (composer SVG propio) se rasterizan y suben.
 */
export const hostCarouselSlides = async (slideUrlsOrDataUrls, { width = 1080, concurrency = 3 } = {}) => {
  const results = new Array(slideUrlsOrDataUrls.length);
  let cursor = 0;

  const worker = async () => {
    while (cursor < slideUrlsOrDataUrls.length) {
      const i = cursor++;
      results[i] = await hostSlide(slideUrlsOrDataUrls[i], { width, fileName: `slide-${i + 1}.png` });
    }
  };

  await Promise.all(Array.from({ length: Math.min(concurrency, slideUrlsOrDataUrls.length) }, worker));

  const firstError = results.find((r) => r?.error);
  if (firstError) return { error: firstError.error, message: firstError.message, partial: results };

  return { ok: true, urls: results.map((r) => r.url) };
};
