/**
 * Scarcity Engine — Genera urgencia automática sin ser agresivo
 */

import { askJson } from '../../agent/claude.js';
import { brandContext } from '../../agent/memory.js';
import type { BrandProfile } from '../../config/types.js';

export interface ScarcityCampaign {
  id: string;
  type: 'countdown' | 'limited_spots' | 'deadline' | 'flash';
  headline: string;
  body: string;
  cta: string;
  urgencyLevel: 'bajo' | 'medio' | 'alto';
  platforms: ('feed' | 'story' | 'reel' | 'dm')[];
  durationHours: number;
}

const generateId = (): string => `scarcity-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`;

export const generateScarcityCampaign = async (brand: BrandProfile, context?: string): Promise<ScarcityCampaign> => {
  const prompt = `Sos un copywriter de conversión. Creá una campaña de escasez/urgencia para Instagram.

${brandContext(brand)}

Contexto adicional: ${context ?? 'Lanzamiento general'}

Reglas:
- NUNCA mentir sobre disponibilidad (si dice "solo 5 lugares", deben existir)
- Usar urgencia REAL: deadlines reales, stock real, capacidad real
- Tono alineado con la voz de marca
- Que no suene a infomercial

JSON:
{
  "type": "countdown|limited_spots|deadline|flash",
  "headline": "hook principal (máx 8 palabras)",
  "body": "texto del post/story (máx 3 oraciones)",
  "cta": "call to action específico",
  "urgencyLevel": "bajo|medio|alto",
  "platforms": ["feed", "story", "reel", "dm"],
  "durationHours": 24
}`;
  const result = await askJson<Omit<ScarcityCampaign, 'id'>>(prompt, { maxTokens: 1500 });
  return { ...result, id: generateId() };
};

export const generateCountdownSequence = async (
  brand: BrandProfile,
  eventName: string,
  launchDate: string,
): Promise<ScarcityCampaign[]> => {
  const prompt = `Sos un launch strategist. Creá una secuencia de countdown para un lanzamiento.

${brandContext(brand)}

Evento: ${eventName}
Fecha de lanzamiento: ${launchDate}

Generá 4 posts de countdown:
- D-7: "Se viene algo"
- D-3: "En 3 días"
- D-1: "Mañana"
- D-Day: "Ya está acá"

JSON: array de 4 objetos con type=countdown, headline, body, cta, platforms, durationHours
`;
  const results = await askJson<ScarcityCampaign[]>(prompt, { maxTokens: 2500 });
  return results.map((r) => ({ ...r, id: generateId() }));
};
