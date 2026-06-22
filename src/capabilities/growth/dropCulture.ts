/**
 * Drop Culture — Lanzamientos tipo "drop" con stock/time limitado
 * Inspirado en Supreme, Nike SNKRS, artistas con merch limitado
 */

import { askJson } from '../../agent/claude.js';
import { brandContext } from '../../agent/memory.js';
import type { BrandProfile } from '../../config/types.js';

export interface Drop {
  id: string;
  name: string;
  type: 'product' | 'content' | 'access' | 'experience';
  quantity?: number;
  price?: string;
  windowHours: number;
  preDropHype: string[];
  dropCopy: string;
  soldOutCopy: string;
  restock?: boolean;
  exclusivity: 'public' | 'followers_only' | 'insiders_only' | 'first_come';
}

const generateId = (): string => `drop-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`;

export const designDrop = async (brand: BrandProfile, dropType?: Drop['type'], context?: string): Promise<Drop> => {
  const prompt = `Sos un drop strategist. Diseñá un lanzamiento tipo "drop" para Instagram.

${brandContext(brand)}

Tipo: ${dropType ?? 'adaptado al nicho'}
Contexto: ${context ?? 'Lanzamiento exclusivo'}

Reglas:
- La escasez DEBE ser real (si dice "solo 20", deben existir 20)
- La ventana de tiempo debe ser corta (1-48h máx)
- Pre-drop hype: 3 teasers antes del drop
- Que el sold-out se celebre (no se vea como fracaso)
- Exclusividad clara: ¿quién puede acceder?

JSON:
{
  "name": "nombre del drop",
  "type": "product|content|access|experience",
  "quantity": 20,
  "price": "precio o FREE",
  "windowHours": 24,
  "preDropHype": ["teaser 1", "teaser 2", "teaser 3"],
  "dropCopy": "texto del momento del drop",
  "soldOutCopy": "texto cuando se agota",
  "restock": false,
  "exclusivity": "public|followers_only|insiders_only|first_come"
}`;
  const result = await askJson<Omit<Drop, 'id'>>(prompt, { maxTokens: 2500 });
  return { ...result, id: generateId() };
};

export const designDropSeries = async (brand: BrandProfile, seriesName: string, dropCount = 3): Promise<Drop[]> => {
  const prompt = `Sos un drop strategist. Diseñá una serie de ${dropCount} drops escalonados.

${brandContext(brand)}

Serie: ${seriesName}

Reglas:
- Cada drop debe ser más exclusivo que el anterior
- El último drop es el "grail" (el más deseado)
- Que haya lore/narrativa entre drops
- Que la gente espere el próximo drop

JSON: array de ${dropCount} drops
`;
  const results = await askJson<Omit<Drop, 'id'>[]>(prompt, { maxTokens: 3000 });
  return results.map((r) => ({ ...r, id: generateId() }));
};

export const generateWaitlistCopy = async (
  brand: BrandProfile,
  dropName: string,
): Promise<{ joinCopy: string; reminderCopy: string; accessCopy: string }> => {
  const prompt = `Sos un copywriter. Escribí copy para una lista de espera de un drop.

${brandContext(brand)}
Drop: ${dropName}

JSON:
{
  "joinCopy": "texto para unirse a la lista",
  "reminderCopy": "texto de recordatorio 24h antes",
  "accessCopy": "texto cuando te toca el acceso"
}`;
  return askJson<{ joinCopy: string; reminderCopy: string; accessCopy: string }>(prompt, { maxTokens: 1500 });
};
