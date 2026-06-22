/**
 * Pin Strategy — Posts Fijados Estratégicos
 * ─────────────────────────────────────────────────────────────────────────
 * Instagram lets you pin 3 posts at the top of your grid. Each one is prime
 * real estate that should serve a specific funnel position:
 *
 *   • Pin 1 (top-left)  → AWARENESS    "qué hago / por qué importa"
 *   • Pin 2 (top-center)→ CONSIDERATION "el caso/resultado más fuerte"
 *   • Pin 3 (top-right) → CONVERSION   "qué tengo que ofrecerte hoy"
 *
 * This module:
 *   • Picks the optimal 3 pins from the brand's available content
 *     (top performers + drafts + recommendations from the auto-optimization
 *     loop) given the funnel logic above.
 *   • Generates a brief telling the brand what each pin SHOULD contain if
 *     none of the existing pieces fit a slot.
 *   • Scores the current pin slate so the user knows whether to refresh.
 */

import type { BrandProfile } from '../../config/types.js';
import { topPerformers } from '../../agent/memory.js';
import { listRecommendations } from '../autoOptimize/index.js';
import { listFingerprints } from '../originality/index.js';
import type { FunnelPosition } from '../conceptTemplates/index.js';

export interface PinCandidate {
  /** Stable id; can match a top-performer postId, recommendation id, or fingerprint id. */
  id: string;
  source: 'top-performer' | 'recommendation' | 'fingerprint' | 'gap-brief';
  format?: string;
  /** Best-effort first line / topic descriptor. */
  description: string;
  /** Inferred funnel position. */
  funnelPosition: FunnelPosition;
  /** Score for THIS slot — higher = better fit. */
  fitScore: number;
  /** Why this piece fits this slot. */
  rationale: string;
}

export interface PinSlate {
  awarenessPin: PinCandidate;
  considerationPin: PinCandidate;
  conversionPin: PinCandidate;
  /** Overall quality of the slate, 0–100. */
  slateScore: number;
  band: 'sólido' | 'mejorable' | 'incompleto';
  /** What's missing if any slot is filled by a gap brief instead of a real piece. */
  gaps: string[];
  recommendations: string[];
}

/* ──────────────────────────────────────────────────────────────────────── */

const GAP_BRIEFS: Record<'awareness' | 'consideration' | 'conversion', { description: string; rationale: string }> = {
  awareness: {
    description: 'Pieza que comunique en 3 segundos qué hacés y para quién — sin pitch.',
    rationale: 'Falta un pin de awareness fuerte. El primer pin define la promesa de la cuenta.',
  },
  consideration: {
    description: 'Caso real desarmado o framework completo — máximo save potencial.',
    rationale: 'Falta un pin de consideración con prueba o método repetible.',
  },
  conversion: {
    description: 'Oferta clara con CTA — qué pasa después de hacer click. Sin urgencia falsa.',
    rationale: 'Falta un pin de conversión que cierre el camino para el visitante listo.',
  },
};

const inferFunnelPosition = (text: string, format?: string): FunnelPosition => {
  const t = text.toLowerCase();
  if (/\b(precio|oferta|servicio|comprar|reservar|agenda|consultoría|pago)\b/.test(t)) return 'conversion';
  if (/\b(caso|resultado|cómo lo hicimos|de \d+ a \d+|método|framework|plan|sistema)\b/.test(t)) return 'consideration';
  if (/\b(qué hago|quién soy|presentación|sobre nosotros|por qué|misión)\b/.test(t)) return 'awareness';
  if (format === 'historia') return 'retention';
  if (format === 'reel' && /\bpov\b|cuando vos|cuando vos/i.test(text)) return 'awareness';
  // Default by format: reels → awareness, carrusel → consideration, post-imagen → awareness/conversion.
  if (format === 'reel') return 'awareness';
  if (format === 'carrusel') return 'consideration';
  return 'awareness';
};

const scoreForSlot = (
  candidate: { funnelPosition: FunnelPosition; sourceQuality: number; recency?: number },
  slot: 'awareness' | 'consideration' | 'conversion',
): number => {
  // Perfect match = +30, neutral = 0, mismatch = −20.
  const match = candidate.funnelPosition === slot ? 30 : candidate.funnelPosition === 'retention' ? -10 : -20;
  const recencyBonus = candidate.recency ?? 0;
  return Math.max(0, candidate.sourceQuality + match + recencyBonus);
};

/* ──────────────────────────────────────────────────────────────────────── */

