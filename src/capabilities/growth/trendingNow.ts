/**
 * Trending Now — Detecta qué está trending en el nicho y propone contenido urgente
 */

import { askJson } from '../../agent/claude.js';
import { brandContext } from '../../agent/memory.js';
import type { BrandProfile } from '../../config/types.js';

export interface TrendOpportunity {
  trend: string;
  source: string;
  relevance: 'alta' | 'media' | 'baja';
  contentIdea: string;
  format: 'reel' | 'story' | 'post' | 'carousel';
  urgency: string;
  whyNow: string;
}

export const detectTrendingOpportunities = async (brand: BrandProfile): Promise<TrendOpportunity[]> => {
  const prompt = `Sos un trend analyst. Analizá qué está trending AHORA en el nicho de esta marca y proponé contenido urgente.

${brandContext(brand)}

Reglas:
- Las tendencias deben ser relevantes para el nicho (no forzar)
- Priorizar tendencias con vida útil > 48h
- Cada idea debe ser filmable/producible en menos de 2 horas
- Indicar por qué es urgente (ventana de oportunidad)

JSON: array de 4-5 oportunidades:
[
  {
    "trend": "nombre de la tendencia",
    "source": "de dónde surge (plataforma, evento, cultura)",
    "relevance": "alta|media|baja",
    "contentIdea": "idea concreta de contenido",
    "format": "reel|story|post|carousel",
    "urgency": "por qué hay que actuar ahora",
    "whyNow": "contexto de por qué esta tendencia está creciendo"
  }
]`;
  return askJson<TrendOpportunity[]>(prompt, { maxTokens: 2500 });
};

export const adaptTrendToBrand = async (
  brand: BrandProfile,
  trendName: string,
): Promise<{ angle: string; hook: string; visualIdea: string; caution: string }> => {
  const prompt = `Sos un content strategist. Adaptá una tendencia a la voz de esta marca.

${brandContext(brand)}

Tendencia: ${trendName}

Reglas:
- No forzar la tendencia si no encaja
- Mantener la identidad de marca
- Señalar riesgos o precauciones

JSON:
{
  "angle": "ángulo específico para la marca",
  "hook": "hook del post",
  "visualIdea": "idea visual",
  "caution": "precaución o riesgo a evitar"
}`;
  return askJson<{ angle: string; hook: string; visualIdea: string; caution: string }>(prompt, { maxTokens: 1500 });
};
