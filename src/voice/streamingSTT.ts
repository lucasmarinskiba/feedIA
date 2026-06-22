/**
 * Streaming STT — Transcripción continua de audio con VAD
 * ─────────────────────────────────────────────────────────────────────────
 * Recibe chunks de audio (desde browser vía WebSocket/SSE o desde micrófono
 * local) y los transcribe en tiempo real.
 *
 * Arquitectura:
 *   1. Audio chunks entrantes (PCM 16kHz mono o WAV)
 *   2. VAD (Voice Activity Detection) — detecta inicio/fin de habla
 *   3. Buffering — acumula chunks mientras hay voz activa
 *   4. Transcription — envía el buffer completo a Whisper API o SAPI
 *   5. Result stream — emite transcripts parciales y finales
 *
 * Proveedores (orden de prioridad):
 *   • OpenAI Whisper API (mejor calidad, requiere API key)
 *   • Local Whisper via whisper.cpp (si está instalado)
 *   • Windows SAPI (fallback offline)
 */

import { log } from '../agent/logger.js';
import { writeFileSync, unlinkSync, existsSync, readFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { execSync } from 'child_process';

export interface StreamingSTTOptions {
  language?: string;
  provider?: 'whisper_api' | 'whisper_local' | 'sapi';
  vadThreshold?: number; // 0.0 - 1.0
  silenceTimeoutMs?: number;
  maxDurationMs?: number;
}

export interface StreamingSTTResult {
  transcript: string;
  isFinal: boolean;
  confidence: number;
  language: string;
  provider: string;
}

type ChunkCallback = (result: StreamingSTTResult) => void;

/* ── VAD (Voice Activity Detection) simple basado en energía ───────────────
   Para PCM 16-bit mono a 16kHz. Calcula RMS de cada frame.               */

const SAMPLE_RATE = 16000;

const calculateEnergy = (pcm16: Buffer): number => {
  let sum = 0;
  for (let i = 0; i < pcm16.length; i += 2) {
    const sample = pcm16.readInt16LE(i);
    sum += sample * sample;
  }
  const rms = Math.sqrt(sum / (pcm16.length / 2));
  // Normalize to 0-1 range (approximate)
  return Math.min(1, rms / 10000);
};

/* ── Streaming Session ───────────────────────────────────────────────────── */

export class StreamingSTTSession {
  private buffer: Buffer[] = [];
  private isSpeaking = false;
  private silenceStart = 0;
  private sessionStart = 0;
  private opts: StreamingSTTOptions;
  private callback: ChunkCallback;
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor(callback: ChunkCallback, opts: StreamingSTTOptions = {}) {
    this.callback = callback;
    this.opts = {
      language: opts.language ?? process.env['STT_LANGUAGE'] ?? 'es-AR',
      provider: opts.provider ?? 'sapi',
      vadThreshold: opts.vadThreshold ?? 0.03,
      silenceTimeoutMs: opts.silenceTimeoutMs ?? 1200,
      maxDurationMs: opts.maxDurationMs ?? 15000,
    };
  }

  /** Recibe un chunk de audio (PCM 16-bit little-endian, 16kHz, mono) */
  pushAudio(chunk: Buffer): void {
    const energy = calculateEnergy(chunk);
    const now = Date.now();

    if (!this.isSpeaking) {
      if (energy > this.opts.vadThreshold!) {
        // Voice start
        this.isSpeaking = true;
        this.sessionStart = now;
        this.buffer = [chunk];
        this.callback({
          transcript: '',
          isFinal: false,
          confidence: 0,
          language: this.opts.language!,
          provider: this.opts.provider!,
        });
      }
      return;
    }

    // Currently speaking
    this.buffer.push(chunk);

    if (energy < this.opts.vadThreshold!) {
      if (this.silenceStart === 0) this.silenceStart = now;
      const silenceDuration = now - this.silenceStart;
      const totalDuration = now - this.sessionStart;

      if (silenceDuration > this.opts.silenceTimeoutMs! || totalDuration > this.opts.maxDurationMs!) {
        // End of utterance
        void this.finalize();
      }
    } else {
      this.silenceStart = 0;
    }
  }

  /** Forzar finalización y transcribir */
  async finalize(): Promise<void> {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    if (!this.isSpeaking || this.buffer.length === 0) return;

    const audioBuffer = Buffer.concat(this.buffer);
    this.isSpeaking = false;
    this.silenceStart = 0;
    this.buffer = [];

    try {
      const result = await this.transcribe(audioBuffer);
      this.callback(result);
    } catch (err) {
      log.warn(`[StreamingSTT] Transcription error: ${(err as Error).message}`);
      this.callback({
        transcript: '',
        isFinal: true,
        confidence: 0,
        language: this.opts.language!,
        provider: 'error',
      });
    }
  }

  private async transcribe(audioBuffer: Buffer): Promise<StreamingSTTResult> {
    const provider = this.opts.provider!;

    if (provider === 'whisper_api') {
      return this.transcribeWhisperAPI(audioBuffer);
    }
    if (provider === 'whisper_local') {
      return this.transcribeWhisperLocal(audioBuffer);
    }
    return this.transcribeSAPI(audioBuffer);
  }

  private async transcribeWhisperAPI(audioBuffer: Buffer): Promise<StreamingSTTResult> {
    const apiKey = process.env['OPENAI_API_KEY'];
    if (!apiKey) throw new Error('OPENAI_API_KEY not set');

    const wavPath = join(tmpdir(), `talia-whisper-${Date.now()}.wav`);
    writeFileSync(wavPath, this.pcmToWav(audioBuffer));

    try {
      const form = new FormData();
      const blob = new Blob([readFileSync(wavPath)], { type: 'audio/wav' });
      form.append('file', blob, 'audio.wav');
      form.append('model', 'whisper-1');
      form.append('language', (this.opts.language ?? 'es').slice(0, 2));

      const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}` },
        body: form,
      });

      if (!res.ok) throw new Error(`Whisper API ${res.status}`);
      const data = (await res.json()) as { text: string };

      return {
        transcript: data.text,
        isFinal: true,
        confidence: 0.92,
        language: this.opts.language!,
        provider: 'whisper_api',
      };
    } finally {
      try {
        unlinkSync(wavPath);
      } catch {
        /* ignore */
      }
    }
  }

  private async transcribeWhisperLocal(audioBuffer: Buffer): Promise<StreamingSTTResult> {
    const whisperPath = process.env['WHISPER_CPP_PATH'];
    if (!whisperPath || !existsSync(whisperPath)) {
      throw new Error('WHISPER_CPP_PATH not set or binary not found');
    }

    const wavPath = join(tmpdir(), `talia-whisper-${Date.now()}.wav`);
    const txtPath = `${wavPath}.txt`;
    writeFileSync(wavPath, this.pcmToWav(audioBuffer));

    try {
      execSync(
        `"${whisperPath}" -f "${wavPath}" -l ${(this.opts.language ?? 'es').slice(0, 2)} -otxt -of "${wavPath}" --no-timestamps`,
        { timeout: 30000, windowsHide: true },
      );
      const text = existsSync(txtPath) ? readFileSync(txtPath, 'utf-8').trim() : '';
      return {
        transcript: text,
        isFinal: true,
        confidence: 0.85,
        language: this.opts.language!,
        provider: 'whisper_local',
      };
    } finally {
      try {
        unlinkSync(wavPath);
      } catch {
        /* ignore */
      }
      try {
        unlinkSync(txtPath);
      } catch {
        /* ignore */
      }
    }
  }

  private transcribeSAPI(audioBuffer: Buffer): StreamingSTTResult {
    // Fallback: save as WAV and use Windows SAPI
    const wavPath = join(tmpdir(), `talia-sapi-${Date.now()}.wav`);
    writeFileSync(wavPath, this.pcmToWav(audioBuffer));

    try {
      const script = `
Add-Type -AssemblyName System.Speech
$rec = New-Object System.Speech.Recognition.SpeechRecognitionEngine
$rec.SetInputToWaveFile("${wavPath.replace(/\\/g, '\\\\')}")
$grammar = New-Object System.Speech.Recognition.DictationGrammar
$rec.LoadGrammar($grammar)
try {
  $result = $rec.Recognize()
  if ($result -ne $null) { Write-Output $result.Text }
  else { Write-Output "__SILENCE__" }
} catch { Write-Output "__ERROR__: $_" }
finally { $rec.Dispose() }
`;
      const psPath = join(tmpdir(), `talia-sapi-stream-${Date.now()}.ps1`);
      writeFileSync(psPath, script, 'utf8');
      const output = execSync(`powershell -ExecutionPolicy Bypass -File "${psPath}"`, {
        timeout: 15000,
        windowsHide: true,
      })
        .toString()
        .trim();
      try {
        unlinkSync(psPath);
      } catch {
        /* ignore */
      }

      if (output.startsWith('__ERROR__')) throw new Error(output);

      return {
        transcript: output === '__SILENCE__' ? '' : output,
        isFinal: true,
        confidence: 0.75,
        language: this.opts.language!,
        provider: 'sapi',
      };
    } finally {
      try {
        unlinkSync(wavPath);
      } catch {
        /* ignore */
      }
    }
  }

  /** Convierte buffer PCM a WAV */
  private pcmToWav(pcm: Buffer): Buffer {
    const header = Buffer.alloc(44);
    const sampleRate = SAMPLE_RATE;
    const channels = 1;
    const bitsPerSample = 16;
    const byteRate = sampleRate * channels * (bitsPerSample / 8);
    const blockAlign = channels * (bitsPerSample / 8);

    header.write('RIFF', 0);
    header.writeUInt32LE(36 + pcm.length, 4);
    header.write('WAVE', 8);
    header.write('fmt ', 12);
    header.writeUInt32LE(16, 16);
    header.writeUInt16LE(1, 20); // PCM
    header.writeUInt16LE(channels, 22);
    header.writeUInt32LE(sampleRate, 24);
    header.writeUInt32LE(byteRate, 28);
    header.writeUInt16LE(blockAlign, 32);
    header.writeUInt16LE(bitsPerSample, 34);
    header.write('data', 36);
    header.writeUInt32LE(pcm.length, 40);

    return Buffer.concat([header, pcm]);
  }

  destroy(): void {
    if (this.timer) clearTimeout(this.timer);
    this.buffer = [];
    this.isSpeaking = false;
  }
}

/* ── Factory ─────────────────────────────────────────────────────────────── */

export const createStreamingSTT = (callback: ChunkCallback, opts?: StreamingSTTOptions): StreamingSTTSession =>
  new StreamingSTTSession(callback, opts);

/** Detectar qué proveedores están disponibles */
export const listAvailableSTTProviders = (): string[] => {
  const providers: string[] = ['sapi'];
  if (process.env['OPENAI_API_KEY']) providers.push('whisper_api');
  if (process.env['WHISPER_CPP_PATH'] && existsSync(process.env['WHISPER_CPP_PATH'])) providers.push('whisper_local');
  return providers;
};
