/**
 * Goal Decomposer — Playbook Library
 * ─────────────────────────────────────────────────────────────────────────
 * Translates high-level brand goals into concrete, executable playbooks
 * that the existing orchestrator can run task-by-task.
 *
 * The library contains canonical decompositions for the most common
 * intents a creator/brand voices ("crecer en autoridad", "abrir el funnel de
 * leads", "salir de un bache de alcance", etc.). When the user types a free
 * intent in Mission Control, the decomposer:
 *
 *   1. Keyword-matches against the canonical playbooks
 *   2. Picks the best fit (deterministic)
 *   3. Returns a fully-formed `PlaybookDefinition` ready for `runPlaybook()`
 *
 * For unmatched intents we fall back to a generic "exploratory" playbook
 * that activates Strategist + Analytics + Content Producer agents.
 */

import type { PlaybookDefinition, PlaybookTask } from '../../agent/orchestrator.js';

export type GoalIntent =
  | 'crecer-autoridad'
  | 'abrir-funnel-leads'
  | 'salir-bache-alcance'
  | 'lanzar-oferta'
  | 'reactivar-audiencia-dormida'
  | 'experimentar-formato-nuevo'
  | 'recuperar-cuenta-de-crisis'
  | 'optimizar-engagement'
  | 'planificar-semana'
  | 'auditar-completo';

export interface GoalPlaybookEntry {
  intent: GoalIntent;
  description: string;
  keywordTriggers: string[];
  buildPlaybook: (params: { brandName: string; horizonDays?: number }) => PlaybookDefinition;
}

/* ──────────────────────────────────────────────────────────────────────── */

const taskId = (prefix: string, i: number): string => `${prefix}-t${i}`;

const buildBaseTask = (id: string, agentId: string, goal: string, deps?: string[]): PlaybookTask => ({
  id,
  agentId,
  goal,
  dependsOn: deps,
});

/* ──────────────────────────────────────────────────────────────────────── */

