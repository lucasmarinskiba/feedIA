import { askJson } from '../../agent/claude.js';
import { brandContext } from '../../agent/memory.js';
import type { BrandProfile } from '../../config/types.js';

export interface MarketTarget {
  locale: string;
  ajustesCulturales: string[];
  modismosEvitar?: string[];
  hashtagsLocales?: string[];
}

export interface LocalizedVariant {
  locale: string;
  caption: string;
  hooks: string[];
  ctaLocalizada: string;
  hashtagsRecomendados: string[];
  notasCulturales: string[];
  riesgosTraduccion: string[];
}

export const localizarContenido = async (
  brand: BrandProfile,
  contenido: { caption: string; hooks: string[]; cta: string },
  mercados: MarketTarget[],
): Promise<LocalizedVariant[]> => {
  const prompt = `Actuá como traductor + localizador cultural para Instagram. NO traduzcas literal, ADAPTÁ.

${brandContext(brand)}

CONTENIDO BASE (${brand.audience.locale}):
- Caption: "${contenido.caption}"
- Hooks: ${JSON.stringify(contenido.hooks)}
- CTA: "${contenido.cta}"

MERCADOS A LOCALIZAR:
${mercados
  .map(
    (m) =>
      `- ${m.locale}\n  ajustes: ${m.ajustesCulturales.join(', ')}\n  evitar: ${m.modismosEvitar?.join(', ') ?? '(ninguno)'}\n  hashtags locales: ${m.hashtagsLocales?.join(' ') ?? '(libre)'}`,
  )
  .join('\n')}

Reglas:
- Adaptar referencias culturales (un meme argentino no funciona en México).
- Mantener voz de marca pero usar el español/dialecto/idioma del mercado.
- Hashtags relevantes locales si los conoces, sino dejar de los pools del usuario.
- Marcar riesgos de traducción (frases que en otro mercado pueden sonar raras u ofensivas).

JSON: array con un objeto por mercado:
[{
  "locale": "es-MX",
  "caption": "...",
  "hooks": ["...", "..."],
  "ctaLocalizada": "...",
  "hashtagsRecomendados": ["#..."],
  "notasCulturales": ["..."],
  "riesgosTraduccion": ["..."]
}]`;
  return askJson<LocalizedVariant[]>(prompt, { maxTokens: 4500 });
};
