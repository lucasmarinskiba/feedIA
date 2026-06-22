/**
 * Conversion Funnel — Mapea el funnel de cada follower
 * awareness → interest → decision → action
 */

import { askJson } from '../../agent/claude.js';
import { brandContext } from '../../agent/memory.js';
import type { BrandProfile } from '../../config/types.js';

export interface FunnelStage {
  stage: 'awareness' | 'interest' | 'decision' | 'action';
  description: string;
  contentTypes: string[];
  ctas: string[];
  metrics: string[];
}

export interface FunnelMap {
  stages: FunnelStage[];
  currentFocus: string;
  bottleneck: string;
  recommendation: string;
}

export const mapConversionFunnel = async (brand: BrandProfile): Promise<FunnelMap> => {
  const prompt = `Sos un funnel strategist senior. Mapeá el funnel de conversión de Instagram para esta marca.

${brandContext(brand)}

Generá un funnel de 4 etapas (awareness, interest, decision, action). Para cada etapa:
- Qué tipo de contenido funciona mejor
- Qué CTAs usar (sin ser invasivo)
- Qué métricas trackear
- Dónde está el cuello de botella más probable

JSON:
{
  "stages": [
    {
      "stage": "awareness|interest|decision|action",
      "description": "qué pasa en esta etapa",
      "contentTypes": ["tipo de contenido 1", "tipo 2"],
      "ctas": ["CTA suave 1", "CTA 2"],
      "metrics": ["métrica 1", "métrica 2"]
    }
  ],
  "currentFocus": "en qué etapa debería enfocarse la marca AHORA",
  "bottleneck": "dónde se pierde la mayoría de la gente",
  "recommendation": "acción concreta para mejorar el funnel"
}`;
  return askJson<FunnelMap>(prompt, { maxTokens: 2500 });
};

export const suggestFunnelFix = async (
  brand: BrandProfile,
  bottleneckStage: string,
): Promise<{ tactic: string; contentIdeas: string[]; expectedLift: string }> => {
  const prompt = `Sos un conversion optimizer. La marca tiene un cuello de botella en la etapa "${bottleneckStage}" del funnel.

${brandContext(brand)}

Proponé 1 táctica concreta y 3 ideas de contenido para desbloquear esa etapa.

JSON:
{
  "tactic": "táctica específica",
  "contentIdeas": ["idea 1", "idea 2", "idea 3"],
  "expectedLift": "ej: +15-25% de conversion estimado"
}`;
  return askJson<{ tactic: string; contentIdeas: string[]; expectedLift: string }>(prompt, { maxTokens: 1500 });
};
