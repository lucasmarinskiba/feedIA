import { askJson } from '../../agent/claude.js';
import { brandContext } from '../../agent/memory.js';
import type { BrandProfile } from '../../config/types.js';

export interface EvergreenRefresh {
  postOriginalId: string;
  cambiosSugeridos: {
    hookNuevo: string;
    captionNuevo: string;
    audioNuevo?: string;
    ajusteVisual: string;
  };
  diferenciacion: string;
  riesgoCanibalizacion: 'bajo' | 'medio' | 'alto';
}

export interface EvergreenCandidate {
  id: string;
  format: string;
  publishedAt: string;
  hookOriginal: string;
  captionOriginal: string;
  metrics: { saves: number; shares: number; reach: number };
}

export const sugerirReciclaje = async (
  brand: BrandProfile,
  candidatos: EvergreenCandidate[],
): Promise<EvergreenRefresh[]> => {
  const prompt = `Actuá como editor de contenido reciclando posts evergreen sin que se note.

${brandContext(brand)}

CANDIDATOS (todos con +6 meses de antigüedad y buen rendimiento histórico):
${candidatos
  .map(
    (c) =>
      `- id=${c.id} formato=${c.format} pub=${c.publishedAt} | hook="${c.hookOriginal}" | métricas=${JSON.stringify(c.metrics)}`,
  )
  .join('\n')}

Para cada candidato proponé un refresh:
- Hook nuevo (mismo insight, distinta puerta de entrada)
- Caption reescrito (no parafraseado)
- Si es reel: audio sugerido distinto
- Ajuste visual (no rediseñar todo, sólo reframe)
- Diferenciación con el original
- Riesgo de canibalización con el post viejo

JSON: array con un objeto por candidato.`;
  return askJson<EvergreenRefresh[]>(prompt, { maxTokens: 4000 });
};
