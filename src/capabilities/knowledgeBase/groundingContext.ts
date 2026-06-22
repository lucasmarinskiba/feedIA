/**
 * Grounding Context Builder
 * ─────────────────────────────────────────────────────────────────────────
 * Single entry-point every agent (or tool) calls to obtain the right slice
 * of knowledge for its task. Combines:
 *
 *   • Algorithm facts (static, curated)
 *   • Brand learnings (dynamic, per-brand)
 *   • Format specs (deterministic lookup)
 *
 * Returns a single prompt-ready text block + structured data the agent can
 * inspect programmatically. This is the "memory" that every autonomous
 * decision references, so behaviour is grounded and consistent across runs.
 */

import type { ContentFormat } from '../../config/types.js';
import {
  recallFacts,
  formatFactsAsPrompt,
  FORMAT_SPECS,
  type AlgorithmFact,
  type FactTopic,
  type Confidence,
} from './facts.js';
import {
  queryLearnings,
  formatLearningsAsPrompt,
  type BrandLearning,
  type LearningCategory,
} from './brandLearnings.js';

export interface GroundingParams {
  brandId: string;
  /** Free-text intent describing what the agent needs to do. */
  intent: string;
  /** Optional explicit topics to bias retrieval. */
  topics?: FactTopic[];
  /** Optional explicit categories of brand learnings. */
  learningCategories?: LearningCategory[];
  /** Format context if relevant. */
  format?: ContentFormat;
  /** Hard cap on combined facts + learnings returned. */
  maxFacts?: number;
  maxLearnings?: number;
  minConfidence?: Confidence;
}

export interface GroundingPayload {
  facts: AlgorithmFact[];
  learnings: BrandLearning[];
  formatSpec?: (typeof FORMAT_SPECS)[ContentFormat];
  promptBlock: string;
  keywordsExtracted: string[];
}

/**
 * Extract keywords from a free-text intent so we can do deterministic
 * keyword matching over the corpus.
 */
const extractKeywords = (intent: string): string[] => {
  // Light Spanish tokenizer; drop stop words and very short tokens.
  const stop = new Set([
    'el',
    'la',
    'los',
    'las',
    'un',
    'una',
    'unos',
    'unas',
    'de',
    'del',
    'al',
    'en',
    'por',
    'para',
    'con',
    'sin',
    'y',
    'o',
    'que',
    'qué',
    'como',
    'cómo',
    'es',
    'son',
    'esto',
    'este',
    'esta',
    'estos',
    'estas',
    'su',
    'sus',
    'mi',
    'mis',
    'tu',
    'tus',
    'me',
    'te',
    'se',
    'le',
    'les',
    'lo',
    'más',
    'muy',
    'también',
    'ya',
    'no',
    'sí',
    'si',
    'cuando',
    'donde',
    'dónde',
    'porque',
    'aunque',
  ]);
  return Array.from(
    new Set(
      intent
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter((w) => w.length >= 4 && !stop.has(w)),
    ),
  );
};

/**
 * Heuristic topic inference from intent text. Returns a small set the
 * fact retrieval ranks higher. Pure deterministic.
 */
const inferTopics = (intent: string): FactTopic[] => {
  const t = intent.toLowerCase();
  const topics: FactTopic[] = [];
  if (/\b(hook|gancho|primeros\s+\d+\s*s)\b/.test(t)) topics.push('hook-mechanics');
  if (/\b(caption|copy del post)\b/.test(t)) topics.push('caption-strategy');
  if (/\b(hashtag|tags|#)\b/.test(t)) topics.push('hashtag-strategy');
  if (/\b(horario|cuándo publicar|timing)\b/.test(t)) topics.push('timing-strategy');
  if (/\b(comentarios|comments|respuesta)\b/.test(t)) topics.push('comment-strategy');
  if (/\b(crecer|crecimiento|seguidores|growth)\b/.test(t)) topics.push('audience-growth');
  if (/\b(vender|venta|monetizar|conversión)\b/.test(t)) topics.push('monetization');
  if (/\b(shadowban|alcance bajo|reach)\b/.test(t)) topics.push('shadowban-trigger');
  if (/\b(reel|carrusel|stories|post)\b/.test(t)) topics.push('format-spec');
  if (/\b(algoritmo|ranking|señal|signal)\b/.test(t)) topics.push('ranking-signal');
  return topics.length > 0 ? topics : ['best-practice'];
};

export const buildGroundingContext = (params: GroundingParams): GroundingPayload => {
  const keywords = extractKeywords(params.intent);
  const topics = params.topics ?? inferTopics(params.intent);

  const facts = recallFacts({
    topics,
    keywords,
    format: params.format,
    limit: params.maxFacts ?? 6,
    minConfidence: params.minConfidence ?? 'media',
  });

  // For brand learnings, do one query per category if specified, otherwise
  // a single broad query. We bias the keyword list with the same extracted
  // keywords as the facts query so retrieval is consistent.
  const learningCategories = params.learningCategories;
  const learnings: BrandLearning[] = [];
  if (learningCategories && learningCategories.length > 0) {
    for (const cat of learningCategories) {
      learnings.push(
        ...queryLearnings({
          brandId: params.brandId,
          category: cat,
          keywords,
          limit: 3,
          minConfidence: params.minConfidence ?? 'media',
        }),
      );
    }
  } else {
    learnings.push(
      ...queryLearnings({
        brandId: params.brandId,
        keywords,
        limit: params.maxLearnings ?? 6,
        minConfidence: params.minConfidence ?? 'media',
      }),
    );
  }

  const formatSpec = params.format ? FORMAT_SPECS[params.format] : undefined;

  const formatSpecBlock = formatSpec
    ? `\n\nFORMAT SPEC (referencia técnica para ${formatSpec.format}):\n` +
      `• Aspect ratio: ${formatSpec.aspectRatio}\n` +
      (formatSpec.optimalDuration ? `• Duración óptima: ${formatSpec.optimalDuration}s\n` : '') +
      (formatSpec.optimalSlideCount
        ? `• Slides óptimas: ${formatSpec.optimalSlideCount.min}-${formatSpec.optimalSlideCount.max}\n`
        : '') +
      `• Caption visible sin "ver más": ${formatSpec.visibleCaptionChars} chars\n` +
      `• Mejores horarios LATAM: ${formatSpec.bestPostingHoursLATAM.join('h, ')}h\n` +
      `• Señales primarias del algoritmo: ${formatSpec.primaryRankingSignals.join(', ')}`
    : '';

  const promptBlock = formatFactsAsPrompt(facts) + formatLearningsAsPrompt(learnings) + formatSpecBlock;

  return {
    facts,
    learnings,
    formatSpec,
    promptBlock,
    keywordsExtracted: keywords,
  };
};
