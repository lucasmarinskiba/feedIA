/**
 * Success Pattern Loop
 * ─────────────────────────────────────────────────────────────────────────
 * The auto-optimization core. Reads the brand's own historical top-performing
 * posts from memory, extracts the reusable patterns (format mix, hook style,
 * timing, topic angles), and produces:
 *
 *   1. A "what works for this brand" summary — deterministic, no LLM.
 *   2. A prioritized list of next-piece recommendations.
 *   3. Strategy parameter adjustments the scheduler/content engine can apply.
 *
 * The LLM is used only for the recommendation phase, with the deterministic
 * extraction passed in as ground truth so it can't hallucinate winners.
 */

import { askJson } from '../../agent/claude.js';
import { brandContext, topPerformers } from '../../agent/memory.js';
import type { BrandProfile } from '../../config/types.js';
import { scoreHook } from '../hookLibrary/scorer.js';
import { HOOK_PATTERNS, type HookCategory } from '../hookLibrary/patterns.js';

export interface FormatPerformance {
  format: string;
  count: number;
  avgSaves: number;
  avgShares: number;
  avgLikes: number;
  avgComments: number;
  /** Engagement weighted score = saves×3 + shares×4 + comments×1.5 */
  weightedScore: number;
}

export interface TimingPattern {
  hour: number;
  dayOfWeek: number; // 0 = Sunday … 6 = Saturday
  count: number;
  avgWeightedScore: number;
}

export interface HookPatternHit {
  patternId: string;
  patternName: string;
  category: HookCategory;
  hits: number;
  avgScore: number;
}

export interface SuccessExtraction {
  sampleSize: number;
  windowDays: number;
  formatPerformance: FormatPerformance[];
  winningFormat: string | null;
  bestPostingWindows: TimingPattern[];
  hookPatternHits: HookPatternHit[];
  topHookExamples: Array<{ hook: string; score: number; saves: number; shares: number }>;
  /** Saves and shares ratios relative to the brand's own baseline. */
  baselineMultipliers: { saves: number; shares: number };
}

const WEIGHT = { saves: 3, shares: 4, likes: 0.2, comments: 1.5 } as const;

const weightedScore = (m: { saves: number; shares: number; likes: number; comments: number }): number =>
  m.saves * WEIGHT.saves + m.shares * WEIGHT.shares + m.likes * WEIGHT.likes + m.comments * WEIGHT.comments;

const safeAvg = (values: number[]): number => {
  if (values.length === 0) return 0;
  return values.reduce((acc, v) => acc + v, 0) / values.length;
};

/**
 * Pure-function extractor. No LLM, no I/O beyond reading memory.
 * Suitable to call from any scheduler job.
 */
