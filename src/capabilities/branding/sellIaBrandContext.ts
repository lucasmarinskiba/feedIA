import type { BrandProfile } from '../../config/types.js';
import { IMAGE_SOURCE_INSTRUCTIONS } from '../aesthetic/brandStyleGuide.js';

/**
 * Brand Kit adaptado para SellIA (automatización de venta), no para
 * generación de contenido: sin bloques de prompt de diseño, sólo lo que
 * necesita para que su copy — listings, emails, DMs de outreach — no
 * contradiga la voz/identidad que el usuario ya definió acá.
 *
 * Antes de esto, la integración FeedIA↔SellIA (ver src/api/FEEDIA_SELLIA_INTEGRATION.md)
 * sólo mandaba nombre/precio/plataformas de producto: SellIA nunca sabía qué
 * tono usar ni qué evitar decir. Consumido por GET /api/sellia/brand-context.
 */
export interface SellIaBrandContext {
  brandName: string;
  handle: string;
  accountType: BrandProfile['type'];
  niche: string;
  claim: string;
  voice: {
    tone: string[];
    forbidden: string[];
  };
  audience: {
    description: string;
    pains: string[];
    desires: string[];
  };
  visualIdentity: {
    palette: string[];
    accentColor: string;
    imageSourceInstruction: string;
  };
  positioning: {
    archetype: string;
    differentiators: string[];
    valuePromise: string;
  };
  salesGoal: {
    primary: BrandProfile['goals']['primary'];
    metricsToWatch: string[];
  };
  competitors: string[];
}

export const buildSellIaBrandContext = (brand: BrandProfile): SellIaBrandContext => ({
  brandName: brand.name,
  handle: brand.handle,
  accountType: brand.type,
  niche: brand.niche,
  claim:
    brand.brandStrategy?.promise ||
    `Ayudamos a ${brand.audience.description || 'nuestra audiencia'} con ${brand.niche}.`,
  voice: {
    tone: brand.voice.tone,
    forbidden: brand.voice.forbidden,
  },
  audience: {
    description: brand.audience.description,
    pains: brand.audience.pains,
    desires: brand.audience.desires,
  },
  visualIdentity: {
    palette: brand.visual.palette,
    accentColor: brand.visual.accentColor,
    imageSourceInstruction: IMAGE_SOURCE_INSTRUCTIONS[brand.visual.imageSource ?? 'ai-generated'],
  },
  positioning: {
    archetype: brand.brandStrategy?.archetype || '',
    differentiators: brand.brandStrategy?.differentiators ?? [],
    valuePromise: brand.brandStrategy?.promise || '',
  },
  salesGoal: {
    primary: brand.goals.primary,
    metricsToWatch: brand.goals.metricsToWatch,
  },
  competitors: brand.competitors,
});

/**
 * Igual que buildSellIaBrandContext pero en prosa lista para pegar en un
 * prompt de un agente de venta (outreach, respuesta de DM, descripción de
 * listing), en vez de que ese agente tenga que interpretar el JSON.
 */
export const sellIaBrandContextPrompt = (brand: BrandProfile): string => {
  const ctx = buildSellIaBrandContext(brand);
  return `CONTEXTO DE MARCA PARA VENTA (${ctx.brandName}):
Tono de voz: ${ctx.voice.tone.join(', ') || 'profesional'}
Nunca decir: ${ctx.voice.forbidden.join(', ') || 'nada en particular'}
Público: ${ctx.audience.description}
Dolores a resolver: ${ctx.audience.pains.join(' · ') || 'no definidos'}
Deseos a apelar: ${ctx.audience.desires.join(' · ') || 'no definidos'}
Promesa de marca: ${ctx.claim}
${ctx.positioning.archetype ? `Arquetipo: ${ctx.positioning.archetype}` : ''}
${ctx.positioning.differentiators.length ? `Diferenciales: ${ctx.positioning.differentiators.join(', ')}` : ''}
Objetivo comercial: ${ctx.salesGoal.primary}
${ctx.competitors.length ? `No sonar como: ${ctx.competitors.join(', ')}` : ''}
Toda oferta, email o mensaje de outreach que generes debe sonar coherente con este tono y esta promesa — nunca genérico.`.trim();
};
