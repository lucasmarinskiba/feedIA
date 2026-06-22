/**
 * Hook Matcher & LLM Adapter
 * ─────────────────────────────────────────────────────────────────────────
 * Given an idea + brand context, recommends the 3 patterns from the library
 * most likely to perform, then asks Claude to instantiate each skeleton with
 * brand-aware copy. The output is graded by the scorer so callers can pick
 * the strongest variant deterministically.
 */

import { askJson } from '../../agent/claude.js';
import { brandContext } from '../../agent/memory.js';
import type { BrandProfile } from '../../config/types.js';
import { HOOK_PATTERNS, type HookPattern, type HookFormat, type HookCategory, type PsychTrigger } from './patterns.js';
import { scoreHook, type HookScoreBreakdown } from './scorer.js';

export interface MatchedPattern {
  pattern: HookPattern;
  reason: string;
}

export interface InstantiatedHook {
  patternId: string;
  patternName: string;
  text: string;
  score: HookScoreBreakdown;
}

export interface HookMatchResult {
  idea: string;
  shortlistedPatterns: MatchedPattern[];
  hooks: InstantiatedHook[];
  bestHookId: string;
}

/* ──────────────────────────────────────────────────────────────────────── */

/**
 * Score the relevance of each library pattern to an idea by a simple
 * deterministic rule: bonus for matching format, bonus for matching goal
 * keywords, bonus for hooks targeted at the brand's primary goal.
 */
const shortlistPatterns = (
  idea: string,
  brand: BrandProfile,
  format?: HookFormat,
  preferredCategories?: HookCategory[],
): MatchedPattern[] => {
  const ideaLower = idea.toLowerCase();
  const goal = brand.goals.primary;

  // Mapping goal → categories that tend to serve it best.
  const goalAffinity: Record<typeof goal, HookCategory[]> = {
    awareness: ['controversial', 'callout', 'entretenimiento'],
    engagement: ['pregunta-abierta', 'entretenimiento', 'controversial'],
    leads: ['educativo', 'transformacion', 'callout'],
    ventas: ['transformacion', 'revelacion', 'comparacion'],
    autoridad: ['educativo', 'storytelling', 'revelacion'],
  };
  const affinityCats = goalAffinity[goal] ?? [];

  const scored = HOOK_PATTERNS.map((pattern) => {
    let s = pattern.baselineScore;
    if (format && pattern.bestFormats.includes(format)) s += 8;
    if (affinityCats.includes(pattern.category)) s += 5;
    if (preferredCategories?.includes(pattern.category)) s += 10;
    // Bonus if idea text mentions concepts the pattern is built for.
    const keywords = pattern.example
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length >= 6);
    const overlap = keywords.filter((k) => ideaLower.includes(k)).length;
    s += overlap * 2;
    return { pattern, s };
  });

  scored.sort((a, b) => b.s - a.s);

  return scored.slice(0, 3).map(({ pattern }) => ({
    pattern,
    reason: [
      format && pattern.bestFormats.includes(format) ? `optimizado para ${format}` : null,
      affinityCats.includes(pattern.category) ? `alineado con objetivo "${goal}"` : null,
      `dispara ${pattern.primaryTrigger}`,
    ]
      .filter((x): x is string => x !== null)
      .join(' · '),
  }));
};

export const findMatchingPatterns = shortlistPatterns;

export interface HookMatchOptions {
  format?: HookFormat;
  preferredCategories?: HookCategory[];
  targetTrigger?: PsychTrigger;
}

export const matchAndGenerateHooks = async (
  brand: BrandProfile,
  idea: string,
  options: HookMatchOptions = {},
): Promise<HookMatchResult> => {
  const shortlist = shortlistPatterns(idea, brand, options.format, options.preferredCategories);

  const prompt = `Actuás como copywriter senior de Instagram, especializado en hooks que retienen los primeros 3 segundos.

${brandContext(brand)}

IDEA: "${idea}"
${options.format ? `FORMATO: ${options.format}` : ''}

Tenés 3 patrones de hooks probados que debés instanciar. Para cada uno reemplazá los placeholders {…} con copy concreto para la marca y la idea. Mantené el ritmo y la mecánica psicológica del patrón.

PATRONES SELECCIONADOS:
${shortlist
  .map(
    (m, i) => `${i + 1}. [${m.pattern.id}] ${m.pattern.name}
   Esqueleto: ${m.pattern.skeleton}
   Dispara: ${m.pattern.primaryTrigger}
   Por qué funciona: ${m.pattern.whyItWorks}
   Ejemplo: ${m.pattern.example}
   Evitar: ${m.pattern.pitfalls.join(' / ')}`,
  )
  .join('\n\n')}

Reglas:
- Entre 60 y 100 caracteres por hook.
- Incluí siempre un dato concreto (número, nombre propio, plazo) cuando el patrón lo permita.
- Voz de marca: ${brand.voice.tone.join(', ')}.
- Nunca clickbait barato: el hook debe poder cumplirse en el contenido.

Devolvé EXCLUSIVAMENTE JSON:
{
  "hooks": [
    { "patternId": "id-del-patron", "text": "hook listo para usar" }
  ]
}`;

  type LlmHook = { patternId: string; text: string };
  const raw = await askJson<{ hooks: LlmHook[] }>(prompt, { maxTokens: 800 });

  const hooks: InstantiatedHook[] = (raw.hooks ?? [])
    .map((h) => {
      const pattern = shortlist.find((s) => s.pattern.id === h.patternId)?.pattern;
      if (!pattern) return null;
      return {
        patternId: pattern.id,
        patternName: pattern.name,
        text: h.text,
        score: scoreHook(h.text, {
          format: options.format,
          targetTrigger: options.targetTrigger ?? pattern.primaryTrigger,
        }),
      };
    })
    .filter((x): x is InstantiatedHook => x !== null);

  hooks.sort((a, b) => b.score.total - a.score.total);
  const bestHookId = hooks[0]?.patternId ?? shortlist[0]?.pattern.id ?? '';

  return {
    idea,
    shortlistedPatterns: shortlist,
    hooks,
    bestHookId,
  };
};
