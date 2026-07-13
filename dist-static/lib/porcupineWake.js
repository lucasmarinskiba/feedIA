/**
 * Porcupine Wake Word — Detección offline de wake word vía WebAssembly
 * ─────────────────────────────────────────────────────────────────────────
 * Carga Picovoice Porcupine v2 desde CDN para detección de wake word
 * 100% local en el browser, sin enviar audio al servidor.
 *
 * Arquitectura:
 *   1. Lazy-load del engine Porcupine + keyword file (.ppn)
 *   2. Web Audio API → ScriptProcessorNode → procesamiento frame a frame
 *   3. Detección local sin red, sin STT, sin latencia
 *
 * Fallback: si Porcupine no carga, delega al wake word engine existente.
 *
 * Requiere:
 *   • PORCUPINE_ACCESS_KEY en .env (se inyecta vía window.__env)
 *   • Micrófono con Web Audio API
 */

const CDN_BASE = 'https://cdn.jsdelivr.net/npm/@picovoice/porcupine-web@2';

let engine = null;
let isReady = false;
let audioContext = null;
let processor = null;
let mediaStream = null;
let detectionCallback = null;
let running = false;

const KEYWORDS = {
  es: 'hola-talia',
  en: 'hey-talia',
  pt: 'ola-talia',
};

let customKeywords = []; // loaded from server

/* ── Lazy Load Engine ────────────────────────────────────────────────────── */

const loadScript = (src) =>
  new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = resolve;
    s.onerror = reject;
    document.head.appendChild(s);
  });

export const isPorcupineAvailable = () => typeof window !== 'undefined' && !!window.WebAssembly;

export const initPorcupine = async (opts = {}) => {
  if (isReady) return { ok: true };
  if (!isPorcupineAvailable()) return { ok: false, error: 'WebAssembly no disponible' };

  const accessKey = opts.accessKey || window.__env?.PORCUPINE_ACCESS_KEY || '';
  if (!accessKey) return { ok: false, error: 'Falta PORCUPINE_ACCESS_KEY' };

  const lang = (opts.lang || 'es').slice(0, 2);
  const keywordName = KEYWORDS[lang] || KEYWORDS['en'];

  // Store custom keywords from opts
  if (opts.customKeywords) {
    customKeywords = opts.customKeywords;
  }

  try {
    // Cargar el bundle UMD de Porcupine
    await loadScript(`${CDN_BASE}/dist/iife/index.js`);

    const { PorcupineWorker } = window.PorcupineWeb || {};
    if (!PorcupineWorker) {
      return { ok: false, error: 'No se pudo cargar PorcupineWorker' };
    }

    // Build keyword list: built-in + custom from server
    const keywords = [];

    // Built-in keyword
    const keywordUrl = `${window.location.origin}/api/voice/keyword/${keywordName}`;
    let keywordBase64 = null;
    try {
      const r = await fetch(keywordUrl);
      if (r.ok) keywordBase64 = await r.text();
    } catch {
      // Fallback: usar keyword builtin si está disponible
    }
    if (keywordBase64) {
      keywords.push({ base64: keywordBase64, label: keywordName });
    } else {
      keywords.push(keywordName);
    }

    // Custom keywords from server
    for (const cw of customKeywords) {
      if (cw.porcupinePpnBase64) {
        keywords.push({ base64: cw.porcupinePpnBase64, label: cw.displayName || cw.phrase });
      } else {
        // Try to fetch PPN from server
        try {
          const r = await fetch(`${window.location.origin}/api/voice/keyword/${cw.id}`);
          if (r.ok) {
            const b64 = await r.text();
            keywords.push({ base64: b64, label: cw.displayName || cw.phrase });
          }
        } catch {
          /* ignore fetch errors for custom keywords */
        }
      }
    }

    engine = await PorcupineWorker.create(accessKey, keywords, {
      base64: opts.modelBase64,
      publicPath: `${CDN_BASE}/dist/iife/porcupine_params.pv`,
    });

    // Configurar callback de detección
    engine.onmessage = (e) => {
      if (e.data.command === 'ppn-keyword') {
        const kw = keywords[e.data.keywordIndex] || keywords[0] || {};
        const label = kw.label || kw || 'wake';
        if (detectionCallback) detectionCallback({ keywordIndex: e.data.keywordIndex, label });
      }
    };

    isReady = true;
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message || 'Error cargando Porcupine' };
  }
};

/* ── Audio Pipeline ──────────────────────────────────────────────────────── */

const startAudioCapture = async () => {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error('getUserMedia no disponible');
  }

  mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
  audioContext = new AudioContext({ sampleRate: 16000 });
  const source = audioContext.createMediaStreamSource(mediaStream);

  // ScriptProcessorNode para procesamiento frame a frame
  // (AudioWorklet es mejor pero requiere un archivo separado; usamos SP por simplicidad)
  const bufferSize = 512;
  processor = audioContext.createScriptProcessor(bufferSize, 1, 1);

  processor.onaudioprocess = (e) => {
    if (!running || !engine) return;
    const input = e.inputBuffer.getChannelData(0);
    // Convertir float32 a int16
    const int16 = new Int16Array(input.length);
    for (let i = 0; i < input.length; i++) {
      int16[i] = Math.max(-32768, Math.min(32767, input[i] * 32768));
    }
    // Enviar a Porcupine
    engine.postMessage({ command: 'process', inputFrame: int16 });
  };

  source.connect(processor);
  processor.connect(audioContext.destination);
};

/* ── Public API ──────────────────────────────────────────────────────────── */

export const startPorcupineWake = async (opts = {}) => {
  if (running) return { ok: true };

  if (!isReady) {
    const init = await initPorcupine(opts);
    if (!init.ok) return init;
  }

  try {
    await startAudioCapture();
    running = true;
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
};

export const stopPorcupineWake = () => {
  running = false;
  if (processor) {
    try {
      processor.disconnect();
    } catch {}
    processor = null;
  }
  if (audioContext) {
    try {
      audioContext.close();
    } catch {}
    audioContext = null;
  }
  if (mediaStream) {
    mediaStream.getTracks().forEach((t) => t.stop());
    mediaStream = null;
  }
};

export const setDetectionCallback = (cb) => {
  detectionCallback = cb;
};

export const getPorcupineStatus = () => ({
  ready: isReady,
  running,
  engineLoaded: !!engine,
});
