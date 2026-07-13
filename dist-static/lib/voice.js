/* ══════════════════════════════════════════════════════════════════════════════
   voice.js — Hands-free voice engine for FeedIA
   ──────────────────────────────────────────────────────────────────────────────
   100% browser-native, zero cost, unlimited:
     • SpeechRecognition  → wake-word detection + command capture (STT)
     • speechSynthesis     → human-sounding replies (TTS)

   Two recognition modes:
     1. WAKE  — continuous, low-friction loop listening for "Hola FeedIA" and
                multilingual variants. Auto-restarts on end.
     2. COMMAND — after wake (or manual mic tap) captures one utterance, then
                  hands the transcript to the registered command handler.

   Public API:
     initVoice(opts)            → set up the engine
     startWakeLoop()/stopWakeLoop()
     captureCommand()           → manually enter command mode
     speak(text, {lang})        → TTS, returns a promise resolving on 'end'
     setConfig({...})           → rate/pitch/voiceURI/lang/ttsEnabled
     getVoices()                → available SpeechSynthesis voices
     isSupported()              → STT availability
   ══════════════════════════════════════════════════════════════════════════════ */

import { getSpeechLang } from './i18n.js';

const SR = typeof window !== 'undefined' ? window.SpeechRecognition || window.webkitSpeechRecognition : null;

/* ── Wake phrases ─────────────────────────────────────────────────────────
   Every phonetic variant a STT engine might produce for "FeedIA".
   Organised by language/context; the fuzzy matcher below catches the rest. */
const WAKE_PATTERNS = [
  // ── Español — con saludo ────────────────────────────────────────────────
  'hola feedia',
  'hola fidia',
  'hola fideia',
  'hola fidea',
  'hola fedia',
  'hola feedya',
  'hola fidya',
  'hola fidiea',
  'hola fid ia',
  'hola feed ia',
  'hola feed ya',
  'hola fid ya',
  'hola fid hey a',
  'hola fidiya',
  'hola fideya',
  'hola fid ea',
  'hola fidieya',
  'ola feedia',
  'ola fidia',
  'ola fideia',
  'ola fidea',
  'ola feedya',
  'oye feedia',
  'oye fidia',
  'oye fideia',
  'oye fedia',
  'oye feedya',
  'oye fid ia',
  'oye fidya',
  'ey feedia',
  'ey fidia',
  'ey fideia',
  'ey fedia',
  'ey feedya',
  'eh feedia',
  'eh fidia',
  'eh fideia',
  'che feedia',
  'che fidia',
  'che fideia',
  'che fedia', // Argentina
  'hey feedia',
  'hey fidia',
  'hey fideia',
  'hey fedia',
  'hey feedya',
  'hey fid ia',
  'hey fidya',
  'hey fid hey a',
  'hola a feedia',
  'hola a fidia',
  'hola a fideia',
  // ── Español — solo el nombre ────────────────────────────────────────────
  'feedia',
  'fidia',
  'fideia',
  'fidea',
  'fedia',
  'feedya',
  'fidya',
  'fidiea',
  'fidiya',
  'fideya',
  'fidieya',
  'fid ia',
  'feed ia',
  'fid ya',
  'feed ya',
  'fid hey a',
  'feed ee a',
  'fid ea',
  // ── English ─────────────────────────────────────────────────────────────
  'hello feedia',
  'hello fidia',
  'hello fideia',
  'hello fedia',
  'hey feedia',
  'hi feedia',
  'hi fidia',
  'hi fideia',
  'hi fedia',
  'ok feedia',
  'okay feedia',
  'ok fidia',
  'okay fidia',
  'okay fideia',
  'feed ia',
  'feed ya',
  // ── Portuguese ──────────────────────────────────────────────────────────
  'olá feedia',
  'olá fidia',
  'olá fideia',
  'olá fidea',
  'oi feedia',
  'oi fidia',
  'oi fideia',
  'oi fedia',
  // ── Italiano ────────────────────────────────────────────────────────────
  'ciao feedia',
  'ciao fidia',
  'ciao fideia',
  'ehi feedia',
  'ehi fidia',
  'ehi fideia',
  // ── Alemán ──────────────────────────────────────────────────────────────
  'hallo feedia',
  'hallo fidia',
  'hallo fideia',
  // ── Francés ─────────────────────────────────────────────────────────────
  'salut feedia',
  'salut fidia',
  'bonjour feedia',
  'allô feedia',
];

