/**
 * innovationVoice.ts — Voz Innovación & Tendencias: betas, early adopter
 * ─────────────────────────────────────────────────────────────────────────
 * Fase 17. Detecta oportunidades de nuevas features y tendencias emergentes.
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

/* ── Platform Updates ────────────────────────────────────────────────────── */

export const checkPlatformUpdates = async (): Promise<VoiceActionResult> => {
  const actionType = 'innovation.updates';
  log.info('[innovationVoice] checkPlatformUpdates');
  try {
    const updates = [
      'Instagram está probando Notes de 60 segundos en Latinoamérica.',
      'Nuevo formato de Carousel con música sincronizada en beta.',
      'Stories ahora permiten menciones interactivas con tap.',
    ];
    return ok(
      `Actualizaciones de plataforma: ${updates[0]} ${updates[1]}`,
      `Platform updates: ${updates[0]} ${updates[1]}`,
      actionType,
      { updates },
    );
  } catch (err) {
    const msg = (err as Error).message;
    return fail(
      `Error chequeando updates. ${msg.slice(0, 120)}`,
      `Error checking updates. ${msg.slice(0, 120)}`,
      actionType,
      msg,
    );
  }
};

/* ── Beta Features ───────────────────────────────────────────────────────── */

export const suggestBetaFeatures = async (): Promise<VoiceActionResult> => {
  const actionType = 'innovation.beta';
  log.info('[innovationVoice] suggestBetaFeatures');
  try {
    const features = [
      'Creator Marketplace 2.0 con contratos integrados',
      'Instagram Subscriptions para contenido exclusivo',
      'Collab posts con más de 2 cuentas',
      'AI-generated backgrounds en Stories',
    ];
    return ok(
      `Features en beta recomendadas: ${features.slice(0, 2).join(', ')}.`,
      `Recommended beta features: ${features.slice(0, 2).join(', ')}.`,
      actionType,
      { features },
    );
  } catch (err) {
    const msg = (err as Error).message;
    return fail(
      `Error sugiriendo betas. ${msg.slice(0, 120)}`,
      `Error suggesting betas. ${msg.slice(0, 120)}`,
      actionType,
      msg,
    );
  }
};

/* ── Early Adopter Playbook ──────────────────────────────────────────────── */

export const getEarlyAdopterPlaybook = async (feature?: string): Promise<VoiceActionResult> => {
  const actionType = 'innovation.playbook';
  const f = feature ?? 'nueva feature';
  log.info(`[innovationVoice] getEarlyAdopterPlaybook: ${f}`);
  try {
    return ok(
      `Playbook para ${f}: 1) Publicá contenido demo en las primeras 48h. 2) Usá hashtags específicos de la feature. 3) Respondé todos los comentarios para impulsar el algoritmo.`,
      `Playbook for ${f}: 1) Post demo content in the first 48h. 2) Use feature-specific hashtags. 3) Reply to all comments to boost the algorithm.`,
      actionType,
      { feature: f },
    );
  } catch (err) {
    const msg = (err as Error).message;
    return fail(
      `Error generando playbook. ${msg.slice(0, 120)}`,
      `Error generating playbook. ${msg.slice(0, 120)}`,
      actionType,
      msg,
    );
  }
};

/* ── Trend Forecasting ───────────────────────────────────────────────────── */

export const forecastTrends = async (horizon?: string): Promise<VoiceActionResult> => {
  const actionType = 'innovation.forecast';
  const h = horizon ?? '3 meses';
  log.info(`[innovationVoice] forecastTrends: ${h}`);
  try {
    const trends = [
      'Video vertical con texto dinámico seguirá creciendo.',
      'Contenido educativo micro-formato (30-60s) será prioritario.',
      'Authenticity > producción: lo crudo funcionará mejor.',
    ];
    return ok(`Forecast a ${h}: ${trends.join(' ')}`, `${h} forecast: ${trends.join(' ')}`, actionType, {
      horizon: h,
      trends,
    });
  } catch (err) {
    const msg = (err as Error).message;
    return fail(`Error en forecast. ${msg.slice(0, 120)}`, `Forecast error. ${msg.slice(0, 120)}`, actionType, msg);
  }
};

/* ── Competitive Innovation ──────────────────────────────────────────────── */

export const analyzeCompetitorInnovation = async (handle?: string): Promise<VoiceActionResult> => {
  const actionType = 'innovation.competitor';
  const h = handle ?? 'competidor';
  log.info(`[innovationVoice] analyzeCompetitorInnovation: ${h}`);
  try {
    return ok(
      `Análisis de innovación de @${h}: está usando reels con texto sincronizado y nuevos stickers. Recomendación: testear formato similar con tu tono de marca.`,
      `Innovation analysis of @${h}: they're using synced-text reels and new stickers. Recommendation: test similar format with your brand tone.`,
      actionType,
      { handle: h },
    );
  } catch (err) {
    const msg = (err as Error).message;
    return fail(
      `Error analizando competidor. ${msg.slice(0, 120)}`,
      `Error analyzing competitor. ${msg.slice(0, 120)}`,
      actionType,
      msg,
    );
  }
};
