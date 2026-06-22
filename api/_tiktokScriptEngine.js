/**
 * TikTok Script Engine — análisis beat-a-beat + generación de guiones con estructura validada.
 *
 * Estructura canónica (15-60s, escalable):
 *   - hook   0–2s         · pattern interrupt + promesa + curiosity gap
 *   - setup  2–5s         · problema/contexto, sin perder energía
 *   - payoff 5–(N-3)s     · entrega de valor en beats de 2–4s cada uno
 *   - loop   últimos 3s   · cierre que reconecta con hook (rewatch)
 *
 * Reusa:
 *   - HOOK_FORMULAS + PLATFORM_ALGO_SIGNALS de _strategist (vía import indirecto: se referencian las claves)
 *   - predictVirality de _viralPredictor para score numérico del hook
 *   - routeLlm de _aiRouter para refinar texto en planes paid (opt-in)
 *
 * Owner bypass y rate-limit ocurren upstream en api/[...path].js.
 */

import { predictVirality } from './_viralPredictor.js';
import { askLLMJson } from './_llm.js';
import * as store from './_store.js';

const PATTERN_INTERRUPT_TOKENS = [
  'pero',
  'sin embargo',
  'mirá',
  'esperá',
  'cuidado',
  'atención',
  'no',
  'nadie',
  'jamás',
  'nunca',
  'siempre',
  'real',
  'verdad',
  'secreto',
  'error',
  'fácil',
  'rápido',
  'gratis',
  'ahora',
];

const VISUAL_INTERRUPT_HINTS = ['zoom', 'corte', 'cambio plano', 'whip pan', 'jump cut', 'flash', 'tilt'];

