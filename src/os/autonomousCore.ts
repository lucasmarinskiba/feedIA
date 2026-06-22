/**
 * FeedIA Autonomous OS Core
 * Sistema operativo autónomo multi-agente que:
 * - Se autogestiona, automonitorea y auto-optimiza
 * - Orquesta agentes según eventos y calendarios
 * - Se auto-repara ante fallos
 * - Evoluciona aprendiendo de su propio historial
 * - Descubre e integra nuevas capacidades/APIs
 */

import { log } from '../agent/logger.js';
import { loadBrandProfile } from '../config/index.js';
import { triggerSelfHealing, getSystemHealth, recordFailure, recordSuccess } from './selfHealing.js';
import { runEvolutionCycle, recordPerformance } from './agentEvolution.js';
import { runTalia } from '../agent/talia.js';
import { runMission, runOperationsCycle } from '../agent/swarm/index.js';
import { getBudgetStatus } from '../agent/budget.js';
import { getHubSummary } from '../integrations/openSourceHub.js';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const RUNTIME_DIR = join(__dirname, '../../data/runtime');
const OS_STATE_FILE = join(RUNTIME_DIR, 'os-state.json');

export interface OSState {
  startedAt: string | null;
  lastTickAt: string | null;
  tickCount: number;
  mode: 'idle' | 'running' | 'busy' | 'error' | 'maintenance';
  activeTasks: string[];
  completedTasks: number;
  failedTasks: number;
  autonomyLevel: 'supervised' | 'semi_autonomous' | 'fully_autonomous';
  scheduledGoals: Array<{
    id: string;
    goal: string;
    scheduledFor: string;
    priority: 'critical' | 'high' | 'normal';
    executed: boolean;
  }>;
  systemLog: Array<{ timestamp: string; level: string; message: string }>;
}

const ensureDir = (): void => {
  if (!existsSync(RUNTIME_DIR)) mkdirSync(RUNTIME_DIR, { recursive: true });
};

const loadOSState = (): OSState => {
  ensureDir();
  if (!existsSync(OS_STATE_FILE)) {
    return {
      startedAt: null,
      lastTickAt: null,
      tickCount: 0,
      mode: 'idle',
      activeTasks: [],
      completedTasks: 0,
      failedTasks: 0,
      autonomyLevel: 'semi_autonomous',
      scheduledGoals: [],
      systemLog: [],
    };
  }
  try {
    return JSON.parse(readFileSync(OS_STATE_FILE, 'utf8')) as OSState;
  } catch {
    return {
      startedAt: null,
      lastTickAt: null,
      tickCount: 0,
      mode: 'idle',
      activeTasks: [],
      completedTasks: 0,
      failedTasks: 0,
      autonomyLevel: 'semi_autonomous',
      scheduledGoals: [],
      systemLog: [],
    };
  }
};

const saveOSState = (state: OSState): void => {
  ensureDir();
  state.systemLog = state.systemLog.slice(-200);
  writeFileSync(OS_STATE_FILE, JSON.stringify(state, null, 2), 'utf8');
};

const osLog = (state: OSState, level: 'info' | 'warn' | 'error' | 'success', message: string): void => {
  state.systemLog.push({ timestamp: new Date().toISOString(), level, message });
  log[level](`[FeedIA OS] ${message}`);
};

// ── Tareas autónomas que el OS ejecuta sin intervención humana ─────────────
const AUTONOMOUS_DAILY_GOALS = [
  { hour: 8, goal: 'Ejecutá el digest diario: resumen de métricas, tendencias y oportunidades del día.' },
  { hour: 9, goal: 'Analizá las tendencias actuales y prepará al menos 1 idea de contenido relevante.' },
  { hour: 12, goal: 'Revisá comentarios y DMs urgentes. Triagea y responde los que no requieren checkpoint.' },
  { hour: 17, goal: 'Auditá el contenido publicado hoy: engagement, anomalías, ajustes para mañana.' },
  { hour: 20, goal: 'Planificá el contenido de mañana basándote en el mejor horario de la audiencia.' },
];

const AUTONOMOUS_WEEKLY_GOALS = [
  { dayOfWeek: 1, goal: 'Generá el plan de contenido semanal completo (5 posts + 4 stories).' },
  { dayOfWeek: 3, goal: 'Ejecutá el análisis de competencia y detectá oportunidades de crecimiento.' },
  { dayOfWeek: 5, goal: 'Generá el reporte semanal de KPIs y ajustá la estrategia.' },
];

/**
 * Tick principal del OS — ejecuta una iteración del loop autónomo.
 */
