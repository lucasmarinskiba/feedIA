/**
 * Countdown Engine — Genera countdowns y teasers automatizados
 */

import { askJson } from '../../agent/claude.js';
import { brandContext } from '../../agent/memory.js';
import type { BrandProfile } from '../../config/types.js';

export interface CountdownPost {
  day: number;
  label: string;
  copy: string;
  visualIdea: string;
  storyPoll?: { question: string; options: string[] };
  cta: string;
}

export const generateCountdownSequence = async (
  brand: BrandProfile,
  eventName: string,
  daysUntil: number,
): Promise<CountdownPost[]> => {
  const prompt = `Sos un launch copywriter. Creá una secuencia de countdown para un evento.

${brandContext(brand)}

Evento: ${eventName}
Días hasta el lanzamiento: ${daysUntil}

Generá posts para los días clave: D-${daysUntil}, D-${Math.ceil(daysUntil / 2)}, D-3, D-1, D-Day.
Cada uno debe aumentar la urgencia y el FOMO.

JSON: array de posts countdown:
[
  {
    "day": 7,
    "label": "D-7",
    "copy": "texto del post/story",
    "visualIdea": "idea visual",
    "storyPoll": { "question": "pregunta", "options": ["op1", "op2"] },
    "cta": "call to action"
  }
]`;
  return askJson<CountdownPost[]>(prompt, { maxTokens: 3000 });
};

export const generateTeaserDrop = async (
  brand: BrandProfile,
  eventName: string,
): Promise<{ teaser: string; reveal: string; afterReveal: string }> => {
  const prompt = `Sos un teaser specialist. Creá un "drop" de contenido para Instagram.

${brandContext(brand)}

Evento/producto: ${eventName}

Reglas:
- Fase 1 (teaser): genera curiosidad MÁXIMA sin revelar nada
- Fase 2 (reveal): el momento de la verdad, que se sienta grande
- Fase 3 (after reveal): qué hacer después para mantener momentum

JSON:
{
  "teaser": "texto/story de teaser",
  "reveal": "texto/story de revelación",
  "afterReveal": "siguiente paso para mantener engagement"
}`;
  return askJson<{ teaser: string; reveal: string; afterReveal: string }>(prompt, { maxTokens: 1500 });
};
