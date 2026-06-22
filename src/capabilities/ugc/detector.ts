import { askJson } from '../../agent/claude.js';
import { brandContext } from '../../agent/memory.js';
import type { BrandProfile } from '../../config/types.js';

export type UgcTipo = 'mencion' | 'tag' | 'comentario-elogio' | 'review-organica' | 'creativo-original';

export interface UgcCandidate {
  autor: string;
  tipo: UgcTipo;
  texto: string;
  postUrl?: string;
  hasMedia: boolean;
}

export interface UgcDecision {
  candidato: UgcCandidate;
  vale: boolean;
  motivo: string;
  riesgoLegal: 'bajo' | 'medio' | 'alto';
  permisoNecesario: boolean;
  borradorMensajePermiso?: string;
  formatosSugeridos: Array<'historia' | 'reposteo-feed' | 'highlight' | 'carrusel-testimonios'>;
  prioridad: 'alta' | 'media' | 'baja';
}

export const evaluarUgc = async (brand: BrandProfile, candidatos: UgcCandidate[]): Promise<UgcDecision[]> => {
  const prompt = `Actuá como community manager evaluando UGC (contenido generado por usuarios).

${brandContext(brand)}

CANDIDATOS:
${candidatos
  .map(
    (c, i) =>
      `${i + 1}. @${c.autor} (${c.tipo}) "${c.texto.slice(0, 200)}"${
        c.postUrl ? ` | url=${c.postUrl}` : ''
      } | media=${c.hasMedia}`,
  )
  .join('\n')}

Por cada candidato decidí:
- ¿Vale la pena resubir/republicar? (calidad real, no fake testimonial, no controversia)
- Riesgo legal: si hay logo de tercero visible, persona reconocible, marca registrada → riesgoLegal=alto
- ¿Hace falta pedir permiso explícito? (sí si hay media; si es solo texto público de elogio, depende)
- Borrador del mensaje para pedir permiso (cálido, breve, sin guiño desesperado)
- Formato(s) sugeridos para republicar
- Prioridad

JSON: array
[
  {
    "candidato": { "autor": "@...", "tipo": "...", "texto": "...", "hasMedia": true },
    "vale": true,
    "motivo": "...",
    "riesgoLegal": "bajo|medio|alto",
    "permisoNecesario": true,
    "borradorMensajePermiso": "...",
    "formatosSugeridos": ["historia", "carrusel-testimonios"],
    "prioridad": "alta|media|baja"
  }
]`;
  return askJson<UgcDecision[]>(prompt, { maxTokens: 4000 });
};
