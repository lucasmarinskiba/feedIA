import { execSync, spawn, type ChildProcess } from 'child_process';
import { writeFileSync, unlinkSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { log } from '../agent/logger.js';

export type TTSProvider = 'elevenlabs' | 'google_unofficial' | 'sapi' | 'browser' | 'cloned';
export type TTSLanguage = 'es-AR' | 'es-ES' | 'en-US' | 'en-GB' | 'pt-BR' | 'fr-FR' | 'it-IT' | 'de-DE';

export interface TTSOptions {
  language?: TTSLanguage;
  provider?: TTSProvider;
  rate?: number; // -10 a 10 (SAPI) | 0.5-2.0 (general)
  volume?: number; // 0-100
  async?: boolean; // hablar sin bloquear
  emotion?: 'neutral' | 'warm' | 'professional' | 'enthusiastic';
}

export interface TTSResult {
  ok: boolean;
  provider: TTSProvider;
  durationMs: number;
  audioPath?: string;
  error?: string;
}

// ── Voces femeninas por idioma (Windows SAPI) ──────────────────────────────
const SAPI_VOICE_HINTS: Record<TTSLanguage, string> = {
  'es-AR': 'es',
  'es-ES': 'es',
  'en-US': 'en-US',
  'en-GB': 'en-GB',
  'pt-BR': 'pt',
  'fr-FR': 'fr',
  'it-IT': 'it',
  'de-DE': 'de',
};

// ── ElevenLabs: voces realistas ────────────────────────────────────────────
// https://api.elevenlabs.io/v1/text-to-speech/{voice_id}
const ELEVENLABS_VOICE_MAP: Record<string, string> = {
  talia: '21m00Tcm4TlvDq8ikWAM', // Rachel (en)
  talia_es: 'EXAVITQu4vr4xnSDxMaL', // Bella (es proxy)
  default: '21m00Tcm4TlvDq8ikWAM',
};

const runPowerShell = (script: string, timeoutMs = 30000): string => {
  const path = join(tmpdir(), `talia-tts-${Date.now()}.ps1`);
  writeFileSync(path, script, 'utf8');
  try {
    return execSync(`powershell -ExecutionPolicy Bypass -File "${path}"`, {
      timeout: timeoutMs,
      windowsHide: true,
    })
      .toString()
      .trim();
  } finally {
    try {
      unlinkSync(path);
    } catch {
      /* ignore */
    }
  }
};

// ── Proveedor 1: ElevenLabs (requiere API key, mejor calidad) ───────────────
const speakElevenLabs = async (text: string, opts: TTSOptions): Promise<TTSResult> => {
  const apiKey = process.env['ELEVENLABS_API_KEY'];
  if (!apiKey) return { ok: false, provider: 'elevenlabs', durationMs: 0, error: 'No ELEVENLABS_API_KEY' };

  const voiceId = opts.language?.startsWith('es') ? ELEVENLABS_VOICE_MAP['talia_es']! : ELEVENLABS_VOICE_MAP['talia']!;

  const start = Date.now();
  try {
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        text: text.slice(0, 2500),
        model_id: 'eleven_multilingual_v2',
        voice_settings: { stability: 0.5, similarity_boost: 0.8, style: 0.3 },
      }),
    });

    if (!response.ok) throw new Error(`ElevenLabs ${response.status}`);

    const buffer = Buffer.from(await response.arrayBuffer());
    const audioPath = join(tmpdir(), `talia-tts-${Date.now()}.mp3`);
    writeFileSync(audioPath, buffer);

    // Play via PowerShell
    runPowerShell(
      `
Add-Type -AssemblyName presentationCore
$player = New-Object System.Windows.Media.MediaPlayer
$player.Open([uri]"${audioPath.replace(/\\/g, '\\\\')}")
$player.Play()
Start-Sleep -Seconds 3
`,
      15000,
    );

    try {
      unlinkSync(audioPath);
    } catch {
      /* ignore */
    }
    return { ok: true, provider: 'elevenlabs', durationMs: Date.now() - start };
  } catch (err) {
    return { ok: false, provider: 'elevenlabs', durationMs: Date.now() - start, error: (err as Error).message };
  }
};

