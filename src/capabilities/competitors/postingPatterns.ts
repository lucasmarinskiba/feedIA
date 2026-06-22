/**
 * postingPatterns.ts — Análisis de patrones de publicación de competidores
 * ─────────────────────────────────────────────────────────────────────────
 * Detecta: horarios preferidos, días de la semana, frecuencia, formatos,
 * y optimal posting windows basados en datos históricos.
 */

import { askJson } from '../../agent/claude.js';

export interface PostingPattern {
  handle: string;
  optimalDays: string[];
  optimalHours: number[];
  frequencyPerWeek: number;
  preferredFormat: 'reel' | 'carrusel' | 'post-imagen' | 'historia' | 'mix';
  consistencyScore: number; // 0-100
  insights: string[];
}

export const analyzePostingPatterns = async (
  handle: string,
  recentPosts: Array<{ caption?: string; timestamp?: string; format?: string }>,
): Promise<PostingPattern> => {
  const prompt = `Analizá los patrones de publicación de @${handle} basado en estos posts recientes.

POSTS:
${recentPosts.map((p, i) => `${i + 1}. ${p.timestamp ?? 'sin fecha'} | ${p.format ?? 'desconocido'} | ${(p.caption ?? '').slice(0, 80)}`).join('\n')}

Devolvé JSON:
{
  "optimalDays": ["lunes", "miércoles", etc.],
  "optimalHours": [19, 20, etc.],
  "frequencyPerWeek": número estimado,
  "preferredFormat": "reel|carrusel|post-imagen|historia|mix",
  "consistencyScore": 0-100,
  "insights": ["2-3 insights accionables sobre cuándo y qué publican"]
}`;

  const result = await askJson<{
    optimalDays: string[];
    optimalHours: number[];
    frequencyPerWeek: number;
    preferredFormat: 'reel' | 'carrusel' | 'post-imagen' | 'historia' | 'mix';
    consistencyScore: number;
    insights: string[];
  }>(prompt, { maxTokens: 2000 });

  return {
    handle,
    optimalDays: result.optimalDays,
    optimalHours: result.optimalHours,
    frequencyPerWeek: result.frequencyPerWeek,
    preferredFormat: result.preferredFormat,
    consistencyScore: Math.max(0, Math.min(100, result.consistencyScore)),
    insights: result.insights,
  };
};
