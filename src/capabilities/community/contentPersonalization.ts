/**
 * Content Personalization — Adapta tone/angle según el segmento objetivo del post
 */

import { askJson } from '../../agent/claude.js';
import { brandContext } from '../../agent/memory.js';
import type { BrandProfile } from '../../config/types.js';

export interface PersonalizedVariant {
  segment: string;
  caption: string;
  hook: string;
  cta: string;
  hashtags: string[];
  whyItWorks: string;
}

export const generatePersonalizedVariants = async (
  brand: BrandProfile,
  postTopic: string,
  segments: string[],
): Promise<PersonalizedVariant[]> => {
  const prompt = `Sos un copywriter senior. Generá variantes de un mismo post para diferentes segmentos.

${brandContext(brand)}

Tema del post: ${postTopic}
Segmentos: ${segments.join(', ')}

Para cada segmento, generá una variante COMPLETA del post.

JSON: array de variantes:
[
  {
    "segment": "nombre del segmento",
    "caption": "caption completo adaptado",
    "hook": "primera línea/ hook",
    "cta": "call to action",
    "hashtags": ["#tag1", "#tag2"],
    "whyItWorks": "por qué esta variante resuena con este segmento"
  }
]`;
  return askJson<PersonalizedVariant[]>(prompt, { maxTokens: 3000 });
};

export const suggestSegmentRotation = async (
  brand: BrandProfile,
): Promise<{ weeklyPlan: string[]; rationale: string }> => {
  const prompt = `Sos un content strategist. Diseñá un plan semanal que rote entre segmentos de audiencia.

${brandContext(brand)}

JSON:
{
  "weeklyPlan": ["Lunes: segmento X", "Martes: segmento Y", ...],
  "rationale": "por qué este orden y frecuencia"
}`;
  return askJson<{ weeklyPlan: string[]; rationale: string }>(prompt, { maxTokens: 1500 });
};
