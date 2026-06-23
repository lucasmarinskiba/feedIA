/**
 * Job Queue — In-memory + disk persistence for Vercel serverless.
 * Handles async carousel generation with polling.
 */

import { writeFileSync, readFileSync, existsSync, unlinkSync } from 'fs';
import { join } from 'path';

export interface CarouselJob {
  id: string;
  prompt: string;
  status: 'queued' | 'running' | 'done' | 'error';
  slides?: any[];
  animations?: any;
  exports?: {
    htmlPreview?: string;
    slides?: string[];
    mp4Url?: string;
    cssFile?: string;
    zipUrl?: string;
  };
  aestheticScore?: number;
  readyToPublish?: boolean;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  error?: string;
  progress: number;
  log: string[];
}

const JOBS = new Map<string, CarouselJob>();
const TEMP_DIR = '/tmp/feedia-carousel-jobs';

const ensureTempDir = (): void => {
  try {
    if (!existsSync(TEMP_DIR)) {
      const fs = require('fs');
      fs.mkdirSync(TEMP_DIR, { recursive: true });
    }
  } catch (err) {
    // Fallback
  }
};

const persistJob = (job: CarouselJob): void => {
  try {
    ensureTempDir();
    const filePath = join(TEMP_DIR, `${job.id}.json`);
    writeFileSync(filePath, JSON.stringify(job), 'utf8');
  } catch (err) {
    // Silent fail
  }
};

const loadJobFromDisk = (jobId: string): CarouselJob | null => {
  try {
    ensureTempDir();
    const filePath = join(TEMP_DIR, `${jobId}.json`);
    if (existsSync(filePath)) {
      const data = readFileSync(filePath, 'utf8');
      return JSON.parse(data);
    }
  } catch (err) {
    // Silent fail
  }
  return null;
};

export const createJob = (prompt: string): CarouselJob => {
  const job: CarouselJob = {
    id: `carousel-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    prompt,
    status: 'queued',
    createdAt: new Date().toISOString(),
    progress: 0,
    log: [`Job created at ${new Date().toISOString()}`],
  };

  JOBS.set(job.id, job);
  persistJob(job);
  return job;
};

export const getJob = (jobId: string): CarouselJob | null => {
  let job = JOBS.get(jobId);
  if (!job) {
    job = loadJobFromDisk(jobId);
    if (job) {
      JOBS.set(jobId, job);
    }
  }
  return job || null;
};

export const updateJob = (jobId: string, updates: Partial<CarouselJob>): void => {
  const job = getJob(jobId);
  if (!job) return;

  Object.assign(job, updates);
  JOBS.set(jobId, job);
  persistJob(job);
};

export const startJob = (jobId: string): void => {
  const job = getJob(jobId);
  if (!job) return;

  job.status = 'running';
  job.startedAt = new Date().toISOString();
  job.progress = 5;
  job.log.push(`Job started at ${job.startedAt}`);

  JOBS.set(jobId, job);
  persistJob(job);
};

export const completeJob = (
  jobId: string,
  slides: any[],
  animations: any,
  exports: CarouselJob['exports'],
  aestheticScore: number,
): void => {
  const job = getJob(jobId);
  if (!job) return;

  job.status = 'done';
  job.completedAt = new Date().toISOString();
  job.slides = slides;
  job.animations = animations;
  job.exports = exports;
  job.aestheticScore = aestheticScore;
  job.readyToPublish = aestheticScore >= 70;
  job.progress = 100;
  job.log.push(`Job completed at ${job.completedAt}`);

  JOBS.set(jobId, job);
  persistJob(job);
};

export const failJob = (jobId: string, error: string): void => {
  const job = getJob(jobId);
  if (!job) return;

  job.status = 'error';
  job.error = error;
  job.completedAt = new Date().toISOString();
  job.progress = 0;
  job.log.push(`Job failed: ${error}`);

  JOBS.set(jobId, job);
  persistJob(job);
};

export const addLog = (jobId: string, message: string): void => {
  const job = getJob(jobId);
  if (!job) return;

  job.log.push(`[${new Date().toISOString()}] ${message}`);
  if (job.log.length > 50) {
    job.log = job.log.slice(-50);
  }

  JOBS.set(jobId, job);
  persistJob(job);
};

export const updateProgress = (jobId: string, progress: number): void => {
  const job = getJob(jobId);
  if (!job) return;

  job.progress = Math.min(100, Math.max(0, progress));
  JOBS.set(jobId, job);
  persistJob(job);
};

export const cleanupOldJobs = (): void => {
  const now = Date.now();
  const maxAge = 24 * 60 * 60 * 1000;

  for (const [jobId, job] of JOBS.entries()) {
    const createdTime = new Date(job.createdAt).getTime();
    if (now - createdTime > maxAge) {
      JOBS.delete(jobId);

      try {
        ensureTempDir();
        const filePath = join(TEMP_DIR, `${jobId}.json`);
        if (existsSync(filePath)) {
          unlinkSync(filePath);
        }
      } catch (err) {
        // Fail silently
      }
    }
  }
};

export const listJobs = (): CarouselJob[] => {
  return Array.from(JOBS.values());
};

export const jobQueue = {
  createJob,
  getJob,
  updateJob,
  startJob,
  completeJob,
  failJob,
  addLog,
  updateProgress,
  cleanupOldJobs,
  listJobs,
};
