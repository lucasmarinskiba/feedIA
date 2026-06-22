/**
 * Voice Community & Ritual — Fase 23
 * Rituals, insider content, community naming, engagement loops
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

/* ── Ritual Engine ───────────────────────────────────────────────────────── */

export const createRituals = async (): Promise<VoiceActionResult> => {
  const actionType = 'ritual.create';
  log.info('[ritualVoice] createRituals');
  try {
    const brand = loadBrandProfile();
    const { generateRituals } = await import('../capabilities/community/ritualEngine.js');
    const rituals = await generateRituals(brand);
    const names = rituals.map((r) => r.name).join(', ');
    return {
      ok: true,
      spokenResponse: response(
        `Rituales creados: ${names}. Total: ${rituals.length} rituales semanales.`,
        `Rituals created: ${names}. Total: ${rituals.length} weekly rituals.`,
      ),
      actionType,
      executed: true,
      detail: rituals,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      spokenResponse: response('Error creando rituales.', 'Error creating rituals.'),
      actionType,
      executed: false,
      detail: { error: msg },
    };
  }
};

/* ── Insider Content ─────────────────────────────────────────────────────── */

export const createInsiderContent = async (): Promise<VoiceActionResult> => {
  const actionType = 'ritual.insider';
  log.info('[ritualVoice] createInsiderContent');
  try {
    const brand = loadBrandProfile();
    const { generateInsiderContent } = await import('../capabilities/community/insiderContent.js');
    const content = await generateInsiderContent(brand);
    return {
      ok: true,
      spokenResponse: response(
        `${content.length} piezas de contenido insider generadas. Incluyen: ${content.map((c) => c.exclusivity).join(', ')}.`,
        `${content.length} insider content pieces generated. Includes: ${content.map((c) => c.exclusivity).join(', ')}.`,
      ),
      actionType,
      executed: true,
      detail: content,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      spokenResponse: response('Error generando insider content.', 'Error generating insider content.'),
      actionType,
      executed: false,
      detail: { error: msg },
    };
  }
};

/* ── Community Naming ────────────────────────────────────────────────────── */

export const suggestCommunityNames = async (): Promise<VoiceActionResult> => {
  const actionType = 'ritual.naming';
  log.info('[ritualVoice] suggestCommunityNames');
  try {
    const brand = loadBrandProfile();
    const { suggestCommunityNames: suggest } = await import('../capabilities/community/communityNaming.js');
    const names = await suggest(brand);
    const top = names
      .slice(0, 3)
      .map((n) => `${n.name} (${n.hashtag})`)
      .join(', ');
    return {
      ok: true,
      spokenResponse: response(
        `Nombres sugeridos: ${top}. Total: ${names.length} opciones.`,
        `Names suggested: ${top}. Total: ${names.length} options.`,
      ),
      actionType,
      executed: true,
      detail: names,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      spokenResponse: response('Error sugiriendo nombres.', 'Error suggesting names.'),
      actionType,
      executed: false,
      detail: { error: msg },
    };
  }
};

export const createCommunityManifesto = async (communityName: string): Promise<VoiceActionResult> => {
  const actionType = 'ritual.manifesto';
  log.info(`[ritualVoice] manifesto for ${communityName}`);
  try {
    const brand = loadBrandProfile();
    const { createCommunityManifesto: create } = await import('../capabilities/community/communityNaming.js');
    const manifesto = await create(brand, communityName);
    return {
      ok: true,
      spokenResponse: response(
        `Manifesto para ${communityName} creado. ${manifesto.rules.length} reglas de comunidad definidas.`,
        `Manifesto for ${communityName} created. ${manifesto.rules.length} community rules defined.`,
      ),
      actionType,
      executed: true,
      detail: manifesto,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      spokenResponse: response('Error creando manifesto.', 'Error creating manifesto.'),
      actionType,
      executed: false,
      detail: { error: msg },
    };
  }
};

/* ── Engagement Loops ────────────────────────────────────────────────────── */

export const createEngagementLoops = async (): Promise<VoiceActionResult> => {
  const actionType = 'ritual.loops';
  log.info('[ritualVoice] createEngagementLoops');
  try {
    const brand = loadBrandProfile();
    const { generateEngagementLoops } = await import('../capabilities/community/engagementLoops.js');
    const loops = await generateEngagementLoops(brand);
    return {
      ok: true,
      spokenResponse: response(
        `${loops.length} engagement loops diseñados. Ejemplo: ${loops[0]?.name ?? ''}.`,
        `${loops.length} engagement loops designed. Example: ${loops[0]?.name ?? ''}.`,
      ),
      actionType,
      executed: true,
      detail: loops,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      spokenResponse: response('Error diseñando loops.', 'Error designing loops.'),
      actionType,
      executed: false,
      detail: { error: msg },
    };
  }
};