/* Phonetic roots of "FeedIA" — what STT engines produce across accents.
   Used for Levenshtein fuzzy matching as a second-pass after exact patterns. */
const FEEDIA_PHONEMES = [
  'feedia',
  'fidia',
  'fideia',
  'fidea',
  'fedia',
  'feedya',
  'fidya',
  'fidiea',
  'fidiya',
  'fideya',
];

/* Levenshtein distance — edit distance between two strings. */
const lev = (a, b) => {
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const m = Array.from({ length: b.length + 1 }, (_, i) => [i]);
  for (let j = 0; j <= a.length; j++) m[0][j] = j;
  for (let i = 1; i <= b.length; i++)
    for (let j = 1; j <= a.length; j++)
      m[i][j] = b[i - 1] === a[j - 1] ? m[i - 1][j - 1] : 1 + Math.min(m[i - 1][j], m[i][j - 1], m[i - 1][j - 1]);
  return m[b.length][a.length];
};

/* Returns true if any token in transcript is within edit-distance 1 of a known phoneme. */
const fuzzyMatchesFeedIA = (transcript) => {
  const norm = transcript.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  return norm.split(/\s+/).some((w) => w.length >= 4 && FEEDIA_PHONEMES.some((p) => lev(w, p) <= 1));
};

const LS_CFG = 'feedia.voice.cfg';

const defaultConfig = {
  ttsEnabled: true,
  wakeEnabled: false, // opt-in; mic permission is requested on enable
  rate: 1.02, // a touch faster than default reads more "human"
  pitch: 1.05, // slightly warmer
  voiceURI: '', // empty = auto-pick best for language
  volume: 1,
};

let config = { ...defaultConfig };
try {
  const saved = JSON.parse(localStorage.getItem(LS_CFG) || '{}');
  config = { ...config, ...saved };
} catch {
  /* ignore */
}

const persistConfig = () => {
  try {
    localStorage.setItem(LS_CFG, JSON.stringify(config));
  } catch {
    /* ignore */
  }
};

let wakeRec = null;
let cmdRec = null;
let wakeActive = false;
let inCommandMode = false;
let handlers = {
  onWake: () => {},
  onState: () => {}, // (state: 'idle'|'wake'|'listening'|'processing'|'speaking'|'error', detail?)
  onPartial: () => {}, // (text)
  onCommand: () => {}, // (transcript) -> void/Promise
  onError: () => {}, // (kind, message)
};

export const isSupported = () => Boolean(SR);

export const getConfig = () => ({ ...config });

export const setConfig = (patch) => {
  config = { ...config, ...patch };
  persistConfig();
};

/* ── TTS ─────────────────────────────────────────────────────────────────── */

let voicesCache = [];
const refreshVoices = () => {
  if (typeof speechSynthesis === 'undefined') return;
  voicesCache = speechSynthesis.getVoices();
};
if (typeof speechSynthesis !== 'undefined') {
  refreshVoices();
  speechSynthesis.onvoiceschanged = refreshVoices;
}

export const getVoices = () => voicesCache.slice();

/* Pronunciación fonética de "FeedIA" → "Fidia" para que el TTS no lo lea en inglés
   ("Feed AI"). También evita que "AI" suelto se pronuncie en inglés. */
const phoneticPreprocess = (text) =>
  String(text ?? '')
    // FeedIA / Feed-IA / Feed IA (case-insensitive, palabra completa) → Fidia
    .replace(/\bfeed[\s\-]?ia\b/gi, 'Fidia')
    // "FeedIA" en otros casos (camelcase pegado)
    .replace(/FeedIA/g, 'Fidia')
    // "AI" suelto (mayúsculas) → "i. a." (deletreado en español)
    .replace(/\bAI\b/g, 'i a')
    // "IA" suelto → "i a" (mismo tratamiento — evita lectura inglesa)
    .replace(/\bIA\b/g, 'i a');

/* Selección estricta de voz: SOLO voces del idioma pedido. Si no hay ninguna en
   ese idioma, NO usar voz alguna (mejor el TTS por defecto del sistema en ese
   lang que una voz de otro idioma con tonada extranjera). Prefiere variantes
   neutras de español latinoamericano. */
