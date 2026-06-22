/**
 * Visual Director — recomendaciones visuales determinísticas para TikTok/IG.
 *
 * Output: B-roll por beat, transiciones cada 2-4s, paleta por mood, encuadre, iluminación.
 * 100% heurístico (sin LLM por defecto). LLM opcional para queries B-roll hiperespecíficas.
 *
 * Reusa: beats provistos por _tiktokScriptEngine.analyzeScript() o body directo.
 */

import { askLLMJson } from './_llm.js';

export const MOOD_PALETTES = {
  warm: {
    palette: ['#FF6B35', '#FFD166', '#06AED5', '#1A1A2E'],
    lighting: 'cálida 3200K · key luz alta',
    contrast: 'medio-alto',
    vibe: 'energía + familia',
  },
  dramatic: {
    palette: ['#0B1426', '#E63946', '#F1FAEE', '#A8DADC'],
    lighting: 'baja-clave · contraluces duros',
    contrast: 'alto',
    vibe: 'tensión + revelación',
  },
  clean: {
    palette: ['#FFFFFF', '#F0F0F0', '#000000', '#0096FF'],
    lighting: 'difusa alta · sin sombras duras',
    contrast: 'medio',
    vibe: 'tutorial + profesional',
  },
  playful: {
    palette: ['#FF6B9D', '#FFC75F', '#00C2A8', '#845EC2'],
    lighting: 'rebote + ring + colores RGB',
    contrast: 'medio',
    vibe: 'gen-z + humor',
  },
  luxe: {
    palette: ['#0A0A0A', '#C9A227', '#5C0029', '#E5E5E5'],
    lighting: 'spot lateral + bloom',
    contrast: 'alto',
    vibe: 'aspiracional + lujo',
  },
  'dark-academia': {
    palette: ['#3A2618', '#7B6B43', '#D4A373', '#1A120B'],
    lighting: 'natural lateral · sombras suaves',
    contrast: 'medio-alto',
    vibe: 'pensativo + clásico',
  },
  energetic: {
    palette: ['#FF006E', '#FB5607', '#FFBE0B', '#3A86FF'],
    lighting: 'mixta · LEDs RGB · estrobos cortos',
    contrast: 'alto',
    vibe: 'fitness + viral',
  },
  minimal: {
    palette: ['#FAFAFA', '#212121', '#BDBDBD', '#FF5722'],
    lighting: 'softbox frontal · plano',
    contrast: 'bajo',
    vibe: 'minimal + design',
  },
  retro: {
    palette: ['#F4A261', '#E76F51', '#2A9D8F', '#264653'],
    lighting: 'tungsteno cálido · grano',
    contrast: 'medio',
    vibe: 'nostálgico + 90s',
  },
  cinematic: {
    palette: ['#1A1A1A', '#D4AF37', '#8B0000', '#F5F5DC'],
    lighting: 'motivada · 2 puntos · niebla',
    contrast: 'alto',
    vibe: 'narrativo + película',
  },
};

export const BROLL_LIBRARY = {
  finanzas: [
    'gráficos animados',
    'manos contando billetes',
    'pantalla con números rojos/verdes',
    'tarjeta de crédito en mano',
    'teclado en macro',
  ],
  fitness: [
    'contracción muscular en close-up',
    'pesas cayendo en cámara lenta',
    'sudor en piel',
    'antes/después split-screen',
    'tracking en pasillo gimnasio',
  ],
  food: [
    'cuchillo cortando en macro',
    'aceite cayendo en sartén',
    'humo de comida caliente',
    'plato girando 360°',
    'mordida ASMR',
  ],
  tech: [
    'pantallas múltiples',
    'macro de teclado mecánico',
    'unboxing slow-mo',
    'comparación lado a lado',
    'cursor click',
  ],
  beauty: [
    'skin macro reveal',
    'producto cayendo en agua',
    'glow up time-lapse',
    'aplicación slow-mo',
    'before/after rotation',
  ],
  marketing: [
    'analytics dashboard zoom',
    'whiteboard con flecha',
    'manos escribiendo plan',
    'iconos sociales animados',
    'split de pantalla',
  ],
  business: [
    'handshake',
    'oficina con tracking',
    'libro abierto en escritorio',
    'gráfica de crecimiento',
    'café + laptop',
  ],
  lifestyle: [
    'ventana con luz natural',
    'POV caminando',
    'plantas en interior',
    'flat-lay morning routine',
    'reflexión en espejo',
  ],
  educacion: [
    'libros apilados',
    'pluma escribiendo',
    'pizarra con esquema',
    'manos con highlighter',
    'biblioteca tracking',
  ],
  '*': ['close-up a cámara', 'cutaway al sujeto', 'manos en acción', 'b-roll de contexto', 'establishing shot'],
};

const FRAMING_BY_FORMAT = {
  video: { aspect: '9:16', safeAreaTopPx: 220, safeAreaBottomPx: 350, captionBoxY: 'upper-third' },
  reels: { aspect: '9:16', safeAreaTopPx: 220, safeAreaBottomPx: 350, captionBoxY: 'upper-third' },
  carousel: { aspect: '4:5', safeAreaTopPx: 80, safeAreaBottomPx: 120, captionBoxY: 'center' },
  stories: { aspect: '9:16', safeAreaTopPx: 250, safeAreaBottomPx: 250, captionBoxY: 'center' },
};

const TRANSITION_TYPES = [
  'jump cut',
  'whip pan',
  'zoom in',
  'zoom out',
  'match cut',
  'cross fade',
  'flash white',
  'tilt drop',
];

