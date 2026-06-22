/**
 * Carousel Factory — fábrica de carruseles de Instagram 100% automática
 * ─────────────────────────────────────────────────────────────────────────
 * De punta a punta, sin humano en el medio:
 *
 *   1. ELEGIR TEMA  → relevante a la cuenta (recomendación del loop de
 *      optimización, o el nicho + inteligencia viva del ledger).
 *   2. COPY BRANDED → createCarrusel ya escribe con la voz/paleta de marca.
 *   3. RENDER       → cada slide se renderiza a SVG branded (paleta,
 *      tipografía, @cuenta, numeración) y se escribe a disco.
 *   4. QA ESTÉTICA  → scoreAesthetic + originalidad. Si no pasa, 1 reintento
 *      de copy con el feedback (loop cerrado).
 *   5. PUBLICAR     → uploadToSocial a Instagram. Respeta DRY_RUN y la
 *      ausencia de credenciales (cae a simulación: nunca publica de más).
 *
 * Nunca lanza: cualquier fallo queda capturado en el CarouselJob.
 */

import { mkdirSync, writeFileSync, readFileSync, existsSync, readdirSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { env } from '../../config/index.js';
import { log } from '../../agent/logger.js';
import { emit } from '../../agent/bus.js';
import type { BrandProfile } from '../../config/types.js';
import { createCarrusel, type CarruselResult } from './carrusel.js';
import { renderCarruselSlideSvg, renderCarruselSlidePng } from '../render/index.js';
import { scoreAesthetic } from '../aesthetic/index.js';
import { checkOriginality, registerPublished } from '../originality/index.js';
import { recordTrace } from '../reasoningTrace/index.js';
import { uploadToSocial } from '../../integrations/uploadPost.js';
import { listRecommendations, updateRecommendationStatus } from '../autoOptimize/index.js';
import { queryLedger } from '../research/index.js';

export type CarouselJobStatus = 'published' | 'queued' | 'held' | 'failed';

export interface CarouselJob {
  id: string;
  brandId: string;
  topic: string;
  status: CarouselJobStatus;
  slideCount: number;
  aestheticScore: number;
  originalityPassed: boolean;
  attempts: number;
  caption: string;
  hashtags: string[];
  cta: string;
  /** Rutas relativas servibles de cada slide SVG. */
  slidePaths: string[];
  uploadId?: string;
  socialUrl?: string;
  startedAt: string;
  finishedAt: string;
  note: string;
}

export interface CarouselFactoryOptions {
  /** Tema explícito. Si falta, se elige automáticamente según la cuenta. */
  topic?: string;
  /** Publicar de verdad (default true; igualmente DRY_RUN manda). */
  autoPublish?: boolean;
  longitud?: 'corto' | 'medio' | 'largo';
}

const AESTHETIC_MIN = 65;
const STORE = resolve('data/runtime/carouselJobs.json');
const ASSETS_ROOT = resolve('data/runtime/carousels');
const MAX_JOBS = 80;

let _seq = 0;
const newId = (): string => `crsl-${Date.now().toString(36)}-${(++_seq).toString(36)}`;

const readStore = (): { jobs: CarouselJob[] } => {
  if (!existsSync(STORE)) return { jobs: [] };
  try {
    return JSON.parse(readFileSync(STORE, 'utf-8')) as { jobs: CarouselJob[] };
  } catch {
    return { jobs: [] };
  }
};

const saveJob = (job: CarouselJob): void => {
  const s = readStore();
  const i = s.jobs.findIndex((j) => j.id === job.id);
  if (i >= 0) s.jobs[i] = job;
  else s.jobs.push(job);
  if (s.jobs.length > MAX_JOBS) s.jobs.splice(0, s.jobs.length - MAX_JOBS);
  mkdirSync(dirname(STORE), { recursive: true });
  writeFileSync(STORE, JSON.stringify(s, null, 2), 'utf-8');
};

export const listCarouselJobs = (brandId?: string): CarouselJob[] =>
  readStore()
    .jobs.filter((j) => !brandId || j.brandId === brandId)
    .reverse();

export const getCarouselJob = (id: string): CarouselJob | undefined => readStore().jobs.find((j) => j.id === id);

/** Devuelve el SVG de un slide ya renderizado (para previsualización). */
export const readCarouselSlideSvg = (jobId: string, slide: number): string | null => {
  const file = join(ASSETS_ROOT, jobId, `slide-${slide}.svg`);
  if (!existsSync(file)) return null;
  try {
    return readFileSync(file, 'utf-8');
  } catch {
    return null;
  }
};

/** Devuelve el PNG ráster (publicable) de un slide ya renderizado. */
export const readCarouselSlidePng = (jobId: string, slide: number): Buffer | null => {
  const file = join(ASSETS_ROOT, jobId, `slide-${slide}.png`);
  if (!existsSync(file)) return null;
  try {
    return readFileSync(file);
  } catch {
    return null;
  }
};

/** Tema relevante a la cuenta: recomendación del loop, o nicho + ledger. */
const pickTopic = (brand: BrandProfile, explicit?: string): { topic: string; recId?: string } => {
  if (explicit && explicit.trim()) return { topic: explicit.trim() };
  const rec = listRecommendations({ status: 'propuesto' })[0];
  if (rec) return { topic: rec.topicAngle, recId: rec.id };
  const demand =
    queryLedger({ topic: 'market-demand', limit: 1 })[0] ?? queryLedger({ topic: 'format-trend', limit: 1 })[0];
  const base = `Tema de alto valor para una cuenta de ${brand.niche}`;
  return { topic: demand ? `${base}: ${demand.insight}` : `${base} alineado a sus objetivos` };
};

const buildProposal = (brand: BrandProfile, copy: CarruselResult): Parameters<typeof scoreAesthetic>[1] => ({
  title: copy.slides[0]?.titulo ?? 'Carrusel',
  format: 'carousel',
  colorsUsed: brand.visual.palette.slice(0, 4),
  fontsUsed: brand.visual.typography,
  textBlocks: copy.slides.length,
  imageBlocks: copy.slides.length,
  densityEstimate: brand.visual.density ?? 'medium',
  description: `${brand.visual.style}, ${copy.notasDiseno}`.slice(0, 240),
});

/**
 * Corre la fábrica completa. Devuelve siempre un CarouselJob.
 */
export const runCarouselFactory = async (
  brand: BrandProfile,
  opts: CarouselFactoryOptions = {},
  correlationId?: string,
): Promise<CarouselJob> => {
  const id = newId();
  const startedAt = new Date().toISOString();
  const { topic, recId } = pickTopic(brand, opts.topic);
  log.info(`[CAROUSEL] ${id} — tema: "${topic.slice(0, 80)}"`);

  const job: CarouselJob = {
    id,
    brandId: brand.name,
    topic,
    status: 'failed',
    slideCount: 0,
    aestheticScore: 0,
    originalityPassed: false,
    attempts: 0,
    caption: '',
    hashtags: [],
    cta: '',
    slidePaths: [],
    startedAt,
    finishedAt: startedAt,
    note: '',
  };

  try {
    // ── 1-2. Copy branded (+ 1 reintento si la estética/originalidad fallan)
    let copy = await createCarrusel(brand, topic, opts.longitud ?? 'medio');
    let attempts = 1;
    let aesthetic = scoreAesthetic(brand, buildProposal(brand, copy));
    let originality = checkOriginality({
      hook: copy.slides[0]?.titulo ?? '',
      body: copy.slides.map((s) => `${s.titulo} ${s.cuerpo}`).join(' '),
      caption: copy.caption,
      format: 'carrusel',
    });

    if ((aesthetic.total < AESTHETIC_MIN || !originality.passed) && attempts < 2) {
      const fb = [
        ...aesthetic.suggestions.slice(0, 3),
        ...(originality.passed ? [] : originality.recommendations.slice(0, 3)),
      ];
      copy = await createCarrusel(
        brand,
        `${topic}\n\nAjustes obligatorios para el rediseño: ${fb.join('; ')}`,
        opts.longitud ?? 'medio',
      );
      attempts = 2;
      aesthetic = scoreAesthetic(brand, buildProposal(brand, copy));
      originality = checkOriginality({
        hook: copy.slides[0]?.titulo ?? '',
        body: copy.slides.map((s) => `${s.titulo} ${s.cuerpo}`).join(' '),
        caption: copy.caption,
        format: 'carrusel',
      });
    }

    job.attempts = attempts;
    job.slideCount = copy.slides.length;
    job.aestheticScore = aesthetic.total;
    job.originalityPassed = originality.passed;
    job.caption = copy.caption;
    job.hashtags = copy.hashtags;
    job.cta = copy.cta;

    // ── 3. Render branded: SVG (preview) + PNG ráster (publicable) ──────
    const dir = join(ASSETS_ROOT, id);
    mkdirSync(dir, { recursive: true });
    const pngDataUris: string[] = [];
    copy.slides.forEach((slide, idx) => {
      const svg = renderCarruselSlideSvg(slide, brand, copy.slides.length);
      writeFileSync(join(dir, `slide-${idx + 1}.svg`), svg, 'utf-8');
      job.slidePaths.push(`carousels/${id}/slide-${idx + 1}.svg`);
      const png = renderCarruselSlidePng(slide, brand, copy.slides.length);
      writeFileSync(join(dir, `slide-${idx + 1}.png`), png.buffer);
      pngDataUris.push(png.dataUri);
    });

    // ── 4. Gate de calidad ─────────────────────────────────────────────
    const passesQA = aesthetic.total >= AESTHETIC_MIN && originality.passed;

    // ── 5. Publicación automática (segura por defecto) ─────────────────
    const wantsPublish = opts.autoPublish !== false;
    if (passesQA && wantsPublish) {
      const up = await uploadToSocial({
        platforms: ['instagram'],
        mediaType: 'carousel',
        mediaUrls: pngDataUris,
        caption: copy.caption,
        hashtags: copy.hashtags,
        postId: id,
      });
      const igRes = up.perPlatformResults.find((r) => r.platform === 'instagram');
      job.uploadId = up.uploadId;
      job.socialUrl = igRes?.socialUrl;
      if (up.ok && (igRes?.status === 'posted' || igRes?.status === 'queued' || igRes?.status === 'scheduled')) {
        job.status = env.dryRun ? 'queued' : 'published';
        job.note = env.dryRun
          ? 'DRY_RUN: carrusel renderizado y validado; subida simulada.'
          : `Publicado en Instagram (${igRes?.status}).`;
      } else {
        job.status = 'queued';
        job.note = `Renderizado y validado; subida no confirmada: ${up.errors.join('; ') || 'sin credenciales / pendiente'}.`;
      }
      if (originality.passed) {
        registerPublished({
          id,
          hook: copy.slides[0]?.titulo ?? '',
          body: copy.slides.map((s) => s.cuerpo).join(' '),
          caption: copy.caption,
          format: 'carrusel',
        });
      }
    } else if (!passesQA) {
      job.status = 'held';
      job.note = `Retenido para revisión: estética ${aesthetic.total}/100${!originality.passed ? ', originalidad no superada' : ''}. ${aesthetic.suggestions.slice(0, 2).join('; ')}`;
    } else {
      job.status = 'queued';
      job.note = 'Carrusel renderizado y validado; autoPublish desactivado.';
    }

    if (recId) updateRecommendationStatus(recId, 'producido');
  } catch (err) {
    job.status = 'failed';
    job.note = `Error en la fábrica: ${(err as Error).message}`;
    log.error(`[CAROUSEL] ${id} falló: ${(err as Error).message}`);
  }

  job.finishedAt = new Date().toISOString();
  saveJob(job);

  recordTrace({
    agentId: 'carousel-factory',
    decisionType: 'content-format',
    context: { topic, slideCount: job.slideCount, attempts: job.attempts },
    alternatives: [{ option: 'carrusel', score: job.aestheticScore }],
    chosen: 'carrusel',
    reasoning: job.note,
    brandId: brand.name,
    correlationId,
  });

  emit({
    type: 'CarouselProduced',
    sourceAgent: 'carousel-factory',
    priority: job.status === 'published' ? 'high' : 'normal',
    correlationId: correlationId ?? `carousel-${id}`,
    payload: { carouselId: id, status: job.status, aesthetic: job.aestheticScore, slides: job.slideCount },
  });

  log.success(`[CAROUSEL] ${id} → ${job.status} (estética ${job.aestheticScore}, ${job.slideCount} slides)`);
  return job;
};

/** Cantidad de slides renderizados realmente en disco (sanidad). */
export const countRenderedSlides = (jobId: string): number => {
  const dir = join(ASSETS_ROOT, jobId);
  if (!existsSync(dir)) return 0;
  try {
    return readdirSync(dir).filter((f) => f.endsWith('.svg')).length;
  } catch {
    return 0;
  }
};
