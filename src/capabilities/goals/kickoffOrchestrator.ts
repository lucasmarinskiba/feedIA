/**
 * Kickoff Orchestrator de FeedIA — el ritual de inicio de período del usuario.
 *
 * El usuario entra el lunes a la mañana (o cualquier momento) y dice/escribe/dibuja sus
 * objetivos. Este módulo:
 *   1. Parsea el input (voz, texto, canvas o calendario)
 *   2. Crea las metas en el goalManager
 *   3. Descompone cada meta en tareas asignadas a los agentes
 *   4. Registra eventos en el calendario
 *   5. Aplica las restricciones (blackout dates, etc.)
 *   6. Devuelve al usuario un resumen claro: "esto es lo que vamos a hacer"
 */

import { log } from '../../agent/logger.js';
import { sendAlert } from '../../integrations/notifications.js';
import { askJson as routerAskJson } from '../../agent/tokenRouter.js';
import {
  parseUserIntent,
  validateParseResult,
  type ParseInput,
  type ParseResult,
  type ValidationIssue,
  type ParsedGoal,
} from './intentParser.js';
import { createGoal, cascadeAnnualGoal, cascadeQuarterlyGoal, type Goal } from './goalManager.js';
import { decomposeGoalIntoTasks, createTask, type BoardTask, type AgentId } from './taskBoard.js';
import { createEvent, addBlackoutDate, type CalendarEvent } from './calendarBoard.js';
import type { BrandProfile } from '../../config/types.js';

// ── Tipos públicos ────────────────────────────────────────────────────────────

export interface KickoffResult {
  parsed: ParseResult;
  validationIssues: ValidationIssue[];
  createdGoals: Goal[];
  cascadedGoals: Goal[]; // las generadas automáticamente como cascada (Q→M→W, etc.)
  createdTasks: BoardTask[];
  createdEvents: CalendarEvent[];
  blackoutsAdded: string[];
  acknowledgment: {
    headline: string;
    summary: string;
    teamAssignments: Array<{ agent: AgentId; agentName: string; taskCount: number; focus: string }>;
    risksOrAmbiguities: string[];
    nextStep: string;
  };
  durationMs: number;
}

export interface KickoffInput extends Omit<ParseInput, 'brand'> {
  brand: BrandProfile;
  autoCascade?: boolean; // si true, los anuales generan trimestrales, los trimestrales mensuales, etc.
  autoDecompose?: boolean; // si true, descompone metas mensuales/semanales en tareas
}

// ── Helper: detectar restricciones de fechas (blackouts) ─────────────────────

const detectBlackoutsFromConstraints = (constraints: ParseResult['constraints']): string[] => {
  const blackouts: string[] = [];
  for (const c of constraints) {
    if (c.type !== 'time' && c.type !== 'frequency') continue;
    // Buscar patrón "no publicar el X" o "blackout en X" o fechas explícitas en formato YYYY-MM-DD
    const explicitDates = c.description.match(/\b(\d{4}-\d{2}-\d{2})\b/g);
    if (explicitDates) blackouts.push(...explicitDates);
  }
  return [...new Set(blackouts)];
};

// ── Helper: armar el "acknowledgment" para el usuario ───────────────────────

