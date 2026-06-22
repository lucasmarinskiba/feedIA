/**
 * Visual FOMO — Técnicas visuales que generan urgencia
 * Carousels "swipe to reveal", reels "wait for it", split screens, before/after
 */

import { askJson } from '../../agent/claude.js';
import { brandContext } from '../../agent/memory.js';
import type { BrandProfile } from '../../config/types.js';

export interface VisualFomoConcept {
  name: string;
  format: 'carousel' | 'reel' | 'story' | 'post';
  visualDescription: string;
  hook: string;
  whyItWorks: string;
  productionNotes: string;
}

export const generateVisualFomoConcepts = async (brand: BrandProfile): Promise<VisualFomoConcept[]> => {
  const prompt = `Sos un visual strategist especializado en FOMO. Diseñá 6 conceptos visuales.

${brandContext(brand)}

Técnicas a explorar:
1. Carousel "swipe to reveal" — lo importante está en la última slide
2. Reel "wait for it" — el payoff viene al final
3. Split screen "antes vs después" — la transformación genera deseo
4. Story "tap to reveal" — usando stickers de deslizar
5. Post "zoom in" — el detalle clave está oculto
6. Reel "speed ramp" — empieza lento, acelera hacia el climax

Reglas:
- Cada concepto debe ser PRODUCIBLE (no ideas imposibles)
- Que funcione en mobile (la mayoría ve en celular)
- Que no requiera equipo profesional caro

JSON: array de 6 conceptos:
[
  {
    "name": "nombre del concepto",
    "format": "carousel|reel|story|post",
    "visualDescription": "cómo se ve frame por frame",
    "hook": "texto visible",
    "whyItWorks": "psicología visual",
    "productionNotes": "cómo producirlo"
  }
]`;
  return askJson<VisualFomoConcept[]>(prompt, { maxTokens: 3000 });
};

export const designSwipeToReveal = async (
  brand: BrandProfile,
  topic: string,
): Promise<{ slides: { text: string; visual: string }[]; finalReveal: string; cta: string }> => {
  const prompt = `Sos un carousel designer. Diseñá un carousel "swipe to reveal".

${brandContext(brand)}
Tema: ${topic}

Reglas:
- 5 slides: las primeras 4 generan tensión/curiosidad, la 5ta revela
- Cada slide debe hacer que quieras ver la siguiente
- El reveal debe valer la pena (no anticlimax)

JSON:
{
  "slides": [
    { "text": "texto slide 1", "visual": "descripción visual" },
    { "text": "texto slide 2", "visual": "descripción visual" },
    { "text": "texto slide 3", "visual": "descripción visual" },
    { "text": "texto slide 4", "visual": "descripción visual" },
    { "text": "texto slide 5 (reveal)", "visual": "descripción visual" }
  ],
  "finalReveal": "qué se revela",
  "cta": "call to action después del reveal"
}`;
  return askJson<{ slides: { text: string; visual: string }[]; finalReveal: string; cta: string }>(prompt, {
    maxTokens: 2000,
  });
};

export const designWaitForItReel = async (
  brand: BrandProfile,
  topic: string,
): Promise<{ script: string[]; timingNotes: string; payoff: string; hookFirstFrame: string }> => {
  const prompt = `Sos un reel strategist. Diseñá un reel "wait for it".

${brandContext(brand)}
Tema: ${topic}

Reglas:
- El hook en el primer frame debe ser imposible de scrollear
- El payoff debe estar en los últimos 3 segundos
- Que el viewer sienta que "perdió algo" si no llegó al final

JSON:
{
  "script": ["escena 1", "escena 2", "escena 3", "payoff"],
  "timingNotes": "notas de timing",
  "payoff": "qué pasa al final",
  "hookFirstFrame": "texto/imagen del primer frame"
}`;
  return askJson<{ script: string[]; timingNotes: string; payoff: string; hookFirstFrame: string }>(prompt, {
    maxTokens: 1500,
  });
};
