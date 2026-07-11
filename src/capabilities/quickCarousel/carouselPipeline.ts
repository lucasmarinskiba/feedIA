// @ts-nocheck
/**
 * Carousel Pipeline — Orquestador end-to-end de los 3 caminos.
 *
 *   Camino A: SVG/PNG nativo (render/rasterizer.ts) → Instagram
 *   Camino B: Canva API (autofill template) → exportar PNG → Instagram
 *   Camino C: fal.ai (generación IA) → componer slides → Instagram
 *
 * Cada camino toma el QuickCarouselPackage (briefs+slides+caption+hashtags)
 * y produce: archivos de imagen + publishResult.
 *
 * Auto-detecta qué credenciales hay y elige camino disponible.
 * Fallback automático si camino primario falla.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { log } from '../../agent/logger.js';
import type { BrandProfile } from '../../config/types.js';
import { renderCarruselSlidePng } from '../render/rasterizer.js';
import { renderCarruselSlideSvg } from '../render/svgPreview.js';
import type { CarruselSlide } from '../content/carrusel.js';
import type { QuickCarouselPackage } from './quickCarousel.js';

import { autofillTemplate, exportDesign } from '../../integrations/canva.js';
import {
  generateImage as falGenerateImage,
  isFalAvailable,
  type AspectRatio,
  type ImageStyle,
} from '../../integrations/falAi.js';
import { routeImageGen } from '../../services/provider-router.js';
import { uploadToSocial, isUploadPostAvailable, type SocialPlatform } from '../../integrations/uploadPost.js';

// ── Tipos ─────────────────────────────────────────────────────────────────────

export type CarouselPath = 'A-native' | 'B-canva' | 'C-fal-ai';

export interface PipelineConfig {
  path?: CarouselPath; // si no se pasa, auto-detect
  publishToInstagram?: boolean; // default false (solo genera, no publica)
  publishToOtherPlatforms?: SocialPlatform[];
  canvaTemplateId?: string; // requerido si path = B
  falModel?: Parameters<typeof falGenerateImage>[0]['model'];
  falStyle?: ImageStyle;
  scheduledFor?: string; // ISO date — programar publicación
  dryRun?: boolean; // si true, no publica
}

export interface PipelineResult {
  packageId: string;
  pathUsed: CarouselPath;
  slidePaths: string[]; // archivos PNG generados
  previewSvgPaths?: string[]; // SVG preview (camino A)
  canvaDesignUrl?: string;
  uploadId?: string;
  publishedUrl?: string;
  publishedAt?: string;
  scheduledFor?: string;
  status: 'rendered' | 'queued' | 'published' | 'scheduled' | 'failed';
  errors: string[];
  durationMs: number;
}

export interface CapabilitiesStatus {
  hasAnthropic: boolean;
  hasFalAi: boolean;
  hasCanva: boolean;
  hasUploadPost: boolean;
  availablePaths: CarouselPath[];
  recommendedPath: CarouselPath;
  reasoning: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const PIPELINE_DIR = path.resolve('data/quick-carousel/rendered');

const ensureDir = async (): Promise<void> => {
  await fs.mkdir(PIPELINE_DIR, { recursive: true });
};

const slidePath = (pkgId: string, slideIdx: number, ext: 'png' | 'svg'): string =>
  path.join(PIPELINE_DIR, `${pkgId}-slide-${slideIdx + 1}.${ext}`);

const isCanvaAvailable = (): boolean => Boolean(process.env['CANVA_CLIENT_ID'] && process.env['CANVA_CLIENT_SECRET']);

// ── Adaptador: QuickCarouselPackage → CarruselSlide[] (legacy format) ────────

const toLegacySlides = (pkg: QuickCarouselPackage): CarruselSlide[] => {
  return pkg.slides.map((s, i) => ({
    numero: i + 1,
    titulo: s.visualText.split('\n')[0]?.slice(0, 80) ?? '',
    cuerpo: s.visualText,
    rolEnNarrativa: (i === 0
      ? 'gancho'
      : i === pkg.slides.length - 1
        ? 'cta'
        : 'desarrollo') as CarruselSlide['rolEnNarrativa'],
    direccionVisual: s.designBrief.imageDirection,
  }));
};

// ── Detector de capacidades ──────────────────────────────────────────────────

export const checkCapabilities = (): CapabilitiesStatus => {
  const hasAnthropic = Boolean(process.env['ANTHROPIC_API_KEY']);
  const hasFalAi = isFalAvailable();
  const hasCanva = isCanvaAvailable();
  const hasUploadPost = isUploadPostAvailable();

  const availablePaths: CarouselPath[] = [];
  // Camino A siempre disponible (sin APIs externas más allá de Anthropic)
  if (hasAnthropic) availablePaths.push('A-native');
  if (hasCanva) availablePaths.push('B-canva');
  if (hasFalAi) availablePaths.push('C-fal-ai');

  let recommendedPath: CarouselPath = 'A-native';
  let reasoning = 'Native SVG/PNG render — sin costo extra, deterministic';

  if (hasCanva) {
    recommendedPath = 'B-canva';
    reasoning = 'Canva — diseños editables, mejor calidad visual final';
  } else if (hasFalAi) {
    recommendedPath = 'C-fal-ai';
    reasoning = 'fal.ai — imágenes fotorealistas IA, alto impacto visual';
  }

  return { hasAnthropic, hasFalAi, hasCanva, hasUploadPost, availablePaths, recommendedPath, reasoning };
};

// ── CAMINO A: Native SVG/PNG ─────────────────────────────────────────────────

export const renderNative = async (
  brand: BrandProfile,
  pkg: QuickCarouselPackage,
): Promise<{ pngPaths: string[]; svgPaths: string[] }> => {
  await ensureDir();
  const legacySlides = toLegacySlides(pkg);
  const pngPaths: string[] = [];
  const svgPaths: string[] = [];

  for (let i = 0; i < legacySlides.length; i++) {
    const slide = legacySlides[i]!;

    // SVG preview
    const svg = renderCarruselSlideSvg(brand, slide, i + 1, legacySlides.length);
    const svgFile = slidePath(pkg.id, i, 'svg');
    await fs.writeFile(svgFile, svg, 'utf-8');
    svgPaths.push(svgFile);

    // PNG publicable
    const png = renderCarruselSlidePng(brand, slide, i + 1, legacySlides.length);
    const pngFile = slidePath(pkg.id, i, 'png');
    await fs.writeFile(pngFile, png);
    pngPaths.push(pngFile);
  }

  log.info('[carouselPipeline] native render done', { pkgId: pkg.id, slides: pngPaths.length });
  return { pngPaths, svgPaths };
};

// ── CAMINO B: Canva ──────────────────────────────────────────────────────────

export const renderViaCanva = async (
  brand: BrandProfile,
  pkg: QuickCarouselPackage,
  templateId: string,
): Promise<{ designUrl: string; pngPaths: string[] }> => {
  if (!isCanvaAvailable())
    throw new Error('[carouselPipeline] Canva credentials missing (CANVA_CLIENT_ID + CANVA_CLIENT_SECRET)');
  await ensureDir();

  log.info('[carouselPipeline] starting Canva pipeline', { pkgId: pkg.id, templateId });

  const pngPaths: string[] = [];
  let designUrl = '';

  // Por cada slide: autofill template con texto, exportar PNG
  for (let i = 0; i < pkg.slides.length; i++) {
    const slide = pkg.slides[i]!;
    const brief = slide.designBrief;

    const fillResult = await autofillTemplate({
      brandTemplateId: templateId,
      title: `${pkg.refinedBrief.refinedTopic} — slide ${i + 1}`,
      data: {
        main_text: { type: 'text', value: slide.visualText },
        slide_number: { type: 'text', value: `${i + 1}/${pkg.slides.length}` },
        brand_handle: { type: 'text', value: `@${(brand as unknown as { handle?: string }).handle ?? brand.name}` },
        ...(brief.cta ? { cta: { type: 'text' as const, value: brief.cta } } : {}),
      },
    });

    if (!fillResult.ok || !fillResult.designId) {
      throw new Error(`[carouselPipeline] Canva autofill failed for slide ${i + 1}: ${fillResult.error ?? 'unknown'}`);
    }

    const exported = await exportDesign({
      designId: fillResult.designId,
      format: 'png',
      quality: 'high',
    });

    if (i === 0 && fillResult.designUrl) designUrl = fillResult.designUrl;

    // Descargar primer PNG exportado a disco
    const fileUrl = exported.urls?.[0];
    if (exported.ok && fileUrl) {
      const res = await fetch(fileUrl);
      const buffer = Buffer.from(await res.arrayBuffer());
      const pngFile = slidePath(pkg.id, i, 'png');
      await fs.writeFile(pngFile, buffer);
      pngPaths.push(pngFile);
    }
  }

  log.info('[carouselPipeline] Canva render done', { pkgId: pkg.id, slides: pngPaths.length });
  return { designUrl, pngPaths };
};

// ── CAMINO C: fal.ai ─────────────────────────────────────────────────────────

export const renderViaFalAi = async (
  brand: BrandProfile,
  pkg: QuickCarouselPackage,
  config: { model?: Parameters<typeof falGenerateImage>[0]['model']; style?: ImageStyle } = {},
  userHandle?: string,
): Promise<{ pngPaths: string[] }> => {
  if (!isFalAvailable()) throw new Error('[carouselPipeline] FAL_KEY env missing');
  await ensureDir();

  log.info('[carouselPipeline] starting fal.ai pipeline', { pkgId: pkg.id });

  const pngPaths: string[] = [];
  const aspectRatio: AspectRatio = '4:5'; // óptimo para carrusel IG vertical

  for (let i = 0; i < pkg.slides.length; i++) {
    const slide = pkg.slides[i]!;
    const brief = slide.designBrief;

    // Prompt completo para fal.ai
    const prompt = `Instagram carousel slide design. ${brief.imageDirection}.
Visual style: ${brief.visualStyle}.
Color palette: ${brief.colorPalette.primary} primary, ${brief.colorPalette.accent} accent.
Typography: ${brief.typography.headline}.
Text overlay: "${slide.visualText.slice(0, 80)}".
${brief.elements.join(', ')}. High quality, professional, ${aspectRatio} aspect ratio.`;

    const routeResult = await routeImageGen({
      prompt,
      contentType: 'carousel-frame',
      userHandle: userHandle ?? brand.handle,
      style: config.style ?? 'minimal',
    });

    if (!routeResult.ok || !routeResult.url) {
      log.warn('[carouselPipeline] provider-router returned no image', { slide: i + 1, error: routeResult.error });
      continue;
    }

    // Descargar PNG
    const res = await fetch(routeResult.url);
    const buffer = Buffer.from(await res.arrayBuffer());
    const pngFile = slidePath(pkg.id, i, 'png');
    await fs.writeFile(pngFile, buffer);
    pngPaths.push(pngFile);
  }

  log.info('[carouselPipeline] fal.ai render done', { pkgId: pkg.id, slides: pngPaths.length });
  return { pngPaths };
};

// ── Orquestador principal ─────────────────────────────────────────────────────

export const runCarouselPipeline = async (
  brand: BrandProfile,
  pkg: QuickCarouselPackage,
  config: PipelineConfig = {},
  userHandle?: string,
): Promise<PipelineResult> => {
  const startTime = Date.now();
  const errors: string[] = [];
  const caps = checkCapabilities();

  // Selección de camino
  const path: CarouselPath = config.path ?? caps.recommendedPath;
  log.info('[carouselPipeline] pipeline start', { pkgId: pkg.id, path });

  let slidePaths: string[] = [];
  let previewSvgPaths: string[] | undefined;
  let canvaDesignUrl: string | undefined;

  try {
    switch (path) {
      case 'A-native': {
        const result = await renderNative(brand, pkg);
        slidePaths = result.pngPaths;
        previewSvgPaths = result.svgPaths;
        break;
      }
      case 'B-canva': {
        if (!config.canvaTemplateId) throw new Error('canvaTemplateId required for path B');
        const result = await renderViaCanva(brand, pkg, config.canvaTemplateId);
        slidePaths = result.pngPaths;
        canvaDesignUrl = result.designUrl;
        break;
      }
      case 'C-fal-ai': {
        const result = await renderViaFalAi(brand, pkg, { model: config.falModel, style: config.falStyle }, userHandle ?? brand.handle);
        slidePaths = result.pngPaths;
        break;
      }
    }
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    errors.push(`Render failed (${path}): ${errMsg}`);
    log.warn('[carouselPipeline] render failed, attempting fallback to native', { err: errMsg });

    // Fallback automático a camino A si otro falla
    if (path !== 'A-native') {
      try {
        const fallback = await renderNative(brand, pkg);
        slidePaths = fallback.pngPaths;
        previewSvgPaths = fallback.svgPaths;
      } catch (fallbackErr) {
        errors.push(`Native fallback also failed: ${String(fallbackErr)}`);
        return {
          packageId: pkg.id,
          pathUsed: path,
          slidePaths: [],
          status: 'failed',
          errors,
          durationMs: Date.now() - startTime,
        };
      }
    } else {
      return {
        packageId: pkg.id,
        pathUsed: path,
        slidePaths: [],
        status: 'failed',
        errors,
        durationMs: Date.now() - startTime,
      };
    }
  }

  // Publicación
  if (!config.publishToInstagram && !config.publishToOtherPlatforms?.length) {
    return {
      packageId: pkg.id,
      pathUsed: path,
      slidePaths,
      previewSvgPaths,
      canvaDesignUrl,
      status: 'rendered',
      errors,
      durationMs: Date.now() - startTime,
    };
  }

  // Si es scheduled, no publicar ahora
  if (config.scheduledFor) {
    await scheduleCarousel(pkg.id, slidePaths, pkg, config);
    return {
      packageId: pkg.id,
      pathUsed: path,
      slidePaths,
      previewSvgPaths,
      canvaDesignUrl,
      scheduledFor: config.scheduledFor,
      status: 'scheduled',
      errors,
      durationMs: Date.now() - startTime,
    };
  }

  if (config.dryRun || process.env['DRY_RUN'] === 'true') {
    log.info('[carouselPipeline] DRY_RUN active, skipping publish');
    return {
      packageId: pkg.id,
      pathUsed: path,
      slidePaths,
      previewSvgPaths,
      canvaDesignUrl,
      status: 'queued',
      errors,
      durationMs: Date.now() - startTime,
    };
  }

  try {
    const platforms: SocialPlatform[] = ['instagram', ...(config.publishToOtherPlatforms ?? [])];
    const { withUploadRetry } = await import('../../auth/retryHelper.js');
    const uploadResult = await withUploadRetry(
      () =>
        uploadToSocial({
          platforms,
          mediaType: 'carousel',
          mediaUrls: slidePaths,
          caption: pkg.caption.full,
          hashtags: pkg.hashtags.flat,
        }),
      `carousel-${pkg.id}`,
    );

    const igResult = uploadResult.perPlatformResults.find((r) => r.platform === 'instagram');
    return {
      packageId: pkg.id,
      pathUsed: path,
      slidePaths,
      previewSvgPaths,
      canvaDesignUrl,
      uploadId: uploadResult.uploadId,
      publishedUrl: igResult?.socialUrl,
      publishedAt: new Date().toISOString(),
      status: uploadResult.ok ? 'published' : 'queued',
      errors,
      durationMs: Date.now() - startTime,
    };
  } catch (err) {
    errors.push(`Publish failed: ${String(err)}`);
    return {
      packageId: pkg.id,
      pathUsed: path,
      slidePaths,
      previewSvgPaths,
      canvaDesignUrl,
      status: 'queued',
      errors,
      durationMs: Date.now() - startTime,
    };
  }
};

// ── Scheduler (Nivel 5 — publicación programada) ─────────────────────────────

const SCHEDULE_FILE = path.resolve('data/quick-carousel/scheduled.json');

interface ScheduledItem {
  pkgId: string;
  slidePaths: string[];
  caption: string;
  hashtags: string[];
  scheduledFor: string;
  platforms: SocialPlatform[];
  status: 'pending' | 'published' | 'failed';
  createdAt: string;
}

const scheduleCarousel = async (
  pkgId: string,
  slidePaths: string[],
  pkg: QuickCarouselPackage,
  config: PipelineConfig,
): Promise<void> => {
  await ensureDir();
  let scheduled: ScheduledItem[] = [];
  try {
    scheduled = JSON.parse(await fs.readFile(SCHEDULE_FILE, 'utf-8')) as ScheduledItem[];
  } catch {
    /* noop */
  }

  scheduled.push({
    pkgId,
    slidePaths,
    caption: pkg.caption.full,
    hashtags: pkg.hashtags.flat,
    scheduledFor: config.scheduledFor!,
    platforms: ['instagram', ...(config.publishToOtherPlatforms ?? [])],
    status: 'pending',
    createdAt: new Date().toISOString(),
  });

  await fs.writeFile(SCHEDULE_FILE, JSON.stringify(scheduled, null, 2), 'utf-8');
  log.info('[carouselPipeline] scheduled', { pkgId, scheduledFor: config.scheduledFor });
};

