/**
 * TikTok Autopilot — backend inteligente + autónomo + didáctico para TikTok.
 *
 * Monitorea métricas FYP-críticas (watch time, completion, replays, FYP %),
 * detecta señales (sound saturation, hook fail, retention cliff, FYP cutoff),
 * recomienda acciones (re-hook, sound rotate, duet, batch upload).
 *
 * Sin Anthropic call directo.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { log } from '../../agent/logger.js';

const TT_AUTOPILOT_DIR = path.resolve('data/autopilot/tiktok');

export type TTSignal =
  | 'completion-low'
  | 'hook-fail'
  | 'retention-cliff'
  | 'sound-saturated'
  | 'fyp-cutoff'
  | 'reposts-cold'
  | 'comments-low'
  | 'cadence-low'
  | 'duet-opportunity'
  | 'series-momentum'
  | 'sound-trending-now';
export type TTActionKind =
  | 'reshoot-hook'
  | 'edit-tighten'
  | 'rotate-sound'
  | 'duet-trending'
  | 'post-series-next'
  | 'upload-batch'
  | 'reply-comments'
  | 'experiment-format'
  | 'go-live'
  | 'pin-best-comment';

export interface TTObservation {
  brandId: string;
  timestamp: string;
  metrics: {
    avgCompletionRateLast7d: number;
    avgWatchTimePctLast7d: number;
    fypReachPctLast7d: number;
    videosLast7d: number;
    avgFirstHourViewsLast7d: number;
    avgFinalViewsLast30d: number;
    rewatchRate: number;
    shareRate: number;
    commentRate: number;
    saveRate: number;
    followsPerVideoAvg: number;
  };
  topSoundUsesLast7d: number;
  topSoundUsesPrev7d: number;
  hookDropoffSec: number;
  bestPerformerCompletion: number;
  worstPerformerCompletion: number;
}

export interface TTSignalDetection {
  signal: TTSignal;
  confidence: number;
  evidence: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  recommendedAction: TTActionKind;
  reasoning: string;
  expectedImpact: string;
  fypMechanicAffected: 'completion' | 'shares' | 'comments' | 'rewatch' | 'follow-through';
}

const COMPLETION_FLOOR = 0.45;
const FYP_REACH_FLOOR = 0.3;
const HOOK_DROPOFF_CEIL_SEC = 2.5;
const VIDEOS_WEEKLY_FLOOR = 5;
const SOUND_SATURATION_MULTIPLIER = 3;

export const detectTTSignals = (obs: TTObservation): TTSignalDetection[] => {
  const signals: TTSignalDetection[] = [];

  if (obs.metrics.avgCompletionRateLast7d < COMPLETION_FLOOR) {
    signals.push({
      signal: 'completion-low',
      confidence: 0.95,
      evidence: `Completion ${(obs.metrics.avgCompletionRateLast7d * 100).toFixed(0)}% (floor ${COMPLETION_FLOOR * 100}%)`,
      severity: 'critical',
      recommendedAction: 'edit-tighten',
      reasoning: 'Completion < 45% mata FYP. Recortar videos a <20s o agregar loop al final.',
      expectedImpact: 'Subir completion a 60%+ → FYP push 3-5×',
      fypMechanicAffected: 'completion',
    });
  }

  if (obs.hookDropoffSec > HOOK_DROPOFF_CEIL_SEC) {
    signals.push({
      signal: 'hook-fail',
      confidence: 0.9,
      evidence: `Audiencia abandona ${obs.hookDropoffSec.toFixed(1)}s (techo ${HOOK_DROPOFF_CEIL_SEC}s)`,
      severity: 'critical',
      recommendedAction: 'reshoot-hook',
      reasoning: 'Hook >2.5s no engancha. Primer frame visual + audio + texto deben prometer payoff inmediato.',
      expectedImpact: 'Cortar dropoff a 1.5s = +40% completion',
      fypMechanicAffected: 'completion',
    });
  }

  if (obs.metrics.fypReachPctLast7d < FYP_REACH_FLOOR) {
    signals.push({
      signal: 'fyp-cutoff',
      confidence: 0.85,
      evidence: `${(obs.metrics.fypReachPctLast7d * 100).toFixed(0)}% reach vía FYP (floor ${FYP_REACH_FLOOR * 100}%)`,
      severity: 'high',
      recommendedAction: 'experiment-format',
      reasoning: 'Algoritmo dejó de empujar. Cambiar nicho temático o formato (talking head ↔ b-roll).',
      expectedImpact: 'Restaurar FYP push si formato resuena',
      fypMechanicAffected: 'completion',
    });
  }

  const soundRatio = obs.topSoundUsesPrev7d > 0 ? obs.topSoundUsesLast7d / obs.topSoundUsesPrev7d : 1;
  if (soundRatio > SOUND_SATURATION_MULTIPLIER) {
    signals.push({
      signal: 'sound-saturated',
      confidence: 0.8,
      evidence: `Sound usado ${soundRatio.toFixed(1)}× más que semana previa`,
      severity: 'medium',
      recommendedAction: 'rotate-sound',
      reasoning: 'Sounds sobreusados pierden boost. Buscar sounds emerging (24-72h de vida).',
      expectedImpact: '+20-30% reach con sound fresco',
      fypMechanicAffected: 'completion',
    });
  }

  if (obs.metrics.videosLast7d < VIDEOS_WEEKLY_FLOOR) {
    signals.push({
      signal: 'cadence-low',
      confidence: 0.9,
      evidence: `${obs.metrics.videosLast7d} videos en 7d (mín ${VIDEOS_WEEKLY_FLOOR})`,
      severity: 'high',
      recommendedAction: 'upload-batch',
      reasoning: 'TikTok premia volumen. <5 videos/sem = algoritmo deja de testear.',
      expectedImpact: 'Cadencia 7+/sem desbloquea FYP testing',
      fypMechanicAffected: 'follow-through',
    });
  }

  if (obs.metrics.commentRate < 0.005) {
    signals.push({
      signal: 'comments-low',
      confidence: 0.7,
      evidence: `Comment rate ${(obs.metrics.commentRate * 100).toFixed(2)}%`,
      severity: 'medium',
      recommendedAction: 'experiment-format',
      reasoning: 'Comments < 0.5% = video no provoca opinión. Agregar pregunta cerrada o controversia ligera.',
      expectedImpact: 'Subir comments → señal fuerte FYP',
      fypMechanicAffected: 'comments',
    });
  }

  if (obs.metrics.rewatchRate < 0.1) {
    signals.push({
      signal: 'reposts-cold',
      confidence: 0.75,
      evidence: `Rewatch ${(obs.metrics.rewatchRate * 100).toFixed(0)}%`,
      severity: 'medium',
      recommendedAction: 'experiment-format',
      reasoning: 'Rewatch < 10% = video no tiene capa rewatchable. Agregar text overlay denso o detalle visual.',
      expectedImpact: 'Subir rewatch duplica completion-equivalent',
      fypMechanicAffected: 'rewatch',
    });
  }

  if (obs.bestPerformerCompletion - obs.worstPerformerCompletion > 0.4) {
    signals.push({
      signal: 'series-momentum',
      confidence: 0.85,
      evidence: `Mejor video ${(obs.bestPerformerCompletion * 100).toFixed(0)}% vs peor ${(obs.worstPerformerCompletion * 100).toFixed(0)}%`,
      severity: 'low',
      recommendedAction: 'post-series-next',
      reasoning: 'Brecha enorme: hay un formato ganador. Convertirlo en serie semanal.',
      expectedImpact: 'Series boostan retention 30%+ por anclar audiencia',
      fypMechanicAffected: 'follow-through',
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
  fypHealthScore: number;
  recommendedNextAction?: TTSignalDetection;
  didacticInsight: string;
  topMechanicToFix?: 'completion' | 'shares' | 'comments' | 'rewatch' | 'follow-through';
}

const composeDidacticInsight = (signals: TTSignalDetection[], obs: TTObservation): string => {
  if (signals.length === 0)
    return `FYP funcionando. Completion ${(obs.metrics.avgCompletionRateLast7d * 100).toFixed(0)}%. Próximo paso: testear duet con cuenta del nicho 2-3× más grande.`;
  const crit = signals.find((s) => s.severity === 'critical');
  if (crit)
    return `🔥 Bloqueador FYP: ${crit.signal}. ${crit.reasoning} Acción: ${crit.recommendedAction}. Impacto: ${crit.expectedImpact}.`;
  return `${signals.length} fixes detectados. Empezar por: ${signals[0]!.signal} → ${signals[0]!.reasoning}`;
};

const ensureDir = async (): Promise<void> => {
  await fs.mkdir(TT_AUTOPILOT_DIR, { recursive: true });
};

export const runTTAutopilot = async (obs: TTObservation): Promise<TTAutopilotReport> => {
  await ensureDir();
  const signals = detectTTSignals(obs);
  const critCount = signals.filter((s) => s.severity === 'critical').length;
  const highCount = signals.filter((s) => s.severity === 'high').length;
  const fypHealthScore = Math.max(0, 100 - critCount * 30 - highCount * 15 - signals.length * 3);
  const mechanicCounts = new Map<string, number>();
  for (const s of signals) {
    mechanicCounts.set(s.fypMechanicAffected, (mechanicCounts.get(s.fypMechanicAffected) ?? 0) + 1);
  }
  const topMechanic = [...mechanicCounts.entries()].sort(
    (a, b) => b[1] - a[1],
  )[0]?.[0] as TTAutopilotReport['topMechanicToFix'];

  const report: TTAutopilotReport = {
    brandId: obs.brandId,
    generatedAt: new Date().toISOString(),
    observation: obs,
    signals,
    fypHealthScore,
    recommendedNextAction: signals[0],
    didacticInsight: composeDidacticInsight(signals, obs),
    topMechanicToFix: topMechanic,
  };
  const filePath = path.join(TT_AUTOPILOT_DIR, `${obs.brandId}-${Date.now()}.json`);
  await fs.writeFile(filePath, JSON.stringify(report, null, 2), 'utf-8');
  log.info('[tiktokAutopilot] report generated', {
    brandId: obs.brandId,
    signals: signals.length,
    fyp: fypHealthScore,
  });
  return report;
};

export const getLatestReport = async (brandId: string): Promise<TTAutopilotReport | null> => {
  try {
    await ensureDir();
    const files = await fs.readdir(TT_AUTOPILOT_DIR);
    const matching = files
      .filter((f) => f.startsWith(`${brandId}-`))
      .sort()
      .reverse();
    if (matching.length === 0) return null;
    return JSON.parse(await fs.readFile(path.join(TT_AUTOPILOT_DIR, matching[0]!), 'utf-8')) as TTAutopilotReport;
  } catch {
    return null;
  }
};