const NEUTRAL_ES_ORDER = ['es-mx', 'es-419', 'es-us', 'es-co', 'es-cl', 'es-pe', 'es-ar', 'es-es'];

const pickVoice = (speechLang) => {
  if (config.voiceURI) {
    const exact = voicesCache.find((v) => v.voiceURI === config.voiceURI);
    // Solo usar la voz guardada si coincide con el idioma actual (evita que una
    // voz inglesa configurada se quede activa al hablar en español).
    if (exact && exact.lang && exact.lang.toLowerCase().startsWith(speechLang.slice(0, 2).toLowerCase())) {
      return exact;
    }
  }
  const langPrefix = speechLang.slice(0, 2).toLowerCase();
  // Solo voces del idioma objetivo. Nada de fallback a otro idioma.
  const matches = voicesCache.filter((v) => v.lang && v.lang.toLowerCase().startsWith(langPrefix));
  if (!matches.length) return null;

  // Para español: priorizar variantes neutras (MX, 419, US) y rechazar voces
  // marcadas con acento inglés ("English", "Anglo", etc.).
  if (langPrefix === 'es') {
    const cleanES = matches.filter((v) => !/english|anglo|en-/i.test(v.name + ' ' + v.lang));
    const pool = cleanES.length ? cleanES : matches;
    // Buscar voces "naturales" de Google/Microsoft Natural/Premium en orden neutro
    for (const target of NEUTRAL_ES_ORDER) {
      const natural = pool.find(
        (v) => v.lang.toLowerCase() === target && /google|natural|premium|enhanced|neural|online/i.test(v.name),
      );
      if (natural) return natural;
    }
    for (const target of NEUTRAL_ES_ORDER) {
      const any = pool.find((v) => v.lang.toLowerCase() === target);
      if (any) return any;
    }
    return pool[0];
  }

  const preferred = matches.find((v) => /google|natural|premium|enhanced|neural/i.test(v.name));
  return preferred || matches[0] || null;
};

export const speak = (text, opts = {}) =>
  new Promise((resolve) => {
    if (!config.ttsEnabled || typeof speechSynthesis === 'undefined' || !text) {
      resolve();
      return;
    }
    try {
      speechSynthesis.cancel();
      const phon = phoneticPreprocess(text);
      const u = new SpeechSynthesisUtterance(phon.slice(0, 500));
      const speechLang = opts.lang || getSpeechLang();
      u.lang = speechLang;
      const v = pickVoice(speechLang);
      if (v) u.voice = v;
      u.rate = config.rate;
      u.pitch = config.pitch;
      u.volume = config.volume;
      u.onend = () => resolve();
      u.onerror = () => resolve();
      handlers.onState('speaking', text);
      speechSynthesis.speak(u);
    } catch {
      resolve();
    }
  });

export const stopSpeaking = () => {
  try {
    speechSynthesis.cancel();
  } catch {
    /* ignore */
  }
};

/* ── Wake loop ───────────────────────────────────────────────────────────── */

/* Exact match against WAKE_PATTERNS — checked on both interim + final. */
const matchesWakeExact = (transcript) => {
  const t = transcript.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  return WAKE_PATTERNS.some((p) => t.includes(p.normalize('NFD').replace(/[̀-ͯ]/g, '')));
};

/* Combined check: exact patterns OR fuzzy phoneme match (finals only). */
const matchesWake = (transcript, isFinal = false) =>
  matchesWakeExact(transcript) || (isFinal && fuzzyMatchesFeedIA(transcript));

