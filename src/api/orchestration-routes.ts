/**
 * Orchestration Routes
 *
 * POST /api/orchestrate/generate         — single content generation
 * POST /api/orchestrate/batch            — batch generation
 * GET  /api/orchestrate/budget-status    — check token spend + limits
 * POST /api/orchestrate/set-budget       — update budget (admin)
 */

import express, { Request, Response } from 'express';
import { log } from '../agent/logger.js';
import { orchestrateContentGeneration, orchestrateBatch, type OrchestratorRequest } from '../services/service-orchestrator.js';
import { recordCost, getBudgetStatus, setBudget, type BudgetTier } from '../services/token-budget-manager.js';

const router = express.Router();

/**
 * POST /api/orchestrate/generate
 * Single content generation with intelligent routing
 */
router.post('/generate', async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      basePrompt,
      contentType,
      platform,
      accountId,
      accountTier = 'pro',
      qualityLevel,
      userHandle,
    } = req.body as {
      basePrompt: string;
      contentType: string;
      platform: 'instagram' | 'tiktok';
      accountId: string;
      accountTier: BudgetTier;
      qualityLevel?: string;
      userHandle?: string;
    };

    if (!basePrompt || !contentType || !platform || !accountId) {
      res.status(400).json({ ok: false, error: 'Missing required fields' });
      return;
    }

    const orchestratorReq: OrchestratorRequest = {
      basePrompt,
      contentType: contentType as any,
      platform,
      accountTier,
      qualityLevel: qualityLevel as any,
      userHandle,
      maxCostEstimate: accountTier === 'free' ? 0 : accountTier === 'pro' ? 50 : 500,
    };

    const result = await orchestrateContentGeneration(orchestratorReq);

    // Record cost
    recordCost(accountId, result.providerUsed, result.costEstimate);

    log.info('[Orchestration] Request completed', {
      accountId,
      ok: result.ok,
      provider: result.providerUsed,
      cost: result.costEstimate,
    });

    res.json({
      ok: result.ok,
      url: result.url,
      urls: result.urls,
      metadata: {
        qualityScore: result.qualityScore,
        costEstimate: result.costEstimate,
        providerUsed: result.providerUsed,
        durationMs: result.durationMs,
        fallbacksApplied: result.fallbacksApplied,
      },
      error: result.error,
    });
  } catch (err) {
    log.error('[Orchestration] Request failed', { error: String(err) });
    res.status(500).json({ ok: false, error: String(err) });
  }
});

/**
 * POST /api/orchestrate/batch
 * Batch content generation with cost optimization
 */
router.post('/batch', async (req: Request, res: Response): Promise<void> => {
  try {
    const { requests, accountId, accountTier = 'pro' } = req.body as {
      requests: Array<{
        basePrompt: string;
        contentType: string;
        platform: 'instagram' | 'tiktok';
        qualityLevel?: string;
      }>;
      accountId: string;
      accountTier: BudgetTier;
    };

    if (!requests || !accountId || !Array.isArray(requests)) {
      res.status(400).json({ ok: false, error: 'Invalid request' });
      return;
    }

    const orchestratorReqs: OrchestratorRequest[] = requests.map((r) => ({
      basePrompt: r.basePrompt,
      contentType: r.contentType as any,
      platform: r.platform,
      accountTier,
      qualityLevel: r.qualityLevel as any,
      maxCostEstimate: accountTier === 'free' ? 0 : accountTier === 'pro' ? 50 : 500,
    }));

    const results = await orchestrateBatch(orchestratorReqs);

    // Record costs
    const totalCost = results.reduce((sum, r) => sum + r.costEstimate, 0);
    results.forEach((r) => recordCost(accountId, r.providerUsed, r.costEstimate));

    log.info('[Orchestration] Batch completed', {
      accountId,
      count: results.length,
      successCount: results.filter((r) => r.ok).length,
      totalCost,
    });

    res.json({
      ok: results.every((r) => r.ok),
      results: results.map((r) => ({
        url: r.url,
        urls: r.urls,
        metadata: {
          qualityScore: r.qualityScore,
          costEstimate: r.costEstimate,
          providerUsed: r.providerUsed,
          durationMs: r.durationMs,
        },
        error: r.error,
      })),
      summary: {
        total: results.length,
        success: results.filter((r) => r.ok).length,
        totalCost,
      },
    });
  } catch (err) {
    log.error('[Orchestration] Batch failed', { error: String(err) });
    res.status(500).json({ ok: false, error: String(err) });
  }
});

/**
 * GET /api/orchestrate/budget-status
 * Check token budget + spend
 */
router.get('/budget-status', (req: Request, res: Response): void => {
  try {
    const { accountId } = req.query as { accountId: string };

    if (!accountId) {
      res.status(400).json({ ok: false, error: 'accountId required' });
      return;
    }

    const status = getBudgetStatus(accountId);

    log.info('[Orchestration] Budget status queried', { accountId, percentageUsed: status.percentageUsed });

    res.json({
      ok: true,
      budget: status,
    });
  } catch (err) {
    log.error('[Orchestration] Budget status failed', { error: String(err) });
    res.status(500).json({ ok: false, error: String(err) });
  }
});

/**
 * POST /api/orchestrate/set-budget
 * Update account budget (admin)
 */
router.post('/set-budget', (req: Request, res: Response): void => {
  try {
    const { accountId, budgetUSD } = req.body as { accountId: string; budgetUSD: number };

    if (!accountId || budgetUSD === undefined) {
      res.status(400).json({ ok: false, error: 'accountId and budgetUSD required' });
      return;
    }

    const updated = setBudget(accountId, budgetUSD);

    log.info('[Orchestration] Budget updated', { accountId, newBudget: budgetUSD });

    res.json({
      ok: true,
      updated: {
        accountId: updated.accountId,
        monthlyBudget: updated.monthlyBudget,
      },
    });
  } catch (err) {
    log.error('[Orchestration] Set budget failed', { error: String(err) });
    res.status(500).json({ ok: false, error: String(err) });
  }
});

export default router;
