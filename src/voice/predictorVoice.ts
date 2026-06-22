/**
 * predictorVoice.ts — Voz Autónoma: Predicción de Performance
 * ─────────────────────────────────────────────────────────────────────────
 * Expone predicciones de contenido, timing óptimo y estimaciones de
 * crecimiento mediante comandos de voz.
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

/* ── Localization helper ─────────────────────────────────────────────────── */

const t = (es: string, en: string, lang?: string): string => {
  const l = lang ?? loadBrandProfile().audience.locale ?? 'es-AR';
  return l.startsWith('es') ? es : en;
};

const baseResult = (
  ok: boolean,
  actionType: string,
  spokenResponse: string,
  executed: boolean,
  detail?: unknown,
): VoiceActionResult => ({
  ok,
  spokenResponse,
  actionType,
  executed,
  detail,
});

/* ── Actions ─────────────────────────────────────────────────────────────── */

/**
 * Predice la performance de un post a partir de su descripción.
 */
export const predictPostPerformance = async (postDescription: string): Promise<VoiceActionResult> => {
  const brand = loadBrandProfile();
  const lang = brand.audience.locale ?? 'es-AR';
  log.info(`[predictorVoice] predictPostPerformance: ${postDescription.slice(0, 80)}...`);

  try {
    const predictor = await import('../capabilities/predictor/index.js');
    const prediction = await predictor.predecirPerformance(brand, {
      format: 'reel',
      hook: postDescription.slice(0, 120),
      caption: postDescription,
    });

    const spoken = t(
      `Predicción lista. Score general: ${prediction.scoreGeneral}. Riesgo de flop: ${prediction.riesgoFlop}. ${prediction.ajustesAltoImpacto.length ? 'Tengo sugerencias de ajuste.' : ''}`,
      `Prediction ready. Overall score: ${prediction.scoreGeneral}. Flop risk: ${prediction.riesgoFlop}. ${prediction.ajustesAltoImpacto.length ? 'I have adjustment suggestions.' : ''}`,
      lang,
    );

    log.debug('[predictorVoice] Prediction completed');
    return baseResult(true, 'predictor.postPerformance', spoken, true, { prediction });
  } catch (err) {
    const msg = (err as Error).message;
    log.error(`[predictorVoice] predictPostPerformance failed: ${msg}`);
    return baseResult(
      false,
      'predictor.postPerformance',
      t('No pude predecir la performance.', 'Could not predict performance.', lang),
      false,
      { error: msg },
    );
  }
};

/**
 * Predice el mejor horario de publicación.
 */
export const predictBestTime = async (): Promise<VoiceActionResult> => {
  const brand = loadBrandProfile();
  const lang = brand.audience.locale ?? 'es-AR';
  log.info('[predictorVoice] predictBestTime');

  try {
    const timing = await import('../capabilities/analytics/audienceTiming.js');
    const best = timing.getBestPostingTime('reel');
    const slot = best.bestSlot;

    const spoken = t(
      `El mejor momento para publicar es ${slot.label} con un score de ${Math.round(slot.score)}. La ventana óptima es ${best.nextOptimalWindow}.`,
      `The best time to post is ${slot.label} with a score of ${Math.round(slot.score)}. The optimal window is ${best.nextOptimalWindow}.`,
      lang,
    );

    log.debug('[predictorVoice] Best time computed');
    return baseResult(true, 'predictor.bestTime', spoken, true, { best });
  } catch (err) {
    const msg = (err as Error).message;
    log.error(`[predictorVoice] predictBestTime failed: ${msg}`);
    return baseResult(
      false,
      'predictor.bestTime',
      t('No pude calcular el mejor horario.', 'Could not calculate the best time.', lang),
      false,
      { error: msg },
    );
  }
};

/**
 * Estima el crecimiento semanal proyectado.
 */
export const predictWeeklyGrowth = async (): Promise<VoiceActionResult> => {
  const brand = loadBrandProfile();
  const lang = brand.audience.locale ?? 'es-AR';
  log.info('[predictorVoice] predictWeeklyGrowth');

  try {
    const growth = await import('../capabilities/growth/growthEngine.js');
    const progress = growth.getCurrentProgress();
    const velocity = progress.velocity.current;
    const onTrack = progress.onTrack;

    const spoken = t(
      `Proyección semanal: velocidad actual de ${Math.round(velocity)} seguidores por día. ${onTrack ? 'Vamos bien.' : 'Necesitamos acelerar.'}`,
      `Weekly projection: current velocity of ${Math.round(velocity)} followers per day. ${onTrack ? 'On track.' : 'We need to accelerate.'}`,
      lang,
    );

    log.debug('[predictorVoice] Weekly growth projected');
    return baseResult(true, 'predictor.weeklyGrowth', spoken, true, { velocity, progress });
  } catch (err) {
    const msg = (err as Error).message;
    log.error(`[predictorVoice] predictWeeklyGrowth failed: ${msg}`);
    return baseResult(
      false,
      'predictor.weeklyGrowth',
      t('No pude proyectar el crecimiento.', 'Could not project growth.', lang),
      false,
      { error: msg },
    );
  }
};

/**
 * Verifica si el predictor está disponible.
 */
export const isPredictorAvailable = async (): Promise<VoiceActionResult> => {
  const brand = loadBrandProfile();
  const lang = brand.audience.locale ?? 'es-AR';
  log.info('[predictorVoice] isPredictorAvailable');

  try {
    const predictor = await import('../capabilities/predictor/index.js');
    const available = typeof predictor.predecirPerformance === 'function';

    const spoken = t(
      available ? 'El predictor está disponible.' : 'El predictor no está disponible ahora.',
      available ? 'The predictor is available.' : 'The predictor is not available right now.',
      lang,
    );

    return baseResult(true, 'predictor.availability', spoken, true, { available });
  } catch (err) {
    const msg = (err as Error).message;
    log.warn(`[predictorVoice] isPredictorAvailable check failed: ${msg}`);
    const spoken = t('El predictor no está disponible.', 'The predictor is not available.', lang);
    return baseResult(false, 'predictor.availability', spoken, false, { available: false, error: msg });
  }
};