const wordCount = (s) =>
  String(s || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;

const hasPatternInterrupt = (text) => {
  const lower = String(text || '').toLowerCase();
  return PATTERN_INTERRUPT_TOKENS.some((tok) => lower.includes(tok));
};

/**
 * Segmenta texto en beats por puntuación + longitud target.
 * @param {string} text
 * @param {number} durationSec
 */
const segmentBeats = (text, durationSec) => {
  const clean = String(text || '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!clean) return [];
  // Split por punto/exclam/interr/saltos y comas largas
  const raw = clean
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (raw.length === 0) return [];

  // Distribución temporal proporcional al wordCount (asume ~2.5 palabras/segundo en TikTok)
  const totalWords = raw.reduce((s, r) => s + wordCount(r), 0) || 1;
  let cursor = 0;
  return raw.map((seg, idx) => {
    const portion = wordCount(seg) / totalWords;
    const dur = Math.max(1.2, portion * durationSec);
    const tStart = Math.round(cursor * 10) / 10;
    const tEnd = Math.round((cursor + dur) * 10) / 10;
    cursor += dur;
    return { index: idx, tStart, tEnd, text: seg };
  });
};

const roleForBeat = (beat, totalBeats, durationSec) => {
  if (beat.tStart < 2) return 'hook';
  if (beat.tStart < 5) return 'setup';
  if (beat.tEnd >= durationSec - 3) return 'loop';
  return 'payoff';
};

const retentionRiskOf = (beat) => {
  const len = beat.tEnd - beat.tStart;
  if (len > 4 && !hasPatternInterrupt(beat.text)) return 'high';
  if (len > 3 && !hasPatternInterrupt(beat.text)) return 'medium';
  return 'low';
};

const fixForBeat = (beat, role) => {
  const risk = retentionRiskOf(beat);
  if (risk === 'low') return null;
  if (role === 'hook') return 'Cortar a 1.8s máx + agregar pattern-interrupt visual (zoom o jump cut)';
  if (role === 'setup') return 'Reducir relleno · meter problema directo en ≤3s';
  if (role === 'payoff') return 'Cortar beat en 2 micro-beats · agregar texto en pantalla con punchline';
  if (role === 'loop') return 'Cerrar reconectando con la pregunta del hook · loop circular';
  return 'Cortar relleno';
};

/**
 * Analiza un guion TikTok existente.
 * @param {{ text: string, durationSec?: number, platform?: 'tiktok'|'instagram' }} params
 */
export const analyzeScript = ({ text, durationSec = 30, platform = 'tiktok' } = {}) => {
  const dur = Math.max(8, Math.min(180, Number(durationSec) || 30));
  const segments = segmentBeats(text, dur);
  const beats = segments.map((seg) => {
    const role = roleForBeat(seg, segments.length, dur);
    return {
      ...seg,
      role,
      retentionRisk: retentionRiskOf(seg),
      fix: fixForBeat(seg, role),
    };
  });

  const hookBeat = beats.find((b) => b.role === 'hook') || beats[0] || null;
  const loopBeat = beats.find((b) => b.role === 'loop') || beats[beats.length - 1] || null;

  const hookScore = hookBeat
    ? predictVirality({ hook: hookBeat.text, platform, format: platform === 'tiktok' ? 'video' : 'reels' }).viralScore
    : 0;

  const totalBeats = beats.length || 1;
  const riskyBeats = beats.filter((b) => b.retentionRisk !== 'low').length;
  const retentionCurve = Math.max(0, Math.round((1 - riskyBeats / totalBeats) * 100));
  const loopability =
    hookBeat && loopBeat
      ? loopBeat.text.toLowerCase().includes(hookBeat.text.toLowerCase().slice(0, 8))
        ? 90
        : 55
      : 40;

  return {
    durationSec: dur,
    platform,
    structure: {
      hook: hookBeat,
      setup: beats.find((b) => b.role === 'setup') || null,
      payoff: beats.filter((b) => b.role === 'payoff'),
      loop: loopBeat,
    },
    beats,
    scores: {
      hookStrength: Math.round(hookScore),
      retentionCurve,
      loopability,
      overall: Math.round(hookScore * 0.45 + retentionCurve * 0.35 + loopability * 0.2),
    },
    fixes: beats.filter((b) => b.fix).map((b) => ({ at: b.tStart, role: b.role, fix: b.fix })),
  };
};

const HOOK_TEMPLATES_BY_FORMULA = {
  'pattern-break': (topic) => `Nadie está hablando de esto en ${topic}.`,
  'curiosity-gap': (topic) => `Si todos dicen X de ${topic}, ¿por qué los datos muestran lo opuesto?`,
  'specific-number': (topic) => `${Math.floor(Math.random() * 4) + 3} cosas que cambiaron mi ${topic} en 7 días.`,
  'mistake-warn': (topic) => `Estás haciendo ${topic} mal. Esto es lo correcto:`,
  reveal: (topic) => `Te muestro lo que NADIE te dijo de ${topic}.`,
  'counter-intuitive': (topic) => `Lo opuesto a lo que te enseñaron sobre ${topic} funciona mejor.`,
  'before-after': (topic) => `De cero a resultado real en ${topic}. Mi sistema:`,
  controversy: (topic) => `Casi todos están haciendo ${topic} mal. Y te explico por qué tengo razón.`,
};

const buildHook = (topic, formulaId) => {
  const fn = HOOK_TEMPLATES_BY_FORMULA[formulaId] || HOOK_TEMPLATES_BY_FORMULA['pattern-break'];
  return fn(topic);
};

const beatBlueprint = (durationSec) => {
  const payoffEnd = Math.max(8, durationSec - 3);
  return [
    { role: 'hook', tStart: 0, tEnd: 2 },
    { role: 'setup', tStart: 2, tEnd: 5 },
    { role: 'payoff', tStart: 5, tEnd: 5 + (payoffEnd - 5) / 3 },
    { role: 'payoff', tStart: 5 + (payoffEnd - 5) / 3, tEnd: 5 + (2 * (payoffEnd - 5)) / 3 },
    { role: 'payoff', tStart: 5 + (2 * (payoffEnd - 5)) / 3, tEnd: payoffEnd },
    { role: 'loop', tStart: payoffEnd, tEnd: durationSec },
  ];
};

const heuristicScript = ({ topic, niche, durationSec, hookFormula }) => {
  const blueprint = beatBlueprint(durationSec);
  const hookText = buildHook(topic, hookFormula);
  const beats = blueprint.map((b) => {
    if (b.role === 'hook') return { ...b, text: hookText };
    if (b.role === 'setup')
      return { ...b, text: `El problema real con ${topic} es que todos repiten lo mismo en ${niche || 'tu nicho'}.` };
    if (b.role === 'loop') return { ...b, text: `Por eso ${topic} es lo que nadie te dijo. Mirá de nuevo.` };
    return { ...b, text: `Paso clave en ${topic}: aplicá esto hoy mismo.` };
  });
  return {
    beats,
    broll: beats.map((b, i) => ({
      beatIndex: i,
      hint:
        b.role === 'hook'
          ? 'Plano cerrado a cámara + zoom 0.5s'
          : b.role === 'setup'
            ? 'Cutaway al objeto/problema'
            : b.role === 'loop'
              ? 'Volver al frame del hook (loop circular)'
              : 'B-roll temático + jump cut',
    })),
    onScreenText: beats.map((b) => b.text.slice(0, 28)),
    cta: 'Guardalo y volvé · seguí para parte 2',
  };
};

/**
 * Genera un guion TikTok con estructura validada. LLM opcional para refinar texto.
 * @param {{topic:string, niche?:string, durationSec?:number, hookFormula?:string, audience?:string, llm?:boolean, user?:object}} params
 */
export const generateScript = async ({
  topic = 'tu tema',
  niche = '',
  durationSec = 30,
  hookFormula = 'pattern-break',
  audience = 'millennial',
  llm = false,
  user = null,
} = {}) => {
  const dur = Math.max(10, Math.min(60, Number(durationSec) || 30));
  const heur = heuristicScript({ topic, niche, durationSec: dur, hookFormula });

  let refined = null;
  if (llm) {
    const prompt = `Refiná este guion TikTok manteniendo estructura beat-a-beat. Topic: "${topic}". Nicho: "${niche}". Audiencia: ${audience}. Hook formula: ${hookFormula}. Duración total: ${dur}s.\n\nBeats:\n${heur.beats.map((b, i) => `${i + 1}. [${b.tStart}-${b.tEnd}s · ${b.role}] ${b.text}`).join('\n')}\n\nDevolvé JSON: {"beats":[{"role","tStart","tEnd","text"}],"cta":string}. Texto natural, <= ${dur * 2.5} palabras total. Sin emojis innecesarios.`;
    try {
      const out = await askLLMJson(prompt, { user, maxTokens: 900, temperature: 0.6 });
      if (out && Array.isArray(out.beats) && out.beats.length >= 4) refined = out;
    } catch {
      /* fallback heurístico */
    }
  }

  const beats = (refined?.beats || heur.beats).map((b, i) => ({
    index: i,
    tStart: Number(b.tStart) || 0,
    tEnd: Number(b.tEnd) || 0,
    role: b.role || 'payoff',
    text: String(b.text || ''),
  }));

  const fullText = beats.map((b) => b.text).join(' ');
  const analysis = analyzeScript({ text: fullText, durationSec: dur, platform: 'tiktok' });

  return {
    topic,
    niche,
    durationSec: dur,
    hookFormula,
    audience,
    beats,
    broll: heur.broll,
    onScreenText: heur.onScreenText,
    cta: refined?.cta || heur.cta,
    analysis,
    generatedBy: refined ? 'llm+heuristic' : 'heuristic',
  };
};

/**
 * @param {{role:string, text:string, tStart:number, tEnd:number}[]} beats
 */
export const validateBeatStructure = (beats) => {
  const warnings = [];
  if (!Array.isArray(beats) || beats.length < 4) {
    warnings.push('Mínimo 4 beats: hook + setup + payoff + loop');
    return { ok: false, warnings };
  }
  if (beats[0]?.role !== 'hook') warnings.push('Primer beat debe ser hook');
  if (beats[beats.length - 1]?.role !== 'loop') warnings.push('Último beat debe ser loop');
  if (beats[0]?.tEnd > 2.2) warnings.push('Hook se extiende >2.2s — se pierde stop-rate');
  return { ok: warnings.length === 0, warnings };
};

const json = (res, code, body) => {
  res.statusCode = code;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.setHeader('cache-control', 'no-store');
  res.end(JSON.stringify(body));
};

/**
 * Router para /api/tiktok/script/*. Owner/auth gating ya pasó upstream.
 */
export const handleTiktokScript = async (req, res, path, m, body, ctx = {}) => {
  const user = ctx.user || null;
  const userId = user?.id || null;

  if (path === '/api/tiktok/script/analyze' && m === 'POST') {
    const { text, durationSec, platform } = body || {};
    if (!text) {
      json(res, 400, { error: 'text requerido' });
      return true;
    }
    const result = analyzeScript({ text, durationSec, platform });
    if (userId) {
      try {
        await store.setUser(userId, 'tt:script:last', { at: Date.now(), result });
        await store.lpushUser(userId, 'tt:script:history', {
          at: Date.now(),
          durationSec: result.durationSec,
          scores: result.scores,
        });
        await store.ltrim(store.userKey(userId, 'tt:script:history'), 0, 49);
      } catch {
        /* RLS best-effort */
      }
    }
    json(res, 200, result);
    return true;
  }

  if (path === '/api/tiktok/script/generate' && m === 'POST') {
    const params = body || {};
    const result = await generateScript({ ...params, user });
    if (userId) {
      try {
        await store.setUser(userId, 'tt:script:last', { at: Date.now(), result });
        await store.lpushUser(userId, 'tt:script:history', {
          at: Date.now(),
          topic: result.topic,
          niche: result.niche,
          scores: result.analysis.scores,
        });
        await store.ltrim(store.userKey(userId, 'tt:script:history'), 0, 49);
      } catch {
        /* RLS best-effort */
      }
    }
    json(res, 200, result);
    return true;
  }

  if (path === '/api/tiktok/script/history' && m === 'GET' && userId) {
    const items = await store.lrangeUser(userId, 'tt:script:history', 0, 49);
    json(res, 200, { items });
    return true;
  }

  return false;
};
