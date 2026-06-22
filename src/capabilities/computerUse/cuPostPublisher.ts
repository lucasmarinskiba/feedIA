/**
 * CU Post Publisher — coordinador local que arma recetas de publicación
 * (single post, carousel, reel) para que CU las ejecute paso a paso.
 *
 * Mantiene estado de publish jobs con retry + rollback.
 * Sin Anthropic call directo.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { log } from '../../agent/logger.js';

const PUBLISH_DIR = path.resolve('data/cu/publish');

export type PublishJobStatus =
  | 'queued'
  | 'uploading'
  | 'editing'
  | 'captioning'
  | 'publishing'
  | 'verifying'
  | 'completed'
  | 'failed'
  | 'rolled-back';
export type PublishTarget = 'feed' | 'feed-carousel' | 'reel';

export interface PublishJob {
  id: string;
  brandId: string;
  target: PublishTarget;
  assetPaths: string[];
  caption: string;
  hashtags: string[];
  firstComment?: string;
  scheduledAt?: string;
  status: PublishJobStatus;
  attempts: number;
  maxAttempts: number;
  errors: string[];
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  publishedUrl?: string;
  igMediaId?: string;
}

export interface PublishStepResult {
  step: string;
  ok: boolean;
  durationMs: number;
  error?: string;
  screenshot?: string;
}

export interface PublishRecipe {
  target: PublishTarget;
  steps: Array<{
    name: string;
    cuInstruction: string;
    expectedSelector?: string;
    expectedText?: string;
    rollbackInstruction?: string;
    timeoutMs: number;
  }>;
  estimatedTotalMs: number;
}

const PUBLISH_RECIPES: Record<PublishTarget, PublishRecipe> = {
  feed: {
    target: 'feed',
    estimatedTotalMs: 55000,
    steps: [
      {
        name: 'open-instagram',
        cuInstruction: 'Abrir instagram.com en navegador',
        expectedSelector: '[aria-label="Inicio"]',
        timeoutMs: 10000,
      },
      {
        name: 'click-new-post',
        cuInstruction: 'Click en botón "+ Nueva publicación"',
        expectedSelector: '[aria-label="Nueva publicación"]',
        rollbackInstruction: 'Cerrar modal con Escape',
        timeoutMs: 5000,
      },
      {
        name: 'select-from-device',
        cuInstruction: 'Click "Seleccionar del ordenador"',
        expectedText: 'Arrastra fotos',
        timeoutMs: 5000,
      },
      {
        name: 'upload-asset',
        cuInstruction: 'Subir archivo desde ruta provista',
        expectedText: 'recortar',
        timeoutMs: 15000,
      },
      {
        name: 'crop-portrait',
        cuInstruction: 'Seleccionar formato 4:5 vertical',
        expectedSelector: '[aria-label="Recortar"]',
        timeoutMs: 5000,
      },
      { name: 'click-next-1', cuInstruction: 'Click "Siguiente"', expectedText: 'Editar', timeoutMs: 5000 },
      {
        name: 'click-next-2',
        cuInstruction: 'Click "Siguiente" (saltar filtros)',
        expectedText: 'Pie de foto',
        timeoutMs: 5000,
      },
      {
        name: 'type-caption',
        cuInstruction: 'Escribir caption + hashtags en textarea',
        expectedSelector: 'textarea',
        timeoutMs: 10000,
      },
      {
        name: 'click-share',
        cuInstruction: 'Click "Compartir"',
        expectedText: 'Publicación compartida',
        timeoutMs: 15000,
      },
      {
        name: 'verify-published',
        cuInstruction: 'Ir al perfil y verificar último post',
        expectedText: 'hace',
        timeoutMs: 10000,
      },
    ],
  },
  'feed-carousel': {
    target: 'feed-carousel',
    estimatedTotalMs: 90000,
    steps: [
      { name: 'open-instagram', cuInstruction: 'Abrir instagram.com', timeoutMs: 10000 },
      {
        name: 'click-new-post',
        cuInstruction: 'Click botón "+ Nueva publicación"',
        rollbackInstruction: 'Cerrar modal',
        timeoutMs: 5000,
      },
      { name: 'select-from-device', cuInstruction: 'Click "Seleccionar del ordenador"', timeoutMs: 5000 },
      { name: 'upload-multiple', cuInstruction: 'Subir N assets en orden (ctrl+click multiselect)', timeoutMs: 30000 },
      { name: 'verify-order', cuInstruction: 'Verificar orden visualmente en thumbnails inferiores', timeoutMs: 5000 },
      {
        name: 'crop-all',
        cuInstruction: 'Aplicar crop 4:5 a todos (click ícono ratio sobre cada uno)',
        timeoutMs: 10000,
      },
      { name: 'click-next-1', cuInstruction: 'Click "Siguiente"', timeoutMs: 5000 },
      { name: 'click-next-2', cuInstruction: 'Click "Siguiente" (skip filtros)', timeoutMs: 5000 },
      { name: 'type-caption', cuInstruction: 'Escribir caption + hashtags', timeoutMs: 10000 },
      { name: 'click-share', cuInstruction: 'Click "Compartir"', timeoutMs: 15000 },
      {
        name: 'verify-published',
        cuInstruction: 'Verificar carrusel en perfil con ícono multi-foto',
        timeoutMs: 10000,
      },
    ],
  },
  reel: {
    target: 'reel',
    estimatedTotalMs: 75000,
    steps: [
      { name: 'open-instagram', cuInstruction: 'Abrir instagram.com', timeoutMs: 10000 },
      { name: 'click-new-post', cuInstruction: 'Click "+ Nueva publicación"', timeoutMs: 5000 },
      { name: 'upload-video', cuInstruction: 'Subir archivo .mp4 vertical', timeoutMs: 20000 },
      { name: 'detect-reel', cuInstruction: 'Instagram detecta video vertical → toggle "Reel"', timeoutMs: 5000 },
      { name: 'cover-frame', cuInstruction: 'Seleccionar cover frame óptimo (frame 0.5s)', timeoutMs: 5000 },
      { name: 'add-audio-optional', cuInstruction: 'Skip o agregar audio trending desde biblioteca', timeoutMs: 8000 },
      { name: 'click-next', cuInstruction: 'Click "Siguiente"', timeoutMs: 5000 },
      { name: 'type-caption', cuInstruction: 'Escribir caption + hashtags', timeoutMs: 10000 },
      { name: 'toggle-share-feed', cuInstruction: 'Toggle "Compartir también en Feed" ON', timeoutMs: 3000 },
      { name: 'click-share', cuInstruction: 'Click "Compartir"', timeoutMs: 15000 },
      { name: 'verify-published', cuInstruction: 'Verificar reel en perfil pestaña Reels', timeoutMs: 10000 },
    ],
  },
};

const jobPath = (brandId: string, id: string): string => path.join(PUBLISH_DIR, `${brandId}-${id}.json`);

const ensureDir = async (): Promise<void> => {
  await fs.mkdir(PUBLISH_DIR, { recursive: true });
};

export const createPublishJob = async (params: {
  brandId: string;
  target: PublishTarget;
  assetPaths: string[];
  caption: string;
  hashtags: string[];
  firstComment?: string;
  scheduledAt?: string;
  maxAttempts?: number;
}): Promise<PublishJob> => {
  const job: PublishJob = {
    id: `pub-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    brandId: params.brandId,
    target: params.target,
    assetPaths: params.assetPaths,
    caption: params.caption,
    hashtags: params.hashtags,
    firstComment: params.firstComment,
    scheduledAt: params.scheduledAt,
    status: 'queued',
    attempts: 0,
    maxAttempts: params.maxAttempts ?? 3,
    errors: [],
    createdAt: new Date().toISOString(),
  };

  await ensureDir();
  await fs.writeFile(jobPath(params.brandId, job.id), JSON.stringify(job, null, 2), 'utf-8');
  log.info('[cuPostPublisher] job created', { brandId: params.brandId, id: job.id, target: params.target });
  return job;
};

export const getRecipe = (target: PublishTarget): PublishRecipe => PUBLISH_RECIPES[target];

export const buildCuInstructionScript = (job: PublishJob): string => {
  const recipe = PUBLISH_RECIPES[job.target];
  const lines: string[] = [];
  lines.push(`TASK: Publicar ${job.target} en Instagram con ${job.assetPaths.length} asset(s).`);
  lines.push(`MAX_ATTEMPTS: ${job.maxAttempts} · CURRENT_ATTEMPT: ${job.attempts + 1}`);
  lines.push('');
  lines.push('ASSETS:');
  for (const a of job.assetPaths) lines.push(`  - ${a}`);
  lines.push('');
  lines.push('CAPTION (copiar exacto, incluye salto de línea + hashtags al final):');
  lines.push(`${job.caption}\n\n${job.hashtags.join(' ')}`);
  lines.push('');
  if (job.firstComment) {
    lines.push('FIRST COMMENT (publicar como comentario propio justo después):');
    lines.push(job.firstComment);
    lines.push('');
  }
  lines.push('PASOS DETALLADOS:');
  for (let i = 0; i < recipe.steps.length; i++) {
    const s = recipe.steps[i]!;
    lines.push(
      `${i + 1}. ${s.name}: ${s.cuInstruction}${s.expectedSelector ? ` [selector: ${s.expectedSelector}]` : ''}${s.expectedText ? ` [texto esperado: "${s.expectedText}"]` : ''} (timeout ${s.timeoutMs}ms)`,
    );
    if (s.rollbackInstruction) lines.push(`   ROLLBACK si falla: ${s.rollbackInstruction}`);
  }
  lines.push('');
  lines.push('VERIFICACIÓN FINAL:');
  lines.push('- Capturar URL del post publicado.');
  lines.push('- Capturar mediaId si visible.');
  lines.push('- Si paso falla, screenshot + reportar nombre del paso fallido.');
  return lines.join('\n');
};

export const updateJobStatus = async (
  brandId: string,
  id: string,
  status: PublishJobStatus,
  extra?: { error?: string; publishedUrl?: string; igMediaId?: string },
): Promise<PublishJob | null> => {
  try {
    const job = JSON.parse(await fs.readFile(jobPath(brandId, id), 'utf-8')) as PublishJob;
    job.status = status;
    if (extra?.error) job.errors.push(extra.error);
    if (extra?.publishedUrl) job.publishedUrl = extra.publishedUrl;
    if (extra?.igMediaId) job.igMediaId = extra.igMediaId;
    if (status === 'completed') job.completedAt = new Date().toISOString();
    if (status === 'uploading' && !job.startedAt) job.startedAt = new Date().toISOString();
    await fs.writeFile(jobPath(brandId, id), JSON.stringify(job, null, 2), 'utf-8');
    return job;
  } catch {
    return null;
  }
};

export const incrementAttempt = async (brandId: string, id: string): Promise<boolean> => {
  try {
    const job = JSON.parse(await fs.readFile(jobPath(brandId, id), 'utf-8')) as PublishJob;
    job.attempts++;
    if (job.attempts >= job.maxAttempts) {
      job.status = 'failed';
    }
    await fs.writeFile(jobPath(brandId, id), JSON.stringify(job, null, 2), 'utf-8');
    return job.attempts < job.maxAttempts;
  } catch {
    return false;
  }
};

export const listJobs = async (brandId: string, status?: PublishJobStatus): Promise<PublishJob[]> => {
  try {
    await ensureDir();
    const files = await fs.readdir(PUBLISH_DIR);
    const jobs: PublishJob[] = [];
    for (const f of files) {
      if (!f.startsWith(`${brandId}-pub-`)) continue;
      try {
        const j = JSON.parse(await fs.readFile(path.join(PUBLISH_DIR, f), 'utf-8')) as PublishJob;
        if (!status || j.status === status) jobs.push(j);
      } catch {
        /* skip */
      }
    }
    return jobs.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  } catch {
    return [];
  }
};

export const getQueuedJobsReadyToPublish = async (brandId: string): Promise<PublishJob[]> => {
  const queued = await listJobs(brandId, 'queued');
  const now = Date.now();
  return queued.filter((j) => !j.scheduledAt || new Date(j.scheduledAt).getTime() <= now);
};
