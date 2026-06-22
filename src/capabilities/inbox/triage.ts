import { askJson } from '../../agent/claude.js';
import { brandContext } from '../../agent/memory.js';
import type { BrandProfile } from '../../config/types.js';

export type DmCategory = 'soporte' | 'curioso' | 'lead-caliente' | 'spam' | 'colaboracion' | 'otro';

export interface DmTriage {
  remitente: string;
  mensaje: string;
  categoria: DmCategory;
  intencionDetectada: string;
  prioridad: 'urgente' | 'alta' | 'media' | 'baja';
  respuestaSugerida: string;
  requiereHumano: boolean;
}

export const triageDms = async (
  brand: BrandProfile,
  dms: Array<{ remitente: string; mensaje: string; historial?: string }>,
): Promise<DmTriage[]> => {
  const prompt = `Actuá como filtro de DMs de Instagram para una marca.

${brandContext(brand)}

MENSAJES A CLASIFICAR:
${dms
  .map(
    (d, i) =>
      `${i + 1}. De @${d.remitente}: "${d.mensaje}"${d.historial ? `\n   Historial previo: ${d.historial}` : ''}`,
  )
  .join('\n')}

Para cada mensaje:
- Clasificá: soporte | curioso | lead-caliente | spam | colaboracion | otro
- Detectá intención real (no la literal)
- Asigná prioridad
- Redactá una respuesta sugerida (tono de marca)
- Marcá si requiere intervención humana (datos sensibles, queja seria, oportunidad grande)

NO ofrezcas precios, NO confirmes condiciones contractuales, NO compartas datos privados sin humano.

JSON:
[
  {
    "remitente": "@...",
    "mensaje": "...",
    "categoria": "soporte|curioso|lead-caliente|spam|colaboracion|otro",
    "intencionDetectada": "qué quiere realmente esta persona",
    "prioridad": "urgente|alta|media|baja",
    "respuestaSugerida": "respuesta lista, máximo 4 oraciones",
    "requiereHumano": true
  }
]`;
  return askJson<DmTriage[]>(prompt, { maxTokens: 4000 });
};
