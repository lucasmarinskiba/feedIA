/**
 * User Tier Tracking (Database Schema + CRUD)
 * Stripe integration + subscription management
 */

import { getPool } from '../db/postgres-real.js';

export type UserTier = 'free' | 'pro' | 'agency';

export interface UserTierRecord {
  userId: string;
  email: string;
  tier: UserTier;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  campaignsUsedThisMonth: number;
  campaignsLimit: number;
  batchLimit: number;
  customBrandKit: boolean;
  analyticsDepth: 'basic' | 'advanced';
  supportLevel: 'community' | 'email' | '24h-priority';
  monthlyPrice: number;
  createdAt: Date;
  updatedAt: Date;
  subscriptionEndDate: Date | null;
  autoRenew: boolean;
}

const tierConfig = {
  free: {
    campaignsLimit: 5,
    batchLimit: 1,
    customBrandKit: false,
    analyticsDepth: 'basic' as const,
    supportLevel: 'community' as const,
    monthlyPrice: 0,
  },
  pro: {
    campaignsLimit: 50,
    batchLimit: 10,
    customBrandKit: true,
    analyticsDepth: 'advanced' as const,
    supportLevel: 'email' as const,
    monthlyPrice: 79,
  },
  agency: {
    campaignsLimit: 500,
    batchLimit: 100,
    customBrandKit: true,
    analyticsDepth: 'advanced' as const,
    supportLevel: '24h-priority' as const,
    monthlyPrice: 499,
  },
};

/**
 * Initialize user_tiers table
 */
export const initializeUserTiersTable = async (): Promise<void> => {
  try {
    console.log('[UserTiers] Initializing user_tiers table');

    await getPool().query(`
      CREATE TABLE IF NOT EXISTS user_tiers (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL UNIQUE,
        email TEXT NOT NULL,
        tier TEXT NOT NULL CHECK (tier IN ('free', 'pro', 'agency')),
        stripe_customer_id TEXT,
        stripe_subscription_id TEXT,
        campaigns_used_this_month INTEGER DEFAULT 0,
        campaigns_limit INTEGER NOT NULL,
        batch_limit INTEGER NOT NULL,
        custom_brand_kit BOOLEAN DEFAULT false,
        analytics_depth TEXT DEFAULT 'basic',
        support_level TEXT DEFAULT 'community',
        monthly_price DECIMAL(10,2) DEFAULT 0,
        subscription_end_date TIMESTAMP,
        auto_renew BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_user_tiers_user_id ON user_tiers (user_id);
      CREATE INDEX IF NOT EXISTS idx_user_tiers_email ON user_tiers (email);
      CREATE INDEX IF NOT EXISTS idx_user_tiers_stripe_customer ON user_tiers (stripe_customer_id);
    `);

    console.log('[UserTiers] Table initialized');
  } catch (err) {
    console.error('[UserTiers] Failed to initialize:', err);
    throw err;
  }
};

/**
 * Create or update user tier record
 */
export const upsertUserTier = async (
  userId: string,
  email: string,
  tier: UserTier,
  stripeCustomerId?: string,
): Promise<UserTierRecord> => {
  try {
    const config = tierConfig[tier];
    const recordId = `tier_${userId}`;

    const result = await getPool().query(
      `INSERT INTO user_tiers
       (id, user_id, email, tier, stripe_customer_id, campaigns_limit, batch_limit,
        custom_brand_kit, analytics_depth, support_level, monthly_price, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
       ON CONFLICT (user_id) DO UPDATE SET
         tier = $4,
         stripe_customer_id = COALESCE($5, user_tiers.stripe_customer_id),
         campaigns_limit = $6,
         batch_limit = $7,
         custom_brand_kit = $8,
         analytics_depth = $9,
         support_level = $10,
         monthly_price = $11,
         updated_at = NOW()
       RETURNING *`,
      [
        recordId,
        userId,
        email,
        tier,
        stripeCustomerId || null,
        config.campaignsLimit,
        config.batchLimit,
        config.customBrandKit,
        config.analyticsDepth,
        config.supportLevel,
        config.monthlyPrice,
      ],
    );

    if (!result.rows || result.rows.length === 0) {
      throw new Error(`Failed to upsert tier for user ${userId}`);
    }

    return parseUserTierRecord(result.rows[0]);
  } catch (err) {
    console.error('[UserTiers] Upsert failed:', err);
    throw err;
  }
};

