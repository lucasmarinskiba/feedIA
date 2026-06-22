/**
 * Social Proof Engine — Recopila y redistribuye testimonios, resultados, reviews
 */

import { askJson } from '../../agent/claude.js';
import { brandContext } from '../../agent/memory.js';
import type { BrandProfile } from '../../config/types.js';

export interface Testimonial {
  id: string;
  quote: string;
  author: string;
  context: string;
  metric?: string;
  format: 'carousel' | 'story' | 'reel' | 'caption';
}

export interface SocialProofPack {
  testimonials: Testimonial[];
  beforeAfters: { title: string; visualIdea: string }[];
  statsToHighlight: { stat: string; context: string }[];
}

export const generateSocialProofPack = async (brand: BrandProfile): Promise<SocialProofPack> => {
  const prompt = `Sos un social proof strategist. Diseñá un paquete de prueba social para Instagram.

${brandContext(brand)}

Generá:
- 3 testimonios ficticios pero realistas (basados en el nicho)
- 2 ideas de before/after
- 3 estadísticas o números que la marca PODRÍA tener (se honesto, no inventes datos)

JSON:
{
  "testimonials": [
    {
      "quote": "texto del testimonio",
      "author": "nombre o @usuario",
      "context": "contexto breve",
      "metric": "resultado concreto (opcional)",
      "format": "carousel|story|reel|caption"
    }
  ],
  "beforeAfters": [
    { "title": "título", "visualIdea": "cómo mostrarlo visualmente" }
  ],
  "statsToHighlight": [
    { "stat": "número o dato", "context": "qué significa" }
  ]
}`;
  return askJson<SocialProofPack>(prompt, { maxTokens: 2500 });
};

export const craftTestimonialPost = async (
  brand: BrandProfile,
  testimonial: Testimonial,
): Promise<{ caption: string; hashtags: string[]; cta: string }> => {
  const prompt = `Sos copywriter. Convertí este testimonio en un post de Instagram.

Marca: ${brand.name} | Nicho: ${brand.niche} | Tono: ${brand.voice.tone.join(', ')}

Testimonio: "${testimonial.quote}" de ${testimonial.author}
Contexto: ${testimonial.context}

Reglas:
- No suene a anuncio
- Empezar con el testimonio, no con "Nos encanta compartir..."
- CTA suave al final
- Máximo 150 palabras

JSON:
{
  "caption": "texto completo del caption",
  "hashtags": ["#tag1", "#tag2"],
  "cta": "call to action"
}`;
  return askJson<{ caption: string; hashtags: string[]; cta: string }>(prompt, { maxTokens: 1500 });
};
