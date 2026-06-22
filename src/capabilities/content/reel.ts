import { askJson } from '../../agent/tokenRouter.js';
import { brandContext } from '../../agent/memory.js';
import type { BrandProfile } from '../../config/types.js';
import { CREATIVE_DIRECTOR, COPYWRITER_GROWTH, SOCIAL_MEDIA_ANALYST, formatAestheticForPrompt, getAestheticByKeywords } from '../creativeDirector/index.js';

export interface ReelBeat {
  segundo: number;
  voiceover: string;
  textoEnPantalla: string;
  bRoll: string;
  transicion: string;
}

export interface ReelScript {
  hookVisual: string;
  beats: ReelBeat[];
  caption: string;
  hashtags: string[];
  cta: string;
  audioSugerido: string;
  duracionSegundos: number;
  notasRetencion: string;
}

export const createReel = async (
  brand: BrandProfile,
  tema: string,
  duracion: 15 | 20 | 30 | 45 | 60 = 30,
): Promise<ReelScript> => {
  const aesthetic = getAestheticByKeywords([brand.visual.style ?? '', brand.visual.mood ?? '']);
  const prompt = `${CREATIVE_DIRECTOR}\n${COPYWRITER_GROWTH}\n${SOCIAL_MEDIA_ANALYST}

Actuá como guionista y director creativo de Reels con foco en watch time, replays y compartidos.

${brandContext(brand)}

TEMA: ${tema}
DURACIÓN OBJETIVO: ${duracion} segundos

${formatAestheticForPrompt(aesthetic)}

Reglas:
- Primeros 2 segundos: gancho visual + frase que clave un loop abierto.
- Tensión emocional, curiosidad o controversia desde el inicio (sin clickbait).
- Resolución rápida pero satisfactoria.
- Texto en pantalla siempre en complemento, no redundante con el voiceover.
- B-roll cinematográfico, stock de calidad o IA; nada amateur.
- CTA final concreto y conversacional. NUNCA "seguime para más" ni "guardá esto".
- Estética aspiracional al nivel Pinterest: buena luz, composición cuidada, espacio negativo.

JSON:
{
  "hookVisual": "qué se ve en el frame 1, exacto",
  "beats": [
    { "segundo": 0, "voiceover": "...", "textoEnPantalla": "...", "bRoll": "qué clip", "transicion": "tipo" },
    ...beats cubriendo toda la duración
  ],
  "caption": "caption que abre conversación, no resume el reel",
  "hashtags": ["#...", "..."] (5-12),
  "cta": "CTA específica",
  "audioSugerido": "tipo de audio o búsqueda recomendada (sin nombres de canciones con copyright)",
  "duracionSegundos": ${duracion},
  "notasRetencion": "qué patrón de retención estás usando y por qué"
}`;
  return askJson<ReelScript>(prompt, { maxTokens: 4500 });
};
