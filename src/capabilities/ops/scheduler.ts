import { askJson } from '../../agent/claude.js';
import { brandContext } from '../../agent/memory.js';
import type { BrandProfile, ContentFormat } from '../../config/types.js';

export interface ScheduledSlot {
  isoDateTime: string;
  diaSemana: 'lun' | 'mar' | 'mie' | 'jue' | 'vie' | 'sab' | 'dom';
  horaLocal: string;
  formato: ContentFormat;
  tema: string;
  prioridad: 'alta' | 'media' | 'baja';
  razon: string;
}

export interface WeeklyPlan {
  semanaDel: string;
  cantidadPosts: number;
  cantidadStories: number;
  slots: ScheduledSlot[];
  reglasAplicadas: string[];
}

export const planSemana = async (
  brand: BrandProfile,
  ideasDisponibles: Array<{ idea: string; formatoSugerido: ContentFormat }>,
  bestHours?: string[],
): Promise<WeeklyPlan> => {
  const today = new Date().toISOString().split('T')[0];
  const prompt = `Actuá como planificador semanal de Instagram.

${brandContext(brand)}

IDEAS DISPONIBLES:
${ideasDisponibles.map((i, idx) => `${idx + 1}. [${i.formatoSugerido}] ${i.idea}`).join('\n')}

HORARIOS HISTÓRICOS DE MEJOR RENDIMIENTO: ${bestHours?.length ? bestHours.join(', ') : 'no hay datos, usar best practices del nicho'}
HOY: ${today}

Reglas:
- Mínimo 5 posts en la semana, máximo 7.
- Combiná formatos: al menos 2 reels, 1 carrusel, 1 post-imagen, stories diarias.
- Evitar 2 reels el mismo día.
- No publicar dos veces seguidas el mismo dolor de la audiencia (variar ángulo).
- Stories: 3-5 por día, distribuidas en mañana/tarde/noche.

JSON:
{
  "semanaDel": "YYYY-MM-DD del lunes",
  "cantidadPosts": 0,
  "cantidadStories": 0,
  "slots": [
    {
      "isoDateTime": "ISO 8601 con timezone",
      "diaSemana": "lun|mar|mie|jue|vie|sab|dom",
      "horaLocal": "HH:MM",
      "formato": "reel|carrusel|post-imagen|historia|reel-faceless|live",
      "tema": "tema del slot",
      "prioridad": "alta|media|baja",
      "razon": "por qué ese día/hora/formato"
    }
  ],
  "reglasAplicadas": ["regla 1 que respetaste", ...]
}`;
  return askJson<WeeklyPlan>(prompt, { maxTokens: 4500 });
};
