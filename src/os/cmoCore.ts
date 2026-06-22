/**
 * CMO Core — Sistema operativo autónomo de marketing.
 *
 * Orquesta el ciclo completo: inteligencia → estrategia → producción →
 * publicación → community → analytics → optimización, con niveles de autonomía
 * graduales y checkpoints humanos para decisiones críticas.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { BrandProfile } from '../config/types.js';
import { log } from '../agent/logger.js';
import { audit } from '../compliance/auditLog.js';
import { env } from '../config/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const RUNTIME_DIR = join(__dirname, '../../data/runtime/cmo');
const STATE_FILE = join(RUNTIME_DIR, 'cmo-state.json');

export type AutonomyLevel = 'supervised' | 'semi_autonomous' | 'fully_autonomous';

export interface CMOTask {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'done' | 'failed' | 'blocked';
  startedAt?: string;
  finishedAt?: string;
  result?: unknown;
  error?: string;
  checkpointRequired?: boolean;
}

export interface CMOState {
  startedAt: string | null;
  lastTickAt: string | null;
  tickCount: number;
  mode: 'idle' | 'running' | 'busy' | 'error' | 'maintenance';
  autonomyLevel: AutonomyLevel;
  activeTasks: CMOTask[];
  completedTasks: number;
  failedTasks: number;
  blockedTasks: number;
  dailyMetrics: {
    date: string;
    postsProduced: number;
    postsPublished: number;
    repliesSent: number;
    leadsCaptured: number;
    crisesDetected: number;
    lessonsLearned: number;
  };
  systemLog: Array<{ timestamp: string; level: string; message: string }>;
}

const DEFAULT_STATE: CMOState = {
  startedAt: null,
  lastTickAt: null,
  tickCount: 0,
  mode: 'idle',
  autonomyLevel: 'semi_autonomous',
  activeTasks: [],
  completedTasks: 0,
  failedTasks: 0,
  blockedTasks: 0,
  dailyMetrics: {
    date: new Date().toISOString().slice(0, 10),
    postsProduced: 0,
    postsPublished: 0,
    repliesSent: 0,
    leadsCaptured: 0,
    crisesDetected: 0,
    lessonsLearned: 0,
  },
  systemLog: [],
};

const ensureDir = (): void => {
  if (!existsSync(RUNTIME_DIR)) mkdirSync(RUNTIME_DIR, { recursive: true });
};

export const loadCMOState = (): CMOState => {
  ensureDir();
  if (!existsSync(STATE_FILE)) return structuredClone(DEFAULT_STATE);
  try {
    return JSON.parse(readFileSync(STATE_FILE, 'utf8')) as CMOState;
  } catch {
    return structuredClone(DEFAULT_STATE);
  }
};

export const saveCMOState = (state: CMOState): void => {
  ensureDir();
  state.systemLog = state.systemLog.slice(-500);
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf8');
};

const cmoLog = (state: CMOState, level: 'info' | 'warn' | 'error' | 'success', message: string): void => {
  state.systemLog.push({ timestamp: new Date().toISOString(), level, message });
  log[level](`[CMO Core] ${message}`);
};

export const setAutonomyLevel = (level: AutonomyLevel): CMOState => {
  const state = loadCMOState();
  state.autonomyLevel = level;
  cmoLog(state, 'info', `Autonomy level changed to ${level}`);
  saveCMOState(state);
  return state;
};

export const getAutonomyLevel = (): AutonomyLevel => loadCMOState().autonomyLevel;

const resetDailyMetricsIfNeeded = (state: CMOState): void => {
  const today = new Date().toISOString().slice(0, 10);
  if (state.dailyMetrics.date !== today) {
    state.dailyMetrics = {
      date: today,
      postsProduced: 0,
      postsPublished: 0,
      repliesSent: 0,
      leadsCaptured: 0,
      crisesDetected: 0,
      lessonsLearned: 0,
    };
  }
};

const runTask = async <T>(state: CMOState, name: string, fn: () => Promise<T>): Promise<T | undefined> => {
  const task: CMOTask = {
    id: `${name}-${Date.now()}`,
    name,
    status: 'running',
    startedAt: new Date().toISOString(),
  };
  state.activeTasks.push(task);
  cmoLog(state, 'info', `Starting task: ${name}`);

  try {
    const result = await fn();
    task.status = 'done';
    task.result = result;
    task.finishedAt = new Date().toISOString();
    state.completedTasks += 1;
    cmoLog(state, 'success', `Task done: ${name}`);
    audit({ action: 'API_REQUEST', outcome: 'success', reason: `CMO task ${name} completed` });
    return result;
  } catch (err) {
    task.status = 'failed';
    task.error = (err as Error).message;
    task.finishedAt = new Date().toISOString();
    state.failedTasks += 1;
    cmoLog(state, 'error', `Task failed: ${name} — ${task.error}`);
    audit({ action: 'API_REQUEST', outcome: 'failure', reason: `CMO task ${name} failed: ${task.error}` });
    return undefined;
  } finally {
    state.activeTasks = state.activeTasks.filter((t) => t.id !== task.id);
  }
};

export interface CMOCycleResult {
  tickCount: number;
  tasksExecuted: number;
  autonomyLevel: AutonomyLevel;
  dryRun: boolean;
  metrics: CMOState['dailyMetrics'];
  log: string[];
}

/**
 * Ciclo diario del CMO autónomo.
 *
 * En modo fully_autonomous ejecuta todas las fases sin pedir permiso
 * (salvo checkpoints de alto riesgo). En semi_autonomous pide aprobación
 * para publicar y responder casos sensibles. En supervised solo planifica
 * y genera borradores.
 */
