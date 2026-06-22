/**
 * Highlight Strategy — Sugiere qué highlights crear, con qué nombre, qué orden
 */

import { askJson } from '../../agent/claude.js';
import { brandContext } from '../../agent/memory.js';
import type { BrandProfile } from '../../config/types.js';

export interface HighlightRecommendation {
  name: string;
  emoji: string;
  purpose: string;
  contentTypes: string[];
  priority: 'must_have' | 'recommended' | 'nice_to_have';
  order: number;
}

export const generateHighlightStrategy = async (brand: BrandProfile): Promise<HighlightRecommendation[]> => {
  const prompt = `Sos un Instagram strategist. Diseñá la estrategia de highlights para este perfil.

${brandContext(brand)}

Reglas:
- Máximo 5-7 highlights activos (lo que se ve sin scrollear)
- El orden importa: los primeros 3 son los más vistos
- Nombres cortos (1-2 palabras máx)
- Emojis relevantes pero no excesivos
- Cada highlight debe tener un propósito claro de conversión o comunidad

JSON: array ordenado de highlights:
[
  {
    "name": "nombre corto",
    "emoji": "emoji",
    "purpose": "para qué sirve este highlight",
    "contentTypes": ["qué tipo de stories guardar acá"],
    "priority": "must_have|recommended|nice_to_have",
    "order": 1
  }
]`;
  return askJson<HighlightRecommendation[]>(prompt, { maxTokens: 2500 });
};

export const suggestHighlightContent = async (
  brand: BrandProfile,
  highlightName: string,
): Promise<{ stories: string[]; coverIdea: string }> => {
  const prompt = `Sos un content strategist. Generá ideas de stories para un highlight de Instagram.

${brandContext(brand)}

Highlight: ${highlightName}

Reglas:
- 5 ideas de stories que podrían ir en este highlight
- Cada idea debe ser filmable hoy
- Incluir una idea para la portada del highlight

JSON:
{
  "stories": ["idea 1", "idea 2", "idea 3", "idea 4", "idea 5"],
  "coverIdea": "descripción de la imagen de portada"
}`;
  return askJson<{ stories: string[]; coverIdea: string }>(prompt, { maxTokens: 1500 });
};
