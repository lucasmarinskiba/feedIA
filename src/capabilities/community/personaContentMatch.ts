/**
 * Persona Content Match — Sugiere qué contenido crear para cada persona
 */

import { askJson } from '../../agent/claude.js';
import { brandContext } from '../../agent/memory.js';
import type { BrandProfile } from '../../config/types.js';
import type { AudiencePersona } from './audienceSegmentation.js';

export interface ContentForPersona {
  personaName: string;
  contentIdeas: { title: string; format: string; angle: string; cta: string }[];
  postingFrequency: string;
  bestFormat: string;
  keyMessage: string;
}

export const matchContentToPersonas = async (
  brand: BrandProfile,
  personas: AudiencePersona[],
): Promise<ContentForPersona[]> => {
  const prompt = `Sos un content strategist. Asigná ideas de contenido específicas para cada persona.

${brandContext(brand)}

Personas:
${personas.map((p) => `- ${p.name}: ${p.description}. Le interesa: ${p.contentPreferences.join(', ')}`).join('\n')}

Para cada persona, generá:
- 3 ideas de contenido específicas
- Frecuencia ideal de publicación
- Formato que mejor resuena
- Key message central

JSON: array de ContentForPersona
`;
  return askJson<ContentForPersona[]>(prompt, { maxTokens: 3000 });
};

export const adaptPostForPersona = async (
  brand: BrandProfile,
  postTopic: string,
  personaName: string,
): Promise<{ angle: string; hook: string; cta: string; toneNote: string }> => {
  const prompt = `Sos un copywriter. Adaptá un post para una persona específica.

${brandContext(brand)}

Tema: ${postTopic}
Persona objetivo: ${personaName}

JSON:
{
  "angle": "ángulo específico para esta persona",
  "hook": "hook que le haga parar el scroll",
  "cta": "call to action que resuene con ella",
  "toneNote": "ajuste de tono necesario"
}`;
  return askJson<{ angle: string; hook: string; cta: string; toneNote: string }>(prompt, { maxTokens: 1500 });
};