export const startWakeLoop = () => {
  if (!SR || wakeActive || inCommandMode) return;
  wakeActive = true;
  config.wakeEnabled = true;
  persistConfig();

  const spin = () => {
    if (!wakeActive || inCommandMode) return;
    try {
      wakeRec = new SR();
      wakeRec.lang = getSpeechLang();
      wakeRec.continuous = true;
      wakeRec.interimResults = true;
      wakeRec.maxAlternatives = 3;

      wakeRec.onresult = (e) => {
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const res = e.results[i];
          for (let a = 0; a < res.length; a++) {
            const { transcript, confidence } = res[a];
            // Skip very-low-confidence noise (0 = unknown, so allow 0)
            if (confidence > 0 && confidence < 0.2) continue;
            if (matchesWake(transcript, res.isFinal)) {
              try {
                wakeRec.stop();
              } catch {
                /* ignore */
              }
              handlers.onWake();
              return;
            }
          }
        }
      };
      wakeRec.onerror = (e) => {
        if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
          wakeActive = false;
          handlers.onError('mic-denied', e.error);
          handlers.onState('error', 'mic-denied');
          return;
        }
        // 'no-speech'/'aborted'/'network' → just respin.
      };
      wakeRec.onend = () => {
        // Respin unless we deliberately stopped or entered command mode.
        if (wakeActive && !inCommandMode) setTimeout(spin, 350);
      };
      wakeRec.start();
      handlers.onState('wake');
    } catch {
      if (wakeActive) setTimeout(spin, 800);
    }
  };
  spin();
};

export const stopWakeLoop = () => {
  wakeActive = false;
  config.wakeEnabled = false;
  persistConfig();
  try {
    wakeRec && wakeRec.stop();
  } catch {
    /* ignore */
  }
  handlers.onState('idle');
};

export const isWakeActive = () => wakeActive;

/* ── Command capture ─────────────────────────────────────────────────────── */

export const captureCommand = () => {
  if (!SR || inCommandMode) return;
  inCommandMode = true;
  stopSpeaking();
  try {
    wakeRec && wakeRec.stop();
  } catch {
    /* ignore */
  }

  let finalTranscript = '';
  let settled = false;
  let silenceTimer = null;

  const clearSilence = () => clearTimeout(silenceTimer);

  const resetSilence = () => {
    clearSilence();
    // Auto-commit after 2s of no new speech — hands-free UX
    silenceTimer = setTimeout(() => {
      try {
        cmdRec?.stop();
      } catch {
        /* ignore */
      }
    }, 2000);
  };

  const finish = async () => {
    if (settled) return;
    settled = true;
    clearSilence();
    inCommandMode = false;
    const text = finalTranscript.trim();
    // Noise gate: require ≥2 words to avoid submitting ambient noise / single phonemes
    const wordCount = text ? text.split(/\s+/).filter(Boolean).length : 0;
    if (text && wordCount >= 2) {
      handlers.onState('processing', text);
      try {
        await handlers.onCommand(text);
      } catch {
        /* handled by caller */
      }
    } else {
      handlers.onState('idle');
    }
    // Resume wake loop if it was enabled.
    if (wakeActive) setTimeout(startWakeLoop, 500);
  };

  try {
    cmdRec = new SR();
    cmdRec.lang = getSpeechLang();
    cmdRec.continuous = false;
    cmdRec.interimResults = true;
    cmdRec.maxAlternatives = 1;

    handlers.onState('listening');

    cmdRec.onresult = (e) => {
      resetSilence(); // Reset silence timer on every speech update
      let interim = '';
      for (let i = 0; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finalTranscript += r[0].transcript;
        else interim += r[0].transcript;
      }
      handlers.onPartial((finalTranscript + ' ' + interim).trim());
    };
    cmdRec.onerror = (e) => {
      clearSilence();
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        handlers.onError('mic-denied', e.error);
      }
      finish();
    };
    cmdRec.onend = () => finish();
    // Start silence timer immediately — if no speech in 8s, give up
    silenceTimer = setTimeout(() => {
      try {
        cmdRec?.stop();
      } catch {
        /* ignore */
      }
    }, 8000);
    cmdRec.start();
  } catch {
    clearSilence();
    finish();
  }
};

export const cancelCommand = () => {
  inCommandMode = false;
  try {
    cmdRec && cmdRec.abort();
  } catch {
    /* ignore */
  }
  stopSpeaking();
  handlers.onState('idle');
  if (wakeActive) setTimeout(startWakeLoop, 400);
};

/* ── Init ────────────────────────────────────────────────────────────────── */

export const initVoice = (opts = {}) => {
  handlers = { ...handlers, ...opts };
  // Auto-start the wake loop if the user previously enabled it.
  if (config.wakeEnabled && SR) {
    // Defer so the page is interactive first.
    setTimeout(() => startWakeLoop(), 1200);
  }
  return { isSupported: isSupported() };
};
