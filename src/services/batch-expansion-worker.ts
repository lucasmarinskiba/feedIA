/**
 * Batch Expansion Worker
 * Queue-based system for expanding prompt batches
 * Rate-limited: 10s per prompt (Anthropic safety)
 */

import { randomUUID as uuidv4 } from 'node:crypto';
import { log } from '../agent/logger.js';
import { feedIADatabase } from '../db/database.js';
import { superExpandAndStore } from './prompt-expander.js';

interface JobRecord {
  id: string;
  batch_id: string;
  status: 'queued' | 'in_progress' | 'completed' | 'failed';
  progress_percent: number;
  total_prompts: number;
  processed_prompts: number;
  failed_count: number;
  started_at: string;
  completed_at: string | null;
  error_message: string | null;
}

interface QueueItem {
  jobId: string;
  promptId: string;
  promptText: string;
  batchId: string;
}

class BatchExpansionWorker {
  private queue: QueueItem[] = [];
  private jobs: Map<string, JobRecord> = new Map();
  private isRunning = false;
  private currentJobId: string | null = null;

  /**
   * Start batch expansion for a specific batch
   */
  async queueBatchExpansion(batchId: string): Promise<string> {
    try {
      const jobId = uuidv4();
      const prompts = feedIADatabase.getPromptsByBatch(batchId);

      if (!prompts || prompts.length === 0) {
        throw new Error(`No prompts found for batch ${batchId}`);
      }

      const job: JobRecord = {
        id: jobId,
        batch_id: batchId,
        status: 'queued',
        progress_percent: 0,
        total_prompts: prompts.length,
        processed_prompts: 0,
        failed_count: 0,
        started_at: new Date().toISOString(),
        completed_at: null,
        error_message: null,
      };

      this.jobs.set(jobId, job);

      for (const prompt of prompts) {
        this.queue.push({
          jobId,
          promptId: prompt.id,
          promptText: prompt.base_template,
          batchId,
        });
      }

      log.info('[BatchWorker] Batch queued', {
        jobId,
        batchId,
        promptCount: prompts.length,
      });

      if (!this.isRunning) {
        this.startWorker();
      }

      return jobId;
    } catch (error) {
      log.error('[BatchWorker] Queue batch failed', { batchId, error });
      throw error;
    }
  }

  /**
   * Start worker loop (process queue)
   */
  private startWorker(): void {
    if (this.isRunning) return;

    this.isRunning = true;
    log.info('[BatchWorker] Worker started');

    this.processQueue();
  }

  /**
   * Process queue items with rate limiting
   */
  private async processQueue(): Promise<void> {
    while (this.queue.length > 0) {
      const item = this.queue.shift();
      if (!item) break;

      const job = this.jobs.get(item.jobId);
      if (!job) continue;

      this.currentJobId = item.jobId;

      try {
        // Update job status
        job.status = 'in_progress';
        job.started_at = new Date().toISOString();

        // Expand prompt (calls Claude API)
        await superExpandAndStore(item.promptId, item.promptText);

        job.processed_prompts++;
        job.progress_percent = Math.floor(
          (job.processed_prompts / job.total_prompts) * 100
        );

        log.info('[BatchWorker] Prompt expanded', {
          jobId: item.jobId,
          promptId: item.promptId,
          progress: `${job.processed_prompts}/${job.total_prompts}`,
        });

        // Rate limiting: 10s delay between API calls
        await new Promise(resolve => setTimeout(resolve, 10000));
      } catch (error) {
        job.failed_count++;
        log.warn('[BatchWorker] Prompt expansion failed', {
          jobId: item.jobId,
          promptId: item.promptId,
          error,
        });

        // Retry: re-queue item
        if ((job.failed_count % 3) === 0) {
          log.error('[BatchWorker] Max retries exceeded', {
            promptId: item.promptId,
          });
        } else {
          this.queue.push(item);
        }
      }

      // Check if job complete
      if (job.processed_prompts >= job.total_prompts) {
        job.status = 'completed';
        job.completed_at = new Date().toISOString();
        log.info('[BatchWorker] Job completed', {
          jobId: item.jobId,
          batchId: item.batchId,
          processed: job.processed_prompts,
          failed: job.failed_count,
        });
      }
    }

    this.isRunning = false;
    this.currentJobId = null;
    log.info('[BatchWorker] Worker stopped');
  }

  /**
   * Get job status
   */
  getJobStatus(jobId: string): JobRecord | null {
    return this.jobs.get(jobId) || null;
  }

  /**
   * List all jobs
   */
  listJobs(): JobRecord[] {
    return Array.from(this.jobs.values());
  }

  /**
   * Get queue length
   */
  getQueueLength(): number {
    return this.queue.length;
  }

  /**
   * Check if worker running
   */
  isWorkerRunning(): boolean {
    return this.isRunning;
  }
}

export const batchExpansionWorker = new BatchExpansionWorker();
