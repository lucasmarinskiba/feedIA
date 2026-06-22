import type { NicheCategory } from './nicheAnalyzer.js';
import { hookEnforcer } from './hookEnforcer.js';
import { contentAlgorithmAgent } from './contentAlgorithmAgent.js';

export interface RetentionDataPoint {
  second: number;
  viewerPercent: number;
}

export type DropoffCause =
  | 'weak-hook'
  | 'thumbnail-mismatch'
  | 'pacing-issue'
  | 'pattern-stagnation'
  | 'no-pattern-interrupt'
  | 'cta-too-early'
  | 'too-long'
  | 'low-audio-quality';

export type RecoveryAction =
  | 'replace-hook'
  | 'fix-thumbnail'
  | 'add-pattern-interrupt'
  | 'shorten-video'
  | 'reposition-cta'
  | 'add-subtitles'
  | 'improve-audio'
  | 'add-broll';

export type RetentionScore = 'excellent' | 'good' | 'average' | 'poor' | 'critical';

export interface RetentionDropoff {
  second: number;
  viewerPercentBefore: number;
  viewerPercentAfter: number;
  dropPercent: number;
  severity: 'minor' | 'moderate' | 'critical';
  cause: DropoffCause;
}

export interface FailingKPI {
  kpi: string;
  currentValue: number;
  targetValue: number;
  gap: number;
  impact: 'reach' | 'engagement' | 'conversion' | 'algorithm-boost';
}

export interface RecoveryPlan {
  primaryAction: RecoveryAction;
  newHookSuggestions: string[];
  newThumbnailNote: string;
  editInstructions: string[];
  expectedRetentionLift: string;
  urgency: 'critical' | 'high' | 'medium';
  estimatedImplementationHours: number;
}

export interface RetentionDiagnosis {
  primaryDropoff: RetentionDropoff | null;
  hook3SecRetention: number;
  midpointRetention: number;
  completionRate: number;
  avgWatchTime: number;
  overallScore: RetentionScore;
  failingKPIs: FailingKPI[];
  recovery: RecoveryPlan | null;
}

const PLATFORM_BENCHMARKS = {
  instagram: { hook3SecRetention: 75, midpointRetention: 50, completionRate: 35, avgWatchTime: 15 },
  tiktok: { hook3SecRetention: 80, midpointRetention: 55, completionRate: 45, avgWatchTime: 20 },
} as const;

const RECOVERY_INSTRUCTIONS: Record<DropoffCause, string[]> = {
  'weak-hook': [
    'Regrabar primeros 3 segundos con hook más agresivo',
    'Primera frase debe tener tensión inmediata — sin intro ni "hola"',
    'Añadir texto overlay en 0-3s con la promesa principal',
  ],
  'thumbnail-mismatch': [
    'Cambiar thumbnail a frame más representativo del contenido real',
    'Thumbnail debe mostrar el resultado/transformación, no el proceso',
    'A/B test: 2-3 thumbnails distintos en próximas 48h',
  ],
  'pacing-issue': [
    'Silence-cut: eliminar pausas >0.3s',
    'Añadir B-roll cada 2-3s para romper monotonía visual',
    'Subtítulos animados word-by-word para anclar la vista',
  ],
  'no-pattern-interrupt': [
    'Insertar zoom-punch en el segundo crítico de caída',
    'Añadir texto superpuesto sorpresa o estadística',
    'Usar corte de ritmo musical en ese punto',
  ],
  'cta-too-early': [
    'Mover CTA al 80-90% del video',
    'Añadir "pero primero..." antes del CTA para retener',
    'Tease del próximo punto antes de la llamada a acción',
  ],
  'too-long': [
    'Recortar los últimos 20% del video',
    'CTA debe ser el punto final — sin contexto extra',
    'Loop final: último frame conecta con el primero visualmente',
  ],
  'low-audio-quality': [
    'Remezclar audio: +6dB en frecuencias de voz (1-3kHz)',
    'Añadir música de fondo al -85% volumen para tapar ruido',
    'Regrabar con micrófono de solapa o en booth acústico',
  ],
  'pattern-stagnation': [
    'Añadir B-roll en segundos críticos de la caída',
    'Insertar quote visual o estadística en ese punto',
    'Reordenar puntos del script para mayor variedad de ritmo',
  ],
};

