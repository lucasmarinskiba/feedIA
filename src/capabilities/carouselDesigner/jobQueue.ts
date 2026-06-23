/**
 * Job Queue — In-memory carousel processing with disk persistence (Vercel /tmp fallback).
 * Handles async carousel generation, status tracking, cleanup.
 */

import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'fs';
import { join } from 'path';
import { randomUUID } from 'crypto';

export interface CarouselJobInput {
  prompt: string;
  brandId?: string;
  style?: 'warm-organic' | 'bold-playful' | 'dark-premium' | 'clean-editorial';
  slideCount?: number;
  animationStyle?: 'fade' | 'slideLeft' | 'slideUp' | 'zoom' | 'rotate';
  includeVideo?: boolean;
  includeMusic?: boolean;
}

export interface CarouselJobExports {
  htmlPreview?: string;
  slides?: string[]; // File paths or URLs
  mp4Url?: string;
  cssFile?: string;
  zipUrl?: string;
  zipPath?: string;
}

export interface CarouselJob {
  id: string;
  input: CarouselJobInput;
  status: 'queued' | 'running' | 'done' | 'error';
  slides?: any[];
  animations?: any;
  exports?: CarouselJobExports;
  aestheticScore?: number;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  error?: string;
  progress?: number; // 0-100
  log?: string[];
}

const JOBS_DIR = process.env.VERCEL ? join('/tmp', 'carousel-jobs') : join(process.cwd(), 'data', 'carousel-jobs');
const JOBS_INDEX_FILE = join(JOBS_DIR, 'jobs.json');

// In-memory cache
const jobs = new Map<string, CarouselJob>();

const ensureDir = (): void => {
  if (!existsSync(JOBS_DIR)) {
    mkdirSync(JOBS_DIR, { recursive: true });
  }
};

const loadJobsFromDisk = (): void => {
  ensureDir();
  if (existsSync(JOBS_INDEX_FILE)) {
    try {
      const data = readFileSync(JOBS_INDEX_FILE, 'utf8');
      const jobsList = JSON.parse(data) as CarouselJob[];
      jobsList.forEach((job) => jobs.set(job.id, job));
    } catch {
      // Ignore corrupted index, start fresh
    }
  }
};

const persistJobsToDisk = (): void => {
  ensureDir();
  try {
    const jobsList = Array.from(jobs.values());
    writeFileSync(JOBS_INDEX_FILE, JSON.stringify(jobsList, null, 2), 'utf8');
  } catch {
    // Silently fail, memory cache still works
  }
};

/**
 * Create new carousel job and queue it.
 */
export const createJob = (input: CarouselJobInput): CarouselJob => {
  const job: CarouselJob = {
    id: `carousel-${randomUUID().slice(0, 8)}`,
    input,
    status: 'queued',
    createdAt: new Date().toISOString(),
    log: [],
    progress: 0,
  };

  jobs.set(job.id, job);
  persistJobsToDisk();
  return job;
};

/**
 * Get job by ID.
 */
export const getJob = (jobId: string): CarouselJob | undefined => {
  return jobs.get(jobId);
};

/**
 * Update job status + progress.
 */
export const updateJob = (jobId: string, updates: Partial<CarouselJob>): CarouselJob | undefined => {
  const job = jobs.get(jobId);
  if (!job) return undefined;

  const updated = { ...job, ...updates };
  jobs.set(jobId, updated);
  persistJobsToDisk();
  return updated;
};

/**
 * Start processing job (mark as running).
 */
export const startJob = (jobId: string): CarouselJob | undefined => {
  return updateJob(jobId, {
    status: 'running',
    startedAt: new Date().toISOString(),
    progress: 5,
  });
};

/**
 * Mark job as done with exports.
 */
export const completeJob = (
  jobId: string,
  data: {
    slides?: any[];
    animations?: any;
    exports?: CarouselJobExports;
    aestheticScore?: number;
  },
): CarouselJob | undefined => {
  return updateJob(jobId, {
    status: 'done',
    completedAt: new Date().toISOString(),
    progress: 100,
    ...data,
  });
};

/**
 * Mark job as failed.
 */
export const failJob = (jobId: string, error: string): CarouselJob | undefined => {
  return updateJob(jobId, {
    status: 'error',
    error,
    completedAt: new Date().toISOString(),
  });
};

/**
 * Add log entry to job.
 */
export const addLog = (jobId: string, message: string): void => {
  const job = jobs.get(jobId);
  if (!job) return;

  if (!job.log) job.log = [];
  job.log.push(`[${new Date().toISOString()}] ${message}`);
  persistJobsToDisk();
};

/**
 * Update job progress (0-100).
 */
export const updateProgress = (jobId: string, progress: number): void => {
  const job = jobs.get(jobId);
  if (!job) return;

  job.progress = Math.min(100, Math.max(0, progress));
  persistJobsToDisk();
};

/**
 * List recent jobs (last N, optionally filter by status).
 */
export const listJobs = (limit: number = 20, status?: string): CarouselJob[] => {
  let result = Array.from(jobs.values());

  if (status) {
    result = result.filter((j) => j.status === status);
  }

  return result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, limit);
};

/**
 * Cleanup old jobs (older than 24h).
 */
export const cleanupOldJobs = (ageHours: number = 24): number => {
  const cutoff = Date.now() - ageHours * 60 * 60 * 1000;
  let removed = 0;

  for (const [id, job] of jobs.entries()) {
    if (new Date(job.createdAt).getTime() < cutoff) {
      jobs.delete(id);
      removed++;
    }
  }

  if (removed > 0) {
    persistJobsToDisk();
  }

  return removed;
};

// Initialize on load
loadJobsFromDisk();

// Auto-cleanup old jobs every hour
setInterval(() => {
  cleanupOldJobs(24);
}, 60 * 60 * 1000);

export const jobQueue = {
  createJob,
  getJob,
  updateJob,
  startJob,
  completeJob,
  failJob,
  addLog,
  updateProgress,
  listJobs,
  cleanupOldJobs,
};
