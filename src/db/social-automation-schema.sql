-- Social Automation Schema
-- Complete Instagram + TikTok integration tables

-- Platform OAuth tokens
CREATE TABLE IF NOT EXISTS user_social_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  platform VARCHAR(20) NOT NULL CHECK(platform IN ('instagram', 'tiktok', 'youtube', 'linkedin')),
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expires_at TIMESTAMP,
  scopes TEXT, -- space-separated
  account_id VARCHAR(255),
  account_username VARCHAR(255),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, platform)
);

-- Scheduled posts (for future publishing)
CREATE TABLE IF NOT EXISTS scheduled_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content_id UUID NOT NULL REFERENCES user_generated_content(id) ON DELETE CASCADE,
  scheduled_at TIMESTAMP NOT NULL,
  platforms JSONB NOT NULL, -- ["instagram", "tiktok"]
  status VARCHAR(20) DEFAULT 'pending' CHECK(status IN ('pending', 'published', 'failed', 'cancelled')),
  retry_count INT DEFAULT 0,
  max_retries INT DEFAULT 3,
  last_error TEXT,
  published_urls JSONB, -- {instagram: "url", tiktok: "url"}
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Content templates
CREATE TABLE IF NOT EXISTS content_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  template_json JSONB NOT NULL, -- {caption_template, hashtags, layout, etc}
  platforms JSONB NOT NULL, -- ["instagram", "tiktok"]
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Performance metrics per post
CREATE TABLE IF NOT EXISTS user_content_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content_id UUID REFERENCES user_generated_content(id) ON DELETE CASCADE,
  platform VARCHAR(20) NOT NULL,
  post_id VARCHAR(255), -- Instagram/TikTok post ID

  -- Metrics
  views INT DEFAULT 0,
  likes INT DEFAULT 0,
  comments INT DEFAULT 0,
  shares INT DEFAULT 0,
  saves INT DEFAULT 0,
  engagement_rate DECIMAL(5,2),
  reach INT DEFAULT 0,
  impressions INT DEFAULT 0,

  -- AI predictions
  predicted_engagement DECIMAL(5,2),
  quality_score DECIMAL(5,2),
  viral_potential DECIMAL(5,2),

  fetched_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- A/B test variants
CREATE TABLE IF NOT EXISTS ab_test_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  test_id VARCHAR(255) NOT NULL,
  variant_name VARCHAR(100) NOT NULL,
  content_id UUID REFERENCES user_generated_content(id),
  variant_data JSONB NOT NULL, -- {caption, hashtags, posting_time}
  platform VARCHAR(20) NOT NULL,
  status VARCHAR(20) DEFAULT 'draft',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, test_id, variant_name)
);

-- Webhook event log (for real-time metric updates)
-- Inbound platform events (comment, like, share). Named social_webhook_events
-- rather than webhook_events because webhook-service.ts already owns a table by
-- that name for the *outbound* delivery queue, which has no user_id. Since both
-- used CREATE TABLE IF NOT EXISTS, whichever ran second silently no-op'd and the
-- index below then failed with: column "user_id" does not exist.
CREATE TABLE IF NOT EXISTS social_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  platform VARCHAR(20) NOT NULL,
  event_type VARCHAR(100), -- comment, like, share, etc
  event_data JSONB NOT NULL,
  processed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Content calendar (planning view)
CREATE TABLE IF NOT EXISTS content_calendar (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  time TIME,
  content_id UUID REFERENCES user_generated_content(id),
  platforms JSONB NOT NULL,
  status VARCHAR(20) DEFAULT 'planned',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, date, time, content_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_social_tokens_user ON user_social_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_social_tokens_platform ON user_social_tokens(platform);
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_user ON scheduled_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_scheduled_at ON scheduled_posts(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_status ON scheduled_posts(status);
CREATE INDEX IF NOT EXISTS idx_content_metrics_user ON user_content_metrics(user_id);
CREATE INDEX IF NOT EXISTS idx_content_metrics_platform ON user_content_metrics(platform);
CREATE INDEX IF NOT EXISTS idx_content_metrics_content ON user_content_metrics(content_id);
CREATE INDEX IF NOT EXISTS idx_ab_variants_user ON ab_test_variants(user_id);
CREATE INDEX IF NOT EXISTS idx_ab_variants_test ON ab_test_variants(test_id);
CREATE INDEX IF NOT EXISTS idx_social_webhook_events_user ON social_webhook_events(user_id);
CREATE INDEX IF NOT EXISTS idx_social_webhook_events_processed ON social_webhook_events(processed);
CREATE INDEX IF NOT EXISTS idx_content_calendar_user_date ON content_calendar(user_id, date);
