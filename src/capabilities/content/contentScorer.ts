/**
 * Evaluador de calidad de contenido pre-publicación para FeedIA.
 * Puntúa cada pieza (0-100) antes de publicar para garantizar estándares profesionales.
 * Un score < 65 bloquea la publicación y genera sugerencias de mejora específicas.
 */

import { ask as routerAsk } from '../../agent/tokenRouter.js';
import { getTopPerformers, getBenchmarks } from '../analytics/performanceDB.js';
import { log } from '../../agent/logger.js';
import type { ContentFormat } from '../../config/types.js';
import { evaluateTaste, type TasteInput } from '../creativeDirector/index.js';

export interface ContentToScore {
  caption: string;
  hashtags: string[];
  format: ContentFormat;
  hasCTA: boolean;
  topic: string;
  hasVisualBrief: boolean;
  tasteInput?: TasteInput;
}

export interface ScoreDimensions {
  hook: number; // 0-20: fuerza del primer texto
  cta: number; // 0-20: claridad y especificidad del CTA
  readability: number; // 0-20: formato, saltos, emojis
  hashtags: number; // 0-20: calidad, cantidad y mix
  originality: number; // 0-20: diferenciación vs contenido propio previo
  taste: number; // 0-20: buen gusto, originalidad, estética Pinterest/Instagram
}

export interface ContentScoreResult {
  overall: number;
  dimensions: ScoreDimensions;
  approved: boolean;
  feedback: string[];
  improvementPrompt: string;
  prediction: {
    expectedEngagementRate: string;
    viralPotential: 'bajo' | 'medio' | 'alto';
    estimatedReach: string;
  };
}

// ── Evaluadores individuales ────────────────────────────────────────────────

const evalHook = (caption: string): { score: number; issue: string | null } => {
  const first = caption.split('\n')[0] ?? '';
  let score = 8;

  if (first.length < 25) return { score: 3, issue: 'El hook es demasiado corto (mínimo 25 caracteres)' };
  if (first.length > 160) {
    score -= 3;
  }

  const powerPatterns = [
    /\?/, // pregunta
    /\b\d+\b/, // número
    /^(Nadie|Todos|La mayoría|El secreto|Por qué|Cómo|Qué pasa|Stop|Para|Deja|Si tenés|Si sos)/i,
    /🔥|⚠️|💡|👇|✨|🚨|👆|⭐/, // emojis de atención
    /GRATIS|GRATIS|nunca te dijeron|error que/i, // curiosidad/FOMO
  ];
  const hasPattern = powerPatterns.some((p) => p.test(first));
  if (hasPattern) score += 8;
  else return { score, issue: 'El hook no usa patrones de impacto: pregunta, número, imperativo o FOMO' };

  // Tensión narrativa ("pero", "sin embargo", contraste)
  if (/pero |sin embargo|aunque |a pesar|vs\.|versus/i.test(first)) score += 4;

  return { score: Math.min(20, score), issue: null };
};

const evalCTA = (caption: string, hasCTA: boolean): { score: number; issue: string | null } => {
  if (!hasCTA)
    return { score: 4, issue: 'Falta CTA. Agregá uno específico al final (guardá, comentá X, enviame, linkenbio)' };

  const specificCTAs = [
    /comenta(á|a) (abajo|cuál|qué|tu|sí|no)/i,
    /guard(á|a) (esto|este|para después)/i,
    /comparte (esto|con)/i,
    /seguí(me|nos)|sigue(me|nos)/i,
    /link (en|in) bio/i,
    /escrib(ime|inos|ime)|enviame|mandame/i,
    /hac(é|e) click/i,
    /uni(te|rte)/i,
  ];
  const hasSpecific = specificCTAs.some((p) => p.test(caption));
  if (!hasSpecific)
    return {
      score: 10,
      issue: 'CTA genérico. Usá uno accionable: "Guardá esto", "Comentá SÍ si querés saber más", "Enviame INFO"',
    };

  // CTA debe estar en el tercio final
  const lines = caption.split('\n');
  const lastThird = lines.slice(Math.floor(lines.length * 0.65)).join('\n');
  const ctaIsLate = specificCTAs.some((p) => p.test(lastThird));

  return {
    score: ctaIsLate ? 20 : 14,
    issue: ctaIsLate ? null : 'Mové el CTA al final del caption para mayor conversión',
  };
};

