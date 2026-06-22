/**
 * Audio Mixer — mezcla voiceover, música y SFX para video social.
 *
 * Estrategia:
 * 1. Si existe `AUDIO_MIXER_URL` (cloud), envía todas las pistas para mezcla real.
 * 2. Si FFmpeg está disponible localmente, mezcla con ducking/normalización básica.
 * 3. Fallback: devuelve la pista más relevante (voiceover > música > mock).
 */

import { execSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { log } from '../../agent/logger.js';
import { env } from '../../config/index.js';
import type { AudioMixInput, AudioMixResult, MusicTrack } from './types.js';

const MIXER_URL = process.env['AUDIO_MIXER_URL'] ?? '';
const MIXER_KEY = process.env['AUDIO_MIXER_API_KEY'] ?? '';

const isFfmpegAvailable = (): boolean => {
  try {
    execSync('ffmpeg -version', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
};

const mockMix = (input: AudioMixInput): AudioMixResult => {
  if (input.voiceover?.audioUrl) {
    return { ok: true, audioUrl: input.voiceover.audioUrl, provider: 'voiceover-proxy' };
  }
  if (input.music?.url) {
    return { ok: true, audioUrl: input.music.url, provider: 'music-proxy' };
  }
  return { ok: true, audioUrl: `https://cdn.feedia.ai/mock/mix/${Date.now()}.mp3`, provider: 'mock-mixer' };
};

const mixWithCloud = async (input: AudioMixInput): Promise<AudioMixResult> => {
  try {
    const tracks: Array<{ url: string; type: string }> = [];
    if (input.voiceover?.audioUrl) tracks.push({ url: input.voiceover.audioUrl, type: 'voiceover' });
    if (input.music?.url) tracks.push({ url: input.music.url, type: 'music' });
    for (const url of input.sfxUrls ?? []) tracks.push({ url, type: 'sfx' });

    const res = await fetch(MIXER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(MIXER_KEY ? { Authorization: `Bearer ${MIXER_KEY}` } : {}),
      },
      body: JSON.stringify({
        tracks,
        targetDurationSec: input.targetDurationSec,
        duckMusic: true,
        normalize: true,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      return { ok: false, provider: 'cloud-mixer', error: `HTTP ${res.status}: ${body.slice(0, 200)}` };
    }

    const data = (await res.json()) as { url?: string; error?: string };
    if (!data.url) {
      return { ok: false, provider: 'cloud-mixer', error: data.error ?? 'Respuesta sin URL' };
    }
    return { ok: true, audioUrl: data.url, provider: 'cloud-mixer' };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log.warn(`[AudioMixer] Cloud mixer error: ${msg}`);
    return { ok: false, provider: 'cloud-mixer', error: msg };
  }
};

const mixWithFfmpeg = (input: AudioMixInput): AudioMixResult => {
  if (!isFfmpegAvailable()) {
    return { ok: false, provider: 'ffmpeg', error: 'FFmpeg no está instalado' };
  }

  const tracks: string[] = [];
  if (input.voiceover?.audioUrl) tracks.push(input.voiceover.audioUrl);
  if (input.music?.url) tracks.push(input.music.url);
  for (const url of input.sfxUrls ?? []) tracks.push(url);

  if (tracks.length === 0) {
    return { ok: false, provider: 'ffmpeg', error: 'No hay pistas para mezclar' };
  }
  if (tracks.length === 1) {
    return { ok: true, audioUrl: tracks[0], provider: 'ffmpeg-proxy' };
  }

  const outDir = resolve(process.cwd(), 'data/runtime/audio-mix');
  mkdirSync(outDir, { recursive: true });
  const outputPath = resolve(outDir, `mix-${Date.now()}.mp3`);

  const inputs = tracks.map((url) => `-i "${url}"`).join(' ');
  const amix = tracks.map((_, i) => `[${i}:a]`).join('');
  const filter = `${amix}amix=inputs=${tracks.length}:duration=first:dropout_transition=2,loudnorm=I=-16:TP=-1.5:LRA=11[aout]`;

  const cmd = `ffmpeg ${inputs} -filter_complex "${filter}" -map "[aout]" -t ${input.targetDurationSec} -y "${outputPath}"`;

  try {
    execSync(cmd, { stdio: 'ignore', timeout: 120000 });
    return { ok: true, audioUrl: `file://${outputPath}`, provider: 'ffmpeg' };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log.warn(`[AudioMixer] FFmpeg mix error: ${msg}`);
    return { ok: false, provider: 'ffmpeg', error: msg };
  }
};

export const mixAudio = async (input: AudioMixInput): Promise<AudioMixResult> => {
  log.info(`[AudioMixer] Mixing audio for ${input.targetDurationSec}s video`);

  if (env.dryRun) {
    return mockMix(input);
  }

  if (MIXER_URL) {
    const cloud = await mixWithCloud(input);
    if (cloud.ok) return cloud;
    log.warn('[AudioMixer] Cloud mixer falló, intentando FFmpeg');
  }

  const ffmpeg = mixWithFfmpeg(input);
  if (ffmpeg.ok) return ffmpeg;

  log.warn('[AudioMixer] FFmpeg no disponible, usando proxy');
  return mockMix(input);
};

export const generateAudioForVideo = async (opts: {
  scriptText: string;
  contentType: string;
  durationSec: number;
  voiceId?: string;
  mood?: MusicTrack['mood'];
  sfx?: string[];
}): Promise<AudioMixResult> => {
  const { generateVoiceover } = await import('./tts.js');
  const { recommendMusic } = await import('./musicLibrary.js');
  const { getSfxUrl } = await import('./sfx.js');

  const [voiceover, music] = await Promise.all([
    generateVoiceover({ text: opts.scriptText, voiceId: opts.voiceId }),
    recommendMusic({ contentType: opts.contentType, durationSec: opts.durationSec, mood: opts.mood }),
  ]);

  const sfxUrls = (opts.sfx ?? ['pop']).map((name) => getSfxUrl(name as import('./sfx.js').SfxName));

  return mixAudio({
    voiceover,
    music,
    sfxUrls,
    targetDurationSec: opts.durationSec,
  });
};