const buildAcknowledgment = async (
  brand: BrandProfile,
  createdGoals: Goal[],
  createdTasks: BoardTask[],
  ambiguities: ParseResult['ambiguities'],
): Promise<KickoffResult['acknowledgment']> => {
  // Resumen de carga por agente
  const agentLoadMap = new Map<AgentId, number>();
  for (const t of createdTasks) {
    agentLoadMap.set(t.assignedTo, (agentLoadMap.get(t.assignedTo) ?? 0) + 1);
  }
  const teamAssignmentsRaw: Array<{ agent: AgentId; taskCount: number }> = [];
  for (const [agent, count] of agentLoadMap) {
    teamAssignmentsRaw.push({ agent, taskCount: count });
  }
  teamAssignmentsRaw.sort((a, b) => b.taskCount - a.taskCount);

  const goalsSummary = createdGoals
    .map((g) => `- [${g.horizon}] ${g.title} → target: ${g.target.value} ${g.target.unit}`)
    .join('\n');

  // Si no se creó ninguna meta, devolver acknowledgment mínimo
  if (createdGoals.length === 0) {
    return {
      headline: '⚠️ No detecté metas claras en tu input',
      summary: 'Necesito que me digas qué querés lograr con números concretos.',
      teamAssignments: [],
      risksOrAmbiguities: ambiguities.map((a) => a.needsClarification),
      nextStep: 'Decime tu meta principal con un número claro (ej: "crecer 1000 seguidores este mes")',
    };
  }

  // Generar narrativa breve con IA
  const ackPrompt = `Generá una respuesta corta y motivadora para el dueño de @${brand.name} confirmando que recibimos sus indicaciones.

METAS CREADAS:
${goalsSummary}

EQUIPO ASIGNADO:
- ${teamAssignmentsRaw.length} agentes con tareas concretas
- Total tareas distribuidas: ${createdTasks.length}

JSON:
{
  "headline": "1 línea afirmativa con tono confiado pero no soberbio",
  "summary": "2-3 líneas: qué entendí y qué vamos a hacer concretamente",
  "nextStep": "1 línea con la próxima acción inmediata que el sistema dispara"
}`;

  let aiAck: { headline: string; summary: string; nextStep: string };
  try {
    aiAck = await routerAskJson<{ headline: string; summary: string; nextStep: string }>(ackPrompt, {
      taskType: 'response',
      maxTokens: 600,
      systemPrompt: 'Sos Talía, manager del equipo. Tono profesional, cálido y específico. Sin floritura corporativa.',
    });
  } catch {
    aiAck = {
      headline: `✓ Listo. Tomé tus ${createdGoals.length} meta(s) y armé el plan.`,
      summary: `Asigné ${createdTasks.length} tarea(s) entre el equipo. Cada agente sabe qué hacer y cuándo.`,
      nextStep: 'Voy a empezar a ejecutar ahora. Te aviso cuando haya updates importantes.',
    };
  }

  // Conseguir specialty focus para cada agente
  const { AGENT_SPECIALTIES } = await import('./taskBoard.js');
  const teamAssignments = teamAssignmentsRaw.map((t) => ({
    agent: t.agent,
    agentName: AGENT_SPECIALTIES[t.agent].name,
    taskCount: t.taskCount,
    focus: AGENT_SPECIALTIES[t.agent].focus,
  }));

  return {
    headline: aiAck.headline,
    summary: aiAck.summary,
    teamAssignments,
    risksOrAmbiguities: ambiguities.map((a) => a.needsClarification),
    nextStep: aiAck.nextStep,
  };
};

// ── Orquestador principal ─────────────────────────────────────────────────────

export const runKickoff = async (input: KickoffInput): Promise<KickoffResult> => {
  const t0 = Date.now();
  log.info(`[KickoffOrchestrator] 🚀 Iniciando kickoff desde ${input.source}...`);

  // Paso 1 & 2: parsear + validar
  const parsed = await parseUserIntent({
    source: input.source,
    text: input.text,
    canvas: input.canvas,
    calendar: input.calendar,
    brand: input.brand,
    referenceDate: input.referenceDate,
  });
  const validationIssues = validateParseResult(parsed);

  // Paso 3: crear metas
  const createdGoals: Goal[] = [];
  for (const pg of parsed.goals) {
    try {
      const goal = createGoal({
        horizon: pg.horizon,
        category: pg.category,
        title: pg.title,
        description: pg.description,
        target: pg.target,
        startsAt: pg.startsAt,
        endsAt: pg.endsAt,
        source: input.source,
      });
      createdGoals.push(goal);
    } catch (err) {
      log.warn(`[KickoffOrchestrator] No se pudo crear meta "${pg.title}": ${(err as Error).message}`);
    }
  }

  // Paso 4: cascade (anuales → trimestrales → mensuales)
  const cascadedGoals: Goal[] = [];
  if (input.autoCascade ?? true) {
    for (const goal of createdGoals) {
      if (goal.horizon === 'annual') {
        try {
          const quarterly = await cascadeAnnualGoal(goal.id, input.brand);
          cascadedGoals.push(...quarterly);
        } catch (err) {
          log.warn(`[KickoffOrchestrator] Cascade anual falló para ${goal.id}: ${(err as Error).message}`);
        }
      }
    }
    // Cascade trimestrales nuevas → mensuales
    for (const q of cascadedGoals.filter((g) => g.horizon === 'quarterly')) {
      try {
        const monthly = await cascadeQuarterlyGoal(q.id, input.brand);
        cascadedGoals.push(...monthly);
      } catch (err) {
        log.warn(`[KickoffOrchestrator] Cascade trimestral falló: ${(err as Error).message}`);
      }
    }
  }

  // Paso 5: descomponer metas semanales y mensuales en tareas
  const createdTasks: BoardTask[] = [];
  if (input.autoDecompose ?? true) {
    const goalsToDecompose = [...createdGoals, ...cascadedGoals].filter(
      (g) => g.horizon === 'weekly' || g.horizon === 'monthly',
    );
    for (const goal of goalsToDecompose) {
      try {
        const tasks = await decomposeGoalIntoTasks(goal.id, input.brand);
        createdTasks.push(...tasks);
      } catch (err) {
        log.warn(`[KickoffOrchestrator] Decompose falló para ${goal.id}: ${(err as Error).message}`);
      }
    }
  }

  // Paso 6: agregar tareas sueltas (no relacionadas a metas)
  for (const pt of parsed.tasks) {
    try {
      const task = createTask({
        title: pt.title,
        description: pt.description,
        priority: pt.priority,
        dueDate: pt.dueDate,
        estimatedHours: pt.estimatedHours,
        assignedTo: pt.suggestedAgent as AgentId,
        tags: ['kickoff', input.source],
      });
      createdTasks.push(task);
    } catch (err) {
      log.warn(`[KickoffOrchestrator] No se pudo crear tarea "${pt.title}": ${(err as Error).message}`);
    }
  }

  // Paso 7: registrar eventos del calendario
  const createdEvents: CalendarEvent[] = [];
  for (const pe of parsed.events) {
    try {
      // Buscar goalIds por título referenciado
      const goalIds = createdGoals
        .filter((g) => pe.goalRefs.some((ref) => g.title.toLowerCase().includes(ref.toLowerCase())))
        .map((g) => g.id);

      const event = createEvent({
        title: pe.title,
        type: pe.type,
        startsAt: pe.startsAt,
        endsAt: pe.endsAt,
        description: pe.description,
        goalIds,
        source: input.source,
      });
      createdEvents.push(event);
    } catch (err) {
      log.warn(`[KickoffOrchestrator] No se pudo crear evento "${pe.title}": ${(err as Error).message}`);
    }
  }

  // Paso 8: aplicar blackouts inferidos de restricciones
  const blackouts = detectBlackoutsFromConstraints(parsed.constraints);
  for (const date of blackouts) addBlackoutDate(date);

  // Paso 9: armar respuesta para el usuario
  const acknowledgment = await buildAcknowledgment(
    input.brand,
    [...createdGoals, ...cascadedGoals],
    createdTasks,
    parsed.ambiguities,
  );

  // Paso 10: notificar al usuario (si hay metas creadas)
  if (createdGoals.length > 0) {
    await sendAlert({
      severity: 'info',
      title: `${input.brand.name}: kickoff procesado · ${createdGoals.length} meta(s)`,
      body: `${acknowledgment.headline}\n\n${acknowledgment.summary}\n\nPróximo paso: ${acknowledgment.nextStep}`,
      metadata: {
        goalCount: createdGoals.length,
        taskCount: createdTasks.length,
        eventCount: createdEvents.length,
        source: input.source,
      },
    }).catch(() => undefined);
  }

  const result: KickoffResult = {
    parsed,
    validationIssues,
    createdGoals,
    cascadedGoals,
    createdTasks,
    createdEvents,
    blackoutsAdded: blackouts,
    acknowledgment,
    durationMs: Date.now() - t0,
  };

  log.info(
    `[KickoffOrchestrator] ✓ Kickoff completado en ${result.durationMs}ms: ${createdGoals.length} metas, ${createdTasks.length} tareas, ${createdEvents.length} eventos`,
  );
  return result;
};

