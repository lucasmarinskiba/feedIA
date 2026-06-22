/**
 * Autonomous Content Producer
 * ─────────────────────────────────────────────────────────────────────────
 * The "fully autonomous operating system" component. Given an optional trigger
 * (a backlog item, a trending topic, a stored recommendation) it produces a
 * COMPLETE, ready-to-publish content piece end-to-end with no human in the
 * loop:
 *
 *   1. Pick a recommendation (or fall back to a backlog item or a fresh
 *      pattern selection) — uses Success Pattern Loop output.
 *   2. Pick a curated hook pattern, instantiate it with brand voice.
 *   3. Generate the full content body (caption, slides for carousel, or beat
 *      sheet for reel).
 *   4. Score the result with the deterministic content-scorer.
 *   5. If the score is below threshold, retry once with the recommendations
 *      from the scorer fed back into the prompt (closed feedback loop).
 *   6. Return a structured ContentPiece that integrates with the rest of the
 *      pipeline (curator → checkpoint → publish).
 *
 * The producer is the operational glue between the Hook Library, the Auto-
 * Optimization Loop, and the existing content-pipeline downstream.
 */

import { askJson } from '../../agent/claude.js';
import { brandContext } from '../../agent/memory.js';
import type { BrandProfile, ContentPiece, ContentFormat } from '../../config/types.js';
import { listRecommendations, updateRecommendationStatus } from '../autoOptimize/index.js';
import { matchAndGenerateHooks, getPatternById, type HookFormat } from '../hookLibrary/index.js';

/** Project's ContentFormat is wider than HookFormat (adds reel-faceless + live).
 *  Map the unsupported ones to their closest hook-library equivalent. */
const toHookFormat = (cf: ContentFormat): HookFormat => {
  if (cf === 'reel-faceless') return 'reel';
  if (cf === 'live') return 'historia';
  return cf;
};
import { scoreContent, type ScoreCard } from '../contentScorer/index.js';
import { checkOriginality, registerPublished, type OriginalityCheck } from '../originality/index.js';
import { buildGroundingContext, captureLearning } from '../knowledgeBase/index.js';
import { recordTrace } from '../reasoningTrace/index.js';
import { emit } from '../../agent/bus.js';

export type ProductionTrigger =
  | { kind: 'recommendation'; recommendationId?: string }
  | { kind: 'idea'; idea: string; format?: ContentFormat }
  | { kind: 'backlog'; backlogId: string };

export interface ProductionResult {
  piece: ContentPiece;
  scoreCard: ScoreCard;
  originality: OriginalityCheck;
  attempts: number;
  trigger: ProductionTrigger;
  /** patternId chosen from hook library. */
  hookPatternId: string;
  /** If we consumed a stored recommendation, its id is returned. */
  consumedRecommendationId?: string;
}

const PRODUCER_MIN_SCORE = 70;
const PRODUCER_MAX_ATTEMPTS = 2;

const pieceId = (): string => `piece-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

interface DraftLlmOutput {
  hook: string;
  body: string;
  caption: string;
  cta: string;
  hashtags: string[];
  visualDirection?: string;
  slideCount?: number;
  rationale: string;
}

const buildPrompt = (
  brand: BrandProfile,
  idea: string,
  format: ContentFormat,
  hookText: string,
  patternRationale: string,
  feedback: string[] = [],
  groundingBlock = '',
): string => `Actuás como agente productor autónomo de contenido para Instagram. Tu output va a publicación con mínima revisión humana.

${brandContext(brand)}
${groundingBlock}

PIEZA A PRODUCIR
- Formato: ${format}
- Idea / ángulo: ${idea}
- Hook ya elegido (pattern probado): "${hookText}"
- Por qué este hook: ${patternRationale}

REGLAS DE NEGOCIO:
- El hook se respeta literal — no lo reescribas, abrí con él.
- El cuerpo y caption deben tener voz de marca: ${brand.voice.tone.join(', ')}.
- Prohibido decir: ${brand.voice.forbidden.join(', ') || '—'}.
- Cada pieza debe perseguir el objetivo primario: ${brand.goals.primary}.
- Si format=carrusel: 7-9 slides, una idea por slide, numerada, cierre con CTA.
- Si format=reel: incluí beat sheet en "body" — Beat 1 (0-3s hook), Beat 2 (build), Beat 3 (payoff), Beat 4 (CTA).
- Si format=post-imagen: caption denso (400-900 caracteres) que viva por sí solo.
- Si format=historia: 3-5 frames secuenciales en "body", con interacción (slider/poll/quiz) en al menos uno.

${
  feedback.length > 0
    ? `FEEDBACK DEL DRAFT ANTERIOR (aplicalo SÍ o SÍ):
${feedback.map((f) => `- ${f}`).join('\n')}`
    : ''
}

