/**
 * File-based Database Pool
 * JSON persistence for development/testing
 * Fallback when PostgreSQL unavailable
 * No native dependencies - works everywhere
 */

import fs from 'fs';
import path from 'path';

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

const dbPath = path.resolve(process.cwd(), 'feedia-dev.json');
let dbCache: Database = { user_tiers: [] };

const loadDatabase = (): void => {
  try {
    if (fs.existsSync(dbPath)) {
      const data = fs.readFileSync(dbPath, 'utf-8');
      dbCache = JSON.parse(data);
      console.log('[FileDB] Loaded from', { dbPath, records: dbCache.user_tiers.length });
    } else {
      dbCache = { user_tiers: [] };
      saveDatabase();
      console.log('[FileDB] Initialized new database at', { dbPath });
    }
  } catch (err) {
    console.error('[FileDB] Load error:', err);
    dbCache = { user_tiers: [] };
  }
};

const saveDatabase = (): void => {
  try {
    fs.writeFileSync(dbPath, JSON.stringify(dbCache, null, 2));
  } catch (err) {
    console.error('[FileDB] Save error:', err);
  }
};

export const getFilePool = (): PoolConnection => {
  loadDatabase();

  return {
    query: async (sql: string, _params?: unknown[]): Promise<QueryResult> => {
      const sqlLower = sql.toLowerCase();
      const params = (_params || []) as (string | number | boolean | null)[];

      // INSERT INTO user_tiers (with ON CONFLICT support)
      if (sqlLower.includes('insert into user_tiers')) {
        // Parse params: [$1=id, $2=user_id, $3=email, $4=tier, $5=stripe_customer_id, $6=campaigns_limit, $7=batch_limit, $8=custom_brand_kit, $9=analytics_depth, $10=support_level, $11=monthly_price]
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

        // Check if user exists (for ON CONFLICT behavior)
        const existingIdx = dbCache.user_tiers.findIndex((u) => u.user_id === userId);
        const now = new Date().toISOString();

        if (existingIdx >= 0) {
          // Update existing
          const existing = dbCache.user_tiers[existingIdx];
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
            saveDatabase();
            console.log('[FileDB] Updated user tier:', { userId, tier });
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

          dbCache.user_tiers.push(newTier);
          saveDatabase();
          console.log('[FileDB] Inserted user tier:', { userId, tier, dbSize: dbCache.user_tiers.length });
          return { rows: [newTier], rowCount: 1 };
        }
      }

      // SELECT FROM user_tiers WHERE user_id = $1
      if (sqlLower.includes('select') && sqlLower.includes('user_tiers')) {
        const userId = String(params[0]);
        const user = dbCache.user_tiers.find((u) => u.user_id === userId);
        console.log('[FileDB] SELECT user:', { userId, found: !!user, dbSize: dbCache.user_tiers.length, allUserIds: dbCache.user_tiers.map(u => u.user_id) });
        return { rows: user ? [user] : [], rowCount: user ? 1 : 0 };
      }

      // UPDATE user_tiers (campaigns_used_this_month + 1 WHERE user_id = $2)
      if (sqlLower.includes('update user_tiers')) {
        const incrementBy = Number(params[0]) || 1;
        const userId = String(params[1]);
        const idx = dbCache.user_tiers.findIndex((u) => u.user_id === userId);
        if (idx >= 0) {
          const tierRecord = dbCache.user_tiers[idx];
          if (tierRecord) {
            tierRecord.campaigns_used_this_month += incrementBy;
            tierRecord.updated_at = new Date().toISOString();
            saveDatabase();
            return { rows: [], rowCount: 1 };
          }
        }
        return { rows: [], rowCount: 0 };
      }

      console.warn('[FileDB] Unhandled query:', sql.substring(0, 50));
      return { rows: [], rowCount: 0 };
    },
  };
};
