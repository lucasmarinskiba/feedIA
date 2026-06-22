/**
 * Bio Optimizer — Genera bios alternativas con CTA, keywords, social proof
 */

import { askJson } from '../../agent/claude.js';
import { brandContext } from '../../agent/memory.js';
import type { BrandProfile } from '../../config/types.js';

export interface BioVariant {
  text: string;
  style: 'authority' | 'friendly' | 'mysterious' | 'direct';
  whyItWorks: string;
  bestFor: string;
}

export const generateBioVariants = async (brand: BrandProfile): Promise<BioVariant[]> => {
  const prompt = `Sos un copywriter especializado en bios de Instagram. Generá 4 variantes de bio para este perfil.

${brandContext(brand)}

Reglas para cada bio:
- Máximo 150 caracteres (espacio para link)
- Debe responder: ¿quién sos?, ¿qué hacés?, ¿por qué me importa?
- CTA claro o social proof
- Keywords del nicho para búsqueda
- Sin emojis excesivos (máx 3)

JSON: array de 4 variantes:
[
  {
    "text": "bio completa",
    "style": "authority|friendly|mysterious|direct",
    "whyItWorks": "explicación breve de por qué convierte",
    "bestFor": "qué tipo de marca/perfil le queda mejor"
  }
]`;
  return askJson<BioVariant[]>(prompt, { maxTokens: 2000 });
};

export const optimizeBioForConversion = async (
  brand: BrandProfile,
  goal: 'followers' | 'leads' | 'sales' | 'authority',
): Promise<BioVariant> => {
  const prompt = `Sos un CRO specialist. Optimizá la bio de Instagram para convertir visitantes en ${goal}.

${brandContext(brand)}

Objetivo de conversión: ${goal}

JSON:
{
  "text": "bio optimizada",
  "style": "authority|friendly|mysterious|direct",
  "whyItWorks": "explicación",
  "bestFor": "contexto"
}`;
  return askJson<BioVariant>(prompt, { maxTokens: 1500 });
};
