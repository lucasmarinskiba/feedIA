/**
 * Instagram Autopilot — backend más inteligente, didáctico, autónomo para IG.
 *
 * Monitorea signals + dispara acciones recomendadas (post timing optimal,
 * hashtag rotation, story cadence, dm hygiene, engagement pulse).
 *
 * Sin Anthropic call directo. Reglas + heurísticas determinísticas.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { log } from '../../agent/logger.js';

const IG_AUTOPILOT_DIR = path.resolve('data/autopilot/instagram');

export type IGSignal =
  | 'reach-drop'
  | 'engagement-drop'
  | 'follower-stall'
  | 'hashtag-burnt'
  | 'story-cadence-low'
  | 'dm-backlog'
  | 'comment-backlog'
  | 'top-post-cooling'
  | 'best-time-shift'
  | 'shadowban-risk'
  | 'algorithm-favor';
export type IGActionKind =
  | 'post-now'
  | 'rotate-hashtag'
  | 'boost-post'
  | 'reply-comments-batch'
  | 'reply-dms-batch'
  | 'cross-post-to-stories'
  | 'pause-posting'
  | 'change-format'
  | 'follow-up-leads'
  | 'pin-top-comment'
  | 'archive-low-performer'
  | 'reactivate-cold-followers';

export interface IGObservation {
  brandId: string;
  timestamp: string;
  metrics: {
    reachLast7d: number;
    reachPrev7d: number;
    engagementRateLast7d: number;
    engagementRatePrev7d: number;
    followerDeltaLast7d: number;
    postsLast7d: number;
    storiesLast7d: number;
    reelsLast7d: number;
    avgDmResponseMinutes: number;
    commentBacklog: number;
    dmBacklog: number;
  };
  hashtagHealthScore: number;
  bestPostingHourLast30d: number;
  postingHourLast7d: number;
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

const HASHTAG_HEALTH_THRESHOLD = 0.5;
const REACH_DROP_THRESHOLD_PCT = 20;
const ENGAGEMENT_DROP_THRESHOLD_PCT = 25;
const STORY_DAILY_FLOOR = 1;
const POST_WEEKLY_FLOOR = 3;
const DM_BACKLOG_THRESHOLD = 10;
const COMMENT_BACKLOG_THRESHOLD = 15;
const DM_RESPONSE_THRESHOLD_MINUTES = 60;

const ensureDir = async (): Promise<void> => {
  await fs.mkdir(IG_AUTOPILOT_DIR, { recursive: true });
};

const pctDelta = (current: number, previous: number): number => {
  if (previous === 0) return 0;
  return ((current - previous) / previous) * 100;
};

export const detectIGSignals = (obs: IGObservation): IGSignalDetection[] => {
  const signals: IGSignalDetection[] = [];

  const reachChange = pctDelta(obs.metrics.reachLast7d, obs.metrics.reachPrev7d);
  if (reachChange < -REACH_DROP_THRESHOLD_PCT) {
    signals.push({
      signal: 'reach-drop',
      confidence: Math.min(0.95, 0.5 + Math.abs(reachChange) / 100),
      evidence: `Alcance ${reachChange.toFixed(0)}% vs semana anterior`,
      severity: Math.abs(reachChange) > 40 ? 'critical' : 'high',
      recommendedAction: 'change-format',
      reasoning: 'Alcance cayendo: algoritmo no está distribuyendo. Cambiar formato (reel vs carrusel) o tema.',
      expectedImpact: `Recuperar ${Math.abs(reachChange).toFixed(0)}% de alcance en 7-14 días`,
    });
  }

  const engChange = pctDelta(obs.metrics.engagementRateLast7d, obs.metrics.engagementRatePrev7d);
  if (engChange < -ENGAGEMENT_DROP_THRESHOLD_PCT) {
    signals.push({
      signal: 'engagement-drop',
      confidence: 0.8,
      evidence: `Engagement ${engChange.toFixed(0)}% vs prev`,
      severity: 'high',
      recommendedAction: 'change-format',
      reasoning: 'Engagement bajó: contenido no resonando con audiencia actual. Volver a topics ganadores.',
      expectedImpact: 'Recuperar ratio si se aplica patrón ganador',
    });
  }

  if (obs.hashtagHealthScore < HASHTAG_HEALTH_THRESHOLD) {
    signals.push({
      signal: 'hashtag-burnt',
      confidence: 0.85,
      evidence: `Health score hashtags ${(obs.hashtagHealthScore * 100).toFixed(0)}%`,
      severity: 'medium',
      recommendedAction: 'rotate-hashtag',
      reasoning: 'Hashtags quemados o en gris. Reemplazar set top 5 con alternativas frescas.',
      expectedImpact: '+10-20% reach potencial',
    });
  }

  if (obs.metrics.storiesLast7d < STORY_DAILY_FLOOR * 7) {
    signals.push({
      signal: 'story-cadence-low',
      confidence: 0.95,
      evidence: `${obs.metrics.storiesLast7d} stories en 7d (mín recomendado ${STORY_DAILY_FLOOR * 7})`,
      severity: 'medium',
      recommendedAction: 'cross-post-to-stories',
      reasoning: 'Stories es el canal de relación. Bajo volumen = audiencia se enfría.',
      expectedImpact: '+30% retention de followers activos',
    });
  }

  if (obs.metrics.postsLast7d < POST_WEEKLY_FLOOR) {
    signals.push({
      signal: 'follower-stall',
      confidence: 0.7,
      evidence: `${obs.metrics.postsLast7d} posts en 7d (mín ${POST_WEEKLY_FLOOR})`,
      severity: 'medium',
      recommendedAction: 'post-now',
      reasoning: 'Cadencia debajo del piso. Algoritmo desprioriza cuentas inactivas.',
      expectedImpact: 'Mantener visibilidad orgánica',
    });
  }

  if (
    obs.metrics.dmBacklog > DM_BACKLOG_THRESHOLD ||
    obs.metrics.avgDmResponseMinutes > DM_RESPONSE_THRESHOLD_MINUTES
  ) {
    signals.push({
      signal: 'dm-backlog',
      confidence: 0.9,
      evidence: `${obs.metrics.dmBacklog} DMs sin responder, avg ${obs.metrics.avgDmResponseMinutes}min`,
      severity: obs.metrics.dmBacklog > 25 ? 'high' : 'medium',
      recommendedAction: 'reply-dms-batch',
      reasoning: 'DMs son leads calientes. Respuesta >1h reduce conversión 70%.',
      expectedImpact: 'Recuperar conversiones perdidas',
    });
  }

  if (obs.metrics.commentBacklog > COMMENT_BACKLOG_THRESHOLD) {
    signals.push({
      signal: 'comment-backlog',
      confidence: 0.85,
      evidence: `${obs.metrics.commentBacklog} comentarios pendientes`,
      severity: 'medium',
      recommendedAction: 'reply-comments-batch',
      reasoning: 'Comentarios sin respuesta apagan algoritmo (engagement signal).',
      expectedImpact: '+5-15% engagement próximo post',
    });
  }

  const hourDelta = Math.abs(obs.bestPostingHourLast30d - obs.postingHourLast7d);
  if (hourDelta > 2) {
    signals.push({
      signal: 'best-time-shift',
      confidence: 0.7,
      evidence: `Postás ${obs.postingHourLast7d}h, mejor hora es ${obs.bestPostingHourLast30d}h`,
      severity: 'low',
      recommendedAction: 'post-now',
      reasoning: 'Audiencia activa shift. Ajustar horario aumenta first-hour engagement.',
      expectedImpact: '+15-25% alcance primera hora',
    });
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

const composeDidacticInsight = (signals: IGSignalDetection[], obs: IGObservation): string => {
  if (signals.length === 0)
    return `Cuenta en buen estado. Mantener cadencia ${obs.metrics.postsLast7d} posts/${obs.metrics.storiesLast7d} stories por semana. Próximo experimento: testear formato nuevo.`;
  const crit = signals.find((s) => s.severity === 'critical');
  if (crit) return `🚨 Prioridad #1: ${crit.signal}. ${crit.reasoning} Esperá: ${crit.expectedImpact}.`;
  const high = signals.find((s) => s.severity === 'high');
  if (high) return `⚠️ Atender ${high.signal}: ${high.reasoning} → ${high.expectedImpact}.`;
  return `${signals.length} señales detectadas. Empezar por: ${signals[0]!.signal} (${signals[0]!.reasoning})`;
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

export const getLatestReport = async (brandId: string): Promise<IGAutopilotReport | null> => {
  try {
    await ensureDir();
    const files = await fs.readdir(IG_AUTOPILOT_DIR);
    const matching = files
      .filter((f) => f.startsWith(`${brandId}-`))
      .sort()
      .reverse();
    if (matching.length === 0) return null;
    return JSON.parse(await fs.readFile(path.join(IG_AUTOPILOT_DIR, matching[0]!), 'utf-8')) as IGAutopilotReport;
  } catch {
    return null;
  }
};
