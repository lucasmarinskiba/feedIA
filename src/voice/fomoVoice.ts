/**
 * Voice FOMO & Episodic — Fase 25 (Expert Level)
 * Episodic content, countdowns, must-follow hooks, trending, anticipation,
 * drop culture, disappearing content, social proof counters, gamified FOMO,
 * insider exclusivity, visual FOMO, and full campaign orchestration.
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

/* ── Episodic Content ────────────────────────────────────────────────────── */

export const createEpisodicSeries = async (topic?: string, episodeCount?: number): Promise<VoiceActionResult> => {
  const actionType = 'fomo.series';
  log.info(`[fomoVoice] createEpisodicSeries: ${topic ?? 'auto'}`);
  try {
    const brand = loadBrandProfile();
    const { createEpisodicSeries: create } = await import('../capabilities/growth/episodicContent.js');
    const series = await create(brand, topic, episodeCount ?? 5);
    return {
      ok: true,
      spokenResponse: response(
        `Serie "${series.title}" creada con ${series.episodes.length} episodios. ${series.whyFollow}`,
        `Series "${series.title}" created with ${series.episodes.length} episodes. ${series.whyFollow}`,
      ),
      actionType,
      executed: true,
      detail: series,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      spokenResponse: response('Error creando serie.', 'Error creating series.'),
      actionType,
      executed: false,
      detail: { error: msg },
    };
  }
};

/* ── Countdown Engine ────────────────────────────────────────────────────── */