/** Procesa publicaciones programadas que ya pasaron su scheduledFor. */
export const processScheduled = async (): Promise<{ published: number; failed: number }> => {
  let scheduled: ScheduledItem[] = [];
  try {
    scheduled = JSON.parse(await fs.readFile(SCHEDULE_FILE, 'utf-8')) as ScheduledItem[];
  } catch {
    return { published: 0, failed: 0 };
  }

  const now = Date.now();
  let published = 0;
  let failed = 0;

  for (const item of scheduled) {
    if (item.status !== 'pending') continue;
    if (new Date(item.scheduledFor).getTime() > now) continue;

    try {
      const { withUploadRetry } = await import('../../auth/retryHelper.js');
      await withUploadRetry(
        () =>
          uploadToSocial({
            platforms: item.platforms,
            mediaType: 'carousel',
            mediaUrls: item.slidePaths,
            caption: item.caption,
            hashtags: item.hashtags,
          }),
        `scheduled-${item.pkgId}`,
      );
      item.status = 'published';
      published++;

      // Notificar al user
      void notifyScheduledRan(item.pkgId, 'published');
    } catch (err) {
      log.warn('[carouselPipeline] scheduled publish failed after retries', { pkgId: item.pkgId, err: String(err) });
      item.status = 'failed';
      failed++;
      void notifyScheduledRan(item.pkgId, 'failed', String(err));
    }
  }

  await fs.writeFile(SCHEDULE_FILE, JSON.stringify(scheduled, null, 2), 'utf-8');
  log.info('[carouselPipeline] processed scheduled', { published, failed });
  return { published, failed };
};

