/**
 * In-Memory Database Pool
 * JSON persistence for development/testing
 * Fallback when PostgreSQL unavailable
 * No dependencies - works everywhere
 */

interface QueryResult {
  rows: unknown[];
  rowCount: number;
}

interface PoolConnection {
  query: (sql: string, params?: unknown[]) => Promise<QueryResult>;
  close?: () => Promise<void>;
}

interface UserTier {
  id: string;
  user_id: string;
  email: string;
  tier: 'free' | 'pro' | 'agency';
  campaigns_used_this_month: number;
  campaigns_limit: number;
  batch_limit: number;
  custom_brand_kit: boolean;
  analytics_depth: 'basic' | 'advanced';
  support_level: 'community' | 'email' | '24h-priority';
  monthly_price: number;
  subscription_end_date: string | null;
  auto_renew: boolean;
  created_at: string;
  updated_at: string;
}

interface Database {
  user_tiers: UserTier[];
}

// Global in-memory DB cache (persists for lifetime of server process)
let memoryDB: Database = { user_tiers: [] };
const dbInitialized = false;

export const getFilePool = (): PoolConnection => {
  return {
    query: async (sql: string, _params?: unknown[]): Promise<QueryResult> => {
      const sqlLower = sql.toLowerCase();
      const params = (_params || []) as (string | number | boolean | null)[];

      // INSERT INTO user_tiers (with ON CONFLICT support)
      if (sqlLower.includes('insert into user_tiers')) {
        const recordId = String(params[0]);
        const userId = String(params[1]);
        const email = String(params[2]);
        const tier = String(params[3]) as 'free' | 'pro' | 'agency';
        const stripeCustomerId = params[4] ? String(params[4]) : null;
        const campaignsLimit = Number(params[5]) || 5;
        const batchLimit = Number(params[6]) || 1;
        const customBrandKit = params[7] === true || params[7] === 1;
        const analyticsDepth = (params[8] || 'basic') as 'basic' | 'advanced';
        const supportLevel = (params[9] || 'community') as 'community' | 'email' | '24h-priority';
        const monthlyPrice = Number(params[10]) || 0;

        const existingIdx = memoryDB.user_tiers.findIndex((u) => u.user_id === userId);
        const now = new Date().toISOString();

        if (existingIdx >= 0) {
          // Update existing
          const existing = memoryDB.user_tiers[existingIdx];
          if (existing) {
            existing.tier = tier;
            existing.stripe_customer_id = stripeCustomerId || existing.stripe_customer_id;
            existing.campaigns_limit = campaignsLimit;
            existing.batch_limit = batchLimit;
            existing.custom_brand_kit = customBrandKit;
            existing.analytics_depth = analyticsDepth;
            existing.support_level = supportLevel;
            existing.monthly_price = monthlyPrice;
            existing.updated_at = now;
            console.log('[MemoryDB] Updated user tier:', { userId, tier });
            return { rows: [existing], rowCount: 1 };
          }
        } else {
          // Insert new
          const newTier: UserTier = {
            id: recordId,
            user_id: userId,
            email,
            tier,
            campaigns_used_this_month: 0,
            campaigns_limit: campaignsLimit,
            batch_limit: batchLimit,
            custom_brand_kit: customBrandKit,
            analytics_depth: analyticsDepth,
            support_level: supportLevel,
            monthly_price: monthlyPrice,
            subscription_end_date: null,
            auto_renew: true,
            created_at: now,
            updated_at: now,
          };

          memoryDB.user_tiers.push(newTier);
          console.log('[MemoryDB] Inserted user tier:', { userId, tier, dbSize: memoryDB.user_tiers.length });
          return { rows: [newTier], rowCount: 1 };
        }
      }

      // SELECT FROM user_tiers WHERE user_id = $1
      if (sqlLower.includes('select') && sqlLower.includes('user_tiers')) {
        const userId = String(params[0]);
        const user = memoryDB.user_tiers.find((u) => u.user_id === userId);
        console.log('[MemoryDB] SELECT user:', { userId, found: !!user, dbSize: memoryDB.user_tiers.length, allUserIds: memoryDB.user_tiers.map(u => u.user_id) });
        return { rows: user ? [user] : [], rowCount: user ? 1 : 0 };
      }

      // UPDATE user_tiers (campaigns_used_this_month + increment WHERE user_id = $2)
      if (sqlLower.includes('update user_tiers')) {
        const incrementBy = Number(params[0]) || 1;
        const userId = String(params[1]);
        const idx = memoryDB.user_tiers.findIndex((u) => u.user_id === userId);
        if (idx >= 0) {
          const tierRecord = memoryDB.user_tiers[idx];
          if (tierRecord) {
            tierRecord.campaigns_used_this_month += incrementBy;
            tierRecord.updated_at = new Date().toISOString();
            console.log('[MemoryDB] Updated campaign usage:', { userId, newUsage: tierRecord.campaigns_used_this_month });
            return { rows: [], rowCount: 1 };
          }
        }
        return { rows: [], rowCount: 0 };
      }

      console.warn('[MemoryDB] Unhandled query:', sql.substring(0, 50));
      return { rows: [], rowCount: 0 };
    },
  };
};
