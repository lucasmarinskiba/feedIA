/**
 * Anticipation Engine — Build-up progresivo que crea tensión antes del reveal
 * "Mañana sale algo", "En 48h se viene", "Preparate para el miércoles"
 */

import { askJson } from '../../agent/claude.js';
import { brandContext } from '../../agent/memory.js';
import type { BrandProfile } from '../../config/types.js';

export interface AnticipationBeat {
  day: number;
  copy: string;
  visualIdea: string;
  storyOnly: boolean;
  urgencyLevel: 'mild' | 'medium' | 'high' | 'peak';
  cta: string;
}

export interface AnticipationArc {
  eventName: string;
  totalDays: number;
  beats: AnticipationBeat[];
  peakMoment: string;
  whyCantMiss: string;
}

export const designAnticipationArc = async (
  brand: BrandProfile,
  eventName: string,
  days = 7,
): Promise<AnticipationArc> => {
  const prompt = `Sos un anticipation strategist. Diseñá un arco de expectativa de ${days} días para un evento.

${brandContext(brand)}

Evento: ${eventName}
Duración del build-up: ${days} días

Reglas:
- Cada "beat" debe aumentar la tensión progresivamente
- Los primeros días son misteriosos, los últimos son urgentes
- Incluir al menos 2 story-only beats (contenido que no va al feed, genera FOMO en stories)
- El peak moment debe ser IMPERDIBLE
- Usar técnicas: partial reveal, behind-the-scenes, "algunos ya saben", countdown stickers

JSON:
{
  "eventName": "nombre del evento",
  "totalDays": ${days},
  "beats": [
    {
      "day": 1,
      "copy": "texto del post/story",
      "visualIdea": "idea visual",
      "storyOnly": true|false,
      "urgencyLevel": "mild|medium|high|peak",
      "cta": "call to action"
    }
  ],
  "peakMoment": "descripción del momento climax",
  "whyCantMiss": "por qué ES IMPOSIBLE no estar ahí"
}`;
  return askJson<AnticipationArc>(prompt, { maxTokens: 3500 });
};

export const generateDailyTeaser = async (
  brand: BrandProfile,
  eventName: string,
  day: number,
  totalDays: number,
): Promise<{ copy: string; visual: string; storyHook: string }> => {
  const progress = Math.round((day / totalDays) * 100);
  const prompt = `Sos un teaser copywriter. Generá el teaser del día ${day} de ${totalDays} para "${eventName}".

${brandContext(brand)}

Progreso: ${progress}%. El evento está cada vez más cerca.

Reglas:
- Que genere ansiedad positiva (no estrés)
- Que recompense a quienes siguen desde el día 1
- Que haga sentir EXCLUIDOS a quienes llegan tarde

JSON:
{
  "copy": "texto del post/story",
  "visual": "descripción visual",
  "storyHook": "hook específico para stories"
}`;
  return askJson<{ copy: string; visual: string; storyHook: string }>(prompt, { maxTokens: 1500 });
};
