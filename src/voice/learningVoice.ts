/**
 * learningVoice.ts — Voz Autónoma: Aprendizaje y Optimización
 * ─────────────────────────────────────────────────────────────────────────
 * Análisis semanal automático, recomendaciones basadas en patrones de
 * éxito y aplicación de aprendizajes por comando de voz.
 */

import { log } from '../agent/logger.js';
import { loadBrandProfile } from '../config/index.js';
import type { BrandProfile } from '../config/types.js';
import type { AutoOptimizationResult } from '../capabilities/autoOptimize/index.js';

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
 * Ejecuta el análisis semanal combinando auto-optimización y analytics.
 */
export const weeklyAnalysis = async (): Promise<VoiceActionResult> => {
  const brand = loadBrandProfile();
  const lang = brand.audience.locale ?? 'es-AR';
  log.info('[learningVoice] weeklyAnalysis');

  try {
    const autoOpt = await import('../capabilities/autoOptimize/index.js');
    const analytics = await import('../capabilities/analytics/index.js');

    const runAutoOptimization = autoOpt.runAutoOptimization as (
      brand: BrandProfile,
      windowDays?: number,
    ) => Promise<AutoOptimizationResult>;
    const optimization = await runAutoOptimization(brand, 60);
    const hasta = new Date().toISOString();
    const desde = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const snapshot = await analytics.buildSnapshot(desde, hasta);
    const anomalies = analytics.detectAnomalies(snapshot);

    const spoken = t(
      `Análisis semanal listo. ${optimization.strategyAdjustments.length} ajustes sugeridos. ${optimization.recommendations.length} recomendaciones. ${anomalies.length ? `Detecté ${anomalies.length} anomalía${anomalies.length > 1 ? 's' : ''}.` : 'Todo dentro de parámetros normales.'}`,
      `Weekly analysis ready. ${optimization.strategyAdjustments.length} adjustments suggested. ${optimization.recommendations.length} recommendations. ${anomalies.length ? `Detected ${anomalies.length} anomalies.` : 'Everything within normal parameters.'}`,
      lang,
    );

    log.step('[learningVoice] Weekly analysis completed');
    return baseResult(true, 'learning.weeklyAnalysis', spoken, true, {
      optimization,
      snapshot,
      anomalies,
    });
  } catch (err) {
    const msg = (err as Error).message;
    log.error(`[learningVoice] weeklyAnalysis failed: ${msg}`);
    return baseResult(
      false,
      'learning.weeklyAnalysis',
      t('No pude completar el análisis semanal.', 'Could not complete the weekly analysis.', lang),
      false,
      { error: msg },
    );
  }
};

/**
 * Obtiene las recomendaciones actuales del sistema.
 */
export const getRecommendations = async (): Promise<VoiceActionResult> => {
  const brand = loadBrandProfile();
  const lang = brand.audience.locale ?? 'es-AR';
  log.info('[learningVoice] getRecommendations');

  try {
    const autoOpt = await import('../capabilities/autoOptimize/index.js');
    const recs = autoOpt.listRecommendations ? await autoOpt.listRecommendations() : [];

    if (!Array.isArray(recs) || !recs.length) {
      const spoken = t('No hay recomendaciones pendientes.', 'No pending recommendations.', lang);
      return baseResult(true, 'learning.recommendations', spoken, true, { recommendations: [] });
    }

    const top = recs
      .slice(0, 3)
      .map((r) => r.hookText ?? r.topicAngle ?? 'Recomendación')
      .join(', ');
    const spoken = t(
      `Tengo ${recs.length} recomendaciones. Las principales: ${top}.`,
      `I have ${recs.length} recommendations. Top ones: ${top}.`,
      lang,
    );

    log.debug(`[learningVoice] Found ${recs.length} recommendations`);
    return baseResult(true, 'learning.recommendations', spoken, true, { recommendations: recs });
  } catch (err) {
    const msg = (err as Error).message;
    log.error(`[learningVoice] getRecommendations failed: ${msg}`);
    return baseResult(
      false,
      'learning.recommendations',
      t('No pude obtener recomendaciones.', 'Could not get recommendations.', lang),
      false,
      { error: msg },
    );
  }
};

/**
 * Aplica un patrón de éxito identificado.
 */
export const applySuccessPattern = async (patternId?: string): Promise<VoiceActionResult> => {
  const brand = loadBrandProfile();
  const lang = brand.audience.locale ?? 'es-AR';
  log.info(`[learningVoice] applySuccessPattern: patternId=${patternId ?? 'auto'}`);

  try {
    const autoOpt = await import('../capabilities/autoOptimize/index.js');

    if (patternId && autoOpt.updateRecommendationStatus) {
      autoOpt.updateRecommendationStatus(patternId, 'publicado');
    }

    const patterns = autoOpt.extractSuccessPatterns ? autoOpt.extractSuccessPatterns(60) : null;

    const spoken = t(
      patternId
        ? `Patrón ${patternId} aplicado.`
        : `Patrones de éxito activados. ${patterns?.topHookExamples?.length ?? 0} hooks destacados encontrados.`,
      patternId
        ? `Pattern ${patternId} applied.`
        : `Success patterns activated. ${patterns?.topHookExamples?.length ?? 0} top hooks found.`,
      lang,
    );

    log.step(`[learningVoice] Success pattern applied: ${patternId ?? 'auto'}`);
    return baseResult(true, 'learning.applyPattern', spoken, true, { patternId, patterns });
  } catch (err) {
    const msg = (err as Error).message;
    log.error(`[learningVoice] applySuccessPattern failed: ${msg}`);
    return baseResult(
      false,
      'learning.applyPattern',
      t('No pude aplicar el patrón.', 'Could not apply the pattern.', lang),
      false,
      { error: msg },
    );
  }
};
