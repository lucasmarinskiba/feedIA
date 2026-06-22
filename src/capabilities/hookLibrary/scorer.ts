/**
 * Hook Scorer
 * ─────────────────────────────────────────────────────────────────────────
 * Deterministic, fast (non-LLM) scoring of a hook against the curated
 * pattern library. Used to grade user-written hooks pre-publication and to
 * pick the highest-potential hook from a generated batch.
 *
 * The score combines:
 *   • baselineScore of the closest matching pattern
 *   • lexical signals known to correlate with retention (numbers, specifics,
 *     verbs of motion, controversial markers, length window)
 *   • penalty signals (clichés, hedging, vague phrasing)
 *
 * Output is 0–100. ≥75 = strong, 60–74 = decent, <60 = needs work.
 */

import { HOOK_PATTERNS, type HookPattern, type HookFormat, type PsychTrigger } from './patterns.js';

export interface HookScoreBreakdown {
  total: number;
  band: 'excelente' | 'fuerte' | 'aceptable' | 'debil';
  matchedPattern: HookPattern | null;
  signals: {
    lengthOk: boolean;
    hasNumber: boolean;
    hasSpecific: boolean;
    hasControversy: boolean;
    hasMotionVerb: boolean;
    hasYouAddress: boolean;
    hasCuriosityGap: boolean;
  };
  penalties: string[];
  recommendations: string[];
}

/** Common Spanish-language clichés that drag a hook down. */
const CLICHE_PHRASES = [
  'sin duda',
  'al fin y al cabo',
  'hoy en día',
  'el día de hoy',
  'la verdad es que',
  'literalmente',
  'simplemente',
  'algo único',
  'algo increíble',
  'es lo mejor',
  'cambia tu vida',
];

const HEDGING_WORDS = ['quizás', 'tal vez', 'a veces', 'puede que', 'probablemente', 'creo que'];

const MOTION_VERBS = [
  'pasé',
  'pasó',
  'rompí',
  'rompe',
  'cerré',
  'cierra',
  'levanté',
  'levantó',
  'perdí',
  'perdió',
  'gané',
  'ganó',
  'descubrí',
  'descubrió',
  'aprendí',
  'aprendió',
  'cambié',
  'cambió',
  'quemé',
  'quemó',
  'tiré',
  'tiró',
  'logré',
  'logró',
  'multipliqué',
  'multiplicó',
];

const CONTROVERSY_MARKERS = [
  'opinión impopular',
  'todos están',
  'dejá de',
  'deja de',
  'estás mal',
  'parate',
  'esto te va a doler',
  'la mayoría se equivoca',
  'nadie te dice',
  'nadie cuenta',
];

const CURIOSITY_GAP_MARKERS = [
  'lo que no',
  'lo que nadie',
  'el secreto',
  'detrás de',
  'la verdad sobre',
  'lo que realmente',
  'esto cambia',
  'la #',
  'el #',
];

const SPECIFIC_MARKERS = [
  /\b(usd|us\$|\$|€)\s?\d/i,
  /\b\d{1,3}(\.\d{3})*\b/, // formatted numbers
  /\b\d+\s?(días|horas|meses|años|semanas|min|minutos)\b/i,
  /\b\d+%\b/,
];

const lower = (s: string): string => s.toLowerCase();

const containsAny = (haystack: string, needles: string[]): boolean => {
  const h = lower(haystack);
  return needles.some((n) => h.includes(lower(n)));
};

const containsAnyRegex = (haystack: string, patterns: RegExp[]): boolean => patterns.some((p) => p.test(haystack));

/**
 * Find the best-matching curated pattern via token overlap with the
 * pattern skeleton. Returns null if no decent match exists.
 */
const matchPattern = (hook: string, format?: HookFormat): HookPattern | null => {
  const hookLower = lower(hook);
  const universe = format ? HOOK_PATTERNS.filter((p) => p.bestFormats.includes(format)) : HOOK_PATTERNS;
  let best: { pattern: HookPattern; score: number } | null = null;
  for (const pattern of universe) {
    // Replace placeholders so we don't match against {x} literally.
    const skel = lower(pattern.skeleton.replace(/\{[^}]+\}/g, ' '));
    const tokens = skel.split(/[\s,.;:!?¿¡()]+/).filter((t) => t.length >= 4);
    if (tokens.length === 0) continue;
    const overlap = tokens.filter((t) => hookLower.includes(t)).length;
    const ratio = overlap / tokens.length;
    if (ratio < 0.25) continue;
    if (!best || ratio > best.score) best = { pattern, score: ratio };
  }
  return best?.pattern ?? null;
};

