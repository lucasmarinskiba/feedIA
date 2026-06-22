/**
 * Hook Lab — laboratorio de hooks triple-capa (verbal + visual + on-screen text).
 *
 * Extiende las 12 fórmulas planas de _strategist.HOOK_FORMULAS a 30+ con capas sincronizadas.
 *
 * Reusa:
 *   - predictVirality (_viralPredictor) para score numérico
 *   - routeLlm (_aiRouter) para variantes refinadas en planes paid
 *
 * Scoring rules (heurístico, owner-bypass upstream):
 *   - verbal ≤7 palabras → +12
 *   - on-screen text ≤4 palabras → +8
 *   - visual con pattern-interrupt → +10
 *   - viralScore base → 0..70
 */

import { predictVirality } from './_viralPredictor.js';
import { askLLMJson } from './_llm.js';
import * as store from './_store.js';

export const HOOK_FORMULAS_EXTENDED = [
  // — Curiosity & Reveal —
  {
    id: 'pattern-break',
    verbal: 'Nadie te dijo esto de {topic}.',
    visual: 'Plano cerrado + zoom 0.5s',
    onScreenText: 'NADIE DICE ESTO',
    strength: 0.84,
    fit: ['video', 'reels'],
    niches: ['*'],
  },
  {
    id: 'curiosity-gap',
    verbal: 'Lo que pasa con {topic} es raro.',
    visual: 'Texto on-screen + freeze',
    onScreenText: '¿VOS SABÍAS?',
    strength: 0.78,
    fit: ['video', 'carousel'],
    niches: ['*'],
  },
  {
    id: 'reveal-secret',
    verbal: 'Te muestro el secreto de {topic}.',
    visual: 'Walk to camera + tilt down',
    onScreenText: 'EL SECRETO',
    strength: 0.8,
    fit: ['video', 'reels'],
    niches: ['*'],
  },
  {
    id: 'forbidden-knowledge',
    verbal: 'Esto no quieren que sepas de {topic}.',
    visual: 'Mirada cómplice + cut a evidencia',
    onScreenText: 'NO QUIEREN',
    strength: 0.83,
    fit: ['video'],
    niches: ['finanzas', 'negocios', 'tech'],
  },

  // — Mistake & Warning —
  {
    id: 'mistake-warn',
    verbal: 'Estás haciendo {topic} mal.',
    visual: 'Negación con manos + texto rojo',
    onScreenText: 'PARÁ AHORA',
    strength: 0.81,
    fit: ['video', 'reels'],
    niches: ['*'],
  },
  {
    id: 'common-error',
    verbal: 'El error #1 al hacer {topic}.',
    visual: 'Demostración del error + buzzer',
    onScreenText: 'ERROR #1',
    strength: 0.79,
    fit: ['video', 'carousel'],
    niches: ['*'],
  },
  {
    id: 'red-flag',
    verbal: 'Red flag en {topic}: esto.',
    visual: 'Bandera roja gráfica + cut',
    onScreenText: '🚩 RED FLAG',
    strength: 0.77,
    fit: ['video', 'reels'],
    niches: ['relaciones', 'negocios'],
  },

  // — Numbers & Lists —
  {
    id: 'specific-number',
    verbal: '{N} cosas que cambian tu {topic}.',
    visual: 'Conteo numérico animado',
    onScreenText: '{N} COSAS',
    strength: 0.85,
    fit: ['video', 'carousel', 'reels'],
    niches: ['*'],
  },
  {
    id: 'time-bound',
    verbal: 'En {timeframe} aprendí {topic}.',
    visual: 'Reloj + cut a resultado',
    onScreenText: 'EN {timeframe}',
    strength: 0.79,
    fit: ['video', 'reels'],
    niches: ['*'],
  },
  {
    id: 'ranking',
    verbal: 'Top {N} de {topic} ordenados por {criterio}.',
    visual: 'Tabla animada',
    onScreenText: 'TOP {N}',
    strength: 0.76,
    fit: ['carousel', 'video'],
    niches: ['*'],
  },

  // — Aspiration & Transformation —
  {
    id: 'before-after',
    verbal: 'De {before} a {after} en {timeframe}.',
    visual: 'Split screen antes/después',
    onScreenText: 'ANTES / DESPUÉS',
    strength: 0.82,
    fit: ['reels', 'carousel'],
    niches: ['fitness', 'lifestyle', 'beauty'],
  },
  {
    id: 'aspiration',
    verbal: 'Cómo {achievement} sin {commonExcuse}.',
    visual: 'Cinemática + slow-mo',
    onScreenText: 'SIN {excuse}',
    strength: 0.76,
    fit: ['carousel', 'reels'],
    niches: ['*'],
  },
  {
    id: 'transformation',
    verbal: 'Mi {topic} cambió cuando hice esto.',
    visual: 'Slide cinematográfica de cambio',
    onScreenText: 'EL CAMBIO',
    strength: 0.78,
    fit: ['reels', 'video'],
    niches: ['*'],
  },

  // — Counter-Intuitive & Controversy —
  {
    id: 'counter-intuitive',
    verbal: 'Lo opuesto a lo que te enseñaron de {topic}.',
    visual: 'Flip horizontal + corte',
    onScreenText: 'LO OPUESTO',
    strength: 0.83,
    fit: ['carousel', 'video'],
    niches: ['*'],
  },
  {
    id: 'controversy',
    verbal: 'Casi todos están equivocados con {topic}.',
    visual: 'Mirada firme + close-up',
    onScreenText: 'ESTÁN MAL',
    strength: 0.86,
    fit: ['video', 'carousel'],
    niches: ['*'],
  },
  {
    id: 'unpopular-opinion',
    verbal: 'Opinión impopular sobre {topic}.',
    visual: 'Texto on-screen + zoom',
    onScreenText: 'IMPOPULAR',
    strength: 0.8,
    fit: ['video'],
    niches: ['*'],
  },

  // — Social Proof —
  {
    id: 'social-proof',
    verbal: '{N} personas hicieron esto con {topic}.',
    visual: 'Compilation de testimonios',
    onScreenText: '{N} PERSONAS',
    strength: 0.77,
    fit: ['video', 'carousel'],
    niches: ['*'],
  },
  {
    id: 'authority',
    verbal: 'Después de {N} años en {topic}, esto aprendí.',
    visual: 'Sentado a cámara + libro',
    onScreenText: '{N} AÑOS',
    strength: 0.74,
    fit: ['video', 'reels'],
    niches: ['*'],
  },
  {
    id: 'creator-stack',
    verbal: 'Mi stack para {topic}: estas {N} herramientas.',
    visual: 'Pantalla compartida + zoom',
    onScreenText: 'MI STACK',
    strength: 0.75,
    fit: ['video', 'carousel'],
    niches: ['tech', 'creator', 'business'],
  },

  // — Story & POV —
  {
    id: 'pov-narrative',
    verbal: 'POV: trabajás en {topic} y descubrís esto.',
    visual: 'Cámara en mano subjetiva',
    onScreenText: 'POV',
    strength: 0.81,
    fit: ['video', 'reels'],
    niches: ['*'],
  },
  {
    id: 'day-in-life',
    verbal: 'Un día haciendo {topic} de verdad.',
    visual: 'Tracking shot + cuts rápidos',
    onScreenText: '24H',
    strength: 0.74,
    fit: ['reels', 'video'],
    niches: ['lifestyle', 'fitness'],
  },
  {
    id: 'origin-story',
    verbal: 'Cómo empecé en {topic} sin nada.',
    visual: 'Foto vieja + cut al presente',
    onScreenText: 'MI HISTORIA',
    strength: 0.72,
    fit: ['reels', 'carousel'],
    niches: ['*'],
  },

  // — Question Hook —
  {
    id: 'ask-question',
    verbal: '¿Por qué {phenomenon}?',
    visual: 'Mirada a cámara + freeze',
    onScreenText: '¿POR QUÉ?',
    strength: 0.73,
    fit: ['carousel', 'video'],
    niches: ['*'],
  },
  {
    id: 'rhetorical-trap',
    verbal: '¿Sabías que {topic} hace esto?',
    visual: 'Punto en pantalla + cut a demo',
    onScreenText: '¿SABÍAS?',
    strength: 0.74,
    fit: ['video', 'carousel'],
    niches: ['*'],
  },

  // — Stakes & Urgency —
  {
    id: 'time-pressure',
    verbal: 'Tenés {timeframe} para entender {topic}.',
    visual: 'Reloj + countdown',
    onScreenText: '{timeframe}',
    strength: 0.78,
    fit: ['reels', 'video'],
    niches: ['*'],
  },
  {
    id: 'consequence',
    verbal: 'Si no hacés esto en {topic}, perdés {cost}.',
    visual: 'Imagen del costo + drop',
    onScreenText: 'O PERDÉS',
    strength: 0.79,
    fit: ['video', 'carousel'],
    niches: ['finanzas', 'negocios'],
  },

  // — Demonstration —
  {
    id: 'live-demo',
    verbal: 'Mirá lo que pasa cuando {action} en {topic}.',
    visual: 'Demo cruda en cámara',
    onScreenText: 'MIRÁ ESTO',
    strength: 0.8,
    fit: ['video', 'reels'],
    niches: ['tech', 'food', 'fitness'],
  },
  {
    id: 'experiment',
    verbal: 'Probé {topic} por {timeframe}. Resultado:',
    visual: 'Calendario tachado + resultado',
    onScreenText: 'EXPERIMENTO',
    strength: 0.81,
    fit: ['video', 'reels'],
    niches: ['*'],
  },

  // — Emotion-driven —
  {
    id: 'shame-relief',
    verbal: 'Si te avergüenza {topic}, mirá esto.',
    visual: 'Cara contemplativa + cambio',
    onScreenText: 'NO ESTÁS SOLO',
    strength: 0.76,
    fit: ['reels', 'carousel'],
    niches: ['lifestyle', 'salud'],
  },
  {
    id: 'frustration',
    verbal: '¿Cansado de {pain} en {topic}? Probá esto.',
    visual: 'Cara de frustración + cambio',
    onScreenText: 'BASTA',
    strength: 0.78,
    fit: ['video', 'reels'],
    niches: ['*'],
  },
];