/**
 * Get user tier by ID
 */
export const getUserTier = async (userId: string): Promise<UserTierRecord | null> => {
  try {
    const result = await getPool().query(`SELECT * FROM user_tiers WHERE user_id = $1`, [userId]);

    if (!result.rows || result.rows.length === 0) {
      return null;
    }

    return parseUserTierRecord(result.rows[0]);
  } catch (err) {
    console.error('[UserTiers] Get failed:', err);
    return null;
  }
};

/**
 * Record campaign usage
 */
export const incrementCampaignUsage = async (userId: string, count: number = 1): Promise<boolean> => {
  try {
    const result = await getPool().query(
      `UPDATE user_tiers
       SET campaigns_used_this_month = campaigns_used_this_month + $1,
           updated_at = NOW()
       WHERE user_id = $2`,
      [count, userId],
    );

    return (result.rowCount || 0) > 0;
  } catch (err) {
    console.error('[UserTiers] Usage increment failed:', err);
    return false;
  }
};

/**
 * Reset monthly usage (call on 1st of month)
 */
export const resetMonthlyUsage = async (): Promise<void> => {
  try {
    await getPool().query(
      `UPDATE user_tiers
       SET campaigns_used_this_month = 0
       WHERE tier != 'free'`,
    );

    console.log('[UserTiers] Monthly usage reset');
  } catch (err) {
    console.error('[UserTiers] Reset failed:', err);
  }
};

/**
 * Link Stripe subscription to user
 */
export const linkStripeSubscription = async (
  userId: string,
  stripeCustomerId: string,
  stripeSubscriptionId: string,
  subscriptionEndDate: Date,
): Promise<boolean> => {
  try {
    const result = await getPool().query(
      `UPDATE user_tiers
       SET stripe_customer_id = $1,
           stripe_subscription_id = $2,
           subscription_end_date = $3,
           auto_renew = true,
           updated_at = NOW()
       WHERE user_id = $4`,
      [stripeCustomerId, stripeSubscriptionId, subscriptionEndDate, userId],
    );

    return (result.rowCount || 0) > 0;
  } catch (err) {
    console.error('[UserTiers] Stripe link failed:', err);
    return false;
  }
};

/**
 * Parse database row to UserTierRecord
 */
function parseUserTierRecord(row: Record<string, unknown>): UserTierRecord {
  return {
    userId: String(row.user_id || ''),
    email: String(row.email || ''),
    tier: (row.tier as UserTier) || 'free',
    stripeCustomerId: (row.stripe_customer_id as string | null) || null,
    stripeSubscriptionId: (row.stripe_subscription_id as string | null) || null,
    campaignsUsedThisMonth: Number(row.campaigns_used_this_month || 0),
    campaignsLimit: Number(row.campaigns_limit || 5),
    batchLimit: Number(row.batch_limit || 1),
    customBrandKit: Boolean(row.custom_brand_kit || false),
    analyticsDepth: (row.analytics_depth as 'basic' | 'advanced') || 'basic',
    supportLevel: (row.support_level as 'community' | 'email' | '24h-priority') || 'community',
    monthlyPrice: Number(row.monthly_price || 0),
    createdAt: new Date(String(row.created_at || Date.now())),
    updatedAt: new Date(String(row.updated_at || Date.now())),
    subscriptionEndDate: row.subscription_end_date
      ? new Date(String(row.subscription_end_date))
      : null,
    autoRenew: Boolean(row.auto_renew || true),
  };
}
