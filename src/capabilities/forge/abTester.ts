/**
 * A/B Tester — Phase 6
 * Simula rendimiento de dos versiones de contenido
 */

export interface ContentVariant {
  id: string;
  label: string; // "Version A", "Version B"
  hook: string;
  contenidoScore?: number;
  hookScore?: number;
  cuentaScore?: number;
}

export interface ABTestResult {
  variantA: {
    label: string;
    scores: { contenido: number; hook: number; cuenta: number };
    overallScore: number;
  };
  variantB: {
    label: string;
    scores: { contenido: number; hook: number; cuenta: number };
    overallScore: number;
  };
  winner: 'A' | 'B';
  scoreDelta: number; // Ganador - perdedor
  percentLift: number; // % mejora
  confidence: number; // 0-100
  recommendations: {
    forWinner: string;
    forLoser: string[];
  };
}

const scoreHook = (hook: string): number => {
  // Simulación simple: medir específicos, urgencia, curiosidad
  let score = 50;

  // Bonus por números específicos
  if (/\d+/.test(hook)) score += 15;

  // Bonus por palabras de urgencia
  if (/rápido|hoy|ahora|inmediato|antes/.test(hook)) score += 8;

  // Bonus por preguntas (open loop)
  if (/\?/.test(hook)) score += 10;

  // Penalización por vaguedad
  if (/muchos|varios|algunos|cualquier/.test(hook)) score -= 10;

  // Bonus por poder
  if (/secreto|reveló|nunca|jamás|único/.test(hook)) score += 12;

  return Math.min(100, Math.max(20, score));
};

const scoreContent = (hook: string): number => {
  // Basado en hook, inferir contenido
  let score = 55;

  if (hook.length > 40) score += 5; // Enough context
  if (hook.length < 15) score -= 10; // Too vague

  // Si tiene números, probablemente tiene estructura
  if (/\d+/.test(hook)) score += 8;

  return Math.min(100, Math.max(30, score));
};

export const runABTest = (
  variantA: ContentVariant,
  variantB: ContentVariant,
  baselineAccountScore: number = 65,
): ABTestResult => {
  // Score variant A
  const hookScoreA = scoreHook(variantA.hook);
  const contentScoreA = scoreContent(variantA.hook);
  const overallA = Math.round(contentScoreA * 0.45 + hookScoreA * 0.35 + baselineAccountScore * 0.2);

  // Score variant B
  const hookScoreB = scoreHook(variantB.hook);
  const contentScoreB = scoreContent(variantB.hook);
  const overallB = Math.round(contentScoreB * 0.45 + hookScoreB * 0.35 + baselineAccountScore * 0.2);

  // Determine winner
  const winner: 'A' | 'B' = overallA > overallB ? 'A' : 'B';
  const scoreDelta = Math.abs(overallA - overallB);
  const percentLift = overallA > 0 ? Math.round((scoreDelta / overallA) * 100) : 0;
  const confidence = Math.min(95, 70 + Math.abs(hookScoreA - hookScoreB) / 2);

  // Recommendations
  const loserHook = winner === 'A' ? variantB.hook : variantA.hook;
  const winnerHook = winner === 'A' ? variantA.hook : variantB.hook;

  const recommendations = {
    forWinner: `Hook ganador funciona por: ${
      /\d+/.test(winnerHook)
        ? 'especificidad'
        : /\?/.test(winnerHook)
          ? 'curiosidad'
          : /rápido|ahora/.test(winnerHook)
            ? 'urgencia'
            : 'claridad'
    }. Mantén este patrón.`,
    forLoser: [
      loserHook.length < 20 ? 'Expande hook con más contexto (20-40 caracteres)' : '',
      !/\d+/.test(loserHook) ? 'Agrega número específico (3 pasos, 5 minutos, etc)' : '',
      !/\?/.test(loserHook) && !/\d+/.test(loserHook) ? 'Crea open loop: pregunta o dato sorprendente' : '',
      /muchos|varios|algunos/.test(loserHook) ? 'Reemplaza vaguedad con número específico' : '',
    ].filter((r) => r.length > 0),
  };

  return {
    variantA: {
      label: variantA.label,
      scores: { contenido: contentScoreA, hook: hookScoreA, cuenta: baselineAccountScore },
      overallScore: overallA,
    },
    variantB: {
      label: variantB.label,
      scores: { contenido: contentScoreB, hook: hookScoreB, cuenta: baselineAccountScore },
      overallScore: overallB,
    },
    winner,
    scoreDelta,
    percentLift,
    confidence,
    recommendations,
  };
};
