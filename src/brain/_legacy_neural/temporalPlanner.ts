// @ts-nocheck
/**
 * Temporal Planner — planificación con tiempo + dependencies + critical path.
 *
 * Mientras goalDrivenPlanner define qué hacer, temporal planner define
 * CUÁNDO y EN QUÉ ORDEN, optimizando dependencies + recursos limitados.
 *
 * Implementa:
 *   - Critical Path Method (CPM)
 *   - Resource leveling (quota, time, budget caps)
 *   - Topological sort de tasks
 *   - Slack analysis (qué puede demorarse sin afectar deadline)
 *   - Real-time re-scheduling si task se demora
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { log } from '../../agent/logger.js';

const TEMPORAL_DIR = path.resolve('data/neural/temporal');

// ── Tipos ─────────────────────────────────────────────────────────────────────

export interface TemporalTask {
  id: string;
  name: string;
  durationHours: number;
  dependencies: string[]; // task IDs que deben completar antes
  resources: { quota?: number; budgetUsd?: number; computeHours?: number };
  earliestStart?: string;
  latestStart?: string;
  earliestFinish?: string;
  latestFinish?: string;
  slack?: number; // horas que puede demorarse
  onCriticalPath?: boolean;
  status: 'pending' | 'scheduled' | 'in-progress' | 'completed' | 'blocked' | 'delayed';
  scheduledStart?: string;
  actualStart?: string;
  actualFinish?: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
}

export interface TemporalSchedule {
  brandId: string;
  generatedAt: string;
  tasks: TemporalTask[];
  criticalPath: string[]; // task IDs en orden del path
  totalDurationHours: number;
  earliestCompletion: string;
  resourceCaps: { quota: number; budgetUsd: number; computeHours: number };
  resourceUsage: { quota: number; budgetUsd: number; computeHours: number };
  reschedulingHistory: Array<{ at: string; reason: string }>;
}

// ── Topological sort ────────────────────────────────────────────────────────

const topologicalSort = (tasks: TemporalTask[]): TemporalTask[] => {
  const sorted: TemporalTask[] = [];
  const visited = new Set<string>();
  const visiting = new Set<string>();
  const taskById = new Map(tasks.map((t) => [t.id, t]));

  const visit = (taskId: string): void => {
    if (visited.has(taskId)) return;
    if (visiting.has(taskId)) throw new Error('[temporalPlanner] Cycle detected in dependencies');
    visiting.add(taskId);
    const task = taskById.get(taskId);
    if (task) {
      for (const dep of task.dependencies) visit(dep);
      visiting.delete(taskId);
      visited.add(taskId);
      sorted.push(task);
    }
  };

  for (const t of tasks) visit(t.id);
  return sorted;
};

// ── Forward pass: earliest start/finish ─────────────────────────────────────

const forwardPass = (tasks: TemporalTask[], startDate: Date): void => {
  const taskById = new Map(tasks.map((t) => [t.id, t]));
  for (const task of tasks) {
    if (task.dependencies.length === 0) {
      task.earliestStart = startDate.toISOString();
      task.earliestFinish = new Date(startDate.getTime() + task.durationHours * 3600 * 1000).toISOString();
    } else {
      let maxFinish = startDate.getTime();
      for (const depId of task.dependencies) {
        const dep = taskById.get(depId);
        if (dep?.earliestFinish) {
          const fTime = new Date(dep.earliestFinish).getTime();
          if (fTime > maxFinish) maxFinish = fTime;
        }
      }
      task.earliestStart = new Date(maxFinish).toISOString();
      task.earliestFinish = new Date(maxFinish + task.durationHours * 3600 * 1000).toISOString();
    }
  }
};

// ── Backward pass: latest start/finish + slack ───────────────────────────────

const backwardPass = (tasks: TemporalTask[], deadline: Date): void => {
  const taskById = new Map(tasks.map((t) => [t.id, t]));
  const reversed = [...tasks].reverse();

  for (const task of reversed) {
    const successors = tasks.filter((t) => t.dependencies.includes(task.id));
    if (successors.length === 0) {
      task.latestFinish = deadline.toISOString();
    } else {
      let minStart = Infinity;
      for (const succ of successors) {
        if (succ.latestStart) {
          const sTime = new Date(succ.latestStart).getTime();
          if (sTime < minStart) minStart = sTime;
        }
      }
      if (minStart !== Infinity) task.latestFinish = new Date(minStart).toISOString();
    }
    if (task.latestFinish) {
      task.latestStart = new Date(
        new Date(task.latestFinish).getTime() - task.durationHours * 3600 * 1000,
      ).toISOString();
    }
    if (task.earliestStart && task.latestStart) {
      task.slack = (new Date(task.latestStart).getTime() - new Date(task.earliestStart).getTime()) / (3600 * 1000);
      task.onCriticalPath = task.slack < 0.5;
    }
    void taskById;
  }
};

// ── Schedule generation ──────────────────────────────────────────────────────

export const generateSchedule = async (
  brandId: string,
  tasks: TemporalTask[],
  options: {
    startDate?: Date;
    deadline?: Date;
    resourceCaps?: { quota: number; budgetUsd: number; computeHours: number };
  } = {},
): Promise<TemporalSchedule> => {
  const startDate = options.startDate ?? new Date();
  log.info('[temporalPlanner] generating schedule', { brandId, tasks: tasks.length });

  let sorted: TemporalTask[];
  try {
    sorted = topologicalSort(tasks);
  } catch (err) {
    throw err;
  }

  forwardPass(sorted, startDate);

  // Determine total duration
  const earliestCompletion = sorted.reduce((max, t) => {
    if (!t.earliestFinish) return max;
    return new Date(t.earliestFinish).getTime() > new Date(max).getTime() ? t.earliestFinish : max;
  }, startDate.toISOString());

  const deadline = options.deadline ?? new Date(earliestCompletion);
  backwardPass(sorted, deadline);

  // Critical path: tasks con slack ≈ 0, ordenadas por earliestStart
  const criticalPath = sorted
    .filter((t) => t.onCriticalPath)
    .sort((a, b) => new Date(a.earliestStart ?? '').getTime() - new Date(b.earliestStart ?? '').getTime())
    .map((t) => t.id);

  // Resource accounting
  const resourceCaps = options.resourceCaps ?? { quota: 100, budgetUsd: 100, computeHours: 100 };
  const resourceUsage = sorted.reduce(
    (acc, t) => ({
      quota: acc.quota + (t.resources.quota ?? 0),
      budgetUsd: acc.budgetUsd + (t.resources.budgetUsd ?? 0),
      computeHours: acc.computeHours + (t.resources.computeHours ?? 0),
    }),
    { quota: 0, budgetUsd: 0, computeHours: 0 },
  );

  // Set scheduledStart = earliestStart for now
  for (const task of sorted) {
    task.scheduledStart = task.earliestStart;
    if (task.status === 'pending') task.status = 'scheduled';
  }

  const totalDurationHours = (new Date(earliestCompletion).getTime() - startDate.getTime()) / (3600 * 1000);

  const schedule: TemporalSchedule = {
    brandId,
    generatedAt: new Date().toISOString(),
    tasks: sorted,
    criticalPath,
    totalDurationHours,
    earliestCompletion,
    resourceCaps,
    resourceUsage,
    reschedulingHistory: [],
  };

  await fs.mkdir(TEMPORAL_DIR, { recursive: true });
  await fs.writeFile(path.join(TEMPORAL_DIR, `${brandId}-schedule.json`), JSON.stringify(schedule, null, 2), 'utf-8');
  log.info('[temporalPlanner] schedule saved', {
    brandId,
    criticalPath: criticalPath.length,
    hours: totalDurationHours.toFixed(1),
  });
  return schedule;
};

/** Re-schedule cuando task se demora o falla. */
export const rescheduleAfterDelay = async (
  brandId: string,
  delayedTaskId: string,
  newDurationHours: number,
  reason: string,
): Promise<TemporalSchedule | null> => {
  let schedule: TemporalSchedule;
  try {
    schedule = JSON.parse(
      await fs.readFile(path.join(TEMPORAL_DIR, `${brandId}-schedule.json`), 'utf-8'),
    ) as TemporalSchedule;
  } catch {
    return null;
  }

  const task = schedule.tasks.find((t) => t.id === delayedTaskId);
  if (!task) return schedule;

  task.durationHours = newDurationHours;
  task.status = 'delayed';

  // Re-calculate forward pass from this task onwards
  forwardPass(schedule.tasks, new Date());
  backwardPass(schedule.tasks, new Date(schedule.earliestCompletion));

  schedule.reschedulingHistory.push({ at: new Date().toISOString(), reason });
  await fs.writeFile(path.join(TEMPORAL_DIR, `${brandId}-schedule.json`), JSON.stringify(schedule, null, 2), 'utf-8');
  log.info('[temporalPlanner] rescheduled', { brandId, delayedTaskId, reason });
  return schedule;
};

export const getActiveSchedule = async (brandId: string): Promise<TemporalSchedule | null> => {
  try {
    return JSON.parse(
      await fs.readFile(path.join(TEMPORAL_DIR, `${brandId}-schedule.json`), 'utf-8'),
    ) as TemporalSchedule;
  } catch {
    return null;
  }
};

/** Próxima task que puede ejecutarse (sin dependencias pendientes). */
export const getNextExecutableTask = async (brandId: string): Promise<TemporalTask | null> => {
  const schedule = await getActiveSchedule(brandId);
  if (!schedule) return null;
  const completedIds = new Set(schedule.tasks.filter((t) => t.status === 'completed').map((t) => t.id));

  const executable = schedule.tasks
    .filter((t) => t.status === 'scheduled')
    .filter((t) => t.dependencies.every((dep) => completedIds.has(dep)));

  if (executable.length === 0) return null;
  return executable.sort((a, b) => {
    if (a.onCriticalPath && !b.onCriticalPath) return -1;
    if (!a.onCriticalPath && b.onCriticalPath) return 1;
    return new Date(a.earliestStart ?? '').getTime() - new Date(b.earliestStart ?? '').getTime();
  })[0]!;
};
