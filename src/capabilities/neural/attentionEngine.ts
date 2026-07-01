/**
 * Neural Attention Engine — Prioriza tareas, agentes y acciones
 * Simula attention mechanisms para decidir qué merece foco ahora.
 */

import { log } from '../../agent/logger.js';

export interface AttentionRequest {
  taskId: string;
  agentId: string;
  goal: string;
  urgency: number; // 1-10
  impact: number; // 1-10
  effort: number; // 1-10 (menor = menos esfuerzo)
  deadline?: string;
  contextRelevance: number; // 0-1, qué tan relevante es para el contexto actual
}

export interface AttentionScore {
  taskId: string;
  agentId: string;
  score: number; // 0-100
  rank: number;
  reason: string;
}

const WEIGHTS = {
  urgency: 0.3,
  impact: 0.25,
  ease: 0.2, // invertido de effort
  context: 0.15,
  deadline: 0.1,
};

export const scoreAttention = (req: AttentionRequest): number => {
  const ease = Math.max(1, 11 - req.effort);
  const deadlineBonus = req.deadline
    ? Math.max(0, 10 - (new Date(req.deadline).getTime() - Date.now()) / (1000 * 60 * 60))
    : 5;

  return Math.round(
    req.urgency * WEIGHTS.urgency * 10 +
      req.impact * WEIGHTS.impact * 10 +
      ease * WEIGHTS.ease * 10 +
      req.contextRelevance * 100 * WEIGHTS.context +
      deadlineBonus * WEIGHTS.deadline * 10,
  );
};

export const rankTasks = (requests: AttentionRequest[]): AttentionScore[] => {
  const scored = requests.map((r) => ({
    taskId: r.taskId,
    agentId: r.agentId,
    score: scoreAttention(r),
    rank: 0,
    reason: `urgency=${r.urgency} impact=${r.impact} effort=${r.effort} context=${(r.contextRelevance * 100).toFixed(0)}%`,
  }));

  scored.sort((a, b) => b.score - a.score);
  scored.forEach((s, i) => {
    s.rank = i + 1;
  });

  log.info(`[Attention] Ranked ${scored.length} tasks. Top: ${scored[0]?.taskId} (score ${scored[0]?.score})`);
  return scored;
};

export const selectTopTask = (requests: AttentionRequest[]): AttentionScore | undefined => {
  const ranked = rankTasks(requests);
  return ranked[0];
};

export const shouldSwitchFocus = (currentTaskScore: number, newTaskScore: number, threshold = 15): boolean => newTaskScore - currentTaskScore > threshold;

export interface FocusWindow {
  taskId: string;
  agentId: string;
  startedAt: string;
  estimatedDurationMin: number;
  interruptions: number;
}

const activeFocus: Map<string, FocusWindow> = new Map();

export const startFocus = (taskId: string, agentId: string, estimatedMin: number): FocusWindow => {
  const window: FocusWindow = {
    taskId,
    agentId,
    startedAt: new Date().toISOString(),
    estimatedDurationMin: estimatedMin,
    interruptions: 0,
  };
  activeFocus.set(taskId, window);
  log.info(`[Attention] Focus started: ${taskId} by ${agentId} (~${estimatedMin}min)`);
  return window;
};

export const interruptFocus = (taskId: string, reason: string): void => {
  const focus = activeFocus.get(taskId);
  if (focus) {
    focus.interruptions++;
    log.info(`[Attention] Focus interrupted: ${taskId} (${reason}). Count: ${focus.interruptions}`);
  }
};

export const endFocus = (taskId: string): FocusWindow | undefined => {
  const focus = activeFocus.get(taskId);
  activeFocus.delete(taskId);
  if (focus) {
    log.info(
      `[Attention] Focus ended: ${taskId}. Duration: ${focus.estimatedDurationMin}min. Interruptions: ${focus.interruptions}`,
    );
  }
  return focus;
};

export const getActiveFocus = (): FocusWindow[] => Array.from(activeFocus.values());