const evalReadability = (caption: string): { score: number; issue: string | null } => {
  let score = 8;
  const issues: string[] = [];

  const lines = caption.split('\n').filter((l) => l.trim().length > 0);
  if (lines.length < 3) {
    score -= 4;
    issues.push('Usá saltos de línea — cada idea en su propio párrafo');
  } else score += 4;

  const emojiCount = (caption.match(/\p{Emoji_Presentation}/gu) ?? []).length;
  if (emojiCount === 0) {
    score -= 3;
    issues.push('Agregá 3-8 emojis estratégicos para romper el texto y guiar la vista');
  } else if (emojiCount >= 3 && emojiCount <= 12) score += 4;
  else if (emojiCount > 20) {
    score -= 3;
    issues.push('Demasiados emojis (+20). Reducí a 5-12 máximo');
  }

  const wordCount = caption.split(/\s+/).filter(Boolean).length;
  if (wordCount < 25) {
    score -= 3;
    issues.push('Caption muy corto. Desarrollá más valor para el lector');
  } else if (wordCount >= 50 && wordCount <= 220) score += 4;
  else if (wordCount > 300)
    issues.push('Caption largo. Considerá acortarlo o asegurate de que cada línea aporte valor');

  // Separación visual entre caption y hashtags
  if (caption.includes('#') && !/\n\n.*#/.test(caption)) {
    issues.push('Separá los hashtags del texto principal con dos saltos de línea para mejor lectura');
  }

  return { score: Math.min(20, Math.max(0, score)), issue: issues[0] ?? null };
};

const evalHashtags = (hashtags: string[]): { score: number; issue: string | null } => {
  if (hashtags.length === 0) return { score: 0, issue: 'Sin hashtags. Usá 15-20 hashtags con mix de tamaños' };
  if (hashtags.length < 8)
    return { score: 6, issue: `Solo ${hashtags.length} hashtags. Usá entre 15-20 para maximizar alcance orgánico` };

  let score = 10;

  if (hashtags.length >= 15 && hashtags.length <= 22) score += 6;
  else if (hashtags.length > 30) {
    score -= 2;
  }

  // Mix: clasificar por tamaño del hashtag (proxy para popularidad)
  const micro = hashtags.filter((h) => h.length >= 18).length; // nichos específicos
  const medium = hashtags.filter((h) => h.length >= 10 && h.length < 18).length;
  const broad = hashtags.filter((h) => h.length < 10).length;
  const hasMix = micro >= 3 && medium >= 3 && broad >= 2;
  if (hasMix) score += 4;
  else
    return {
      score,
      issue: 'Mix de hashtags desbalanceado. Combiná: 5-6 amplios (comunidad), 7-8 de nicho, 4-5 micro-nicho',
    };

  return { score: Math.min(20, score), issue: null };
};

const evalTaste = async (input?: TasteInput): Promise<{ score: number; issue: string | null }> => {
  if (!input) return { score: 12, issue: null };
  try {
    const score = await evaluateTaste(input);
    if (score.overall >= 80) return { score: 18, issue: null };
    if (score.overall >= 65) return { score: 14, issue: `Taste mejorable (${score.overall}/100): ${score.insights[0] ?? 'revisá coherencia visual y originalidad'}` };
    return { score: 8, issue: `Taste bajo (${score.overall}/100): ${score.insights[0] ?? 'revisá estética y ángulo creativo'}` };
  } catch {
    return { score: 12, issue: null };
  }
};

const evalOriginality = async (caption: string, topic: string): Promise<{ score: number; issue: string | null }> => {
  const topPerformers = getTopPerformers(undefined, 6);
  if (topPerformers.length < 3) return { score: 16, issue: null }; // Sin datos suficientes

  const recentHooks = topPerformers.map((p) => p.hookText).join(' | ');
  const recentTopics = topPerformers.map((p) => p.topics.join(',')).join(' | ');
  const newHook = caption.split('\n')[0] ?? '';

  const prompt = `Evaluá si este nuevo contenido es ORIGINAL vs. los últimos posts de la misma cuenta.

NUEVO hook: "${newHook}"
NUEVO tema: "${topic}"

POSTS RECIENTES (hooks y temas):
${recentHooks}
---
${recentTopics}

Respondé SOLO con: ORIGINAL o REPETIDO, seguido de una razón de máximo 8 palabras.`;

  try {
    const result = await routerAsk(prompt, { taskType: 'analysis', freeOnly: true });
    const isOriginal = /^ORIGINAL/i.test(result.text.trim());
    const reason = result.text.replace(/^(ORIGINAL|REPETIDO)[,: ]*/i, '').trim();
    return {
      score: isOriginal ? 20 : 7,
      issue: isOriginal ? null : `Contenido repetido reciente: ${reason}. Buscá un ángulo diferente.`,
    };
  } catch {
    return { score: 15, issue: null };
  }
};

