import { askJson } from '../../agent/claude.js';
import { brandContext } from '../../agent/memory.js';
import type { BrandProfile } from '../../config/types.js';

export interface ComentarioFaro {
  cuenta: string;
  resumenPost: string;
  comentarioSugerido: string;
  porQueAporta: string;
  riesgo: 'bajo' | 'medio' | 'alto';
}

export const generarComentariosFaro = async (
  brand: BrandProfile,
  postsRecientes: Array<{ cuenta: string; descripcion: string }>,
): Promise<ComentarioFaro[]> => {
  const prompt = `Actuá como community manager interactuando con cuentas faro del nicho.

${brandContext(brand)}

POSTS RECIENTES DE CUENTAS FARO:
${postsRecientes.map((p, i) => `${i + 1}. @${p.cuenta} → ${p.descripcion}`).join('\n')}

Generá un comentario inteligente para cada post que:
- Aporte una reflexión o dato concreto (no "buen post" ni emojis vacíos)
- Suene como autoridad humilde, NO como gurú
- Encaje con la voz de marca: ${brand.voice.tone.join(', ')}
- Tenga entre 1 y 3 oraciones máximo
- Pueda generar respuesta del autor original o de su audiencia

JSON: array con un objeto por post:
[
  {
    "cuenta": "@usuario",
    "resumenPost": "qué dice el post original",
    "comentarioSugerido": "comentario propuesto",
    "porQueAporta": "valor agregado al hilo",
    "riesgo": "bajo|medio|alto (riesgo de sonar oportunista o invasivo)"
  }
]`;
  return askJson<ComentarioFaro[]>(prompt, { maxTokens: 3500 });
};
