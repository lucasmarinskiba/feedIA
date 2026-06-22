/**
 * Goal Manager de FeedIA — sistema unificado de objetivos por horizonte.
 *
 * Permite al usuario fijar metas a 4 horizontes (semanal, mensual, trimestral, anual)
 * que cascadean: lo anual se quiebra en trimestres, los trimestres en meses, los meses
 * en semanas. El sistema persigue las metas 24/7 y reporta progreso real al cierre.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { log } from '../../agent/logger.js';
import { sendAlert } from '../../integrations/notifications.js';
import { askJson as routerAskJson } from '../../agent/tokenRouter.js';
import { getAccountSummary, getRecentPosts } from '../analytics/performanceDB.js';
import { getRecentDailyMetrics, setGrowthGoal } from '../growth/growthEngine.js';
import type { BrandProfile } from '../../config/types.js';

const GOALS_PATH = join(process.cwd(), 'data', 'goals', 'goals.json');

// ── Tipos públicos ────────────────────────────────────────────────────────────

export type GoalHorizon = 'weekly' | 'monthly' | 'quarterly' | 'annual';

export type GoalCategory =
  | 'growth' // seguidores, alcance
  | 'engagement' // interacciones, saves, comentarios
  | 'content' // cantidad/calidad de piezas
  | 'sales' // ventas, leads calificados
  | 'authority' // menciones, colabs, prensa
  | 'community' // DMs respondidos, comentarios respondidos
  | 'custom';

export type GoalStatus = 'active' | 'completed' | 'failed' | 'cancelled' | 'paused';

export type GoalSource = 'voice' | 'canvas' | 'calendar' | 'chat' | 'system' | 'kickoff';

export interface GoalTarget {
  metric: string; // 'followers' | 'engagement_rate' | 'reach_per_post' | 'sales_count' | etc.
  value: number; // valor objetivo
  unit: string; // 'seguidores' | '%' | 'ventas' | 'posts'
  baseline?: number; // valor al momento de crear la meta
}

export interface GoalCheckpoint {
  date: string; // ISO
  targetProgress: number; // 0-100
  actualProgress?: number; // 0-100
  note?: string;
}

export interface Goal {
  id: string;
  horizon: GoalHorizon;
  category: GoalCategory;
  title: string;
  description: string;
  target: GoalTarget;
  startsAt: string; // ISO
  endsAt: string; // ISO
  parentGoalId?: string; // cascada
  childGoalIds: string[];
  status: GoalStatus;
  progress: number; // 0-100
  source: GoalSource;
  notes: string[];
  checkpoints: GoalCheckpoint[];
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  ownerAgents: string[]; // ej: ['nova', 'scout', 'analytics']
}

interface GoalsStore {
  version: number;
  goals: Goal[];
  lastUpdated: string;
}

const DEFAULT_STORE: GoalsStore = {
  version: 1,
  goals: [],
  lastUpdated: new Date().toISOString(),
};

// ── Persistencia ──────────────────────────────────────────────────────────────

const ensureDir = (): void => {
  const dir = join(process.cwd(), 'data', 'goals');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
};

const loadStore = (): GoalsStore => {
  try {
    ensureDir();
    if (!existsSync(GOALS_PATH)) return structuredClone(DEFAULT_STORE);
    return JSON.parse(readFileSync(GOALS_PATH, 'utf8')) as GoalsStore;
  } catch {
    return structuredClone(DEFAULT_STORE);
  }
};

const saveStore = (store: GoalsStore): void => {
  ensureDir();
  store.lastUpdated = new Date().toISOString();
  writeFileSync(GOALS_PATH, JSON.stringify(store, null, 2), 'utf8');
};

// ── Helpers de fecha ─────────────────────────────────────────────────────────

const startOfWeek = (d: Date): Date => {
  const result = new Date(d);
  const day = result.getDay();
  const diff = result.getDate() - day + (day === 0 ? -6 : 1); // lunes
  result.setDate(diff);
  result.setHours(0, 0, 0, 0);
  return result;
};

const endOfWeek = (d: Date): Date => {
  const s = startOfWeek(d);
  s.setDate(s.getDate() + 6);
  s.setHours(23, 59, 59, 999);
  return s;
};

const startOfMonth = (d: Date): Date => new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
const endOfMonth = (d: Date): Date => new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);

const startOfQuarter = (d: Date): Date => {
  const q = Math.floor(d.getMonth() / 3);
  return new Date(d.getFullYear(), q * 3, 1, 0, 0, 0, 0);
};
const endOfQuarter = (d: Date): Date => {
  const q = Math.floor(d.getMonth() / 3);
  return new Date(d.getFullYear(), q * 3 + 3, 0, 23, 59, 59, 999);
};

const startOfYear = (d: Date): Date => new Date(d.getFullYear(), 0, 1, 0, 0, 0, 0);
const endOfYear = (d: Date): Date => new Date(d.getFullYear(), 11, 31, 23, 59, 59, 999);

export const periodBoundaries = (
  horizon: GoalHorizon,
  reference = new Date(),
): { startsAt: string; endsAt: string } => {
  switch (horizon) {
    case 'weekly':
      return { startsAt: startOfWeek(reference).toISOString(), endsAt: endOfWeek(reference).toISOString() };
    case 'monthly':
      return { startsAt: startOfMonth(reference).toISOString(), endsAt: endOfMonth(reference).toISOString() };
    case 'quarterly':
      return { startsAt: startOfQuarter(reference).toISOString(), endsAt: endOfQuarter(reference).toISOString() };
    case 'annual':
      return { startsAt: startOfYear(reference).toISOString(), endsAt: endOfYear(reference).toISOString() };
  }
};

// ── Asignación automática de owners según categoría ──────────────────────────

const ownersForCategory = (category: GoalCategory): string[] => {
  switch (category) {
    case 'growth':
      return ['nova', 'scout', 'analytics'];
    case 'engagement':
      return ['nova', 'lia'];
    case 'content':
      return ['nova', 'pixel'];
    case 'sales':
      return ['luca', 'max'];
    case 'authority':
      return ['scout', 'vero'];
    case 'community':
      return ['lia', 'luca'];
    case 'custom':
      return ['talia'];
  }
};

// ── Checkpoints automáticos para cada horizonte ──────────────────────────────

const buildCheckpoints = (horizon: GoalHorizon, startsAt: string, endsAt: string): GoalCheckpoint[] => {
  const start = new Date(startsAt).getTime();
  const end = new Date(endsAt).getTime();

  const fractions: number[] =
    horizon === 'weekly'
      ? [0.5, 1.0]
      : horizon === 'monthly'
        ? [0.25, 0.5, 0.75, 1.0]
        : horizon === 'quarterly'
          ? [0.33, 0.66, 1.0]
          : [0.25, 0.5, 0.75, 1.0];

  return fractions.map((f) => {
    const date = new Date(start + (end - start) * f).toISOString();
    return { date, targetProgress: Math.round(f * 100) };
  });
};

// ── CRUD de goals ────────────────────────────────────────────────────────────

export interface CreateGoalInput {
  horizon: GoalHorizon;
  category: GoalCategory;
  title: string;
  description?: string;
  target: GoalTarget;
  startsAt?: string;
  endsAt?: string;
  parentGoalId?: string;
  source?: GoalSource;
  notes?: string[];
  ownerAgents?: string[];
}

export const createGoal = (input: CreateGoalInput): Goal => {
  const store = loadStore();
  const bounds =
    input.startsAt && input.endsAt
      ? { startsAt: input.startsAt, endsAt: input.endsAt }
      : periodBoundaries(input.horizon);

  const goal: Goal = {
    id: `goal-${input.horizon}-${Date.now()}-${Math.floor(Math.random() * 999)}`,
    horizon: input.horizon,
    category: input.category,
    title: input.title,
    description: input.description ?? input.title,
    target: input.target,
    startsAt: bounds.startsAt,
    endsAt: bounds.endsAt,
    parentGoalId: input.parentGoalId,
    childGoalIds: [],
    status: 'active',
    progress: 0,
    source: input.source ?? 'chat',
    notes: input.notes ?? [],
    checkpoints: buildCheckpoints(input.horizon, bounds.startsAt, bounds.endsAt),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ownerAgents: input.ownerAgents ?? ownersForCategory(input.category),
  };

  store.goals.push(goal);

  // Cascada inversa: si tiene parent, registrar en parent.childGoalIds
  if (input.parentGoalId) {
    const parent = store.goals.find((g) => g.id === input.parentGoalId);
    if (parent && !parent.childGoalIds.includes(goal.id)) parent.childGoalIds.push(goal.id);
  }

  // Si es growth, sincronizar con growthEngine
  if (input.category === 'growth' && input.target.metric === 'followers') {
    try {
      setGrowthGoal({
        targetFollowers: input.target.value,
        targetEngagementRate: 4.5,
        targetReachPerPost: input.target.value * 0.2,
        deadline: bounds.endsAt,
        primaryFocus: 'awareness',
      });
    } catch (err) {
      log.warn(`[GoalManager] No se pudo sincronizar con growthEngine: ${(err as Error).message}`);
    }
  }

  saveStore(store);
  log.info(
    `[GoalManager] Meta creada: ${goal.title} (${goal.horizon}, ${goal.category}) → vence ${bounds.endsAt.split('T')[0]}`,
  );
  return goal;
};

export const updateGoalProgress = (goalId: string, actualProgress: number, note?: string): Goal | null => {
  const store = loadStore();
  const goal = store.goals.find((g) => g.id === goalId);
  if (!goal) return null;

  goal.progress = Math.max(0, Math.min(100, actualProgress));
  goal.updatedAt = new Date().toISOString();
  if (note) goal.notes.push(`[${new Date().toISOString()}] ${note}`);

  // Actualizar el checkpoint más cercano sin actualProgress aún
  const now = Date.now();
  const nearest = goal.checkpoints.find((c) => !c.actualProgress && new Date(c.date).getTime() <= now);
  if (nearest) nearest.actualProgress = goal.progress;

  // Auto-completar
  if (goal.progress >= 100 && goal.status === 'active') {
    goal.status = 'completed';
    goal.completedAt = new Date().toISOString();
    log.info(`[GoalManager] 🏆 Meta completada: ${goal.title}`);
  }

  saveStore(store);
  return goal;
};

export const transitionGoal = (goalId: string, newStatus: GoalStatus, reason?: string): Goal | null => {
  const store = loadStore();
  const goal = store.goals.find((g) => g.id === goalId);
  if (!goal) return null;
  goal.status = newStatus;
  goal.updatedAt = new Date().toISOString();
  if (newStatus === 'completed') goal.completedAt = new Date().toISOString();
  if (reason) goal.notes.push(`[${new Date().toISOString()}] Transición a ${newStatus}: ${reason}`);
  saveStore(store);
  return goal;
};

export const getGoal = (goalId: string): Goal | null => loadStore().goals.find((g) => g.id === goalId) ?? null;

export const listGoals = (
  filters: { horizon?: GoalHorizon; category?: GoalCategory; status?: GoalStatus } = {},
): Goal[] => {
  let goals = loadStore().goals;
  if (filters.horizon) goals = goals.filter((g) => g.horizon === filters.horizon);
  if (filters.category) goals = goals.filter((g) => g.category === filters.category);
  if (filters.status) goals = goals.filter((g) => g.status === filters.status);
  return goals.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
};

export const getActiveGoals = (): Goal[] => listGoals({ status: 'active' });

export const getActiveGoalsByHorizon = (): Record<GoalHorizon, Goal[]> => {
  const all = getActiveGoals();
  return {
    weekly: all.filter((g) => g.horizon === 'weekly'),
    monthly: all.filter((g) => g.horizon === 'monthly'),
    quarterly: all.filter((g) => g.horizon === 'quarterly'),
    annual: all.filter((g) => g.horizon === 'annual'),
  };
};

// ── Cascada: anual → trimestral → mensual → semanal ──────────────────────────

export const cascadeAnnualGoal = async (annualGoalId: string, brand: BrandProfile): Promise<Goal[]> => {
  const annual = getGoal(annualGoalId);
  if (!annual || annual.horizon !== 'annual') {
    throw new Error('Goal no es de horizonte anual');
  }

  const prompt = `Tomá esta meta ANUAL y descomponéla en 4 metas trimestrales, cada una con su propio target numérico.

META ANUAL: ${annual.title}
DESCRIPCIÓN: ${annual.description}
TARGET ANUAL: ${annual.target.value} ${annual.target.unit} (${annual.target.metric})
NICHO: ${brand.niche}

Cada meta trimestral debe:
- Tener un target medible (ej: si la anual son 10.000 seguidores, podrían ser 1.500, 2.500, 2.500, 3.500 por Q)
- Distribuirse de forma realista (Q1 más bajo, ramp-up hacia Q4)
- Tener título corto y descripción accionable

JSON:
{
  "quarterly": [
    { "quarter": "Q1", "title": "...", "description": "...", "targetValue": número },
    { "quarter": "Q2", "title": "...", "description": "...", "targetValue": número },
    { "quarter": "Q3", "title": "...", "description": "...", "targetValue": número },
    { "quarter": "Q4", "title": "...", "description": "...", "targetValue": número }
  ]
}`;

  const result = await routerAskJson<{
    quarterly: Array<{ quarter: string; title: string; description: string; targetValue: number }>;
  }>(prompt, { taskType: 'strategy', maxTokens: 2000 });

  const createdQuarterly: Goal[] = [];
  const annualStart = new Date(annual.startsAt);

  for (let q = 0; q < 4; q++) {
    const qStart = new Date(annualStart.getFullYear(), q * 3, 1);
    const qEnd = new Date(annualStart.getFullYear(), q * 3 + 3, 0, 23, 59, 59, 999);
    const data = result.quarterly[q];
    if (!data) continue;

    const qGoal = createGoal({
      horizon: 'quarterly',
      category: annual.category,
      title: data.title,
      description: data.description,
      target: { ...annual.target, value: data.targetValue },
      startsAt: qStart.toISOString(),
      endsAt: qEnd.toISOString(),
      parentGoalId: annual.id,
      source: 'system',
      notes: [`Cascada automática desde meta anual ${annual.id}`],
    });
    createdQuarterly.push(qGoal);
  }

  log.info(`[GoalManager] Anual cascadeada: ${createdQuarterly.length} metas trimestrales creadas`);
  return createdQuarterly;
};

export const cascadeQuarterlyGoal = async (quarterlyGoalId: string, brand: BrandProfile): Promise<Goal[]> => {
  const quarterly = getGoal(quarterlyGoalId);
  if (!quarterly || quarterly.horizon !== 'quarterly') {
    throw new Error('Goal no es de horizonte trimestral');
  }

  const prompt = `Descomponé esta meta TRIMESTRAL en 3 metas mensuales.

META TRIMESTRAL: ${quarterly.title}
TARGET: ${quarterly.target.value} ${quarterly.target.unit}
NICHO: ${brand.niche}

JSON:
{
  "monthly": [
    { "month": 1, "title": "...", "description": "...", "targetValue": número },
    { "month": 2, "title": "...", "description": "...", "targetValue": número },
    { "month": 3, "title": "...", "description": "...", "targetValue": número }
  ]
}`;

  const result = await routerAskJson<{
    monthly: Array<{ month: number; title: string; description: string; targetValue: number }>;
  }>(prompt, { taskType: 'strategy', maxTokens: 1500 });

  const createdMonthly: Goal[] = [];
  const qStart = new Date(quarterly.startsAt);

  for (let m = 0; m < 3; m++) {
    const mStart = new Date(qStart.getFullYear(), qStart.getMonth() + m, 1);
    const mEnd = new Date(qStart.getFullYear(), qStart.getMonth() + m + 1, 0, 23, 59, 59, 999);
    const data = result.monthly[m];
    if (!data) continue;

    const monthGoal = createGoal({
      horizon: 'monthly',
      category: quarterly.category,
      title: data.title,
      description: data.description,
      target: { ...quarterly.target, value: data.targetValue },
      startsAt: mStart.toISOString(),
      endsAt: mEnd.toISOString(),
      parentGoalId: quarterly.id,
      source: 'system',
    });
    createdMonthly.push(monthGoal);
  }

  return createdMonthly;
};

// ── Auto-progreso (lee del sistema y actualiza) ──────────────────────────────

export const autoUpdateProgress = (): { updated: number; goals: Goal[] } => {
  const store = loadStore();
  const summary = getAccountSummary();
  const recentMetrics = getRecentDailyMetrics(120);
  const latestMetric = recentMetrics[recentMetrics.length - 1];

  let updated = 0;
  const updatedGoals: Goal[] = [];

  for (const goal of store.goals) {
    if (goal.status !== 'active') continue;

    const now = Date.now();
    if (now < new Date(goal.startsAt).getTime()) continue; // todavía no arrancó
    if (now > new Date(goal.endsAt).getTime()) {
      // Vencida: marcar como failed si no completó
      goal.status = goal.progress >= 100 ? 'completed' : 'failed';
      goal.updatedAt = new Date().toISOString();
      updated++;
      updatedGoals.push(goal);
      continue;
    }

    // Calcular progreso real según métrica
    let progress = 0;
    const baseline = goal.target.baseline ?? 0;
    const target = goal.target.value;
    const span = target - baseline;

    if (goal.target.metric === 'followers' && latestMetric) {
      const gained = latestMetric.followers - baseline;
      progress = span > 0 ? Math.min(100, (gained / span) * 100) : 0;
    } else if (goal.target.metric === 'engagement_rate') {
      progress = target > 0 ? Math.min(100, (summary.avgEngagementRate / target) * 100) : 0;
    } else if (goal.target.metric === 'posts_count') {
      const startTime = new Date(goal.startsAt).getTime();
      const postsInPeriod = getRecentPosts(120).filter((p) => new Date(p.publishedAt).getTime() >= startTime).length;
      progress = target > 0 ? Math.min(100, (postsInPeriod / target) * 100) : 0;
    } else if (goal.target.metric === 'reach_per_post') {
      const startTime = new Date(goal.startsAt).getTime();
      const posts = getRecentPosts(120).filter((p) => new Date(p.publishedAt).getTime() >= startTime);
      if (posts.length > 0) {
        const avgReach = posts.reduce((s, p) => s + p.metrics.reach, 0) / posts.length;
        progress = target > 0 ? Math.min(100, (avgReach / target) * 100) : 0;
      }
    }

    if (Math.abs(progress - goal.progress) >= 1) {
      goal.progress = Math.round(progress);
      goal.updatedAt = new Date().toISOString();

      // Marcar checkpoints pasados
      for (const cp of goal.checkpoints) {
        if (!cp.actualProgress && new Date(cp.date).getTime() <= now) {
          cp.actualProgress = goal.progress;
        }
      }

      if (goal.progress >= 100) {
        goal.status = 'completed';
        goal.completedAt = new Date().toISOString();
      }

      updated++;
      updatedGoals.push(goal);
    }
  }

  if (updated > 0) saveStore(store);
  return { updated, goals: updatedGoals };
};

// ── Health check: ¿voy bien con mis metas? ───────────────────────────────────

export interface GoalHealthCheck {
  goal: Goal;
  expectedProgress: number; // según el tiempo transcurrido
  actualProgress: number;
  delta: number; // actual - expected
  status: 'adelantado' | 'on-track' | 'atrasado' | 'crítico';
  daysRemaining: number;
}

export const checkGoalsHealth = (): GoalHealthCheck[] => {
  const goals = getActiveGoals();
  const now = Date.now();
  return goals.map((g) => {
    const start = new Date(g.startsAt).getTime();
    const end = new Date(g.endsAt).getTime();
    const elapsed = Math.max(0, now - start);
    const total = end - start;
    const expectedProgress = total > 0 ? Math.min(100, (elapsed / total) * 100) : 0;
    const delta = g.progress - expectedProgress;
    const daysRemaining = Math.max(0, Math.ceil((end - now) / 86400000));

    let status: GoalHealthCheck['status'] = 'on-track';
    if (delta >= 10) status = 'adelantado';
    else if (delta <= -25) status = 'crítico';
    else if (delta <= -10) status = 'atrasado';

    return { goal: g, expectedProgress, actualProgress: g.progress, delta, status, daysRemaining };
  });
};

// ── Acciones programadas en transiciones de período ──────────────────────────

export const findGoalsClosingSoon = (withinDays = 1): Goal[] => {
  const goals = getActiveGoals();
  const cutoff = Date.now() + withinDays * 86400000;
  return goals.filter((g) => new Date(g.endsAt).getTime() <= cutoff);
};

export const notifyHealthIssues = async (brand: BrandProfile): Promise<void> => {
  const checks = checkGoalsHealth();
  const critical = checks.filter((c) => c.status === 'crítico');
  if (critical.length === 0) return;

  const body = critical
    .map(
      (c) =>
        `• ${c.goal.title} (${c.goal.horizon}): ${c.actualProgress}% real vs ${Math.round(c.expectedProgress)}% esperado (${c.delta.toFixed(0)} pts). Quedan ${c.daysRemaining} días.`,
    )
    .join('\n');

  await sendAlert({
    severity: 'warn',
    title: `${brand.name}: ${critical.length} meta(s) en estado crítico`,
    body,
    metadata: { critical: critical.map((c) => c.goal.id) },
  }).catch(() => undefined);
};

// ── Snapshot global ──────────────────────────────────────────────────────────

export interface GoalSnapshot {
  active: Record<GoalHorizon, number>;
  completed: Record<GoalHorizon, number>;
  failed: Record<GoalHorizon, number>;
  avgProgress: Record<GoalHorizon, number>;
  health: { crítico: number; atrasado: number; onTrack: number; adelantado: number };
  closingSoon: Goal[];
}

export const getGoalsSnapshot = (): GoalSnapshot => {
  const store = loadStore();
  const horizons: GoalHorizon[] = ['weekly', 'monthly', 'quarterly', 'annual'];

  const count = (status: GoalStatus): Record<GoalHorizon, number> =>
    Object.fromEntries(
      horizons.map((h) => [h, store.goals.filter((g) => g.horizon === h && g.status === status).length]),
    ) as Record<GoalHorizon, number>;

  const avg = (): Record<GoalHorizon, number> =>
    Object.fromEntries(
      horizons.map((h) => {
        const gs = store.goals.filter((g) => g.horizon === h && g.status === 'active');
        const v = gs.length > 0 ? gs.reduce((s, g) => s + g.progress, 0) / gs.length : 0;
        return [h, Math.round(v)];
      }),
    ) as Record<GoalHorizon, number>;

  const checks = checkGoalsHealth();
  const health = {
    crítico: checks.filter((c) => c.status === 'crítico').length,
    atrasado: checks.filter((c) => c.status === 'atrasado').length,
    onTrack: checks.filter((c) => c.status === 'on-track').length,
    adelantado: checks.filter((c) => c.status === 'adelantado').length,
  };

  return {
    active: count('active'),
    completed: count('completed'),
    failed: count('failed'),
    avgProgress: avg(),
    health,
    closingSoon: findGoalsClosingSoon(2),
  };
};

export const exportGoalsState = (): GoalsStore => loadStore();
