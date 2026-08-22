-- FeedIA Core Schema v1
-- Initialize all base tables for 15-system backend

-- Users & Authentication
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  username TEXT UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  refresh_token TEXT UNIQUE NOT NULL,
  refresh_token_expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, refresh_token)
);

-- Subscriptions & Billing (System 8)
CREATE TABLE IF NOT EXISTS user_tiers (
  id TEXT PRIMARY KEY,
  user_id TEXT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tier TEXT NOT NULL CHECK (tier IN ('free', 'pro', 'agency')),
  campaigns_used_this_month INTEGER DEFAULT 0,
  campaigns_limit INTEGER NOT NULL,
  batch_limit INTEGER NOT NULL,
  custom_brand_kit BOOLEAN DEFAULT FALSE,
  analytics_depth TEXT CHECK (analytics_depth IN ('basic', 'advanced')),
  support_level TEXT CHECK (support_level IN ('community', 'email', '24h-priority')),
  monthly_price REAL NOT NULL,
  subscription_end_date TIMESTAMP,
  auto_renew BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Campaigns (System 1: Curation)
CREATE TABLE IF NOT EXISTS campaigns (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  platform TEXT NOT NULL CHECK (platform IN ('tiktok', 'instagram', 'youtube', 'all')),
  niche TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'archived')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  published_at TIMESTAMP,
  scheduled_for TIMESTAMP
);

-- Content (System 1: Curation + System 12: Batching)
CREATE TABLE IF NOT EXISTS content (
  id TEXT PRIMARY KEY,
  campaign_id TEXT REFERENCES campaigns(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('carousel', 'reel', 'story', 'post')),
  format TEXT CHECK (format IN ('video', 'image', 'mixed')),
  title TEXT,
  description TEXT,
  content_path TEXT,
  thumbnail_path TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'ready', 'published', 'failed')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  published_at TIMESTAMP
);

-- Analytics (System 13: Feedback + System 11: ROI)
CREATE TABLE IF NOT EXISTS analytics_events (
  id TEXT PRIMARY KEY,
  campaign_id TEXT REFERENCES campaigns(id) ON DELETE CASCADE,
  content_id TEXT REFERENCES content(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('view', 'engagement', 'conversion', 'share')),
  platform TEXT,
  metric_value REAL DEFAULT 1,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  metadata JSON
);

-- Audience Segments (System 2: Audience)
CREATE TABLE IF NOT EXISTS audience_segments (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  campaign_id TEXT REFERENCES campaigns(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  segment_type TEXT CHECK (segment_type IN ('demographic', 'behavioral', 'interest', 'custom')),
  rules JSON NOT NULL,
  size_estimate INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- A/B Tests (System 4: Testing)
CREATE TABLE IF NOT EXISTS ab_tests (
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  variant_a_id TEXT NOT NULL REFERENCES content(id),
  variant_b_id TEXT NOT NULL REFERENCES content(id),
  status TEXT DEFAULT 'running' CHECK (status IN ('running', 'completed', 'paused')),
  winner TEXT CHECK (winner IN ('a', 'b', 'tie', null)),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP
);

-- Forecasts (System 3: Forecasting)
CREATE TABLE IF NOT EXISTS engagement_forecasts (
  id TEXT PRIMARY KEY,
  content_id TEXT NOT NULL REFERENCES content(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  predicted_views REAL,
  predicted_engagement_rate REAL,
  confidence_score REAL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  forecast_date DATE
);

-- Compliance (System 8: Compliance)
CREATE TABLE IF NOT EXISTS compliance_checks (
  id TEXT PRIMARY KEY,
  content_id TEXT NOT NULL REFERENCES content(id) ON DELETE CASCADE,
  check_type TEXT NOT NULL CHECK (check_type IN ('ftc', 'gdpr', 'platform_rules')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'passed', 'failed')),
  violations TEXT,
  checked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Batch Jobs (System 12: Batching)
CREATE TABLE IF NOT EXISTS batch_jobs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  job_type TEXT NOT NULL CHECK (job_type IN ('generate', 'publish', 'analyze')),
  status TEXT DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'completed', 'failed')),
  input JSON NOT NULL,
  output JSON,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  started_at TIMESTAMP,
  completed_at TIMESTAMP
);

-- Audio Intelligence (System 15)
CREATE TABLE IF NOT EXISTS audio_library (
  id TEXT PRIMARY KEY,
  platform TEXT NOT NULL CHECK (platform IN ('tiktok', 'instagram', 'youtube')),
  niche TEXT,
  audio_name TEXT NOT NULL,
  artist TEXT,
  bpm INTEGER,
  duration_seconds INTEGER,
  virality_score REAL,
  uses INTEGER DEFAULT 0,
  trend_status TEXT CHECK (trend_status IN ('rising', 'stable', 'declining')),
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Webhooks (for delivery tracking)
CREATE TABLE IF NOT EXISTS webhooks (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  event_types TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_triggered TIMESTAMP
);

CREATE TABLE IF NOT EXISTS webhook_deliveries (
  id TEXT PRIMARY KEY,
  webhook_id TEXT NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
  event_id TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'delivered', 'failed')),
  retry_count INTEGER DEFAULT 0,
  last_retry_at TIMESTAMP,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Cost Tracking (System 14 extension)
CREATE TABLE IF NOT EXISTS api_costs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('anthropic', 'deepseek', 'cerebras', 'veo', 'fal')),
  operation TEXT NOT NULL,
  cost REAL NOT NULL,
  metadata JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Audit Logging (Security)
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id),
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id TEXT,
  changes JSON,
  ip_address TEXT,
  user_agent TEXT,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
