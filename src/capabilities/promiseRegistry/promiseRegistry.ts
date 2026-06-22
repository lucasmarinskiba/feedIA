/**
 * Promise Registry — registro central de promesas hechas a clientes.
 *
 * Cada promesa es un contrato medible: tiene métrica, target, deadline,
 * compensación por incumplimiento y progreso trackeable en tiempo real.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { z } from 'zod';
import { log } from '../../agent/logger.js';
import { audit } from '../../compliance/auditLog.js';

const PROMISES_PATH = join(process.cwd(), 'data', 'runtime', 'promises.json');

// ── Zod schemas ───────────────────────────────────────────────────────────────

export const PromiseMetricSchema = z.object({
  metric: z.string(), // ej: 'followers', 'engagement_rate', 'hours_saved', 'leads'
  target: z.number(), // valor objetivo
  unit: z.string(), // ej: 'seguidores', '%', 'horas', 'leads'
  baseline: z.number().default(0),
});

export const PromiseCompensationSchema = z.object({
  type: z.enum(['refund_pct', 'credit_pct', 'free_months', 'manual_review']),
  value: z.number(), // % o cantidad según type
  description: z.string(), // ej: "50% de descuento en el mes siguiente"
});

export const PromiseStatusSchema = z.enum([
  'pending', // creada, aún no arrancó
  'active', // en período de cumplimiento
  'on-track', // progreso saludable
  'at-risk', // riesgo de incumplimiento
  'breached', // incumplida
  'fulfilled', // cumplida
  'cancelled', // cancelada manualmente
]);

export const PromiseContractSchema = z.object({
  id: z.string(),
  clientId: z.string(),
  clientName: z.string(),
  title: z.string(),
  description: z.string(),
  category: z.enum(['growth', 'engagement', 'leads', 'sales', 'time_saved', 'authority', 'custom']),
  metric: PromiseMetricSchema,
  deadline: z.string(), // ISO date
  compensation: PromiseCompensationSchema,
  status: PromiseStatusSchema,
  progress: z.number().min(0).max(100).default(0),
  remediationCount: z.number().default(0),
  autoRemediationEnabled: z.boolean().default(true),
  createdAt: z.string(),
  updatedAt: z.string(),
  fulfilledAt: z.string().optional(),
  breachedAt: z.string().optional(),
  notes: z.array(z.string()).default([]),
  goalIds: z.array(z.string()).default([]), // linked goals
});

export type PromiseMetric = z.infer<typeof PromiseMetricSchema>;
export type PromiseCompensation = z.infer<typeof PromiseCompensationSchema>;
export type PromiseStatus = z.infer<typeof PromiseStatusSchema>;
export type PromiseContract = z.infer<typeof PromiseContractSchema>;

interface PromiseStore {
  version: number;
  promises: PromiseContract[];
  lastUpdated: string;
}

const DEFAULT_STORE: PromiseStore = {
  version: 1,
  promises: [],
  lastUpdated: new Date().toISOString(),
};

// ── Persistencia ──────────────────────────────────────────────────────────────

const ensureDir = (): void => {
  const dir = join(process.cwd(), 'data', 'runtime');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
};

const loadStore = (): PromiseStore => {
  try {
    ensureDir();
    if (!existsSync(PROMISES_PATH)) return structuredClone(DEFAULT_STORE);
    return JSON.parse(readFileSync(PROMISES_PATH, 'utf8')) as PromiseStore;
  } catch {
    return structuredClone(DEFAULT_STORE);
  }
};

const saveStore = (store: PromiseStore): void => {
  ensureDir();
  store.lastUpdated = new Date().toISOString();
  writeFileSync(PROMISES_PATH, JSON.stringify(store, null, 2), 'utf8');
};

// ── CRUD ──────────────────────────────────────────────────────────────────────

export interface CreatePromiseInput {
  clientId: string;
  clientName: string;
  title: string;
  description: string;
  category: PromiseContract['category'];
  metric: PromiseMetric;
  deadline: string;
  compensation: PromiseCompensation;
  autoRemediationEnabled?: boolean;
  notes?: string[];
}

export const createPromise = (input: CreatePromiseInput): PromiseContract => {
  const store = loadStore();
  const now = new Date().toISOString();

  const promise: PromiseContract = {
    id: `prom-${Date.now()}-${Math.floor(Math.random() * 9999)}`,
    clientId: input.clientId,
    clientName: input.clientName,
    title: input.title,
    description: input.description,
    category: input.category,
    metric: input.metric,
    deadline: input.deadline,
    compensation: input.compensation,
    status: 'active',
    progress: 0,
    remediationCount: 0,
    autoRemediationEnabled: input.autoRemediationEnabled ?? true,
    createdAt: now,
    updatedAt: now,
    notes: input.notes ?? [],
    goalIds: [],
  };

  store.promises.push(promise);
  saveStore(store);

  log.success(`[PromiseRegistry] Creada promesa ${promise.id}: ${promise.title}`);
  audit({
    action: 'API_REQUEST',
    outcome: 'success',
    reason: `PROMISE_CREATED: ${promise.id} — ${promise.title}`,
    contentSummary: sanitizeForPromiseAudit(promise),
  });

  return promise;
};

export const getPromise = (id: string): PromiseContract | null => {
  const store = loadStore();
  return store.promises.find((p) => p.id === id) ?? null;
};

export const updatePromise = (
  id: string,
  patch: Partial<Pick<PromiseContract, 'status' | 'progress' | 'remediationCount' | 'notes' | 'goalIds'>>,
): PromiseContract | null => {
  const store = loadStore();
  const promise = store.promises.find((p) => p.id === id);
  if (!promise) return null;

  if (patch.status !== undefined) promise.status = patch.status;
  if (patch.progress !== undefined) promise.progress = Math.max(0, Math.min(100, patch.progress));
  if (patch.remediationCount !== undefined) promise.remediationCount = patch.remediationCount;
  if (patch.notes !== undefined) promise.notes = patch.notes;
  if (patch.goalIds !== undefined) promise.goalIds = patch.goalIds;

  promise.updatedAt = new Date().toISOString();

  if (patch.status === 'fulfilled' && !promise.fulfilledAt) {
    promise.fulfilledAt = promise.updatedAt;
  }
  if (patch.status === 'breached' && !promise.breachedAt) {
    promise.breachedAt = promise.updatedAt;
  }

  saveStore(store);

  log.info(`[PromiseRegistry] Actualizada ${id}: status=${promise.status}, progress=${promise.progress}%`);
  audit({
    action: 'API_REQUEST',
    outcome: 'success',
    reason: `PROMISE_UPDATED: ${id} → ${promise.status}`,
  });

  return promise;
};

export const listPromises = (filters?: {
  clientId?: string;
  status?: PromiseStatus;
  category?: PromiseContract['category'];
}): PromiseContract[] => {
  let promises = loadStore().promises;
  if (filters?.clientId) promises = promises.filter((p) => p.clientId === filters.clientId);
  if (filters?.status) promises = promises.filter((p) => p.status === filters.status);
  if (filters?.category) promises = promises.filter((p) => p.category === filters.category);
  return promises.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
};

export const getActivePromises = (): PromiseContract[] =>
  listPromises().filter((p) => ['pending', 'active', 'on-track', 'at-risk'].includes(p.status));

export const cancelPromise = (id: string, reason: string): PromiseContract | null => {
  const promise = updatePromise(id, { status: 'cancelled' });
  if (promise) {
    promise.notes.push(`[${new Date().toISOString()}] Cancelada: ${reason}`);
    saveStore(loadStore());
    log.warn(`[PromiseRegistry] Promesa ${id} cancelada: ${reason}`);
  }
  return promise;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

export const sanitizeForPromiseAudit = (promise: PromiseContract): string => {
  const text = `${promise.title} | ${promise.description} | target=${promise.metric.target}${promise.metric.unit}`;
  return text.slice(0, 200);
};

export const getPromiseStoreSnapshot = (): PromiseStore => loadStore();