// ── Función principal ────────────────────────────────────────────────────────

export const scoreContent = async (content: ContentToScore): Promise<ContentScoreResult> => {
  log.debug(`[ContentScorer] Evaluando "${content.topic}" (${content.format})...`);
  const t0 = Date.now();

  const [hookR, ctaR, readR, htR, origR, tasteR] = await Promise.all([
    Promise.resolve(evalHook(content.caption)),
    Promise.resolve(evalCTA(content.caption, content.hasCTA)),
    Promise.resolve(evalReadability(content.caption)),
    Promise.resolve(evalHashtags(content.hashtags)),
    evalOriginality(content.caption, content.topic),
    evalTaste(content.tasteInput),
  ]);

  const dimensions: ScoreDimensions = {
    hook: hookR.score,
    cta: ctaR.score,
    readability: readR.score,
    hashtags: htR.score,
    originality: origR.score,
    taste: tasteR.score,
  };

  const overall = Math.round((Object.values(dimensions).reduce((a, b) => a + b, 0) / 120) * 100);
  const approved = overall >= 65;
  const feedback = [hookR.issue, ctaR.issue, readR.issue, htR.issue, origR.issue, tasteR.issue].filter(
    (f): f is string => f !== null,
  );

  // Predicción basada en benchmarks históricos
  const benchmarks = getBenchmarks();
  const bm = benchmarks[content.format];
  const multiplier = bm.sampleSize >= 3 ? overall / 70 : 1;
  const prediction =
    bm.sampleSize >= 3
      ? {
          expectedEngagementRate: `${(bm.avgEngagementRate * multiplier * 0.8).toFixed(1)}-${(bm.avgEngagementRate * multiplier * 1.3).toFixed(1)}%`,
          estimatedReach: `${Math.round((bm.avgReach * multiplier * 0.7) / 1000)}K-${Math.round((bm.avgReach * multiplier * 1.3) / 1000)}K`,
          viralPotential: (overall >= 80 ? 'alto' : overall >= 65 ? 'medio' : 'bajo') as 'bajo' | 'medio' | 'alto',
        }
      : {
          expectedEngagementRate: 'Sin datos históricos suficientes',
          estimatedReach: 'Sin datos históricos suficientes',
          viralPotential: (overall >= 80 ? 'alto' : overall >= 65 ? 'medio' : 'bajo') as 'bajo' | 'medio' | 'alto',
        };

  const improvementPrompt =
    feedback.length > 0
      ? `Mejorá este caption de Instagram aplicando EXACTAMENTE estos cambios (uno por uno):\n${feedback.map((f, i) => `${i + 1}. ${f}`).join('\n')}\n\nCaption a mejorar:\n${content.caption}\n\nDevolvé SOLO el caption mejorado, sin explicaciones ni comentarios.`
      : 'El contenido cumple todos los estándares. Listo para publicar.';

  log.info(`[ContentScorer] Score: ${overall}/100 | ${approved ? '✅ APROBADO' : '❌ REVISAR'} | ${Date.now() - t0}ms`);
  return { overall, dimensions, approved, feedback, improvementPrompt, prediction };
};

/**
 * Evalúa el contenido y, si no pasa, lo mejora automáticamente hasta `maxIterations` veces.
 * Devuelve el mejor resultado logrado y cuántas iteraciones tomó.
 */
export const scoreAndImprove = async (
  content: ContentToScore,
  maxIterations = 2,
): Promise<{ finalContent: ContentToScore; finalScore: ContentScoreResult; iterations: number }> => {
  let current = { ...content };
  let currentScore = await scoreContent(current);
  let iterations = 0;

  while (!currentScore.approved && iterations < maxIterations && currentScore.feedback.length > 0) {
    log.info(
      `[ContentScorer] Mejorando caption (iteración ${iterations + 1}, score actual: ${currentScore.overall})...`,
    );

    const improved = await routerAsk(currentScore.improvementPrompt, {
      taskType: 'copywriting',
      freeOnly: false,
      maxTokens: 2000,
    });

    current = { ...current, caption: improved.text.trim() };
    currentScore = await scoreContent(current);
    iterations++;
  }

  return { finalContent: current, finalScore: currentScore, iterations };
};
