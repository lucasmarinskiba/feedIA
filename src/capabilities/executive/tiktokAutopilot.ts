/**
 * TikTok Autopilot — lee los videos de la cuenta, detecta señales y propone acciones.
 *
 * La API pública de TikTok da vistas, likes, comentarios, compartidos, seguidores y
 * fecha por video. Completion, watch time, alcance FYP, retención y uso de sonidos no
 * se exponen en esa API: quedan como "no disponible" y no se evalúan.
 *
 * Sin Anthropic call directo. Reglas + heurísticas determinísticas.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { log } from '../../agent/logger.js';
import {
  enqueueDecision,
  expireStaleSignals,
  hasDecisionForSignal,
  type DecisionUrgency,
} from './executiveDecisionQueue.js';

const TT_AUTOPILOT_DIR = path.resolve('data/autopilot/tiktok');

export type TTSignal =
  | 'views-drop'
  | 'follower-decline'
  | 'cadence-low'
  | 'comments-low'
  | 'shares-low'
  | 'series-momentum';

export type TTActionKind = 'experiment-format' | 'upload-batch' | 'reply-comments' | 'post-series-next';

export interface TTObservation {
  brandId: string;
  timestamp: string;
  metrics: {
    viewsLast7d: number | null;
    viewsPrev7d: number | null;
    engagementRateLast7d: number | null;
    commentRateLast7d: number | null;
    shareRateLast7d: number | null;
    followerDeltaLast7d: number | null;
    videosLast7d: number | null;
    videosLast30d: number | null;
    bestVideoViews30d: number | null;
    worstVideoViews30d: number | null;
  };
  horaUltimoVideo: number | null;
  fuentes: Record<string, 'real' | 'no disponible'>;
}

export interface TTSignalDetection {
  signal: TTSignal;
  confidence: number;
  evidence: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  recommendedAction: TTActionKind;
  reasoning: string;
  expectedImpact: string;
}

const VIEWS_DROP_THRESHOLD_PCT = 30;
const VIEWS_DROP_CRITICAL_PCT = 60;
const VIDEOS_WEEKLY_FLOOR = 5;
const COMMENT_RATE_FLOOR = 0.005;
const SHARE_RATE_FLOOR = 0.002;
const SERIES_RATIO_THRESHOLD = 5;
const SERIES_MIN_VIDEOS = 3;

const pctDelta = (actual: number, previo: number): number => ((actual - previo) / previo) * 100;

export const detectTTSignals = (obs: TTObservation): TTSignalDetection[] => {
  const m = obs.metrics;
  const signals: TTSignalDetection[] = [];

  if (m.viewsLast7d !== null && m.viewsPrev7d !== null && m.viewsPrev7d > 0) {
    const cambio = pctDelta(m.viewsLast7d, m.viewsPrev7d);
    if (cambio < -VIEWS_DROP_THRESHOLD_PCT) {
      signals.push({
        signal: 'views-drop',
        confidence: 0.85,
        evidence: `Vistas de los videos de la semana ${cambio.toFixed(0)}% vs la anterior (${m.viewsLast7d} vs ${m.viewsPrev7d})`,
        severity: cambio < -VIEWS_DROP_CRITICAL_PCT ? 'critical' : 'high',
        recommendedAction: 'experiment-format',
        reasoning: 'Los videos están llegando a menos gente. Probá otro formato o gancho en los primeros segundos.',
        expectedImpact: 'Recuperar el alcance de la semana anterior con un formato que resuene',
      });
    }
  }

  if (m.followerDeltaLast7d !== null && m.followerDeltaLast7d < 0) {
    signals.push({
      signal: 'follower-decline',
      confidence: 0.85,
      evidence: `Perdiste ${Math.abs(m.followerDeltaLast7d)} seguidores en 7 días`,
      severity: m.followerDeltaLast7d <= -20 ? 'high' : 'medium',
      recommendedAction: 'reply-comments',
      reasoning: 'Te están dejando de seguir. Responder comentarios reactiva a la audiencia que ya te conoce.',
      expectedImpact: 'Frenar la pérdida neta de seguidores',
    });
  }

  if (m.videosLast7d !== null && m.videosLast7d < VIDEOS_WEEKLY_FLOOR) {
    signals.push({
      signal: 'cadence-low',
      confidence: 0.9,
      evidence: `${m.videosLast7d} videos en 7 días (mínimo ${VIDEOS_WEEKLY_FLOOR})`,
      severity: 'high',
      recommendedAction: 'upload-batch',
      reasoning: 'Con pocos videos por semana el algoritmo deja de testear la cuenta.',
      expectedImpact: 'Volver a una cadencia que sostenga el testeo del algoritmo',
    });
  }

  if (m.commentRateLast7d !== null && m.commentRateLast7d < COMMENT_RATE_FLOOR) {
    signals.push({
      signal: 'comments-low',
      confidence: 0.7,
      evidence: `Comentarios sobre vistas: ${(m.commentRateLast7d * 100).toFixed(2)}% (mínimo ${(COMMENT_RATE_FLOOR * 100).toFixed(1)}%)`,
      severity: 'medium',
      recommendedAction: 'experiment-format',
      reasoning: 'Los videos no generan opinión. Cerrá con una pregunta concreta o una postura clara.',
      expectedImpact: 'Más comentarios, que son señal fuerte para el algoritmo',
    });
  }

  if (m.shareRateLast7d !== null && m.shareRateLast7d < SHARE_RATE_FLOOR) {
    signals.push({
      signal: 'shares-low',
      confidence: 0.7,
      evidence: `Compartidos sobre vistas: ${(m.shareRateLast7d * 100).toFixed(2)}% (mínimo ${(SHARE_RATE_FLOOR * 100).toFixed(1)}%)`,
      severity: 'medium',
      recommendedAction: 'experiment-format',
      reasoning: 'Nadie comparte los videos. Hacé contenido que la gente quiera mandarle a alguien.',
      expectedImpact: 'Más alcance orgánico por compartidos',
    });
  }

  if (
    m.bestVideoViews30d !== null &&
    m.worstVideoViews30d !== null &&
    m.worstVideoViews30d > 0 &&
    m.videosLast30d !== null &&
    m.videosLast30d >= SERIES_MIN_VIDEOS &&
    m.bestVideoViews30d / m.worstVideoViews30d >= SERIES_RATIO_THRESHOLD
  ) {
    const ratio = m.bestVideoViews30d / m.worstVideoViews30d;
    signals.push({
      signal: 'series-momentum',
      confidence: 0.8,
      evidence: `Tu mejor video tiene ${ratio.toFixed(0)}× las vistas del peor (${m.bestVideoViews30d} vs ${m.worstVideoViews30d})`,
      severity: 'low',
      recommendedAction: 'post-series-next',
      reasoning: 'Hay un formato que la audiencia premia. Convertilo en una serie semanal.',
      expectedImpact: 'Una serie ancla a la audiencia y sostiene las vistas',
    });
  }

  return signals.sort((a, b) => {
    const sev: Record<TTSignalDetection['severity'], number> = { critical: 0, high: 1, medium: 2, low: 3 };
    return sev[a.severity] - sev[b.severity];
  });
};

export interface TTAutopilotReport {
  brandId: string;
  generatedAt: string;
  observation: TTObservation;
  signals: TTSignalDetection[];
  healthScore: number;
  recommendedNextAction?: TTSignalDetection;
  didacticInsight: string;
}

export interface TTReporteResumen {
  generatedAt: string;
  healthScore: number;
  criticalCount: number;
  signals: TTSignal[];
}

const composeDidacticInsight = (signals: TTSignalDetection[], obs: TTObservation): string => {
  if (obs.metrics.videosLast7d === null)
    return 'Todavía no hay datos de la cuenta de TikTok. Conectala para que el autopilot analice.';
  if (signals.length === 0) {
    return `Sin señales de alerta (${obs.metrics.videosLast7d} videos esta semana). Próximo paso: probar un formato nuevo y medir.`;
  }
  const crit = signals.find((s) => s.severity === 'critical');
  if (crit) return `Prioridad #1: ${crit.evidence}. ${crit.reasoning}`;
  const high = signals.find((s) => s.severity === 'high');
  if (high) return `Atendé primero: ${high.evidence}. ${high.reasoning}`;
  return `${signals.length} señal(es) detectada(s). Empezá por: ${signals[0]!.evidence}.`;
};

const ensureDir = async (): Promise<void> => {
  await fs.mkdir(TT_AUTOPILOT_DIR, { recursive: true });
};

export const runTTAutopilot = async (obs: TTObservation): Promise<TTAutopilotReport> => {
  await ensureDir();
  const signals = detectTTSignals(obs);
  const critCount = signals.filter((s) => s.severity === 'critical').length;
  const highCount = signals.filter((s) => s.severity === 'high').length;
  const healthScore = Math.max(0, 100 - critCount * 30 - highCount * 15 - signals.length * 3);

  const report: TTAutopilotReport = {
    brandId: obs.brandId,
    generatedAt: new Date().toISOString(),
    observation: obs,
    signals,
    healthScore,
    recommendedNextAction: signals[0],
    didacticInsight: composeDidacticInsight(signals, obs),
  };
  const filePath = path.join(TT_AUTOPILOT_DIR, `${obs.brandId}-${Date.now()}.json`);
  await fs.writeFile(filePath, JSON.stringify(report, null, 2), 'utf-8');
  log.info('[tiktokAutopilot] report generated', {
    brandId: obs.brandId,
    signals: signals.length,
    health: healthScore,
  });
  return report;
};

const archivosDeMarca = async (brandId: string): Promise<string[]> => {
  await ensureDir();
  const patron = new RegExp(`^${brandId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}-\\d+\\.json$`);
  return (await fs.readdir(TT_AUTOPILOT_DIR))
    .filter((f) => patron.test(f))
    .sort()
    .reverse();
};

const leerReporte = async (archivo: string): Promise<TTAutopilotReport | null> => {
  try {
    return JSON.parse(await fs.readFile(path.join(TT_AUTOPILOT_DIR, archivo), 'utf-8')) as TTAutopilotReport;
  } catch {
    return null;
  }
};

export const getLatestReport = async (brandId: string): Promise<TTAutopilotReport | null> => {
  try {
    const [primero] = await archivosDeMarca(brandId);
    return primero ? await leerReporte(primero) : null;
  } catch {
    return null;
  }
};

export const listReports = async (brandId: string, limite = 10): Promise<TTReporteResumen[]> => {
  try {
    const archivos = (await archivosDeMarca(brandId)).slice(0, limite);
    const reportes = await Promise.all(archivos.map(leerReporte));
    return reportes
      .filter((r): r is TTAutopilotReport => r !== null)
      .map((r) => ({
        generatedAt: r.generatedAt,
        healthScore: r.healthScore,
        criticalCount: r.signals.filter((s) => s.severity === 'critical').length,
        signals: r.signals.map((s) => s.signal),
      }));
  } catch {
    return [];
  }
};

const TITULO_SENAL: Record<TTSignal, string> = {
  'views-drop': 'Las vistas están cayendo',
  'follower-decline': 'Estás perdiendo seguidores',
  'cadence-low': 'Pocos videos por semana',
  'comments-low': 'Poca conversación en los videos',
  'shares-low': 'Nadie comparte los videos',
  'series-momentum': 'Un formato rinde muy por encima',
};

const URGENCIA: Record<TTSignalDetection['severity'], DecisionUrgency> = {
  critical: 'critical',
  high: 'high',
  medium: 'medium',
  low: 'low',
};

const FUENTE_DECISION = 'tt-autopilot';

/**
 * Propone en Decisiones las señales de severidad media o mayor del reporte.
 * Una propuesta por señal y día; las señales que ya no aparecen se expiran.
 */
export const proponerDesdeReporteTT = async (brandId: string, reporte: TTAutopilotReport): Promise<number> => {
  const dia = reporte.generatedAt.slice(0, 10);
  const relevantes = reporte.signals.filter((s) => s.severity !== 'low');
  await expireStaleSignals(brandId, new Set(relevantes.map((s) => `tt:${s.signal}:${dia}`)), [FUENTE_DECISION]);
  let creadas = 0;
  for (const s of relevantes) {
    const signalKey = `tt:${s.signal}:${dia}`;
    if (await hasDecisionForSignal(brandId, signalKey)) continue;
    await enqueueDecision({
      brandId,
      source: FUENTE_DECISION,
      signalKey,
      urgency: URGENCIA[s.severity],
      title: TITULO_SENAL[s.signal],
      context: s.evidence,
      reasoning: s.reasoning,
      expectedOutcome: s.expectedImpact,
      risks: [],
      recommendedAction: {
        label: s.recommendedAction,
        payload: { accion: s.recommendedAction },
        irreversible: false,
        estimatedCostUsd: 0,
        estimatedImpactScore: s.confidence * 10,
      },
      alternativeActions: [],
      autoExecuteIfNoResponse: false,
    });
    creadas++;
  }
  return creadas;
};