const detectCause = (dropSecond: number, dropPercent: number, videoDuration: number): DropoffCause => {
  if (dropSecond <= 2) return 'weak-hook';
  if (dropSecond <= 3) return 'thumbnail-mismatch';
  if (dropPercent > 20 && dropSecond > 3 && dropSecond < 10) return 'pacing-issue';
  if (dropSecond > videoDuration * 0.8) return 'too-long';
  if (Math.abs(dropSecond - videoDuration * 0.5) < 2) return 'cta-too-early';
  return 'no-pattern-interrupt';
};

const scoreLabel = (completionRate: number, hook3s: number): RetentionScore => {
  if (completionRate >= 50 && hook3s >= 80) return 'excellent';
  if (completionRate >= 35 && hook3s >= 70) return 'good';
  if (completionRate >= 20 && hook3s >= 60) return 'average';
  if (completionRate >= 10 && hook3s >= 45) return 'poor';
  return 'critical';
};

class RetentionAnalyzer {
  analyzeRetentionCurve = (
    _videoId: string,
    platform: 'instagram' | 'tiktok',
    niche: NicheCategory,
    dataPoints: RetentionDataPoint[],
    videoDurationSeconds: number,
    originalHook?: string,
  ): RetentionDiagnosis => {
    if (dataPoints.length < 3) return this.insufficientData(platform);

    const sorted = [...dataPoints].sort((a, b) => a.second - b.second);
    const benchmarks = PLATFORM_BENCHMARKS[platform];

    const at3s = sorted.find((p) => p.second >= 3)?.viewerPercent ?? sorted[0]?.viewerPercent ?? 100;
    const atMid = sorted.find((p) => p.second >= Math.round(videoDurationSeconds / 2))?.viewerPercent ?? 50;
    const atEnd = sorted[sorted.length - 1]?.viewerPercent ?? 0;
    const avgWatchTime =
      (sorted.reduce((sum, p) => sum + p.viewerPercent / 100, 0) / sorted.length) * videoDurationSeconds;

    const dropoffs: RetentionDropoff[] = [];
    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1]!;
      const curr = sorted[i]!;
      const drop = prev.viewerPercent - curr.viewerPercent;
      if (drop >= 5) {
        dropoffs.push({
          second: curr.second,
          viewerPercentBefore: prev.viewerPercent,
          viewerPercentAfter: curr.viewerPercent,
          dropPercent: drop,
          severity: drop >= 20 ? 'critical' : drop >= 10 ? 'moderate' : 'minor',
          cause: detectCause(curr.second, drop, videoDurationSeconds),
        });
      }
    }

    const primaryDropoff = dropoffs.sort((a, b) => b.dropPercent - a.dropPercent)[0] ?? null;

    const failingKPIs: FailingKPI[] = [];
    if (at3s < benchmarks.hook3SecRetention) {
      failingKPIs.push({
        kpi: 'Retención hook 3s',
        currentValue: at3s,
        targetValue: benchmarks.hook3SecRetention,
        gap: benchmarks.hook3SecRetention - at3s,
        impact: 'algorithm-boost',
      });
    }
    if (atMid < benchmarks.midpointRetention) {
      failingKPIs.push({
        kpi: 'Retención punto medio',
        currentValue: atMid,
        targetValue: benchmarks.midpointRetention,
        gap: benchmarks.midpointRetention - atMid,
        impact: 'reach',
      });
    }
    if (atEnd < benchmarks.completionRate) {
      failingKPIs.push({
        kpi: 'Tasa de completado',
        currentValue: atEnd,
        targetValue: benchmarks.completionRate,
        gap: benchmarks.completionRate - atEnd,
        impact: 'engagement',
      });
    }

    const overallScore = scoreLabel(atEnd, at3s);
    const recovery =
      overallScore !== 'excellent' ? this.buildRecovery(primaryDropoff, niche, platform, originalHook) : null;

    return {
      primaryDropoff,
      hook3SecRetention: at3s,
      midpointRetention: atMid,
      completionRate: atEnd,
      avgWatchTime,
      overallScore,
      failingKPIs,
      recovery,
    };
  };

  buildRecovery = (
    primaryDropoff: RetentionDropoff | null,
    niche: NicheCategory,
    platform: 'instagram' | 'tiktok',
    originalHook?: string,
  ): RecoveryPlan => {
    const cause: DropoffCause = primaryDropoff?.cause ?? 'weak-hook';
    const algProfile = contentAlgorithmAgent.getAlgorithmProfile(platform, niche);

    const actionMap: Record<DropoffCause, RecoveryAction> = {
      'weak-hook': 'replace-hook',
      'thumbnail-mismatch': 'fix-thumbnail',
      'pacing-issue': 'add-broll',
      'no-pattern-interrupt': 'add-pattern-interrupt',
      'cta-too-early': 'reposition-cta',
      'too-long': 'shorten-video',
      'low-audio-quality': 'improve-audio',
      'pattern-stagnation': 'add-broll',
    };

    const liftMap: Record<DropoffCause, string> = {
      'weak-hook': '+25-40%',
      'thumbnail-mismatch': '+15-25%',
      'pacing-issue': '+10-20%',
      'no-pattern-interrupt': '+8-15%',
      'cta-too-early': '+5-12%',
      'too-long': '+8-18%',
      'low-audio-quality': '+10-20%',
      'pattern-stagnation': '+8-15%',
    };

    const urgencyMap: Record<DropoffCause, RecoveryPlan['urgency']> = {
      'weak-hook': 'critical',
      'thumbnail-mismatch': 'critical',
      'pacing-issue': 'high',
      'no-pattern-interrupt': 'high',
      'cta-too-early': 'medium',
      'too-long': 'medium',
      'low-audio-quality': 'high',
      'pattern-stagnation': 'medium',
    };

    const hoursMap: Record<RecoveryAction, number> = {
      'replace-hook': 2,
      'fix-thumbnail': 0.5,
      'add-broll': 1.5,
      'add-pattern-interrupt': 1,
      'reposition-cta': 1,
      'shorten-video': 0.5,
      'improve-audio': 2,
      'add-subtitles': 1,
    };

    const primaryAction = actionMap[cause];
    const hookSuggestions = originalHook
      ? hookEnforcer.scoreHook(originalHook).alternativeHooks
      : [
          `${algProfile.hookRequirements.exampleFormulas[0] ?? 'El error #1 que destruye tu'} ${niche.replace('-', ' ')}`,
          `Por qué el 90% de creadores de ${niche.replace('-', ' ')} nunca superan los 10K`,
          `Esto que haces en ${niche.replace('-', ' ')} te está costando seguidores (y no lo sabes)`,
        ];

    return {
      primaryAction,
      newHookSuggestions: hookSuggestions.slice(0, 3),
      newThumbnailNote:
        cause === 'thumbnail-mismatch' || cause === 'weak-hook'
          ? 'Usar frame del resultado final, alta saturación, cara visible si es personal brand.'
          : 'Mantener thumbnail actual — no es el problema principal.',
      editInstructions: RECOVERY_INSTRUCTIONS[cause],
      expectedRetentionLift: liftMap[cause],
      urgency: urgencyMap[cause],
      estimatedImplementationHours: hoursMap[primaryAction],
    };
  };

  predictRetentionBeforePosting = (
    hookScore: number,
    scriptLengthSeconds: number,
    hasSubtitles: boolean,
    patternInterruptCount: number,
    platform: 'instagram' | 'tiktok',
  ): { predicted3sRetention: number; predictedCompletionRate: number; passesGate: boolean } => {
    const base3s = platform === 'tiktok' ? 60 : 55;
    const baseCompletion = platform === 'tiktok' ? 30 : 25;
    const benchmarks = PLATFORM_BENCHMARKS[platform];

    const retention3s = Math.min(95, Math.round(base3s + hookScore * 3 + (hasSubtitles ? 10 : 0)));
    const completionRate = Math.min(
      85,
      Math.round(
        baseCompletion +
          (hookScore >= 7 ? 15 : 5) +
          (hasSubtitles ? 8 : 0) +
          (patternInterruptCount >= 2 ? 10 : patternInterruptCount * 4) +
          (scriptLengthSeconds <= 30 ? 10 : scriptLengthSeconds <= 60 ? 5 : -5),
      ),
    );

    return {
      predicted3sRetention: retention3s,
      predictedCompletionRate: completionRate,
      passesGate:
        retention3s >= benchmarks.hook3SecRetention * 0.85 && completionRate >= benchmarks.completionRate * 0.8,
    };
  };

  private insufficientData = (platform: 'instagram' | 'tiktok'): RetentionDiagnosis => ({
    primaryDropoff: null,
    hook3SecRetention: 0,
    midpointRetention: 0,
    completionRate: 0,
    avgWatchTime: 0,
    overallScore: 'poor',
    failingKPIs: [
      {
        kpi: 'Datos insuficientes',
        currentValue: 0,
        targetValue: PLATFORM_BENCHMARKS[platform].hook3SecRetention,
        gap: PLATFORM_BENCHMARKS[platform].hook3SecRetention,
        impact: 'algorithm-boost',
      },
    ],
    recovery: null,
  });
}

export const retentionAnalyzer = new RetentionAnalyzer();
