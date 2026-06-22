import { askJson } from '../../agent/claude.js';
import { brandContext } from '../../agent/memory.js';
import type { BrandProfile } from '../../config/types.js';

export interface RespuestaProspeccion {
  postOriginal: string;
  preguntaDetectada: string;
  respuestaPropuesta: string;
  esRelevante: boolean;
  notaEtica: string;
}

export const responderEnComentariosAjenos = async (
  brand: BrandProfile,
  preguntas: Array<{ post: string; comentario: string }>,
): Promise<RespuestaProspeccion[]> => {
  const prompt = `Actuá como experto que aporta en comentarios de cuentas ajenas SIN parecer oportunista.

${brandContext(brand)}

PREGUNTAS EN COMENTARIOS:
${preguntas.map((p, i) => `${i + 1}. Post: "${p.post}" → Comentario: "${p.comentario}"`).join('\n')}

Reglas estrictas:
- NO mencionar tu marca/cuenta NUNCA en la respuesta.
- NO recomendar tu producto NUNCA.
- Si la pregunta no es realmente respondible con autoridad → marcar esRelevante=false.
- Respuesta concreta, útil, en máximo 3 oraciones.
- Si el ego de la marca te tienta a "lucirte", reescribí.

JSON:
[
  {
    "postOriginal": "...",
    "preguntaDetectada": "qué pregunta concreta hay",
    "respuestaPropuesta": "respuesta lista para pegar",
    "esRelevante": true,
    "notaEtica": "advertencia si hay riesgo de parecer invasivo"
  }
]`;
  return askJson<RespuestaProspeccion[]>(prompt, { maxTokens: 3500 });
};
