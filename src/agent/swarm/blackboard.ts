/**
 * Swarm Blackboard — memoria de trabajo compartida por misión
 * ─────────────────────────────────────────────────────────────────────────
 * Patrón pizarra (blackboard architecture): cada misión autónoma tiene un
 * espacio común donde los agentes publican hechos, artefactos, riesgos,
 * decisiones y métricas. El conductor inyecta un resumen compacto de la
 * pizarra en el goal de cada tarea siguiente, así un agente "ve" lo que
 * produjeron los anteriores sin pasar todo el historial de mensajes.
 *
 * Persistido en disco (capado) para que Mission Control y los reportes
 * puedan auditar cómo se construyó cada resultado.
 */

import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';

export type BlackboardKind = 'fact' | 'artifact' | 'risk' | 'decision' | 'metric';

export interface BlackboardEntry {
  kind: BlackboardKind;
  /** Agente o subsistema que publicó la entrada. */
  by: string;
  at: string;
  /** Etiqueta corta legible (p.ej. "carrusel.id", "audiencia.mejor_hora"). */
  label: string;
  /** Valor: texto, número u objeto serializable. */
  value: unknown;
}

export interface Blackboard {
  missionId: string;
  objective: string;
  brandId: string;
  createdAt: string;
  entries: BlackboardEntry[];
}

interface Store {
  boards: Blackboard[];
}

const PATH = resolve('data/runtime/swarmBlackboard.json');
const MAX_BOARDS = 60;
const MAX_ENTRIES = 120;

const read = (): Store => {
  if (!existsSync(PATH)) return { boards: [] };
  try {
    return JSON.parse(readFileSync(PATH, 'utf-8')) as Store;
  } catch {
    return { boards: [] };
  }
};

const write = (s: Store): void => {
  mkdirSync(dirname(PATH), { recursive: true });
  if (s.boards.length > MAX_BOARDS) s.boards.splice(0, s.boards.length - MAX_BOARDS);
  writeFileSync(PATH, JSON.stringify(s, null, 2), 'utf-8');
};

export const initBlackboard = (missionId: string, objective: string, brandId: string): Blackboard => {
  const s = read();
  const existing = s.boards.find((b) => b.missionId === missionId);
  if (existing) return existing;
  const board: Blackboard = {
    missionId,
    objective,
    brandId,
    createdAt: new Date().toISOString(),
    entries: [],
  };
  s.boards.push(board);
  write(s);
  return board;
};

export const post = (missionId: string, entry: Omit<BlackboardEntry, 'at'>): void => {
  const s = read();
  const board = s.boards.find((b) => b.missionId === missionId);
  if (!board) return;
  board.entries.push({ ...entry, at: new Date().toISOString() });
  if (board.entries.length > MAX_ENTRIES) {
    board.entries.splice(0, board.entries.length - MAX_ENTRIES);
  }
  write(s);
};

export const getBlackboard = (missionId: string): Blackboard | undefined =>
  read().boards.find((b) => b.missionId === missionId);

const truncate = (v: unknown, max = 280): string => {
  const txt = typeof v === 'string' ? v : JSON.stringify(v);
  return txt.length > max ? `${txt.slice(0, max)}…` : txt;
};

/**
 * Resumen compacto para inyectar en el prompt del próximo agente.
 * Prioriza decisiones y artefactos sobre hechos sueltos.
 */
export const summarizeBlackboard = (missionId: string): string => {
  const board = read().boards.find((b) => b.missionId === missionId);
  if (!board || board.entries.length === 0) return 'Pizarra vacía (sos el primero en aportar).';

  const order: Record<BlackboardKind, number> = {
    decision: 0,
    artifact: 1,
    risk: 2,
    metric: 3,
    fact: 4,
  };
  const sorted = [...board.entries].sort((a, b) => order[a.kind] - order[b.kind]);
  const icon: Record<BlackboardKind, string> = {
    decision: '🧭',
    artifact: '📦',
    risk: '⚠️',
    metric: '📊',
    fact: '•',
  };
  return sorted
    .slice(0, 30)
    .map((e) => `${icon[e.kind]} [${e.by}] ${e.label}: ${truncate(e.value)}`)
    .join('\n');
};
