/**
 * Mission Store
 * ─────────────────────────────────────────────────────────────────────────
 * Persists each "mission" the system has launched — a free-text goal from
 * the user + the decomposed playbook + the run status + reference to the
 * correlation id used by bus/orchestrator. Mission Control reads from here.
 */

import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import type { PlaybookDefinition } from '../../agent/orchestrator.js';
import type { GoalIntent } from './library.js';

export type MissionStatus = 'planned' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface Mission {
  id: string;
  brandId: string;
  freeIntent: string;
  matchedIntent: GoalIntent | 'unknown';
  playbook: PlaybookDefinition;
  /** Correlation id used by the orchestrator (links events + traces). */
  correlationId?: string;
  status: MissionStatus;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  /** Final summary from orchestrator if completed. */
  summary?: string;
  /** Number of tasks completed at last sync. */
  tasksCompleted?: number;
  tasksTotal?: number;
}

interface MissionStoreShape {
  missions: Mission[];
}

const PATH = resolve('data/runtime/missions.json');

const readStore = (): MissionStoreShape => {
  if (!existsSync(PATH)) return { missions: [] };
  try {
    return JSON.parse(readFileSync(PATH, 'utf-8')) as MissionStoreShape;
  } catch {
    return { missions: [] };
  }
};

const writeStore = (s: MissionStoreShape): void => {
  mkdirSync(dirname(PATH), { recursive: true });
  writeFileSync(PATH, JSON.stringify(s, null, 2), 'utf-8');
};

const newId = (): string => `mis-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

/* ──────────────────────────────────────────────────────────────────────── */

export const createMission = (params: {
  brandId: string;
  freeIntent: string;
  matchedIntent: GoalIntent | 'unknown';
  playbook: PlaybookDefinition;
}): Mission => {
  const m: Mission = {
    id: newId(),
    brandId: params.brandId,
    freeIntent: params.freeIntent,
    matchedIntent: params.matchedIntent,
    playbook: params.playbook,
    status: 'planned',
    createdAt: new Date().toISOString(),
    tasksTotal: params.playbook.tasks.length,
    tasksCompleted: 0,
  };
  const s = readStore();
  s.missions.push(m);
  if (s.missions.length > 200) s.missions.splice(0, s.missions.length - 200);
  writeStore(s);
  return m;
};

export const markMissionRunning = (id: string, correlationId: string): Mission | null => {
  const s = readStore();
  const m = s.missions.find((x) => x.id === id);
  if (!m) return null;
  m.status = 'running';
  m.correlationId = correlationId;
  m.startedAt = new Date().toISOString();
  writeStore(s);
  return m;
};

export const markMissionDone = (
  id: string,
  status: 'completed' | 'failed' | 'cancelled',
  summary?: string,
  tasksCompleted?: number,
): Mission | null => {
  const s = readStore();
  const m = s.missions.find((x) => x.id === id);
  if (!m) return null;
  m.status = status;
  m.completedAt = new Date().toISOString();
  if (summary) m.summary = summary;
  if (typeof tasksCompleted === 'number') m.tasksCompleted = tasksCompleted;
  writeStore(s);
  return m;
};

export const listMissions = (filter?: { brandId?: string; status?: MissionStatus; limit?: number }): Mission[] => {
  const all = readStore().missions;
  let filtered = all.filter(
    (m) => (!filter?.brandId || m.brandId === filter.brandId) && (!filter?.status || m.status === filter.status),
  );
  filtered = filtered.slice().sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  return filter?.limit ? filtered.slice(0, filter.limit) : filtered;
};

export const getMissionById = (id: string): Mission | undefined => readStore().missions.find((m) => m.id === id);