const LIBRARY: GoalPlaybookEntry[] = [
  {
    intent: 'crecer-autoridad',
    description: 'Construye autoridad en el nicho a través de contenido educativo + casos reales + voz consistente.',
    keywordTriggers: ['autoridad', 'expertise', 'experto', 'referente', 'thought leader', 'reconocimiento'],
    buildPlaybook: ({ brandName, horizonDays = 30 }): PlaybookDefinition => {
      const tasks: PlaybookTask[] = [
        buildBaseTask(
          taskId('aut', 1),
          'strategist',
          `Definir 3 pilares de autoridad para ${brandName} en ${horizonDays} días. Cada pilar con tesis + ángulo + casos a usar.`,
        ),
        buildBaseTask(
          taskId('aut', 2),
          'trend-radar',
          'Detectar 5 ángulos en tendencia del nicho que la marca pueda capturar con autoridad.',
          [taskId('aut', 1)],
        ),
        buildBaseTask(
          taskId('aut', 3),
          'storyteller',
          'Producir 4 piezas tipo "caso real desarmado" usando los pilares + tendencias detectadas.',
          [taskId('aut', 1), taskId('aut', 2)],
        ),
        buildBaseTask(
          taskId('aut', 4),
          'community',
          'Generar 5 comentarios faro en cuentas de referencia del nicho con la voz de autoridad humilde.',
          [taskId('aut', 1)],
        ),
        buildBaseTask(
          taskId('aut', 5),
          'algorithm',
          'Validar timing + hashtags + formato de las 4 piezas vs ranking signals 2026.',
          [taskId('aut', 3)],
        ),
      ];
      return {
        id: `pb-autoridad-${Date.now()}`,
        name: `Construir autoridad — ${horizonDays} días`,
        description: 'Plan multi-agente para posicionar la marca como referente del nicho.',
        tasks,
        maxGlobalIterations: 25,
      };
    },
  },
  {
    intent: 'abrir-funnel-leads',
    description: 'Abre y satura el funnel de leads: bio + pins + magnet + secuencias de DM.',
    keywordTriggers: ['leads', 'clientes', 'vender', 'funnel', 'magnet', 'oferta', 'conversión'],
    buildPlaybook: ({ brandName }): PlaybookDefinition => {
      const tasks: PlaybookTask[] = [
        buildBaseTask(
          taskId('lds', 1),
          'strategist',
          `Auditar el funnel actual de ${brandName}: bio, pins, link en bio, CTAs en posts. Identificar el cuello de botella.`,
        ),
        buildBaseTask(
          taskId('lds', 2),
          'sales',
          'Diseñar un lead magnet específico para el nicho (1 entregable digital concreto).',
          [taskId('lds', 1)],
        ),
        buildBaseTask(
          taskId('lds', 3),
          'storyteller',
          'Producir 3 piezas de "presentación de oferta" (carrusel + reel + post-imagen) que canalicen al magnet.',
          [taskId('lds', 2)],
        ),
        buildBaseTask(
          taskId('lds', 4),
          'community',
          'Diseñar secuencia de DM de 3 pasos para nuevos leads que descarguen el magnet.',
          [taskId('lds', 2)],
        ),
        buildBaseTask(
          taskId('lds', 5),
          'algorithm',
          'Optimizar timing y hashtags de las 3 piezas para maximizar reach hacia personas con intent comercial.',
          [taskId('lds', 3)],
        ),
      ];
      return {
        id: `pb-leads-${Date.now()}`,
        name: 'Abrir funnel de leads',
        description: 'Multi-agente para diseñar magnet, piezas de canalización y secuencia DM.',
        tasks,
        maxGlobalIterations: 25,
      };
    },
  },
  {
    intent: 'salir-bache-alcance',
    description: 'Diagnóstico + plan de recuperación cuando el alcance cayó bruscamente.',
    keywordTriggers: ['alcance bajo', 'bajón', 'no llegan', 'reach bajo', 'shadowban', 'estancado'],
    buildPlaybook: ({ brandName }): PlaybookDefinition => {
      const tasks: PlaybookTask[] = [
        buildBaseTask(
          taskId('rch', 1),
          'algorithm',
          `Diagnóstico de shadowban para ${brandName}: síntomas, posibles disparadores, recomendación.`,
        ),
        buildBaseTask(
          taskId('rch', 2),
          'analytics-savant',
          'Comparar las últimas 14 vs 30 piezas: completion-rate, saves, comments, shares. Identificar qué cambió.',
          [taskId('rch', 1)],
        ),
        buildBaseTask(
          taskId('rch', 3),
          'viral',
          'Diseñar 2 piezas "reset" de alta saveability para reactivar el ranking de la cuenta.',
          [taskId('rch', 2)],
        ),
        buildBaseTask(
          taskId('rch', 4),
          'community',
          'Plan de 7 días de stories interactivas para subir el dwell time del segmento dormido.',
          [taskId('rch', 1)],
        ),
      ];
      return {
        id: `pb-bache-${Date.now()}`,
        name: 'Salir del bache de alcance',
        description: 'Diagnóstico + plan de recuperación multi-agente.',
        tasks,
        maxGlobalIterations: 20,
      };
    },
  },
  {
    intent: 'lanzar-oferta',
    description: 'Plan completo de lanzamiento de una oferta: pre-launch + launch week + post-launch.',
    keywordTriggers: ['lanzar', 'lanzamiento', 'launch', 'curso', 'producto', 'oferta nueva', 'pre-venta'],
    buildPlaybook: ({ brandName }): PlaybookDefinition => {
      const tasks: PlaybookTask[] = [
        buildBaseTask(
          taskId('lnc', 1),
          'strategist',
          `Definir promesa central, audiencia ideal y diferenciador de la oferta para ${brandName}.`,
        ),
        buildBaseTask(
          taskId('lnc', 2),
          'storyteller',
          'Producir 3 piezas de pre-launch (storytelling, sin pitch directo) en 9 días previos.',
          [taskId('lnc', 1)],
        ),
        buildBaseTask(
          taskId('lnc', 3),
          'sales',
          'Diseñar el funnel de launch: secuencia de stories, posts del día 0, follow-up.',
          [taskId('lnc', 1)],
        ),
        buildBaseTask(
          taskId('lnc', 4),
          'meta-ads',
          'Plan de paid amplification para los primeros 7 días del launch (estructura de campañas + audiencias).',
          [taskId('lnc', 3)],
        ),
        buildBaseTask(taskId('lnc', 5), 'community', 'Diseñar secuencia DM post-compra: thanks + bonus + retention.', [
          taskId('lnc', 3),
        ]),
      ];
      return {
        id: `pb-launch-${Date.now()}`,
        name: 'Plan de lanzamiento completo',
        description: 'Multi-agente para pre-launch, launch y retention post-compra.',
        tasks,
        maxGlobalIterations: 30,
      };
    },
  },
  {
    intent: 'reactivar-audiencia-dormida',
    description: 'Reactiva followers que no engagean hace tiempo + DMs a leads fríos.',
    keywordTriggers: ['dormido', 'dormidos', 'inactivo', 'reactivar', 're-engagement', 'fríos'],
    buildPlaybook: ({ brandName }): PlaybookDefinition => {
      const tasks: PlaybookTask[] = [
        buildBaseTask(
          taskId('rtn', 1),
          'analytics-savant',
          `Identificar segmentos dormidos en ${brandName}: cuántos followers no interactúan hace 30+ días.`,
        ),
        buildBaseTask(
          taskId('rtn', 2),
          'community',
          'Diseñar 3 stories de "re-hook" con interacción explícita (slider/poll) para esta semana.',
          [taskId('rtn', 1)],
        ),
        buildBaseTask(
          taskId('rtn', 3),
          'storyteller',
          'Producir 1 carrusel "callback" referenciando un viral previo para que el segmento dormido lo reconozca.',
          [taskId('rtn', 1)],
        ),
        buildBaseTask(
          taskId('rtn', 4),
          'sales',
          'Plan de DMs de re-activación para leads fríos: 2-step soft outreach.',
          [taskId('rtn', 1)],
        ),
      ];
      return {
        id: `pb-reactivar-${Date.now()}`,
        name: 'Reactivar audiencia dormida',
        description: 'Multi-agente para re-engagement de followers + DMs a leads fríos.',
        tasks,
        maxGlobalIterations: 20,
      };
    },
  },
  {
    intent: 'planificar-semana',
    description: 'Plan de contenido + calendario completo para la próxima semana.',
    keywordTriggers: ['semana', 'planificar', 'plan semanal', 'calendario', 'próximos 7 días'],
    buildPlaybook: ({ brandName }): PlaybookDefinition => {
      const tasks: PlaybookTask[] = [
        buildBaseTask(
          taskId('wk', 1),
          'strategist',
          `Definir el ángulo central de la semana para ${brandName} basado en pilares + tendencias.`,
        ),
        buildBaseTask(
          taskId('wk', 2),
          'trend-radar',
          'Detectar 2 oportunidades de tendencias para sumar a la semana.',
          [taskId('wk', 1)],
        ),
        buildBaseTask(
          taskId('wk', 3),
          'storyteller',
          'Producir el plan: 1 reel, 2 carruseles, stories diarias para la semana.',
          [taskId('wk', 1), taskId('wk', 2)],
        ),
        buildBaseTask(
          taskId('wk', 4),
          'algorithm',
          'Asignar horarios óptimos a cada pieza basado en data histórica + best practices.',
          [taskId('wk', 3)],
        ),
      ];
      return {
        id: `pb-semana-${Date.now()}`,
        name: 'Plan de la semana',
        description: 'Pipeline completo: ángulo + piezas + horarios.',
        tasks,
        maxGlobalIterations: 20,
      };
    },
  },
];