const fillTemplate = (tpl, vars) => {
  let out = String(tpl || '');
  for (const k of Object.keys(vars)) out = out.split(`{${k}}`).join(String(vars[k] ?? ''));
  return out;
};

const wordCount = (s) =>
  String(s || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;

const VISUAL_INTERRUPT_REGEX = /(zoom|corte|cut|jump|whip|tilt|freeze|flash|split|negación)/i;

/**
 * Scoring de hook 0..100.
 */
export const scoreHook = ({
  verbal = '',
  visual = '',
  onScreenText = '',
  platform = 'tiktok',
  format = 'video',
} = {}) => {
  const baseViral = predictVirality({ hook: verbal, platform, format }).viralScore || 0; // 0..99
  const base = Math.min(70, baseViral * 0.7);

  let bonus = 0;
  const breakdown = {};

  const verbalWc = wordCount(verbal);
  if (verbalWc > 0 && verbalWc <= 7) {
    bonus += 12;
    breakdown.shortVerbal = 12;
  } else if (verbalWc <= 10) {
    bonus += 6;
    breakdown.mediumVerbal = 6;
  }

  const oscWc = wordCount(onScreenText);
  if (oscWc > 0 && oscWc <= 4) {
    bonus += 8;
    breakdown.tightOnScreen = 8;
  }

  if (VISUAL_INTERRUPT_REGEX.test(visual)) {
    bonus += 10;
    breakdown.patternInterrupt = 10;
  }

  return {
    score: Math.min(100, Math.round(base + bonus)),
    base: Math.round(base),
    bonus,
    breakdown,
    verbalWords: verbalWc,
    onScreenWords: oscWc,
  };
};

const pickFormulasForNiche = (niche) => {
  if (!niche) return HOOK_FORMULAS_EXTENDED;
  const n = String(niche).toLowerCase();
  return HOOK_FORMULAS_EXTENDED.filter((f) => f.niches.includes('*') || f.niches.some((nn) => n.includes(nn)));
};

const variantsFromFormulas = (formulas, { topic, count, platform, format }) => {
  return formulas
    .slice(0, count * 2)
    .map((f) => {
      const N = String(Math.floor(Math.random() * 4) + 3);
      const vars = {
        topic,
        N,
        timeframe: '7 días',
        before: 'cero',
        after: 'resultado',
        achievement: topic,
        commonExcuse: 'tiempo',
        action: topic,
        phenomenon: topic,
        pain: 'errores comunes',
        cost: 'tiempo y plata',
        excuse: 'gym',
        criterio: 'mejor opción',
      };
      const verbal = fillTemplate(f.verbal, vars);
      const visual = f.visual;
      const onScreenText = fillTemplate(f.onScreenText, vars);
      const sc = scoreHook({ verbal, visual, onScreenText, platform, format });
      return {
        id: f.id,
        formula: f.id,
        verbal,
        visual,
        onScreenText,
        score: sc.score,
        breakdown: sc.breakdown,
        rationale: `${f.id} · ${sc.verbalWords}p verbal · base ${sc.base} + bonus ${sc.bonus}`,
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, count);
};

/**
 * Genera un set de variantes de hooks con triple capa.
 */
export const generateHookSet = async ({
  topic = 'tu tema',
  niche = '',
  audience = 'millennial',
  platform = 'tiktok',
  format = 'video',
  count = 6,
  llm = false,
  user = null,
} = {}) => {
  const filtered = pickFormulasForNiche(niche);
  const heuristic = variantsFromFormulas(filtered, { topic, count, platform, format });

  let llmVariants = [];
  if (llm && heuristic.length) {
    const prompt = `Generá ${count} hooks triple-capa para TikTok/IG sobre "${topic}" en nicho "${niche || 'general'}", audiencia ${audience}.
Cada hook: { "verbal": "<7 palabras", "visual": "1 acción cinematográfica", "onScreenText": "<4 palabras MAYÚSCULAS" }.
Devolvé JSON: {"hooks":[{verbal,visual,onScreenText}, ...]}.`;
    try {
      const out = await askLLMJson(prompt, { user, maxTokens: 700, temperature: 0.7 });
      if (out?.hooks?.length) {
        llmVariants = out.hooks.map((h, i) => {
          const sc = scoreHook({ verbal: h.verbal, visual: h.visual, onScreenText: h.onScreenText, platform, format });
          return {
            id: `llm-${i}`,
            formula: 'llm-refined',
            verbal: h.verbal,
            visual: h.visual,
            onScreenText: h.onScreenText,
            score: sc.score,
            breakdown: sc.breakdown,
            rationale: 'LLM-refined',
          };
        });
      }
    } catch {
      /* heurístico ya está */
    }
  }

  const all = [...llmVariants, ...heuristic].sort((a, b) => b.score - a.score).slice(0, count);
  return {
    topic,
    niche,
    audience,
    platform,
    format,
    variants: all,
    best: all[0] || null,
    count: all.length,
    generatedBy: llmVariants.length ? 'llm+heuristic' : 'heuristic',
  };
};

const json = (res, code, body) => {
  res.statusCode = code;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.setHeader('cache-control', 'no-store');
  res.end(JSON.stringify(body));
};

const dateKey = () => new Date().toISOString().slice(0, 10);

/**
 * Router para /api/hooks/*.
 */
export const handleHookLab = async (req, res, path, m, body, ctx = {}) => {
  const user = ctx.user || null;
  const userId = user?.id || null;

  if (path === '/api/hooks/generate' && m === 'POST') {
    const params = body || {};
    const result = await generateHookSet({ ...params, user });
    if (userId) {
      try {
        const k = `hooks:lab:${dateKey()}`;
        await store.lpushUser(userId, k, { at: Date.now(), topic: result.topic, count: result.variants.length });
        await store.ltrim(store.userKey(userId, k), 0, 19);
      } catch {
        /* RLS best-effort */
      }
    }
    json(res, 200, result);
    return true;
  }

  if (path === '/api/hooks/score' && m === 'POST') {
    const { verbal, visual, onScreenText, platform, format } = body || {};
    if (!verbal) {
      json(res, 400, { error: 'verbal requerido' });
      return true;
    }
    json(res, 200, scoreHook({ verbal, visual, onScreenText, platform, format }));
    return true;
  }

  if (path === '/api/hooks/library' && m === 'GET') {
    res.setHeader('cache-control', 'public, s-maxage=3600, stale-while-revalidate=86400');
    res.statusCode = 200;
    res.setHeader('content-type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ count: HOOK_FORMULAS_EXTENDED.length, formulas: HOOK_FORMULAS_EXTENDED }));
    return true;
  }

  return false;
};
