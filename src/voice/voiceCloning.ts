import { spawn } from 'child_process';
import { writeFileSync, readFileSync, existsSync, mkdirSync, unlinkSync, rmSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { tmpdir } from 'node:os';
import { log } from '../agent/logger.js';
import type { TTSResult } from './tts.js';

export interface ClonedVoice {
  id: string;
  name: string;
  elevenLabsVoiceId: string;
  description?: string;
  sampleCount: number;
  totalDurationSec: number;
  createdAt: string;
  labels: Record<string, string>;
}

// ── Configuration & paths ──────────────────────────────────────────────────
const CLONES_DIR = resolve('data/runtime/voice-clones');
const METADATA_PATH = join(CLONES_DIR, 'cloned-voices.json');
const ELEVENLABS_API_KEY = process.env['ELEVENLABS_API_KEY'];

// ── Helpers ────────────────────────────────────────────────────────────────
const ensureDir = (dir: string): void => {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
};

const loadMetadata = (): ClonedVoice[] => {
  if (!existsSync(METADATA_PATH)) return [];
  try {
    const raw = readFileSync(METADATA_PATH, 'utf8');
    return JSON.parse(raw) as ClonedVoice[];
  } catch (err) {
    log.error(`[VoiceCloning] Failed to load metadata: ${(err as Error).message}`);
    return [];
  }
};

const saveMetadata = (voices: ClonedVoice[]): void => {
  ensureDir(CLONES_DIR);
  try {
    writeFileSync(METADATA_PATH, JSON.stringify(voices, null, 2), 'utf8');
  } catch (err) {
    log.error(`[VoiceCloning] Failed to save metadata: ${(err as Error).message}`);
  }
};

const generateId = (): string => {
  const random = Math.random().toString(36).slice(2, 8);
  return `clone-${Date.now()}-${random}`;
};

const estimateDurationSec = (buffers: Buffer[]): number => {
  // Rough heuristic assuming ~128kbps MP3 (~16KB per second)
  const totalBytes = buffers.reduce((sum, b) => sum + b.length, 0);
  return Math.round(totalBytes / 16000);
};

const cleanupTempFiles = (paths: string[]): void => {
  for (const p of paths) {
    try {
      if (existsSync(p)) unlinkSync(p);
    } catch {
      /* ignore cleanup errors */
    }
  }
};

const cleanupVoiceDir = (dir: string): void => {
  try {
    if (existsSync(dir)) {
      rmSync(dir, { recursive: true, force: true });
    }
  } catch {
    /* ignore cleanup errors */
  }
};

/**
 * Play an audio file through PowerShell using System.Windows.Media.MediaPlayer.
 * Uses spawn so the Node event loop is not blocked.
 */
const playAudioFile = (audioPath: string): Promise<void> => {
  const escapedPath = audioPath.replace(/\\/g, '\\\\');
  return new Promise((resolve) => {
    const ps = spawn(
      'powershell',
      [
        '-ExecutionPolicy',
        'Bypass',
        '-Command',
        `Add-Type -AssemblyName presentationCore; ` +
          `$player = New-Object System.Windows.Media.MediaPlayer; ` +
          `$player.Open([uri]"${escapedPath}"); ` +
          `$player.Play(); ` +
          `while ($player.Position -lt $player.NaturalDuration.TimeSpan) { Start-Sleep -Milliseconds 200 }; ` +
          `$player.Close()`,
      ],
      { windowsHide: true, detached: false },
    );
    ps.on('exit', () => resolve());
    ps.on('error', () => resolve());
  });
};

// ── Public API ─────────────────────────────────────────────────────────────

/** Returns true when an ElevenLabs API key is present. */
export const isVoiceCloningAvailable = (): boolean => Boolean(ELEVENLABS_API_KEY);

/**
 * Clone a voice using ElevenLabs Instant Voice Cloning.
 *
 * @param name            Display name for the cloned voice.
 * @param audioBuffers    Audio samples (MP3/PCM) used for cloning.
 * @param description     Optional description.
 * @returns The persisted ClonedVoice metadata.
 */
export const cloneVoice = async (name: string, audioBuffers: Buffer[], description?: string): Promise<ClonedVoice> => {
  if (!ELEVENLABS_API_KEY) {
    throw new Error('ELEVENLABS_API_KEY is required for voice cloning');
  }
  if (!audioBuffers.length) {
    throw new Error('At least one audio sample is required');
  }

  const id = generateId();
  const voiceDir = join(CLONES_DIR, id);
  const tempPaths: string[] = [];

  ensureDir(voiceDir);

  // Save buffers to temporary files for the multipart upload
  for (let i = 0; i < audioBuffers.length; i++) {
    const buf = audioBuffers[i];
    if (!buf) continue;
    const tempPath = join(tmpdir(), `clone-${id}-sample-${i}.mp3`);
    writeFileSync(tempPath, buf);
    tempPaths.push(tempPath);
  }

  const start = Date.now();

  try {
    // Build multipart form-data
    const form = new FormData();
    form.append('name', name);
    if (description) {
      form.append('description', description);
    }

    for (const tempPath of tempPaths) {
      const buffer = readFileSync(tempPath);
      const blob = new Blob([buffer]);
      const filename = tempPath.split(/[\\/]/).pop() ?? `sample-${tempPaths.indexOf(tempPath)}.mp3`;
      form.append('files', blob, filename);
    }

    // Upload to ElevenLabs
    log.debug(`[VoiceCloning] Uploading ${audioBuffers.length} sample(s) to ElevenLabs...`);
    const response = await fetch('https://api.elevenlabs.io/v1/voices/add', {
      method: 'POST',
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY,
      },
      body: form,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => `${response.status}`);
      throw new Error(`ElevenLabs voice clone failed: ${errorText}`);
    }

    const data = (await response.json()) as { voice_id: string };
    const elevenLabsVoiceId = data.voice_id;

    // Persist samples locally as the permanent record
    for (let i = 0; i < audioBuffers.length; i++) {
      const buf = audioBuffers[i];
      if (!buf) continue;
      const samplePath = join(voiceDir, `sample-${i}.mp3`);
      writeFileSync(samplePath, buf);
    }

    // Remove temp files
    cleanupTempFiles(tempPaths);

    // Build and save metadata
    const clonedVoice: ClonedVoice = {
      id,
      name,
      elevenLabsVoiceId,
      description,
      sampleCount: audioBuffers.length,
      totalDurationSec: estimateDurationSec(audioBuffers),
      createdAt: new Date().toISOString(),
      labels: {},
    };

    const voices = loadMetadata();
    voices.push(clonedVoice);
    saveMetadata(voices);

    log.success(`[VoiceCloning] Cloned voice "${name}" (${id}) in ${Date.now() - start}ms`);
    return clonedVoice;
  } catch (err) {
    cleanupTempFiles(tempPaths);
    cleanupVoiceDir(voiceDir);
    log.error(`[VoiceCloning] cloneVoice failed: ${(err as Error).message}`);
    throw err;
  }
};

