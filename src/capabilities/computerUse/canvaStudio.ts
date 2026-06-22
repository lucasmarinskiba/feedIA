/**
 * Canva Studio de FeedIA — workflows completos de Canva vía Computer Use.
 *
 * El sistema abre Canva en el navegador, navega a un template, lo customiza con
 * texto/imágenes específicos de la marca, exporta el diseño y deja el archivo
 * listo para Instagram. Todo mientras el usuario ve el cursor moverse y los
 * elementos arrastrarse en pantalla.
 */

import { join } from 'node:path';
import { homedir } from 'node:os';
import { log } from '../../agent/logger.js';
import { runComputerUseSession, type ComputerUseResult } from './controller.js';
import { openCanva, ensureAppRunning, focusApp } from './appLauncher.js';
import { env } from '../../config/index.js';
import type { BrandProfile } from '../../config/types.js';

// ── Tipos ─────────────────────────────────────────────────────────────────────

export type CanvaDesignType =
  | 'instagram-post' // 1080x1080
  | 'instagram-story' // 1080x1920
  | 'instagram-reel-cover' // 1080x1920
  | 'instagram-carousel' // 1080x1080 multi-slide
  | 'facebook-post'
  | 'linkedin-post'
  | 'youtube-thumbnail'
  | 'pinterest-pin'
  | 'logo'
  | 'flyer'
  | 'custom';

export interface CanvaTemplate {
  id?: string; // ID interno de Canva (si se conoce)
  searchQuery?: string; // si no hay ID, buscar por query
  designType: CanvaDesignType;
  customWidth?: number; // para custom
  customHeight?: number;
}

export interface CanvaTextEdit {
  findText: string; // texto actual a reemplazar
  replaceWith: string; // texto nuevo
  styleHints?: string; // ej: "agrandar 20%", "centrar", "color rojo de marca"
}

export interface CanvaImageReplace {
  positionDescription: string; // dónde está la imagen ("foto principal", "icono superior")
  newImageUrl?: string; // URL pública de la nueva imagen
  newImageLocalPath?: string; // o ruta local
  searchPhotoQuery?: string; // o buscar foto en Canva con esta query
}

export interface CanvaCustomization {
  textEdits: CanvaTextEdit[];
  imageReplaces: CanvaImageReplace[];
  applyBrandColors?: boolean;
  applyBrandFont?: boolean;
  customInstructions?: string;
}

export interface CanvaExportOptions {
  format: 'png' | 'jpg' | 'pdf' | 'mp4' | 'gif';
  quality?: 'standard' | 'high' | 'print';
  transparent?: boolean; // solo PNG
  downloadFolder?: string; // default ~/Downloads
}

export interface CanvaSessionResult {
  ok: boolean;
  designUrl?: string; // URL del diseño en Canva
  exportedFilePath?: string; // archivo final exportado
  computerUseResult: ComputerUseResult;
  actionsExecuted: number;
  durationMs: number;
  error?: string;
}

// ── Sesión completa Canva (apertura + búsqueda template + customización + export) ──

