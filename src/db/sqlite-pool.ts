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

      // INSERT INTO user_tiers
      if (sqlLower.includes('insert into user_tiers')) {
        const userId = (_params?.[0] as { user_id?: string })?.user_id || String(_params?.[1]);
        const email = (_params?.[0] as { email?: string })?.email || String(_params?.[2]);
        const tier = (_params?.[0] as { tier?: string })?.tier || String(_params?.[3]);

        const newTier: UserTier = {
          id: `user_${userId}`,
          user_id: userId,
          email,
          tier: (tier as 'free' | 'pro' | 'agency') || 'free',
          campaigns_used_this_month: 0,
          campaigns_limit: tier === 'pro' ? 50 : tier === 'agency' ? 500 : 5,
          batch_limit: tier === 'pro' ? 10 : tier === 'agency' ? 100 : 1,
          custom_brand_kit: tier !== 'free',
          analytics_depth: tier === 'free' ? 'basic' : 'advanced',
          support_level: tier === 'agency' ? '24h-priority' : tier === 'pro' ? 'email' : 'community',
          monthly_price: tier === 'pro' ? 79 : tier === 'agency' ? 499 : 0,
          subscription_end_date: null,
          auto_renew: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        dbCache.user_tiers.push(newTier);
        saveDatabase();
        return { rows: [{ id: newTier.id }], rowCount: 1 };
      }

      // SELECT FROM user_tiers WHERE user_id
      if (sqlLower.includes('select') && sqlLower.includes('user_tiers')) {
        const userId = String(_params?.[0]);
        const user = dbCache.user_tiers.find((u) => u.user_id === userId);
        return { rows: user ? [user] : [], rowCount: user ? 1 : 0 };
      }

      // UPDATE user_tiers
      if (sqlLower.includes('update user_tiers')) {
        const userId = String(_params?.[0]);
        const idx = dbCache.user_tiers.findIndex((u) => u.user_id === userId);
        if (idx >= 0) {
          const tierRecord = dbCache.user_tiers[idx];
          if (tierRecord) {
            tierRecord.campaigns_used_this_month += 1;
            tierRecord.updated_at = new Date().toISOString();
            saveDatabase();
            return { rows: [], rowCount: 1 };
          }
        }
        return { rows: [], rowCount: 0 };
      }

      // Generic fallback
      console.warn('[FileDB] Unhandled query:', sql.substring(0, 50));
      return { rows: [], rowCount: 0 };
    },
  };
};
