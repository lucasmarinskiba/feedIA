/**
 * Offer Generator — Crea ofertas específicas según el nicho
 */

import { askJson } from '../../agent/claude.js';
import { brandContext } from '../../agent/memory.js';
import type { BrandProfile } from '../../config/types.js';

export interface Offer {
  id: string;
  name: string;
  type: 'discount' | 'bundle' | 'lead_magnet' | 'flash_sale' | 'exclusive';
  headline: string;
  description: string;
  originalPrice?: string;
  offerPrice?: string;
  deadline?: string;
  scarcityNote?: string;
  idealFor: string[];
  contentFormats: ('feed' | 'story' | 'reel' | 'carousel')[];
}

const generateId = (): string => `offer-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`;

export const generateOffer = async (
  brand: BrandProfile,
  offerType?: Offer['type'],
  context?: string,
): Promise<Offer> => {
  const prompt = `Sos un offer strategist. Creá una oferta irresistible para Instagram.

${brandContext(brand)}

Tipo de oferta: ${offerType ?? 'adaptada al nicho'}
Contexto: ${context ?? 'Lanzamiento o promoción general'}

Reglas:
- La oferta debe ser REALISTA (no prometas lo que no podés cumplir)
- Scarcity real: tiempo limitado o cantidad limitada
- Precios solo si aplica al nicho (si es marca personal, podría ser "acceso gratuito")
- Que la oferta se sienta EXCLUSIVA para la comunidad de Instagram

JSON:
{
  "name": "nombre interno de la oferta",
  "type": "discount|bundle|lead_magnet|flash_sale|exclusive",
  "headline": "hook de la oferta (máx 10 palabras)",
  "description": "descripción persuasiva (máx 3 oraciones)",
  "originalPrice": "precio original (opcional)",
  "offerPrice": "precio oferta (opcional)",
  "deadline": "cuándo vence (opcional)",
  "scarcityNote": "nota de escasez realista",
  "idealFor": ["tipo de persona 1", "tipo 2"],
  "contentFormats": ["feed", "story", "reel", "carousel"]
}`;
  const result = await askJson<Omit<Offer, 'id'>>(prompt, { maxTokens: 2000 });
  return { ...result, id: generateId() };
};

export const generateLaunchSequence = async (brand: BrandProfile, offerName: string): Promise<Offer[]> => {
  const prompt = `Sos un launch strategist. Creá una secuencia de 3 ofertas escalonadas para un lanzamiento.

${brandContext(brand)}

Producto/servicio a lanzar: ${offerName}

Secuencia:
1. Oferta early-bird (mejor precio, pocos lugares)
2. Oferta regular (precio normal con bonus)
3. Oferta last-chance (última oportunidad, cierra pronto)

JSON: array de 3 objetos Offer
`;
  const results = await askJson<Omit<Offer, 'id'>[]>(prompt, { maxTokens: 2500 });
  return results.map((r) => ({ ...r, id: generateId() }));
};