// ── Conveniencia: kickoff desde texto puro (chat o voz) ─────────────────────

export const runKickoffFromText = async (
  text: string,
  brand: BrandProfile,
  source: 'voice' | 'chat' = 'chat',
  referenceDate?: string,
): Promise<KickoffResult> =>
  runKickoff({
    source,
    text,
    brand,
    referenceDate,
    autoCascade: true,
    autoDecompose: true,
  });

// ── Conveniencia: kickoff desde calendario ──────────────────────────────────

export const runKickoffFromCalendar = async (
  calendar: ParseInput['calendar'],
  brand: BrandProfile,
): Promise<KickoffResult> =>
  runKickoff({
    source: 'calendar',
    calendar,
    brand,
    autoCascade: false,
    autoDecompose: true,
  });

// ── Conveniencia: kickoff desde canvas ───────────────────────────────────────

export const runKickoffFromCanvas = async (canvas: ParseInput['canvas'], brand: BrandProfile): Promise<KickoffResult> =>
  runKickoff({
    source: 'canvas',
    canvas,
    brand,
    autoCascade: true,
    autoDecompose: true,
  });

// ── Pre-check: confirmar input antes de ejecutar (modo "dry run") ───────────

export const previewKickoff = async (
  input: KickoffInput,
): Promise<{
  parsed: ParseResult;
  issues: ValidationIssue[];
  preview: {
    wouldCreateGoals: ParsedGoal[];
    wouldCreateTasks: number;
    wouldCreateEvents: number;
    estimatedDurationToExecuteMs: number;
  };
}> => {
  const parsed = await parseUserIntent({
    source: input.source,
    text: input.text,
    canvas: input.canvas,
    calendar: input.calendar,
    brand: input.brand,
    referenceDate: input.referenceDate,
  });
  const issues = validateParseResult(parsed);

  return {
    parsed,
    issues,
    preview: {
      wouldCreateGoals: parsed.goals,
      wouldCreateTasks: parsed.tasks.length + parsed.goals.length * 6, // ~6 tareas por meta
      wouldCreateEvents: parsed.events.length,
      estimatedDurationToExecuteMs: 8000 + parsed.goals.length * 3000,
    },
  };
};
