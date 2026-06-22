/**
 * Audio + Video Muxer — combina un video con una pista de audio.
 *
 * Orden de preferencia:
 * 1. Servicio cloud configurado (`AUDIO_VIDEO_MUX_URL`).
 * 2. FFmpeg local si está instalado.
 * 3. Fallback: devuelve el video original.
 */

import { execSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { env } from '../../config/index.js';
import { log } from '../../agent/logger.js';

export interface MuxInput {
  videoUrl: string;
  audioUrl: string;
  outputFormat?: 'mp4' | 'mov';
  webhookUrl?: string;
}

export interface MuxResult {
  ok: boolean;
  url?: string;
  provider: string;
  error?: string;
}

const MUX_URL = process.env['AUDIO_VIDEO_MUX_URL'] ?? '';
const MUX_KEY = process.env['AUDIO_VIDEO_MUX_API_KEY'] ?? '';

const isFfmpegAvailable = (): boolean => {
  try {
    execSync('ffmpeg -version', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
};

const mockMux = (input: MuxInput): MuxResult => {
  log.info(`[AudioVideoMixer] DRY_RUN: simulando mux ${input.videoUrl} + ${input.audioUrl}`);
  return {
    ok: true,
    url: `https://cdn.feedia.ai/mock/mux/${Date.now()}.mp4`,
    provider: 'mock-muxer',
  };
};

const muxWithCloud = async (input: MuxInput): Promise<MuxResult> => {
  try {
    const res = await fetch(MUX_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(MUX_KEY ? { Authorization: `Bearer ${MUX_KEY}` } : {}),
      },
      body: JSON.stringify({
        video_url: input.videoUrl,
        audio_url: input.audioUrl,
        format: input.outputFormat ?? 'mp4',
        webhook_url: input.webhookUrl,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      return { ok: false, provider: 'cloud-muxer', error: `HTTP ${res.status}: ${body.slice(0, 200)}` };
    }

    const data = (await res.json()) as { url?: string; error?: string };
    if (!data.url) {
      return { ok: false, provider: 'cloud-muxer', error: data.error ?? 'Respuesta sin URL' };
    }

    log.info(`[AudioVideoMixer] Mux listo: ${data.url}`);
    return { ok: true, url: data.url, provider: 'cloud-muxer' };
  } catch (err) {
    const msg = (err as Error).message;
    log.warn(`[AudioVideoMixer] Cloud mux error: ${msg}`);
    return { ok: false, provider: 'cloud-muxer', error: msg };
  }
};

const muxWithFfmpeg = (input: MuxInput): MuxResult => {
  if (!isFfmpegAvailable()) {
    return { ok: false, provider: 'ffmpeg', error: 'FFmpeg no está instalado' };
  }

  const outDir = resolve(process.cwd(), 'data/runtime/mux');
  mkdirSync(outDir, { recursive: true });
  const outputPath = resolve(outDir, `mux-${Date.now()}.${input.outputFormat ?? 'mp4'}`);

  const cmd = `ffmpeg -i "${input.videoUrl}" -i "${input.audioUrl}" -c:v copy -map 0:v:0 -map 1:a:0 -shortest -y "${outputPath}"`;

  try {
    execSync(cmd, { stdio: 'ignore', timeout: 120000 });
    return { ok: true, url: `file://${outputPath}`, provider: 'ffmpeg' };
  } catch (err) {
    const msg = (err as Error).message;
    log.warn(`[AudioVideoMixer] FFmpeg mux error: ${msg}`);
    return { ok: false, provider: 'ffmpeg', error: msg };
  }
};

export const muxAudioVideo = async (input: MuxInput): Promise<MuxResult> => {
  if (env.dryRun) {
    return mockMux(input);
  }

  if (MUX_URL) {
    const cloud = await muxWithCloud(input);
    if (cloud.ok) return cloud;
    log.warn('[AudioVideoMixer] Cloud mux falló, intentando FFmpeg');
  }

  const ffmpeg = muxWithFfmpeg(input);
  if (ffmpeg.ok) return ffmpeg;

  log.warn('[AudioVideoMixer] FFmpeg no disponible, devolviendo video original');
  return { ok: false, provider: 'none', error: 'No hay servicio de mux ni FFmpeg disponible' };
};
