export const CREATE_RUNS_TABLE = `
  CREATE TABLE IF NOT EXISTS runs (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    intent TEXT NOT NULL,
    input_data TEXT,
    selected_skill TEXT,
    selected_agent TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    confidence REAL,
    error_message TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME,
    duration_ms INTEGER
  )
`;

export const CREATE_OUTPUTS_TABLE = `
  CREATE TABLE IF NOT EXISTS outputs (
    id TEXT PRIMARY KEY,
    run_id TEXT NOT NULL REFERENCES runs(id),
    generator_type TEXT NOT NULL,
    content_type TEXT,
    content TEXT,
    metadata TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (run_id) REFERENCES runs(id) ON DELETE CASCADE
  )
`;

export const CREATE_SKILL_CACHE_TABLE = `
  CREATE TABLE IF NOT EXISTS skill_cache (
    skill_name TEXT PRIMARY KEY,
    skill_type TEXT NOT NULL,
    content TEXT NOT NULL,
    frontmatter TEXT,
    cached_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME
  )
`;

export const CREATE_STEP_RESULTS_TABLE = `
  CREATE TABLE IF NOT EXISTS step_results (
    id TEXT PRIMARY KEY,
    run_id TEXT NOT NULL REFERENCES runs(id),
    step_index INTEGER NOT NULL,
    step_type TEXT NOT NULL,
    skill_name TEXT NOT NULL,
    status TEXT NOT NULL,
    output_data TEXT,
    error_message TEXT,
    duration_ms INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (run_id) REFERENCES runs(id) ON DELETE CASCADE
  )
`;

export const SCHEMA_MIGRATIONS = [
  { version: 1, sql: CREATE_RUNS_TABLE },
  { version: 2, sql: CREATE_OUTPUTS_TABLE },
  { version: 3, sql: CREATE_SKILL_CACHE_TABLE },
  { version: 4, sql: CREATE_STEP_RESULTS_TABLE },
];

// ============ FeedIA Core Tables (v2 schema) ============

export interface User {
  id: string;
  email: string;
  password_hash: string;
  username?: string;
  created_at: Date;
  updated_at: Date;
  last_login?: Date;
}

// Matches db/migrations/001-init.sql's user_sessions table exactly.
// Was imported by db/auth-queries.ts's getUserSessions() but never
// defined here.
export interface UserSession {
  id: string;
  user_id: string;
  refresh_token: string;
  refresh_token_expires_at: Date;
  created_at: Date;
}

export interface UserTier {
  id: string;
  user_id: string;
  tier: 'free' | 'pro' | 'agency';
  campaigns_used_this_month: number;
  campaigns_limit: number;
  batch_limit: number;
  custom_brand_kit: boolean;
  analytics_depth: 'basic' | 'advanced';
  support_level: 'community' | 'email' | '24h-priority';
  monthly_price: number;
  subscription_end_date?: Date;
  auto_renew: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Campaign {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  platform: 'tiktok' | 'instagram' | 'youtube' | 'all';
  niche?: string;
  status: 'draft' | 'active' | 'paused' | 'archived';
  created_at: Date;
  updated_at: Date;
  published_at?: Date;
  scheduled_for?: Date;
}

export interface Content {
  id: string;
  campaign_id?: string;
  user_id: string;
  type: 'carousel' | 'reel' | 'story' | 'post';
  format?: 'video' | 'image' | 'mixed';
  title?: string;
  description?: string;
  content_path?: string;
  thumbnail_path?: string;
  status: 'draft' | 'ready' | 'published' | 'failed';
  created_at: Date;
  updated_at: Date;
  published_at?: Date;
}

export interface AnalyticsEvent {
  id: string;
  campaign_id?: string;
  content_id?: string;
  user_id: string;
  event_type: 'view' | 'engagement' | 'conversion' | 'share';
  platform?: string;
  metric_value: number;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export interface ABTest {
  id: string;
  campaign_id: string;
  user_id: string;
  name: string;
  variant_a_id: string;
  variant_b_id: string;
  status: 'running' | 'completed' | 'paused';
  winner?: 'a' | 'b' | 'tie';
  created_at: Date;
  completed_at?: Date;
}

export interface BatchJob {
  id: string;
  user_id: string;
  job_type: 'generate' | 'publish' | 'analyze';
  status: 'queued' | 'processing' | 'completed' | 'failed';
  input: Record<string, unknown>;
  output?: Record<string, unknown>;
  error_message?: string;
  created_at: Date;
  started_at?: Date;
  completed_at?: Date;
}

export interface Webhook {
  id: string;
  user_id: string;
  url: string;
  event_types: string;
  is_active: boolean;
  created_at: Date;
  last_triggered?: Date;
}

export interface WebhookDelivery {
  id: string;
  webhook_id: string;
  event_id: string;
  status: 'pending' | 'delivered' | 'failed';
  retry_count: number;
  last_retry_at?: Date;
  error_message?: string;
  created_at: Date;
}

export interface ApiCost {
  id: string;
  user_id: string;
  provider: 'anthropic' | 'deepseek' | 'cerebras' | 'veo' | 'fal';
  operation: string;
  cost: number;
  metadata?: Record<string, unknown>;
  created_at: Date;
}

export interface AuditLog {
  id: string;
  user_id?: string;
  action: string;
  resource_type?: string;
  resource_id?: string;
  changes?: Record<string, unknown>;
  ip_address?: string;
  user_agent?: string;
  timestamp: Date;
}

// ============ Legacy Tables (backward compat) ============

export interface RunRecord {
  id: string;
  user_id?: string;
  intent: string;
  input_data?: string;
  selected_skill: string;
  selected_agent?: string;
  status: 'pending' | 'running' | 'success' | 'partial' | 'failed';
  confidence?: number;
  error_message?: string;
  created_at: string;
  updated_at: string;
  completed_at?: string;
  duration_ms?: number;
}

export interface OutputRecord {
  id: string;
  run_id: string;
  generator_type: string;
  content_type?: string;
  content?: string;
  metadata?: string;
  created_at: string;
}

export interface StepResultRecord {
  id: string;
  run_id: string;
  step_index: number;
  step_type: string;
  skill_name: string;
  status: 'success' | 'failed' | 'skipped';
  output_data?: string;
  error_message?: string;
  duration_ms?: number;
  created_at: string;
}