// ── Proveedor 2: Google Translate TTS (sin API key, límite de longitud) ─────
const speakGoogleUnofficial = async (text: string, opts: TTSOptions): Promise<TTSResult> => {
  const lang = (opts.language ?? 'es-AR').slice(0, 5).toLowerCase().replace('-ar', '').replace('-br', '-br');
  const start = Date.now();
  try {
    const encoded = encodeURIComponent(text.slice(0, 200));
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encoded}&tl=${lang}&client=tw-ob`;

    const response = await fetch(url, {
      headers: { 'user-agent': 'Mozilla/5.0 (compatible; FeedIA TTS)' },
    });
    if (!response.ok) throw new Error(`Google TTS ${response.status}`);

    const buffer = Buffer.from(await response.arrayBuffer());
    const audioPath = join(tmpdir(), `talia-gtts-${Date.now()}.mp3`);
    writeFileSync(audioPath, buffer);

    const audioPathEscaped = audioPath.replace(/\\/g, '\\\\');
    runPowerShell(
      `
Add-Type -AssemblyName presentationCore
$player = New-Object System.Windows.Media.MediaPlayer
$player.Open([uri]"${audioPathEscaped}")
$player.Play()
Start-Sleep -Milliseconds 1500
while ($player.IsBuffering) { Start-Sleep -Milliseconds 100 }
Start-Sleep -Seconds 2
$player.Close()
`,
      12000,
    );

    try {
      unlinkSync(audioPath);
    } catch {
      /* ignore */
    }
    return { ok: true, provider: 'google_unofficial', durationMs: Date.now() - start };
  } catch (err) {
    return { ok: false, provider: 'google_unofficial', durationMs: Date.now() - start, error: (err as Error).message };
  }
};

// ── Proveedor 3: Windows SAPI (fallback offline siempre disponible) ──────────
const speakSAPI = (text: string, opts: TTSOptions): TTSResult => {
  const start = Date.now();
  const safeText = text.replace(/'/g, "''").replace(/[<>]/g, '').slice(0, 3000);
  const langHint = SAPI_VOICE_HINTS[opts.language ?? 'es-AR'] ?? 'es';
  const rate = opts.rate ?? 0;
  const volume = opts.volume ?? 90;

  try {
    runPowerShell(
      `
Add-Type -AssemblyName System.Speech
$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
$synth.Rate = ${rate}
$synth.Volume = ${volume}
try {
  $voices = $synth.GetInstalledVoices() | Where-Object {
    $_.VoiceInfo.Culture.Name -match '${langHint}' -and $_.VoiceInfo.Gender -eq 'Female'
  }
  if ($voices.Count -gt 0) {
    $synth.SelectVoice($voices[0].VoiceInfo.Name)
  } else {
    $allFemale = $synth.GetInstalledVoices() | Where-Object { $_.VoiceInfo.Gender -eq 'Female' }
    if ($allFemale.Count -gt 0) { $synth.SelectVoice($allFemale[0].VoiceInfo.Name) }
  }
} catch {}
$synth.Speak('${safeText}')
$synth.Dispose()
`,
      30000,
    );
    return { ok: true, provider: 'sapi', durationMs: Date.now() - start };
  } catch (err) {
    return { ok: false, provider: 'sapi', durationMs: Date.now() - start, error: (err as Error).message };
  }
};

/**
 * Habla un texto con la voz de Talía.
 * Intenta: ElevenLabs → Google TTS → Windows SAPI.
 */
export const speak = async (text: string, opts: TTSOptions = {}): Promise<TTSResult> => {
  if (!text.trim()) return { ok: true, provider: 'sapi', durationMs: 0 };

  log.debug(`[TTS] "${text.slice(0, 60)}..."`);

  const preferred = opts.provider ?? (process.env['ELEVENLABS_API_KEY'] ? 'elevenlabs' : 'google_unofficial');

  if (preferred === 'elevenlabs') {
    const r = await speakElevenLabs(text, opts);
    if (r.ok) return r;
    log.warn(`[TTS] ElevenLabs falló (${r.error}), intentando Google TTS`);
  }

  if (preferred !== 'sapi') {
    const r = await speakGoogleUnofficial(text, opts);
    if (r.ok) return r;
    log.warn(`[TTS] Google TTS falló (${r.error}), usando SAPI`);
  }

  return speakSAPI(text, opts);
};

/**
 * Habla de forma asíncrona sin bloquear.
 */
export const speakAsync = (text: string, opts: TTSOptions = {}): void => {
  void speak(text, { ...opts, async: true }).catch((err) => log.warn(`[TTS] Error async: ${(err as Error).message}`));
};

/**
 * Lista las voces disponibles en SAPI (Windows).
 */
export const listSAPIVoices = (): string[] => {
  try {
    const output = runPowerShell(`
Add-Type -AssemblyName System.Speech
$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
$synth.GetInstalledVoices() | ForEach-Object {
  "$($_.VoiceInfo.Name) [$($_.VoiceInfo.Culture)] $($_.VoiceInfo.Gender)"
}
`);
    return output.split('\n').filter(Boolean);
  } catch {
    return ['SAPI no disponible'];
  }
};

export const buildBrowserTTSPayload = (
  text: string,
  lang: TTSLanguage = 'es-AR',
): { text: string; lang: string; pitch: number; rate: number; volume: number } => ({
  text,
  lang,
  pitch: 1.1,
  rate: 0.95,
  volume: 1,
});

// Exportar estado para config.ts
export const TTSConfig = {
  hasElevenLabs: Boolean(process.env['ELEVENLABS_API_KEY']),
  defaultLanguage: (process.env['TTS_LANGUAGE'] ?? 'es-AR') as TTSLanguage,
  defaultProvider: (process.env['TTS_PROVIDER'] ?? 'google_unofficial') as TTSProvider,
};

/* ── Interruptible TTS ─────────────────────────────────────────────────────
   Permite cancelar el audio que está sonando cuando el usuario empieza
   a hablar. Crítico para modo manos libres fluido.                        */

export interface TTSController {
  stop: () => void;
  finished: Promise<void>;
}

let activeTTSProcess: ChildProcess | null = null;

export const stopActiveTTS = (): void => {
  if (activeTTSProcess) {
    try {
      activeTTSProcess.kill('SIGTERM');
    } catch {
      /* ignore */
    }
    activeTTSProcess = null;
  }
};

/**
 * Habla de forma interrumpible. Devuelve un controller con `stop()`.
 * Si se llama `stop()` mientras habla, el audio se corta inmediatamente.
 */
export const speakInterruptible = async (text: string, opts: TTSOptions = {}): Promise<TTSController> => {
  if (!text.trim()) {
    return { stop: (): void => {}, finished: Promise.resolve() };
  }

  // Cancel any previous TTS
  stopActiveTTS();

  const preferred = opts.provider ?? (process.env['ELEVENLABS_API_KEY'] ? 'elevenlabs' : 'google_unofficial');
  let audioPath: string | null = null;

  // 1. Generate audio file
  if (preferred === 'elevenlabs') {
    const apiKey = process.env['ELEVENLABS_API_KEY'];
    if (apiKey) {
      try {
        const voiceId = opts.language?.startsWith('es') ? 'EXAVITQu4vr4xnSDxMaL' : '21m00Tcm4TlvDq8ikWAM';
        const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
          method: 'POST',
          headers: { 'xi-api-key': apiKey, 'content-type': 'application/json' },
          body: JSON.stringify({
            text: text.slice(0, 2500),
            model_id: 'eleven_multilingual_v2',
            voice_settings: { stability: 0.5, similarity_boost: 0.8 },
          }),
        });
        if (response.ok) {
          const buffer = Buffer.from(await response.arrayBuffer());
          audioPath = join(tmpdir(), `talia-tts-${Date.now()}.mp3`);
          writeFileSync(audioPath, buffer);
        }
      } catch {
        /* fallback */
      }
    }
  }

  if (!audioPath && preferred !== 'sapi') {
    try {
      const lang = (opts.language ?? 'es-AR').slice(0, 5).toLowerCase().replace('-ar', '').replace('-br', '-br');
      const response = await fetch(
        `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text.slice(0, 200))}&tl=${lang}&client=tw-ob`,
        {
          headers: { 'user-agent': 'Mozilla/5.0' },
        },
      );
      if (response.ok) {
        const buffer = Buffer.from(await response.arrayBuffer());
        audioPath = join(tmpdir(), `talia-gtts-${Date.now()}.mp3`);
        writeFileSync(audioPath, buffer);
      }
    } catch {
      /* fallback */
    }
  }

  if (!audioPath) {
    // SAPI: generate WAV then play
    const safeText = text.replace(/'/g, "''").replace(/[<>]/g, '').slice(0, 3000);
    const langHint = SAPI_VOICE_HINTS[opts.language ?? 'es-AR'] ?? 'es';
    const rate = opts.rate ?? 0;
    const volume = opts.volume ?? 90;
    audioPath = join(tmpdir(), `talia-sapi-${Date.now()}.wav`);

    try {
      execSync(
        `powershell -Command "
