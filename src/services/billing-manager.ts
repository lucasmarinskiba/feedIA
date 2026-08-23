/**
 * Billing Manager Service
 * Usage-based billing, tier enforcement, subscription management
 */

import { getPool } from '../db/postgres-real.js';
import { getUserTier } from '../db/user-tiers.js';

export interface BillingConfig {
  tier: 'free' | 'pro' | 'agency';
  monthlyBudget: number;
  costPerCall: number;
  costPerContentGeneration: number;
  costPerImageUpscale: number;
  costPerVideoGen: number;
}

export interface UsageRecord {
  userId: string;
  date: Date;
  service: 'api_call' | 'content_generation' | 'image_upscale' | 'video_generation';
  costUsd: number;
  metadata: Record<string, unknown>;
}

export interface BillingTransaction {
  id: string;
  userId: string;
  transactionType: 'api_call' | 'content_generation' | 'subscription' | 'refund';
  amountUsd: number;
  description: string;
  timestamp: Date;
  metadata: Record<string, unknown>;
}

const tierBudgets: Record<string, BillingConfig> = {
  free: {
    tier: 'free',
    monthlyBudget: 10, // $10/month for free tier
    costPerCall: 0.001,
    costPerContentGeneration: 0.05,
    costPerImageUpscale: 0.02,
    costPerVideoGen: 0.15,
  },
  pro: {
    tier: 'pro',
    monthlyBudget: 100, // $100/month for pro tier
    costPerCall: 0.0005,
    costPerContentGeneration: 0.03,
    costPerImageUpscale: 0.01,
    costPerVideoGen: 0.1,
  },
  agency: {
    tier: 'agency',
    monthlyBudget: 500, // $500/month for agency tier
    costPerCall: 0.0002,
    costPerContentGeneration: 0.01,
    costPerImageUpscale: 0.005,
    costPerVideoGen: 0.05,
  },
};

/**
 * Initialize billing tables
 */
export const initializeBillingTables = async (): Promise<void> => {
  try {
    console.log('[BillingManager] Initializing tables...');

    // Usage tracking table
    await getPool().query(`
      CREATE TABLE IF NOT EXISTS billing_usage (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        date TIMESTAMP DEFAULT NOW(),
        service TEXT NOT NULL CHECK (service IN ('api_call', 'content_generation', 'image_upscale', 'video_generation')),
        cost_usd DECIMAL(10,6) NOT NULL,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT NOW(),
        INDEX idx_user_id (user_id),
        INDEX idx_date (date),
        INDEX idx_service (service)
      );
    `);

    // Billing transactions table
    await getPool().query(`
      CREATE TABLE IF NOT EXISTS billing_transactions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        transaction_type TEXT NOT NULL CHECK (transaction_type IN ('api_call', 'content_generation', 'subscription', 'refund')),
        amount_usd DECIMAL(10,2) NOT NULL,
        description TEXT,
        timestamp TIMESTAMP DEFAULT NOW(),
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT NOW(),
        INDEX idx_user_id (user_id),
        INDEX idx_timestamp (timestamp),
        INDEX idx_type (transaction_type)
      );
    `);

    // Monthly usage summary table
    await getPool().query(`
      CREATE TABLE IF NOT EXISTS billing_monthly_summary (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL UNIQUE,
        month_year TEXT NOT NULL,
        total_usage_cost DECIMAL(10,2) DEFAULT 0,
        budget_allocated DECIMAL(10,2) NOT NULL,
        overage_amount DECIMAL(10,2) DEFAULT 0,
        status TEXT DEFAULT 'active',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        INDEX idx_user_id (user_id),
        INDEX idx_month_year (month_year)
      );
    `);

    console.log('[BillingManager] Tables initialized');
  } catch (err) {
    console.error('[BillingManager] Table initialization error:', err);
    throw err;
  }
};

/**
 * Track API usage and cost
 */
export const trackUsage = async (
  userId: string,
  service: UsageRecord['service'],
  metadata?: Record<string, unknown>,
): Promise<{ success: boolean; cost: number; error?: string }> => {
  try {
    const tierRecord = await getUserTier(userId);
    if (!tierRecord) {
      return { success: false, cost: 0, error: 'User tier not found' };
    }

    const config = tierBudgets[tierRecord.tier];
    let cost = 0;

    switch (service) {
      case 'api_call':
        cost = config.costPerCall;
        break;
      case 'content_generation':
        cost = config.costPerContentGeneration;
        break;
      case 'image_upscale':
        cost = config.costPerImageUpscale;
        break;
      case 'video_generation':
        cost = config.costPerVideoGen;
        break;
    }

    // Record usage
    const usageId = `usage_${userId}_${Date.now()}`;
    await getPool().query(
      `INSERT INTO billing_usage (id, user_id, service, cost_usd, metadata)
       VALUES ($1, $2, $3, $4, $5)`,
      [usageId, userId, service, cost, JSON.stringify(metadata || {})],
    );

    // Check if budget exceeded
    const monthKey = getMonthKey();
    const monthlyUsage = await getMonthlyUsage(userId, monthKey);
    const budgetRemaining = config.monthlyBudget - monthlyUsage;

    if (budgetRemaining < cost) {
      return {
        success: false,
        cost,
        error: `Budget exceeded. Remaining: $${budgetRemaining.toFixed(2)}, cost: $${cost.toFixed(2)}`,
      };
    }

    console.log(`[BillingManager] Usage tracked for ${userId}: ${service} ($${cost})`);
    return { success: true, cost };
  } catch (err) {
    console.error('[BillingManager] Usage tracking error:', err);
    return { success: false, cost: 0, error: String(err) };
  }
};