/** List all locally stored cloned voices. */
export const listClonedVoices = (): ClonedVoice[] => loadMetadata();

/** Retrieve a single cloned voice by local id, or null if not found. */
export const getClonedVoice = (id: string): ClonedVoice | null => {
  const voices = loadMetadata();
  return voices.find((v) => v.id === id) ?? null;
};

/**
 * Delete a cloned voice both remotely (ElevenLabs) and locally.
 *
 * @param id Local voice id.
 * @returns true when the voice existed and was removed, false otherwise.
 */
export const deleteClonedVoice = async (id: string): Promise<boolean> => {
  const voices = loadMetadata();
  const voice = voices.find((v) => v.id === id);
  if (!voice) {
    return false;
  }

  // Attempt remote deletion
  if (ELEVENLABS_API_KEY && voice.elevenLabsVoiceId) {
    try {
      const response = await fetch(`https://api.elevenlabs.io/v1/voices/${voice.elevenLabsVoiceId}`, {
        method: 'DELETE',
        headers: { 'xi-api-key': ELEVENLABS_API_KEY },
      });
      if (!response.ok) {
        log.warn(`[VoiceCloning] Remote delete returned ${response.status} for voice ${voice.elevenLabsVoiceId}`);
      }
    } catch (err) {
      log.warn(`[VoiceCloning] Failed to delete remote voice: ${(err as Error).message}`);
    }
  }

  // Delete local files
  const voiceDir = join(CLONES_DIR, id);
  cleanupVoiceDir(voiceDir);

  // Update metadata
  const updated = voices.filter((v) => v.id !== id);
  saveMetadata(updated);

  log.info(`[VoiceCloning] Deleted cloned voice ${id}`);
  return true;
};

/**
 * Synthesize speech using a previously cloned voice.
 *
 * @param voiceId Local cloned voice id.
 * @param text    Text to speak.
 * @param opts    Optional language / rate / volume hints.
 * @returns TTSResult describing success or failure.
 */
export const speakWithClonedVoice = async (
  voiceId: string,
  text: string,
  _opts?: { language?: string; rate?: number; volume?: number },
): Promise<TTSResult> => {
  const voice = getClonedVoice(voiceId);
  if (!voice) {
    return {
      ok: false,
      provider: 'elevenlabs',
      durationMs: 0,
      error: `Cloned voice ${voiceId} not found`,
    };
  }

  if (!ELEVENLABS_API_KEY) {
    return {
      ok: false,
      provider: 'elevenlabs',
      durationMs: 0,
      error: 'No ELEVENLABS_API_KEY',
    };
  }

  const start = Date.now();
  let audioPath: string | undefined;

  try {
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice.elevenLabsVoiceId}`, {
      method: 'POST',
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        text: text.slice(0, 2500),
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.8,
          style: 0.3,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => `${response.status}`);
      throw new Error(`ElevenLabs TTS ${response.status}: ${errorText}`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    audioPath = join(resolve('data/runtime'), `clone-tts-${Date.now()}.mp3`);
    writeFileSync(audioPath, buffer);

    await playAudioFile(audioPath);

    try {
      if (audioPath && existsSync(audioPath)) unlinkSync(audioPath);
    } catch {
      /* ignore cleanup errors */
    }

    return {
      ok: true,
      provider: 'elevenlabs',
      durationMs: Date.now() - start,
    };
  } catch (err) {
    try {
      if (audioPath && existsSync(audioPath)) unlinkSync(audioPath);
    } catch {
      /* ignore cleanup errors */
    }

    log.error(`[VoiceCloning] speakWithClonedVoice failed: ${(err as Error).message}`);
    return {
      ok: false,
      provider: 'elevenlabs',
      durationMs: Date.now() - start,
      error: (err as Error).message,
    };
  }
};
