import { askJson } from '../../agent/claude.js';
import { brandContext } from '../../agent/memory.js';
import type { BrandProfile } from '../../config/types.js';

export interface PosicionamientoResult {
  elegante: string;
  directa: string;
  premium: string;
  notas: string;
}

export const reposicionar = async (brand: BrandProfile, contenido: string): Promise<PosicionamientoResult> => {
  const prompt = `Actuá como especialista en posicionamiento de marca para Instagram.

${brandContext(brand)}

CONTENIDO ORIGINAL:
"""
${contenido}
"""

Reescribí el contenido para transmitir competencia y autoridad SIN parecer gurú, SIN presumir números y SIN sonar arrogante. Lenguaje preciso, confianza sutil, claridad.

Entregá tres versiones:
- "elegante": refinada, frases cortas, espacios respirables
- "directa": al hueso, sin adornos, frase que clava
- "premium": densa en valor, autoridad por evidencia, no por ego

Formato JSON:
{
  "elegante": "...",
  "directa": "...",
  "premium": "...",
  "notas": "diferencia clave entre las 3 versiones y cuándo usar cada una"
}`;
  return askJson<PosicionamientoResult>(prompt, { maxTokens: 3000 });
};
