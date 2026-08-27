/**
 * Type-safe database query wrappers
 * Provides generic queryAs<T> and specific typed query helpers
 * Reduces `unknown` type errors in services and API routes
 */

import { getPool } from './postgres-real.js';

/**
 * Generic typed query wrapper
 * Usage: const users = await queryAs<UserRow>(sql, params);
 */
export const queryAs = async <T>(sql: string, params: unknown[] = []): Promise<T[]> => {
  const pool = getPool();
  try {
    const result = await pool.query(sql, params);
    return (result.rows || []) as T[];
  } catch (error) {
    console.error('[TypedQueries] Query error:', { sql: sql.substring(0, 100), error });
    throw error;
  }
};

/**
 * Query single row with type safety
 * Returns null if no rows found
 */
export const queryOneAs = async <T>(
  sql: string,
  params: unknown[] = [],
): Promise<T | null> => {
  const rows = await queryAs<T>(sql, params);
  return rows.length > 0 ? rows[0] : null;
};

/**
 * Execute mutation (INSERT/UPDATE/DELETE) and return affected row count
 */
export const executeMutation = async (sql: string, params: unknown[] = []): Promise<number> => {
  const pool = getPool();
  try {
    const result = await pool.query(sql, params);
    return result.rowCount || 0;
  } catch (error) {
    console.error('[TypedQueries] Mutation error:', { sql: sql.substring(0, 100), error });
    throw error;
  }
};

/**
 * Count query helper
 */
export const countAs = async (sql: string, params: unknown[] = []): Promise<number> => {
  interface CountRow {
    count: string | number;
  }
  const rows = await queryAs<CountRow>(sql, params);
  const count = rows[0]?.count;
  return typeof count === 'string' ? parseInt(count, 10) : count || 0;
};

// ============================================================================
// TABLE-SPECIFIC ROW TYPES
// ============================================================================

/**
 * Users table row
 */
export interface UserRow {
  id: string;
  email: string;
  username?: string;
  password_hash?: string;
  full_name?: string;
  avatar_url?: string;
  bio?: string;
  phone?: string;
  verified_at?: string;
  two_factor_enabled?: boolean;
  preferences?: string; // JSON
  tier?: string;
  storage_used_gb?: number;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
}

/**
 * Carousel storage row
 */
export interface CarouselRow {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  slides: string; // JSON array
  template_id?: string;
  visibility?: 'private' | 'public' | 'draft';
  engagement_score?: number;
  shared_count?: number;
  liked_count?: number;
  viewed_count?: number;
  created_at?: string;
  updated_at?: string;
  published_at?: string | null;
}

/**
 * Video storage row
 */
export interface VideoStorageRow {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  file_path?: string;
  file_size_mb?: number;
  duration_seconds?: number;
  resolution?: string; // e.g., 1920x1080
  codec?: string;
  frame_rate?: number;
  created_at?: string;
  updated_at?: string;
  processing_status?: 'pending' | 'processing' | 'completed' | 'failed';
  error_message?: string | null;
}

/**
 * Webhook tracking row
 */
export interface WebhookRow {
  id: string;
  source: string; // stripe, mercadopago, etc
  event_type: string;
  payload: string; // JSON
  signature?: string;
  verified: boolean;
  processing_status?: 'pending' | 'processed' | 'failed';
  error_message?: string | null;
  created_at?: string;
  processed_at?: string | null;
}

/**
 * Payment token row
 */
export interface PaymentTokenRow {
  id: string;
  user_id: string;
  provider: string; // stripe, mercadopago
  token_type: string; // payment_method, card, etc
  provider_token_id: string;
  last_four?: string;
  brand?: string;
  expiry_month?: number;
  expiry_year?: number;
  is_default: boolean;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
}

/**
 * Content storage row
 */
export interface ContentStorageRow {
  id: string;
  user_id: string;
  type: string; // image, video, carousel, etc
  title?: string;
  description?: string;
  file_path?: string;
  file_size_bytes?: number;
  mime_type?: string;
  storage_provider?: string; // s3, local, etc
  metadata?: string; // JSON
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
}

/**
 * Analytics event row
 */
export interface AnalyticsEventRow {
  id: string;
  carousel_id?: string;
  user_id?: string;
  event_type: string;
  source?: string;
  user_agent?: string;
  referrer?: string;
  metadata?: string; // JSON
  created_at?: string;
}

/**
 * Carousel metrics daily row
 */
export interface CarouselMetricsDailyRow {
  id: string;
  carousel_id: string;
  date: string; // YYYY-MM-DD
  views: number;
  views_unique: number;
  shares: number;
  saves: number;
  likes: number;
  engagement_rate: number;
  created_at?: string;
  updated_at?: string;
}

/**
 * Subscription/Tier row
 */
export interface SubscriptionRow {
  id: string;
  user_id: string;
  tier: string; // free, pro, enterprise
  status: string; // active, canceled, expired
  current_period_start?: string;
  current_period_end?: string;
  canceled_at?: string | null;
  payment_method_id?: string;
  provider?: string; // stripe, mercadopago
  provider_subscription_id?: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * Audit log row
 */
export interface AuditLogRow {
  id: string;
  user_id?: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  changes?: string; // JSON
  ip_address?: string;
  user_agent?: string;
  created_at?: string;
}

/**
 * 2FA session row
 */
export interface TwoFactorSessionRow {
  id: string;
  user_id: string;
  secret: string;
  backup_codes?: string; // JSON array
  verified_at?: string | null;
  expires_at?: string;
  created_at?: string;
}

/**
 * Feedback row
 */
export interface FeedbackRow {
  id: string;
  user_id?: string;
  resource_type: string;
  resource_id: string;
  rating: number; // 1-5 stars
  comment?: string;
  metadata?: string; // JSON
  created_at?: string;
  updated_at?: string;
}

/**
 * User account row (settings/preferences)
 */
export interface UserAccountRow extends UserRow {
  last_login_at?: string | null;
  login_count?: number;
  email_verified?: boolean;
  marketing_consent?: boolean;
}

/**
 * Prompt library row
 */
export interface PromptRow {
  id: string;
  batch_id: string;
  category: string;
  base_template: string;
  placeholders?: string; // JSON
  required_params?: string; // JSON array
  optional_params?: string; // JSON array
  version?: number;
  created_at?: string;
  updated_at?: string;
}

/**
 * Campaign row (Instagram content campaigns)
 */
export interface CampaignRow {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  status: string; // draft, scheduled, active, completed
  target_audience?: string; // JSON
  start_date?: string;
  end_date?: string;
  posts_count?: number;
  engagement_score?: number;
  created_at?: string;
  updated_at?: string;
}

/**
 * User-generated content row
 */
export interface UserGeneratedContentRow {
  id: string;
  user_id: string;
  campaign_id?: string;
  content_type: string; // image, video, text
  title?: string;
  content?: string;
  media_url?: string;
  metadata?: string; // JSON
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
}

/**
 * Social media credentials row
 */
export interface SocialCredentialRow {
  id: string;
  user_id: string;
  platform: string; // instagram, tiktok, youtube
  access_token?: string;
  refresh_token?: string;
  token_expires_at?: string | null;
  user_info?: string; // JSON with platform account info
  permissions?: string; // JSON array
  created_at?: string;
  updated_at?: string;
  revoked_at?: string | null;
}
