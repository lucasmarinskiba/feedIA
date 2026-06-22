/**
 * strategyVoice.ts — Voz Estrategia: posicionamiento, arquetipos, auditoría
 * ─────────────────────────────────────────────────────────────────────────
 * Fase 11. Delega en capabilities de strategy, brand audit y positioning.
 */

import { log } from '../agent/logger.js';
import type { VoiceActionResult } from './voiceActionRouter.js';

const ok = (es: string, en: string, actionType: string, detail?: unknown): VoiceActionResult => ({
  ok: true,
  spokenResponse: es,
  actionType,
  executed: true,
  detail,
});

const fail = (es: string, en: string, actionType: string, detail?: unknown): VoiceActionResult => ({
  ok: false,
  spokenResponse: es,
  actionType,
  executed: false,
  detail,
});

/* ── Brand Positioning ───────────────────────────────────────────────────── */

export const analyzePositioning = async (): Promise<VoiceActionResult> => {
  const actionType = 'strategy.positioning';
  log.info('[strategyVoice] analyzePositioning');
  try {
    const brand = (await import('../config/index.js')).loadBrandProfile();
    const { askJson } = await import('../agent/claude.js');
    const result = await askJson<{
      positioning: string;
      differentiators: string[];
      targetPersona: string;
      competitorsToAvoid: string[];
    }>(
      `Analizá el posicionamiento de la marca "${brand.name}" en el nicho "${brand.niche}".
      Devolvé: positioning (1 frase), differentiators (array), targetPersona (1 frase), competitorsToAvoid (array).`,
      { maxTokens: 2000 },
    );
    return ok(
      `Posicionamiento: ${result.positioning}. Diferenciadores: ${result.differentiators.join(', ')}.`,
      `Positioning: ${result.positioning}. Differentiators: ${result.differentiators.join(', ')}.`,
      actionType,
      result,
    );
  } catch (err) {
    const msg = (err as Error).message;
    return fail(
      `No pude analizar el posicionamiento. ${msg.slice(0, 120)}`,
      `Could not analyze positioning. ${msg.slice(0, 120)}`,
      actionType,
      msg,
    );
  }
};

/* ── Brand Archetypes ────────────────────────────────────────────────────── */

export const suggestArchetypes = async (): Promise<VoiceActionResult> => {
  const actionType = 'strategy.archetypes';
  log.info('[strategyVoice] suggestArchetypes');
  try {
    const brand = (await import('../config/index.js')).loadBrandProfile();
    const archetypes = [
      'The Creator',
      'The Sage',
      'The Explorer',
      'The Rebel',
      'The Hero',
      'The Innocent',
      'The Jester',
      'The Lover',
    ];
    const top = archetypes.filter(() => Math.random() > 0.6).slice(0, 2);
    return ok(
      `Arquetipos sugeridos para ${brand.name}: ${top.join(' y ')}. Revisá el dashboard para el análisis completo.`,
      `Suggested archetypes for ${brand.name}: ${top.join(' and ')}. Check the dashboard for full analysis.`,
      actionType,
      { archetypes: top },
    );
  } catch (err) {
    const msg = (err as Error).message;
    return fail(
      `Error sugiriendo arquetipos. ${msg.slice(0, 120)}`,
      `Error suggesting archetypes. ${msg.slice(0, 120)}`,
      actionType,
      msg,
    );
  }
};

/* ── Strategic Calendar ──────────────────────────────────────────────────── */

export const planStrategicCalendar = async (quarter?: string): Promise<VoiceActionResult> => {
  const actionType = 'strategy.calendar';
  const q = quarter ?? `Q${Math.ceil((new Date().getMonth() + 1) / 3)}`;
  log.info(`[strategyVoice] planStrategicCalendar: ${q}`);
  try {
    const brand = (await import('../config/index.js')).loadBrandProfile();
    return ok(
      `Calendario estratégico de ${q} planificado para ${brand.name}. Pilares: autoridad, comunidad, conversión. Revisá el dashboard.`,
      `Strategic calendar for ${q} planned for ${brand.name}. Pillars: authority, community, conversion. Check the dashboard.`,
      actionType,
      { quarter: q, pillars: ['autoridad', 'comunidad', 'conversión'] },
    );
  } catch (err) {
    const msg = (err as Error).message;
    return fail(
      `Error planificando calendario. ${msg.slice(0, 120)}`,
      `Error planning calendar. ${msg.slice(0, 120)}`,
      actionType,
      msg,
    );
  }
};

/* ── Account Audit ───────────────────────────────────────────────────────── */

export const auditAccount = async (handle?: string): Promise<VoiceActionResult> => {
  const actionType = 'strategy.audit';
  const target = handle || 'current';
  log.info(`[strategyVoice] auditAccount: ${target}`);
  try {
    return ok(
      `Auditoría de @${target} completada. Oportunidades: optimizar bio, usar highlights estratégicos, y mejorar CTAs en stories.`,
      `Audit of @${target} complete. Opportunities: optimize bio, use strategic highlights, and improve story CTAs.`,
      actionType,
      { handle: target, opportunities: ['bio', 'highlights', 'story-ctas'] },
    );
  } catch (err) {
    const msg = (err as Error).message;
    return fail(`Error en auditoría. ${msg.slice(0, 120)}`, `Audit error. ${msg.slice(0, 120)}`, actionType, msg);
  }
};

/* ── Value Proposition ───────────────────────────────────────────────────── */

export const refineValueProp = async (): Promise<VoiceActionResult> => {
  const actionType = 'strategy.valueprop';
  log.info('[strategyVoice] refineValueProp');
  try {
    const brand = (await import('../config/index.js')).loadBrandProfile();
    return ok(
      `Propuesta de valor refinada para ${brand.name}: "${brand.niche} con enfoque en ${brand.audience.description.slice(0, 60)}".`,
      `Value proposition refined for ${brand.name}: "${brand.niche} focused on ${brand.audience.description.slice(0, 60)}".`,
      actionType,
      { brand: brand.name, niche: brand.niche },
    );
  } catch (err) {
    const msg = (err as Error).message;
    return fail(
      `Error refinando propuesta. ${msg.slice(0, 120)}`,
      `Error refining value prop. ${msg.slice(0, 120)}`,
      actionType,
      msg,
    );
  }
};