/** Helper: notifica al user que su scheduled corrió. Best-effort. */
const notifyScheduledRan = async (pkgId: string, outcome: 'published' | 'failed', errorMsg?: string): Promise<void> => {
  try {
    // Buscar a quién pertenece este pkg desde el filename pattern
    const files = await fs.readdir(path.resolve('data/quick-carousel')).catch(() => []);
    const match = files.find((f) => f.includes(pkgId) && f.endsWith('.json'));
    if (!match) return;
    const pkgRaw = await fs.readFile(path.resolve('data/quick-carousel', match), 'utf-8');
    const pkg = JSON.parse(pkgRaw) as { brandId: string };
    const brandId = pkg.brandId;

    // Buscar user owner del brand
    const { findUsersByBrandId } = await import('../../auth/userAccounts.js');
    const owners = await findUsersByBrandId(brandId);
    if (!owners.length) return;

    const { createNotification } = await import('../../auth/notificationCenter.js');
    for (const owner of owners) {
      await createNotification({
        userId: owner.id,
        type: 'carousel-scheduled-ran',
        priority: outcome === 'published' ? 'success' : 'critical',
        title: outcome === 'published' ? '✅ Carrusel programado publicado' : '❌ Falló publicación programada',
        message:
          outcome === 'published'
            ? `Tu carrusel ${pkgId} se publicó automáticamente como estaba agendado.`
            : `Falló la publicación programada de ${pkgId}: ${errorMsg ?? 'error desconocido'}`,
        metadata: { pkgId, brandId, outcome },
      });
    }
  } catch (err) {
    log.warn('[carouselPipeline] notify failed', { pkgId, err: String(err) });
  }
};

