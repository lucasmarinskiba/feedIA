/**
 * Must-Follow Hooks — Crea hooks que generan necesidad de seguir
 */

import { askJson } from '../../agent/claude.js';
import { brandContext } from '../../agent/memory.js';
import type { BrandProfile } from '../../config/types.js';

export interface MustFollowHook {
  hook: string;
  context: string;
  format: 'bio' | 'post' | 'story' | 'comment' | 'reel';
  psychology: string;
  example: string;
}

export const generateMustFollowHooks = async (brand: BrandProfile): Promise<MustFollowHook[]> => {
  const prompt = `Sos un growth psychologist. Diseñá 6 hooks que hagan que un visitante diga "necesito seguir esta cuenta".

${brandContext(brand)}

Reglas:
- Cada hook debe apelar a una emoción o necesidad real
- Sin clickbait barato
- Que funcionen en diferentes contextos (bio, post, story, comentario)
- Basados en FOMO, curiosidad, o promesa de transformación

JSON: array de 6 hooks:
[
  {
    "hook": "texto del hook",
    "context": "dónde se usa",
    "format": "bio|post|story|comment|reel",
    "psychology": "qué principio psicológico activa (FOMO, curiosidad, etc.)",
    "example": "ejemplo concreto de uso"
  }
]`;
  return askJson<MustFollowHook[]>(prompt, { maxTokens: 2500 });
};

export const craftProfileHook = async (brand: BrandProfile): Promise<string> => {
  const prompt = `Sos un copywriter. Escribí UNA línea que aparezca en la bio o primer post fijado que haga imperativo seguir esta cuenta.

${brandContext(brand)}

Reglas:
- Máximo 15 palabras
- Que responda: "¿por qué debería seguirte?"
- Que cree expectativa de contenido futuro

JSON: { "hook": "texto" }
`;
  const result = await askJson<{ hook: string }>(prompt, { maxTokens: 500 });
  return result.hook;
};
