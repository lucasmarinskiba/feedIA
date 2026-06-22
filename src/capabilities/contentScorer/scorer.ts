/**
 * Content Scorer — Shareability + Saveability
 * ─────────────────────────────────────────────────────────────────────────
 * Pre-publication scoring of a content piece for two specific signals that
 * Instagram weighs more heavily than likes in 2025/2026:
 *
 *   • SHARE-WORTHINESS — will someone DM this to a friend?
 *     Drivers: identification, surprise, social currency, "you have to see this"
 *
 *   • SAVE-WORTHINESS — will someone bookmark this to come back to?
 *     Drivers: density of practical info, list structure, reference value,
 *              "I'll need this later" signal
 *
 * The scorer is deterministic so it's fast and cheap to call on every draft
 * before sending to the LLM for refinement.
 */

import type { ContentFormat } from '../../config/types.js';

export interface ContentToScore {
  format: ContentFormat;
  hook?: string;
  body?: string;
  caption?: string;
  cta?: string;
  /** For carousels — slide count is a strong signal. */
  slideCount?: number;
  /** Any hashtags planned; pure text. */
  hashtags?: string[];
}

export interface ScoreCard {
  shareScore: number; // 0–100
  saveScore: number; // 0–100
  combinedScore: number; // weighted avg, save weighted higher
  band: 'viral-candidate' | 'fuerte' | 'aceptable' | 'mejorable' | 'debil';
  shareDrivers: string[];
  saveDrivers: string[];
  blockers: string[];
  recommendations: string[];
}

const SHARE_TRIGGERS = [
  'pov',
  'cuando ',
  'es vos',
  'sos vos',
  'me pasó',
  'nos pasa',
  'todos',
  'mi gente',
  'mandale',
  'mandá esto',
  'compartí',
];

const SAVE_TRIGGERS = [
  'guardá',
  'guardalo',
  'guardá esto',
  'guarda este',
  'plantilla',
  'template',
  'checklist',
  'paso a paso',
  'guía',
  'cheatsheet',
  'fórmula',
  'framework',
  'método',
  'sistema',
];

const REFERENCE_VALUE_MARKERS = [
  'cómo hacer',
  'cómo crear',
  'tutorial',
  'guía completa',
  'manual',
  'protocolo',
  'process',
  'workflow',
];

const lower = (s: string): string => s.toLowerCase();
const has = (haystack: string, needles: string[]): string[] => needles.filter((n) => lower(haystack).includes(n));

const countMatches = (s: string, regex: RegExp): number => (s.match(regex) ?? []).length;

/* ──────────────────────────────────────────────────────────────────────── */

