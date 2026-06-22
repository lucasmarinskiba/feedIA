/**
 * Disappearing Content — "Borro esto en 24h", "Screen record now"
 * Contenido efímero que genera urgencia de consumo INMEDIATA
 */

import { askJson } from '../../agent/claude.js';
import { brandContext } from '../../agent/memory.js';
import type { BrandProfile } from '../../config/types.js';

export interface DisappearingPiece {
  id: string;
  type: 'story' | 'reel' | 'post' | 'dm_exclusive' | 'close_friends';
  lifespanHours: number;
  hook: string;
  body: string;
  urgencyTrigger: string;
  savePrompt: string;
  whyDisappears: string;
}

const generateId = (): string => `disp-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`;

export const createDisappearingContent = async (brand: BrandProfile, topic?: string): Promise<DisappearingPiece[]> => {
  const prompt = `Sos un urgency content creator. Generá 3 piezas de contenido EFÍMERO.

${brandContext(brand)}

Tema: ${topic ?? 'adaptado al nicho'}

Reglas:
- Cada pieza debe tener una razón REAL para desaparecer (no "borro porque sí")
- El hook debe comunicar INMEDIATAMENTE que esto no va a durar
- Incluir un "save prompt" (pedir que guarden/compartan antes de que desaparezca)
- Mezclar formatos: stories, reels, posts, close friends
- NUNDA prometer algo y no cumplir (si dice "borro en 24h", debe borrarse)

JSON: array de 3 piezas:
[
  {
    "type": "story|reel|post|dm_exclusive|close_friends",
    "lifespanHours": 24,
    "hook": "hook que comunica urgencia",
    "body": "contenido valioso que justifica el consumo inmediato",
    "urgencyTrigger": "por qué desaparece (razón real)",
    "savePrompt": "pedido para guardar/compartir",
    "whyDisappears": "razón narrativa"
  }
]`;
  const results = await askJson<Omit<DisappearingPiece, 'id'>[]>(prompt, { maxTokens: 2500 });
  return results.map((r) => ({ ...r, id: generateId() }));
};

export const createEphemeralTutorial = async (brand: BrandProfile, skill: string): Promise<DisappearingPiece> => {
  const prompt = `Sos un educator. Creá un tutorial efímero: "${skill}".

${brandContext(brand)}

Reglas:
- El tutorial debe ser VALIOSO (no descarte)
- La razón de ser efímero: "esto es muy potente, no quiero que quede público para siempre"
- Que invite a screen-record o guardar

JSON:
{
  "type": "story|reel|post|dm_exclusive|close_friends",
  "lifespanHours": 24,
  "hook": "hook",
  "body": "body",
  "urgencyTrigger": "trigger",
  "savePrompt": "save prompt",
  "whyDisappears": "why"
}`;
  const result = await askJson<Omit<DisappearingPiece, 'id'>>(prompt, { maxTokens: 1500 });
  return { ...result, id: generateId() };
};
