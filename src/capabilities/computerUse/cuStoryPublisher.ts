/**
 * CU Story Publisher — recetas para publicar Stories con stickers interactivos.
 *
 * Soporta: foto/video frame + text overlay + polls/quiz/questions/countdown/link sticker.
 *
 * Sin Anthropic call directo.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { log } from '../../agent/logger.js';

const STORY_DIR = path.resolve('data/cu/story');

export type StickerType =
  | 'poll'
  | 'quiz'
  | 'question'
  | 'countdown'
  | 'link'
  | 'mention'
  | 'hashtag'
  | 'location'
  | 'music'
  | 'slider';

export interface StorySticker {
  type: StickerType;
  position: { x: number; y: number }; // 0-1 relative
  config: Record<string, unknown>;
}

export interface StoryFrame {
  index: number;
  assetPath: string;
  format: 'png' | 'jpg' | 'mp4';
  overlayText?: string;
  textPosition?: { x: number; y: number };
  textColor?: string;
  textBackground?: string;
  stickers: StorySticker[];
  durationSec: number;
  music?: { trackName: string; startSec: number };
}

export interface StoryPublishJob {
  id: string;
  brandId: string;
  frames: StoryFrame[];
  publishSeparately: boolean;
  status: 'queued' | 'publishing' | 'completed' | 'failed';
  publishedAt?: string;
  errors: string[];
  createdAt: string;
  stickerInteractionTracking: boolean;
}

const jobPath = (brandId: string, id: string): string => path.join(STORY_DIR, `${brandId}-${id}.json`);

const ensureDir = async (): Promise<void> => {
  await fs.mkdir(STORY_DIR, { recursive: true });
};

export const buildPollSticker = (
  question: string,
  optionA: string,
  optionB: string,
  position: { x: number; y: number } = { x: 0.5, y: 0.7 },
): StorySticker => ({
  type: 'poll',
  position,
  config: { question, optionA, optionB },
});

export const buildQuizSticker = (
  question: string,
  options: string[],
  correctIndex: number,
  position: { x: number; y: number } = { x: 0.5, y: 0.7 },
): StorySticker => ({
  type: 'quiz',
  position,
  config: { question, options, correctIndex },
});

export const buildQuestionSticker = (
  prompt: string,
  placeholder = 'Tu respuesta...',
  position: { x: number; y: number } = { x: 0.5, y: 0.7 },
): StorySticker => ({
  type: 'question',
  position,
  config: { prompt, placeholder },
});

export const buildLinkSticker = (
  url: string,
  label: string,
  position: { x: number; y: number } = { x: 0.5, y: 0.85 },
): StorySticker => ({
  type: 'link',
  position,
  config: { url, label },
});

export const buildCountdownSticker = (
  eventName: string,
  endDate: string,
  position: { x: number; y: number } = { x: 0.5, y: 0.6 },
): StorySticker => ({
  type: 'countdown',
  position,
  config: { eventName, endDate },
});

export const buildSliderSticker = (
  question: string,
  emoji: string,
  position: { x: number; y: number } = { x: 0.5, y: 0.7 },
): StorySticker => ({
  type: 'slider',
  position,
  config: { question, emoji },
});

export const createStoryJob = async (params: {
  brandId: string;
  frames: StoryFrame[];
  publishSeparately?: boolean;
  stickerInteractionTracking?: boolean;
}): Promise<StoryPublishJob> => {
  const job: StoryPublishJob = {
    id: `story-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    brandId: params.brandId,
    frames: params.frames,
    publishSeparately: params.publishSeparately ?? true,
    status: 'queued',
    errors: [],
    createdAt: new Date().toISOString(),
    stickerInteractionTracking: params.stickerInteractionTracking ?? true,
  };
  await ensureDir();
  await fs.writeFile(jobPath(params.brandId, job.id), JSON.stringify(job, null, 2), 'utf-8');
  log.info('[cuStoryPublisher] job created', { brandId: params.brandId, id: job.id, frames: params.frames.length });
  return job;
};

export const buildCuInstructionForStory = (job: StoryPublishJob): string => {
  const lines: string[] = [];
  lines.push(`TASK: Publicar serie de ${job.frames.length} stories en Instagram.`);
  lines.push(`MODE: ${job.publishSeparately ? 'cada frame por separado' : 'todas juntas como sequence'}`);
  lines.push('');

  for (let i = 0; i < job.frames.length; i++) {
    const f = job.frames[i]!;
    lines.push(`=== FRAME ${i + 1}/${job.frames.length} ===`);
    lines.push(`Asset: ${f.assetPath} (${f.format})`);
    if (f.overlayText) {
      lines.push(
        `Texto overlay: "${f.overlayText}" (posición x=${(f.textPosition?.x ?? 0.5).toFixed(2)} y=${(f.textPosition?.y ?? 0.3).toFixed(2)}, color ${f.textColor ?? '#FFFFFF'}, fondo ${f.textBackground ?? 'transparente'})`,
      );
    }
    if (f.music) lines.push(`Música: "${f.music.trackName}" desde sec ${f.music.startSec}`);
    if (f.stickers.length > 0) {
      lines.push(`Stickers (${f.stickers.length}):`);
      for (const s of f.stickers) {
        lines.push(
          `  - ${s.type} en (${s.position.x.toFixed(2)}, ${s.position.y.toFixed(2)}): ${JSON.stringify(s.config)}`,
        );
      }
    }
    lines.push('');
    lines.push(`Pasos CU para frame ${i + 1}:`);
    lines.push(`1. Click "Tu story" en feed (parte superior izquierda)`);
    lines.push(`2. Subir asset ${f.assetPath}`);
    if (f.overlayText) lines.push(`3. Tap pantalla → escribir "${f.overlayText}" → mover a posición indicada`);
    for (let j = 0; j < f.stickers.length; j++) {
      const sticker = f.stickers[j]!;
      lines.push(
        `${3 + j + (f.overlayText ? 1 : 0)}. Tap ícono sticker → seleccionar "${sticker.type}" → configurar con ${JSON.stringify(sticker.config)} → posicionar`,
      );
    }
    if (f.music) {
      lines.push(`Tap ícono música → buscar "${f.music.trackName}" → seleccionar → ajustar start ${f.music.startSec}s`);
    }
    lines.push(`Tap "Tu story" para publicar`);
    lines.push(`Verificar story en barra superior del feed propio`);
    lines.push('');
  }
  return lines.join('\n');
};

export const updateStoryJobStatus = async (
  brandId: string,
  id: string,
  status: StoryPublishJob['status'],
  error?: string,
): Promise<StoryPublishJob | null> => {
  try {
    const job = JSON.parse(await fs.readFile(jobPath(brandId, id), 'utf-8')) as StoryPublishJob;
    job.status = status;
    if (error) job.errors.push(error);
    if (status === 'completed') job.publishedAt = new Date().toISOString();
    await fs.writeFile(jobPath(brandId, id), JSON.stringify(job, null, 2), 'utf-8');
    return job;
  } catch {
    return null;
  }
};

export const listStoryJobs = async (brandId: string): Promise<StoryPublishJob[]> => {
  try {
    await ensureDir();
    const files = await fs.readdir(STORY_DIR);
    const jobs: StoryPublishJob[] = [];
    for (const f of files) {
      if (!f.startsWith(`${brandId}-story-`)) continue;
      try {
        jobs.push(JSON.parse(await fs.readFile(path.join(STORY_DIR, f), 'utf-8')) as StoryPublishJob);
      } catch {
        /* skip */
      }
    }
    return jobs.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  } catch {
    return [];
  }
};

