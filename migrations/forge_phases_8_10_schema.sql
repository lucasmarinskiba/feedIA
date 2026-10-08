-- PHASE 8: Revenue Tracking (Stripe Integration)
-- PHASE 9: Generator Integration (Carousel/Video/Copy)
-- PHASE 10: Instagram Graph OAuth

-- Revenue tracking from Stripe
CREATE TABLE IF NOT EXISTS forge_revenue_tracking (
  id TEXT PRIMARY KEY DEFAULT (gen_random_uuid()::text),
  publish_schedule_id TEXT NOT NULL,
  orchestration_run_id TEXT NOT NULL,
  platform TEXT NOT NULL,
  content_id TEXT NOT NULL,
  stripe_session_id TEXT,
  amount DECIMAL(10, 2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  conversions INT DEFAULT 0,
  conversion_rate REAL DEFAULT 0,
  roi INT DEFAULT 0,
  tracked_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(stripe_session_id)
);

-- Content generator requests (Carousel/Video/Copy)
CREATE TABLE IF NOT EXISTS forge_content_generators (
  id TEXT PRIMARY KEY DEFAULT (gen_random_uuid()::text),
  user_id TEXT NOT NULL,
  generator_type TEXT CHECK (generator_type IN ('carousel', 'video', 'copy')),
  content_id TEXT NOT NULL,
  tema TEXT NOT NULL,
  objetivo TEXT,
  estimated_reach INT DEFAULT 0,
  estimated_engagement INT DEFAULT 0,
  preview_url TEXT,
  status TEXT DEFAULT 'generated' CHECK (status IN ('generated', 'published', 'failed')),
  created_at TIMESTAMP DEFAULT NOW(),
  published_at TIMESTAMP,
  UNIQUE(content_id)
);

-- Publishing history
CREATE TABLE IF NOT EXISTS forge_publishing_history (
  id TEXT PRIMARY KEY DEFAULT (gen_random_uuid()::text),
  content_generator_id TEXT NOT NULL,
  platform TEXT NOT NULL,
  post_url TEXT,
  scheduled_at TIMESTAMP,
  published_at TIMESTAMP,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'published', 'failed')),
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (content_generator_id) REFERENCES forge_content_generators(id)
);

-- Instagram OAuth tokens + connections
CREATE TABLE IF NOT EXISTS forge_instagram_oauth_tokens (
  id TEXT PRIMARY KEY DEFAULT (gen_random_uuid()::text),
  user_id TEXT NOT NULL,
  account_id TEXT NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expires_at TIMESTAMP NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  last_refreshed TIMESTAMP,
  UNIQUE(user_id, account_id)
);

-- OAuth state tracking (for CSRF protection)
CREATE TABLE IF NOT EXISTS forge_oauth_state (
  state TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_revenue_tracking_platform ON forge_revenue_tracking(platform, tracked_at DESC);
CREATE INDEX IF NOT EXISTS idx_revenue_tracking_status ON forge_revenue_tracking(status);
CREATE INDEX IF NOT EXISTS idx_revenue_tracking_stripe_session ON forge_revenue_tracking(stripe_session_id);
CREATE INDEX IF NOT EXISTS idx_content_generators_user_id ON forge_content_generators(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_content_generators_type ON forge_content_generators(generator_type, status);
CREATE INDEX IF NOT EXISTS idx_publishing_history_platform ON forge_publishing_history(platform, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_publishing_history_status ON forge_publishing_history(status);
CREATE INDEX IF NOT EXISTS idx_instagram_oauth_tokens_user_id ON forge_instagram_oauth_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_instagram_oauth_tokens_active ON forge_instagram_oauth_tokens(is_active);
CREATE INDEX IF NOT EXISTS idx_oauth_state_expires ON forge_oauth_state(expires_at);