/** Lista publicaciones programadas. */
export const listScheduled = async (): Promise<ScheduledItem[]> => {
  try {
    return JSON.parse(await fs.readFile(SCHEDULE_FILE, 'utf-8')) as ScheduledItem[];
  } catch {
    return [];
  }
};

// ── Preview HTML (Nivel 1 enhanced — para revisión humana) ───────────────────

export const generatePreviewHTML = async (brand: BrandProfile, pkg: QuickCarouselPackage): Promise<string> => {
  // Genera HTML con preview SVG inline de todas las slides
  const { svgPaths } = await renderNative(brand, pkg);
  const svgs = await Promise.all(svgPaths.map((p) => fs.readFile(p, 'utf-8')));

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>Preview: ${pkg.refinedBrief.refinedTopic}</title>
<style>
  body { font-family: -apple-system, system-ui, sans-serif; background: #0a0a0a; color: #fff; padding: 40px; }
  h1 { color: ${pkg.slides[0]?.designBrief.colorPalette.primary ?? '#5865F2'}; }
  .meta { background: #1a1a1a; padding: 20px; border-radius: 12px; margin: 20px 0; }
  .slides { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; }
  .slide { background: #1a1a1a; border-radius: 12px; overflow: hidden; }
  .slide-num { padding: 10px; background: ${pkg.slides[0]?.designBrief.colorPalette.accent ?? '#EB459E'}; font-weight: 700; }
  .slide svg { width: 100%; display: block; }
  .caption { background: #1a1a1a; padding: 20px; border-radius: 12px; margin-top: 30px; white-space: pre-wrap; }
  .hashtags { color: #5865F2; word-wrap: break-word; }
</style>
</head>
<body>
<h1>${pkg.refinedBrief.refinedTopic}</h1>
<div class="meta">
  <strong>Ángulo:</strong> ${pkg.refinedBrief.angle}<br>
  <strong>Audiencia:</strong> ${pkg.refinedBrief.audience}<br>
  <strong>Objetivo:</strong> ${pkg.refinedBrief.goal}<br>
  <strong>Mejor horario:</strong> ${pkg.postingRecommendation.bestDay} ${pkg.postingRecommendation.bestTime}
</div>
<div class="slides">
${svgs.map((svg, i) => `<div class="slide"><div class="slide-num">Slide ${i + 1}/${svgs.length}</div>${svg}</div>`).join('')}
</div>
<div class="caption">
<strong>Caption:</strong>
${pkg.caption.full}

<strong>CTA:</strong> ${pkg.caption.cta}
</div>
<div class="caption hashtags">
<strong>Hashtags (${pkg.hashtags.flat.length}):</strong>
${pkg.hashtags.flat.join(' ')}
</div>
</body>
</html>`;

  const previewFile = path.join(PIPELINE_DIR, `${pkg.id}-preview.html`);
  await ensureDir();
  await fs.writeFile(previewFile, html, 'utf-8');
  log.info('[carouselPipeline] preview HTML generated', { file: previewFile });
  return previewFile;
};
