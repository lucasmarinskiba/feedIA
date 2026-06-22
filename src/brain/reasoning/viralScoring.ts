// @ts-nocheck
/**
 * Viral Scoring — Predice el potencial viral de contenido
 * Usa patrones aprendidos + heurísticas + memoria del cerebro
 */

import { log } from '../../agent/logger.js';
import * as semantic from '../memory/semanticMemory.js';
// import * as graph from '../memory/knowledgeGraph.js'; // reserved for graph-based viral scoring

export interface ViralPrediction {
  score: number; // 0-1
  breakdown: Record<string, number>;
  reasoning: string[];
  similarPast: { content: string; actualEngagement: number }[];
  suggestions: string[];
}

export const predictViralPotential = async (
  content: string,
  niche: string,
  format?: string,
): Promise<ViralPrediction> => {
  const breakdown: Record<string, number> = {};
  const reasoning: string[] = [];
  const suggestions: string[] = [];

  // 1. Hook strength
  const hookScore = scoreHook(content);
  breakdown.hook = hookScore;
  if (hookScore > 0.7) reasoning.push('Hook fuerte detectado');
  else if (hookScore < 0.4) suggestions.push('Agregar hook emocional en los primeros 3 segundos');

  // 2. Format match
  const formatScore = await scoreFormat(content, niche, format);
  breakdown.format = formatScore;
  if (formatScore > 0.7) reasoning.push('Formato alineado con lo que funciona');
  else suggestions.push('Experimentar con formatos probados: listas, preguntas, storytelling');

  // 3. Emotional trigger
  const emotionScore = scoreEmotion(content);
  breakdown.emotion = emotionScore;
  if (emotionScore > 0.7) reasoning.push('Trigger emocional presente');
  else suggestions.push('Incluir trigger emocional: curiosidad, FOMO, identidad, utilidad');

  // 4. Hashtag/topic relevance
  const topicScore = await scoreTopic(content, niche);
  breakdown.topic = topicScore;
  if (topicScore > 0.7) reasoning.push('Tema alineado con tendencias del nicho');
  else suggestions.push('Conectar con trending topics del nicho');

  // 5. Length optimization
  const lengthScore = scoreLength(content);
  breakdown.length = lengthScore;
  if (lengthScore < 0.5) suggestions.push(content.length > 500 ? 'Reducir longitud' : 'Expandir el mensaje');

  // 6. CTA presence
  const ctaScore = scoreCTA(content);
  breakdown.cta = ctaScore;
  if (ctaScore < 0.5) suggestions.push('Agregar CTA claro');

  // 7. Similar past performance
  const similar = await findSimilar(content, niche);
  breakdown.history = similar.length > 0 ? similar.reduce((s, p) => s + p.actualEngagement, 0) / similar.length : 0.5;

  // Weighted total
  const weights = { hook: 0.25, format: 0.2, emotion: 0.2, topic: 0.15, length: 0.1, cta: 0.1 };
  let total = 0;
  for (const [key, weight] of Object.entries(weights)) {
    total += (breakdown[key] ?? 0.5) * weight;
  }
  // Adjust by history
  total = total * 0.7 + (breakdown.history ?? 0.5) * 0.3;

  const score = Math.max(0, Math.min(1, total));

  log.info(`[ViralScoring] Score=${score.toFixed(2)} for ${niche}`);

  return {
    score,
    breakdown,
    reasoning,
    similarPast: similar.slice(0, 3),
    suggestions,
  };
};

// ── Scoring functions ───────────────────────────────────────────────────────

const scoreHook = (content: string): number => {
  const hooks = [
    { pattern: /^\d+\s+(cosas|razones|maneras|tips|trucos|errores|secretos)/i, score: 0.9 },
    { pattern: /^(nadie|nadie te|nadie te dice|el secreto|la verdad|lo que)/i, score: 0.85 },
    { pattern: /^(¿por qué|cómo|qué pasa si|imagina|recuerda)/i, score: 0.8 },
    { pattern: /^(stop|detente|ojo|atención|⚠️|🔥)/i, score: 0.75 },
    { pattern: /^(estoy|me pasó|hace|ayer|el otro día)/i, score: 0.7 },
    { pattern: /\?/g, score: 0.6 },
  ];
  for (const h of hooks) {
    if (h.pattern.test(content)) return h.score;
  }
  return 0.4;
};

