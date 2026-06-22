import { askJson } from '../../agent/claude.js';
import { brandContext } from '../../agent/memory.js';
import type { BrandProfile } from '../../config/types.js';

export interface PsychTrigger {
  disparador: 'sorpresa' | 'ego' | 'miedo' | 'deseo' | 'curiosidad' | 'pertenencia';
  ejemploLinguistico: string;
}

export interface ProvocativeHook {
  texto: string;
  disparadorPrincipal: PsychTrigger['disparador'];
  ritmoSugerido: string;
  porQueDetieneScroll: string;
}

export interface HookEngineeringResult {
  patronesDetectados: string[];
  ritmoComun: string;
  triggersDominantes: PsychTrigger[];
  nuevosHooks: ProvocativeHook[];
}

export const engineerHooks = async (brand: BrandProfile, ejemplosVirales: string[]): Promise<HookEngineeringResult> => {
  const prompt = `Actuá como ingeniero de retención para Reels.

${brandContext(brand)}

EJEMPLOS DE HOOKS VIRALES EN ESTE NICHO (transcripciones de los primeros 3 segundos):
${ejemplosVirales.map((e, i) => `${i + 1}. ${e}`).join('\n')}

Tarea:
1. Identificá patrones lingüísticos y rítmicos comunes en los primeros 3 segundos.
2. Mapeá los disparadores psicológicos dominantes (sorpresa, ego, miedo, deseo, curiosidad, pertenencia).
3. Diseñá 5 nuevos hooks más provocativos y curiosos que rompan el patrón pero usen los disparadores correctos.

JSON:
{
  "patronesDetectados": ["patrón 1 con cita", ...],
  "ritmoComun": "descripción del ritmo (ej: pausa-pico-pausa, frase cortada, número específico al final)",
  "triggersDominantes": [
    { "disparador": "sorpresa|ego|miedo|deseo|curiosidad|pertenencia", "ejemploLinguistico": "frase del corpus que lo activa" }
  ],
  "nuevosHooks": [
    {
      "texto": "hook propuesto",
      "disparadorPrincipal": "uno de los 6",
      "ritmoSugerido": "cómo decirlo o cómo cortar el frame",
      "porQueDetieneScroll": "razón concreta"
    },
    ...5 hooks
  ]
}`;
  return askJson<HookEngineeringResult>(prompt, { maxTokens: 4000 });
};