export const runCanvaWorkflow = async (
  brand: BrandProfile,
  template: CanvaTemplate,
  customization: CanvaCustomization,
  exportOptions: CanvaExportOptions,
): Promise<CanvaSessionResult> => {
  const start = Date.now();
  log.info(
    `[CanvaStudio] Workflow Canva iniciado: ${template.designType}, ${customization.textEdits.length} edits de texto`,
  );

  if (env.dryRun) {
    log.warn('[CanvaStudio] DRY RUN: simulando workflow Canva');
    return {
      ok: true,
      designUrl: 'https://canva.com/mock-design',
      exportedFilePath: join(homedir(), 'Downloads', 'mock-canva-export.png'),
      computerUseResult: { ok: true, summary: '[DRY RUN] Canva workflow simulado', actionsExecuted: 0 },
      actionsExecuted: 0,
      durationMs: Date.now() - start,
    };
  }

  // Step 1: abrir Canva en el navegador
  const launchResult = await openCanva(undefined, 'chrome');
  if (!launchResult.ok) {
    return {
      ok: false,
      computerUseResult: { ok: false, summary: 'No se pudo abrir Canva', actionsExecuted: 0 },
      actionsExecuted: 0,
      durationMs: Date.now() - start,
      error: launchResult.error,
    };
  }

  // Step 2: construir contexto detallado para Computer Use
  const designSize = canvaSizeMap[template.designType];
  const textEditsList = customization.textEdits
    .map(
      (e, i) =>
        `   ${i + 1}. Reemplazar "${e.findText}" por "${e.replaceWith}"${e.styleHints ? ` (${e.styleHints})` : ''}`,
    )
    .join('\n');
  const imageReplacesList = customization.imageReplaces
    .map(
      (r, i) =>
        `   ${i + 1}. ${r.positionDescription}: ${r.searchPhotoQuery ? `buscar foto "${r.searchPhotoQuery}"` : r.newImageUrl ? `subir desde ${r.newImageUrl}` : 'mantener'}`,
    )
    .join('\n');

  const brandColors = brand.visual.palette.join(', ') || '(no definidos)';
  const brandFont = brand.visual.typography?.[0] ?? '(no definida)';

  const downloadFolder = exportOptions.downloadFolder ?? join(homedir(), 'Downloads');

  const goal = `Diseñar una pieza visual en Canva para @${brand.name} usando computer use.

PASO 1: Buscar template
${
  template.id
    ? `- En Canva, abrir directamente el template con ID ${template.id}`
    : `- Hacer clic en la barra de búsqueda de Canva
- Escribir: "${template.searchQuery ?? template.designType}"
- Presionar Enter
- Esperar a que carguen los resultados
- Elegir un template profesional (preferentemente el primero o el mejor visualmente)
- Hacer clic en él para abrirlo en el editor`
}

PASO 2: Customizar el diseño
${
  customization.textEdits.length > 0
    ? `
EDICIONES DE TEXTO (hacer doble clic en cada texto y reemplazar):
${textEditsList}
`
    : ''
}
${
  customization.imageReplaces.length > 0
    ? `
REEMPLAZOS DE IMAGEN:
${imageReplacesList}
`
    : ''
}
${
  customization.applyBrandColors
    ? `
APLICAR COLORES DE MARCA:
- Paleta de marca: ${brandColors}
- Seleccionar cada elemento con color y cambiarlo al color de marca correspondiente
- Usar el panel "Colors" en la barra superior
`
    : ''
}
${
  customization.applyBrandFont
    ? `
APLICAR TIPOGRAFÍA DE MARCA:
- Tipografía de marca: ${brandFont}
- Seleccionar cada texto y cambiar la fuente
`
    : ''
}
${
  customization.customInstructions
    ? `
INSTRUCCIONES ADICIONALES:
${customization.customInstructions}
`
    : ''
}

PASO 3: Exportar
- Hacer clic en el botón "Share" o "Compartir" arriba a la derecha
- Hacer clic en "Download" o "Descargar"
- Elegir formato: ${exportOptions.format.toUpperCase()}
${exportOptions.quality ? `- Calidad: ${exportOptions.quality}` : ''}
${exportOptions.transparent ? '- Fondo transparente: activado' : ''}
- Hacer clic en "Download" para descargar
- Esperar a que termine la descarga
- El archivo quedará en: ${downloadFolder}

CONSIDERACIONES IMPORTANTES:
- Dimensiones objetivo: ${designSize.width}x${designSize.height}px (${template.designType})
- Si el template tiene placeholders genéricos, reemplazarlos con texto/imágenes relevantes para la marca @${brand.name}
- Mantener consistencia visual con el estilo de marca: ${brand.visual.mood ?? 'profesional'}
- Si Canva pide login, asumir que ya estamos logueados; si no, esperar 30s a que el usuario interactúe
- Si aparece un popup de "Pro features", buscar la opción de usar versión gratuita o elegir otro template`;

  // Step 3: ejecutar el computer use session
  const cuResult = await runComputerUseSession(brand, {
    goal,
    context: `Marca: ${brand.name}, nicho: ${brand.niche}. Tono visual: ${brand.visual.mood ?? 'profesional'}.`,
    maxIterations: 60,
  });

  // Step 4: detectar archivo descargado
  let exportedFilePath: string | undefined;
  try {
    const { detectRecentDownload } = await import('./fileBridge.js');
    exportedFilePath = await detectRecentDownload({
      folder: downloadFolder,
      extension: exportOptions.format,
      maxAgeSeconds: 300,
    });
  } catch (err) {
    log.warn(`[CanvaStudio] No se pudo detectar download: ${(err as Error).message}`);
  }

  log.info(
    `[CanvaStudio] Workflow completado en ${Math.round((Date.now() - start) / 1000)}s. Archivo: ${exportedFilePath ?? '(no detectado)'}`,
  );

  return {
    ok: cuResult.ok && Boolean(exportedFilePath),
    designUrl: undefined,
    exportedFilePath,
    computerUseResult: cuResult,
    actionsExecuted: cuResult.actionsExecuted,
    durationMs: Date.now() - start,
    error: cuResult.error,
  };
};

// ── Mapeo de tipo → dimensiones ───────────────────────────────────────────────

const canvaSizeMap: Record<CanvaDesignType, { width: number; height: number }> = {
  'instagram-post': { width: 1080, height: 1080 },
  'instagram-story': { width: 1080, height: 1920 },
  'instagram-reel-cover': { width: 1080, height: 1920 },
  'instagram-carousel': { width: 1080, height: 1080 },
  'facebook-post': { width: 1200, height: 630 },
  'linkedin-post': { width: 1200, height: 627 },
  'youtube-thumbnail': { width: 1280, height: 720 },
  'pinterest-pin': { width: 1000, height: 1500 },
  logo: { width: 500, height: 500 },
  flyer: { width: 850, height: 1100 },
  custom: { width: 1080, height: 1080 },
};

