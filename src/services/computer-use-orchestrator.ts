/**
 * Computer Use Orchestrator
 *
 * Wires autonomous engagement (cuPostPublisher) to backend systems:
 * - Account registry (know which accounts to engage)
 * - Token budget (check spend limits before engaging)
 * - Rate limiting (throttle per account, avoid IG blocks)
 * - OAuth tokens (multi-account support)
 * - Engagement strategy (route to realtime-engagement-loop)
 * - Metrics feedback (track engagement impact)
 */

import { log } from '../agent/logger.js';
import { getBudgetStatus, recordCost } from './token-budget-manager.js';
import { getInstagramToken } from '../api/instagram-oauth-routes.js';
import { executeBrowserlessAction } from './browserless-automation.js';

export interface EngagementTask {
  accountId: string;
  action: 'like' | 'comment' | 'story-view' | 'follow';
  targetPostId?: string;
  targetAccountId?: string;
  message?: string; // for comments
}

export interface EngagementResult {
  success: boolean;
  action: string;
  accountId: string;
  cost: number; // USD
  rateLimitReached?: boolean;
  error?: string;
}

/**
 * Rate limiter (per account)
 */
const actionCounts: Map<string, { count: number; resetAt: number }> = new Map();

const checkRateLimit = (accountId: string): boolean => {
  const now = Date.now();
  let limiter = actionCounts.get(accountId);

  // Reset hourly
  if (!limiter || limiter.resetAt < now) {
    limiter = { count: 0, resetAt: now + 60 * 60 * 1000 };
    actionCounts.set(accountId, limiter);
  }

  // Limit: 100 actions per hour (IG safety threshold)
  if (limiter.count >= 100) {
    log.warn('[ComputerUseOrchestrator] Rate limit reached', { accountId, count: limiter.count });
    return false;
  }

  limiter.count += 1;
  return true;
};

/**
 * Execute engagement task with full orchestration
 */
export const executeEngagementTask = async (task: EngagementTask): Promise<EngagementResult> => {
  log.info('[ComputerUseOrchestrator] Engagement task received', { accountId: task.accountId, action: task.action });

  // 1. Check rate limit
  if (!checkRateLimit(task.accountId)) {
    return {
      success: false,
      action: task.action,
      accountId: task.accountId,
      cost: 0,
      rateLimitReached: true,
      error: 'Rate limit reached (100 actions/hour)',
    };
  }

  // 2. Get OAuth token for account
  const token = getInstagramToken();
  if (!token) {
    log.warn('[ComputerUseOrchestrator] No token for account', { accountId: task.accountId });
    return {
      success: false,
      action: task.action,
      accountId: task.accountId,
      cost: 0,
      error: 'Instagram not connected',
    };
  }

  // 3. Check budget
  const budget = getBudgetStatus(task.accountId);
  const costPerAction: Record<string, number> = {
    like: 0.001, // $0.001
    comment: 0.002, // $0.002
    'story-view': 0.0005,
    follow: 0.003, // $0.003
  };

  const actionCost = costPerAction[task.action] || 0.001;

  if (budget.remaining < actionCost) {
    log.warn('[ComputerUseOrchestrator] Budget insufficient', {
      accountId: task.accountId,
      remaining: budget.remaining,
      needed: actionCost,
    });
    return {
      success: false,
      action: task.action,
      accountId: task.accountId,
      cost: 0,
      error: `Budget insufficient ($${budget.remaining.toFixed(2)} remaining, need $${actionCost.toFixed(4)})`,
    };
  }

  // 4. Execute via Computer Use (Browserless cloud automation)
  try {
    const browserlessResult = await executeBrowserlessAction(task, token);

    if (!browserlessResult.ok) {
      log.warn('[ComputerUseOrchestrator] Browserless action failed', {
        action: task.action,
        error: browserlessResult.error,
      });
      return {
        success: false,
        action: task.action,
        accountId: task.accountId,
        cost: 0,
        error: browserlessResult.error,
      };
    }

    log.info('[ComputerUseOrchestrator] Action executed', {
      action: task.action,
      accountId: task.accountId,
      durationMs: browserlessResult.durationMs,
    });

    // 5. Record cost
    recordCost(task.accountId, `engagement-${task.action}`, actionCost);

    return {
      success: true,
      action: task.action,
      accountId: task.accountId,
      cost: actionCost,
    };
  } catch (err) {
    log.error('[ComputerUseOrchestrator] Execution failed', { accountId: task.accountId, error: String(err) });
    return {
      success: false,
      action: task.action,
      accountId: task.accountId,
      cost: 0,
      error: String(err),
    };
  }
};

/**
 * Schedule daily engagement routine (called by cron)
 */
export const scheduleDailyEngagementRoutine = async (accountId: string): Promise<{ executed: number; skipped: number; errors: number }> => {
  log.info('[ComputerUseOrchestrator] Daily engagement routine starting', { accountId });

  // TODO: Get list of target posts/accounts from engagement strategy
  // For now: placeholder
  const targetTasks: EngagementTask[] = [];

  let executed = 0;
  let skipped = 0;
  let errors = 0;

  for (const task of targetTasks) {
    const result = await executeEngagementTask(task);
    if (result.success) {
      executed += 1;
    } else if (result.rateLimitReached) {
      skipped += 1;
    } else {
      errors += 1;
    }
  }

  log.info('[ComputerUseOrchestrator] Daily routine complete', { accountId, executed, skipped, errors });

  return { executed, skipped, errors };
};

/**
 * Get engagement metrics (for feedback loop)
 */
export const getEngagementMetrics = (accountId: string): { likes: number; comments: number; follows: number; reaches: number } => {
  // TODO: Pull from account growth service + engagement tracking
  return {
    likes: 0,
    comments: 0,
    follows: 0,
    reaches: 0,
  };
};
