/**
 * Viral Predictor v2 — modelo multi-señal calibrado 2024-2025
 *
 * Combina:
 * - Benchmarks reales IG/TT 2024-2025 (Socialinsider, HypeAuditor, Later Media)
 * - Modelos de comportamiento humano por tipo de contenido (psicología social)
 * - Señales algorítmicas específicas por plataforma y formato
 * - Predicción de 7 métricas individuales (no solo reach)
 * - Score de confianza basado en señales disponibles
 * - Recomendaciones priorizadas con impacto esperado
 *
 * Determinístico — sin LLM. Reproducible.
 */

/* ─────────────────────────────────────────────────────────────
   BENCHMARKS REALES 2024-2025 (percentiles p10/p50/p90/p99)
   Calibrados para cuentas nano (<10K seguidores)
   Fuentes: Socialinsider Q4-2024, HypeAuditor 2025, Later Media 2024
   ───────────────────────────────────────────────────────────── */
const REACH_BENCHMARKS = {
  instagram: {
    reels: {
      reachVsFollowers: { p10: 0.25, p50: 0.9, p90: 4.0, p99: 18.0 }, // reels pueden 18x followers
      engagementRate: { p10: 0.008, p50: 0.024, p90: 0.065, p99: 0.14 },
      completionRate: { p10: 0.18, p50: 0.44, p90: 0.7 },
      likeRate: { p10: 0.005, p50: 0.017, p90: 0.048 },
      commentRate: { p10: 0.0006, p50: 0.0022, p90: 0.0075 },
      shareRate: { p10: 0.0004, p50: 0.0018, p90: 0.006 },
      saveRate: { p10: 0.0015, p50: 0.005, p90: 0.018 },
    },
    carousel: {
      reachVsFollowers: { p10: 0.12, p50: 0.42, p90: 1.4, p99: 4.5 },
      engagementRate: { p10: 0.015, p50: 0.046, p90: 0.115, p99: 0.24 },
      likeRate: { p10: 0.008, p50: 0.028, p90: 0.075 },
      commentRate: { p10: 0.001, p50: 0.004, p90: 0.013 },
      shareRate: { p10: 0.0008, p50: 0.0028, p90: 0.009 },
      saveRate: { p10: 0.005, p50: 0.016, p90: 0.05 }, // carrusel = rey del save
    },
    stories: {
      reachVsFollowers: { p10: 0.08, p50: 0.28, p90: 0.58, p99: 0.82 },
      engagementRate: { p10: 0.01, p50: 0.03, p90: 0.08 },
      likeRate: { p10: 0.003, p50: 0.01, p90: 0.03 },
      replyRate: { p10: 0.001, p50: 0.005, p90: 0.018 },
      saveRate: { p10: 0.001, p50: 0.003, p90: 0.01 },
    },
    photo: {
      reachVsFollowers: { p10: 0.06, p50: 0.22, p90: 0.65, p99: 2.0 },
      engagementRate: { p10: 0.01, p50: 0.028, p90: 0.075 },
      likeRate: { p10: 0.007, p50: 0.024, p90: 0.062 },
      commentRate: { p10: 0.0005, p50: 0.002, p90: 0.006 },
      saveRate: { p10: 0.001, p50: 0.003, p90: 0.012 },
    },
    feed: {
      reachVsFollowers: { p10: 0.1, p50: 0.3, p90: 0.8, p99: 2.5 },
      engagementRate: { p10: 0.01, p50: 0.03, p90: 0.08 },
      likeRate: { p10: 0.007, p50: 0.022, p90: 0.06 },
      commentRate: { p10: 0.0005, p50: 0.002, p90: 0.007 },
      saveRate: { p10: 0.001, p50: 0.004, p90: 0.015 },
    },
  },
  tiktok: {
    video: {
      // TikTok FYP: usa vistas absolutas, no ratio vs seguidores
      absoluteViews: { p10: 180, p50: 2500, p90: 30000, p99: 600000 },
      engagementRate: { p10: 0.018, p50: 0.063, p90: 0.185, p99: 0.38 },
      completionRate: { p10: 0.14, p50: 0.38, p90: 0.7 },
      likeRate: { p10: 0.01, p50: 0.038, p90: 0.115 },
      commentRate: { p10: 0.001, p50: 0.005, p90: 0.018 },
      shareRate: { p10: 0.002, p50: 0.009, p90: 0.032 }, // TT shares > IG
      followRate: { p10: 0.0008, p50: 0.004, p90: 0.016 },
      rewatchRate: { p10: 0.05, p50: 0.14, p90: 0.34 },
    },
    reel: {
      // alias
      absoluteViews: { p10: 180, p50: 2500, p90: 30000, p99: 600000 },
      engagementRate: { p10: 0.018, p50: 0.063, p90: 0.185, p99: 0.38 },
      completionRate: { p10: 0.14, p50: 0.38, p90: 0.7 },
      likeRate: { p10: 0.01, p50: 0.038, p90: 0.115 },
      commentRate: { p10: 0.001, p50: 0.005, p90: 0.018 },
      shareRate: { p10: 0.002, p50: 0.009, p90: 0.032 },
      followRate: { p10: 0.0008, p50: 0.004, p90: 0.016 },
    },
    photo: {
      absoluteViews: { p10: 80, p50: 700, p90: 7000, p99: 80000 },
      engagementRate: { p10: 0.012, p50: 0.038, p90: 0.095 },
      likeRate: { p10: 0.008, p50: 0.028, p90: 0.075 },
      saveRate: { p10: 0.002, p50: 0.007, p90: 0.025 },
    },
  },
};