// ── Helpers de alto nivel ─────────────────────────────────────────────────────

export const createInstagramPost = async (
  brand: BrandProfile,
  topic: string,
  mainText: string,
  cta: string,
): Promise<CanvaSessionResult> =>
  runCanvaWorkflow(
    brand,
    { designType: 'instagram-post', searchQuery: `${topic} Instagram post template` },
    {
      textEdits: [
        { findText: 'TITLE', replaceWith: mainText, styleHints: 'principal, centrado' },
        { findText: 'SUBTITLE', replaceWith: topic },
        { findText: 'CTA', replaceWith: cta },
      ],
      imageReplaces: [],
      applyBrandColors: true,
      applyBrandFont: true,
      customInstructions: `El diseño debe transmitir: ${brand.visual.mood ?? 'profesional'}. Tono: ${brand.voice.tone.join(', ')}.`,
    },
    { format: 'png', quality: 'high' },
  );

export const createInstagramStory = async (
  brand: BrandProfile,
  topic: string,
  hookText: string,
  stickerCTA: string,
): Promise<CanvaSessionResult> =>
  runCanvaWorkflow(
    brand,
    { designType: 'instagram-story', searchQuery: `${topic} Instagram story template` },
    {
      textEdits: [
        { findText: 'HOOK', replaceWith: hookText, styleHints: 'arriba, grande' },
        { findText: 'CTA', replaceWith: stickerCTA, styleHints: 'abajo, con énfasis' },
      ],
      imageReplaces: [],
      applyBrandColors: true,
      applyBrandFont: true,
    },
    { format: 'png', quality: 'high' },
  );

export const createCarouselSlide = async (
  brand: BrandProfile,
  slideNumber: number,
  totalSlides: number,
  title: string,
  body: string,
  isFirstSlide: boolean,
  isLastSlide: boolean,
): Promise<CanvaSessionResult> => {
  const role = isFirstSlide
    ? 'PORTADA con hook irresistible'
    : isLastSlide
      ? 'CIERRE con CTA claro'
      : 'CONTENIDO con una idea por slide';

  return runCanvaWorkflow(
    brand,
    { designType: 'instagram-post', searchQuery: `Instagram carousel slide ${slideNumber} of ${totalSlides}` },
    {
      textEdits: [
        { findText: 'TITLE', replaceWith: title, styleHints: `slide ${slideNumber}/${totalSlides}, rol: ${role}` },
        { findText: 'BODY', replaceWith: body },
        { findText: 'NUMBER', replaceWith: `${slideNumber}/${totalSlides}` },
      ],
      imageReplaces: [],
      applyBrandColors: true,
      applyBrandFont: true,
      customInstructions: `Slide ${slideNumber} de ${totalSlides}. Rol: ${role}. Mantener consistencia visual con las otras slides del carrusel.`,
    },
    { format: 'png', quality: 'high' },
  );
};

// ── Refocus y resume ──────────────────────────────────────────────────────────

export const resumeCanvaSession = async (brand: BrandProfile, instruction: string): Promise<ComputerUseResult> => {
  await ensureAppRunning('chrome', { url: 'https://www.canva.com/', waitForReadyMs: 3000 });
  focusApp('chrome');
  return runComputerUseSession(brand, {
    goal: instruction,
    context: 'Estamos en una sesión activa de Canva. Continuá desde donde está el cursor.',
    maxIterations: 30,
  });
};

// ── Multi-slide carousel orchestrator ─────────────────────────────────────────

export interface CarouselDefinition {
  slides: Array<{
    title: string;
    body: string;
    visualHint?: string;
  }>;
  baseTemplate?: string;
}

export const createFullCarousel = async (
  brand: BrandProfile,
  carousel: CarouselDefinition,
): Promise<{
  ok: boolean;
  slides: Array<{ slideNumber: number; filePath?: string; error?: string }>;
  totalDurationMs: number;
}> => {
  const start = Date.now();
  const slides: Array<{ slideNumber: number; filePath?: string; error?: string }> = [];

  for (let i = 0; i < carousel.slides.length; i++) {
    const slide = carousel.slides[i]!;
    const isFirst = i === 0;
    const isLast = i === carousel.slides.length - 1;
    try {
      const result = await createCarouselSlide(
        brand,
        i + 1,
        carousel.slides.length,
        slide.title,
        slide.body,
        isFirst,
        isLast,
      );
      slides.push({
        slideNumber: i + 1,
        filePath: result.exportedFilePath,
        error: result.ok ? undefined : result.error,
      });
    } catch (err) {
      slides.push({ slideNumber: i + 1, error: (err as Error).message });
    }
  }

  const ok = slides.every((s) => s.filePath);
  log.info(
    `[CanvaStudio] Carrusel completado: ${slides.filter((s) => s.filePath).length}/${carousel.slides.length} slides en ${Math.round((Date.now() - start) / 1000)}s`,
  );
  return { ok, slides, totalDurationMs: Date.now() - start };
};
