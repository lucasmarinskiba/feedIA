/**
 * FOMO Campaign Engine — Orquestador de campañas FOMO completas
 * Adaptativo por tipo de perfil: influencer, e-commerce, servicios, comunidad
 */

import { askJson } from '../../agent/claude.js';
import { brandContext } from '../../agent/memory.js';
import type { BrandProfile } from '../../config/types.js';

export type ProfileType = 'influencer' | 'ecommerce' | 'services' | 'community';

export interface FomoCampaignDay {
  day: number;
  phase: 'tease' | 'build' | 'peak' | 'drop' | 'aftermath';
  contentPieces: {
    feed?: string;
    stories?: string;
    reel?: string;
    dm?: string;
  };
  fomoTactic: string;
  psychology: string;
}

export interface FomoCampaign {
  name: string;
  durationDays: number;
  profileType: ProfileType;
  theme: string;
  days: FomoCampaignDay[];
  keyMetrics: string[];
  playbook: string;
}

export const detectProfileType = (brand: BrandProfile): ProfileType => {
  const niche = brand.niche.toLowerCase();
  if (niche.includes('shop') || niche.includes('producto') || niche.includes('retail') || niche.includes('moda'))
    return 'ecommerce';
  if (niche.includes('servicio') || niche.includes('consult') || niche.includes('coach') || niche.includes('agencia'))
    return 'services';
  if (niche.includes('comunidad') || niche.includes('ong') || niche.includes('causa') || niche.includes('movimiento'))
    return 'community';
  return 'influencer';
};

export const designFomoCampaign = async (
  brand: BrandProfile,
  theme?: string,
  durationDays = 14,
): Promise<FomoCampaign> => {
  const profileType = detectProfileType(brand);
  const prompt = `Sos un FOMO campaign strategist de elite. Diseñá una campaña de ${durationDays} días.

${brandContext(brand)}

TIPO DE PERFIL: ${profileType}
Tema: ${theme ?? 'adaptado al nicho'}

ESTRATEGIA POR TIPO DE PERFIL:
- influencer: FOMO por contenido exclusivo, acceso, comunidad, " detrás de cámaras"
- ecommerce: FOMO por stock limitado, drops, flash sales, "se agotó"
- services: FOMO por cupos limitados, lista de espera, early-bird, "solo 5 lugares"
- community: FOMO por pertenencia, insiders, impacto colectivo, "los que están adentro"

Fases de la campaña:
1. Tease (días 1-3): misterio, "algo se viene"
2. Build (días 4-8): revelación parcial, social proof creciente
3. Peak (días 9-11): urgencia máxima, countdown activo
4. Drop (día 12): el momento de la verdad
5. Aftermath (días 13-14): celebración + FOMO para "el próximo"

JSON:
{
  "name": "nombre de la campaña",
  "durationDays": ${durationDays},
  "profileType": "${profileType}",
  "theme": "tema",
  "days": [
    {
      "day": 1,
      "phase": "tease|build|peak|drop|aftermath",
      "contentPieces": { "feed": "post", "stories": "story", "reel": "reel", "dm": "dm" },
      "fomoTactic": "táctica específica",
      "psychology": "principio psicológico"
    }
  ],
  "keyMetrics": ["métrica 1", "métrica 2"],
  "playbook": "resumen ejecutivo de la estrategia"
}`;
  return askJson<FomoCampaign>(prompt, { maxTokens: 4000 });
};

export const getFomoPlaybookForProfile = (
  profileType: ProfileType,
): { strengths: string[]; tactics: string[]; avoid: string[] } => {
  const playbooks: Record<ProfileType, { strengths: string[]; tactics: string[]; avoid: string[] }> = {
    influencer: {
      strengths: ['Acceso personal', 'Contenido exclusivo', 'Comunidad leal', 'Narrativa personal'],
      tactics: [
        'Close Friends drops',
        'Series episódicas',
        'BTS efímero',
        'Q&A exclusivos',
        'Early access a contenido',
      ],
      avoid: ['Stock limitado falso', 'Descuentos agresivos', 'CTAs comerciales invasivos'],
    },
    ecommerce: {
      strengths: ['Producto tangible', 'Transacción clara', 'Urgencia real de stock', 'Seasonal drops'],
      tactics: [
        'Flash sales 24h',
        'Drops limitados',
        'Countdown con stock visible',
        'Bundling exclusivo',
        'Early access a nuevos productos',
      ],
      avoid: ['FOMO por comunidad sin comunidad', 'Contenido sin CTA comercial', 'Promesas de valor vacías'],
    },
    services: {
      strengths: ['Cupos limitados reales', 'Lista de espera', 'Precio que sube', 'Resultados tangibles'],
      tactics: [
        'Cupos que se agotan',
        'Lista de espera VIP',
        'Early-bird pricing',
        'Bonus por pronto pago',
        'Acceso exclusivo a workshops',
      ],
      avoid: ['Stock limitado (no aplica)', 'Drops de producto', 'FOMO visual sin sustancia'],
    },
    community: {
      strengths: ['Pertenencia', 'Identidad grupal', 'Impacto colectivo', 'Valores compartidos'],
      tactics: [
        'Insider circles',
        'Misiones colectivas',
        'Acceso a eventos exclusivos',
        'Reconocimiento público',
        'Votaciones exclusivas',
      ],
      avoid: ['Ventas directas', 'Pricing urgency', 'Exclusividad que divide en lugar de unir'],
    },
  };
  return playbooks[profileType];
};

export const generateDayContent = async (
  brand: BrandProfile,
  campaignName: string,
  day: number,
  phase: FomoCampaignDay['phase'],
): Promise<FomoCampaignDay> => {
  const prompt = `Sos un FOMO content creator. Generá el contenido del día ${day} (${phase}) de la campaña "${campaignName}".

${brandContext(brand)}

JSON:
{
  "day": ${day},
  "phase": "${phase}",
  "contentPieces": { "feed": "post del día", "stories": "story", "reel": "reel", "dm": "dm" },
  "fomoTactic": "táctica usada",
  "psychology": "principio psicológico"
}`;
  return askJson<FomoCampaignDay>(prompt, { maxTokens: 2000 });
};
