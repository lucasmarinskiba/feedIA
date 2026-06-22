/**
 * Automation Scheduler — cron + event-driven jobs sin LLM.
 *
 * Programa:
 *   - jobs cron (cada N horas/días)
 *   - jobs event-driven (gatillo: trigger-fired)
 *   - jobs one-shot (en fecha específica)
 *
 * Persistente. Sobrevive reinicios.
 *
 * tick() debe llamarse periódicamente (recomendado: cada 60s).
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { log } from '../../agent/logger.js';

const AUTOMATION_DIR = path.resolve('data/neural/automation');

export type JobStatus = 'idle' | 'queued' | 'running' | 'completed' | 'failed' | 'paused';
export type JobKind = 'cron' | 'event' | 'one-shot';
export type JobAction =
  | 'invoke-skill'
  | 'consolidate-memory'
  | 'evaluate-emergent-behavior'
  | 'analyze-metrics'
  | 'health-check'
  | 'submit-task'
  | 'webhook';

export interface AutomationJob {
  id: string;
  brandId: string;
  name: string;
  kind: JobKind;
  action: JobAction;
  actionPayload: Record<string, unknown>;
  schedule?: {
    intervalMs?: number;
    nextRunAt?: string;
    cronExpression?: string;
  };
  eventTrigger?: string;
  oneShotAt?: string;
  status: JobStatus;
  enabled: boolean;
  lastRunAt?: string;
  runCount: number;
  failureCount: number;
  lastError?: string;
  createdAt: string;
  maxConcurrent: number;
  cooldownMs?: number;
}

export interface JobExecution {
  jobId: string;
  startedAt: string;
  finishedAt?: string;
  success: boolean;
  output?: unknown;
  error?: string;
  durationMs: number;
}

const jobsPath = (brandId: string): string => path.join(AUTOMATION_DIR, `${brandId}-jobs.json`);
const executionsPath = (brandId: string): string => path.join(AUTOMATION_DIR, `${brandId}-executions.json`);

const loadJobs = async (brandId: string): Promise<AutomationJob[]> => {
  try {
    return JSON.parse(await fs.readFile(jobsPath(brandId), 'utf-8')) as AutomationJob[];
  } catch {
    return [];
  }
};

const saveJobs = async (brandId: string, jobs: AutomationJob[]): Promise<void> => {
  await fs.mkdir(AUTOMATION_DIR, { recursive: true });
  await fs.writeFile(jobsPath(brandId), JSON.stringify(jobs, null, 2), 'utf-8');
};

const recordExecution = async (brandId: string, exec: JobExecution): Promise<void> => {
  const file = executionsPath(brandId);
  let history: JobExecution[] = [];
  try {
    history = JSON.parse(await fs.readFile(file, 'utf-8')) as JobExecution[];
  } catch {
    /* noop */
  }
  history.push(exec);
  await fs.mkdir(AUTOMATION_DIR, { recursive: true });
  await fs.writeFile(file, JSON.stringify(history.slice(-500), null, 2), 'utf-8');
};

