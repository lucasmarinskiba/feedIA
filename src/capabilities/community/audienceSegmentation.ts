/**
 * Audience Segmentation — Segmenta la audiencia en personas concretas
 */

import { askJson } from '../../agent/claude.js';
import { brandContext } from '../../agent/memory.js';
import type { BrandProfile } from '../../config/types.js';

export interface AudiencePersona {
  name: string;
  emoji: string;
  description: string;
  painPoints: string[];
  goals: string[];
  contentPreferences: string[];
  interactionStyle: string;
  estimatedPercentage: string;
}

export const segmentAudience = async (brand: BrandProfile): Promise<AudiencePersona[]> => {
  const prompt = `Sos un audience strategist. Segmentá la audiencia de Instagram de esta marca en 3-4 personas concretas.

${brandContext(brand)}

Reglas:
- Usar nombres descriptivos (ej: "La Curiosa", "La Compradora", "La Promotora")
- Cada persona debe ser RECONOCIBLE en los comentarios/DMs
- Incluir pain points y goals específicos
- Qué tipo de contenido prefiere cada una
- Cómo interactúa (comenta, guarda, comparte, compra)

JSON: array de personas:
[
  {
    "name": "nombre descriptivo",
    "emoji": "emoji representativo",
    "description": "quién es en 2 oraciones",
    "painPoints": ["dolor 1", "dolor 2"],
    "goals": ["objetivo 1", "objetivo 2"],
    "contentPreferences": ["tipo de contenido favorito"],
    "interactionStyle": "cómo interactúa en IG",
    "estimatedPercentage": "ej: 30-40%"
  }
]`;
  return askJson<AudiencePersona[]>(prompt, { maxTokens: 2500 });
};

export const analyzePersonaJourney = async (
  brand: BrandProfile,
  personaName: string,
): Promise<{ touchpoints: string[]; conversionBlocker: string; opportunity: string }> => {
  const prompt = `Sos un customer journey analyst. Mapeá el journey de la persona "${personaName}" en Instagram.

${brandContext(brand)}

JSON:
{
  "touchpoints": ["primer contacto", "engagement", "consideración", "acción"],
  "conversionBlocker": "qué la frena",
  "opportunity": "dónde hay mayor oportunidad de conversión"
}`;
  return askJson<{ touchpoints: string[]; conversionBlocker: string; opportunity: string }>(prompt, {
    maxTokens: 1500,
  });
};