export const generateCountdown = async (eventName: string, launchDate: string): Promise<VoiceActionResult> => {
  const actionType = 'fomo.countdown';
  log.info(`[fomoVoice] countdown for ${eventName}`);
  try {
    const brand = loadBrandProfile();
    const { generateCountdownSequence: gen } = await import('../capabilities/growth/countdownEngine.js');
    const daysUntil = Math.ceil((new Date(launchDate).getTime() - Date.now()) / (24 * 3600_000));
    const posts = await gen(brand, eventName, Math.max(1, daysUntil));
    return {
      ok: true,
      spokenResponse: response(
        `Countdown generado: ${posts.length} posts para ${eventName}. Empieza en ${posts[0]?.label ?? ''}.`,
        `Countdown generated: ${posts.length} posts for ${eventName}. Starts at ${posts[0]?.label ?? ''}.`,
      ),
      actionType,
      executed: true,
      detail: posts,
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

export const generateTeaserDrop = async (eventName: string): Promise<VoiceActionResult> => {
  const actionType = 'fomo.teaser';
  log.info(`[fomoVoice] teaserDrop for ${eventName}`);
  try {
    const brand = loadBrandProfile();
    const { generateTeaserDrop: gen } = await import('../capabilities/growth/countdownEngine.js');
    const drop = await gen(brand, eventName);
    return {
      ok: true,
      spokenResponse: response(
        `Teaser drop listo para ${eventName}. Fase 1: teaser público. Fase 2: revelación. Fase 3: momentum.`,
        `Teaser drop ready for ${eventName}. Phase 1: public teaser. Phase 2: reveal. Phase 3: momentum.`,
      ),
      actionType,
      executed: true,
      detail: drop,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      spokenResponse: response('Error generando teaser.', 'Error generating teaser.'),
      actionType,
      executed: false,
      detail: { error: msg },
    };
  }
};

/* ── Must-Follow Hooks ───────────────────────────────────────────────────── */

export const generateMustFollowHooks = async (): Promise<VoiceActionResult> => {
  const actionType = 'fomo.hooks';
  log.info('[fomoVoice] generateMustFollowHooks');
  try {
    const brand = loadBrandProfile();
    const { generateMustFollowHooks: gen } = await import('../capabilities/growth/mustFollowHooks.js');
    const hooks = await gen(brand);
    return {
      ok: true,
      spokenResponse: response(
        `${hooks.length} must-follow hooks generados. Top: "${hooks[0]?.hook ?? ''}".`,
        `${hooks.length} must-follow hooks generated. Top: "${hooks[0]?.hook ?? ''}".`,
      ),
      actionType,
      executed: true,
      detail: hooks,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      spokenResponse: response('Error generando hooks.', 'Error generating hooks.'),
      actionType,
      executed: false,
      detail: { error: msg },
    };
  }
};

export const craftProfileHook = async (): Promise<VoiceActionResult> => {
  const actionType = 'fomo.profileHook';
  log.info('[fomoVoice] craftProfileHook');
  try {
    const brand = loadBrandProfile();
    const { craftProfileHook: craft } = await import('../capabilities/growth/mustFollowHooks.js');
    const hook = await craft(brand);
    return {
      ok: true,
      spokenResponse: response(`Hook de perfil: "${hook}".`, `Profile hook: "${hook}".`),
      actionType,
      executed: true,
      detail: { hook },
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      spokenResponse: response('Error creando hook.', 'Error creating hook.'),
      actionType,
      executed: false,
      detail: { error: msg },
    };
  }
};

/* ── Trending Now ────────────────────────────────────────────────────────── */

export const detectTrending = async (): Promise<VoiceActionResult> => {
  const actionType = 'fomo.trending';
  log.info('[fomoVoice] detectTrending');
  try {
    const brand = loadBrandProfile();
    const { detectTrendingOpportunities: detect } = await import('../capabilities/growth/trendingNow.js');
    const trends = await detect(brand);
    const top = trends
      .filter((t) => t.relevance === 'alta')
      .map((t) => t.trend)
      .join(', ');
    return {
      ok: true,
      spokenResponse: response(
        `${trends.length} tendencias detectadas. Prioridad alta: ${top || 'ninguna'}.`,
        `${trends.length} trends detected. High priority: ${top || 'none'}.`,
      ),
      actionType,
      executed: true,
      detail: trends,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      spokenResponse: response('Error detectando tendencias.', 'Error detecting trends.'),
      actionType,
      executed: false,
      detail: { error: msg },
    };
  }
};

/* ── Anticipation Engine ─────────────────────────────────────────────────── */

export const designAnticipationArc = async (eventName: string, days?: number): Promise<VoiceActionResult> => {
  const actionType = 'fomo.anticipation';
  log.info(`[fomoVoice] anticipationArc for ${eventName}`);
  try {
    const brand = loadBrandProfile();
    const { designAnticipationArc } = await import('../capabilities/growth/anticipationEngine.js');
    const arc = await designAnticipationArc(brand, eventName, days ?? 7);
    return {
      ok: true,
      spokenResponse: response(
        `Arco de anticipación "${arc.eventName}" diseñado: ${arc.beats.length} beats en ${arc.totalDays} días. Peak: ${arc.peakMoment}.`,
        `Anticipation arc "${arc.eventName}" designed: ${arc.beats.length} beats over ${arc.totalDays} days. Peak: ${arc.peakMoment}.`,
      ),
      actionType,
      executed: true,
      detail: arc,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      spokenResponse: response('Error diseñando arco.', 'Error designing arc.'),
      actionType,
      executed: false,
      detail: { error: msg },
    };
  }
};

/* ── Drop Culture ────────────────────────────────────────────────────────── */

export const designDrop = async (dropType?: string, context?: string): Promise<VoiceActionResult> => {
  const actionType = 'fomo.drop';
  log.info('[fomoVoice] designDrop');
  try {
    const brand = loadBrandProfile();
    const { designDrop } = await import('../capabilities/growth/dropCulture.js');
    const drop = await designDrop(
      brand,
      dropType as 'product' | 'content' | 'access' | 'experience' | undefined,
      context,
    );
    return {
      ok: true,
      spokenResponse: response(
        `Drop "${drop.name}" diseñado. Tipo: ${drop.type}. Ventana: ${drop.windowHours}h. Exclusividad: ${drop.exclusivity}.`,
        `Drop "${drop.name}" designed. Type: ${drop.type}. Window: ${drop.windowHours}h. Exclusivity: ${drop.exclusivity}.`,
      ),
      actionType,
      executed: true,
      detail: drop,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      spokenResponse: response('Error diseñando drop.', 'Error designing drop.'),
      actionType,
      executed: false,
      detail: { error: msg },
    };
  }
};

export const designDropSeries = async (seriesName: string): Promise<VoiceActionResult> => {
  const actionType = 'fomo.dropSeries';
  log.info(`[fomoVoice] dropSeries for ${seriesName}`);
  try {
    const brand = loadBrandProfile();
    const { designDropSeries } = await import('../capabilities/growth/dropCulture.js');
    const drops = await designDropSeries(brand, seriesName);
    return {
      ok: true,
      spokenResponse: response(
        `Serie de drops "${seriesName}" diseñada: ${drops.length} drops escalonados.`,
        `Drop series "${seriesName}" designed: ${drops.length} tiered drops.`,
      ),
      actionType,
      executed: true,
      detail: drops,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      spokenResponse: response('Error diseñando serie.', 'Error designing series.'),
      actionType,
      executed: false,
      detail: { error: msg },
    };
  }
};

/* ── Disappearing Content ────────────────────────────────────────────────── */

export const createDisappearingContent = async (topic?: string): Promise<VoiceActionResult> => {
  const actionType = 'fomo.disappearing';
  log.info('[fomoVoice] createDisappearingContent');
  try {
    const brand = loadBrandProfile();
    const { createDisappearingContent: create } = await import('../capabilities/growth/disappearingContent.js');
    const pieces = await create(brand, topic);
    return {
      ok: true,
      spokenResponse: response(
        `${pieces.length} piezas de contenido efímero creadas. Tipos: ${pieces.map((p) => p.type).join(', ')}.`,
        `${pieces.length} disappearing content pieces created. Types: ${pieces.map((p) => p.type).join(', ')}.`,
      ),
      actionType,
      executed: true,
      detail: pieces,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      spokenResponse: response('Error creando contenido efímero.', 'Error creating disappearing content.'),
      actionType,
      executed: false,
      detail: { error: msg },
    };
  }
};

/* ── Social Proof Counters ───────────────────────────────────────────────── */

export const generateSocialCounters = async (): Promise<VoiceActionResult> => {
  const actionType = 'fomo.counters';
  log.info('[fomoVoice] generateSocialCounters');
  try {
    const brand = loadBrandProfile();
    const { generateSocialCounters: gen } = await import('../capabilities/growth/socialProofCounters.js');
    const counters = await gen(brand);
    return {
      ok: true,
      spokenResponse: response(
        `${counters.length} contadores sociales generados. Ejemplo: "${counters[0]?.counterPhrase ?? ''}".`,
        `${counters.length} social counters generated. Example: "${counters[0]?.counterPhrase ?? ''}".`,
      ),
      actionType,
      executed: true,
      detail: counters,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      spokenResponse: response('Error generando contadores.', 'Error generating counters.'),
      actionType,
      executed: false,
      detail: { error: msg },
    };
  }
};

/* ── Gamified FOMO ───────────────────────────────────────────────────────── */

export const designGamifiedFomo = async (): Promise<VoiceActionResult> => {
  const actionType = 'fomo.gamified';
  log.info('[fomoVoice] designGamifiedFomo');
  try {
    const brand = loadBrandProfile();
    const { designGamifiedFomo: design } = await import('../capabilities/growth/gamifiedFomo.js');
    const mechanics = await design(brand);
    return {
      ok: true,
      spokenResponse: response(
        `${mechanics.length} mecánicas gamificadas diseñadas. Primera: ${mechanics[0]?.name ?? ''}.`,
        `${mechanics.length} gamified mechanics designed. First: ${mechanics[0]?.name ?? ''}.`,
      ),
      actionType,
      executed: true,
      detail: mechanics,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      spokenResponse: response('Error diseñando gamificación.', 'Error designing gamification.'),
      actionType,
      executed: false,
      detail: { error: msg },
    };
  }
};

/* ── Insider Exclusivity ─────────────────────────────────────────────────── */

export const designInsiderSystem = async (): Promise<VoiceActionResult> => {
  const actionType = 'fomo.insider';
  log.info('[fomoVoice] designInsiderSystem');
  try {
    const brand = loadBrandProfile();
    const { designInsiderSystem: design } = await import('../capabilities/growth/insiderExclusivity.js');
    const system = await design(brand);
    return {
      ok: true,
      spokenResponse: response(
        `Sistema de insiders diseñado: ${system.tiers.length} niveles. Entry ritual: ${system.entryRitual.slice(0, 60)}...`,
        `Insider system designed: ${system.tiers.length} tiers. Entry ritual: ${system.entryRitual.slice(0, 60)}...`,
      ),
      actionType,
      executed: true,
      detail: system,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      spokenResponse: response('Error diseñando insiders.', 'Error designing insiders.'),
      actionType,
      executed: false,
      detail: { error: msg },
    };
  }
};

/* ── Visual FOMO ─────────────────────────────────────────────────────────── */

export const generateVisualFomo = async (): Promise<VoiceActionResult> => {
  const actionType = 'fomo.visual';
  log.info('[fomoVoice] generateVisualFomo');
  try {
    const brand = loadBrandProfile();
    const { generateVisualFomoConcepts: gen } = await import('../capabilities/growth/visualFomo.js');
    const concepts = await gen(brand);
    return {
      ok: true,
      spokenResponse: response(
        `${concepts.length} conceptos visuales FOMO generados. Top: ${concepts[0]?.name ?? ''} (${concepts[0]?.format}).`,
        `${concepts.length} visual FOMO concepts generated. Top: ${concepts[0]?.name ?? ''} (${concepts[0]?.format}).`,
      ),
      actionType,
      executed: true,
      detail: concepts,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      spokenResponse: response('Error generando visual FOMO.', 'Error generating visual FOMO.'),
      actionType,
      executed: false,
      detail: { error: msg },
    };
  }
};

export const designSwipeToReveal = async (topic: string): Promise<VoiceActionResult> => {
  const actionType = 'fomo.swipeReveal';
  log.info(`[fomoVoice] swipeToReveal: ${topic}`);
  try {
    const brand = loadBrandProfile();
    const { designSwipeToReveal: design } = await import('../capabilities/growth/visualFomo.js');
    const carousel = await design(brand, topic);
    return {
      ok: true,
      spokenResponse: response(
        `Carousel "swipe to reveal" diseñado: ${carousel.slides.length} slides. Reveal: ${carousel.finalReveal.slice(0, 80)}...`,
        `Swipe-to-reveal carousel designed: ${carousel.slides.length} slides. Reveal: ${carousel.finalReveal.slice(0, 80)}...`,
      ),
      actionType,
      executed: true,
      detail: carousel,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      spokenResponse: response('Error diseñando carousel.', 'Error designing carousel.'),
      actionType,
      executed: false,
      detail: { error: msg },
    };
  }
};

/* ── FOMO Campaign Orchestrator ──────────────────────────────────────────── */

export const designFomoCampaign = async (theme?: string, durationDays?: number): Promise<VoiceActionResult> => {
  const actionType = 'fomo.campaign';
  log.info(`[fomoVoice] designFomoCampaign: ${theme ?? 'auto'}`);
  try {
    const brand = loadBrandProfile();
    const { designFomoCampaign: design, getFomoPlaybookForProfile } =
      await import('../capabilities/growth/fomoCampaignEngine.js');
    const campaign = await design(brand, theme, durationDays ?? 14);
    const playbook = getFomoPlaybookForProfile(campaign.profileType);
    return {
      ok: true,
      spokenResponse: response(
        `Campaña FOMO "${campaign.name}" diseñada para perfil ${campaign.profileType}: ${campaign.durationDays} días, ${campaign.days.length} días de contenido. Playbook: ${playbook.tactics.slice(0, 2).join(', ')}.`,
        `FOMO campaign "${campaign.name}" designed for ${campaign.profileType} profile: ${campaign.durationDays} days, ${campaign.days.length} content days. Playbook: ${playbook.tactics.slice(0, 2).join(', ')}.`,
      ),
      actionType,
      executed: true,
      detail: { campaign, playbook },
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      spokenResponse: response('Error diseñando campaña.', 'Error designing campaign.'),
      actionType,
      executed: false,
      detail: { error: msg },
    };
  }
};

export const getFomoPlaybook = async (): Promise<VoiceActionResult> => {
  const actionType = 'fomo.playbook';
  log.info('[fomoVoice] getFomoPlaybook');
  try {
    const brand = loadBrandProfile();
    const { detectProfileType, getFomoPlaybookForProfile } =
      await import('../capabilities/growth/fomoCampaignEngine.js');
    const profileType = detectProfileType(brand);
    const playbook = getFomoPlaybookForProfile(profileType);
    return {
      ok: true,
      spokenResponse: response(
        `Playbook FOMO para perfil ${profileType}. Fortalezas: ${playbook.strengths.slice(0, 2).join(', ')}. Tácticas: ${playbook.tactics.slice(0, 3).join(', ')}.`,
        `FOMO playbook for ${profileType} profile. Strengths: ${playbook.strengths.slice(0, 2).join(', ')}. Tactics: ${playbook.tactics.slice(0, 3).join(', ')}.`,
      ),
      actionType,
      executed: true,
      detail: { profileType, playbook },
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      spokenResponse: response('Error obteniendo playbook.', 'Error getting playbook.'),
      actionType,
      executed: false,
      detail: { error: msg },
    };
  }
};
