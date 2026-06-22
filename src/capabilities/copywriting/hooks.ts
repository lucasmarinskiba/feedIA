import { askJson } from '../../agent/claude.js';
import { brandContext } from '../../agent/memory.js';
import type { BrandProfile } from '../../config/types.js';

export type HookCategory = 'curiosidad' | 'contrarian' | 'tension' | 'especificidad' | 'autoridad';

export interface Hook {
  texto: string;
  categoria: HookCategory;
  porQueFunciona: string;
}

export interface HooksResult {
  hooks: Hook[];
  top5: string[];
}

export const generateHooks = async (brand: BrandProfile, idea: string): Promise<HooksResult> => {
  const prompt = `Actuá como copywriter viral especializado en Instagram (estilo no-clickbait).

${brandContext(brand)}

IDEA: ${idea}

Generá 15 ganchos de apertura, 3 por cada categoría:
- curiosidad (preguntas que abren un loop)
- contrarian (ir contra la corriente del nicho)
- tension (emocional, sin manipular)
- especificidad (números, nombres, lugares concretos)
- autoridad (sutil, sin vanidad de cifras)

Cada gancho debe detener el scroll SIN clickbait, sentirse inteligente y natural, en una sola línea.
Al final, rankeá los 5 mejores por probabilidad de retener al usuario más de 3 segundos.

JSON:
{
  "hooks": [{ "texto": "...", "categoria": "curiosidad|contrarian|tension|especificidad|autoridad", "porQueFunciona": "razón breve" }, ...15],
  "top5": ["texto del hook 1", ...5]
}`;
  return askJson<HooksResult>(prompt, { maxTokens: 4000 });
};