export const createJob = async (
  brandId: string,
  job: Omit<AutomationJob, 'id' | 'status' | 'runCount' | 'failureCount' | 'createdAt'>,
): Promise<AutomationJob> => {
  const newJob: AutomationJob = {
    ...job,
    id: `job-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    status: 'idle',
    runCount: 0,
    failureCount: 0,
    createdAt: new Date().toISOString(),
  };
  if (newJob.kind === 'cron' && newJob.schedule?.intervalMs) {
    newJob.schedule.nextRunAt = new Date(Date.now() + newJob.schedule.intervalMs).toISOString();
  }
  const jobs = await loadJobs(brandId);
  jobs.push(newJob);
  await saveJobs(brandId, jobs);
  log.info('[automationScheduler] job created', { brandId, jobId: newJob.id, name: newJob.name });
  return newJob;
};

export const updateJob = async (
  brandId: string,
  jobId: string,
  updates: Partial<AutomationJob>,
): Promise<AutomationJob | null> => {
  const jobs = await loadJobs(brandId);
  const job = jobs.find((j) => j.id === jobId);
  if (!job) return null;
  Object.assign(job, updates);
  await saveJobs(brandId, jobs);
  return job;
};

export const deleteJob = async (brandId: string, jobId: string): Promise<boolean> => {
  const jobs = await loadJobs(brandId);
  const idx = jobs.findIndex((j) => j.id === jobId);
  if (idx === -1) return false;
  jobs.splice(idx, 1);
  await saveJobs(brandId, jobs);
  return true;
};

const isJobDue = (job: AutomationJob, now = Date.now()): boolean => {
  if (!job.enabled || job.status === 'paused' || job.status === 'running') return false;
  if (job.kind === 'cron') {
    if (!job.schedule?.nextRunAt) return false;
    return now >= new Date(job.schedule.nextRunAt).getTime();
  }
  if (job.kind === 'one-shot') {
    if (!job.oneShotAt) return false;
    return now >= new Date(job.oneShotAt).getTime() && job.runCount === 0;
  }
  return false;
};

const executeJobAction = async (job: AutomationJob, invokers: ActionInvokers): Promise<unknown> => {
  switch (job.action) {
    case 'invoke-skill':
      return invokers.invokeSkill?.(job.brandId, job.actionPayload) ?? null;
    case 'consolidate-memory':
      return invokers.consolidateMemory?.(job.brandId) ?? null;
    case 'evaluate-emergent-behavior':
      return invokers.evaluateEmergent?.(job.brandId, job.actionPayload) ?? null;
    case 'analyze-metrics':
      return invokers.analyzeMetrics?.(job.brandId, job.actionPayload) ?? null;
    case 'health-check':
      return invokers.healthCheck?.(job.brandId) ?? { ok: true };
    case 'submit-task':
      return invokers.submitTask?.(job.brandId, job.actionPayload) ?? null;
    case 'webhook':
      return invokers.webhook?.(job.actionPayload) ?? null;
    default:
      return null;
  }
};

export interface ActionInvokers {
  invokeSkill?: (brandId: string, payload: Record<string, unknown>) => Promise<unknown>;
  consolidateMemory?: (brandId: string) => Promise<unknown>;
  evaluateEmergent?: (brandId: string, payload: Record<string, unknown>) => Promise<unknown>;
  analyzeMetrics?: (brandId: string, payload: Record<string, unknown>) => Promise<unknown>;
  healthCheck?: (brandId: string) => Promise<unknown>;
  submitTask?: (brandId: string, payload: Record<string, unknown>) => Promise<unknown>;
  webhook?: (payload: Record<string, unknown>) => Promise<unknown>;
}

export const tick = async (brandId: string, invokers: ActionInvokers = {}): Promise<JobExecution[]> => {
  const jobs = await loadJobs(brandId);
  const now = Date.now();
  const dueJobs = jobs.filter((j) => isJobDue(j, now));
  const executions: JobExecution[] = [];

  for (const job of dueJobs) {
    job.status = 'running';
    const startedAt = new Date().toISOString();
    const exec: JobExecution = { jobId: job.id, startedAt, success: false, durationMs: 0 };
    try {
      const output = await executeJobAction(job, invokers);
      exec.finishedAt = new Date().toISOString();
      exec.success = true;
      exec.output = output;
      exec.durationMs = new Date(exec.finishedAt).getTime() - new Date(startedAt).getTime();
      job.runCount++;
      job.lastRunAt = exec.finishedAt;
      job.status = 'idle';
    } catch (err) {
      exec.finishedAt = new Date().toISOString();
      exec.success = false;
      exec.error = err instanceof Error ? err.message : String(err);
      exec.durationMs = new Date(exec.finishedAt).getTime() - new Date(startedAt).getTime();
      job.failureCount++;
      job.lastError = exec.error;
      job.status = 'failed';
    }
    if (job.kind === 'cron' && job.schedule?.intervalMs) {
      job.schedule.nextRunAt = new Date(now + job.schedule.intervalMs).toISOString();
      if (job.status !== 'failed') job.status = 'idle';
    }
    executions.push(exec);
    await recordExecution(brandId, exec);
  }

  await saveJobs(brandId, jobs);
  if (executions.length > 0) {
    log.info('[automationScheduler] tick complete', { brandId, executed: executions.length });
  }
  return executions;
};

export const triggerEventJobs = async (
  brandId: string,
  eventName: string,
  invokers: ActionInvokers = {},
): Promise<JobExecution[]> => {
  const jobs = await loadJobs(brandId);
  const matching = jobs.filter((j) => j.kind === 'event' && j.eventTrigger === eventName && j.enabled);
  const executions: JobExecution[] = [];
  for (const job of matching) {
    const startedAt = new Date().toISOString();
    const exec: JobExecution = { jobId: job.id, startedAt, success: false, durationMs: 0 };
    try {
      const output = await executeJobAction(job, invokers);
      exec.finishedAt = new Date().toISOString();
      exec.success = true;
      exec.output = output;
      exec.durationMs = new Date(exec.finishedAt).getTime() - new Date(startedAt).getTime();
      job.runCount++;
      job.lastRunAt = exec.finishedAt;
    } catch (err) {
      exec.finishedAt = new Date().toISOString();
      exec.success = false;
      exec.error = err instanceof Error ? err.message : String(err);
      exec.durationMs = new Date(exec.finishedAt).getTime() - new Date(startedAt).getTime();
      job.failureCount++;
      job.lastError = exec.error;
    }
    executions.push(exec);
    await recordExecution(brandId, exec);
  }
  if (matching.length > 0) await saveJobs(brandId, jobs);
  return executions;
};

export const listJobs = async (
  brandId: string,
  filter: { enabled?: boolean; kind?: JobKind } = {},
): Promise<AutomationJob[]> => {
  const jobs = await loadJobs(brandId);
  return jobs.filter((j) => {
    if (filter.enabled !== undefined && j.enabled !== filter.enabled) return false;
    if (filter.kind && j.kind !== filter.kind) return false;
    return true;
  });
};

export const getJobExecutions = async (brandId: string, jobId?: string, limit = 50): Promise<JobExecution[]> => {
  try {
    const all = JSON.parse(await fs.readFile(executionsPath(brandId), 'utf-8')) as JobExecution[];
    const filtered = jobId ? all.filter((e) => e.jobId === jobId) : all;
    return filtered.slice(-limit).reverse();
  } catch {
    return [];
  }
};

export const seedDefaultJobs = async (brandId: string): Promise<AutomationJob[]> => {
  const existing = await loadJobs(brandId);
  if (existing.length > 0) return existing;

  const defaults: Array<Omit<AutomationJob, 'id' | 'status' | 'runCount' | 'failureCount' | 'createdAt'>> = [
    {
      brandId,
      name: 'Memory consolidation hourly',
      kind: 'cron',
      action: 'consolidate-memory',
      actionPayload: {},
      schedule: { intervalMs: 60 * 60 * 1000 },
      enabled: true,
      maxConcurrent: 1,
    },
    {
      brandId,
      name: 'Emergent behavior eval every 5min',
      kind: 'cron',
      action: 'evaluate-emergent-behavior',
      actionPayload: {},
      schedule: { intervalMs: 5 * 60 * 1000 },
      enabled: true,
      maxConcurrent: 1,
    },
    {
      brandId,
      name: 'Health check every 15min',
      kind: 'cron',
      action: 'health-check',
      actionPayload: {},
      schedule: { intervalMs: 15 * 60 * 1000 },
      enabled: true,
      maxConcurrent: 1,
    },
    {
      brandId,
      name: 'Daily metrics analysis',
      kind: 'cron',
      action: 'analyze-metrics',
      actionPayload: { window: '24h' },
      schedule: { intervalMs: 24 * 60 * 60 * 1000 },
      enabled: true,
      maxConcurrent: 1,
    },
  ];

  const created: AutomationJob[] = [];
  for (const d of defaults) created.push(await createJob(brandId, d));
  return created;
};
