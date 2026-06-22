/**
 * contentGap.ts — Content Gap Analysis entre marca y competidores
 * ─────────────────────────────────────────────────────────────────────────
 * Descubre qué temas cubren los competidores que la marca no, y viceversa.
 */

import { askJson } from '../../agent/claude.js';
import { brandContext } from '../../agent/memory.js';
import type { BrandProfile } from '../../config/types.js';

export interface ContentGapResult {
  temasRivalTiene: string[]; // temas que cubren los competidores y nosotros no
  temasNosotrosTenemos: string[]; // temas que cubrimos y ellos no (ventaja)
  oportunidadesInmediatas: string[]; // temas con alta demanda y poca oferta
  recomendacionPrioritaria: string; // la #1 acción
}

export const analyzeContentGap = async (
  brand: BrandProfile,
  competitorCaptions: Array<{ handle: string; caption: string; likes: number }>,
  ourRecentTopics: string[],
): Promise<ContentGapResult> => {
  const prompt = `Actuá como estratega de contenido. Hacé un content gap analysis.

${brandContext(brand)}

NUESTROS TEMAS RECIENTES:
${ourRecentTopics.map((t) => `- ${t}`).join('\n')}

POSTS RECIENTES DE COMPETIDORES:
${competitorCaptions.map((p) => `- @${p.handle} (${p.likes} likes): ${p.caption.slice(0, 120)}`).join('\n')}

Devolvé JSON:
{
  "temasRivalTiene": ["máx 5 temas que cubren ellos y nosotros no"],
  "temasNosotrosTenemos": ["máx 3 temas donde vamos ganando"],
  "oportunidadesInmediatas": ["máx 3 áreas con alta demanda y poca competencia"],
  "recomendacionPrioritaria": "una sola frase con la acción #1"
}`;

  return askJson<ContentGapResult>(prompt, { maxTokens: 2500 });
};