/**
 * Get monthly usage cost for user
 */
export const getMonthlyUsage = async (userId: string, monthKey?: string): Promise<number> => {
  try {
    const key = monthKey || getMonthKey();
    const startDate = new Date(`${key}-01T00:00:00Z`);
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 1);

    const result = await getPool().query(
      `SELECT COALESCE(SUM(cost_usd), 0)::float as total
       FROM billing_usage
       WHERE user_id = $1 AND date >= $2 AND date < $3`,
      [userId, startDate, endDate],
    );

    const row = result.rows?.[0] as Record<string, unknown> | undefined;
    return Number(row?.total || 0);
  } catch (err) {
    console.error('[BillingManager] Get monthly usage error:', err);
    return 0;
  }
};

/**
 * Record billing transaction (subscription, refund, etc)
 */
export const recordBillingTransaction = async (
  userId: string,
  type: BillingTransaction['transactionType'],
  amount: number,
  description: string,
  metadata?: Record<string, unknown>,
): Promise<BillingTransaction | null> => {
  try {
    const txnId = `txn_${userId}_${Date.now()}`;
    const timestamp = new Date();

    await getPool().query(
      `INSERT INTO billing_transactions
       (id, user_id, transaction_type, amount_usd, description, timestamp, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [txnId, userId, type, amount, description, timestamp, JSON.stringify(metadata || {})],
    );

    return {
      id: txnId,
      userId,
      transactionType: type,
      amountUsd: amount,
      description,
      timestamp,
      metadata: metadata || {},
    };
  } catch (err) {
    console.error('[BillingManager] Record transaction error:', err);
    return null;
  }
};

/**
 * Get monthly budget for tier
 */
export const getMonthlyBudget = (tier: 'free' | 'pro' | 'agency'): number => {
  return tierBudgets[tier]?.monthlyBudget || 10;
};

/**
 * Check if user can proceed with usage
 */
export const canProceed = async (
  userId: string,
  service: UsageRecord['service'],
): Promise<{ allowed: boolean; reason?: string; budgetRemaining?: number }> => {
  try {
    const tierRecord = await getUserTier(userId);
    if (!tierRecord) {
      return { allowed: false, reason: 'User tier not found' };
    }

    const config = tierBudgets[tierRecord.tier];
    let cost = 0;

    switch (service) {
      case 'api_call':
        cost = config.costPerCall;
        break;
      case 'content_generation':
        cost = config.costPerContentGeneration;
        break;
      case 'image_upscale':
        cost = config.costPerImageUpscale;
        break;
      case 'video_generation':
        cost = config.costPerVideoGen;
        break;
    }

    const monthKey = getMonthKey();
    const monthlyUsage = await getMonthlyUsage(userId, monthKey);
    const budgetRemaining = config.monthlyBudget - monthlyUsage;

    if (budgetRemaining < cost) {
      return {
        allowed: false,
        reason: `Insufficient budget. Need $${cost.toFixed(2)}, have $${budgetRemaining.toFixed(2)}`,
        budgetRemaining,
      };
    }

    return { allowed: true, budgetRemaining };
  } catch (err) {
    console.error('[BillingManager] Budget check error:', err);
    return { allowed: false, reason: String(err) };
  }
};

/**
 * Get current billing status
 */
export const getBillingStatus = async (
  userId: string,
): Promise<{
  tier: string;
  monthlyBudget: number;
  monthlyUsage: number;
  budgetRemaining: number;
  percentageUsed: number;
}> => {
  try {
    const tierRecord = await getUserTier(userId);
    if (!tierRecord) {
      throw new Error('User tier not found');
    }

    const monthKey = getMonthKey();
    const monthlyUsage = await getMonthlyUsage(userId, monthKey);
    const config = tierBudgets[tierRecord.tier];
    const budgetRemaining = Math.max(0, config.monthlyBudget - monthlyUsage);
    const percentageUsed = (monthlyUsage / config.monthlyBudget) * 100;

    return {
      tier: tierRecord.tier,
      monthlyBudget: config.monthlyBudget,
      monthlyUsage,
      budgetRemaining,
      percentageUsed,
    };
  } catch (err) {
    console.error('[BillingManager] Get status error:', err);
    throw err;
  }
};

/**
 * Helper: Get YYYY-MM format for current month
 */
function getMonthKey(): string {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

/**
 * Reset monthly usage (run on 1st of month via cron)
 */
export const resetMonthlyBilling = async (): Promise<void> => {
  try {
    console.log('[BillingManager] Resetting monthly billing...');

    // Archive current month summary
    await getPool().query(
      `UPDATE billing_monthly_summary
       SET status = 'archived'
       WHERE status = 'active'`,
    );

    console.log('[BillingManager] Monthly billing reset complete');
  } catch (err) {
    console.error('[BillingManager] Reset error:', err);
  }
};
