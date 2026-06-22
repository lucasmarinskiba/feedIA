/**
 * Social Proof Counters — Frases de urgencia basadas en comportamiento social
 * "Se unieron 47 personas hoy", "Quedan 3 lugares", "500+ ya lo vieron"
 */

import { askJson } from '../../agent/claude.js';
import { brandContext } from '../../agent/memory.js';
import type { BrandProfile } from '../../config/types.js';

export interface SocialCounter {
  context: string;
  counterPhrase: string;
  psychology: string;
  format: 'caption' | 'story_text' | 'reel_hook' | 'bio';
  ethical: boolean;
}

export const generateSocialCounters = async (brand: BrandProfile): Promise<SocialCounter[]> => {
  const prompt = `Sos un social proof copywriter. Generá 8 frases de contador social.

${brandContext(brand)}

Reglas ÉTICAS (INQUEBRANTABLES):
- NUNCA inventar números. Cada frase debe poder sustentarse con datos reales.
- "Se unieron 47 personas" → solo si realmente se unieron 47
- "Quedan 3 lugares" → solo si realmente quedan 3
- "500+ lo compartieron" → solo si 500+ lo compartieron
- Preferir frases que INVITAN a unirse, no que presionan con mentiras

Tipos de contadores:
1. Crecimiento en tiempo real (seguidores nuevos)
2. Escasez real (stock, cupos)
3. Social validation (compartidos, guardados)
4. Exclusividad ("sólo para los primeros X")
5. Urgencia temporal ("en las últimas 24h")

JSON: array de 8 contadores:
[
  {
    "context": "dónde se usa",
    "counterPhrase": "frase con número/contador",
    "psychology": "principio psicológico",
    "format": "caption|story_text|reel_hook|bio",
    "ethical": true
  }
]`;
  return askJson<SocialCounter[]>(prompt, { maxTokens: 2500 });
};

export const generateFomoBadge = async (
  brand: BrandProfile,
  badgeType: 'trending' | 'selling_fast' | 'almost_gone' | 'exclusive',
): Promise<{ badgeText: string; supportingCopy: string; colorSuggestion: string }> => {
  const prompt = `Sos un visual copywriter. Creá un "badge" de FOMO.

${brandContext(brand)}

Tipo de badge: ${badgeType}

JSON:
{
  "badgeText": "texto del badge (máx 3 palabras)",
  "supportingCopy": "copy que acompaña",
  "colorSuggestion": "color sugerido para el badge"
}`;
  return askJson<{ badgeText: string; supportingCopy: string; colorSuggestion: string }>(prompt, { maxTokens: 1000 });
};
