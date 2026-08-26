/**
 * User Accounts Management
 * Multi-platform (Instagram, TikTok, Facebook) account connections per user
 * Independent quota tracking + content publishing per account
 */

import { getPool } from '../db/postgres-real.js';

export type Platform = 'instagram' | 'tiktok' | 'facebook';

export interface UserAccount {
  id: string;
  userId: string;
  platform: Platform;
  accountHandle: string;
  accountId: string;
  accessToken: string;
  refreshToken: string | null;
  tokenExpiresAt: Date | null;
  monthlyQuotaPercent: number; // 0-100, percentage of tier's limit
  createdAt: Date;
  updatedAt: Date;
}

export interface AccountQuota {
  id: string;
  userId: string;
  accountId: string;
  tier: string;
  periodStart: Date;
  periodEnd: Date;
  carouselsLimit: number;
  carouselsUsed: number;
  storiesLimit: number;
  storiesUsed: number;
  videosLimit: number;
  videosUsed: number;
}

export interface AccountContent {
  id: string;
  userId: string;
  accountId: string;
  platform: Platform;
  contentId: string; // Instagram post_id, TikTok video_id
  format: 'carousel' | 'story' | 'video' | 'post';
  publishedAt: Date;
  metrics: {
    likes?: number;
    comments?: number;
    shares?: number;
    saves?: number;
    reach?: number;
    impressions?: number;
  } | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Initialize accounts tables
 */
export const initializeAccountsTables = async (): Promise<void> => {
  try {
    await getPool().query(`
      CREATE TABLE IF NOT EXISTS user_accounts (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        platform TEXT NOT NULL CHECK (platform IN ('instagram', 'tiktok', 'facebook')),
        account_handle TEXT NOT NULL,
        account_id TEXT NOT NULL,
        access_token TEXT NOT NULL,
        refresh_token TEXT,
        token_expires_at TIMESTAMP,
        monthly_quota_percent NUMERIC(3,0) DEFAULT 100 CHECK (monthly_quota_percent > 0 AND monthly_quota_percent <= 100),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        FOREIGN KEY (user_id) REFERENCES user_tiers(user_id) ON DELETE CASCADE,
        UNIQUE (user_id, platform, account_id)
      );

      CREATE TABLE IF NOT EXISTS account_quotas (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        account_id TEXT NOT NULL,
        tier TEXT NOT NULL,
        period_start TIMESTAMP NOT NULL,
        period_end TIMESTAMP NOT NULL,
        carousels_limit INTEGER NOT NULL DEFAULT 0,
        carousels_used INTEGER NOT NULL DEFAULT 0,
        stories_limit INTEGER NOT NULL DEFAULT 0,
        stories_used INTEGER NOT NULL DEFAULT 0,
        videos_limit INTEGER NOT NULL DEFAULT 0,
        videos_used INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        FOREIGN KEY (user_id) REFERENCES user_tiers(user_id) ON DELETE CASCADE,
        FOREIGN KEY (account_id) REFERENCES user_accounts(id) ON DELETE CASCADE,
        UNIQUE (user_id, account_id, period_start)
      );

      CREATE TABLE IF NOT EXISTS account_content (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        account_id TEXT NOT NULL,
        platform TEXT NOT NULL,
        content_id TEXT NOT NULL,
        format TEXT NOT NULL CHECK (format IN ('carousel', 'story', 'video', 'post')),
        published_at TIMESTAMP NOT NULL,
        metrics TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        FOREIGN KEY (user_id) REFERENCES user_tiers(user_id) ON DELETE CASCADE,
        FOREIGN KEY (account_id) REFERENCES user_accounts(id) ON DELETE CASCADE,
        UNIQUE (platform, content_id)
      );

      CREATE INDEX IF NOT EXISTS idx_user_accounts_user_id ON user_accounts (user_id);
      CREATE INDEX IF NOT EXISTS idx_user_accounts_platform ON user_accounts (user_id, platform);

      CREATE INDEX IF NOT EXISTS idx_account_quota_period ON account_quotas (user_id, account_id, period_end);

      CREATE INDEX IF NOT EXISTS idx_content_user_account ON account_content (user_id, account_id);
      CREATE INDEX IF NOT EXISTS idx_content_published ON account_content (user_id, published_at);
    `);

    console.log('[Accounts] Tables initialized');
  } catch (err) {
    console.error('[Accounts] Failed to initialize:', err);
    throw err;
  }
};

/**
 * Connect new account (OAuth callback stores tokens)
 */
export const connectAccount = async (
  userId: string,
  platform: Platform,
  accountHandle: string,
  accountId: string,
  accessToken: string,
  refreshToken?: string,
  tokenExpiresIn?: number,
): Promise<UserAccount> => {
  try {
    const id = `acc_${userId}_${platform}_${Date.now()}`;
    const tokenExpiresAt = tokenExpiresIn ? new Date(Date.now() + tokenExpiresIn * 1000) : null;

    const result = await getPool().query(
      `INSERT INTO user_accounts (
        id, user_id, platform, account_handle, account_id, access_token, refresh_token, token_expires_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (user_id, platform, account_id) DO UPDATE SET
         access_token = $6,
         refresh_token = COALESCE($7, user_accounts.refresh_token),
         token_expires_at = $8,
         updated_at = NOW()
       RETURNING *`,
      [id, userId, platform, accountHandle, accountId, accessToken, refreshToken || null, tokenExpiresAt],
    );

    if (!result.rows || result.rows.length === 0) {
      throw new Error('Failed to connect account');
    }

    return parseAccountRecord(result.rows[0]);
  } catch (err) {
    console.error('[Accounts] Connect failed:', err);
    throw err;
  }
};

/**
 * Get all accounts for user
 */
export const getUserAccounts = async (userId: string): Promise<UserAccount[]> => {
  try {
    const result = await getPool().query(
      `SELECT * FROM user_accounts WHERE user_id = $1 ORDER BY platform, created_at`,
      [userId],
    );

    return (result.rows || []).map((row: Record<string, unknown>) => parseAccountRecord(row));
  } catch (err) {
    console.error('[Accounts] Get failed:', err);
    return [];
  }
};

/**
 * Get single account
 */
export const getAccount = async (accountId: string): Promise<UserAccount | null> => {
  try {
    const result = await getPool().query(
      `SELECT * FROM user_accounts WHERE id = $1`,
      [accountId],
    );

    if (!result.rows || result.rows.length === 0) return null;
    return parseAccountRecord(result.rows[0]);
  } catch (err) {
    console.error('[Accounts] Get single failed:', err);
    return null;
  }
};

/**
 * Disconnect account
 */
export const disconnectAccount = async (accountId: string, userId: string): Promise<boolean> => {
  try {
    const result = await getPool().query(
      `DELETE FROM user_accounts WHERE id = $1 AND user_id = $2`,
      [accountId, userId],
    );

    return (result.rowCount || 0) > 0;
  } catch (err) {
    console.error('[Accounts] Disconnect failed:', err);
    return false;
  }
};

/**
 * Update quota allocation (% of tier's limit for this account)
 */
export const updateAccountQuotaPercent = async (
  accountId: string,
  quotaPercent: number,
): Promise<boolean> => {
  try {
    if (quotaPercent <= 0 || quotaPercent > 100) {
      throw new Error('Quota percent must be 1-100');
    }

    const result = await getPool().query(
      `UPDATE user_accounts SET monthly_quota_percent = $1, updated_at = NOW() WHERE id = $2`,
      [quotaPercent, accountId],
    );

    return (result.rowCount || 0) > 0;
  } catch (err) {
    console.error('[Accounts] Update quota failed:', err);
    return false;
  }
};

/**
 * Get or create quota record for account (current period)
 */
export const getOrCreateAccountQuota = async (
  userId: string,
  accountId: string,
  tier: string,
  tierLimits: { carousels: number; stories: number; videos: number },
): Promise<AccountQuota> => {
  try {
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const account = await getAccount(accountId);
    if (!account) throw new Error('Account not found');

    const quotaPercent = account.monthlyQuotaPercent / 100;
    const carouselsLimit = Math.floor(tierLimits.carousels * quotaPercent);
    const storiesLimit = Math.floor(tierLimits.stories * quotaPercent);
    const videosLimit = Math.floor(tierLimits.videos * quotaPercent);

    const result = await getPool().query(
      `INSERT INTO account_quotas (
        id, user_id, account_id, tier, period_start, period_end,
        carousels_limit, stories_limit, videos_limit
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (user_id, account_id, period_start) DO NOTHING
       RETURNING *`,
      [
        `quota_${userId}_${accountId}_${periodStart.getTime()}`,
        userId,
        accountId,
        tier,
        periodStart,
        periodEnd,
        carouselsLimit,
        storiesLimit,
        videosLimit,
      ],
    );

    if (!result.rows || result.rows.length === 0) {
      // Already exists, fetch it
      const fetchResult = await getPool().query(
        `SELECT * FROM account_quotas WHERE user_id = $1 AND account_id = $2 AND period_start = $3`,
        [userId, accountId, periodStart],
      );
      if (!fetchResult.rows || fetchResult.rows.length === 0) {
        throw new Error('Failed to get quota');
      }
      return parseQuotaRecord(fetchResult.rows[0]);
    }

    return parseQuotaRecord(result.rows[0]);
  } catch (err) {
    console.error('[Accounts] Get/create quota failed:', err);
    throw err;
  }
};

/**
 * Check account quota before generation
 */
export const checkAccountFormatQuota = async (
  accountId: string,
  format: 'carousels' | 'stories' | 'videos',
  count: number = 1,
): Promise<{ allowed: boolean; used: number; limit: number; reason?: string }> => {
  try {
    const account = await getAccount(accountId);
    if (!account) return { allowed: false, used: 0, limit: 0, reason: 'Account not found' };

    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const result = await getPool().query(
      `SELECT * FROM account_quotas WHERE account_id = $1 AND period_start = $2`,
      [accountId, periodStart],
    );

    if (!result.rows || result.rows.length === 0) {
      return { allowed: false, used: 0, limit: 0, reason: 'Quota not initialized' };
    }

    const quota = parseQuotaRecord(result.rows[0]);
    const limitField = `${format}_limit` as keyof AccountQuota;
    const usedField = `${format}_used` as keyof AccountQuota;

    const limit = quota[limitField] as number;
    const used = quota[usedField] as number;
    const remaining = limit - used;

    return {
      allowed: remaining >= count,
      used,
      limit,
      reason: remaining < count ? `Limit reached: ${used}/${limit} used` : undefined,
    };
  } catch (err) {
    console.error('[Accounts] Quota check failed:', err);
    return { allowed: false, used: 0, limit: 0, reason: 'Quota check error' };
  }
};

/**
 * Increment format usage for account
 */
export const incrementAccountFormatUsage = async (
  accountId: string,
  format: 'carousels' | 'stories' | 'videos',
  count: number = 1,
): Promise<boolean> => {
  try {
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const usedField = `${format}_used`;
    const result = await getPool().query(
      `UPDATE account_quotas
       SET ${usedField} = ${usedField} + $1
       WHERE account_id = $2 AND period_start = $3`,
      [count, accountId, periodStart],
    );

    return (result.rowCount || 0) > 0;
  } catch (err) {
    console.error('[Accounts] Usage increment failed:', err);
    return false;
  }
};

/**
 * Record published content
 */
export const recordPublishedContent = async (
  userId: string,
  accountId: string,
  platform: Platform,
  contentId: string,
  format: 'carousel' | 'story' | 'video' | 'post',
  publishedAt: Date,
): Promise<AccountContent> => {
  try {
    const id = `content_${contentId}_${Date.now()}`;

    const result = await getPool().query(
      `INSERT INTO account_content (
        id, user_id, account_id, platform, content_id, format, published_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [id, userId, accountId, platform, contentId, format, publishedAt],
    );

    if (!result.rows || result.rows.length === 0) {
      throw new Error('Failed to record content');
    }

    return parseContentRecord(result.rows[0]);
  } catch (err) {
    console.error('[Accounts] Record content failed:', err);
    throw err;
  }
};

/**
 * Update content metrics (after polling Instagram/TikTok APIs)
 */
export const updateContentMetrics = async (
  contentId: string,
  metrics: { likes?: number; comments?: number; shares?: number; saves?: number; reach?: number; impressions?: number },
): Promise<boolean> => {
  try {
    const result = await getPool().query(
      `UPDATE account_content SET metrics = $1, updated_at = NOW() WHERE id = $2`,
      [JSON.stringify(metrics), contentId],
    );

    return (result.rowCount || 0) > 0;
  } catch (err) {
    console.error('[Accounts] Update metrics failed:', err);
    return false;
  }
};

/**
 * Parse account record
 */
function parseAccountRecord(row: Record<string, unknown>): UserAccount {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    platform: (row.platform as Platform) || 'instagram',
    accountHandle: String(row.account_handle),
    accountId: String(row.account_id),
    accessToken: String(row.access_token),
    refreshToken: (row.refresh_token as string | null) || null,
    tokenExpiresAt: row.token_expires_at ? new Date(String(row.token_expires_at)) : null,
    monthlyQuotaPercent: Number(row.monthly_quota_percent || 100),
    createdAt: new Date(String(row.created_at || Date.now())),
    updatedAt: new Date(String(row.updated_at || Date.now())),
  };
}

/**
 * Parse quota record
 */
function parseQuotaRecord(row: Record<string, unknown>): AccountQuota {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    accountId: String(row.account_id),
    tier: String(row.tier),
    periodStart: new Date(String(row.period_start)),
    periodEnd: new Date(String(row.period_end)),
    carouselsLimit: Number(row.carousels_limit || 0),
    carouselsUsed: Number(row.carousels_used || 0),
    storiesLimit: Number(row.stories_limit || 0),
    storiesUsed: Number(row.stories_used || 0),
    videosLimit: Number(row.videos_limit || 0),
    videosUsed: Number(row.videos_used || 0),
  };
}

/**
 * Parse content record
 */
function parseContentRecord(row: Record<string, unknown>): AccountContent {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    accountId: String(row.account_id),
    platform: (row.platform as Platform) || 'instagram',
    contentId: String(row.content_id),
    format: (row.format as 'carousel' | 'story' | 'video' | 'post') || 'post',
    publishedAt: new Date(String(row.published_at)),
    metrics: row.metrics ? JSON.parse(String(row.metrics)) : null,
    createdAt: new Date(String(row.created_at || Date.now())),
    updatedAt: new Date(String(row.updated_at || Date.now())),
  };
}
