import { askJson } from '../../agent/claude.js';
import { brandContext } from '../../agent/memory.js';
import type { BrandProfile } from '../../config/types.js';

export interface FanInteraction {
  fan: string;
  contexto: string;
  accionSugerida: 'like' | 'comentario' | 'reaccion-historia' | 'mensaje-directo' | 'mencion';
  textoSugerido?: string;
  prioridad: 'alta' | 'media' | 'baja';
}

export const planFanNurturing = async (
  brand: BrandProfile,
  actividadDeFans: Array<{
    usuario: string;
    tipo: 'comentario' | 'mencion' | 'reaccion' | 'guardado' | 'compartido';
    contenido: string;
  }>,
): Promise<FanInteraction[]> => {
  const prompt = `Actuá como responsable de comunidad fomentando lealtad sin parecer artificial.

${brandContext(brand)}

ACTIVIDAD RECIENTE DE FANS:
${actividadDeFans.map((f, i) => `${i + 1}. @${f.usuario} (${f.tipo}): ${f.contenido}`).join('\n')}

Por cada fan decidí qué tipo de interacción haría un humano cercano y atento (no un bot). Mezclá tipos de respuesta. Priorizá fans que ya muestran lealtad (guardado/compartido > comentario > like).

JSON:
[
  {
    "fan": "@usuario",
    "contexto": "qué hizo y por qué importa",
    "accionSugerida": "like|comentario|reaccion-historia|mensaje-directo|mencion",
    "textoSugerido": "solo si la acción requiere texto, máximo 2 oraciones, sin sonar a plantilla",
    "prioridad": "alta|media|baja"
  }
]`;
  return askJson<FanInteraction[]>(prompt, { maxTokens: 3000 });
};
