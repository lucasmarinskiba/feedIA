/**
 * Token Budget Manager
 *
 * Tracks API spend per account, prevents overspend.
 * Sets monthly budget → tracks each generation → alerts at thresholds.
 * Auto-fallback to cheaper providers if budget approaching.
 *
 * Budget = estimated monthly spend (USD)
 * Spend = sum of all API calls (Higgsfield, Replicate, OpenAI, etc)
 * Threshold: warn at 75%, block at 100%
 */

import { log } from '../agent/logger.js';

export type BudgetTier = 'free' | 'pro' | 'enterprise';

interface AccountBudget {
  accountId: string;
  monthlyBudget: number; // USD
  spent: number; // USD
  requests: {
    provider: string;
    cost: number;
    timestamp: number;
  }[];
  alerts: {
    threshold75: boolean;
    threshold90: boolean;
  };
  resetAt: number; // timestamp when monthly budget resets
}

/**
 * Default budgets by tier
 */
const DEFAULT_BUDGETS: Record<BudgetTier, number> = {
  free: 0,
  pro: 50,
  enterprise: 500,
};

/**
 * In-memory budget tracking (production: use database)
 */
const budgets: Map<string, AccountBudget> = new Map();

/**
 * Initialize budget for account
 */
export const initializeBudget = (accountId: string, tier: BudgetTier = 'free'): AccountBudget => {
  const monthlyBudget = DEFAULT_BUDGETS[tier];
  const now = Date.now();
  const resetAt = new Date(now);
  resetAt.setMonth(resetAt.getMonth() + 1);
  resetAt.setDate(1);

  const budget: AccountBudget = {
    accountId,
    monthlyBudget,
    spent: 0,
    requests: [],
    alerts: { threshold75: false, threshold90: false },
    resetAt: resetAt.getTime(),
  };

  budgets.set(accountId, budget);
  log.info('[TokenBudget] Budget initialized', { accountId, monthlyBudget, tier });

  return budget;
};

/**
 * Record a request cost
 */
export const recordCost = (accountId: string, provider: string, costUSD: number): { ok: boolean; canProceed: boolean; alert?: string } => {
  let budget = budgets.get(accountId);
  if (!budget) {
    budget = initializeBudget(accountId);
  }

  // Reset if month has passed
  const now = Date.now();
  if (now > budget.resetAt) {
    budget.spent = 0;
    budget.requests = [];
    budget.alerts = { threshold75: false, threshold90: false };
    const resetAt = new Date(now);
    resetAt.setMonth(resetAt.getMonth() + 1);
    resetAt.setDate(1);
    budget.resetAt = resetAt.getTime();
    log.info('[TokenBudget] Monthly budget reset', { accountId });
  }

  // Check if budget is free tier (0)
  if (budget.monthlyBudget === 0) {
    log.warn('[TokenBudget] Free tier has $0 budget, proceeding without cost tracking', { accountId });
    return { ok: true, canProceed: true };
  }

  // Record cost
  budget.spent += costUSD;
  budget.requests.push({ provider, cost: costUSD, timestamp: now });

  const percentageUsed = (budget.spent / budget.monthlyBudget) * 100;
  let alert: string | undefined;

  if (percentageUsed >= 100) {
    log.error('[TokenBudget] Budget exceeded', { accountId, spent: budget.spent, budget: budget.monthlyBudget });
    alert = `Budget limit reached ($${budget.monthlyBudget}). Current spend: $${budget.spent.toFixed(2)}`;
    return { ok: false, canProceed: false, alert };
  }

  if (percentageUsed >= 90 && !budget.alerts.threshold90) {
    budget.alerts.threshold90 = true;
    alert = `Budget 90% used ($${budget.spent.toFixed(2)}/$${budget.monthlyBudget}). Remaining: $${(budget.monthlyBudget - budget.spent).toFixed(2)}`;
    log.warn('[TokenBudget] Alert 90%', { accountId, alert });
    return { ok: true, canProceed: true, alert };
  }

  if (percentageUsed >= 75 && !budget.alerts.threshold75) {
    budget.alerts.threshold75 = true;
    alert = `Budget 75% used ($${budget.spent.toFixed(2)}/$${budget.monthlyBudget})`;
    log.info('[TokenBudget] Alert 75%', { accountId, alert });
    return { ok: true, canProceed: true, alert };
  }

  log.debug('[TokenBudget] Cost recorded', { accountId, provider, cost: costUSD, totalSpent: budget.spent });
  return { ok: true, canProceed: true };
};

/**
 * Get budget status for account
 */
export const getBudgetStatus = (accountId: string): {
  accountId: string;
  monthlyBudget: number;
  spent: number;
  remaining: number;
  percentageUsed: number;
  requestCount: number;
  topProviders: Array<{ provider: string; totalCost: number; requestCount: number }>;
  resetAt: string;
} => {
  let budget = budgets.get(accountId);
  if (!budget) {
    budget = initializeBudget(accountId);
  }

  const percentageUsed = (budget.spent / (budget.monthlyBudget || 1)) * 100;
  const remaining = Math.max(0, budget.monthlyBudget - budget.spent);

  // Group by provider
  const providerStats = new Map<string, { totalCost: number; count: number }>();
  for (const req of budget.requests) {
    const stats = providerStats.get(req.provider) || { totalCost: 0, count: 0 };
    stats.totalCost += req.cost;
    stats.count += 1;
    providerStats.set(req.provider, stats);
  }

  const topProviders = Array.from(providerStats.entries())
    .map(([provider, stats]) => ({
      provider,
      totalCost: stats.totalCost,
      requestCount: stats.count,
    }))
    .sort((a, b) => b.totalCost - a.totalCost);

  return {
    accountId,
    monthlyBudget: budget.monthlyBudget,
    spent: budget.spent,
    remaining,
    percentageUsed,
    requestCount: budget.requests.length,
    topProviders,
    resetAt: new Date(budget.resetAt).toISOString(),
  };
};

/**
 * Recommend provider based on budget remaining
 */
export const getRecommendedProvider = (accountId: string): string => {
  const status = getBudgetStatus(accountId);

  // Free tier: always use free/cheap
  if (status.monthlyBudget === 0) return 'replicate:flux-schnell';

  // Enterprise: no budget concerns
  if (status.monthlyBudget >= 500) return 'higgsfield:flux-1-dev';

  const remaining = status.remaining;
  const percentageUsed = status.percentageUsed;

  // Budget constraints
  if (percentageUsed >= 90) return 'replicate:flux-schnell'; // Cheapest
  if (percentageUsed >= 75) return 'replicate:flux-pro'; // Mid-tier
  if (remaining < 5) return 'replicate:flux-schnell'; // Less than $5 left
  if (remaining < 20) return 'openai:dall-e-3'; // Mid-price

  // Default: best quality within budget
  return 'higgsfield:flux-1-schnell';
};

/**
 * Manual budget override (admin)
 */
export const setBudget = (accountId: string, newBudgetUSD: number): AccountBudget => {
  let budget = budgets.get(accountId);
  if (!budget) {
    budget = initializeBudget(accountId);
  }

  const oldBudget = budget.monthlyBudget;
  budget.monthlyBudget = newBudgetUSD;

  log.info('[TokenBudget] Budget updated', { accountId, oldBudget, newBudget: newBudgetUSD });

  return budget;
};
