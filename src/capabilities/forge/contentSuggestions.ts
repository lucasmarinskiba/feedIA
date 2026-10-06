/**
 * Content Suggestions — Phase 4
 * Genera sugerencias específicas + ejemplos para cada recomendación
 */

export interface DetailedSuggestion {
  category: 'contenido' | 'hook' | 'cuenta';
  title: string; // Título corto
  description: string; // Explicación
  examples: string[]; // 2-3 ejemplos concretos
  implementationSteps: string[]; // Pasos 1-3 para aplicar
  expectedOutcome: string; // Qué esperar después
  difficulty: 'easy' | 'medium' | 'hard';
  estimatedImpact: number; // % de mejora esperada
}

const contentSuggestions: DetailedSuggestion[] = [
  {
    category: 'contenido',
    title: 'Estructura de 3 actos',
    description: 'Organiza el contenido en: Problema → Insight → Solución. Genera tensión → alivio.',
    examples: [
      'Act 1: "Everyone struggles with X" (relatable problem)',
      'Act 2: "But the real issue is Y" (reframed insight)',
      'Act 3: "Here\'s how to fix it: Z" (actionable solution)',
    ],
    implementationSteps: [
      'Identifica el problema de tu audiencia',
      'Proporciona insight único que lo reenfoque',
      'Ofrece solución paso-a-paso o mentalidad',
    ],
    expectedOutcome: 'Posts más memorables + mayor retenção de viewers',
    difficulty: 'medium',
    estimatedImpact: 12,
  },
  {
    category: 'contenido',
    title: 'Densidad emocional: vulnerabilidad + transformación',
    description: 'Muestra cómo ERAS vs ERES ahora. Audibilidad crea conexión.',
    examples: [
      'Before: "I was broke, depressed, alone" | After: "Now I..., I have..., I\'m..."',
      'Include 1 vulnerable moment + 1 win para balance',
      'Show intermediate struggle, not just endpoints',
    ],
    implementationSteps: [
      'Elige 1 aspecto donde transformaste (dinero, salud, mindset)',
      'Describe estado "before" sin glamour',
      'Narrate transformation moment explicitly',
      'Show "after" proof (no exaggeration)',
    ],
    expectedOutcome: 'Conexión emocional → saves + shares increase',
    difficulty: 'medium',
    estimatedImpact: 10,
  },
  {
    category: 'hook',
    title: 'Números concretos > vagos',
    description: 'Reemplaza "many", "lots", "quickly" con números específicos.',
    examples: [
      '"3 pasos" no "simple process" | "7 min video" no "quick tips"',
      '"$5K first month" no "lucrative" | "23% conversion" no "high rate"',
      'Even approximates: "roughly 300 emails/week" stronger than "lots"',
    ],
    implementationSteps: [
      'Audit your hooks for vague words',
      'Add numbers: time, money, percentage, count',
      'Use specific instead of general',
    ],
    expectedOutcome: 'Hooks score +15%, CTR increase, fewer skip-outs',
    difficulty: 'easy',
    estimatedImpact: 15,
  },
  {
    category: 'hook',
    title: 'Elemento sorpresa: contraintuitivo o inesperado',
    description: 'Agrega dato que contradice creencia común o expectativa.',
    examples: [
      'Belief: "You need 10K followers" | Surprise: "I got 1M engagement with 500 followers"',
      'Expected: "Marketing costs money" | Surprise: "Built 6-fig business on $0 ad spend"',
      'Common: "Takes years" | Surprising: "Did in 6 weeks because..."',
    ],
    implementationSteps: [
      'Identify common belief in your space',
      'Find your counterexample (must be true)',
      'Lead with surprise, then explain why',
    ],
    expectedOutcome: 'Hook stands out, higher save rate',
    difficulty: 'medium',
    estimatedImpact: 8,
  },
  {
    category: 'cuenta',
    title: 'Posting frequency: 3→5x/week',
    description: 'Algoritmo requiere consistencia. Aumentar frecuencia revela patrón.',
    examples: [
      'Monday + Wed + Fri + Sat + (bonus Tuesday) = 5/week pattern',
      'Cada post "compite" internamente, necesita volumen para detectar ganadores',
      'Después de 20 posts con patrón, algo resonará → escálalo',
    ],
    implementationSteps: [
      'Audita capacidad: ¿puedes producir 5 posts quality/week?',
      'Batch content 2 weeks ahead',
      'Scheduler: planifica 5 en lunes de cada semana',
      'Track qué posted en qué día → día ideal emergerá',
    ],
    expectedOutcome: 'Algoritmo registers pattern, 3-4 semanas visibility increase',
    difficulty: 'medium',
    estimatedImpact: 14,
  },
  {
    category: 'cuenta',
    title: '80% resonance audit: cliente perfecto match',
    description: 'Si <80% audience resonates, pivota contenido hacia el que sí.',
    examples: [
      'If 80% are moms pero 20% are entrepreneurs: focus moms',
      'If tech audience ignores lifestyle: choose one lane',
      'Audience clarity > trying to serve everyone',
    ],
    implementationSteps: [
      'Review last 20 posts: who engaged most? (save, share, comment)',
      'Characterize them: age, challenge, goal, language',
      'Next 10 posts: tailor ONLY to that segment',
      'Measure engagement lift',
    ],
    expectedOutcome: 'Audience feels "this is for me", organic growth 2-3x',
    difficulty: 'hard',
    estimatedImpact: 10,
  },
];

