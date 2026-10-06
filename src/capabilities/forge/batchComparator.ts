/**
 * Batch Comparator — Phase 3
 * Compara N intentos: detecta trends, identifica cambios con impacto
 */

export interface AttemptSnapshot {
  id: string;
  createdAt: string;
  contenidoScore: number;
  hookScore: number;
  cuentaScore: number;
  hook: string;
}

export interface ScoreTrend {
  category: 'contenido' | 'hook' | 'cuenta';
  delta: number; // Cambio vs attempt anterior
  direction: 'up' | 'down' | 'flat';
  momentum: number; // % cambio acumulado en N intentos
}

export interface ImpactfulChange {
  fromAttemptId: string;
  toAttemptId: string;
  scoreDelta: number; // Total score change
  categoryDeltas: Record<'contenido' | 'hook' | 'cuenta', number>;
  hookChanged: boolean;
  estimatedCause: string; // "Hook change", "Strategy shift", etc
}

export interface BatchComparisonResult {
  attempts: AttemptSnapshot[];
  trends: ScoreTrend[];
  impactfulChanges: ImpactfulChange[];
  bestAttempt: AttemptSnapshot;
  worstAttempt: AttemptSnapshot;
  averageScore: number;
  improvementRate: number; // % mejora por intento
}

const detectTrend = (category: 'contenido' | 'hook' | 'cuenta', attempts: AttemptSnapshot[]): ScoreTrend => {
  if (attempts.length < 2) {
    return { category, delta: 0, direction: 'flat', momentum: 0 };
  }

  const key = category === 'contenido' ? 'contenidoScore' : category === 'hook' ? 'hookScore' : 'cuentaScore';
  const latest = attempts[attempts.length - 1][key];
  const previous = attempts[attempts.length - 2][key];
  const delta = latest - previous;

  // Momentum: % cambio total desde primer hasta último
  const first = attempts[0][key];
  const momentum = first > 0 ? Math.round(((latest - first) / first) * 100) : 0;

  return {
    category,
    delta: Math.round(delta * 10) / 10,
    direction: delta > 0.5 ? 'up' : delta < -0.5 ? 'down' : 'flat',
    momentum,
  };
};

const detectImpactfulChanges = (attempts: AttemptSnapshot[]): ImpactfulChange[] => {
  const changes: ImpactfulChange[] = [];

  for (let i = 1; i < attempts.length; i++) {
    const prev = attempts[i - 1];
    const curr = attempts[i];

    const contenidoDelta = curr.contenidoScore - prev.contenidoScore;
    const hookDelta = curr.hookScore - prev.hookScore;
    const cuentaDelta = curr.cuentaScore - prev.cuentaScore;
    const totalDelta = Math.round((contenidoDelta * 0.45 + hookDelta * 0.35 + cuentaDelta * 0.2) * 10) / 10;

    // Umbral: cambio > 5 puntos es "impactful"
    if (Math.abs(totalDelta) > 5) {
      const hookChanged = prev.hook !== curr.hook;
      let estimatedCause = 'Strategy shift';

      if (hookChanged && Math.abs(hookDelta) > 3) {
        estimatedCause = 'Hook change';
      } else if (Math.abs(contenidoDelta) > Math.abs(hookDelta) && Math.abs(contenidoDelta) > 5) {
        estimatedCause = 'Content optimization';
      }

      changes.push({
        fromAttemptId: prev.id,
        toAttemptId: curr.id,
        scoreDelta: totalDelta,
        categoryDeltas: { contenido: contenidoDelta, hook: hookDelta, cuenta: cuentaDelta },
        hookChanged,
        estimatedCause,
      });
    }
  }

  return changes;
};

export const compareAttempts = (attempts: AttemptSnapshot[]): BatchComparisonResult => {
  if (attempts.length === 0) {
    return {
      attempts: [],
      trends: [],
      impactfulChanges: [],
      bestAttempt: null as unknown as AttemptSnapshot,
      worstAttempt: null as unknown as AttemptSnapshot,
      averageScore: 0,
      improvementRate: 0,
    };
  }

  // Sort by date
  const sorted = [...attempts].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  const scores = sorted.map((a) => Math.round(a.contenidoScore * 0.45 + a.hookScore * 0.35 + a.cuentaScore * 0.2));
  const averageScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);

  // Improvement rate: % change por intento
  const improvementRate =
    sorted.length > 1 ? Math.round(((scores[sorted.length - 1] - scores[0]) / scores[0]) * 100 * 10) / 10 : 0;

  const bestAttempt = sorted.reduce((best, curr) => {
    const bestScore = best.contenidoScore * 0.45 + best.hookScore * 0.35 + best.cuentaScore * 0.2;
    const currScore = curr.contenidoScore * 0.45 + curr.hookScore * 0.35 + curr.cuentaScore * 0.2;
    return currScore > bestScore ? curr : best;
  });

  const worstAttempt = sorted.reduce((worst, curr) => {
    const worstScore = worst.contenidoScore * 0.45 + worst.hookScore * 0.35 + worst.cuentaScore * 0.2;
    const currScore = curr.contenidoScore * 0.45 + curr.hookScore * 0.35 + curr.cuentaScore * 0.2;
    return currScore < worstScore ? curr : worst;
  });

  const trends = [detectTrend('contenido', sorted), detectTrend('hook', sorted), detectTrend('cuenta', sorted)];

  const impactfulChanges = detectImpactfulChanges(sorted);

  return {
    attempts: sorted,
    trends,
    impactfulChanges,
    bestAttempt,
    worstAttempt,
    averageScore,
    improvementRate,
  };
};
