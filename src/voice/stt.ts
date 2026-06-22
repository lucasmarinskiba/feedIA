import { execSync } from 'child_process';
import { writeFileSync, unlinkSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { log } from '../agent/logger.js';

export interface STTOptions {
  language?: string; // 'es-AR', 'en-US', etc.
  timeoutMs?: number; // tiempo máximo escuchando
  singlePhrase?: boolean; // detener al primer silencio
}

export interface STTResult {
  ok: boolean;
  transcript: string;
  confidence: number; // 0.0 - 1.0
  language: string;
  provider: 'windows_sapi' | 'browser' | 'none';
  error?: string;
}

const runPowerShell = (script: string, timeoutMs = 15000): string => {
  const path = join(tmpdir(), `talia-stt-${Date.now()}.ps1`);
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

// ── Mapeo de idioma a Culture de Windows Speech ────────────────────────────
const LANG_TO_CULTURE: Record<string, string> = {
  'es-AR': 'es-AR',
  'es-ES': 'es-ES',
  es: 'es-ES',
  'en-US': 'en-US',
  'en-GB': 'en-GB',
  en: 'en-US',
  'pt-BR': 'pt-BR',
  'fr-FR': 'fr-FR',
  'de-DE': 'de-DE',
  'it-IT': 'it-IT',
};

/**
 * Escucha el micrófono usando Windows Speech Recognition (SAPI).
 * Bloquea hasta detectar una frase o llegar al timeout.
 */
export const listenOnce = (opts: STTOptions = {}): STTResult => {
  const lang = opts.language ?? process.env['STT_LANGUAGE'] ?? 'es-AR';
  const culture = LANG_TO_CULTURE[lang] ?? 'es-AR';
  const timeoutMs = opts.timeoutMs ?? 8000;
  const timeoutSec = Math.ceil(timeoutMs / 1000);

  log.debug(`[STT] Escuchando (${culture}, timeout ${timeoutSec}s)...`);

  try {
    const transcript = runPowerShell(
      `
Add-Type -AssemblyName System.Speech
$config = New-Object System.Speech.Recognition.SpeechRecognitionEngine
try {
  $config.SetInputToDefaultAudioDevice()
} catch {
  Write-Error "Microfono no disponible: $_"
  exit 1
}

# Grammar libre (cualquier texto)
$grammar = New-Object System.Speech.Recognition.DictationGrammar
$config.LoadGrammar($grammar)

$config.BabbleTimeout = [System.TimeSpan]::FromSeconds(${timeoutSec})
$config.EndSilenceTimeout = [System.TimeSpan]::FromSeconds(1.5)
$config.InitialSilenceTimeout = [System.TimeSpan]::FromSeconds(${timeoutSec})

try {
  $result = $config.Recognize([System.TimeSpan]::FromSeconds(${timeoutSec}))
  if ($result -ne $null) {
    Write-Output $result.Text
  } else {
    Write-Output "__SILENCE__"
  }
} catch {
  Write-Output "__ERROR__: $_"
} finally {
  $config.Dispose()
}
`,
      timeoutMs + 3000,
    );

    if (transcript.startsWith('__ERROR__')) {
      return { ok: false, transcript: '', confidence: 0, language: lang, provider: 'windows_sapi', error: transcript };
    }
    if (transcript === '__SILENCE__' || !transcript) {
      return { ok: true, transcript: '', confidence: 0, language: lang, provider: 'windows_sapi' };
    }

    return { ok: true, transcript, confidence: 0.85, language: lang, provider: 'windows_sapi' };
  } catch (err) {
    return {
      ok: false,
      transcript: '',
      confidence: 0,
      language: lang,
      provider: 'windows_sapi',
      error: (err as Error).message,
    };
  }
};

/**
 * Escucha continuamente el micrófono e invoca callback por cada frase detectada.
 * Útil para modo manos libres. Retorna función para detener.
 */
export const listenContinuous = (
  callback: (result: STTResult) => void,
  opts: STTOptions = {},
): { stop: () => void } => {
  let running = true;

  const loop = async (): Promise<void> => {
    while (running) {
      const result = listenOnce({ ...opts, timeoutMs: 6000 });
      if (result.transcript && result.transcript !== '') {
        callback(result);
      }
      // Small pause between recognition cycles
      await new Promise((r) => setTimeout(r, 300));
    }
  };

  void loop();
  return {
    stop: (): void => {
      running = false;
    },
  };
};

/**
 * Payload para que el browser use su propia Web Speech API.
 * Se envía al cliente via SSE/HTTP y el browser ejecuta el reconocimiento.
 */
export const buildBrowserSTTConfig = (
  language = 'es-AR',
): {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
} => ({
  lang: language,
  continuous: true,
  interimResults: false,
  maxAlternatives: 1,
});

/**
 * Verifica si Windows Speech Recognition está disponible.
 */
export const isSTTAvailable = (): boolean => {
  try {
    const result = runPowerShell(
      `
Add-Type -AssemblyName System.Speech
$engines = [System.Speech.Recognition.SpeechRecognitionEngine]::InstalledRecognizers()
Write-Output $engines.Count
`,
      5000,
    );
    return parseInt(result, 10) > 0;
  } catch {
    return false;
  }
};
