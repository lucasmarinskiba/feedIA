/**
 * Payment History + OAuth Token Management
 */

import { getPool } from '../db/postgres-real.js';

export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded';
export type TokenType = 'instagram_oauth' | 'tiktok_oauth' | 'facebook_oauth';

export interface PaymentRecord {
  id: string;
  userId: string;
  amount: number;
  currency: 'USD' | 'ARS';
  provider: 'mercado_pago' | 'stripe';
  providerPaymentId: string;
  status: PaymentStatus;
  tier: string;
  createdAt: Date;
  completedAt: Date | null;
  failureReason: string | null;
}

export interface TokenRecord {
  id: string;
  userId: string;
  platform: TokenType;
  accessToken: string;
  refreshToken: string | null;
  expiresAt: Date | null;
  lastRefreshedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Initialize payment history + token tables
 */
export const initializePaymentTokenTables = async (): Promise<void> => {
  try {
    await getPool().query(`
      CREATE TABLE IF NOT EXISTS payment_history (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        amount DECIMAL(12,2) NOT NULL,
        currency TEXT NOT NULL CHECK (currency IN ('USD', 'ARS')),
        provider TEXT NOT NULL CHECK (provider IN ('mercado_pago', 'stripe')),
        provider_payment_id TEXT NOT NULL UNIQUE,
        status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
        tier TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        completed_at TIMESTAMP,
        failure_reason TEXT,
        FOREIGN KEY (user_id) REFERENCES user_tiers(user_id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS oauth_tokens (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        platform TEXT NOT NULL CHECK (platform IN ('instagram_oauth', 'tiktok_oauth', 'facebook_oauth')),
        access_token TEXT NOT NULL,
        refresh_token TEXT,
        expires_at TIMESTAMP,
        last_refreshed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        FOREIGN KEY (user_id) REFERENCES user_tiers(user_id) ON DELETE CASCADE,
        UNIQUE (user_id, platform)
      );

      CREATE TABLE IF NOT EXISTS subscription_events (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        event_type TEXT NOT NULL,
        provider TEXT NOT NULL,
        provider_event_id TEXT,
        data TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        FOREIGN KEY (user_id) REFERENCES user_tiers(user_id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_payment_user_status ON payment_history (user_id, status);
      CREATE INDEX IF NOT EXISTS idx_payment_provider_id ON payment_history (provider_payment_id);
      CREATE INDEX IF NOT EXISTS idx_payment_created ON payment_history (created_at);

      CREATE INDEX IF NOT EXISTS idx_token_user_platform ON oauth_tokens (user_id, platform);
      CREATE INDEX IF NOT EXISTS idx_token_expires ON oauth_tokens (expires_at);

      CREATE INDEX IF NOT EXISTS idx_event_user_type ON subscription_events (user_id, event_type);
      CREATE INDEX IF NOT EXISTS idx_event_provider ON subscription_events (provider, provider_event_id);
      CREATE INDEX IF NOT EXISTS idx_event_created ON subscription_events (created_at);
    `);

    console.log('[PaymentTokens] Tables initialized');
  } catch (err) {
    console.error('[PaymentTokens] Failed to initialize:', err);
    throw err;
  }
};

/**
 * Record payment attempt
 */
export const recordPayment = async (
  userId: string,
  amount: number,
  currency: 'USD' | 'ARS',
  provider: 'mercado_pago' | 'stripe',
  providerPaymentId: string,
  tier: string,
  status: PaymentStatus = 'pending',
): Promise<string> => {
  try {
    const paymentId = `pay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    await getPool().query(
      `INSERT INTO payment_history (
        id, user_id, amount, currency, provider, provider_payment_id, status, tier
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [paymentId, userId, amount, currency, provider, providerPaymentId, status, tier],
    );

    return paymentId;
  } catch (err) {
    console.error('[Payments] Record failed:', err);
    throw err;
  }
};

/**
 * Update payment status
 */
export const updatePaymentStatus = async (
  paymentId: string,
  status: PaymentStatus,
  failureReason?: string,
): Promise<boolean> => {
  try {
    const completedAt = status === 'completed' ? new Date() : null;

    const result = await getPool().query(
      `UPDATE payment_history
       SET status = $1,
           completed_at = $2,
           failure_reason = $3
       WHERE id = $4`,
      [status, completedAt, failureReason || null, paymentId],
    );

    return (result.rowCount || 0) > 0;
  } catch (err) {
    console.error('[Payments] Update failed:', err);
    return false;
  }
};

/**
 * Get payment history for user
 */
export const getPaymentHistory = async (userId: string, limit = 50): Promise<PaymentRecord[]> => {
  try {
    const result = await getPool().query(
      `SELECT * FROM payment_history
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [userId, limit],
    );

    return (result.rows || []).map((row: Record<string, unknown>) => parsePaymentRecord(row));
  } catch (err) {
    console.error('[Payments] History fetch failed:', err);
    return [];
  }
};

/**
 * Store/update OAuth token
 */
export const storeOAuthToken = async (
  userId: string,
  platform: TokenType,
  accessToken: string,
  refreshToken?: string,
  expiresIn?: number,
): Promise<boolean> => {
  try {
    const tokenId = `tok_${userId}_${platform}`;
    const expiresAt = expiresIn ? new Date(Date.now() + expiresIn * 1000) : null;

    await getPool().query(
      `INSERT INTO oauth_tokens (
        id, user_id, platform, access_token, refresh_token, expires_at, last_refreshed_at
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
       ON CONFLICT (user_id, platform) DO UPDATE SET
         access_token = $4,
         refresh_token = COALESCE($5, oauth_tokens.refresh_token),
         expires_at = $6,
         last_refreshed_at = NOW(),
         updated_at = NOW()`,
      [tokenId, userId, platform, accessToken, refreshToken || null, expiresAt],
    );

    return true;
  } catch (err) {
    console.error('[Tokens] Store failed:', err);
    return false;
  }
};

/**
 * Get OAuth token
 */
export const getOAuthToken = async (userId: string, platform: TokenType): Promise<TokenRecord | null> => {
  try {
    const result = await getPool().query(`SELECT * FROM oauth_tokens WHERE user_id = $1 AND platform = $2`, [
      userId,
      platform,
    ]);

    if (!result.rows || result.rows.length === 0) return null;
    return parseTokenRecord(result.rows[0]);
  } catch (err) {
    console.error('[Tokens] Get failed:', err);
    return null;
  }
};

/**
 * Check if token is expired
 */
export const isTokenExpired = async (userId: string, platform: TokenType): Promise<boolean> => {
  try {
    const token = await getOAuthToken(userId, platform);
    if (!token) return true;
    if (!token.expiresAt) return false; // No expiry = never expires
    return new Date() > token.expiresAt;
  } catch (err) {
    console.error('[Tokens] Expiry check failed:', err);
    return true;
  }
};

/**
 * Log subscription event (webhook received)
 */
export const logSubscriptionEvent = async (
  userId: string,
  eventType: string,
  provider: string,
  providerEventId?: string,
  data?: Record<string, unknown>,
): Promise<boolean> => {
  try {
    const eventId = `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    await getPool().query(
      `INSERT INTO subscription_events (
        id, user_id, event_type, provider, provider_event_id, data
      ) VALUES ($1, $2, $3, $4, $5, $6)`,
      [eventId, userId, eventType, provider, providerEventId || null, JSON.stringify(data || {})],
    );

    return true;
  } catch (err) {
    console.error('[Events] Log failed:', err);
    return false;
  }
};

/**
 * Parse payment record
 */
function parsePaymentRecord(row: Record<string, unknown>): PaymentRecord {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    amount: Number(row.amount),
    currency: (row.currency as 'USD' | 'ARS') || 'USD',
    provider: (row.provider as 'mercado_pago' | 'stripe') || 'stripe',
    providerPaymentId: String(row.provider_payment_id),
    status: (row.status as PaymentStatus) || 'pending',
    tier: String(row.tier),
    createdAt: new Date(String(row.created_at || Date.now())),
    completedAt: row.completed_at ? new Date(String(row.completed_at)) : null,
    failureReason: (row.failure_reason as string | null) || null,
  };
}

/**
 * Parse token record
 */
function parseTokenRecord(row: Record<string, unknown>): TokenRecord {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    platform: (row.platform as TokenType) || 'instagram_oauth',
    accessToken: String(row.access_token),
    refreshToken: (row.refresh_token as string | null) || null,
    expiresAt: row.expires_at ? new Date(String(row.expires_at)) : null,
    lastRefreshedAt: row.last_refreshed_at ? new Date(String(row.last_refreshed_at)) : null,
    createdAt: new Date(String(row.created_at || Date.now())),
    updatedAt: new Date(String(row.updated_at || Date.now())),
  };
}