Add-Type -AssemblyName System.Speech
\$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
\$synth.Rate = ${rate}
\$synth.Volume = ${volume}
try {
  \$voices = \$synth.GetInstalledVoices() | Where-Object { \$_.VoiceInfo.Culture.Name -match '${langHint}' -and \$_.VoiceInfo.Gender -eq 'Female' }
  if (\$voices.Count -gt 0) { \$synth.SelectVoice(\$voices[0].VoiceInfo.Name) }
} catch {}
\$synth.SetOutputToWaveFile('${audioPath.replace(/\\/g, '\\\\')}')
\$synth.Speak('${safeText}')
\$synth.Dispose()
"`,
        { timeout: 30000, windowsHide: true },
      );
    } catch {
      return { stop: (): void => {}, finished: Promise.resolve() };
    }
  }

  // 2. Play audio in a spawned PowerShell process (killable)
  const escapedPath = audioPath.replace(/\\/g, '\\\\');
  const ps = spawn(
    'powershell',
    [
      '-ExecutionPolicy',
      'Bypass',
      '-Command',
      `Add-Type -AssemblyName presentationCore; $player = New-Object System.Windows.Media.MediaPlayer; $player.Open([uri]"${escapedPath}"); $player.Play(); while ($player.Position -lt $player.NaturalDuration.TimeSpan) { Start-Sleep -Milliseconds 200 }; $player.Close()`,
    ],
    { windowsHide: true, detached: false },
  );

  activeTTSProcess = ps;

  const finished = new Promise<void>((resolve) => {
    ps.on('exit', () => {
      if (activeTTSProcess === ps) activeTTSProcess = null;
      try {
        unlinkSync(audioPath!);
      } catch {
        /* ignore */
      }
      resolve();
    });
    ps.on('error', () => {
      if (activeTTSProcess === ps) activeTTSProcess = null;
      try {
        unlinkSync(audioPath!);
      } catch {
        /* ignore */
      }
      resolve();
    });
  });

  return {
    stop: (): void => {
      if (activeTTSProcess === ps) {
        try {
          ps.kill('SIGTERM');
        } catch {
          /* ignore */
        }
        activeTTSProcess = null;
      }
      try {
        unlinkSync(audioPath!);
      } catch {
        /* ignore */
      }
    },
    finished,
  };
};

/** Devuelve true si hay un TTS sonando en este momento. */
export const isTTSSpeaking = (): boolean => activeTTSProcess !== null && !activeTTSProcess.killed;
