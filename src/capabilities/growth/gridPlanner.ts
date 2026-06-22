/**
 * Grid Planner — Planifica el feed visual para maximizar scroll-stop
 */

import { askJson } from '../../agent/claude.js';
import { brandContext } from '../../agent/memory.js';
import type { BrandProfile } from '../../config/types.js';

export interface GridPost {
  position: number;
  type: 'photo' | 'carousel' | 'reel_cover' | 'quote' | 'infographic';
  theme: string;
  visualStyle: string;
  hook: string;
  purpose: 'awareness' | 'engagement' | 'conversion' | 'authority';
}

export interface GridPlan {
  posts: GridPost[];
  aestheticNotes: string[];
  colorPalette: string[];
  postingOrder: string;
}

export const planGrid = async (brand: BrandProfile, postCount = 9): Promise<GridPlan> => {
  const prompt = `Sos un visual strategist de Instagram. Planificá un grid de ${postCount} posts que convierta visitantes en followers.

${brandContext(brand)}

Reglas:
- El grid debe tener coherencia visual pero no ser aburrido
- Alternar formatos (foto, carrusel, reel cover, quote)
- Los posts de los bordes (especialmente top-left) son los más importantes
- Cada post debe tener un propósito claro
- Incluir notas sobre paleta de colores y estilo visual

JSON:
{
  "posts": [
    {
      "position": 1,
      "type": "photo|carousel|reel_cover|quote|infographic",
      "theme": "de qué trata",
      "visualStyle": "cómo se ve",
      "hook": "texto visible en miniatura",
      "purpose": "awareness|engagement|conversion|authority"
    }
  ],
  "aestheticNotes": ["nota 1", "nota 2"],
  "colorPalette": ["#HEX1", "#HEX2"],
  "postingOrder": "consejo sobre en qué orden publicar"
}`;
  return askJson<GridPlan>(prompt, { maxTokens: 3000 });
};

export const suggestScrollStopHooks = async (brand: BrandProfile): Promise<string[]> => {
  const prompt = `Sos un hook writer. Generá 10 hooks visuales/textuales que hagan que alguien pare el scroll.

${brandContext(brand)}

Reglas:
- Cada hook debe funcionar en una miniatura de 1080x1080
- Sin clickbait engañoso
- Que generen curiosidad o emoción

JSON: array de 10 strings
`;
  return askJson<string[]>(prompt, { maxTokens: 1500 });
};
