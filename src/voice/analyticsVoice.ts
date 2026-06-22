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

export const getWeeklyReport = async (): Promise<VoiceActionResult> => {
  const actionType = 'analytics.weeklyReport';
  log.info('[analyticsVoice] getWeeklyReport invoked');
  try {
    const brand = loadBrandProfile();
    const analytics = await import('../capabilities/analytics/index.js');
    await import('../capabilities/growth/growthDashboard.js');

    const snapshot = await analytics.buildSnapshot(new Date(Date.now() - 7 * 86400000).toISOString());
    const alertas = analytics.detectAnomalies(snapshot);
    const report = await analytics.generateWeeklyReport(brand, snapshot, alertas);

    return {
      ok: true,
      spokenResponse: response(
        `Reporte semanal listo. ${report.victorias.length} victorias, ${report.alertasOperativas.length} alertas.`,
        `Weekly report ready. ${report.victorias.length} wins, ${report.alertasOperativas.length} alerts.`,
      ),
      actionType,
      executed: true,
      detail: { report, snapshot },
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log.error(`[analyticsVoice] getWeeklyReport error: ${msg}`);
    return {
      ok: false,
      spokenResponse: response(
        'Error generando reporte semanal. Intentá más tarde.',
        'Error generating weekly report. Try again later.',
      ),
      actionType,
      executed: false,
      detail: { error: msg },
    };
  }
};

export const getGrowthStatus = async (): Promise<VoiceActionResult> => {
  const actionType = 'analytics.growthStatus';
  log.info('[analyticsVoice] getGrowthStatus invoked');
  try {
    const brand = loadBrandProfile();
    const growth = await import('../capabilities/growth/growthDashboard.js');
    const dashboard = growth.buildDashboard(brand);

    return {
      ok: true,
      spokenResponse: response(
        `Crecimiento: ${dashboard.kpis[0]?.value ?? 'N/A'} seguidores. Salud: ${dashboard.health.status}. Proyección: ${dashboard.prediction.onTrack ? 'en camino' : 'desviado'}.`,
        `Growth: ${dashboard.kpis[0]?.value ?? 'N/A'} followers. Health: ${dashboard.health.status}. Projection: ${dashboard.prediction.onTrack ? 'on track' : 'off track'}.`,
      ),
      actionType,
      executed: true,
      detail: { dashboard },
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log.error(`[analyticsVoice] getGrowthStatus error: ${msg}`);
    return {
      ok: false,
      spokenResponse: response('Error consultando estado de crecimiento.', 'Error checking growth status.'),
      actionType,
      executed: false,
      detail: { error: msg },
    };
  }
};

export const analyzeCompetitor = async (handle: string): Promise<VoiceActionResult> => {
  const actionType = 'analytics.analyzeCompetitor';
  log.info(`[analyticsVoice] analyzeCompetitor invoked for @${handle}`);
  try {
    const brand = loadBrandProfile();
    const competitors = await import('../capabilities/competitors/index.js');

    const observation: import('../capabilities/competitors/monitor.js').CompetitorPostObservation = {
      cuenta: handle,
      formato: 'reel',
      resumenContenido: 'Análisis solicitado por voz ejecutiva',
      publicadoHaceHoras: 0,
    };

    const opportunities = await competitors.analizarCompetidores(brand, [observation]);

    if (!opportunities.length) {
      return {
        ok: true,
        spokenResponse: response(
          `Análisis de @${handle} completado. Sin oportunidades accionables detectadas.`,
          `Analysis of @${handle} complete. No actionable opportunities detected.`,
        ),
        actionType,
        executed: true,
        detail: { handle, opportunities },
      };
    }

    const top = opportunities[0]!;
    return {
      ok: true,
      spokenResponse: response(
        `Análisis de @${handle}: ${top.accionSugerida}. Prioridad ${top.prioridad}.`,
        `Analysis of @${handle}: ${top.accionSugerida}. Priority ${top.prioridad}.`,
      ),
      actionType,
      executed: true,
      detail: { handle, opportunities },
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log.error(`[analyticsVoice] analyzeCompetitor error: ${msg}`);
    return {
      ok: false,
      spokenResponse: response(`Error analizando competidor @${handle}.`, `Error analyzing competitor @${handle}.`),
      actionType,
      executed: false,
      detail: { error: msg, handle },
    };
  }
};

export const getTrends = async (): Promise<VoiceActionResult> => {
  const actionType = 'analytics.trends';
  log.info('[analyticsVoice] getTrends invoked');
  try {
    const brand = loadBrandProfile();
    const trends = await import('../capabilities/trends/index.js');
    const result = await trends.scoutTrends(brand);

    const top = result.angulos[0];
    return {
      ok: true,
      spokenResponse: response(
        `Tendencias activas: ${result.angulos.length} ángulos. Top: ${top?.angulo ?? 'N/A'} (${top?.saturacionEstimada ?? 'N/A'} saturación).`,
        `Active trends: ${result.angulos.length} angles. Top: ${top?.angulo ?? 'N/A'} (${top?.saturacionEstimada ?? 'N/A'} saturation).`,
      ),
      actionType,
      executed: true,
      detail: { trends: result },
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log.error(`[analyticsVoice] getTrends error: ${msg}`);
    return {
      ok: false,
      spokenResponse: response('Error obteniendo tendencias.', 'Error getting trends.'),
      actionType,
      executed: false,
      detail: { error: msg },
    };
  }
};

export const getDailyMetrics = async (): Promise<VoiceActionResult> => {
  const actionType = 'analytics.dailyMetrics';
  log.info('[analyticsVoice] getDailyMetrics invoked');
  try {
    const analytics = await import('../capabilities/analytics/index.js');
    const growth = await import('../capabilities/growth/growthEngine.js');

    const yesterday = new Date(Date.now() - 86400000).toISOString();
    const snapshot = await analytics.buildSnapshot(yesterday);
    const metrics = growth.getRecentDailyMetrics ? growth.getRecentDailyMetrics(2) : [];

    const latest = metrics[metrics.length - 1];
    const prev = metrics[metrics.length - 2];

    return {
      ok: true,
      spokenResponse: response(
        `Métricas de ayer: ${latest?.followersDelta ?? 'N/A'} seguidores, ${latest?.reach24h ?? 'N/A'} alcance.`,
        `Yesterday's metrics: ${latest?.followersDelta ?? 'N/A'} followers, ${latest?.reach24h ?? 'N/A'} reach.`,
      ),
      actionType,
      executed: true,
      detail: { latest, previous: prev, snapshot },
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log.error(`[analyticsVoice] getDailyMetrics error: ${msg}`);
    return {
      ok: false,
      spokenResponse: response('Error obteniendo métricas diarias.', 'Error getting daily metrics.'),
      actionType,
      executed: false,
      detail: { error: msg },
    };
  }
};

export const predictPostPerformance = async (postDescription: string): Promise<VoiceActionResult> => {
  const actionType = 'analytics.predictPerformance';
  log.info('[analyticsVoice] predictPostPerformance invoked');
  try {
    const brand = loadBrandProfile();
    const predictor = await import('../capabilities/predictor/index.js');

    const prediction = await predictor.predecirPerformance(brand, {
      format: 'reel',
      hook: postDescription.slice(0, 120),
      caption: postDescription,
    });

    return {
      ok: true,
      spokenResponse: response(
        `Predicción: score general ${prediction.scoreGeneral}/100. Riesgo de flop: ${prediction.riesgoFlop}. ${prediction.ajustesAltoImpacto.length} ajustes sugeridos.`,
        `Prediction: overall score ${prediction.scoreGeneral}/100. Flop risk: ${prediction.riesgoFlop}. ${prediction.ajustesAltoImpacto.length} high-impact adjustments suggested.`,
      ),
      actionType,
      executed: true,
      detail: { prediction },
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log.error(`[analyticsVoice] predictPostPerformance error: ${msg}`);
    return {
      ok: false,
      spokenResponse: response(
        'Error prediciendo performance del post. Intentá de nuevo.',
        'Error predicting post performance. Try again.',
      ),
      actionType,
      executed: false,
      detail: { error: msg, postDescription },
    };
  }
};