/* ─────────────────────────────────────────────────────────────
   MODELOS DE COMPORTAMIENTO HUMANO
   Por tipo de contenido — qué impulsa cada métrica de engagement
   Basado en psicología de consumo de RRSS (research 2022-2025)
   ───────────────────────────────────────────────────────────── */
const CONTENT_BEHAVIOR_MODELS = {
  educational: {
    // "Aprendí algo" → guarda para referencia, comparte con quien lo necesita
    ig: { save: 1.9, share: 1.45, comment: 0.85, like: 1.05 },
    tt: { completion: 1.55, share: 1.65, follow: 1.9, comment: 0.75, rewatch: 1.3 },
    signals: [
      'tip',
      'truco',
      'aprend',
      'cómo',
      'tutorial',
      'paso a paso',
      'guía',
      'secreto',
      'método',
      'sistema',
      'fórmula',
      'curso',
      'enseña',
      'explica',
      'consejo',
      'hack',
      'hacks',
      'tips',
    ],
  },
  entertainment: {
    // "Me entretuvo" → like reflejo, comparte para hacer reír a otros
    ig: { save: 0.55, share: 1.7, comment: 1.25, like: 1.55 },
    tt: { completion: 1.25, share: 1.9, follow: 0.85, comment: 1.4, rewatch: 1.6 },
    signals: [
      'divertido',
      'jaja',
      'gracioso',
      'humor',
      'comedia',
      'reír',
      'challenge',
      'prank',
      'viral',
      'trend',
      'meme',
      'wtf',
      'increíble',
      'epic',
    ],
  },
  inspirational: {
    // "Me motivó / quiero ser eso" → guarda para releer, comparte para inspirar
    ig: { save: 2.1, share: 1.55, comment: 1.05, like: 1.35 },
    tt: { completion: 1.35, share: 1.5, follow: 1.5, comment: 0.9, rewatch: 1.1 },
    signals: [
      'motivac',
      'inspir',
      'logré',
      'transformación',
      'cambié',
      'conseguí',
      'sueño',
      'metas',
      'éxito',
      'historia',
      'superé',
      'alcancé',
      'emprendedor',
      'mindset',
    ],
  },
  controversial: {
    // "No estoy de acuerdo" o "Por fin alguien lo dice" → comentarios explota
    ig: { save: 0.7, share: 1.3, comment: 2.7, like: 0.9 },
    tt: { completion: 1.15, share: 1.4, follow: 0.75, comment: 3.0, rewatch: 0.95 },
    signals: [
      'opinión',
      'realidad',
      'verdad',
      'mentira',
      'debate',
      'controversial',
      'polemic',
      'unpopular',
      'discutible',
      'nadie habla',
      'se niegan',
    ],
  },
  relatable: {
    // "ESO SOY YO" → shares masivos + comentarios "yo también"
    ig: { save: 1.05, share: 2.1, comment: 1.55, like: 1.65 },
    tt: { completion: 1.2, share: 2.3, follow: 1.05, comment: 1.6, rewatch: 1.15 },
    signals: [
      'pov',
      'cuando',
      'me pasa',
      'igual que',
      'todos sabemos',
      'quien más',
      'el que',
      'la que',
      'señal de',
      'tipo cuando',
      'nosotros los que',
    ],
  },
  promotional: {
    // "Me quieren vender algo" → organic ER cae significativamente
    ig: { save: 0.55, share: 0.5, comment: 0.6, like: 0.65 },
    tt: { completion: 0.65, share: 0.55, follow: 0.6, comment: 0.65, rewatch: 0.55 },
    signals: [
      'compra',
      'precio',
      'oferta',
      'descuento',
      'venta',
      'producto',
      'servicio',
      'link en bio',
      'disponible',
      'solo hoy',
      'agotarse',
    ],
  },
};

