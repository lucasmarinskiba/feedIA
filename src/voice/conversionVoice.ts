/**
 * Voice Conversion Engine — Fase 21
 * Funnel, scarcity, social proof, offers
 */

import { log } from '../agent/logger.js';
import { loadBrandProfile } from '../config/index.js';

export interface VoiceActionResult {
  ok: boolean;
  spokenResponse: string;
  actionType: string;
  executed: boolean;
  detail?: unknown;
}

const response = (esMsg: string, enMsg: string): string => {
  const brand = loadBrandProfile();
  const locale = brand.audience.locale ?? 'es-AR';
  return locale.startsWith('es') ? esMsg : enMsg;
};

/* ── Conversion Funnel ───────────────────────────────────────────────────── */

export const analyzeConversionFunnel = async (): Promise<VoiceActionResult> => {
  const actionType = 'conversion.funnel';
  log.info('[conversionVoice] analyzeConversionFunnel invoked');
  try {
    const brand = loadBrandProfile();
    const { mapConversionFunnel } = await import('../capabilities/conversion/conversionFunnel.js');
    const funnel = await mapConversionFunnel(brand);
    return {
      ok: true,
      spokenResponse: response(
        `Funnel mapeado. El cuello de botella está en ${funnel.bottleneck}. Enfocate en: ${funnel.currentFocus}.`,
        `Funnel mapped. The bottleneck is at ${funnel.bottleneck}. Focus on: ${funnel.currentFocus}.`,
      ),
      actionType,
      executed: true,
      detail: funnel,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log.error(`[conversionVoice] funnel error: ${msg}`);
    return {
      ok: false,
      spokenResponse: response('Error analizando el funnel.', 'Error analyzing funnel.'),
      actionType,
      executed: false,
      detail: { error: msg },
    };
  }
};

export const suggestFunnelFix = async (bottleneckStage: string): Promise<VoiceActionResult> => {
  const actionType = 'conversion.funnelFix';
  log.info(`[conversionVoice] suggestFunnelFix for ${bottleneckStage}`);
  try {
    const brand = loadBrandProfile();
    const { suggestFunnelFix: fix } = await import('../capabilities/conversion/conversionFunnel.js');
    const result = await fix(brand, bottleneckStage);
    return {
      ok: true,
      spokenResponse: response(
        `Táctica para ${bottleneckStage}: ${result.tactic}. Impacto esperado: ${result.expectedLift}.`,
        `Tactic for ${bottleneckStage}: ${result.tactic}. Expected impact: ${result.expectedLift}.`,
      ),
      actionType,
      executed: true,
      detail: result,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      spokenResponse: response('Error sugiriendo fix.', 'Error suggesting fix.'),
      actionType,
      executed: false,
      detail: { error: msg },
    };
  }
};

/* ── Scarcity Engine ─────────────────────────────────────────────────────── */

export const generateScarcityCampaign = async (context?: string): Promise<VoiceActionResult> => {
  const actionType = 'conversion.scarcity';
  log.info('[conversionVoice] generateScarcityCampaign');
  try {
    const brand = loadBrandProfile();
    const { generateScarcityCampaign: gen } = await import('../capabilities/conversion/scarcityEngine.js');
    const campaign = await gen(brand, context);
    return {
      ok: true,
      spokenResponse: response(
        `Campaña de escasez generada: "${campaign.headline}". Tipo: ${campaign.type}. Nivel de urgencia: ${campaign.urgencyLevel}.`,
        `Scarcity campaign generated: "${campaign.headline}". Type: ${campaign.type}. Urgency: ${campaign.urgencyLevel}.`,
      ),
      actionType,
      executed: true,
      detail: campaign,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      spokenResponse: response('Error generando escasez.', 'Error generating scarcity.'),
      actionType,
      executed: false,
      detail: { error: msg },
    };
  }
};

export const generateCountdownSequence = async (eventName: string, launchDate: string): Promise<VoiceActionResult> => {
  const actionType = 'conversion.countdown';
  log.info(`[conversionVoice] countdown for ${eventName}`);
  try {
    const brand = loadBrandProfile();
    const { generateCountdownSequence: gen } = await import('../capabilities/conversion/scarcityEngine.js');
    const campaigns = await gen(brand, eventName, launchDate);
    return {
      ok: true,
      spokenResponse: response(
        `Secuencia de countdown generada: ${campaigns.length} posts para ${eventName}.`,
        `Countdown sequence generated: ${campaigns.length} posts for ${eventName}.`,
      ),
      actionType,
      executed: true,
      detail: campaigns,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      spokenResponse: response('Error generando countdown.', 'Error generating countdown.'),
      actionType,
      executed: false,
      detail: { error: msg },
    };
  }
};

/* ── Social Proof ────────────────────────────────────────────────────────── */

export const generateSocialProof = async (): Promise<VoiceActionResult> => {
  const actionType = 'conversion.socialProof';
  log.info('[conversionVoice] generateSocialProof');
  try {
    const brand = loadBrandProfile();
    const { generateSocialProofPack } = await import('../capabilities/conversion/socialProof.js');
    const pack = await generateSocialProofPack(brand);
    return {
      ok: true,
      spokenResponse: response(
        `Paquete de prueba social listo: ${pack.testimonials.length} testimonios, ${pack.beforeAfters.length} before/after, ${pack.statsToHighlight.length} stats.`,
        `Social proof pack ready: ${pack.testimonials.length} testimonials, ${pack.beforeAfters.length} before/after, ${pack.statsToHighlight.length} stats.`,
      ),
      actionType,
      executed: true,
      detail: pack,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      spokenResponse: response('Error generando social proof.', 'Error generating social proof.'),
      actionType,
      executed: false,
      detail: { error: msg },
    };
  }
};

/* ── Offer Generator ─────────────────────────────────────────────────────── */

export const generateOffer = async (offerType?: string, context?: string): Promise<VoiceActionResult> => {
  const actionType = 'conversion.offer';
  log.info('[conversionVoice] generateOffer');
  try {
    const brand = loadBrandProfile();
    const { generateOffer: gen } = await import('../capabilities/conversion/offerGenerator.js');
    const offer = await gen(
      brand,
      offerType as 'discount' | 'bundle' | 'lead_magnet' | 'flash_sale' | 'exclusive' | undefined,
      context,
    );
    return {
      ok: true,
      spokenResponse: response(
        `Oferta generada: "${offer.headline}". Tipo: ${offer.type}. Ideal para: ${offer.idealFor.join(', ')}.`,
        `Offer generated: "${offer.headline}". Type: ${offer.type}. Ideal for: ${offer.idealFor.join(', ')}.`,
      ),
      actionType,
      executed: true,
      detail: offer,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      spokenResponse: response('Error generando oferta.', 'Error generating offer.'),
      actionType,
      executed: false,
      detail: { error: msg },
    };
  }
};

export const generateLaunchSequence = async (offerName: string): Promise<VoiceActionResult> => {
  const actionType = 'conversion.launchSequence';
  log.info(`[conversionVoice] launchSequence for ${offerName}`);
  try {
    const brand = loadBrandProfile();
    const { generateLaunchSequence: gen } = await import('../capabilities/conversion/offerGenerator.js');
    const offers = await gen(brand, offerName);
    return {
      ok: true,
      spokenResponse: response(
        `Secuencia de lanzamiento generada: ${offers.length} ofertas escalonadas para ${offerName}.`,
        `Launch sequence generated: ${offers.length} tiered offers for ${offerName}.`,
      ),
      actionType,
      executed: true,
      detail: offers,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      spokenResponse: response('Error generando secuencia.', 'Error generating sequence.'),
      actionType,
      executed: false,
      detail: { error: msg },
    };
  }
};
