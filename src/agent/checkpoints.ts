import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { log } from './logger.js';
import { sendAlert } from '../integrations/notifications.js';
import type { CheckpointType } from './registry.js';

const CHECKPOINTS_FILE = resolve('data/runtime/checkpoints.json');

export type CheckpointStatus = 'pending' | 'approved' | 'rejected' | 'expired';

export interface Checkpoint {
  id: string;
  type: CheckpointType;
  description: string;
  status: CheckpointStatus;
  createdAt: string;
  expiresAt: string;
  resolvedAt?: string;
  correlationId: string;
  payload: Record<string, unknown>;
  resolutionNote?: string;
}

let checkpoints: Checkpoint[] = [];

const ensureDir = (): void => {
  mkdirSync(resolve('data/runtime'), { recursive: true });
};

const load = (): void => {
  if (!existsSync(CHECKPOINTS_FILE)) {
    checkpoints = [];
    return;
  }
  try {
    const raw = readFileSync(CHECKPOINTS_FILE, 'utf-8');
    checkpoints = JSON.parse(raw) as Checkpoint[];
  } catch {
    checkpoints = [];
  }
};

const save = (): void => {
  ensureDir();
  try {
    writeFileSync(CHECKPOINTS_FILE, JSON.stringify(checkpoints, null, 2), 'utf-8');
  } catch (err) {
    log.warn(`No se pudo guardar checkpoints: ${(err as Error).message}`);
  }
};

let seq = 0;
const nextId = (): string => {
  seq += 1;
  return `cp-${Date.now()}-${seq}`;
};

export const createCheckpoint = (
  type: CheckpointType,
  description: string,
  correlationId: string,
  payload: Record<string, unknown> = {},
  expiresInMinutes = 1440, // 24h default
): Checkpoint => {
  load();
  const now = new Date();
  const expires = new Date(now.getTime() + expiresInMinutes * 60000);
  const cp: Checkpoint = {
    id: nextId(),
    type,
    description,
    status: 'pending',
    createdAt: now.toISOString(),
    expiresAt: expires.toISOString(),
    correlationId,
    payload,
  };
  checkpoints.push(cp);
  save();

  // Notify
  sendAlert({
    severity: type === 'crisis_response' ? 'crisis' : 'warn',
    title: `Checkpoint requerido: ${type}`,
    body: `${description}\n\nID: ${cp.id}\nExpira: ${expires.toLocaleString('es-AR')}`,
  }).catch(() => {});

  log.info(`[CHECKPOINT] Creado ${cp.id} (${type}) — expira ${expires.toISOString()}`);
  return cp;
};

export const approveCheckpoint = (id: string, note?: string): Checkpoint | undefined => {
  load();
  const cp = checkpoints.find((c) => c.id === id);
  if (!cp) return undefined;
  if (cp.status !== 'pending') return cp;

  cp.status = 'approved';
  cp.resolvedAt = new Date().toISOString();
  cp.resolutionNote = note;
  save();

  log.success(`[CHECKPOINT] Aprobado ${id}`);
  return cp;
};

export const rejectCheckpoint = (id: string, note?: string): Checkpoint | undefined => {
  load();
  const cp = checkpoints.find((c) => c.id === id);
  if (!cp) return undefined;
  if (cp.status !== 'pending') return cp;

  cp.status = 'rejected';
  cp.resolvedAt = new Date().toISOString();
  cp.resolutionNote = note;
  save();

  log.warn(`[CHECKPOINT] Rechazado ${id}`);
  return cp;
};

export const expireOldCheckpoints = (): number => {
  load();
  const now = new Date().toISOString();
  let count = 0;
  for (const cp of checkpoints) {
    if (cp.status === 'pending' && cp.expiresAt < now) {
      cp.status = 'expired';
      cp.resolvedAt = now;
      count++;
    }
  }
  if (count > 0) {
    save();
    log.warn(`[CHECKPOINT] ${count} checkpoints expirados`);
  }
  return count;
};

export const getCheckpoint = (id: string): Checkpoint | undefined => {
  load();
  return checkpoints.find((c) => c.id === id);
};

export const listCheckpoints = (status?: CheckpointStatus): Checkpoint[] => {
  load();
  expireOldCheckpoints();
  if (!status) return [...checkpoints].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return checkpoints.filter((c) => c.status === status).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
};

export const hasPendingCheckpointsForCorrelation = (correlationId: string): boolean => {
  load();
  expireOldCheckpoints();
  return checkpoints.some((c) => c.correlationId === correlationId && c.status === 'pending');
};

export const waitForCheckpoint = async (
  id: string,
  pollMs = 5000,
  timeoutMs = 300000,
): Promise<Checkpoint | undefined> => {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const cp = getCheckpoint(id);
    if (cp && cp.status !== 'pending') return cp;
    await new Promise((r) => setTimeout(r, pollMs));
  }
  return undefined;
};
