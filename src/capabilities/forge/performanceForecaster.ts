/**
 * Performance Forecaster — Phase 5
 * Simula impacto de aplicar sugerencias en scores
 */

export interface ForecastScenario {
  name: string; // "Apply hook suggestion", "Full optimization", etc
  appliedSuggestions: string[]; // IDs de sugerencias aplicadas
  projectedScores: {
    contenido: number;
    hook: number;
    cuenta: number;
  };
  overallDelta: number; // Cambio total en score
  timeframe: string; // "1 week", "2-4 weeks", etc
  confidence: number; // 0-100 (% confianza en forecast)
}

export interface PerformanceForecast {
  baseline: {
    contenido: number;
    hook: number;
    cuenta: number;
    overall: number;
  };
  scenarios: ForecastScenario[];
  bestCase: ForecastScenario;
  mostLikely: ForecastScenario;
}

const estimateImpact = (
  suggestion: string,
  currentScores: { contenido: number; hook: number; cuenta: number },
): { contenido: number; hook: number; cuenta: number } => {
  // Simulación de impacto basada en tipo de sugerencia
  const delta = { contenido: 0, hook: 0, cuenta: 0 };

  // Content suggestions
  if (suggestion.includes('estructura') || suggestion.includes('3 actos')) {
    delta.contenido = Math.min(12, 100 - currentScores.contenido);
  }
  if (suggestion.includes('emocional') || suggestion.includes('vulnerabilidad')) {
    delta.contenido = Math.min(10, 100 - currentScores.contenido);
  }

  // Hook suggestions
  if (suggestion.includes('números') || suggestion.includes('concretos')) {
    delta.hook = Math.min(15, 100 - currentScores.hook);
  }
  if (suggestion.includes('sorpresa') || suggestion.includes('contraintuitivo')) {
    delta.hook = Math.min(8, 100 - currentScores.hook);
  }
  if (suggestion.includes('open loop')) {
    delta.hook = Math.min(9, 100 - currentScores.hook);
  }

  // Account suggestions
  if (suggestion.includes('frecuencia') || suggestion.includes('5x')) {
    delta.cuenta = Math.min(14, 100 - currentScores.cuenta);
  }
  if (suggestion.includes('resonancia') || suggestion.includes('80%')) {
    delta.cuenta = Math.min(10, 100 - currentScores.cuenta);
  }
  if (suggestion.includes('comentarios') || suggestion.includes('engagement')) {
    delta.cuenta = Math.min(8, 100 - currentScores.cuenta);
  }

  return delta;
};

export const forecastScores = (
  baselineScores: { contenido: number; hook: number; cuenta: number },
  suggestionsToApply: string[],
): PerformanceForecast => {
  const baseline = {
    contenido: baselineScores.contenido,
    hook: baselineScores.hook,
    cuenta: baselineScores.cuenta,
    overall: Math.round(baselineScores.contenido * 0.45 + baselineScores.hook * 0.35 + baselineScores.cuenta * 0.2),
  };

  const scenarios: ForecastScenario[] = [];

  // Scenario 1: Hook-only optimization
  const hookDelta = estimateImpact('números concretos', baselineScores);
  const hookOptimized = {
    contenido: baselineScores.contenido,
    hook: Math.min(100, baselineScores.hook + hookDelta.hook),
    cuenta: baselineScores.cuenta,
  };
  scenarios.push({
    name: 'Optimizar Hook',
    appliedSuggestions: ['hook-numbers', 'hook-surprise'],
    projectedScores: hookOptimized,
    overallDelta: Math.round((hookOptimized.hook - baselineScores.hook) * 0.35),
    timeframe: '1 semana',
    confidence: 85,
  });

  // Scenario 2: Content-only optimization
  const contentDelta = estimateImpact('estructura 3 actos', baselineScores);
  const contentOptimized = {
    contenido: Math.min(100, baselineScores.contenido + contentDelta.contenido),
    hook: baselineScores.hook,
    cuenta: baselineScores.cuenta,
  };
  scenarios.push({
    name: 'Optimizar Contenido',
    appliedSuggestions: ['content-structure', 'content-emotion'],
    projectedScores: contentOptimized,
    overallDelta: Math.round((contentOptimized.contenido - baselineScores.contenido) * 0.45),
    timeframe: '2 semanas',
    confidence: 80,
  });

  // Scenario 3: Account-only optimization
  const accountDelta = estimateImpact('frecuencia 5x', baselineScores);
  const accountOptimized = {
    contenido: baselineScores.contenido,
    hook: baselineScores.hook,
    cuenta: Math.min(100, baselineScores.cuenta + accountDelta.cuenta),
  };
  scenarios.push({
    name: 'Optimizar Cuenta',
    appliedSuggestions: ['account-frequency', 'account-resonance'],
    projectedScores: accountOptimized,
    overallDelta: Math.round((accountOptimized.cuenta - baselineScores.cuenta) * 0.2),
    timeframe: '3-4 semanas',
    confidence: 75,
  });

  // Scenario 4: Full optimization (all 3)
  const fullOptimized = {
    contenido: Math.min(100, baselineScores.contenido + contentDelta.contenido),
    hook: Math.min(100, baselineScores.hook + hookDelta.hook),
    cuenta: Math.min(100, baselineScores.cuenta + accountDelta.cuenta),
  };
  const fullDelta = Math.round(
    (fullOptimized.contenido - baselineScores.contenido) * 0.45 +
      (fullOptimized.hook - baselineScores.hook) * 0.35 +
      (fullOptimized.cuenta - baselineScores.cuenta) * 0.2,
  );
  scenarios.push({
    name: 'Optimización Completa',
    appliedSuggestions: ['hook-numbers', 'content-structure', 'account-frequency'],
    projectedScores: fullOptimized,
    overallDelta: fullDelta,
    timeframe: '4-6 semanas',
    confidence: 70,
  });

  // Scenario 5: Most likely (hook + content only, faster)
  const likelyScores = {
    contenido: Math.min(100, baselineScores.contenido + Math.round(contentDelta.contenido * 0.7)),
    hook: Math.min(100, baselineScores.hook + Math.round(hookDelta.hook * 0.8)),
    cuenta: baselineScores.cuenta,
  };
  const likelyDelta = Math.round(
    (likelyScores.contenido - baselineScores.contenido) * 0.45 + (likelyScores.hook - baselineScores.hook) * 0.35,
  );

  // Sort scenarios by delta
  scenarios.sort((a, b) => b.overallDelta - a.overallDelta);

  return {
    baseline,
    scenarios,
    bestCase: scenarios[0],
    mostLikely: {
      name: 'Escenario Probable',
      appliedSuggestions: ['hook-numbers', 'content-structure'],
      projectedScores: likelyScores,
      overallDelta: likelyDelta,
      timeframe: '2-3 semanas',
      confidence: 80,
    },
  };
};
