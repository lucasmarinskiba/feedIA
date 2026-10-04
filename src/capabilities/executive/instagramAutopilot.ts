/**
 * Instagram Autopilot — lee la cuenta, detecta señales y propone acciones.
 *
 * Las métricas vienen de datos reales (Graph API, DMs, cola de comentarios, historial
 * de seguidores). Lo que no se puede medir queda null y la regla correspondiente no
 * se evalúa: nunca se inventa un número. Las señales relevantes se proponen en la cola
 * de decisiones; ejecutar la acción sigue siendo decisión del dueño.
 *
 * Sin Anthropic call directo. Reglas + heurísticas determinísticas.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { log } from '../../agent/logger.js';
import { enqueueDecision, hasDecisionForSignal, type DecisionUrgency } from './executiveDecisionQueue.js';

const IG_AUTOPILOT_DIR = path.resolve('data/autopilot/instagram');

export type IGSignal =
  | 'reach-drop'
  | 'engagement-drop'
  | 'follower-stall'
  | 'follower-decline'
  | 'hashtag-burnt'
  | 'story-cadence-low'
  | 'dm-backlog'
  | 'comment-backlog'
  | 'best-time-shift'
  | 'algorithm-favor';

export type IGActionKind =
  | 'post-now'
  | 'rotate-hashtag'
  | 'reply-comments-batch'
  | 'reply-dms-batch'
  | 'cross-post-to-stories'
  | 'change-format'
  | 'reactivate-cold-followers';

export interface FormatoMetrica {
  posts: number;
  interaccionesPromedio: number;
}

export interface IGObservation {
  brandId: string;
  timestamp: string;
  metrics: {
    reachLast7d: number | null;
    reachPrev7d: number | null;
    engagementRateLast7d: number | null;
    engagementRatePrev7d: number | null;
    followerDeltaLast7d: number | null;
    postsLast7d: number | null;
    storiesLast7d: number | null;
    reelsLast7d: number | null;
    avgDmResponseMinutes: number | null;
    commentBacklog: number | null;
    dmBacklog: number | null;
  };
  formatos: { reels: FormatoMetrica | null; carruseles: FormatoMetrica | null };
  hashtagHealthScore: number | null;
  bestPostingHourLast30d: number | null;
  postingHourLast7d: number | null;
  fuentes: Record<string, 'real' | 'no disponible'>;
}

export interface IGSignalDetection {
  signal: IGSignal;
  confidence: number;
  evidence: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  recommendedAction: IGActionKind;
  reasoning: string;
  expectedImpact: string;
}

const REACH_DROP_THRESHOLD_PCT = 20;
const ENGAGEMENT_DROP_THRESHOLD_PCT = 25;
const POST_WEEKLY_FLOOR = 3;
const DM_BACKLOG_THRESHOLD = 10;
const DM_RESPONSE_THRESHOLD_MINUTES = 60;
const COMMENT_BACKLOG_THRESHOLD = 15;
const HASHTAG_HEALTH_THRESHOLD = 0.5;
const STORY_WEEKLY_FLOOR = 7;
const FORMAT_RATIO_THRESHOLD = 1.3;

const ensureDir = async (): Promise<void> => {
  await fs.mkdir(IG_AUTOPILOT_DIR, { recursive: true });
};

const pctDelta = (current: number, previous: number): number => {
  if (previous === 0) return 0;
  return ((current - previous) / previous) * 100;
};

export const detectIGSignals = (obs: IGObservation): IGSignalDetection[] => {
  const m = obs.metrics;
  const signals: IGSignalDetection[] = [];

  if (m.reachLast7d !== null && m.reachPrev7d !== null && m.reachPrev7d > 0) {
    const cambio = pctDelta(m.reachLast7d, m.reachPrev7d);
    if (cambio < -REACH_DROP_THRESHOLD_PCT) {
      signals.push({
        signal: 'reach-drop',
        confidence: Math.min(0.95, 0.5 + Math.abs(cambio) / 100),
        evidence: `Alcance ${cambio.toFixed(0)}% vs la semana anterior (${m.reachLast7d} vs ${m.reachPrev7d})`,
        severity: Math.abs(cambio) > 40 ? 'critical' : 'high',
        recommendedAction: 'change-format',
        reasoning: 'El alcance cae: el algoritmo no está distribuyendo. Probá otro formato o tema.',
        expectedImpact: `Recuperar parte del ${Math.abs(cambio).toFixed(0)}% de alcance perdido en 7-14 días`,
      });
    }
  }

  if (m.engagementRateLast7d !== null && m.engagementRatePrev7d !== null && m.engagementRatePrev7d > 0) {
    const cambio = pctDelta(m.engagementRateLast7d, m.engagementRatePrev7d);
    if (cambio < -ENGAGEMENT_DROP_THRESHOLD_PCT) {
      signals.push({
        signal: 'engagement-drop',
        confidence: 0.8,
        evidence: `Engagement ${cambio.toFixed(0)}% vs la semana anterior (${m.engagementRateLast7d.toFixed(1)}% vs ${m.engagementRatePrev7d.toFixed(1)}%)`,
        severity: 'high',
        recommendedAction: 'change-format',
        reasoning: 'El contenido no resuena con la audiencia actual. Volvé a los temas que sí funcionaron.',
        expectedImpact: 'Recuperar el ratio de interacción con el patrón ganador',
      });
    }
  }

  if (m.postsLast7d !== null && m.postsLast7d < POST_WEEKLY_FLOOR) {
    signals.push({
      signal: 'follower-stall',
      confidence: 0.7,
      evidence: `${m.postsLast7d} posts en 7 días (mínimo ${POST_WEEKLY_FLOOR})`,
      severity: 'medium',
      recommendedAction: 'post-now',
      reasoning: 'La cadencia está debajo del piso: el algoritmo baja la prioridad de cuentas inactivas.',
      expectedImpact: 'Mantener visibilidad orgánica',
    });
  }

  if (m.followerDeltaLast7d !== null && m.followerDeltaLast7d < 0) {
    signals.push({
      signal: 'follower-decline',
      confidence: 0.85,
      evidence: `Perdiste ${Math.abs(m.followerDeltaLast7d)} seguidores en 7 días`,
      severity: m.followerDeltaLast7d <= -20 ? 'high' : 'medium',
      recommendedAction: 'reactivate-cold-followers',
      reasoning: 'Hay seguidores que dejan de seguir. Reactivar a los que dejaron de interactuar frena la fuga.',
      expectedImpact: 'Frenar la pérdida neta de seguidores',
    });
  }

  if (obs.hashtagHealthScore !== null && obs.hashtagHealthScore < HASHTAG_HEALTH_THRESHOLD) {
    signals.push({
      signal: 'hashtag-burnt',
      confidence: 0.85,
      evidence: `Salud de hashtags ${(obs.hashtagHealthScore * 100).toFixed(0)}%`,
      severity: 'medium',
      recommendedAction: 'rotate-hashtag',
      reasoning: 'Hashtags quemados o en gris. Reemplazá el set principal por alternativas frescas.',
      expectedImpact: 'Más alcance potencial en los próximos posts',
    });
  }

  if (m.storiesLast7d !== null && m.storiesLast7d < STORY_WEEKLY_FLOOR) {
    signals.push({
      signal: 'story-cadence-low',
      confidence: 0.9,
      evidence: `${m.storiesLast7d} stories en 7 días (mínimo ${STORY_WEEKLY_FLOOR})`,
      severity: 'medium',
      recommendedAction: 'cross-post-to-stories',
      reasoning: 'Las stories son el canal de relación. Poco volumen y la audiencia se enfría.',
      expectedImpact: 'Mejor retención de seguidores activos',
    });
  }

  if (
    m.dmBacklog !== null &&
    m.avgDmResponseMinutes !== null &&
    (m.dmBacklog > DM_BACKLOG_THRESHOLD || m.avgDmResponseMinutes > DM_RESPONSE_THRESHOLD_MINUTES)
  ) {
    signals.push({
      signal: 'dm-backlog',
      confidence: 0.9,
      evidence: `${m.dmBacklog} conversaciones sin responder, espera promedio ${Math.round(m.avgDmResponseMinutes)} min`,
      severity: m.dmBacklog > 25 ? 'high' : 'medium',
      recommendedAction: 'reply-dms-batch',
      reasoning: 'Los DMs son leads calientes. Responder tarde baja mucho la conversión.',
      expectedImpact: 'Recuperar conversaciones comerciales',
    });
  }

  if (m.commentBacklog !== null && m.commentBacklog > COMMENT_BACKLOG_THRESHOLD) {
    signals.push({
      signal: 'comment-backlog',
      confidence: 0.85,
      evidence: `${m.commentBacklog} comentarios pendientes de revisión`,
      severity: 'medium',
      recommendedAction: 'reply-comments-batch',
      reasoning: 'Los comentarios sin respuesta frenan el engagement del próximo post.',
      expectedImpact: 'Más engagement en el próximo post',
    });
  }

  if (obs.bestPostingHourLast30d !== null && obs.postingHourLast7d !== null) {
    const diferencia = Math.abs(obs.bestPostingHourLast30d - obs.postingHourLast7d);
    if (diferencia > 2) {
      signals.push({
        signal: 'best-time-shift',
        confidence: 0.7,
        evidence: `Publicás a las ${obs.postingHourLast7d}h; tu mejor hora de los últimos 30 días es ${obs.bestPostingHourLast30d}h`,
        severity: 'low',
        recommendedAction: 'post-now',
        reasoning: 'Tu audiencia activa cambió de horario. Publicar en tu mejor franja mejora la primera hora.',
        expectedImpact: 'Más alcance en la primera hora',
      });
    }
  }

  const { reels, carruseles } = obs.formatos;
  if (reels && carruseles && reels.posts >= 2 && carruseles.posts >= 2 && carruseles.interaccionesPromedio > 0) {
    const ratio = reels.interaccionesPromedio / carruseles.interaccionesPromedio;
    if (ratio >= FORMAT_RATIO_THRESHOLD || ratio <= 1 / FORMAT_RATIO_THRESHOLD) {
      const gana = ratio > 1 ? 'reels' : 'carruseles';
      const ganador = ratio > 1 ? reels : carruseles;
      const perdedor = ratio > 1 ? carruseles : reels;
      signals.push({
        signal: 'algorithm-favor',
        confidence: 0.6,
        evidence: `Los ${gana} rinden ${ganador.interaccionesPromedio.toFixed(0)} interacciones por post; el otro formato ${perdedor.interaccionesPromedio.toFixed(0)}`,
        severity: 'low',
        recommendedAction: 'change-format',
        reasoning: `El algoritmo está premiando ${gana}. Sumá más piezas de ese formato.`,
        expectedImpact: 'Más interacciones por post con el formato que ya funciona',
      });
    }
  }

  return signals.sort((a, b) => {
    const sev: Record<IGSignalDetection['severity'], number> = { critical: 0, high: 1, medium: 2, low: 3 };
    return sev[a.severity] - sev[b.severity];
  });
};

export interface IGAutopilotReport {
  brandId: string;
  generatedAt: string;
  observation: IGObservation;
  signals: IGSignalDetection[];
  criticalCount: number;
  recommendedNextAction?: IGSignalDetection;
  didacticInsight: string;
  autopilotScore: number;
}

export interface IGReporteResumen {
  generatedAt: string;
  autopilotScore: number;
  criticalCount: number;
  signals: IGSignal[];
}

const composeDidacticInsight = (signals: IGSignalDetection[], obs: IGObservation): string => {
  if (signals.length === 0) {
    const cadencia =
      obs.metrics.postsLast7d === null ? 'sin datos de publicación' : `${obs.metrics.postsLast7d} posts en 7 días`;
    return `Sin señales de alerta (${cadencia}). Próximo paso: probar un formato nuevo y medir.`;
  }
  const crit = signals.find((s) => s.severity === 'critical');
  if (crit) return `Prioridad #1: ${crit.evidence}. ${crit.reasoning}`;
  const high = signals.find((s) => s.severity === 'high');
  if (high) return `Atendé primero: ${high.evidence}. ${high.reasoning}`;
  return `${signals.length} señal(es) detectada(s). Empezá por: ${signals[0]!.evidence}.`;
};

export const runIGAutopilot = async (obs: IGObservation): Promise<IGAutopilotReport> => {
  await ensureDir();
  const signals = detectIGSignals(obs);
  const criticalCount = signals.filter((s) => s.severity === 'critical').length;
  const highCount = signals.filter((s) => s.severity === 'high').length;
  const autopilotScore = Math.max(0, 100 - criticalCount * 25 - highCount * 12 - signals.length * 3);

  const report: IGAutopilotReport = {
    brandId: obs.brandId,
    generatedAt: new Date().toISOString(),
    observation: obs,
    signals,
    criticalCount,
    recommendedNextAction: signals[0],
    didacticInsight: composeDidacticInsight(signals, obs),
    autopilotScore,
  };
  const filePath = path.join(IG_AUTOPILOT_DIR, `${obs.brandId}-${Date.now()}.json`);
  await fs.writeFile(filePath, JSON.stringify(report, null, 2), 'utf-8');
  log.info('[instagramAutopilot] report generated', {
    brandId: obs.brandId,
    signals: signals.length,
    score: autopilotScore,
  });
  return report;
};

const archivosDeMarca = async (brandId: string): Promise<string[]> => {
  await ensureDir();
  const patron = new RegExp(`^${brandId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}-\\d+\\.json$`);
  const archivos = (await fs.readdir(IG_AUTOPILOT_DIR)).filter((f) => patron.test(f));
  return archivos.sort().reverse();
};

const leerReporte = async (archivo: string): Promise<IGAutopilotReport | null> => {
  try {
    return JSON.parse(await fs.readFile(path.join(IG_AUTOPILOT_DIR, archivo), 'utf-8')) as IGAutopilotReport;
  } catch {
    return null;
  }
};

export const getLatestReport = async (brandId: string): Promise<IGAutopilotReport | null> => {
  try {
    const [primero] = await archivosDeMarca(brandId);
    return primero ? await leerReporte(primero) : null;
  } catch {
    return null;
  }
};

export const listReports = async (brandId: string, limite = 10): Promise<IGReporteResumen[]> => {
  try {
    const archivos = (await archivosDeMarca(brandId)).slice(0, limite);
    const reportes = await Promise.all(archivos.map(leerReporte));
    return reportes
      .filter((r): r is IGAutopilotReport => r !== null)
      .map((r) => ({
        generatedAt: r.generatedAt,
        autopilotScore: r.autopilotScore,
        criticalCount: r.criticalCount,
        signals: r.signals.map((s) => s.signal),
      }));
  } catch {
    return [];
  }
};

const TITULO_SENAL: Record<IGSignal, string> = {
  'reach-drop': 'El alcance está cayendo',
  'engagement-drop': 'El engagement bajó',
  'follower-stall': 'Poca cadencia de publicación',
  'follower-decline': 'Estás perdiendo seguidores',
  'hashtag-burnt': 'Hashtags quemados',
  'story-cadence-low': 'Pocas stories',
  'dm-backlog': 'DMs sin responder',
  'comment-backlog': 'Comentarios pendientes',
  'best-time-shift': 'Cambió tu mejor horario',
  'algorithm-favor': 'Un formato rinde más',
};

const ACCION_TEXTO: Record<IGActionKind, string> = {
  'post-now': 'Publicar ahora',
  'rotate-hashtag': 'Rotar hashtags',
  'reply-comments-batch': 'Responder comentarios',
  'reply-dms-batch': 'Responder DMs',
  'cross-post-to-stories': 'Publicar en stories',
  'change-format': 'Cambiar de formato',
  'reactivate-cold-followers': 'Reactivar seguidores fríos',
};

const URGENCIA: Record<IGSignalDetection['severity'], DecisionUrgency> = {
  critical: 'critical',
  high: 'high',
  medium: 'medium',
  low: 'low',
};

/**
 * Propone en Decisiones las señales de severidad media o mayor del reporte.
 * Una propuesta por señal y día; no se duplica mientras la señal exista.
 */
export const proponerDesdeReporte = async (brandId: string, reporte: IGAutopilotReport): Promise<number> => {
  const dia = reporte.generatedAt.slice(0, 10);
  let creadas = 0;
  for (const s of reporte.signals.filter((x) => x.severity !== 'low')) {
    const signalKey = `ig:${s.signal}:${dia}`;
    if (await hasDecisionForSignal(brandId, signalKey)) continue;
    await enqueueDecision({
      brandId,
      source: 'ig-autopilot',
      signalKey,
      urgency: URGENCIA[s.severity],
      title: TITULO_SENAL[s.signal],
      context: s.evidence,
      reasoning: s.reasoning,
      expectedOutcome: s.expectedImpact,
      risks: [],
      recommendedAction: {
        label: ACCION_TEXTO[s.recommendedAction],
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