export const extractSuccessPatterns = (windowDays = 60): SuccessExtraction => {
  // Pull the largest reasonable batch — scorer needs population to stabilize.
  const records = topPerformers(50);
  const cutoff = Date.now() - windowDays * 86_400_000;
  const inWindow = records.filter((r) => {
    const t = Date.parse(r.publishedAt);
    return Number.isFinite(t) && t >= cutoff;
  });

  // Brand-wide baseline (so we can express "X performs Y× our own baseline").
  const allSaves = records.map((r) => r.metrics.saves);
  const allShares = records.map((r) => r.metrics.shares);
  const baselineSaves = safeAvg(allSaves);
  const baselineShares = safeAvg(allShares);

  // ── Format performance ─────────────────────────────────────────────
  const byFormat = new Map<string, typeof inWindow>();
  for (const r of inWindow) {
    const arr = byFormat.get(r.format) ?? [];
    arr.push(r);
    byFormat.set(r.format, arr);
  }
  const formatPerformance: FormatPerformance[] = Array.from(byFormat.entries())
    .map(([format, rs]) => ({
      format,
      count: rs.length,
      avgSaves: safeAvg(rs.map((r) => r.metrics.saves)),
      avgShares: safeAvg(rs.map((r) => r.metrics.shares)),
      avgLikes: safeAvg(rs.map((r) => r.metrics.likes)),
      avgComments: safeAvg(rs.map((r) => r.metrics.comments)),
      weightedScore: safeAvg(rs.map((r) => weightedScore(r.metrics))),
    }))
    .sort((a, b) => b.weightedScore - a.weightedScore);

  const winningFormat = formatPerformance[0]?.format ?? null;

  // ── Posting windows ────────────────────────────────────────────────
  const byBucket = new Map<string, typeof inWindow>();
  for (const r of inWindow) {
    const d = new Date(r.publishedAt);
    if (Number.isNaN(d.valueOf())) continue;
    const key = `${d.getUTCDay()}-${d.getUTCHours()}`;
    const arr = byBucket.get(key) ?? [];
    arr.push(r);
    byBucket.set(key, arr);
  }
  const bestPostingWindows: TimingPattern[] = Array.from(byBucket.entries())
    .map(([key, rs]) => {
      const [dow, hr] = key.split('-').map(Number);
      return {
        dayOfWeek: dow!,
        hour: hr!,
        count: rs.length,
        avgWeightedScore: safeAvg(rs.map((r) => weightedScore(r.metrics))),
      };
    })
    .filter((t) => t.count >= 2) // need at least 2 datapoints
    .sort((a, b) => b.avgWeightedScore - a.avgWeightedScore)
    .slice(0, 5);

  // ── Hook pattern hits ──────────────────────────────────────────────
  // For each top post, score its hook against the library and see which
  // curated pattern it most likely belongs to.
  const hookHitsMap = new Map<string, { pattern: (typeof HOOK_PATTERNS)[number]; scores: number[] }>();
  const hookExamples: Array<{ hook: string; score: number; saves: number; shares: number }> = [];

  for (const r of inWindow) {
    if (!r.hookFirstLine) continue;
    const breakdown = scoreHook(r.hookFirstLine, { format: r.format as never });
    if (!breakdown.matchedPattern) continue;
    const existing = hookHitsMap.get(breakdown.matchedPattern.id) ?? {
      pattern: breakdown.matchedPattern,
      scores: [],
    };
    existing.scores.push(breakdown.total);
    hookHitsMap.set(breakdown.matchedPattern.id, existing);
    hookExamples.push({
      hook: r.hookFirstLine,
      score: breakdown.total,
      saves: r.metrics.saves,
      shares: r.metrics.shares,
    });
  }

  const hookPatternHits: HookPatternHit[] = Array.from(hookHitsMap.values())
    .map(({ pattern, scores }) => ({
      patternId: pattern.id,
      patternName: pattern.name,
      category: pattern.category,
      hits: scores.length,
      avgScore: safeAvg(scores),
    }))
    .sort((a, b) => b.hits - a.hits || b.avgScore - a.avgScore);

  // Top hook examples by share+save score (capped at 5 unique hooks).
  const topHookExamples = hookExamples.sort((a, b) => b.saves + b.shares - (a.saves + a.shares)).slice(0, 5);

  // ── Baseline multipliers ──────────────────────────────────────────
  const winAvgSaves = formatPerformance[0]?.avgSaves ?? 0;
  const winAvgShares = formatPerformance[0]?.avgShares ?? 0;
  const baselineMultipliers = {
    saves: baselineSaves > 0 ? +(winAvgSaves / baselineSaves).toFixed(2) : 1,
    shares: baselineShares > 0 ? +(winAvgShares / baselineShares).toFixed(2) : 1,
  };

  return {
    sampleSize: inWindow.length,
    windowDays,
    formatPerformance,
    winningFormat,
    bestPostingWindows,
    hookPatternHits,
    topHookExamples,
    baselineMultipliers,
  };
};

/* ─────────────────────────────────────────────────────────────────── */

export interface NextPieceRecommendation {
  format: string;
  hookPatternId: string;
  hookText: string;
  topicAngle: string;
  whyThisWillWin: string;
  expectedSavesMultiplier: number;
  /** When the scheduler should ideally publish this. */
  recommendedSlot: { dayOfWeek: number; hour: number } | null;
}

export interface StrategyAdjustment {
  parameter: string;
  currentValue: string;
  recommendedValue: string;
  rationale: string;
  confidence: 'alta' | 'media' | 'baja';
}

export interface AutoOptimizationResult {
  extraction: SuccessExtraction;
  recommendations: NextPieceRecommendation[];
  strategyAdjustments: StrategyAdjustment[];
  executiveSummary: string;
}

const dayName = (d: number): string =>
  ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'][d] ?? 'desconocido';

/**
 * Closes the loop: produces concrete next-piece recommendations and strategy
 * adjustments grounded in the deterministic extraction. The LLM gets the
 * facts pre-computed so it can only interpret, not invent.
 */
