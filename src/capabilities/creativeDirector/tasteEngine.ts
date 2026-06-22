/**
 * Taste Engine — evaluación de buen gusto, originalidad y perfeccionismo
 * creativo para carruseles, reels y posts de Instagram.
 *
 * Combina análisis heurístico local (rápido, sin costo) con evaluación LLM
 * cuando hay presupuesto. En DRY_RUN devuelve un score simulado.
 */

import { env } from '../../config/index.js';
import { log } from '../../agent/logger.js';
import { askJson } from '../../agent/tokenRouter.js';
import { CREATIVE_DIRECTOR } from './creativePersonas.js';
import { formatPrinciplesForPrompt, CAROUSEL_PRINCIPLES } from './instagramCarouselPrinciples.js';
import { formatAestheticForPrompt, getAestheticByKeywords } from './pinterestAesthetics.js';
import type { CarruselResult } from '../content/carrusel.js';
import type { ReelScript } from '../content/reel.js';

export interface TasteDimensions {
  scrollStop: number; // 0-100
  visualCoherence: number;
  storytelling: number;
  shareability: number;
  originality: number;
  pinterestAesthetic: number;
}

export interface TasteScore {
  overall: number;
  dimensions: TasteDimensions;
  passed: boolean;
  insights: string[];
}

export interface TasteInput {
  contentType: 'carrusel' | 'reel' | 'post';
  topic: string;
  carrusel?: CarruselResult;
  reel?: ReelScript;
  brandName?: string;
  visualStyle?: string;
  palette?: string[];
}

const mockScore = (): TasteScore => ({
  overall: 78,
  passed: true,
  insights: ['DRY_RUN: puntuación simulada', 'En producción se evalúa con LLM + heurísticas'],
  dimensions: {
    scrollStop: 80,
    visualCoherence: 78,
    storytelling: 76,
    shareability: 79,
    originality: 75,
    pinterestAesthetic: 80,
  },
});

const heuristicScore = (input: TasteInput): Partial<TasteDimensions> => {
  const dims: Partial<TasteDimensions> = {};

  if (input.carrusel) {
    const slides = input.carrusel.slides;
    const first = slides[0];
    dims.scrollStop = first && first.titulo.split(/\s+/).length <= 8 ? 75 : 55;
    dims.storytelling = slides.length >= 5 && slides.length <= 10 ? 75 : 60;
    dims.shareability = input.carrusel.cta && !/seguime|guardá esto|link en bio/i.test(input.carrusel.cta) ? 72 : 55;
    dims.originality = input.topic.length > 10 ? 70 : 55;
  }

  if (input.reel) {
    dims.scrollStop = input.reel.hookVisual.split(/\s+/).length <= 8 ? 75 : 55;
    dims.storytelling = input.reel.duracionSegundos >= 15 && input.reel.duracionSegundos <= 45 ? 78 : 62;
    dims.shareability = input.reel.cta && !/seguime|guardá esto|link en bio/i.test(input.reel.cta) ? 72 : 55;
    dims.originality = 70;
  }

  dims.visualCoherence = input.palette && input.palette.length >= 2 ? 76 : 60;
  dims.pinterestAesthetic = input.visualStyle?.toLowerCase().includes('premium') || input.visualStyle?.toLowerCase().includes('minimal') ? 78 : 68;

  return dims;
};

const evaluateWithLLM = async (input: TasteInput): Promise<TasteScore> => {
  const heuristics = heuristicScore(input);
  const aesthetic = getAestheticByKeywords([input.visualStyle ?? '', ...(input.palette ?? [])]);

  const contentDesc = input.carrusel
    ? `Carrusel de ${input.carrusel.slides.length} slides.\nPortada: "${input.carrusel.slides[0]?.titulo ?? ''}".\nCTA: "${input.carrusel.cta}".\nCaption: "${input.carrusel.caption}".`
    : input.reel
      ? `Reel de ${input.reel.duracionSegundos}s.\nHook: "${input.reel.hookVisual}".\nCTA: "${input.reel.cta}".\nCaption: "${input.reel.caption}".`
      : `Post sobre: ${input.topic}`;

  const prompt = `${CREATIVE_DIRECTOR}

Evaluá el siguiente contenido de Instagram desde las 6 dimensiones del taste (0-100 cada una):
- scrollStop: ¿la portada/hook para el scroll y promete valor concreto?
- visualCoherence: ¿paleta, tipografía y grid coherentes?
- storytelling: ¿arco narrativo claro (gancho → tensión → insight → solución → CTA)?
- shareability: ¿guardable/compartible?
- originality: ¿ángulo único o cliché?
- pinterestAesthetic: ¿estética aspiracional al nivel Pinterest?

Contenido:
${contentDesc}

${formatPrinciplesForPrompt(CAROUSEL_PRINCIPLES.slice(0, 6))}
${formatAestheticForPrompt(aesthetic)}

Heurística local de referencia (no la copies, usala como contexto):
${JSON.stringify(heuristics, null, 2)}

Respondé SOLO con este JSON:
{
  "overall": número,
  "dimensions": { "scrollStop": n, "visualCoherence": n, "storytelling": n, "shareability": n, "originality": n, "pinterestAesthetic": n },
  "insights": ["insight 1", "insight 2"]
}`;

  try {
    const result = await askJson<TasteScore>(prompt, { taskType: 'analysis', maxTokens: 1500, freeOnly: true });
    return {
      ...result,
      passed: result.overall >= 75,
    };
  } catch (err) {
    log.warn(`[TasteEngine] LLM eval failed: ${(err as Error).message}. Fallback a heurística.`);
    const dims = {
      scrollStop: heuristics.scrollStop ?? 65,
      visualCoherence: heuristics.visualCoherence ?? 65,
      storytelling: heuristics.storytelling ?? 65,
      shareability: heuristics.shareability ?? 65,
      originality: heuristics.originality ?? 65,
      pinterestAesthetic: heuristics.pinterestAesthetic ?? 65,
    };
    const overall = Math.round(Object.values(dims).reduce((a, b) => a + b, 0) / 6);
    return { overall, passed: overall >= 75, dimensions: dims, insights: ['Fallback heurístico tras fallo LLM'] };
  }
};

export const evaluateTaste = async (input: TasteInput): Promise<TasteScore> => {
  if (env.dryRun) return mockScore();

  const heuristics = heuristicScore(input);
  const dims = {
    scrollStop: heuristics.scrollStop ?? 65,
    visualCoherence: heuristics.visualCoherence ?? 65,
    storytelling: heuristics.storytelling ?? 65,
    shareability: heuristics.shareability ?? 65,
    originality: heuristics.originality ?? 65,
    pinterestAesthetic: heuristics.pinterestAesthetic ?? 65,
  };
  const overall = Math.round(Object.values(dims).reduce((a, b) => a + b, 0) / 6);

  // Si la heurística ya es excelente, ahorramos LLM.
  if (overall >= 85) {
    return { overall, passed: true, dimensions: dims, insights: ['Heurística indica alto taste. Sin llamada LLM.'] };
  }

  return evaluateWithLLM(input);
};
