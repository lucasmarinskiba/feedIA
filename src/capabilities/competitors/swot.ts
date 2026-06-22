/**
 * swot.ts — Análisis SWOT automatizado de competidores
 * ─────────────────────────────────────────────────────────────────────────
 * Genera fortalezas, debilidades, oportunidades y amenazas de cada rival
 * usando datos reales + LLM.
 */

import { askJson } from '../../agent/claude.js';
import { brandContext } from '../../agent/memory.js';
import type { BrandProfile } from '../../config/types.js';
import type { CompetitorSnapshot } from '../../integrations/competitors.js';

export interface CompetitorSwot {
  handle: string;
  fortalezas: string[];
  debilidades: string[];
  oportunidades: string[];
  amenazas: string[];
  score: number; // 0-100, competitividad estimada
}

export const analyzeSwot = async (brand: BrandProfile, snapshot: CompetitorSnapshot): Promise<CompetitorSwot> => {
  const prompt = `Actuá como estratega de Instagram. Hacé un SWOT de este competidor basado en datos reales.

${brandContext(brand)}

COMPETIDOR: @${snapshot.handle}
- Followers: ${snapshot.followers ?? 'N/A'}
- Posts: ${snapshot.postsCount ?? 'N/A'}
- Engagement rate: ${snapshot.engagementRate?.toFixed(2) ?? 'N/A'}%
- Avg likes: ${snapshot.avgLikes ?? 'N/A'}
- Avg comments: ${snapshot.avgComments ?? 'N/A'}
- Top hashtags: ${snapshot.topHashtags?.join(', ') ?? 'N/A'}
- Top posts: ${snapshot.topPosts?.map((p) => `${p.likes} likes — ${p.caption.slice(0, 60)}`).join('\n') ?? 'N/A'}

Devolvé JSON:
{
  "fortalezas": ["máx 3, concretas, basadas en datos"],
  "debilidades": ["máx 3, concretas, basadas en datos"],
  "oportunidades": ["máx 2, accionables para la marca"],
  "amenazas": ["máx 2, concretas"],
  "score": número 0-100 de qué tan difícil es competir contra ellos
}`;

  const result = await askJson<{
    fortalezas: string[];
    debilidades: string[];
    oportunidades: string[];
    amenazas: string[];
    score: number;
  }>(prompt, { maxTokens: 2500 });

  return {
    handle: snapshot.handle,
    fortalezas: result.fortalezas,
    debilidades: result.debilidades,
    oportunidades: result.oportunidades,
    amenazas: result.amenazas,
    score: Math.max(0, Math.min(100, result.score)),
  };
};