export const osTick = async (): Promise<{ tasksExecuted: number; errors: string[] }> => {
  const state = loadOSState();
  state.lastTickAt = new Date().toISOString();
  state.tickCount += 1;
  state.mode = 'running';
  const errors: string[] = [];
  let tasksExecuted = 0;

  osLog(state, 'info', `Tick #${state.tickCount}`);

  // ── 1. Self-healing ────────────────────────────────────────────────────────
  try {
    const healing = await triggerSelfHealing();
    if (healing.actionsCount > 0) {
      osLog(
        state,
        'info',
        `Self-healing: ${healing.actionsCount} acciones (${healing.actions.slice(0, 2).join(', ')})`,
      );
    }
  } catch (err) {
    osLog(state, 'warn', `Self-healing falló: ${(err as Error).message}`);
  }

  // ── 1.4 Gobierno de presupuesto de LLM ────────────────────────────────────
  const budget = getBudgetStatus();
  if (budget.breaker === 'open') {
    osLog(
      state,
      'warn',
      `Presupuesto LLM agotado hoy ($${budget.spentUsd}/$${budget.capUsd}). Modo determinista: se omiten tareas con LLM hasta mañana.`,
    );
    state.mode = 'idle';
    saveOSState(state);
    return { tasksExecuted: 0, errors: [`budget-breaker-open:${budget.spentUsd}`] };
  }
  if (budget.usedPct >= 80) {
    osLog(state, 'info', `Presupuesto LLM al ${budget.usedPct}% ($${budget.spentUsd}/$${budget.capUsd}).`);
  }

  // ── 1.5 Director de Operaciones 24/7 ──────────────────────────────────────
  // Como un jefe de equipo: revisa el panorama y despacha misiones de fondo
  // (branding, crecimiento, frescura de contenido) con cooldown propio.
  if (state.autonomyLevel !== 'supervised') {
    try {
      const brand = loadBrandProfile();
      const ops = await runOperationsCycle(brand, { autonomy: state.autonomyLevel, maxMissions: 1 });
      if (ops.dispatched.length > 0) {
        const d = ops.dispatched[0]!;
        osLog(state, 'info', `Operaciones: despachó "${d.department}" → ${d.status} (${d.missionId})`);
      }
    } catch (err) {
      osLog(state, 'warn', `Director de Operaciones falló: ${(err as Error).message}`);
    }
  }

  // ── 2. Tareas programadas pendientes ──────────────────────────────────────
  const now = new Date();
  const pendingGoals = state.scheduledGoals
    .filter((g) => !g.executed && new Date(g.scheduledFor) <= now)
    .sort((a, b) => {
      const pOrder = { critical: 0, high: 1, normal: 2 };
      return pOrder[a.priority] - pOrder[b.priority];
    });

  for (const goal of pendingGoals.slice(0, 3)) {
    osLog(state, 'info', `Ejecutando tarea: ${goal.goal.slice(0, 80)}`);
    state.activeTasks.push(goal.id);
    const start = Date.now();

    try {
      const brand = loadBrandProfile();
      // El OS ejecuta los objetivos autónomos a través del framework
      // orquestador (planner + crew + crítico). Las metas críticas siguen
      // por Talía para una respuesta directa más rápida.
      let outcome: string;
      let ok: boolean;
      if (goal.priority === 'critical') {
        const result = await runTalia(brand, { goal: goal.goal, maxIterations: 8 });
        outcome = result.finalText;
        ok = true;
      } else {
        const mission = await runMission(brand, goal.goal);
        outcome = mission.summary;
        ok = mission.status !== 'failed';
      }
      goal.executed = true;
      if (ok) state.completedTasks += 1;
      else state.failedTasks += 1;
      tasksExecuted += 1;
      state.activeTasks = state.activeTasks.filter((t) => t !== goal.id);
      recordSuccess('autonomous-os');
      recordPerformance('autonomous-os', 'scheduled-goal', ok ? 1 : 0, Date.now() - start);
      osLog(
        state,
        ok ? 'success' : 'warn',
        `Tarea ${ok ? 'completada' : 'parcial/fallida'}: ${goal.goal.slice(0, 60)}`,
      );
      log.debug(`[OS Tick] ${outcome.slice(0, 200)}`);
    } catch (err) {
      const msg = (err as Error).message;
      goal.executed = true;
      state.failedTasks += 1;
      state.activeTasks = state.activeTasks.filter((t) => t !== goal.id);
      errors.push(msg);
      recordFailure('autonomous-os', msg);
      recordPerformance('autonomous-os', 'scheduled-goal', 0, Date.now() - start);
      osLog(state, 'error', `Tarea falló: ${goal.goal.slice(0, 60)} — ${msg.slice(0, 100)}`);
    }
  }

  // ── 3. Programar tareas diarias/semanales si no están ya ──────────────────
  if (state.autonomyLevel !== 'supervised') {
    const todayStr = now.toDateString();
    const alreadyScheduledToday = state.scheduledGoals.some(
      (g) => new Date(g.scheduledFor).toDateString() === todayStr,
    );

    if (!alreadyScheduledToday) {
      const currentHour = now.getHours();
      for (const task of AUTONOMOUS_DAILY_GOALS) {
        if (task.hour > currentHour) {
          const scheduledFor = new Date(now);
          scheduledFor.setHours(task.hour, 0, 0, 0);
          state.scheduledGoals.push({
            id: `daily-${task.hour}-${Date.now()}`,
            goal: task.goal,
            scheduledFor: scheduledFor.toISOString(),
            priority: 'normal',
            executed: false,
          });
        }
      }

      const dayOfWeek = now.getDay();
      for (const task of AUTONOMOUS_WEEKLY_GOALS) {
        if (task.dayOfWeek === dayOfWeek) {
          const scheduledFor = new Date(now);
          scheduledFor.setHours(10, 0, 0, 0);
          state.scheduledGoals.push({
            id: `weekly-${task.dayOfWeek}-${Date.now()}`,
            goal: task.goal,
            scheduledFor: scheduledFor.toISOString(),
            priority: 'high',
            executed: false,
          });
        }
      }

      // Limpiar tareas ejecutadas de más de 7 días
      const cutoff = new Date(Date.now() - 7 * 24 * 3600 * 1000);
      state.scheduledGoals = state.scheduledGoals.filter((g) => !g.executed || new Date(g.scheduledFor) > cutoff);
    }
  }

  state.mode = 'idle';
  saveOSState(state);
  return { tasksExecuted, errors };
};

