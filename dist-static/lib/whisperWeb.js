/**
 * Whisper.cpp en el Browser — STT 100% offline vía WebAssembly
 * ─────────────────────────────────────────────────────────────────────────
 * Carga whisper.cpp compilado a WASM desde CDN. El modelo se descarga
 * la primera vez y se cachea en IndexedDB.
 *
 * Uso: opt-in (pesado ~70MB modelo multilingual).
 * El usuario debe activarlo explícitamente en settings.
 *
 * Fallback: Web Speech API nativa del browser.
 */

const WHISPER_CDN = 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2';

let whisperPipeline = null;
let isLoading = false;
let loadError = null;

/* ── Lazy Load ───────────────────────────────────────────────────────────── */

const loadTransformers = () =>
  new Promise((resolve, reject) => {
    if (window.pipeline) {
      resolve();
      return;
    }
    const s = document.createElement('script');
    s.src = `${WHISPER_CDN}/dist/transformers.min.js`;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('No se pudo cargar transformers.js'));
    document.head.appendChild(s);
  });

export const isWhisperWebAvailable = () => typeof window !== 'undefined' && !!window.WebAssembly;

export const initWhisperWeb = async (opts = {}) => {
  if (whisperPipeline) return { ok: true };
  if (isLoading) return { ok: false, error: 'Cargando...' };
  if (!isWhisperWebAvailable()) return { ok: false, error: 'WebAssembly no disponible' };

  isLoading = true;
  try {
    await loadTransformers();
    const { pipeline, env } = window.Transformers || window;
    if (!pipeline) throw new Error('Transformers.js no exporta pipeline');

    // Usar modelo pequeño para velocidad (quantized)
    env.allowLocalModels = false;
    env.useBrowserCache = true;

    whisperPipeline = await pipeline('automatic-speech-recognition', 'Xenova/whisper-tiny', {
      dtype: 'q4', // quantized 4-bit
      device: 'webgpu', // aceleración GPU si está disponible
      ...opts,
    });

    isLoading = false;
    return { ok: true };
  } catch (err) {
    isLoading = false;
    loadError = err.message;
    return { ok: false, error: err.message || 'Error cargando Whisper' };
  }
};

/* ── Transcription ───────────────────────────────────────────────────────── */

export const transcribeAudio = async (audioBuffer, opts = {}) => {
  if (!whisperPipeline) {
    const init = await initWhisperWeb();
    if (!init.ok) return { ok: false, error: init.error };
  }

  try {
    const result = await whisperPipeline(audioBuffer, {
      language: opts.language || 'es',
      task: 'transcribe',
      return_timestamps: false,
    });

    return {
      ok: true,
      transcript: result.text || '',
      confidence: 0.9, // Whisper no devuelve confidence por defecto
      language: opts.language || 'es',
    };
  } catch (err) {
    return { ok: false, error: err.message };
  }
};

/**
 * Transcribe un Blob de audio (WAV/MP3) a texto.
 */
export const transcribeBlob = async (blob, opts = {}) => {
  const arrayBuffer = await blob.arrayBuffer();
  // transformers.js acepta directamente el array buffer
  return transcribeAudio(arrayBuffer, opts);
};

/**
 * Convierte AudioBuffer (Web Audio API) a formato compatible.
 */
export const transcribeWebAudio = async (audioBuffer, opts = {}) => {
  // Extraer canal mono float32
  const mono = audioBuffer.getChannelData(0);
  // Resample a 16kHz si es necesario
  const targetSampleRate = 16000;
  let samples = mono;
  if (audioBuffer.sampleRate !== targetSampleRate) {
    const ratio = targetSampleRate / audioBuffer.sampleRate;
    const newLength = Math.floor(mono.length * ratio);
    samples = new Float32Array(newLength);
    for (let i = 0; i < newLength; i++) {
      samples[i] = mono[Math.floor(i / ratio)];
    }
  }
  return transcribeAudio(samples, opts);
};

/* ── Status ──────────────────────────────────────────────────────────────── */

export const getWhisperStatus = () => ({
  ready: !!whisperPipeline,
  loading: isLoading,
  error: loadError,
});
