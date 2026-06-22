/**
 * Voice Audience & Personas — Fase 24
 * Segmentation, content matching, personalization
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

/* ── Audience Segmentation ───────────────────────────────────────────────── */

export const segmentAudience = async (): Promise<VoiceActionResult> => {
  const actionType = 'audience.segment';
  log.info('[audienceVoice] segmentAudience');
  try {
    const brand = loadBrandProfile();
    const { segmentAudience: segment } = await import('../capabilities/community/audienceSegmentation.js');
    const personas = await segment(brand);
    const names = personas.map((p) => `${p.emoji} ${p.name} (${p.estimatedPercentage})`).join(', ');
    return {
      ok: true,
      spokenResponse: response(
        `Audiencia segmentada en ${personas.length} personas: ${names}.`,
        `Audience segmented into ${personas.length} personas: ${names}.`,
      ),
      actionType,
      executed: true,
      detail: personas,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      spokenResponse: response('Error segmentando audiencia.', 'Error segmenting audience.'),
      actionType,
      executed: false,
      detail: { error: msg },
    };
  }
};

export const analyzePersonaJourney = async (personaName: string): Promise<VoiceActionResult> => {
  const actionType = 'audience.journey';
  log.info(`[audienceVoice] journey for ${personaName}`);
  try {
    const brand = loadBrandProfile();
    const { analyzePersonaJourney: analyze } = await import('../capabilities/community/audienceSegmentation.js');
    const journey = await analyze(brand, personaName);
    return {
      ok: true,
      spokenResponse: response(
        `Journey de ${personaName} analizado. Bloqueo: ${journey.conversionBlocker}. Oportunidad: ${journey.opportunity}.`,
        `Journey for ${personaName} analyzed. Blocker: ${journey.conversionBlocker}. Opportunity: ${journey.opportunity}.`,
      ),
      actionType,
      executed: true,
      detail: journey,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      spokenResponse: response('Error analizando journey.', 'Error analyzing journey.'),
      actionType,
      executed: false,
      detail: { error: msg },
    };
  }
};

/* ── Persona Content Match ───────────────────────────────────────────────── */

export const matchContentToPersonas = async (): Promise<VoiceActionResult> => {
  const actionType = 'audience.match';
  log.info('[audienceVoice] matchContentToPersonas');
  try {
    const brand = loadBrandProfile();
    const { segmentAudience: segment } = await import('../capabilities/community/audienceSegmentation.js');
    const { matchContentToPersonas: match } = await import('../capabilities/community/personaContentMatch.js');
    const personas = await segment(brand);
    const matches = await match(brand, personas);
    return {
      ok: true,
      spokenResponse: response(
        `Contenido emparejado con ${matches.length} personas. Cada persona tiene ${matches[0]?.contentIdeas.length ?? 0} ideas.`,
        `Content matched to ${matches.length} personas. Each persona has ${matches[0]?.contentIdeas.length ?? 0} ideas.`,
      ),
      actionType,
      executed: true,
      detail: matches,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      spokenResponse: response('Error emparejando contenido.', 'Error matching content.'),
      actionType,
      executed: false,
      detail: { error: msg },
    };
  }
};

/* ── Content Personalization ─────────────────────────────────────────────── */

export const generatePersonalizedVariants = async (
  postTopic: string,
  segments: string[],
): Promise<VoiceActionResult> => {
  const actionType = 'audience.personalize';
  log.info(`[audienceVoice] personalize for ${postTopic}`);
  try {
    const brand = loadBrandProfile();
    const { generatePersonalizedVariants: gen } = await import('../capabilities/community/contentPersonalization.js');
    const variants = await gen(brand, postTopic, segments);
    return {
      ok: true,
      spokenResponse: response(
        `${variants.length} variantes personalizadas generadas para "${postTopic}".`,
        `${variants.length} personalized variants generated for "${postTopic}".`,
      ),
      actionType,
      executed: true,
      detail: variants,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      spokenResponse: response('Error personalizando.', 'Error personalizing.'),
      actionType,
      executed: false,
      detail: { error: msg },
    };
  }
};

export const suggestSegmentRotation = async (): Promise<VoiceActionResult> => {
  const actionType = 'audience.rotation';
  log.info('[audienceVoice] suggestSegmentRotation');
  try {
    const brand = loadBrandProfile();
    const { suggestSegmentRotation: suggest } = await import('../capabilities/community/contentPersonalization.js');
    const plan = await suggest(brand);
    return {
      ok: true,
      spokenResponse: response(
        `Plan semanal sugerido: ${plan.weeklyPlan.join(', ')}.`,
        `Weekly plan suggested: ${plan.weeklyPlan.join(', ')}.`,
      ),
      actionType,
      executed: true,
      detail: plan,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      spokenResponse: response('Error sugiriendo rotación.', 'Error suggesting rotation.'),
      actionType,
      executed: false,
      detail: { error: msg },
    };
  }
};