JSON EXCLUSIVO (no agregues comentarios fuera del JSON):
{
  "hook": "el hook tal cual, sin modificar",
  "body": "cuerpo según formato",
  "caption": "caption para Instagram (puede repetir parte del body si es reel/historia)",
  "cta": "call to action concreto",
  "hashtags": ["#hash1", "#hash2", ...8-12 hashtags mezcla mega/medio/nicho],
  "visualDirection": "1-2 oraciones para el diseñador o el image-gen",
  "slideCount": 0,
  "rationale": "1 oración: por qué esta pieza es coherente con la estrategia"
}`;

const draftPiece = async (
  brand: BrandProfile,
  idea: string,
  format: ContentFormat,
  hookText: string,
  patternRationale: string,
  feedback: string[] = [],
  groundingBlock = '',
): Promise<DraftLlmOutput> => {
  const prompt = buildPrompt(brand, idea, format, hookText, patternRationale, feedback, groundingBlock);
  return askJson<DraftLlmOutput>(prompt, { maxTokens: 2200 });
};

/* ──────────────────────────────────────────────────────────────────────── */

const pickTriggerData = async (
  brand: BrandProfile,
  trigger: ProductionTrigger,
): Promise<{
  idea: string;
  format: ContentFormat;
  hookText: string;
  hookPatternId: string;
  patternRationale: string;
  consumedRecommendationId?: string;
}> => {
  if (trigger.kind === 'recommendation') {
    const open = listRecommendations({ status: 'propuesto' });
    const rec = trigger.recommendationId ? open.find((r) => r.id === trigger.recommendationId) : open[0];
    if (rec) {
      const pattern = getPatternById(rec.hookPatternId);
      return {
        idea: rec.topicAngle,
        format: (rec.format as ContentFormat) ?? 'carrusel',
        hookText: rec.hookText,
        hookPatternId: rec.hookPatternId,
        patternRationale: rec.whyThisWillWin + (pattern ? ` · activa ${pattern.primaryTrigger}` : ''),
        consumedRecommendationId: rec.id,
      };
    }
    // No stored recommendation → fall through to "idea" branch using a default.
    return pickTriggerData(brand, { kind: 'idea', idea: 'Lección reciente del nicho', format: 'carrusel' });
  }

  if (trigger.kind === 'idea') {
    const format = trigger.format ?? 'carrusel';
    const matched = await matchAndGenerateHooks(brand, trigger.idea, { format: toHookFormat(format) });
    const best = matched.hooks[0];
    const pattern = getPatternById(matched.bestHookId);
    return {
      idea: trigger.idea,
      format,
      hookText: best?.text ?? matched.shortlistedPatterns[0]?.pattern.example ?? trigger.idea,
      hookPatternId: matched.bestHookId,
      patternRationale: pattern
        ? `${pattern.whyItWorks} (categoría ${pattern.category})`
        : 'Patrón seleccionado por afinidad con objetivo de marca',
    };
  }

  // 'backlog' — keep simple: caller must already have hydrated the item; we
  // accept it as a free-form idea and let the matcher pick a pattern.
  return pickTriggerData(brand, { kind: 'idea', idea: trigger.backlogId, format: 'carrusel' });
};

/**
 * Run the full producer pipeline. Returns a publishable ContentPiece + the
 * scoreCard used to validate it. If `consumedRecommendationId` is set, the
 * caller can mark that recommendation as "producido" via updateRecommendationStatus.
 */
export const produceContent = async (
  brand: BrandProfile,
  trigger: ProductionTrigger = { kind: 'recommendation' },
  correlationId?: string,
): Promise<ProductionResult> => {
  const triggerData = await pickTriggerData(brand, trigger);

  // ── 1. Grounding: pull facts from KB before the LLM call ───────────
  const grounding = buildGroundingContext({
    brandId: brand.name,
    intent: `Producir ${triggerData.format} sobre: ${triggerData.idea}`,
    format: triggerData.format,
    maxFacts: 5,
    maxLearnings: 4,
  });

  // ── 2. Trace the format + hook decision ────────────────────────────
  recordTrace({
    agentId: 'autonomous-producer',
    decisionType: 'hook-pattern',
    context: {
      idea: triggerData.idea,
      format: triggerData.format,
      triggerKind: trigger.kind,
      consumedRecommendationId: triggerData.consumedRecommendationId,
    },
    alternatives: [{ option: triggerData.hookPatternId, score: 100, reasoning: triggerData.patternRationale }],
    chosen: triggerData.hookPatternId,
    reasoning: `Hook pattern "${triggerData.hookPatternId}" elegido — ${triggerData.patternRationale}`,
    factsUsed: grounding.facts.map((f) => f.id),
    brandId: brand.name,
    correlationId,
  });

  let draft = await draftPiece(
    brand,
    triggerData.idea,
    triggerData.format,
    triggerData.hookText,
    triggerData.patternRationale,
    [],
    grounding.promptBlock,
  );

  const evalDraft = (): { score: ScoreCard; orig: OriginalityCheck } => ({
    score: scoreContent({
      format: triggerData.format,
      hook: draft.hook,
      body: draft.body,
      caption: draft.caption,
      cta: draft.cta,
      slideCount: draft.slideCount,
      hashtags: draft.hashtags,
    }),
    orig: checkOriginality({
      hook: draft.hook,
      body: draft.body,
      caption: draft.caption,
      format: triggerData.format,
    }),
  });

  let { score: scoreCard, orig: originality } = evalDraft();
  let attempts = 1;

  // ── Closed feedback loop ─────────────────────────────────────────────
  // Retry once if EITHER (a) shareability/saveability score is below threshold,
  // OR (b) originality check failed (content too similar to past pieces).
  const needsRetry = (s: ScoreCard, o: OriginalityCheck): boolean => s.combinedScore < PRODUCER_MIN_SCORE || !o.passed;

  if (needsRetry(scoreCard, originality) && attempts < PRODUCER_MAX_ATTEMPTS) {
    const feedback = [
      ...scoreCard.blockers,
      ...scoreCard.recommendations,
      ...(originality.passed
        ? []
        : [`ORIGINALIDAD: ${originality.triggeredRules.join(' · ')}`, ...originality.recommendations]),
    ].slice(0, 8);
    draft = await draftPiece(
      brand,
      triggerData.idea,
      triggerData.format,
      triggerData.hookText,
      triggerData.patternRationale,
      feedback,
      grounding.promptBlock,
    );
    const reeval = evalDraft();
    scoreCard = reeval.score;
    originality = reeval.orig;
    attempts++;
  }

  const piece: ContentPiece = {
    id: pieceId(),
    format: triggerData.format,
    hook: draft.hook,
    body: draft.body,
    caption: draft.caption,
    cta: draft.cta,
    hashtags: draft.hashtags ?? [],
    visualDirection: draft.visualDirection,
    rationale: draft.rationale,
  };

  // Mark the recommendation as "producido" so we don't double-consume it.
  if (triggerData.consumedRecommendationId) {
    updateRecommendationStatus(triggerData.consumedRecommendationId, 'producido');
  }

  // Register the published fingerprint so future drafts compare against it.
  // We register even on score-fail because the producer's output IS the
  // canonical "we tried to publish this" record for originality purposes.
  if (originality.passed) {
    registerPublished({
      id: piece.id,
      hook: piece.hook,
      body: piece.body,
      caption: piece.caption,
      format: piece.format,
    });
  }

  // ── Capture brand learning if the piece passed both checks on first attempt
  if (scoreCard.combinedScore >= 80 && originality.passed && attempts === 1) {
    captureLearning({
      brandId: brand.name,
      category: 'hook-pattern-winner',
      insight: `Pattern "${triggerData.hookPatternId}" en ${triggerData.format} produce piezas score ≥80 al primer intento.`,
      evidence: `pieza ${piece.id} score=${scoreCard.combinedScore}`,
      tags: [triggerData.format, triggerData.hookPatternId, triggerData.idea.slice(0, 40)],
      confidence: 'media',
    });
  }

  // ── Emit content-ready event so downstream agents (scheduler, visual
  //    designer, paid amplifier) can subscribe.
  const cid = correlationId ?? `producer-${piece.id}`;
  emit({
    type: 'ContentReadyForReview',
    sourceAgent: 'autonomous-producer',
    priority: scoreCard.combinedScore >= 80 ? 'high' : 'normal',
    correlationId: cid,
    payload: {
      contentId: piece.id,
      format: piece.format,
      combinedScore: scoreCard.combinedScore,
      originalityScore: originality.originalityScore,
      hookPatternId: triggerData.hookPatternId,
      preview: { hook: piece.hook, slideCount: draft.slideCount },
    },
  });

  return {
    piece,
    scoreCard,
    originality,
    attempts,
    trigger,
    hookPatternId: triggerData.hookPatternId,
    consumedRecommendationId: triggerData.consumedRecommendationId,
  };
};

/**
 * Batch producer — run the autonomous pipeline N times in parallel,
 * consuming the top N pending recommendations. Used by the weekly autopilot.
 */
export const produceBatch = async (brand: BrandProfile, count: number): Promise<ProductionResult[]> => {
  const open = listRecommendations({ status: 'propuesto' }).slice(0, count);
  if (open.length === 0) return [];
  const results = await Promise.allSettled(
    open.map((r) => produceContent(brand, { kind: 'recommendation', recommendationId: r.id })),
  );
  return results
    .filter((r): r is PromiseFulfilledResult<ProductionResult> => r.status === 'fulfilled')
    .map((r) => r.value);
};
