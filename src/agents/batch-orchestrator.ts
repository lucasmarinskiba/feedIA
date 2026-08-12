/**
 * Batch Orchestrator (TIER 8 Phase 3)
 * Process multiple campaigns in parallel with worker pool
 */

import { agencyOrchestrator, CampaignInput, CampaignOutput } from './agency-orchestrator.js';
import { saveCampaign } from './agency-persistence.js';
import { metricsCollector } from './agency-metrics.js';

interface BatchJob {
  index: number;
  input: CampaignInput;
  campaignId?: string;
  status: 'pending' | 'processing' | 'complete' | 'failed';
  error?: string;
  result?: CampaignOutput;
}

interface BatchResult {
  batchId: string;
  totalJobs: number;
  completed: number;
  failed: number;
  campaigns: { campaignId: string; status: string; error?: string }[];
  startedAt: string;
  completedAt: string;
}

/**
 * Worker pool executor
 * Processes N jobs in parallel
 */
const processWorkerPool = async (
  jobs: BatchJob[],
  workerCount: number = 3,
  onProgress?: (completed: number, total: number) => void
): Promise<BatchJob[]> => {
  const results: BatchJob[] = [];
  let completed = 0;

  // Split jobs into chunks for parallel processing
  const chunks: BatchJob[][] = [];
  for (let i = 0; i < jobs.length; i += workerCount) {
    chunks.push(jobs.slice(i, i + workerCount));
  }

  for (const chunk of chunks) {
    const promises = chunk.map(async (job: BatchJob): Promise<BatchJob> => {
      job.status = 'processing';

      try {
        const campaign = await agencyOrchestrator(job.input);
        await saveCampaign(campaign, job.input.accountId);

        job.result = campaign;
        job.campaignId = campaign.campaignId;
        job.status = 'complete';
        completed++;
        onProgress?.(completed, jobs.length);

        return job;
      } catch (err) {
        job.status = 'failed';
        job.error = String(err);
        completed++;
        onProgress?.(completed, jobs.length);

        return job;
      }
    });

    const chunkResults = await Promise.all(promises);
    results.push(...chunkResults);
  }

  return results;
};

/**
 * Main batch orchestrator
 */
export const batchOrchestrator = async (
  inputs: CampaignInput[],
  accountId: string,
  workerCount: number = 3
): Promise<BatchResult> => {
  const batchId = `batch_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  const startedAt = new Date().toISOString();
  const batchStartTime = Date.now();

  console.log(`[BATCH] Processing ${inputs.length} campaigns (workers=${workerCount})`);

  const jobs: BatchJob[] = inputs.map((input, index) => ({
    index,
    input,
    status: 'pending',
  }));

  const results = await processWorkerPool(jobs, workerCount, (completed, total) => {
    console.log(`[BATCH] Progress: ${completed}/${total}`);
  });

  const completed = results.filter((j) => j.status === 'complete').length;
  const failed = results.filter((j) => j.status === 'failed').length;
  const batchDurationMs = Date.now() - batchStartTime;

  const completedAt = new Date().toISOString();

  // Record batch metrics
  metricsCollector.recordBatch(inputs.length, batchDurationMs, failed);

  console.log(`[BATCH] Complete: ${completed} success, ${failed} failed`);

  return {
    batchId,
    totalJobs: inputs.length,
    completed,
    failed,
    campaigns: results.map((j) => ({
      campaignId: j.campaignId || `camp_failed_${j.index}`,
      status: j.status,
      error: j.error,
    })),
    startedAt,
    completedAt,
  };
};
