/**
 * Predictor Breakdown — Phase 2
 * Analiza scores con granularidad: factores específicos + recomendaciones per categoría
 */

export interface ScoreBreakdown {
  category: 'contenido' | 'hook' | 'cuenta';
  score: number; // 0-100
  factors: {
    name: string;
    weight: number; // % dentro de categoría
    value: number; // 0-100
    status: 'strong' | 'weak' | 'neutral';
  }[];
  summary: string; // Resumen 1-liner
}

export interface PredictorAnalysis {
  contentBreakdown: ScoreBreakdown;
  hookBreakdown: ScoreBreakdown;
  accountBreakdown: ScoreBreakdown;
  overallScore: number;
  bottleneck: 'contenido' | 'hook' | 'cuenta'; // Categoría más débil
  recommendations: Recommendation[];
}

export interface Recommendation {
  priority: 'high' | 'medium' | 'low';
  category: 'contenido' | 'hook' | 'cuenta';
  action: string; // Acción específica (ej: "Aumentar densidad emocional")
  impact: number; // Est. % de mejora en score
  difficulty: 'easy' | 'medium' | 'hard'; // Esfuerzo para implementar
}

const getStatus = (val: number): 'strong' | 'weak' => (val > 70 ? 'strong' : 'weak');

// Content Score Breakdown: estructura, densidad emocional, call-to-action clarity
const analyzeContentScore = (score: number): ScoreBreakdown => {
  const structValue = score > 75 ? 85 : score > 50 ? 60 : 35;
  const emotionValue = score > 60 ? 75 : 45;
  const ctaValue = score > 70 ? 80 : 50;

  const factors: ScoreBreakdown['factors'] = [
    {
      name: 'Estructura narrativa',
      weight: 0.35,
      value: structValue,
      status: getStatus(structValue),
    },
    {
      name: 'Densidad emocional',
      weight: 0.35,
      value: emotionValue,
      status: getStatus(emotionValue),
    },
    {
      name: 'CTA clarity',
      weight: 0.3,
      value: ctaValue,
      status: getStatus(ctaValue),
    },
  ];

  return {
    category: 'contenido',
    score,
    factors,
    summary:
      score > 70
        ? 'Contenido sólido: narrativa clara + emocionalidad fuerte'
        : score > 50
          ? 'Contenido estable pero sin diferenciador claro'
          : 'Contenido débil: falta estructura y/o emocionalidad',
  };
};

// Hook Score Breakdown: originalidad, urgencia, curiosidad
const analyzeHookScore = (score: number): ScoreBreakdown => {
  const origValue = score > 75 ? 85 : score > 50 ? 60 : 30;
  const urgValue = score > 70 ? 80 : 40;
  const curiosValue = score > 65 ? 75 : 50;

  const factors: ScoreBreakdown['factors'] = [
    {
      name: 'Originalidad',
      weight: 0.35,
      value: origValue,
      status: getStatus(origValue),
    },
    {
      name: 'Urgencia percibida',
      weight: 0.33,
      value: urgValue,
      status: getStatus(urgValue),
    },
    {
      name: 'Curiosidad activada',
      weight: 0.32,
      value: curiosValue,
      status: getStatus(curiosValue),
    },
  ];

  return {
    category: 'hook',
    score,
    factors,
    summary:
      score > 75
        ? 'Hook potente: atrae + genera urgencia'
        : score > 50
          ? 'Hook decente pero sin elemento sorpresa'
          : 'Hook débil: falta originalidad o urgencia',
  };
};

// Account Score Breakdown: engagement histórico, posting frequency, audience fit
const analyzeAccountScore = (score: number): ScoreBreakdown => {
  const engValue = score > 70 ? 80 : score > 50 ? 55 : 35;
  const consistValue = score > 65 ? 75 : 45;
  const alignValue = score > 60 ? 70 : 50;

  const factors: ScoreBreakdown['factors'] = [
    {
      name: 'Engagement histórico',
      weight: 0.4,
      value: engValue,
      status: getStatus(engValue),
    },
    {
      name: 'Posting consistency',
      weight: 0.35,
      value: consistValue,
      status: getStatus(consistValue),
    },
    {
      name: 'Audience alignment',
      weight: 0.25,
      value: alignValue,
      status: getStatus(alignValue),
    },
  ];

  return {
    category: 'cuenta',
    score,
    factors,
    summary:
      score > 70
        ? 'Cuenta saludable: engagement + consistency'
        : score > 50
          ? 'Cuenta con potencial pero sin clear pattern'
          : 'Cuenta débil: engagement bajo o inconsistente',
  };
};

// Recomendaciones basadas en bottleneck
const generateRecommendations = (contentScore: number, hookScore: number, accountScore: number): Recommendation[] => {
  const recs: Recommendation[] = [];

  // Content-focused recs
  if (contentScore < 60) {
    recs.push({
      priority: 'high',
      category: 'contenido',
      action: 'Reforzar narrativa: establece problema → solución → resultado',
      impact: 12,
      difficulty: 'medium',
    });
  }
  if (contentScore < 70) {
    recs.push({
      priority: 'high',
      category: 'contenido',
      action: 'Aumentar densidad emocional: 1 insight vulnerable + 1 transformación',
      impact: 10,
      difficulty: 'easy',
    });
  }

  // Hook-focused recs
  if (hookScore < 65) {
    recs.push({
      priority: 'high',
      category: 'hook',
      action: 'Datos específicos > vagos: "3 pasos" > "proceso simple"',
      impact: 15,
      difficulty: 'easy',
    });
  }
  if (hookScore < 75) {
    recs.push({
      priority: 'medium',
      category: 'hook',
      action: 'Agregar elemento sorpresa: dato inesperado o perspectiva contraintuitiva',
      impact: 8,
      difficulty: 'medium',
    });
  }

  // Account-focused recs
  if (accountScore < 60) {
    recs.push({
      priority: 'high',
      category: 'cuenta',
      action: 'Aumentar posting frequency: 3→5x/semana para detectar patrón',
      impact: 14,
      difficulty: 'medium',
    });
  }
  if (accountScore < 70) {
    recs.push({
      priority: 'medium',
      category: 'cuenta',
      action: 'Audit audience: 80% posts resonar con target o pivotear niche',
      impact: 10,
      difficulty: 'hard',
    });
  }

  return recs.sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });
};

export const analyzeScores = (contentScore: number, hookScore: number, accountScore: number): PredictorAnalysis => {
  const contentBreakdown = analyzeContentScore(contentScore);
  const hookBreakdown = analyzeHookScore(hookScore);
  const accountBreakdown = analyzeAccountScore(accountScore);

  const overallScore = Math.round(contentScore * 0.45 + hookScore * 0.35 + accountScore * 0.2);

  // Bottleneck = score más bajo (es donde invertir primero)
  let bottleneck: 'contenido' | 'hook' | 'cuenta' = 'contenido';
  const scores = { contenido: contentScore, hook: hookScore, cuenta: accountScore };
  bottleneck = (Object.keys(scores) as ('contenido' | 'hook' | 'cuenta')[]).reduce((a, b) =>
    scores[a] < scores[b] ? a : b,
  );

  const recommendations = generateRecommendations(contentScore, hookScore, accountScore);

  return {
    contentBreakdown,
    hookBreakdown,
    accountBreakdown,
    overallScore,
    bottleneck,
    recommendations,
  };
};
