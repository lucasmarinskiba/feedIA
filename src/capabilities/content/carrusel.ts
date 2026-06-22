import { askJson } from '../../agent/tokenRouter.js';
import { brandContext } from '../../agent/memory.js';
import type { BrandProfile } from '../../config/types.js';
import { CREATIVE_DIRECTOR, COPYWRITER_GROWTH, formatPrinciplesForPrompt, CAROUSEL_PRINCIPLES } from '../creativeDirector/index.js';

export interface CarruselSlide {
  numero: number;
  titulo: string;
  cuerpo: string;
  rolEnNarrativa: 'gancho' | 'tension' | 'desarrollo' | 'climax' | 'resolucion' | 'cta';
  direccionVisual: string;
}

export interface CarruselResult {
  slides: CarruselSlide[];
  caption: string;
  hashtags: string[];
  cta: string;
  formatoOptimo: '1:1' | '4:5';
  notasDiseno: string;
}

const SLIDE_COUNT_GUIDE: Record<'corto' | 'medio' | 'largo', string> = {
  corto: '5-6 slides (alta tasa de completion)',
  medio: '7-8 slides (balance ideal para guardados)',
  largo: '9-10 slides (solo si la información lo justifica de verdad)',
};

export const createCarrusel = async (
  brand: BrandProfile,
  idea: string,
  longitud: 'corto' | 'medio' | 'largo' = 'medio',
): Promise<CarruselResult> => {
  const prompt = `${CREATIVE_DIRECTOR}\n${COPYWRITER_GROWTH}

Actuá como diseñador de carruseles de Instagram con foco en guardados y compartidos.

${brandContext(brand)}

IDEA: ${idea}
LONGITUD OBJETIVO: ${SLIDE_COUNT_GUIDE[longitud]}

Reglas de oro:
${formatPrinciplesForPrompt(CAROUSEL_PRINCIPLES)}

Diseño:
- Paleta: ${brand.visual.palette.join(', ') || 'libre, coherente'}
- Tipografía: ${brand.visual.typography.join(', ') || 'sans serif legible'}
- Estilo: ${brand.visual.style}
- Espacio negativo: 30-40% del slide
- Jerarquía: título 2-3x más grande que body

Restricciones de perfeccionismo:
- Nada de "seguime para más", "guardá esto" o "link en bio" genérico.
- CTA conversacional y específica al contexto.
- Títulos de 4-8 palabras; body máximo 25 palabras.
- Una idea por slide.
- Arco narrativo: gancho → tensión → insight → solución → CTA.

JSON:
{
  "slides": [
    { "numero": 1, "titulo": "max 8 palabras", "cuerpo": "max 25 palabras", "rolEnNarrativa": "gancho", "direccionVisual": "qué se ve, layout, color dominante" },
    ...
  ],
  "caption": "caption que extiende el carrusel, no lo repite",
  "hashtags": ["#...", "..."] (8-15),
  "cta": "CTA específica, no genérica",
  "formatoOptimo": "1:1 o 4:5",
  "notasDiseno": "decisiones visuales clave para mantener coherencia"
}`;
  // Vía TokenRouter: usa el proveedor más barato disponible (Groq gratis /
  // Ollama local / OpenRouter) y sólo Claude si hay key y presupuesto.
  return askJson<CarruselResult>(prompt, { taskType: 'creative', maxTokens: 5000 });
};
