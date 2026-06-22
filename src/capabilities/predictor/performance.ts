import { askJson } from '../../agent/claude.js';
import { brandContext } from '../../agent/memory.js';
import { topPerformers } from '../../agent/memory.js';
import type { BrandProfile, ContentFormat } from '../../config/types.js';

export interface PerformancePrediction {
  scoreGeneral: number;
  scoreSaves: number;
  scoreShares: number;
  scoreCompletion: number;
  fortalezas: string[];
  debilidades: string[];
  ajustesAltoImpacto: Array<{ ajuste: string; impactoEsperado: string }>;
  hookAlternativosSugeridos: string[];
  mejorMomentoPublicar: string;
  riesgoFlop: 'bajo' | 'medio' | 'alto';
  comparacionConTopPerformers: string;
}

export interface PredictionInput {
  format: ContentFormat;
  hook: string;
  caption: string;
  cta?: string;
  hashtagsCount?: number;
  primerComentario?: string;
}

export const predecirPerformance = async (
  brand: BrandProfile,
  input: PredictionInput,
): Promise<PerformancePrediction> => {
  const top = topPerformers(5);
  const topResumen = top.length
    ? top
        .map((t) => `- ${t.format} (saves=${t.metrics.saves} shares=${t.metrics.shares}): "${t.hookFirstLine}"`)
        .join('\n')
    : '(sin historial cargado)';

  const prompt = `Actuá como modelo predictivo de performance para Instagram. Sé concreto, no vago.

${brandContext(brand)}

CONTENIDO A PREDECIR:
- Formato: ${input.format}
- Hook: "${input.hook}"
- Caption: "${input.caption.slice(0, 800)}"
${input.cta ? `- CTA: ${input.cta}` : ''}
${input.hashtagsCount !== undefined ? `- Hashtags: ${input.hashtagsCount}` : ''}
${input.primerComentario ? `- Primer comentario: "${input.primerComentario}"` : ''}

TOP PERFORMERS HISTÓRICOS DE LA CUENTA:
${topResumen}

Reglas:
- Scores 0-100. NO infles. Si el hook es genérico → ≤55.
- "ajustesAltoImpacto" debe contener cambios PEQUEÑOS pero potentes (cambiar 1 palabra del hook puede subir 20 puntos).
- "riesgoFlop": 'alto' si el hook no detiene scroll en 2s; 'medio' si es funcional; 'bajo' si está tensionado.
- "comparacionConTopPerformers": comparar el patrón vs los virales históricos.

JSON:
{
  "scoreGeneral": 0,
  "scoreSaves": 0,
  "scoreShares": 0,
  "scoreCompletion": 0,
  "fortalezas": ["..."],
  "debilidades": ["..."],
  "ajustesAltoImpacto": [{ "ajuste": "...", "impactoEsperado": "..." }],
  "hookAlternativosSugeridos": ["..."],
  "mejorMomentoPublicar": "ej: martes 20:30 (justifica)",
  "riesgoFlop": "bajo|medio|alto",
  "comparacionConTopPerformers": "..."
}`;
  return askJson<PerformancePrediction>(prompt, { maxTokens: 3000 });
};