export const scoreHook = (
  hook: string,
  opts: { format?: HookFormat; targetTrigger?: PsychTrigger } = {},
): HookScoreBreakdown => {
  const len = hook.trim().length;
  const signals = {
    // Sweet spot for IG hooks: 30–110 chars.
    lengthOk: len >= 30 && len <= 110,
    hasNumber: /\d/.test(hook),
    hasSpecific: containsAnyRegex(hook, SPECIFIC_MARKERS),
    hasControversy: containsAny(hook, CONTROVERSY_MARKERS),
    hasMotionVerb: containsAny(hook, MOTION_VERBS),
    hasYouAddress: /\b(vos|tu|tú|tus|te|ti|vos)\b/i.test(hook),
    hasCuriosityGap: containsAny(hook, CURIOSITY_GAP_MARKERS),
  };

  const matched = matchPattern(hook, opts.format);

  const penalties: string[] = [];
  if (!signals.lengthOk) {
    penalties.push(
      len < 30 ? 'Demasiado corto para sostener una promesa concreta' : 'Demasiado largo para 3s de retención',
    );
  }
  if (containsAny(hook, CLICHE_PHRASES)) penalties.push('Contiene cliché que diluye el impacto');
  if (containsAny(hook, HEDGING_WORDS)) penalties.push('Tiene hedging que debilita la afirmación');
  if (!signals.hasSpecific && !signals.hasNumber && !signals.hasControversy && !signals.hasCuriosityGap) {
    penalties.push('No tiene ningún ancla concreta (número, controversia o curiosity gap)');
  }
  if (opts.targetTrigger && matched) {
    const matchTriggers: PsychTrigger[] = [matched.primaryTrigger, ...matched.secondaryTriggers];
    if (!matchTriggers.includes(opts.targetTrigger)) {
      penalties.push(`El patrón detectado no activa "${opts.targetTrigger}"`);
    }
  }

  // ── Base score ─────────────────────────────────────────────────────
  let score = matched ? matched.baselineScore : 55;

  // ── Positive signal boosts ─────────────────────────────────────────
  if (signals.lengthOk) score += 3;
  if (signals.hasNumber) score += 4;
  if (signals.hasSpecific) score += 6;
  if (signals.hasControversy) score += 5;
  if (signals.hasMotionVerb) score += 3;
  if (signals.hasYouAddress) score += 2;
  if (signals.hasCuriosityGap) score += 4;

  // ── Penalty deductions ─────────────────────────────────────────────
  score -= penalties.length * 5;

  // Clamp 0–100.
  score = Math.max(0, Math.min(100, Math.round(score)));

  const band: HookScoreBreakdown['band'] =
    score >= 85 ? 'excelente' : score >= 75 ? 'fuerte' : score >= 60 ? 'aceptable' : 'debil';

  const recommendations: string[] = [];
  if (!signals.hasNumber && !signals.hasSpecific) {
    recommendations.push('Agregá un número o dato específico para darle ancla.');
  }
  if (!signals.lengthOk && len < 30) {
    recommendations.push('Extendé hasta 60–80 caracteres con una promesa concreta.');
  }
  if (!signals.lengthOk && len > 110) {
    recommendations.push('Recortá: cada palabra extra después del segundo 2 pierde retención.');
  }
  if (!signals.hasYouAddress && band !== 'excelente') {
    recommendations.push('Interpelá al lector directamente con "vos/tu" para crear identificación.');
  }
  if (containsAny(hook, CLICHE_PHRASES)) {
    recommendations.push('Reescribí sin clichés — buscá una formulación más viva y concreta.');
  }

  return {
    total: score,
    band,
    matchedPattern: matched,
    signals,
    penalties,
    recommendations,
  };
};

/** Rank an array of hooks from best to worst. Pure deterministic. */
export const rankHooks = (
  hooks: string[],
  opts: { format?: HookFormat; targetTrigger?: PsychTrigger } = {},
): Array<{ hook: string; score: HookScoreBreakdown }> =>
  hooks.map((h) => ({ hook: h, score: scoreHook(h, opts) })).sort((a, b) => b.score.total - a.score.total);
