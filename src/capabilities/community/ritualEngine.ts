/**
 * Ritual Engine — Crea rituales recurrentes para la comunidad
 */

import { askJson } from '../../agent/claude.js';
import { brandContext } from '../../agent/memory.js';
import type { BrandProfile } from '../../config/types.js';

export interface Ritual {
  id: string;
  name: string;
  day: string;
  time?: string;
  format: 'story' | 'post' | 'live' | 'dm' | 'reel';
  description: string;
  contentIdea: string;
  cta: string;
  expectedEngagement: string;
}

const generateId = (): string => `ritual-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`;

export const generateRituals = async (brand: BrandProfile): Promise<Ritual[]> => {
  const prompt = `Sos un community builder. Diseñá 3-4 rituales semanales para esta comunidad de Instagram.

${brandContext(brand)}

Reglas:
- Un ritual es algo que la comunidad espera y reconoce
- Debe ser recurrente (mismo día, misma dinámica)
- Que la comunidad PARTICIPE, no solo consuma
- Nombres pegadizos y propios de la marca
- No más de 1 ritual por día

JSON: array de rituales:
[
  {
    "name": "nombre del ritual",
    "day": "Lunes|Martes|Miércoles|Jueves|Viernes|Sábado|Domingo",
    "time": "hora sugerida (opcional)",
    "format": "story|post|live|dm|reel",
    "description": "qué es y por qué importa",
    "contentIdea": "idea concreta de contenido",
    "cta": "cómo participa la comunidad",
    "expectedEngagement": "qué tipo de interacción genera"
  }
]`;
  const results = await askJson<Omit<Ritual, 'id'>[]>(prompt, { maxTokens: 2500 });
  return results.map((r) => ({ ...r, id: generateId() }));
};

export const planRitualContent = async (
  brand: BrandProfile,
  ritualName: string,
): Promise<{ thisWeek: string[]; template: string }> => {
  const prompt = `Sos un content planner. Planificá contenido para el ritual "${ritualName}".

${brandContext(brand)}

Generá:
- 4 ideas de contenido (una por semana del mes)
- 1 template reutilizable

JSON:
{
  "thisWeek": ["idea semana 1", "idea semana 2", "idea semana 3", "idea semana 4"],
  "template": "estructura reutilizable para cada edición"
}`;
  return askJson<{ thisWeek: string[]; template: string }>(prompt, { maxTokens: 1500 });
};
