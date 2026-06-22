import { askJson } from '../../agent/tokenRouter.js';
import { brandContext } from '../../agent/memory.js';
import type { BrandProfile } from '../../config/types.js';

export type StoryType =
  | 'detras-escena'
  | 'encuesta'
  | 'pregunta-abierta'
  | 'cuestionario'
  | 'cuenta-regresiva'
  | 'recomendacion'
  | 'mini-caso';

export interface StorySlide {
  orden: number;
  tipo: StoryType;
  textoPrincipal: string;
  sticker?: { tipo: 'encuesta' | 'pregunta' | 'cuestionario' | 'emoji' | 'link'; payload: string };
  duracionSegundos: number;
  visual: string;
}

export interface StorySequence {
  objetivo: 'engagement' | 'leads' | 'autoridad' | 'comunidad';
  slides: StorySlide[];
  notas: string;
}

export const createStorySequence = async (
  brand: BrandProfile,
  evento: string,
  cantidad = 5,
): Promise<StorySequence> => {
  const prompt = `Actuá como editor de Historias de Instagram con foco en respuestas y conversaciones.

${brandContext(brand)}

EVENTO/CONTEXTO: ${evento}
CANTIDAD DE STORIES: ${cantidad}

Reglas:
- Primera story: gancho que justifique tocar la siguiente.
- Mezclar mínimo 2 stickers interactivos (encuesta, pregunta, cuestionario).
- Una historia debe ofrecer algo concreto (descarga, enlace, recurso) si el objetivo es leads.
- Tono cercano, humano, no corporativo.

JSON:
{
  "objetivo": "engagement|leads|autoridad|comunidad",
  "slides": [
    {
      "orden": 1,
      "tipo": "detras-escena|encuesta|pregunta-abierta|cuestionario|cuenta-regresiva|recomendacion|mini-caso",
      "textoPrincipal": "frase visible en pantalla",
      "sticker": { "tipo": "encuesta|pregunta|cuestionario|emoji|link", "payload": "opciones o pregunta exacta" },
      "duracionSegundos": 5,
      "visual": "qué se ve, fondo, jerarquía"
    },
    ...
  ],
  "notas": "cómo encadena la secuencia y por qué eleva engagement"
}`;
  return askJson<StorySequence>(prompt, { maxTokens: 3500 });
};
