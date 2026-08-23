-- Users and Authentication Schema
-- PostgreSQL schema for user management, tiers, and storage tracking

-- Core users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  username TEXT UNIQUE,
  password_hash TEXT NOT NULL,
  tier VARCHAR(20) NOT NULL DEFAULT 'free', -- free, pro, agency
  plan VARCHAR(20) NOT NULL DEFAULT 'free',
  status VARCHAR(20) NOT NULL DEFAULT 'active', -- active, suspended, deleted

  -- Personal info
  first_name TEXT,
  last_name TEXT,
  avatar_url TEXT,
  bio TEXT,

  -- Consumption tracking
  api_calls_this_month INT DEFAULT 0,
  api_calls_limit INT DEFAULT 1000, -- tier-based
  storage_used_gb DECIMAL(10, 2) DEFAULT 0,
  storage_limit_gb INT DEFAULT 5, -- tier-based
  video_storage_used_gb DECIMAL(10, 2) DEFAULT 0,
  video_storage_limit_gb INT DEFAULT 0, -- 0 for free

  -- Billing
  stripe_customer_id TEXT UNIQUE,
  stripe_subscription_id TEXT,
  billing_email TEXT,
  billing_phone TEXT,
  billing_address TEXT,
  billing_country TEXT,

  -- Security
  two_factor_enabled BOOLEAN DEFAULT FALSE,
  two_factor_secret TEXT,
  ip_whitelist TEXT, -- JSON array
  last_login_at TIMESTAMP,
  last_login_ip TEXT,
  login_attempts INT DEFAULT 0,
  locked_until TIMESTAMP,

  -- Preferences
  language VARCHAR(5) DEFAULT 'es',
  timezone VARCHAR(50) DEFAULT 'America/Argentina/Buenos_Aires',
  notifications_enabled BOOLEAN DEFAULT TRUE,
  email_digest VARCHAR(20) DEFAULT 'weekly', -- daily, weekly, monthly, never
  dark_mode BOOLEAN DEFAULT FALSE,

  -- Audit
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP
);

-- Refresh tokens for session management
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  device_name TEXT,
  device_ip TEXT,
  user_agent TEXT,
  expires_at TIMESTAMP NOT NULL,
  revoked_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- User API keys (for programmatic access)
CREATE TABLE IF NOT EXISTS user_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  key_hash TEXT NOT NULL UNIQUE, -- hashed API key
  key_prefix VARCHAR(10), -- first 10 chars for display
  name TEXT, -- user-friendly name
  last_used_at TIMESTAMP,
  expires_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMP
);

-- Generated content (posts, videos, carousels)
CREATE TABLE IF NOT EXISTS user_generated_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  carousel_id UUID REFERENCES carousels(id) ON DELETE CASCADE,
  content_type VARCHAR(20) NOT NULL, -- post, carousel, reel, story, video
  title TEXT,
  description TEXT,
  platform VARCHAR(50), -- instagram, tiktok, youtube, etc
  status VARCHAR(20) DEFAULT 'draft', -- draft, scheduled, published, archived, deleted

  -- File info
  file_url TEXT,
  file_size_mb DECIMAL(10, 2),
  file_type VARCHAR(20), -- image, video, carousel
  duration_seconds INT,

  -- Metadata
  metadata JSONB, -- platform-specific data, dimensions, etc
  tags TEXT, -- comma-separated

  -- Performance
  published_at TIMESTAMP,
  views INT DEFAULT 0,
  likes INT DEFAULT 0,
  comments INT DEFAULT 0,
  shares INT DEFAULT 0,
  saves INT DEFAULT 0,
  engagement_rate DECIMAL(5, 2),

  -- Audit
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP
);

-- User folders/collections
CREATE TABLE IF NOT EXISTS user_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  color VARCHAR(7), -- hex color
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, name)
);

-- Content organization (content -> folders many-to-many)
CREATE TABLE IF NOT EXISTS content_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID NOT NULL REFERENCES user_generated_content(id) ON DELETE CASCADE,
  folder_id UUID NOT NULL REFERENCES user_folders(id) ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(content_id, folder_id)
);

-- Usage tracking (daily consumption)
CREATE TABLE IF NOT EXISTS user_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  api_calls INT DEFAULT 0,
  storage_added_gb DECIMAL(10, 2) DEFAULT 0,
  video_storage_added_gb DECIMAL(10, 2) DEFAULT 0,
  content_generated INT DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- Audit log (security, access, changes)
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL, -- login, logout, file_upload, api_call, tier_change, etc
  resource_type VARCHAR(50), -- user, content, api_key, etc
  resource_id TEXT,
  details JSONB,
  ip_address INET,
  user_agent TEXT,
  status VARCHAR(20) DEFAULT 'success', -- success, failure
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_tier ON users(tier);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);
CREATE INDEX IF NOT EXISTS idx_users_deleted_at ON users(deleted_at) WHERE deleted_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);

CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON user_api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON user_api_keys(key_hash);

CREATE INDEX IF NOT EXISTS idx_content_user_id ON user_generated_content(user_id);
CREATE INDEX IF NOT EXISTS idx_content_status ON user_generated_content(status);
CREATE INDEX IF NOT EXISTS idx_content_platform ON user_generated_content(platform);
CREATE INDEX IF NOT EXISTS idx_content_created_at ON user_generated_content(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_content_published_at ON user_generated_content(published_at DESC) WHERE published_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_folders_user_id ON user_folders(user_id);

CREATE INDEX IF NOT EXISTS idx_usage_user_date ON user_usage(user_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_audit_user_id ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_created_at ON audit_log(created_at DESC);