export const composeStorySeriesTemplate = (params: {
  topic: string;
  goal: 'engagement' | 'sales' | 'awareness';
  brandHandle: string;
  linkUrl?: string;
}): StoryFrame[] => {
  const frames: StoryFrame[] = [];

  frames.push({
    index: 1,
    assetPath: `pending-frame-1.png`,
    format: 'png',
    overlayText: `${params.topic.toUpperCase()}`,
    textPosition: { x: 0.5, y: 0.35 },
    textColor: '#FFFFFF',
    textBackground: '#000000',
    stickers: [],
    durationSec: 5,
  });

  frames.push({
    index: 2,
    assetPath: `pending-frame-2.png`,
    format: 'png',
    overlayText: `Lo que vas a descubrir`,
    textPosition: { x: 0.5, y: 0.2 },
    textColor: '#FFFFFF',
    stickers: [buildPollSticker(`¿Sabías que esto pasa con ${params.topic}?`, 'Sí, lo sabía', 'No, contame')],
    durationSec: 7,
  });

  frames.push({
    index: 3,
    assetPath: `pending-frame-3.png`,
    format: 'png',
    overlayText: `Dato clave`,
    textPosition: { x: 0.5, y: 0.25 },
    textColor: '#FFFFFF',
    stickers: [
      buildQuizSticker(
        `¿Cuál creés que es el problema más grande de ${params.topic}?`,
        ['Tiempo', 'Costo', 'Falta de info'],
        2,
      ),
    ],
    durationSec: 10,
  });

  frames.push({
    index: 4,
    assetPath: `pending-frame-4.png`,
    format: 'png',
    overlayText: `Contame lo tuyo`,
    textPosition: { x: 0.5, y: 0.2 },
    textColor: '#FFFFFF',
    stickers: [buildQuestionSticker(`¿Qué te pasa con ${params.topic}?`)],
    durationSec: 8,
  });

  const lastFrame: StoryFrame = {
    index: 5,
    assetPath: `pending-frame-5.png`,
    format: 'png',
    overlayText: params.goal === 'sales' ? 'Acción ahora' : 'Próximo paso',
    textPosition: { x: 0.5, y: 0.3 },
    textColor: '#FFFFFF',
    stickers: [],
    durationSec: 7,
  };
  if (params.linkUrl) {
    lastFrame.stickers.push(buildLinkSticker(params.linkUrl, params.goal === 'sales' ? 'Quiero esto' : 'Saber más'));
  } else {
    lastFrame.stickers.push(buildQuestionSticker('DM "info" y te paso detalles'));
  }
  frames.push(lastFrame);
  return frames;
};
