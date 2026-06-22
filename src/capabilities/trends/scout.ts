import { askJson } from '../../agent/claude.js';
import { brandContext } from '../../agent/memory.js';
import type { BrandProfile } from '../../config/types.js';

export interface TrendAngle {
  angulo: string;
  patronVisual: string;
  hookEjemplo: string;
  plataformaOrigen: 'instagram' | 'tiktok' | 'reddit' | 'youtube' | 'x';
  saturacionEstimada: 'baja' | 'media' | 'alta';
  ventanaOportunidad: string;
  encajeConMarca: string;
}

export interface TrendsResult {
  angulos: TrendAngle[];
  resumenPatrones: string;
}

export const scoutTrends = async (brand: BrandProfile, observacionesExternas?: string): Promise<TrendsResult> => {
  const prompt = `Actuá como analista de tendencias multiplataforma para Instagram (Reels, TikTok, Reddit).

${brandContext(brand)}

${
  observacionesExternas
    ? `OBSERVACIONES EXTERNAS QUE TE PASO (datos reales recientes):\n"""\n${observacionesExternas}\n"""\n`
    : 'No tengo datos en tiempo real. Trabajá con tu conocimiento del nicho y patrones recurrentes.\n'
}

Identificá 5 ángulos con mayor demanda en este nicho durante los últimos 30 días, optimizados para visuals creados con IA. Cruzá la info entre plataformas y descartá ángulos saturados sin retorno.

JSON:
{
  "angulos": [
    {
      "angulo": "qué tipo de contenido + tema",
      "patronVisual": "estilo visual repetido (ej: split screen, slow zoom, captions con highlight amarillo)",
      "hookEjemplo": "primera línea/frame que se ve en los virales",
      "plataformaOrigen": "instagram|tiktok|reddit|youtube|x",
      "saturacionEstimada": "baja|media|alta",
      "ventanaOportunidad": "días/semanas estimados antes de saturarse",
      "encajeConMarca": "cómo lo adaptás sin traicionar el tono"
    },
    ...5 ángulos
  ],
  "resumenPatrones": "qué patrones cruzan plataformas y qué dicen sobre la audiencia ahora"
}`;
  return askJson<TrendsResult>(prompt, { maxTokens: 4000 });
};