/* ─────── Hook patterns con intent hint ─────── */
const HOOK_PATTERNS = [
  {
    regex: /^(nadie|nobody|nada).+(habla|dice|cuenta|enseña|sabe)/i,
    weight: 0.9,
    name: 'pattern-interrupt',
    intent: 'controversial',
  },
  {
    regex: /^\d+\s+(cosas|formas|maneras|hacks|tips|errores|secretos|razones|pasos|claves|signos|señales)/i,
    weight: 0.87,
    name: 'specific-list',
    intent: 'educational',
  },
  { regex: /^pov:/i, weight: 0.85, name: 'pov-format', intent: 'relatable' },
  { regex: /^(la verdad|the truth|te cuento algo)/i, weight: 0.83, name: 'truth-reveal', intent: 'controversial' },
  {
    regex: /^(antes\/después|de.+a.+en\s+\d|pasé de|cómo pasé)/i,
    weight: 0.84,
    name: 'transformation',
    intent: 'inspirational',
  },
  {
    regex: /^(estás haciendo|you're doing|el error|el mayor error).+(mal|wrong|que cometes)/i,
    weight: 0.88,
    name: 'mistake-warn',
    intent: 'educational',
  },
  {
    regex: /^(esto|this).+(te|will|va a).+(sorprend|shock|cambi|impresion)/i,
    weight: 0.8,
    name: 'shock-promise',
    intent: 'entertainment',
  },
  { regex: /^(deja de|stop|nunca más debes)/i, weight: 0.77, name: 'command-stop', intent: 'educational' },
  {
    regex: /^(me dijeron|they told me|todos dicen|la gente cree)/i,
    weight: 0.75,
    name: 'authority-flip',
    intent: 'controversial',
  },
  { regex: /^(en\s+\d+\s+(segundos|minutos|días))/i, weight: 0.83, name: 'time-promise', intent: 'educational' },
  {
    regex: /^(por qué|why|la razón por la que|cuál es)/i,
    weight: 0.73,
    name: 'question-curiosity',
    intent: 'educational',
  },
  { regex: /^(si (tenés|tienes|sos|eres|estás))/i, weight: 0.72, name: 'conditional-target', intent: 'relatable' },
  {
    regex: /^(cómo|how to|te explico|aprend(í|e)|el secreto para)/i,
    weight: 0.76,
    name: 'how-to',
    intent: 'educational',
  },
  { regex: /^(señal(es)? de|you know you)/i, weight: 0.74, name: 'recognition', intent: 'relatable' },
  { regex: /^(lo que (nadie|poca gente))/i, weight: 0.82, name: 'insider', intent: 'educational' },
];

const POWER_WORDS = [
  'gratis',
  'secreto',
  'nadie',
  'increíble',
  'shock',
  'verdad',
  'real',
  'comprobado',
  'ahora',
  'jamás',
  'siempre',
  'nunca',
  'mejor',
  'peor',
  'descubrí',
  'sabés',
  'mentira',
  'engaño',
  'truco',
  'método',
  'sistema',
  'fórmula',
  'fácil',
  'rápido',
  'exclusivo',
  'único',
  'antes',
  'después',
  'transformación',
  'brutal',
  'urgente',
  'peligroso',
  'prohibido',
  'censurado',
];

const EMOTION_WORDS = {
  joy: ['feliz', 'increíble', 'wow', '🎉', '🚀', '✨', 'amazing', 'genial', 'emocionante', 'amor', 'amo'],
  surprise: ['nunca', 'jamás', 'increíble', '😱', '🤯', 'shock', 'impossible', 'no vas a creer', 'wow', 'sorprendente'],
  anger: ['estafa', 'mentira', 'odio', 'basta', '😡', 'engaño', 'inaceptable', 'harto', 'indignante'],
  fear: ['cuidado', 'peligro', 'evitá', 'no hagas', '⚠️', 'urgente', 'antes de', 'error grave', 'advertencia'],
  curiosity: [
    'por qué',
    'cómo',
    'qué pasa',
    'secreto',
    '🤔',
    'descubrí',
    'te cuento',
    'lo que no saben',
    'desconocido',
  ],
  empathy: [
    'todos sentimos',
    'igual que vos',
    'me pasó',
    '💛',
    'entiendo',
    'no estás solo',
    'normal',
    'te pasa',
    'nosotros',
  ],
  nostalgia: ['antes', 'recuerdo', 'cuando era', 'años', 'volvería', 'extraño', 'infancia', 'retro'],
};

/* ─────── Scoring functions ─────── */

const scoreHook = (hook) => {
  if (!hook) return { score: 0.35, matchedPattern: null, wordCount: 0, powerWords: 0, intent: 'neutral' };
  const text = hook.trim();
  let score = 0.42;
  let matchedPattern = null;
  let intent = 'neutral';
  for (const p of HOOK_PATTERNS) {
    if (p.regex.test(text) && p.weight > score) {
      score = p.weight;
      matchedPattern = p.name;
      intent = p.intent;
    }
  }
  const wc = text.split(/\s+/).length;
  if (wc < 3) score -= 0.14;
  else if (wc > 20) score -= 0.1;
  else if (wc >= 5 && wc <= 13) score += 0.04;
  if (/\b\d+\b/.test(text)) score += 0.04;
  if (text.includes('?')) score += 0.03;
  const powerCount = POWER_WORDS.filter((w) => text.toLowerCase().includes(w)).length;
  score += Math.min(0.1, powerCount * 0.025);
  if (text.length > 130) score -= 0.06;
  return { score: Math.max(0.2, Math.min(1, score)), matchedPattern, wordCount: wc, powerWords: powerCount, intent };
};

const detectContentIntent = (text) => {
  if (!text) return 'neutral';
  const lower = text.toLowerCase();
  let topIntent = 'neutral';
  let topScore = 0;
  for (const [intent, model] of Object.entries(CONTENT_BEHAVIOR_MODELS)) {
    const matches = model.signals.filter((s) => lower.includes(s)).length;
    if (matches > topScore) {
      topScore = matches;
      topIntent = intent;
    }
  }
  return topIntent;
};

const scoreCaption = (caption, platform) => {
  if (!caption)
    return {
      score: 0.3,
      length: 0,
      hashtagCount: 0,
      emojiCount: 0,
      ctaPresent: false,
      questionPresent: false,
      lineBreaks: 0,
    };
  const text = caption.trim();
  const length = text.length;
  const hashtagCount = (text.match(/#\w+/g) || []).length;
  const emojiCount = (text.match(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{27BF}]/gu) || []).length;
  const ctaPresent =
    /(comenta(á)?|guardá|compartí|etiquetá|link|bio|dm|escribime|reservá|tap|click|guardalo|mandame|seguime|activa|notificac|guardar|compartir|comentar)/i.test(
      text,
    );
  const questionPresent = text.includes('?');
  const lineBreaks = (text.match(/\n/g) || []).length;

  let score = 0.48;
  const optLen = platform === 'tiktok' ? [40, 220] : [90, 500];
  if (length >= optLen[0] && length <= optLen[1]) score += 0.13;
  else if (length > optLen[1] && length < 1500) score += 0.06;
  else if (length > 2200) score -= 0.13;

  const optHashRange = platform === 'tiktok' ? [3, 10] : [8, 25];
  if (hashtagCount >= optHashRange[0] && hashtagCount <= optHashRange[1]) score += 0.1;
  else if (hashtagCount > 0 && hashtagCount < optHashRange[0]) score += 0.04;
  else if (hashtagCount > 30) score -= 0.09;

  if (emojiCount >= 1 && emojiCount <= 8) score += 0.05;
  if (ctaPresent) score += 0.14;
  if (questionPresent) score += 0.05;
  if (lineBreaks >= 2) score += 0.04;

  return {
    score: Math.max(0, Math.min(1, score)),
    length,
    hashtagCount,
    emojiCount,
    ctaPresent,
    questionPresent,
    lineBreaks,
  };
};

const scoreHashtags = (tags, platform) => {
  if (!Array.isArray(tags) || tags.length === 0) return { score: 0.2, count: 0, balance: 'none' };
  const count = tags.length;
  const optRange = platform === 'tiktok' ? [3, 10] : [8, 25];
  let score = 0.4;
  if (count >= optRange[0] && count <= optRange[1]) score += 0.3;
  else if (count >= Math.floor(optRange[0] / 2) && count < optRange[0]) score += 0.12;
  else if (count > optRange[1]) score -= 0.08;
  const lenAvg = tags.reduce((s, t) => s + (t.length - 1), 0) / count;
  const balance = lenAvg < 7 ? 'mega-heavy' : lenAvg > 18 ? 'niche-heavy' : 'balanced';
  if (balance === 'balanced') score += 0.2;
  else if (balance !== 'mega-heavy') score += 0.08;
  return { score: Math.max(0, Math.min(1, score)), count, balance };
};

const scoreEmotion = (text) => {
  if (!text) return { score: 0.3, dominant: 'neutral', intensity: 0, emotionMix: [] };
  const lower = text.toLowerCase();
  const emotionCounts = {};
  let dominant = 'neutral';
  let topCount = 0;
  for (const [emotion, words] of Object.entries(EMOTION_WORDS)) {
    const c = words.filter((w) => lower.includes(w)).length;
    emotionCounts[emotion] = c;
    if (c > topCount) {
      topCount = c;
      dominant = emotion;
    }
  }
  const totalEmotions = Object.values(emotionCounts).reduce((a, b) => a + b, 0);
  const intensity = Math.min(1, totalEmotions / 4);
  // Emotions that drive viral sharing: surprise, curiosity, empathy, joy > anger/fear
  const sharingBonus = ['surprise', 'curiosity', 'empathy', 'nostalgia'].includes(dominant)
    ? 0.12
    : ['joy'].includes(dominant)
      ? 0.08
      : ['anger', 'fear'].includes(dominant)
        ? 0.05
        : 0;
  const emotionMix = Object.entries(emotionCounts)
    .filter(([, c]) => c > 0)
    .map(([e]) => e);
  const score = 0.36 + intensity * 0.4 + (dominant !== 'neutral' ? 0.08 : 0) + sharingBonus;
  return { score: Math.max(0, Math.min(1, score)), dominant, intensity, emotionMix };
};

const scoreFormatFit = (format, platform) => {
  const fits = {
    instagram: { reels: 0.86, video: 0.84, carousel: 0.8, stories: 0.55, photo: 0.6, feed: 0.63 },
    tiktok: { video: 0.9, reel: 0.89, carousel: 0.72, photo: 0.66, live: 0.72 },
  };
  return (fits[platform] || fits.instagram)[format] || 0.6;
};

const scoreThumbnail = (thumb) => {
  if (!thumb) return { score: 0.5 };
  let score = 0.44;
  if (thumb.hasFace) score += 0.23; // rostros = highest tap-rate delta
  if (thumb.hasText) score += 0.14; // texto = hook visual antes de play
  if (thumb.highContrast) score += 0.1;
  if (thumb.brightColors) score += 0.06;
  if (thumb.hasArrow) score += 0.04;
  return { score: Math.max(0, Math.min(1, score)) };
};

const scoreTiming = (postingTime, platform) => {
  if (!postingTime) return { score: 0.62 };
  const date = new Date(postingTime);
  const day = date.getDay();
  const hour = date.getHours();
  let score = 0.5;
  if (platform === 'instagram') {
    // IG picos: Mar-Vie 11-14h y 19-22h
    if ([2, 3, 4, 5].includes(day)) score += 0.08;
    if (hour >= 11 && hour <= 13) score += 0.14;
    else if (hour >= 19 && hour <= 21) score += 0.13;
    else if (hour >= 7 && hour <= 9) score += 0.06;
    else if (hour < 6 || hour > 23) score -= 0.1;
  } else {
    // TikTok: más flexible, picos 18-23h, bien cualquier día
    if (hour >= 18 && hour <= 23) score += 0.15;
    else if (hour >= 12 && hour <= 15) score += 0.1;
    else if (hour < 7) score -= 0.08;
    if ([3, 4, 5, 6].includes(day)) score += 0.05;
  }
  return { score: Math.max(0, Math.min(1, score)), day, hour };
};

/* ─────── Behavior multipliers ─────── */
const getBehaviorMultipliers = (contentIntent, platform) => {
  const model = CONTENT_BEHAVIOR_MODELS[contentIntent];
  const defaults = { save: 1.0, share: 1.0, comment: 1.0, like: 1.0, completion: 1.0, follow: 1.0, rewatch: 1.0 };
  if (!model) return defaults;
  const plat = platform === 'tiktok' ? model.tt : model.ig;
  return { ...defaults, ...(plat || {}) };
};

/* ─────── Percentile interpolation helper ─────── */
const interpPercentile = (bench, scoreNorm) => {
  // scoreNorm 0→1 maps through p10→p50→p90→p99
  if (scoreNorm <= 0) return bench.p10;
  if (scoreNorm >= 1) return bench.p99 || bench.p90;
  if (scoreNorm < 0.45) return bench.p10 + (bench.p50 - bench.p10) * (scoreNorm / 0.45);
  if (scoreNorm < 0.75) return bench.p50 + (bench.p90 - bench.p50) * ((scoreNorm - 0.45) / 0.3);
  return bench.p90 + ((bench.p99 || bench.p90 * 1.5) - bench.p90) * ((scoreNorm - 0.75) / 0.25);
};

/* ─────── Main predict ─────── */
export const predictVirality = (content) => {
  const {
    hook = '',
    caption = '',
    hashtags = [],
    format = 'reels',
    platform = 'instagram',
    thumbnail = null,
    postingTime = null,
    audienceSize = 1000,
    audienceEngaged = 0.1,
    contentIntent: givenIntent = null,
  } = content || {};

  const isIG = platform === 'instagram';
  const isTT = platform === 'tiktok';

  const hookScored = scoreHook(hook);
  const captionScored = scoreCaption(caption, platform);
  const hashtagsScored = scoreHashtags(hashtags, platform);
  const emotionScored = scoreEmotion(hook + ' ' + caption);
  const formatFit = scoreFormatFit(format, platform);
  const thumbScored = scoreThumbnail(thumbnail);
  const timingScored = scoreTiming(postingTime, platform);
  const contentIntent = givenIntent || detectContentIntent(hook + ' ' + caption);
  const behavMult = getBehaviorMultipliers(contentIntent, platform);

  // ─── Platform-specific viral score weights ───
  // IG: hook + formato + emoción + caption + hashtags + thumbnail
  // TT: hook + emoción + formato dominan; thumbnail irrelevante, hashtags menos críticos
  const viralScoreRaw = isIG
    ? hookScored.score * 0.27 +
      formatFit * 0.18 +
      emotionScored.score * 0.15 +
      captionScored.score * 0.14 +
      hashtagsScored.score * 0.12 +
      thumbScored.score * 0.1 +
      timingScored.score * 0.04
    : hookScored.score * 0.34 +
      emotionScored.score * 0.2 +
      formatFit * 0.2 +
      captionScored.score * 0.12 +
      timingScored.score * 0.08 +
      hashtagsScored.score * 0.05 +
      thumbScored.score * 0.01;

  const viralScore = Math.min(99, viralScoreRaw * 100);
  const scoreNorm = viralScoreRaw;

  // ─── Benchmark lookup ───
  const fmtKey = format === 'video' ? (isTT ? 'video' : 'reels') : format;
  const bench = REACH_BENCHMARKS[platform]?.[fmtKey] || REACH_BENCHMARKS.instagram.reels;

  // ─── Reach prediction ───
  let predictedReach;
  if (isTT) {
    const avB = bench.absoluteViews || { p10: 180, p50: 2500, p90: 30000, p99: 600000 };
    predictedReach = Math.max(150, Math.round(interpPercentile(avB, scoreNorm)));
  } else {
    const rvfB = bench.reachVsFollowers || { p10: 0.25, p50: 0.9, p90: 4.0, p99: 18.0 };
    const reachMult = interpPercentile(rvfB, scoreNorm);
    predictedReach = Math.max(30, Math.round(audienceSize * reachMult));
  }

  // ─── Engagement rate prediction ───
  const erB = bench.engagementRate || { p10: 0.015, p50: 0.045, p90: 0.12 };
  const predictedER = interpPercentile(erB, scoreNorm);

  // ─── Completion rate ───
  let predictedCompletion = null;
  if (format === 'reels' || format === 'video' || isTT) {
    const compB = bench.completionRate || { p10: 0.18, p50: 0.42, p90: 0.7 };
    const baseComp = interpPercentile(compB, scoreNorm);
    predictedCompletion = Math.min(0.94, baseComp * (behavMult.completion || 1.0));
  }

  // ─── Per-metric predictions with behavior model ───
  let likes, comments, shares, saves, follows, profileVisits, rewatchRate;

  if (isIG) {
    const likeB = bench.likeRate || { p10: 0.005, p50: 0.017, p90: 0.048 };
    const commentB = bench.commentRate || { p10: 0.0006, p50: 0.0022, p90: 0.0075 };
    const shareB = bench.shareRate || { p10: 0.0004, p50: 0.0018, p90: 0.006 };
    const saveB = bench.saveRate || { p10: 0.0015, p50: 0.005, p90: 0.018 };

    const likeRate = Math.min(0.22, interpPercentile(likeB, scoreNorm) * (behavMult.like || 1));
    const commentRate = Math.min(
      0.06,
      interpPercentile(commentB, scoreNorm) * (behavMult.comment || 1) * (captionScored.questionPresent ? 1.35 : 1),
    );
    const shareRate = Math.min(0.04, interpPercentile(shareB, scoreNorm) * (behavMult.share || 1));
    const saveRate = Math.min(0.09, interpPercentile(saveB, scoreNorm) * (behavMult.save || 1));

    likes = Math.round(predictedReach * likeRate);
    comments = Math.round(predictedReach * commentRate);
    shares = Math.round(predictedReach * shareRate);
    saves = Math.round(predictedReach * saveRate);
    profileVisits = Math.round(predictedReach * 0.04 * scoreNorm);
    follows = Math.round(profileVisits * 0.08 * scoreNorm);
    rewatchRate = null;
  } else {
    const likeB = bench.likeRate || { p10: 0.01, p50: 0.038, p90: 0.115 };
    const commentB = bench.commentRate || { p10: 0.001, p50: 0.005, p90: 0.018 };
    const shareB = bench.shareRate || { p10: 0.002, p50: 0.009, p90: 0.032 };
    const followB = bench.followRate || { p10: 0.0008, p50: 0.004, p90: 0.016 };
    const rwB = bench.rewatchRate || { p10: 0.05, p50: 0.14, p90: 0.34 };

    const likeRate = Math.min(0.38, interpPercentile(likeB, scoreNorm) * (behavMult.like || 1));
    const commentRate = Math.min(0.07, interpPercentile(commentB, scoreNorm) * (behavMult.comment || 1));
    const shareRate = Math.min(0.12, interpPercentile(shareB, scoreNorm) * (behavMult.share || 1));
    const followRate = Math.min(0.06, interpPercentile(followB, scoreNorm) * (behavMult.follow || 1));

    likes = Math.round(predictedReach * likeRate);
    comments = Math.round(predictedReach * commentRate);
    shares = Math.round(predictedReach * shareRate);
    saves = null; // TikTok no expone saves públicamente
    follows = Math.round(predictedReach * followRate);
    profileVisits = Math.round(predictedReach * 0.05 * scoreNorm);
    rewatchRate = Math.min(0.48, interpPercentile(rwB, scoreNorm) * (behavMult.rewatch || 1));
  }

  // ─── Viral classification ───
  let virality;
  if (viralScore >= 85) virality = 'breakout-potential';
  else if (viralScore >= 70) virality = 'high-potential';
  else if (viralScore >= 55) virality = 'solid';
  else if (viralScore >= 40) virality = 'mediocre';
  else virality = 'low';

  // ─── Confidence score (honesty: sin datos históricos, incertidumbre alta) ───
  let confidence = 0.4;
  if (hookScored.matchedPattern) confidence += 0.08;
  if (captionScored.ctaPresent) confidence += 0.06;
  if (contentIntent !== 'neutral') confidence += 0.07;
  if (hashtagsScored.balance === 'balanced') confidence += 0.05;
  if (thumbnail?.hasFace) confidence += 0.04;
  if (emotionScored.dominant !== 'neutral') confidence += 0.05;
  confidence = Math.min(0.8, confidence); // cap 80% — sin datos reales no podemos ir más

  // ─── Risk flags ───
  const flags = [];
  if (hookScored.score < 0.55) flags.push('Hook débil — primer segundo no retiene');
  if (captionScored.length > 2200 && isIG) flags.push('Caption supera límite IG (2200 chars)');
  if (hashtagsScored.count > 30 && isIG) flags.push('Demasiados hashtags (>30) — riesgo shadowban');
  if (isTT && predictedCompletion !== null && predictedCompletion < 0.35)
    flags.push(`Completion predicho ${(predictedCompletion * 100).toFixed(0)}% — FYP no amplifica bajo 40%`);
  if (contentIntent === 'promotional') flags.push('Contenido promocional directo — ER orgánico 40-60% menor');

  // ─── Prioritized improvements with impact ───
  const improvements = [];

  if (hookScored.score < 0.55) {
    improvements.push({
      priority: 'CRÍTICA',
      metric: isIG ? 'reach+saves' : 'completion+reach',
      action: 'Reescribir hook: "Nadie habla de..." / "[N] tips de..." / "POV: [situación]"',
      impact: '+12-22 viral score pts',
    });
  }
  if (hookScored.wordCount > 18) {
    improvements.push({
      priority: 'alta',
      metric: 'hook-retention',
      action: `Hook demasiado largo (${hookScored.wordCount} palabras) — cortar a 6-12 para mayor punch`,
      impact: '+5-9 pts',
    });
  }
  if (!captionScored.ctaPresent) {
    improvements.push({
      priority: 'alta',
      metric: isIG ? 'comments+saves' : 'comments+follows',
      action:
        'Agregar CTA directo: "Guardalo para después" / "Comentá: ¿te pasó esto?" / "Mandalo a quien lo necesite"',
      impact: '+15-35% engagement',
    });
  }
  if (captionScored.length < 60 && isIG) {
    improvements.push({
      priority: 'media',
      metric: 'algorithm+saves',
      action: 'Caption muy corta para IG — expandir a 100-400 chars con contexto y keywords del nicho',
      impact: '+10-18% ER',
    });
  }
  if (!captionScored.questionPresent && isIG) {
    improvements.push({
      priority: 'baja',
      metric: 'comments',
      action: 'Agregar pregunta en caption — aumenta comentarios 20-40%',
      impact: '+20-40% comments',
    });
  }
  if (hashtagsScored.count < 5 && isIG) {
    improvements.push({
      priority: 'media',
      metric: 'discovery',
      action: `Solo ${hashtagsScored.count} hashtags — usar 12-20 mix: 3 mega (>1M posts), 8 macro (100K-1M), 5 niche (<100K)`,
      impact: '+15-35% reach extra',
    });
  }
  if (hashtagsScored.count < 3 && isTT) {
    improvements.push({
      priority: 'media',
      metric: 'fyp-categorization',
      action: 'Agregar 4-7 hashtags de nicho para que TikTok categorice el contenido correctamente',
      impact: '+10-20% FYP reach',
    });
  }
  if (hashtagsScored.count > 30 && isIG) {
    improvements.push({
      priority: 'alta',
      metric: 'reach',
      action: 'Reducir hashtags a máximo 20-25 — más no es mejor, puede penalizar',
      impact: 'Prevenir shadowban',
    });
  }
  if (emotionScored.dominant === 'neutral') {
    improvements.push({
      priority: 'media',
      metric: 'shares+engagement',
      action:
        'Contenido emocionalmente neutro — insertar trigger: curiosidad ("nunca te dije esto"), sorpresa, empatía ("¿te pasa?"), o nostalgia',
      impact: '+8-18% shares',
    });
  }
  if (thumbnail && !thumbnail.hasFace && (format === 'reels' || format === 'video')) {
    improvements.push({
      priority: 'media',
      metric: 'tap-rate',
      action: 'Cover sin rostro humano — rostros aumentan tap-through rate ~20-28%',
      impact: '+10-28% initial views',
    });
  }
  if (isTT && predictedCompletion !== null && predictedCompletion < 0.4) {
    improvements.push({
      priority: 'CRÍTICA',
      metric: 'fyp-amplification',
      action:
        'Completion bajo → FYP no va a amplificar. Opciones: (a) cortar video a <30s, (b) añadir loop trap al final, (c) más acción en primeros 3 segundos',
      impact: '+20-45% completion → FYP push',
    });
  }
  if (contentIntent === 'promotional') {
    improvements.push({
      priority: 'alta',
      metric: 'all-metrics',
      action:
        'Envolver venta en valor: tutorial / historia de transformación primero → venta solo al final (regla 80/20 contenido/pitch)',
      impact: '+30-60% ER vs promo directa',
    });
  }
  if (isIG && contentIntent === 'educational' && format === 'reels') {
    improvements.push({
      priority: 'baja',
      metric: 'saves',
      action: 'Contenido educativo: carrusel IG genera 35-50% más saves que reels del mismo tema',
      impact: '+35% saves',
    });
  }
  if (isTT && !hookScored.matchedPattern) {
    improvements.push({
      priority: 'alta',
      metric: 'completion+fyp',
      action:
        'Primeros 3 segundos sin patrón reconocible de hook — TikTok dropa el video. Agregar acción visual O texto que genere curiosidad inmediata',
      impact: '+15-25% retention',
    });
  }

  const optimizationGap =
    improvements.filter((i) => i.priority === 'CRÍTICA').length * 14 +
    improvements.filter((i) => i.priority === 'alta').length * 7 +
    improvements.filter((i) => i.priority === 'media').length * 3 +
    improvements.filter((i) => i.priority === 'baja').length * 1;
  const ceilingScore = Math.min(97, viralScore + optimizationGap);

  return {
    viralScore: Math.round(viralScore),
    virality,
    ceilingScore: Math.round(ceilingScore),
    optimizationGap,
    confidence,
    contentIntent,
    predicted: {
      reach: predictedReach,
      engagementRate: Number(predictedER.toFixed(4)),
      completion: predictedCompletion !== null ? Number(predictedCompletion.toFixed(3)) : null,
      likes,
      comments,
      shares,
      saves,
      follows,
      profileVisits,
      rewatchRate: rewatchRate != null ? Number(rewatchRate.toFixed(3)) : null,
    },
    breakdown: {
      hook: { score: Math.round(hookScored.score * 100), ...hookScored, weight: isIG ? 27 : 34 },
      format: { score: Math.round(formatFit * 100), weight: isIG ? 18 : 20 },
      emotion: { score: Math.round(emotionScored.score * 100), ...emotionScored, weight: isIG ? 15 : 20 },
      caption: { score: Math.round(captionScored.score * 100), ...captionScored, weight: isIG ? 14 : 12 },
      hashtags: { score: Math.round(hashtagsScored.score * 100), ...hashtagsScored, weight: isIG ? 12 : 5 },
      thumbnail: { score: Math.round(thumbScored.score * 100), weight: isIG ? 10 : 1 },
      timing: { score: Math.round(timingScored.score * 100), weight: isIG ? 4 : 8 },
    },
    flags,
    improvements, // [{priority, metric, action, impact}]
    benchmarks: {
      medianReach: isTT
        ? REACH_BENCHMARKS.tiktok.video?.absoluteViews?.p50 || 2500
        : Math.round(audienceSize * (REACH_BENCHMARKS.instagram[fmtKey]?.reachVsFollowers?.p50 || 0.9)),
      viralReach: isTT
        ? REACH_BENCHMARKS.tiktok.video?.absoluteViews?.p99 || 600000
        : Math.round(audienceSize * (REACH_BENCHMARKS.instagram[fmtKey]?.reachVsFollowers?.p99 || 18)),
      yourReachVsMedian: isTT
        ? Number((predictedReach / (REACH_BENCHMARKS.tiktok.video?.absoluteViews?.p50 || 2500)).toFixed(2))
        : Number(
            (
              predictedReach /
              Math.max(1, audienceSize * (REACH_BENCHMARKS.instagram[fmtKey]?.reachVsFollowers?.p50 || 0.9))
            ).toFixed(2),
          ),
    },
    timestamp: new Date().toISOString(),
  };
};

/**
 * Extract virality improvements into LLM-friendly generation guidance.
 * Called PRE-generation to inject optimization hints into content prompts.
 */
export const getPromptInjections = (viralityAnalysis) => {
  const { improvements, viralScore, ceilingScore, contentIntent } = viralityAnalysis || {};

  if (!improvements || improvements.length === 0) {
    return [];
  }

  const priorityEmoji = { CRÍTICA: '⚡', alta: '📌', media: '→', baja: '•' };

  const injections = improvements.map((imp) => {
    const emoji = priorityEmoji[imp.priority] || '•';
    return `[${emoji}] ${imp.metric}: ${imp.action} (Impact: ${imp.impact})`;
  });

  // Add summary context as first line
  injections.unshift(`=== VIRALITY GUIDANCE (Score: ${viralScore}/99, Potential ceiling: ${ceilingScore}/99) ===`);
  injections.push(`Content strategy: Lean into ${contentIntent || 'mixed'} for max retention and shares.`);

  return injections;
};

export const handleViralPredictor = async (req, res, path, m, body) => {
  if (path === '/api/predict/virality' && m === 'POST') {
    const prediction = predictVirality(body || {});
    res.statusCode = 200;
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify(prediction));
    return true;
  }
  return false;
};