const pickBrollForBeat = (beat, niche) => {
  const lib = BROLL_LIBRARY[niche] || BROLL_LIBRARY['*'];
  const role = beat?.role || 'payoff';
  const idx = (Number(beat?.index || 0) + role.length) % lib.length;
  return {
    type: role === 'hook' ? 'close-up + interrupt' : role === 'loop' ? 'volver a frame del hook' : 'cutaway temático',
    query: lib[idx],
    durationSec: Math.max(1.2, Math.min(3.5, (Number(beat?.tEnd || 3) - Number(beat?.tStart || 0)) / 1.4)),
  };
};

const planTransitions = (beats) => {
  const transitions = [];
  let lastAt = 0;
  for (let i = 0; i < beats.length - 1; i++) {
    const beat = beats[i];
    const next = beats[i + 1];
    const at = Number(next?.tStart || 0);
    if (at - lastAt < 1.8) continue;
    const type = TRANSITION_TYPES[i % TRANSITION_TYPES.length];
    transitions.push({
      at,
      type,
      reason: beat?.role === 'hook' ? 'pattern interrupt → setup' : 'mantener atención (cada 2-4s)',
    });
    lastAt = at;
  }
  return transitions;
};

const detectMoodFromNiche = (niche) => {
  const n = String(niche || '').toLowerCase();
  if (/fitness|sport|gym/.test(n)) return 'energetic';
  if (/luxe|luxury|aspirational|lujo/.test(n)) return 'luxe';
  if (/finanzas|business|negocios/.test(n)) return 'dramatic';
  if (/food|cocina/.test(n)) return 'warm';
  if (/tech|crypto|saas/.test(n)) return 'cinematic';
  if (/beauty|moda|estilo/.test(n)) return 'minimal';
  if (/educ|curso|escuela/.test(n)) return 'dark-academia';
  if (/gen-z|humor|memes/.test(n)) return 'playful';
  return 'cinematic';
};

/**
 * Recomienda visuales para un guion (beats) o script crudo.
 */
export const recommendVisuals = async ({
  beats = null,
  script = null,
  niche = '',
  mood = null,
  format = 'video',
  platform = 'tiktok',
  llm = false,
  user = null,
} = {}) => {
  const moodKey = mood || detectMoodFromNiche(niche);
  const palette = MOOD_PALETTES[moodKey] || MOOD_PALETTES.cinematic;
  const framing = FRAMING_BY_FORMAT[format] || FRAMING_BY_FORMAT.video;

  // Si no hay beats, sintetizar 5 beats genéricos del script
  let workingBeats = Array.isArray(beats) ? beats : null;
  if (!workingBeats && script) {
    const len = String(script).length;
    workingBeats = [
      { index: 0, role: 'hook', tStart: 0, tEnd: 2 },
      { index: 1, role: 'setup', tStart: 2, tEnd: 5 },
      { index: 2, role: 'payoff', tStart: 5, tEnd: 10 },
      { index: 3, role: 'payoff', tStart: 10, tEnd: 18 },
      { index: 4, role: 'loop', tStart: 18, tEnd: 22 },
    ];
  }
  workingBeats = workingBeats || [];

  const broll = workingBeats.map((b, i) => ({ beatIndex: i, ...pickBrollForBeat(b, niche.toLowerCase()) }));
  const transitions = planTransitions(workingBeats);

  let llmBroll = null;
  if (llm && workingBeats.length) {
    const prompt = `Generá ${workingBeats.length} queries B-roll hiperespecíficas para TikTok/IG sobre nicho "${niche}", mood "${moodKey}". Beats: ${workingBeats.map((b, i) => `${i + 1}.[${b.role}] ${b.text || ''}`).join(' | ')}. Devolvé JSON: {"queries":["...", ...]}. 4-8 palabras cada query, visuales concretos.`;
    try {
      const out = await askLLMJson(prompt, { user, maxTokens: 400, temperature: 0.6 });
      if (out?.queries?.length) llmBroll = out.queries;
    } catch {
      /* heurístico ya está */
    }
  }

  const enrichedBroll = llmBroll ? broll.map((b, i) => ({ ...b, query: llmBroll[i] || b.query })) : broll;

  return {
    mood: moodKey,
    palette: palette.palette,
    lighting: palette.lighting,
    contrast: palette.contrast,
    vibe: palette.vibe,
    framing,
    broll: enrichedBroll,
    transitions,
    lensTips:
      format === 'video' || format === 'reels'
        ? [
            '28-35mm equivalente · profundidad media',
            'evitar wide en interiores cerrados',
            'estabilizar pero permitir handshake en hook',
          ]
        : ['50mm para retrato', 'macro para detalle del producto', 'fondos limpios para carrusel'],
    framingTips: [
      `Aspect ${framing.aspect} · safe area top ${framing.safeAreaTopPx}px (UI TikTok)`,
      'Sujeto siempre regla de tercios — nunca centrado salvo close-up',
      'On-screen text en upper-third para no chocar con UI',
    ],
    generatedBy: llmBroll ? 'llm+heuristic' : 'heuristic',
  };
};

const json = (res, code, body) => {
  res.statusCode = code;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.setHeader('cache-control', 'no-store');
  res.end(JSON.stringify(body));
};

/**
 * Router para /api/tiktok/visuals/*.
 */
export const handleVisualDirector = async (req, res, path, m, body, ctx = {}) => {
  const user = ctx.user || null;

  if (path === '/api/tiktok/visuals/recommend' && m === 'POST') {
    const params = body || {};
    const result = await recommendVisuals({ ...params, user });
    json(res, 200, result);
    return true;
  }

  if (path === '/api/tiktok/visuals/palettes' && m === 'GET') {
    json(res, 200, { moods: Object.keys(MOOD_PALETTES), palettes: MOOD_PALETTES });
    return true;
  }

  return false;
};
