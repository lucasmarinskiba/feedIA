/**
 * Originality Checker
 * ─────────────────────────────────────────────────────────────────────────
 * Pre-publication gate. Given a draft piece, compares it against the brand's
 * own fingerprint history and returns:
 *
 *   • originalityScore (0–100; ≥80 is publish-safe)
 *   • a band classification
 *   • the closest past piece (if any) with its similarity %
 *   • specific reasons that drag the score down
 *   • recommendations to push the score above the threshold
 *
 * This is the operational guardrail for "Contenido 100% Original".
 */

import { shingles, jaccard, buildFingerprint, normalize, type ContentFingerprint } from './fingerprint.js';
import { listFingerprints, saveFingerprint } from './store.js';

export interface OriginalityCheck {
  originalityScore: number; // 0–100, higher = more original
  band: 'unico' | 'fresco' | 'similar' | 'repetido' | 'duplicado';
  closestMatch: {
    fingerprintId: string;
    hookLine: string;
    createdAt: string;
    bodySimilarity: number; // 0–1
    hookSimilarity: number; // 0–1
  } | null;
  triggeredRules: string[];
  recommendations: string[];
  passed: boolean; // true if score >= threshold
  threshold: number;
}

const SIMILARITY_THRESHOLD = 0.62; // n=3 Jaccard above this = "same idea"
const HOOK_SIMILARITY_THRESHOLD = 0.55;
const ORIGINALITY_THRESHOLD = 80; // publish gate

const bandFor = (score: number): OriginalityCheck['band'] =>
  score >= 92 ? 'unico' : score >= 80 ? 'fresco' : score >= 60 ? 'similar' : score >= 35 ? 'repetido' : 'duplicado';

/* ──────────────────────────────────────────────────────────────────────── */

export interface DraftToCheck {
  hook?: string;
  body?: string;
  caption?: string;
  format?: string;
  /** Window for comparison; default 180d. Older content matters less. */
  lookbackDays?: number;
}

/**
 * Run the full originality check. Pure function (does NOT persist the draft —
 * the producer decides if/when to save its fingerprint after approval).
 */
export const checkOriginality = (draft: DraftToCheck): OriginalityCheck => {
  const lookback = draft.lookbackDays ?? 180;
  const cutoff = Date.now() - lookback * 86_400_000;

  const fullText = [draft.hook, draft.body, draft.caption].filter((s): s is string => Boolean(s)).join('\n');

  const draftShingles = shingles(fullText, 3);
  const draftHook = normalize(draft.hook ?? '');

  const past = listFingerprints().filter((f) => Date.parse(f.createdAt) >= cutoff);

  let closest: OriginalityCheck['closestMatch'] = null;
  let worstBodySim = 0;
  let worstHookSim = 0;

  for (const fp of past) {
    const pastShingles = new Set(fp.shingles3);
    const bodySim = jaccard(draftShingles, pastShingles);
    const pastHook = normalize(fp.hookLine);
    // Hook similarity — character-level Jaccard on tokens since hooks are short.
    const hookSim =
      pastHook && draftHook
        ? jaccard(
            new Set(draftHook.split(' ').filter((w) => w.length >= 3)),
            new Set(pastHook.split(' ').filter((w) => w.length >= 3)),
          )
        : 0;

    if (bodySim > worstBodySim || hookSim > worstHookSim) {
      if (bodySim > worstBodySim) worstBodySim = bodySim;
      if (hookSim > worstHookSim) worstHookSim = hookSim;
      closest = {
        fingerprintId: fp.id,
        hookLine: fp.hookLine,
        createdAt: fp.createdAt,
        bodySimilarity: +bodySim.toFixed(3),
        hookSimilarity: +hookSim.toFixed(3),
      };
    }
  }

  // ── Score ────────────────────────────────────────────────────────────
  let score = 100;
  const triggered: string[] = [];
  const recommendations: string[] = [];

  if (worstBodySim >= SIMILARITY_THRESHOLD) {
    const penalty = Math.round((worstBodySim - SIMILARITY_THRESHOLD) * 200);
    score -= Math.max(25, penalty);
    triggered.push(`Cuerpo similar a contenido pasado (${(worstBodySim * 100).toFixed(0)}% Jaccard)`);
    recommendations.push('Cambiá el ángulo central o reemplazá los ejemplos por casos nuevos del último mes.');
  } else if (worstBodySim >= 0.4) {
    score -= 12;
    triggered.push(`Cuerpo con solapamiento moderado vs historia (${(worstBodySim * 100).toFixed(0)}%)`);
    recommendations.push('Reescribí 1-2 secciones con un framing distinto.');
  }

  if (worstHookSim >= HOOK_SIMILARITY_THRESHOLD) {
    const penalty = Math.round((worstHookSim - HOOK_SIMILARITY_THRESHOLD) * 100);
    score -= Math.max(15, penalty);
    triggered.push(`Hook muy parecido a uno previo (${(worstHookSim * 100).toFixed(0)}% palabras compartidas)`);
    recommendations.push('Reformulá el hook con un patrón de otra categoría — la cuenta ya lo usó.');
  }

  // Short content = high random collision chance, reduce penalty severity.
  if (fullText.length < 200 && score < 80) {
    score = Math.min(80, score + 10);
    triggered.push('Texto corto: similitud puede ser coincidencia');
  }

  if (triggered.length === 0) {
    recommendations.push('Pieza original — listá para publicar.');
  }

  score = Math.max(0, Math.min(100, Math.round(score)));

  return {
    originalityScore: score,
    band: bandFor(score),
    closestMatch: closest,
    triggeredRules: triggered,
    recommendations,
    passed: score >= ORIGINALITY_THRESHOLD,
    threshold: ORIGINALITY_THRESHOLD,
  };
};

/**
 * Register a piece as published — saves its fingerprint so future drafts
 * can be compared against it. Returns the saved fingerprint.
 */
export const registerPublished = (params: {
  id: string;
  hook?: string;
  body?: string;
  caption?: string;
  format?: string;
}): ContentFingerprint => {
  const fp = buildFingerprint(params);
  saveFingerprint(fp);
  return fp;
};

/** Convenience: check + register if it passes. */
export const checkAndRegister = (params: {
  id: string;
  hook?: string;
  body?: string;
  caption?: string;
  format?: string;
}): { check: OriginalityCheck; fingerprint: ContentFingerprint | null } => {
  const check = checkOriginality(params);
  const fingerprint = check.passed ? registerPublished(params) : null;
  return { check, fingerprint };
};