const scoreFormat = async (content: string, niche: string, format?: string): Promise<number> => {
  // Check what formats work in this niche
  const results = await semantic.recall(`patrón format ${niche}`, 5, ['learning']);
  let score = 0.5;
  for (const r of results) {
    if (
      r.entry.metadata.patternType === 'format' &&
      content.toLowerCase().includes(String(r.entry.metadata.pattern ?? '').toLowerCase())
    ) {
      score = Math.max(score, 0.6 + r.entry.importance * 0.3);
    }
  }
  if (format) {
    const formatBonus = { carousel: 0.8, reel: 0.85, story: 0.6, carrusel: 0.8, 'video-corto': 0.85 };
    score = Math.max(score, formatBonus[format as keyof typeof formatBonus] ?? 0.5);
  }
  return score;
};

const scoreEmotion = (content: string): number => {
  const triggers = [
    { pattern: /\b(curiosidad|secreto|nunca|nadie)\b/gi, weight: 0.3 },
    { pattern: /\b(fomo|miedo|perder|antes de que|última)\b/gi, weight: 0.3 },
    { pattern: /\b(identidad|tú eres|si eres|como tú|gente como)\b/gi, weight: 0.2 },
    { pattern: /\b(guía|paso a paso|cómo|tutorial|aprender)\b/gi, weight: 0.15 },
    { pattern: /\b(storytelling|historia|me pasó|cuando)\b/gi, weight: 0.15 },
  ];
  let score = 0.3;
  for (const t of triggers) {
    const matches = content.toLowerCase().match(t.pattern)?.length ?? 0;
    score += Math.min(t.weight, matches * 0.1);
  }
  return Math.min(1, score);
};

const scoreTopic = async (content: string, niche: string): Promise<number> => {
  const trends = await semantic.recall(niche, 5, ['trend']);
  let score = 0.5;
  for (const t of trends) {
    const topic = (t.entry.metadata.topic as string) ?? '';
    if (topic && content.toLowerCase().includes(topic.toLowerCase())) {
      score = Math.max(score, 0.5 + t.entry.importance * 0.4);
    }
  }
  return score;
};

const scoreLength = (content: string): number => {
  const len = content.length;
  // Instagram caption sweet spot: 150-300 chars, or 1300-2200 for carousels
  if (len >= 150 && len <= 300) return 0.85;
  if (len >= 1300 && len <= 2200) return 0.9;
  if (len > 2200) return 0.6;
  if (len < 50) return 0.4;
  return 0.7;
};

const scoreCTA = (content: string): number => {
  const ctas = /\b(doble tap|guarda|comparte|comenta|sígueme|link|bio|desliza|swipe)\b/gi;
  const matches = content.toLowerCase().match(ctas)?.length ?? 0;
  return Math.min(1, 0.3 + matches * 0.3);
};

const findSimilar = async (
  content: string,
  niche: string,
): Promise<{ content: string; actualEngagement: number }[]> => {
  const results = await semantic.recall(content, 5, ['post', 'learning']);
  return results
    .filter((r) => r.entry.metadata.niche === niche && r.entry.metadata.engagement !== undefined)
    .map((r) => ({
      content: r.entry.content.slice(0, 100),
      actualEngagement: Number(r.entry.metadata.engagement ?? 0),
    }));
};

// Batch score multiple content options
export const rankContentOptions = async (
  options: { content: string; format?: string }[],
  niche: string,
): Promise<{ option: (typeof options)[0]; prediction: ViralPrediction; rank: number }[]> => {
  const scored = await Promise.all(
    options.map(async (opt) => ({
      option: opt,
      prediction: await predictViralPotential(opt.content, niche, opt.format),
    })),
  );

  scored.sort((a, b) => b.prediction.score - a.prediction.score);

  return scored.map((s, i) => ({ ...s, rank: i + 1 }));
};
