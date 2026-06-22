import { askJson } from '../../agent/claude.js';
import { brandContext } from '../../agent/memory.js';
import type { BrandProfile } from '../../config/types.js';

export interface PatternIdea {
  concepto: string;
  gancho: string;
  formato: 'reel' | 'carrusel' | 'post-imagen' | 'historia' | 'reel-faceless';
  porQueSeSitenteFresco: string;
  porQueGuardadosOCompartidos: string;
}

export interface NichoAnalysisResult {
  patronesSaturados: string[];
  ideas: PatternIdea[];
}

export const analyzeNicho = async (brand: BrandProfile, objetivo?: string): Promise<NichoAnalysisResult> => {
  const prompt = `Actuá como un estratega senior de crecimiento en Instagram con 10 años en LATAM.

${brandContext(brand)}
OBJETIVO: ${objetivo ?? brand.goals.primary}

Tarea:
1. Identificá los 7 patrones de contenido más saturados en este nicho específico (no los obvios, los que ya nadie quiere ver pero todos siguen subiendo).
2. Creá 10 ideas de posts que rompan esos patrones SIN perder compatibilidad con el algoritmo (no hacer nada que penalice retención, completion rate, guardados o compartidos).

Formato JSON exacto:
{
  "patronesSaturados": ["patrón 1 con ejemplo concreto", ...7 items],
  "ideas": [
    {
      "concepto": "qué muestra el post",
      "gancho": "primera línea/frame que detiene scroll",
      "formato": "reel|carrusel|post-imagen|historia|reel-faceless",
      "porQueSeSitenteFresco": "qué patrón rompe y cómo",
      "porQueGuardadosOCompartidos": "razón psicológica concreta"
    },
    ...10 items
  ]
}`;
  return askJson<NichoAnalysisResult>(prompt, { maxTokens: 6000 });
};