export const scoreContent = (content: ContentToScore): ScoreCard => {
  const allText = [content.hook, content.body, content.caption, content.cta]
    .filter((s): s is string => Boolean(s))
    .join('\n');

  const shareDrivers: string[] = [];
  const saveDrivers: string[] = [];
  const blockers: string[] = [];

  // ── SHARE SCORE ────────────────────────────────────────────────────
  let shareScore = 50;

  const shareHits = has(allText, SHARE_TRIGGERS);
  if (shareHits.length > 0) {
    shareScore += Math.min(20, shareHits.length * 7);
    shareDrivers.push(`Disparadores de share detectados: ${shareHits.join(', ')}`);
  }

  // Identification triggers — second person + emotional reference.
  const youCount = countMatches(allText, /\b(vos|tú|tu|tus|te|ti)\b/gi);
  if (youCount >= 3) {
    shareScore += 8;
    shareDrivers.push('Alta tasa de interpelación directa al lector');
  } else if (youCount === 0) {
    shareScore -= 6;
    blockers.push('No interpela al lector — pierde el "soy yo" del share');
  }

  // Format multiplier — reels and POVs share more than static.
  if (content.format === 'reel') {
    shareScore += 10;
    shareDrivers.push('Formato Reel: 4× share rate vs estático');
  } else if (content.format === 'historia') {
    shareScore += 6;
    shareDrivers.push('Stories: share fácil con un tap');
  } else if (content.format === 'post-imagen') {
    shareScore -= 3;
  }

  // Emoji density — moderate (1–3 emojis) helps share, too many hurts.
  const emojiMatches = allText.match(/[\u{1F300}-\u{1F9FF}\u{1F600}-\u{1F64F}\u{2600}-\u{26FF}]/gu);
  const emojiCount = emojiMatches?.length ?? 0;
  if (emojiCount === 0) {
    shareScore -= 4;
    blockers.push('Sin emojis — pierde la conexión emocional rápida');
  } else if (emojiCount > 8) {
    shareScore -= 5;
    blockers.push('Demasiados emojis — se ve spam y rompe profesionalismo');
  } else if (emojiCount >= 2 && emojiCount <= 5) {
    shareScore += 4;
    shareDrivers.push('Densidad emoji óptima (2-5)');
  }

  // ── SAVE SCORE ─────────────────────────────────────────────────────
  let saveScore = 50;

  const saveHits = has(allText, SAVE_TRIGGERS);
  if (saveHits.length > 0) {
    saveScore += Math.min(20, saveHits.length * 7);
    saveDrivers.push(`Disparadores de save detectados: ${saveHits.join(', ')}`);
  }

  const refHits = has(allText, REFERENCE_VALUE_MARKERS);
  if (refHits.length > 0) {
    saveScore += 12;
    saveDrivers.push(`Valor de referencia (${refHits.join(', ')}) — invita al bookmark`);
  }

  // List structure — numbered/bulleted is high-save.
  const hasNumberedList = /\b(\d+[.)])\s/g.test(allText) || /(1\)|2\)|3\))/i.test(allText);
  if (hasNumberedList) {
    saveScore += 10;
    saveDrivers.push('Estructura numerada — alto valor de referencia');
  }

  // Carousel format — saves are 2-3× post-imagen.
  if (content.format === 'carrusel') {
    saveScore += 12;
    saveDrivers.push('Carrusel: formato top-saved en Instagram 2025');
    if (content.slideCount && content.slideCount >= 7) {
      saveScore += 5;
      saveDrivers.push(`${content.slideCount} slides — alta densidad de info`);
    } else if (content.slideCount && content.slideCount < 5) {
      saveScore -= 3;
      blockers.push(`Solo ${content.slideCount} slides — carrusel queda corto para save`);
    }
  } else if (content.format === 'post-imagen') {
    saveScore += 4;
  } else if (content.format === 'historia') {
    saveScore -= 15;
    blockers.push('Stories desaparecen — el save tiene poco sentido aquí');
  }

  // Numbers and specifics signal density.
  const numberCount = countMatches(allText, /\b\d+([%.,]\d+)?\b/g);
  if (numberCount >= 3) {
    saveScore += 8;
    saveDrivers.push(`${numberCount} datos numéricos — alta densidad informativa`);
  } else if (numberCount === 0) {
    saveScore -= 6;
    blockers.push('Sin números concretos — baja densidad informativa');
  }

  // Length window for carousel/post body.
  const bodyLen = (content.body ?? content.caption ?? '').length;
  if (content.format !== 'reel' && content.format !== 'historia') {
    if (bodyLen < 200) {
      saveScore -= 8;
      blockers.push('Cuerpo demasiado corto para tener valor de referencia');
    } else if (bodyLen > 1500) {
      saveScore -= 4;
      blockers.push('Cuerpo muy largo — fricciona el save');
    } else {
      saveScore += 5;
      saveDrivers.push('Longitud de cuerpo en rango óptimo de retención');
    }
  }

  // Hook quality affects both.
  if (content.hook) {
    if (content.hook.length < 25) {
      shareScore -= 5;
      saveScore -= 5;
      blockers.push('Hook demasiado corto para enganchar');
    }
    if (/\?$/.test(content.hook.trim())) {
      shareScore += 5;
      shareDrivers.push('Hook termina en pregunta — invita a respuesta y share');
    }
  } else {
    blockers.push('Sin hook explícito');
  }

  // CTA presence.
  if (content.cta && content.cta.length > 0) {
    saveScore += 4;
    shareScore += 3;
  } else {
    blockers.push('Sin CTA — pierde conversión');
  }

  // Clamp.
  shareScore = Math.max(0, Math.min(100, Math.round(shareScore)));
  saveScore = Math.max(0, Math.min(100, Math.round(saveScore)));
  const combinedScore = Math.round(shareScore * 0.4 + saveScore * 0.6);

  const band: ScoreCard['band'] =
    combinedScore >= 85
      ? 'viral-candidate'
      : combinedScore >= 72
        ? 'fuerte'
        : combinedScore >= 58
          ? 'aceptable'
          : combinedScore >= 42
            ? 'mejorable'
            : 'debil';

  const recommendations: string[] = [];
  if (saveScore < 60 && content.format === 'carrusel') {
    recommendations.push('Agregá lista numerada con un take por slide para subir saveability.');
  }
  if (shareScore < 60 && content.format === 'reel') {
    recommendations.push('Sumá un "POV" o "esto te pasa si..." al inicio para detonar share.');
  }
  if (!has(allText, ['guardá', 'guardalo'])) {
    recommendations.push('Incluí un CTA explícito "guardá este post" al final del cuerpo.');
  }
  if (numberCount === 0) {
    recommendations.push('Agregá al menos un dato numérico concreto (porcentaje, plazo, monto).');
  }
  if (blockers.length === 0 && combinedScore < 75) {
    recommendations.push('No hay bloqueos, pero faltan amplificadores: reforzá disparadores específicos.');
  }

  return {
    shareScore,
    saveScore,
    combinedScore,
    band,
    shareDrivers,
    saveDrivers,
    blockers,
    recommendations,
  };
};
