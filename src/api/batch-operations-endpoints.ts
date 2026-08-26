/**
 * Batch Operations Endpoints
 * POST /api/batch/campaigns - Create multiple campaigns
 * POST /api/batch/content - Create multiple content items
 * GET /api/batch/:jobId - Get batch job status
 * POST /api/batch/:jobId/cancel - Cancel batch job
 */

import type { Request, Response } from 'express';
import { query } from '../db/client.js';
import { createCampaign } from '../db/client.js';
import type { BatchJob } from '../db/client.js';

/**
 * POST /api/batch/campaigns
 * Create multiple campaigns in one request
 */
export const batchCreateCampaigns = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).userId;
    const { campaigns } = req.body;

    if (!Array.isArray(campaigns) || campaigns.length === 0) {
      res.status(400).json({ error: 'campaigns array required' });
      return;
    }

    // Create batch job record
    const jobId = crypto.randomUUID();
    await query(
      `INSERT INTO batch_jobs (id, user_id, job_type, status, input, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [jobId, userId, 'generate', 'processing', JSON.stringify({ campaigns })]
    );

    // Process batch asynchronously
    processBatchCampaigns(jobId, userId, campaigns).catch((err) => {
      console.error('[Batch] Processing error:', err);
    });

    res.status(202).json({
      jobId,
      status: 'processing',
      created_count: 0,
      total_count: campaigns.length,
    });
    return;
  } catch (err) {
    console.error('[Batch] Create campaigns error:', err);
    res.status(500).json({ error: 'Batch creation failed' });
    return;
  }
};

/**
 * Process batch campaigns (async)
 */
const processBatchCampaigns = async (jobId: string, userId: string, campaigns: any[]): Promise<void> => {
  const results = { success: 0, failed: 0, errors: [] as any[] };
  const createdIds: string[] = [];

  try {
    // Update job to started
    await query(
      'UPDATE batch_jobs SET started_at = NOW(), status = $1 WHERE id = $2',
      ['processing', jobId]
    );

    // Process each campaign
    for (const campaignData of campaigns) {
      try {
        const campaign = await createCampaign(userId, campaignData.name, {
          description: campaignData.description,
          platform: campaignData.platform,
          niche: campaignData.niche,
          status: 'draft',
        });

        createdIds.push(campaign.id);
        results.success++;
      } catch (err) {
        results.failed++;
        results.errors.push({
          campaign: campaignData.name,
          error: (err as Error).message,
        });
      }
    }

    // Update job to completed
    await query(
      `UPDATE batch_jobs SET status = $1, output = $2, completed_at = NOW() WHERE id = $3`,
      ['completed', JSON.stringify({ created: createdIds, ...results }), jobId]
    );

    console.log(`[Batch] Job ${jobId} completed: ${results.success} success, ${results.failed} failed`);
  } catch (err) {
    console.error('[Batch] Processing failed:', err);
    await query(
      `UPDATE batch_jobs SET status = $1, error_message = $2, completed_at = NOW() WHERE id = $3`,
      ['failed', (err as Error).message, jobId]
    );
  }
};

/**
 * GET /api/batch/:jobId
 * Get batch job status
 */
export const getBatchStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).userId;
    const { jobId } = req.params;

    const result = await query(
      'SELECT * FROM batch_jobs WHERE id = $1 AND user_id = $2',
      [jobId, userId]
    );

    if (result.rowCount === 0) {
      res.status(404).json({ error: 'Batch job not found' });
      return;
    }

    const job = result.rows[0] as BatchJob;

    res.json({
      id: job.id,
      status: job.status,
      progress: {
        input: Object.keys(job.input).length,
        output: job.output ? Object.keys(job.output).length : 0,
      },
      createdAt: job.created_at,
      startedAt: job.started_at,
      completedAt: job.completed_at,
      error: job.error_message,
      result: job.output,
    });
    return;
  } catch (err) {
    console.error('[Batch] Get status error:', err);
    res.status(500).json({ error: 'Status retrieval failed' });
    return;
  }
};

/**
 * POST /api/batch/:jobId/cancel
 * Cancel batch job (only if processing)
 */
export const cancelBatch = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).userId;
    const { jobId } = req.params;

    // Check ownership
    const result = await query(
      'SELECT * FROM batch_jobs WHERE id = $1 AND user_id = $2 AND status = $3',
      [jobId, userId, 'processing']
    );

    if (result.rowCount === 0) {
      res.status(400).json({ error: 'Job not found or already completed' });
      return;
    }

    // Cancel job
    await query(
      `UPDATE batch_jobs SET status = $1, completed_at = NOW() WHERE id = $2`,
      ['cancelled', jobId]
    );

    res.json({ message: 'Batch job cancelled', jobId });
    return;
  } catch (err) {
    console.error('[Batch] Cancel error:', err);
    res.status(500).json({ error: 'Cancellation failed' });
    return;
  }
};

/**
 * GET /api/batch
 * List user's batch jobs
 */
export const listBatchJobs = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).userId;
    const { status, limit = '50', offset = '0' } = req.query;

    let whereClause = 'WHERE user_id = $1';
    let paramIndex = 2;
    const params: unknown[] = [userId];

    if (status) {
      whereClause += ` AND status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    const result = await query(
      `SELECT id, job_type, status, created_at, started_at, completed_at
       FROM batch_jobs ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, parseInt(limit as string, 10), parseInt(offset as string, 10)]
    );

    res.json({
      jobs: result.rows,
      total: result.rowCount,
    });
    return;
  } catch (err) {
    console.error('[Batch] List error:', err);
    res.status(500).json({ error: 'List retrieval failed' });
    return;
  }
};
