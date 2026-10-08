-- PHASE 7: Orchestrator (Instagram Graph API + Content Generators)

-- Instagram account connections
CREATE TABLE IF NOT EXISTS forge_instagram_accounts (
  id TEXT PRIMARY KEY DEFAULT (gen_random_uuid()::text),
  user_id TEXT NOT NULL,
  account_id TEXT NOT NULL,
  username TEXT NOT NULL,
  business_account_id TEXT,
  access_token TEXT NOT NULL,
  follower_count INT DEFAULT 0,
  avg_engagement_rate REAL DEFAULT 0,
  connected_at TIMESTAMP DEFAULT NOW(),
  last_synced TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  UNIQUE(user_id, account_id)
);

-- Instagram post cache (for historical analysis)
CREATE TABLE IF NOT EXISTS forge_instagram_posts (
  id TEXT PRIMARY KEY DEFAULT (gen_random_uuid()::text),
  instagram_account_id TEXT NOT NULL,
  post_id TEXT NOT NULL,
  caption TEXT,
  media_type TEXT CHECK (media_type IN ('IMAGE', 'VIDEO', 'CAROUSEL_ALBUM')),
  posted_at TIMESTAMP NOT NULL,
  likes INT DEFAULT 0,
  comments INT DEFAULT 0,
  shares INT DEFAULT 0,
  impressions INT DEFAULT 0,
  reach INT DEFAULT 0,
  engagement_rate REAL DEFAULT 0,
  synced_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (instagram_account_id) REFERENCES forge_instagram_accounts(id),
  UNIQUE(instagram_account_id, post_id)
);

-- Orchestration execution history
CREATE TABLE IF NOT EXISTS forge_orchestration_runs (
  id TEXT PRIMARY KEY DEFAULT (gen_random_uuid()::text),
  user_id TEXT NOT NULL,
  instagram_account_id TEXT NOT NULL,
  entrada_tema TEXT NOT NULL,
  entrada_formato TEXT CHECK (entrada_formato IN ('carrusel', 'reel', 'historia')),
  entrada_objetivo TEXT,
  prediction_score INT,
  verdict TEXT CHECK (verdict IN ('listo', 'mejorable', 'postponer')),
  account_followers INT,
  account_avg_engagement REAL,
  created_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (instagram_account_id) REFERENCES forge_instagram_accounts(id)
);

-- Content generation requests (to Carousel Designer, Video Batch, etc.)
CREATE TABLE IF NOT EXISTS forge_generator_requests (
  id TEXT PRIMARY KEY DEFAULT (gen_random_uuid()::text),
  orchestration_run_id TEXT NOT NULL,
  generator_type TEXT CHECK (generator_type IN ('carousel', 'video', 'copy')),
  tema TEXT NOT NULL,
  formato TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'failed')),
  content_id TEXT,
  scheduled_for TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  error_message TEXT,
  FOREIGN KEY (orchestration_run_id) REFERENCES forge_orchestration_runs(id)
);

-- Publishing schedule
CREATE TABLE IF NOT EXISTS forge_publish_schedule (
  id TEXT PRIMARY KEY DEFAULT (gen_random_uuid()::text),
  generator_request_id TEXT NOT NULL,
  platform TEXT CHECK (platform IN ('instagram', 'tiktok', 'threads', 'email', 'blog')),
  content_id TEXT NOT NULL,
  scheduled_at TIMESTAMP NOT NULL,
  published_at TIMESTAMP,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'published', 'failed', 'cancelled')),
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (generator_request_id) REFERENCES forge_generator_requests(id)
);

-- Feedback collection (7 days post-publish)
CREATE TABLE IF NOT EXISTS forge_feedback_collection (
  id TEXT PRIMARY KEY DEFAULT (gen_random_uuid()::text),
  publish_schedule_id TEXT NOT NULL,
  orchestration_run_id TEXT NOT NULL,
  predicted_virality INT,
  predicted_engagement REAL,
  real_virality INT,
  real_engagement REAL,
  real_reach INT,
  real_impressions INT,
  real_saves INT,
  real_shares INT,
  accuracy_score INT,
  collected_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (publish_schedule_id) REFERENCES forge_publish_schedule(id),
  FOREIGN KEY (orchestration_run_id) REFERENCES forge_orchestration_runs(id)
);

-- Orchestrator metrics + learnings
CREATE TABLE IF NOT EXISTS forge_orchestrator_learnings (
  id TEXT PRIMARY KEY DEFAULT (gen_random_uuid()::text),
  user_id TEXT NOT NULL,
  niche TEXT,
  format_type TEXT CHECK (format_type IN ('carrusel', 'reel', 'historia')),
  objective TEXT,
  accuracy_score INT,
  avg_prediction_delta REAL,
  best_posting_time TEXT,
  best_format TEXT,
  best_hook_pattern TEXT,
  last_updated TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_instagram_accounts_user_id ON forge_instagram_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_instagram_accounts_active ON forge_instagram_accounts(is_active);
CREATE INDEX IF NOT EXISTS idx_instagram_posts_account_id ON forge_instagram_posts(instagram_account_id, posted_at DESC);
CREATE INDEX IF NOT EXISTS idx_orchestration_runs_user_id ON forge_orchestration_runs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_generator_requests_status ON forge_generator_requests(status);
CREATE INDEX IF NOT EXISTS idx_publish_schedule_platform ON forge_publish_schedule(platform, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_feedback_collection_accuracy ON forge_feedback_collection(accuracy_score);
CREATE INDEX IF NOT EXISTS idx_orchestrator_learnings_user_id ON forge_orchestrator_learnings(user_id, niche);
