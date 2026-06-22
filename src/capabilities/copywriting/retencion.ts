import { askJson } from '../../agent/claude.js';
import { brandContext } from '../../agent/memory.js';
import type { BrandProfile } from '../../config/types.js';

export interface RetentionRewriteResult {
  versionMejorada: string;
  cambiosClave: string[];
  porQueEsMejor: string;
  metricasEsperadas: { watchTime: string; saves: string; shares: string };
}

export const optimizeForRetention = async (brand: BrandProfile, contenido: string): Promise<RetentionRewriteResult> => {
  const prompt = `Actuá como especialista en retención de Instagram.

${brandContext(brand)}

CONTENIDO ORIGINAL:
"""
${contenido}
"""

Reescribí este contenido para maximizar:
- tiempo de visualización
- tasa de finalización
- guardados
- compartidos

Reglas:
- Cada línea debe conectar con la siguiente (ningún corte que invite a abandonar)
- Eliminá partes débiles (relleno, rodeos, autoaclaraciones)
- Tono natural, directo, NO promocional
- Respetá la voz de marca: ${brand.voice.tone.join(', ')}

JSON:
{
  "versionMejorada": "texto reescrito completo",
  "cambiosClave": ["qué cambió 1", "qué cambió 2", ...],
  "porQueEsMejor": "explicación breve enfocada en mecánica de retención",
  "metricasEsperadas": {
    "watchTime": "estimación cualitativa (alta/media/baja) con razón",
    "saves": "...",
    "shares": "..."
  }
}`;
  return askJson<RetentionRewriteResult>(prompt, { maxTokens: 3500 });
};
