/**
 * Insider Content — Genera contenido exclusivo para fans leales
 */

import { askJson } from '../../agent/claude.js';
import { brandContext } from '../../agent/memory.js';
import type { BrandProfile } from '../../config/types.js';

export interface InsiderContent {
  id: string;
  title: string;
  format: 'story' | 'dm' | 'post' | 'live' | 'close_friends';
  exclusivity: 'early_access' | 'behind_scenes' | 'exclusive_tutorial' | 'members_only';
  description: string;
  teaserForPublic: string;
  accessMethod: string;
}

const generateId = (): string => `insider-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`;

export const generateInsiderContent = async (brand: BrandProfile): Promise<InsiderContent[]> => {
  const prompt = `Sos un community strategist. Diseñá contenido exclusivo para los fans más leales.

${brandContext(brand)}

Reglas:
- El contenido exclusivo debe sentirse PREMIUM, no descarte
- Debe crear deseo en quienes NO tienen acceso
- Métodos de acceso realistas (Close Friends, DM exclusivo, early drop)
- Mezclar formatos

JSON: array de 3-4 piezas de contenido insider:
[
  {
    "title": "título atractivo",
    "format": "story|dm|post|live|close_friends",
    "exclusivity": "early_access|behind_scenes|exclusive_tutorial|members_only",
    "description": "qué incluye",
    "teaserForPublic": "qué se muestra públicamente para generar FOMO",
    "accessMethod": "cómo acceden los elegidos"
  }
]`;
  const results = await askJson<Omit<InsiderContent, 'id'>[]>(prompt, { maxTokens: 2500 });
  return results.map((r) => ({ ...r, id: generateId() }));
};

export const createInsiderTeaser = async (
  brand: BrandProfile,
  insiderTitle: string,
): Promise<{ publicTeaser: string; insiderReveal: string }> => {
  const prompt = `Sos un copywriter. Creá un teaser público para contenido exclusivo.

Marca: ${brand.name} | Nicho: ${brand.niche}
Contenido exclusivo: ${insiderTitle}

Reglas:
- El teaser público debe generar MUCHO FOMO sin revelar todo
- El insider reveal debe sentirse valioso para quien tiene acceso

JSON:
{
  "publicTeaser": "texto/story público",
  "insiderReveal": "texto/contenido para los que tienen acceso"
}`;
  return askJson<{ publicTeaser: string; insiderReveal: string }>(prompt, { maxTokens: 1500 });
};