/** Build the universe of candidates from memory + recommendations + fingerprints. */
const collectCandidates = (): Array<PinCandidate & { sourceQuality: number; recency: number }> => {
  const out: Array<PinCandidate & { sourceQuality: number; recency: number }> = [];
  const now = Date.now();

  // Top performers from memory — highest source quality.
  for (const tp of topPerformers(20)) {
    const recencyDays = (now - Date.parse(tp.publishedAt)) / 86_400_000;
    const recency = Math.max(0, 20 - Math.floor(recencyDays / 7));
    out.push({
      id: tp.postId,
      source: 'top-performer',
      format: tp.format,
      description: tp.hookFirstLine || tp.postId,
      funnelPosition: inferFunnelPosition(tp.hookFirstLine ?? '', tp.format),
      fitScore: 0, // filled per slot
      rationale: `Top performer histórico (saves ${tp.metrics.saves}, shares ${tp.metrics.shares})`,
      sourceQuality: 55 + Math.min(35, tp.metrics.saves + tp.metrics.shares),
      recency,
    });
  }

  // Recommendations from auto-optimization — strong candidates if not yet produced.
  for (const rec of listRecommendations({ status: 'producido' })) {
    out.push({
      id: rec.id,
      source: 'recommendation',
      format: rec.format,
      description: rec.hookText,
      funnelPosition: inferFunnelPosition(rec.hookText + ' ' + rec.topicAngle, rec.format),
      fitScore: 0,
      rationale: `Producido por el loop de auto-optimización (×${rec.expectedSavesMultiplier} esperado)`,
      sourceQuality: 50,
      recency: 18,
    });
  }

  // Fingerprints (recently published) as fallback candidates.
  for (const fp of listFingerprints(40)) {
    const recencyDays = (now - Date.parse(fp.createdAt)) / 86_400_000;
    if (recencyDays > 90) continue;
    const recency = Math.max(0, 15 - Math.floor(recencyDays / 7));
    out.push({
      id: fp.id,
      source: 'fingerprint',
      format: fp.format,
      description: fp.hookLine,
      funnelPosition: inferFunnelPosition(fp.hookLine, fp.format),
      fitScore: 0,
      rationale: 'Pieza publicada recientemente',
      sourceQuality: 35,
      recency,
    });
  }

  return out;
};

const pickSlot = (
  candidates: Array<PinCandidate & { sourceQuality: number; recency: number }>,
  slot: 'awareness' | 'consideration' | 'conversion',
  excludeIds: Set<string>,
): PinCandidate => {
  const scored = candidates
    .filter((c) => !excludeIds.has(c.id))
    .map((c) => ({ ...c, fitScore: scoreForSlot(c, slot) }))
    .sort((a, b) => b.fitScore - a.fitScore);

  // If best fit is below the threshold of "real candidate", return a gap brief.
  const best = scored[0];
  if (!best || best.fitScore < 35) {
    const brief = GAP_BRIEFS[slot];
    return {
      id: `gap-${slot}`,
      source: 'gap-brief',
      description: brief.description,
      funnelPosition: slot,
      fitScore: 0,
      rationale: brief.rationale,
    };
  }
  return best;
};

/* ──────────────────────────────────────────────────────────────────────── */

export const recommendPinSlate = (_brand: BrandProfile): PinSlate => {
  const universe = collectCandidates();

  // Pick one per slot; never repeat a piece.
  const used = new Set<string>();
  const awareness = pickSlot(universe, 'awareness', used);
  used.add(awareness.id);
  const consideration = pickSlot(universe, 'consideration', used);
  used.add(consideration.id);
  const conversion = pickSlot(universe, 'conversion', used);

  const realPins = [awareness, consideration, conversion].filter((p) => p.source !== 'gap-brief').length;
  const slateScore = Math.round((awareness.fitScore + consideration.fitScore + conversion.fitScore) / 3);
  const band: PinSlate['band'] =
    realPins === 3 && slateScore >= 65 ? 'sólido' : realPins >= 2 ? 'mejorable' : 'incompleto';

  const gaps: string[] = [];
  if (awareness.source === 'gap-brief') gaps.push('awareness');
  if (consideration.source === 'gap-brief') gaps.push('consideration');
  if (conversion.source === 'gap-brief') gaps.push('conversion');

  const recommendations: string[] = [];
  if (gaps.length > 0) {
    recommendations.push(
      `Producí piezas específicas para los slots: ${gaps.join(', ')}. El sistema autónomo puede generarlas con el producer.`,
    );
  }
  if (band === 'sólido') {
    recommendations.push('Slate sólida — revisar en 4-6 semanas para refrescar.');
  }
  if (band === 'mejorable') {
    recommendations.push(
      'Slate mejorable: subí la fit-score con piezas más alineadas al funnel position de cada slot.',
    );
  }

  return {
    awarenessPin: awareness,
    considerationPin: consideration,
    conversionPin: conversion,
    slateScore,
    band,
    gaps,
    recommendations,
  };
};