/**
 * Inicia el sistema operativo autónomo.
 */
export const startAutonomousOS = async (): Promise<void> => {
  const state = loadOSState();
  if (state.mode === 'running') {
    log.warn('[FeedIA OS] Ya está corriendo. Ignorando inicio duplicado.');
    return;
  }
  state.startedAt = new Date().toISOString();
  state.mode = 'idle';
  saveOSState(state);

  const hub = await getHubSummary();
  log.success(`[FeedIA OS] Sistema iniciado — Proveedores: ${hub.availableProviders.join(', ') || 'ninguno'}`);
  log.info(`[FeedIA OS] ${hub.recommendedSetup}`);
};

/**
 * Agrega una tarea de alta prioridad al OS.
 */
export const scheduleOSTask = (
  goal: string,
  priority: 'critical' | 'high' | 'normal' = 'normal',
  delayMinutes = 0,
): string => {
  const state = loadOSState();
  const scheduledFor = new Date(Date.now() + delayMinutes * 60 * 1000);
  const id = `manual-${Date.now()}`;
  state.scheduledGoals.push({ id, goal, scheduledFor: scheduledFor.toISOString(), priority, executed: false });
  saveOSState(state);
  log.info(`[FeedIA OS] Tarea agendada: "${goal.slice(0, 60)}" en ${delayMinutes}min`);
  return id;
};

/**
 * Ejecuta el ciclo de evolución (análisis + auto-mejora).
 * Se corre automáticamente una vez por semana.
 */
export const runOSEvolution = async (): Promise<void> => {
  log.info('[FeedIA OS] Iniciando ciclo de evolución...');
  try {
    const result = await runEvolutionCycle();
    log.success(
      `[FeedIA OS] Evolución completada: ${result.newLessons} lecciones, ${result.discoveredApis} APIs descubiertas`,
    );
  } catch (err) {
    log.warn(`[FeedIA OS] Evolución falló: ${(err as Error).message}`);
  }
};

export const getOSState = (): OSState => loadOSState();

export const setAutonomyLevel = (level: OSState['autonomyLevel']): void => {
  const state = loadOSState();
  state.autonomyLevel = level;
  saveOSState(state);
  log.info(`[FeedIA OS] Nivel de autonomía: ${level}`);
};

export const getOSStatus = async (): Promise<{
  os: OSState;
  health: ReturnType<typeof getSystemHealth>;
  hub: Awaited<ReturnType<typeof getHubSummary>>;
}> => {
  const [os, health, hub] = await Promise.all([
    Promise.resolve(loadOSState()),
    Promise.resolve(getSystemHealth()),
    getHubSummary(),
  ]);
  return { os, health, hub };
};