const hookSuggestions: DetailedSuggestion[] = [
  {
    category: 'hook',
    title: 'Open loop: pregunta sin respuesta en hook',
    description: 'Hook formula: "X did Y, resultado fue Z" pero omite Z en hook.',
    examples: [
      'Hook: "I did something that changed everything" (motive to watch for Z)',
      'Hook: "This one thing separated the 1% from 99%" (curiosity gap)',
      'Hook: "3 things nobody tells you about..." (specific scarcity)',
    ],
    implementationSteps: [
      'State problem or achievement vaguely in hook',
      'Reveal solution ONLY in content (body)',
      "Promise value but don't deliver immediately",
    ],
    expectedOutcome: 'Higher average view duration, lower early swipe-aways',
    difficulty: 'medium',
    estimatedImpact: 9,
  },
];

const accountSuggestions: DetailedSuggestion[] = [
  {
    category: 'cuenta',
    title: 'Engagement bait: responde comments en primeras 30 min',
    description: 'Algoritmo prioriza posts con comentarios tempranos. Responder = impulsa',
    examples: [
      'Post a question: "What\'s your #1 challenge?" → responde cada comment en 30 min',
      'Reply algo que provoca más replies: "Your answer is good, but did you consider X?"',
      'Cada reply = algorithm signal = más reach',
    ],
    implementationSteps: [
      'Enable notifications para nuevo post',
      'Responde comentarios 1-1 en primeros 30min',
      'Usa respuesta que invite más conversación',
      'Pin pregunta importante para más visibility',
    ],
    expectedOutcome: 'Inicial boost in engagement, snowball effect if content resonates',
    difficulty: 'easy',
    estimatedImpact: 8,
  },
];

export const getSuggestions = (category: 'contenido' | 'hook' | 'cuenta' | 'all'): DetailedSuggestion[] => {
  const allSuggestions = [...contentSuggestions, ...hookSuggestions, ...accountSuggestions];

  if (category === 'all') return allSuggestions;
  return allSuggestions.filter((s) => s.category === category);
};

export const getSuggestionsByScore = (scores: {
  contenido: number;
  hook: number;
  cuenta: number;
}): DetailedSuggestion[] => {
  // Retorna sugerencias priorizadas por dónde hay más oportunidad (scores más bajos)
  const weak: ('contenido' | 'hook' | 'cuenta')[] = [];

  if (scores.contenido < 65) weak.push('contenido');
  if (scores.hook < 70) weak.push('hook');
  if (scores.cuenta < 65) weak.push('cuenta');

  const suggestions: DetailedSuggestion[] = [];
  weak.forEach((cat) => {
    suggestions.push(...getSuggestions(cat).slice(0, 2)); // Top 2 per category
  });

  return suggestions;
};