/* ──────────────────────────────────────────────────────────────────────── */

const inferIntent = (freeText: string): GoalIntent | null => {
  const t = freeText.toLowerCase();
  let best: { intent: GoalIntent; score: number } | null = null;
  for (const entry of LIBRARY) {
    let score = 0;
    for (const kw of entry.keywordTriggers) {
      if (t.includes(kw.toLowerCase())) score += kw.length;
    }
    if (score > 0 && (!best || score > best.score)) {
      best = { intent: entry.intent, score };
    }
  }
  return best?.intent ?? null;
};

export const decomposeGoal = (params: {
  brandName: string;
  freeIntent: string;
  horizonDays?: number;
}): {
  matchedIntent: GoalIntent | 'unknown';
  playbook: PlaybookDefinition;
} => {
  const intent = inferIntent(params.freeIntent);
  if (intent) {
    const entry = LIBRARY.find((e) => e.intent === intent)!;
    return {
      matchedIntent: intent,
      playbook: entry.buildPlaybook({ brandName: params.brandName, horizonDays: params.horizonDays }),
    };
  }

  // Fallback exploratory playbook.
  const tasks: PlaybookTask[] = [
    {
      id: 'exp-t1',
      agentId: 'strategist',
      goal: `Interpretar la intención del usuario y producir un plan de 3 acciones para ${params.brandName}. Intento original: "${params.freeIntent}"`,
    },
    {
      id: 'exp-t2',
      agentId: 'analytics-savant',
      goal: 'Identificar 1 oportunidad de datos accionable basada en performance reciente.',
      dependsOn: ['exp-t1'],
    },
  ];
  return {
    matchedIntent: 'unknown',
    playbook: {
      id: `pb-exploratory-${Date.now()}`,
      name: 'Plan exploratorio',
      description: 'Intent no reconocida — el sistema interpreta y plantea 3 acciones.',
      tasks,
      maxGlobalIterations: 12,
    },
  };
};

export const listPlaybookLibrary = (): Array<{
  intent: GoalIntent;
  description: string;
  keywordTriggers: string[];
}> =>
  LIBRARY.map((e) => ({
    intent: e.intent,
    description: e.description,
    keywordTriggers: e.keywordTriggers,
  }));