export const runAutoOptimization = async (brand: BrandProfile, windowDays = 60): Promise<AutoOptimizationResult> => {
  const extraction = extractSuccessPatterns(windowDays);

  if (extraction.sampleSize < 3) {
    return {
      extraction,
      recommendations: [],
      strategyAdjustments: [],
      executiveSummary:
        'Datos insuficientes (menos de 3 publicaciones en la ventana). Publicá más contenido y volvé en 2 semanas para activar el loop de optimización.',
    };
  }

  const factualBlock = `
DATOS REALES — VENTANA DE ${extraction.windowDays} DÍAS (n=${extraction.sampleSize}):

Formatos ordenados por performance:
${extraction.formatPerformance
  .map(
    (f) =>
      `• ${f.format}: peso ${f.weightedScore.toFixed(1)} | guardados prom ${f.avgSaves.toFixed(1)} | shares prom ${f.avgShares.toFixed(1)} (n=${f.count})`,
  )
  .join('\n')}

Patrones de hook que efectivamente usaste y funcionaron:
${
  extraction.hookPatternHits.length
    ? extraction.hookPatternHits
        .slice(0, 6)
        .map((h) => `• ${h.patternName} (${h.category}): ${h.hits} hits, score promedio ${h.avgScore.toFixed(0)}`)
        .join('\n')
    : '• Sin patrones detectables: hooks demasiado variados o difíciles de clasificar.'
}

Ventanas horarias con mejor performance histórica:
${
  extraction.bestPostingWindows.length
    ? extraction.bestPostingWindows
        .map(
          (t) =>
            `• ${dayName(t.dayOfWeek)} ${String(t.hour).padStart(2, '0')}:00 — peso ${t.avgWeightedScore.toFixed(1)} (n=${t.count})`,
        )
        .join('\n')
    : '• Sin ventanas estables aún.'
}

Top hooks históricos (texto literal):
${extraction.topHookExamples
  .map((h) => `• "${h.hook}" → saves ${h.saves}, shares ${h.shares} (hook-score ${h.score})`)
  .join('\n')}

Multiplicador del formato ganador vs tu propio baseline: saves ×${extraction.baselineMultipliers.saves}, shares ×${extraction.baselineMultipliers.shares}.
`.trim();

  const prompt = `Actuás como growth strategist de Instagram cerrando el ciclo de auto-optimización para una marca real.

${brandContext(brand)}

${factualBlock}

Tu trabajo:
1. Producir 3 recomendaciones de próxima pieza concretas, listas para que un agente las genere. Cada una debe basarse en los datos arriba (no inventes formatos o patrones que no aparecen).
2. Producir 3 ajustes de estrategia accionables (parámetros que el scheduler o el content engine deberían cambiar).
3. Escribir un resumen ejecutivo de 2-3 oraciones que la marca pueda leer en 10 segundos.

REGLAS DURAS:
- Solo recomendá hookPatternId entre los detectados arriba (o un patrón del library si la marca no tiene historial de hooks).
- El topicAngle debe explotar un dolor o deseo de la audiencia listado en el contexto de marca.
- expectedSavesMultiplier debe estar entre 0.8 y baselineMultipliers.saves×1.2 (sin inflar).
- Para strategyAdjustments usá parámetros REALES: "format-mix", "posting-frequency", "best-hour-target", "hook-category-priority", "experiment-budget".

JSON EXCLUSIVO:
{
  "recommendations": [
    {
      "format": "reel|carrusel|post-imagen|historia",
      "hookPatternId": "id-del-library",
      "hookText": "hook ya instanciado para esta marca",
      "topicAngle": "ángulo concreto del tema",
      "whyThisWillWin": "razón en una oración basada en los datos",
      "expectedSavesMultiplier": 1.2,
      "recommendedSlot": { "dayOfWeek": 1, "hour": 19 }
    }
  ],
  "strategyAdjustments": [
    {
      "parameter": "nombre-parametro",
      "currentValue": "valor actual o estimado",
      "recommendedValue": "valor nuevo",
      "rationale": "razón en una oración",
      "confidence": "alta|media|baja"
    }
  ],
  "executiveSummary": "2-3 oraciones."
}`;

  const result = await askJson<{
    recommendations: NextPieceRecommendation[];
    strategyAdjustments: StrategyAdjustment[];
    executiveSummary: string;
  }>(prompt, { maxTokens: 1500 });

  return {
    extraction,
    recommendations: result.recommendations ?? [],
    strategyAdjustments: result.strategyAdjustments ?? [],
    executiveSummary: result.executiveSummary ?? '',
  };
};
