import cron, { type ScheduledTask } from 'node-cron';
import { mkdirSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { log } from '../agent/logger.js';
import { sendAlert } from '../integrations/notifications.js';
import type { BrandProfile } from '../config/types.js';
import { jobs, findJob, type JobDefinition, type JobName } from './jobs.js';

export interface JobOverride {
  name: JobName;
  cron: string;
  enabled: boolean;
}

export interface JobRunRecord {
  name: JobName;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  ok: boolean;
  error?: string;
}

const HISTORY_PATH = resolve('data/runtime/scheduler-history.json');
const OVERRIDES_PATH = resolve('data/runtime/scheduler-overrides.json');

const ensureDir = (): void => {
  mkdirSync(resolve('data/runtime'), { recursive: true });
};

const loadHistory = (): JobRunRecord[] =>
  existsSync(HISTORY_PATH) ? (JSON.parse(readFileSync(HISTORY_PATH, 'utf-8')) as JobRunRecord[]) : [];

const saveHistory = (records: JobRunRecord[]): void => {
  ensureDir();
  writeFileSync(HISTORY_PATH, JSON.stringify(records.slice(-200), null, 2), 'utf-8');
};

export const loadOverrides = (): JobOverride[] =>
  existsSync(OVERRIDES_PATH) ? (JSON.parse(readFileSync(OVERRIDES_PATH, 'utf-8')) as JobOverride[]) : [];

export const saveOverrides = (overrides: JobOverride[]): void => {
  ensureDir();
  writeFileSync(OVERRIDES_PATH, JSON.stringify(overrides, null, 2), 'utf-8');
};

export const setJobOverride = (override: JobOverride): JobOverride[] => {
  const all = loadOverrides();
  const idx = all.findIndex((o) => o.name === override.name);
  if (idx >= 0) all[idx] = override;
  else all.push(override);
  saveOverrides(all);
  return all;
};

const recordRun = (record: JobRunRecord): void => {
  const all = loadHistory();
  all.push(record);
  saveHistory(all);
};

const runJobOnce = async (job: JobDefinition, brand: BrandProfile): Promise<JobRunRecord> => {
  const start = Date.now();
  const record: JobRunRecord = {
    name: job.name,
    startedAt: new Date(start).toISOString(),
    finishedAt: '',
    durationMs: 0,
    ok: false,
  };
  try {
    log.step(`Job ${job.name} iniciando`);
    await job.handler(brand);
    record.ok = true;
    log.success(`Job ${job.name} ok (${Date.now() - start}ms)`);
  } catch (err) {
    record.error = (err as Error).message;
    log.error(`Job ${job.name} falló: ${record.error}`);
    await sendAlert({
      severity: 'warn',
      title: `Scheduler: job ${job.name} falló`,
      body: record.error,
    });
  } finally {
    record.finishedAt = new Date().toISOString();
    record.durationMs = Date.now() - start;
    recordRun(record);
  }
  return record;
};

export interface SchedulerHandle {
  tasks: Map<JobName, ScheduledTask>;
  stop: () => void;
}

const resolveCron = (job: JobDefinition, overrides: JobOverride[]): string => {
  const override = overrides.find((o) => o.name === job.name);
  return override?.cron ?? job.defaultCron;
};

const isEnabled = (job: JobDefinition, overrides: JobOverride[]): boolean => {
  const override = overrides.find((o) => o.name === job.name);
  return override ? override.enabled : true;
};

export const startScheduler = (brand: BrandProfile): SchedulerHandle => {
  const overrides = loadOverrides();
  const tasks = new Map<JobName, ScheduledTask>();

  for (const job of jobs) {
    if (!isEnabled(job, overrides)) {
      log.info(`Scheduler: ${job.name} deshabilitado por override`);
      continue;
    }
    const expr = resolveCron(job, overrides);
    if (!cron.validate(expr)) {
      log.error(`Scheduler: cron inválido para ${job.name}: ${expr}`);
      continue;
    }
    log.info(`Scheduler: ${job.name} → ${expr}`);
    const task = cron.schedule(
      expr,
      () => {
        void runJobOnce(job, brand);
      },
      { timezone: process.env['TIMEZONE'] ?? 'America/Argentina/Buenos_Aires' },
    );
    tasks.set(job.name, task);
  }

  const stop = (): void => {
    for (const task of tasks.values()) task.stop();
  };
  return { tasks, stop };
};

export const runJobByName = async (name: string, brand: BrandProfile): Promise<JobRunRecord> => {
  const job = findJob(name);
  if (!job) throw new Error(`Job desconocido: ${name}`);
  return runJobOnce(job, brand);
};

export const listJobs = (): Array<JobDefinition & { override?: JobOverride }> => {
  const overrides = loadOverrides();
  return jobs.map((j) => {
    const override = overrides.find((o) => o.name === j.name);
    return override ? { ...j, override } : j;
  });
};

export const recentRuns = (limit = 50): JobRunRecord[] => loadHistory().slice(-limit).reverse();
