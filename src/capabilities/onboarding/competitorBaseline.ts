/**
 * CompetitorBaseline — análisis inicial de competidores para una marca.
 *
 * En esta fase no tenemos scraper propio, por lo que el análisis es una
 * combinación de plantilla contextual + enriquecimiento vía Claude cuando
 * la API key está disponible. Sirve para sentar la línea base antes de
 * empezar a publicar.
 */

import { askJson, hasApiKey } from '../../agent/claude.js';
import type { BrandProfile } from '../../config/types.js';

export interface CompetitorProfile {
  handle: string;
  estimatedPostFrequency: string;
  topFormats: string[];
  topHashtags: string[];
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
}

export interface CompetitorBaseline {
  niche: string;
  competitors: CompetitorProfile[];
  commonPatterns: string[];
  gaps: string[];
  recommendations: string[];
}

const analyzeWithClaude = async (
  brand: BrandProfile,
  competitors: string[],
): Promise<CompetitorBaseline> => {
  const prompt = `Actuá como analista de competencia de Instagram.

MARCA: ${brand.name}
NICHO: ${brand.niche}
AUDIENCIA: ${brand.audience.description}
OBJETIVO: ${brand.goals.primary}
COMPETIDORES A ANALIZAR: ${competitors.join(', ')}

Si no tenés datos reales de los competidores, inferí un análisis plausible basado en el nicho y la audiencia. Generá un baseline estratégico con:
1. Perfil por competidor (frecuencia estimada, formatos, hashtags, fortalezas, debilidades, oportunidades).
2. Patrones comunes en el nicho.
3. Gaps oportunidad para la marca.
4. 3-5 recomendaciones accionables.

Formato JSON:
{
  "niche": "string",
  "competitors": [
    {
      "handle": "string",
      "estimatedPostFrequency": "string",
      "topFormats": ["string"],
      "topHashtags": ["string"],
      "strengths": ["string"],
      "weaknesses": ["string"],
      "opportunities": ["string"]
    }
  ],
  "commonPatterns": ["string"],
  "gaps": ["string"],
  "recommendations": ["string"]
}`;
  return askJson<CompetitorBaseline>(prompt, { maxTokens: 5000 });
};

const baselineForHandle = (handle: string, niche: string): CompetitorProfile => ({
  handle,
  estimatedPostFrequency: '3-5 publicaciones por semana (estimado)',
  topFormats: ['reel', 'carrusel'],
  topHashtags: [`#${niche.replace(/\s+/g, '')}`, '#instagramtips', '#negocio'],
  strengths: ['Presencia establecida', 'Reconocimiento de marca'],
  weaknesses: ['Posible falta de diferenciación clara', 'Contenido genérico'],
  opportunities: ['Responder comentarios más rápido', 'Crear contenido educativo específico'],
});

export const analyzeCompetitors = async (
  brand: BrandProfile,
  competitors: string[],
): Promise<CompetitorBaseline> => {
  const handles = competitors.map((c) => c.replace(/^@/, '').trim()).filter(Boolean);

  if (hasApiKey() && handles.length > 0) {
    try {
      return await analyzeWithClaude(brand, handles);
    } catch {
      // fallback determinista
    }
  }

  return {
    niche: brand.niche,
    competitors: handles.map((h) => baselineForHandle(h, brand.niche)),
    commonPatterns: ['Publicaciones diarias de tips genéricos', 'Uso repetido de los mismos hashtags'],
    gaps: [
      'Pocos reels con storytelling de cliente',
      'Falta de contenido que responda objeciones de compra',
      'Poca interacción en comentarios',
    ],
    recommendations: [
      'Publicar 1 reel educativo por semana mínimo',
      'Crear carruseles que compare antes/después',
      'Responder todos los comentarios en las primeras 60 minutos',
    ],
  };
};
