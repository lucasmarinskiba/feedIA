import { askJson } from '../../agent/tokenRouter.js';
import { brandContext } from '../../agent/memory.js';
import type { BrandProfile } from '../../config/types.js';

export interface CaptionVariants {
  corta: string;
  media: string;
  larga: string;
  hashtags: { core: string[]; amplio: string[] };
  primerComentarioRecomendado: string;
}

export const createCaption = async (
  brand: BrandProfile,
  contexto: string,
  formato: 'reel' | 'carrusel' | 'post-imagen' | 'historia',
): Promise<CaptionVariants> => {
  const corePool = brand.hashtagPools['core'] ?? [];
  const amplioPool = brand.hashtagPools['amplio'] ?? [];

  const prompt = `Actuá como copywriter de captions de Instagram orientado a guardados y comentarios.

${brandContext(brand)}

CONTEXTO/CONTENIDO: ${contexto}
FORMATO: ${formato}

Reglas:
- Primera línea: gancho que se lee antes del "ver más".
- Sin emojis decorativos. Solo si suman a la jerarquía visual.
- Frases cortas, ritmo respirable.
- CTA conversacional, no imperativa genérica.
- Hashtags: máximo 15, mezcla de marca + nicho + amplio.

Hashtags core sugeridos por la marca: ${corePool.join(' ') || '(no definidos)'}
Hashtags amplios sugeridos por la marca: ${amplioPool.join(' ') || '(no definidos)'}

JSON:
{
  "corta": "1-2 líneas, máxima fricción para detener scroll",
  "media": "3-5 líneas, gancho + valor + cta",
  "larga": "8-15 líneas, storytelling con beat de tensión y resolución",
  "hashtags": { "core": ["#..."], "amplio": ["#..."] },
  "primerComentarioRecomendado": "comentario que la marca dejaría inmediatamente para sembrar conversación"
}`;
  return askJson<CaptionVariants>(prompt, { maxTokens: 3000 });
};