export const runCMODailyCycle = async (brand: BrandProfile): Promise<CMOCycleResult> => {
  const state = loadCMOState();
  state.tickCount += 1;
  state.lastTickAt = new Date().toISOString();
  state.mode = 'running';
  resetDailyMetricsIfNeeded(state);

  cmoLog(
    state,
    'info',
    `=== CMO Daily Cycle #${state.tickCount} | autonomy=${state.autonomyLevel} | dryRun=${env.dryRun} ===`,
  );

  const autonomy = state.autonomyLevel;
  const canPublish = autonomy !== 'supervised';
  const canReplyFreely = autonomy === 'fully_autonomous';

  // ── 1. SENSE ───────────────────────────────────────────────────────────────
  await runTask(state, 'sense-health', async () => {
    const { runHealthChecks } = await import('../compliance/healthCheck.js');
    return runHealthChecks();
  });

  await runTask(state, 'sense-inbox', async () => {
    const { runOnce } = await import('../capabilities/bot/index.js');
    const items = await runOnce(brand);
    const replies = items.filter((i) => i.outcome.sent).length;
    state.dailyMetrics.repliesSent += replies;
    return { inboxItems: items.length, repliesSent: replies };
  });

  await runTask(state, 'sense-analytics', async () => {
    const { getAccountSummary } = await import('../capabilities/analytics/performanceDB.js');
    const summary = getAccountSummary();
    return summary;
  });

  // ── 2. STRATEGIZE ──────────────────────────────────────────────────────────
  await runTask(state, 'strategize-content', async () => {
    const { analyzeNicho } = await import('../capabilities/strategy/nichoAnalysis.js');
    const ideas = await analyzeNicho(brand);
    return { ideasCount: ideas.ideas.length, topIdea: ideas.ideas[0]?.concepto };
  });

  // ── 3. PRODUCE ─────────────────────────────────────────────────────────────
  if (autonomy !== 'supervised') {
    await runTask(state, 'produce-content', async () => {
      const { runWeeklyAutopilot } = await import('../capabilities/pipelines/weeklyAutopilot.js');
      const result = await runWeeklyAutopilot(brand, {
        dryRunBrief: !canPublish,
        bestHours: ['09:00', '12:00', '17:00', '20:00'],
      });
      state.dailyMetrics.postsProduced += result.outcomes.length;
      state.dailyMetrics.postsPublished += result.publicados;
      return {
        planSlots: result.plan.slots.length,
        produced: result.outcomes.length,
        published: result.publicados,
        pending: result.pendientesAprobacion,
      };
    });
  }

  // ── 4. ENGAGE ──────────────────────────────────────────────────────────────
  if (canReplyFreely) {
    await runTask(state, 'engage-proactive', async () => {
      const { processFollowUpsDue } = await import('../capabilities/community/leadPipeline.js');
      const followUps = await processFollowUpsDue(brand);
      return { followUpsProcessed: followUps.processed };
    });
  }

  // ── 5. ANALYZE & OPTIMIZE ──────────────────────────────────────────────────
  await runTask(state, 'analyze-growth', async () => {
    const { recordDailySnapshot, recommendNextActions } = await import('../capabilities/growth/growthEngine.js');
    const snapshot = recordDailySnapshot({
      date: new Date().toISOString().slice(0, 10),
      followers: 0,
      reach24h: 0,
      engagement24h: 0,
      postsPublished: state.dailyMetrics.postsPublished,
      storiesPublished: 0,
    });
    const actions = await recommendNextActions(brand);
    return { snapshot, actions: actions.length };
  });

  await runTask(state, 'optimize-lessons', async () => {
    const { runEvolutionCycle } = await import('./agentEvolution.js');
    const evolution = await runEvolutionCycle();
    state.dailyMetrics.lessonsLearned += evolution.newLessons;
    return { lessons: evolution.newLessons };
  });

  state.mode = 'idle';
  saveCMOState(state);

  const recentLog = state.systemLog.slice(-20).map((e) => `[${e.level}] ${e.message}`);

  return {
    tickCount: state.tickCount,
    tasksExecuted: state.completedTasks,
    autonomyLevel: state.autonomyLevel,
    dryRun: env.dryRun,
    metrics: state.dailyMetrics,
    log: recentLog,
  };
};

export const getCMODashboard = (): CMOState => loadCMOState();

export const resetCMOState = (): CMOState => {
  const fresh = structuredClone(DEFAULT_STATE);
  fresh.startedAt = new Date().toISOString();
  saveCMOState(fresh);
  return fresh;
};
