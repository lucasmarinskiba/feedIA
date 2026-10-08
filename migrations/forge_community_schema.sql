-- PHASE 6: Community features schema

-- Leaderboard: top creators by niche
CREATE TABLE IF NOT EXISTS forge_leaderboard (
  id TEXT PRIMARY KEY DEFAULT (gen_random_uuid()::text),
  creator_id TEXT NOT NULL,
  niche TEXT NOT NULL,
  posts INT DEFAULT 0,
  avg_engagement REAL DEFAULT 0,
  trend TEXT CHECK (trend IN ('up', 'stable', 'down')) DEFAULT 'stable',
  period TEXT DEFAULT '30d',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(creator_id, niche, period)
);

-- Swipe file: viral hooks + CTAs
CREATE TABLE IF NOT EXISTS forge_swipe_file (
  id TEXT PRIMARY KEY DEFAULT (gen_random_uuid()::text),
  text TEXT NOT NULL,
  category TEXT NOT NULL,
  uses INT DEFAULT 0,
  engagement REAL DEFAULT 0,
  niche TEXT,
  created_by TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Community mentor responses
CREATE TABLE IF NOT EXISTS forge_mentor_responses (
  id TEXT PRIMARY KEY DEFAULT (gen_random_uuid()::text),
  user_id TEXT NOT NULL,
  niche TEXT NOT NULL,
  question TEXT NOT NULL,
  mentor_response TEXT,
  mentor_id TEXT NOT NULL,
  helpful_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Feedback tracking (Phase 4)
CREATE TABLE IF NOT EXISTS forge_feedback (
  id TEXT PRIMARY KEY DEFAULT (gen_random_uuid()::text),
  user_id TEXT NOT NULL,
  prediction_id TEXT,
  real_virality_score INT,
  real_engagement INT,
  real_leads INT,
  real_conversions INT,
  accuracy_score INT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ROI tracking (Phase 5)
CREATE TABLE IF NOT EXISTS forge_roi_tracking (
  id TEXT PRIMARY KEY DEFAULT (gen_random_uuid()::text),
  user_id TEXT NOT NULL,
  objective TEXT NOT NULL,
  revenue_30d INT,
  revenue_60d INT,
  revenue_90d INT,
  channel TEXT,
  roi_percentage INT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_leaderboard_niche_period ON forge_leaderboard(niche, period);
CREATE INDEX IF NOT EXISTS idx_swipe_file_category ON forge_swipe_file(category);
CREATE INDEX IF NOT EXISTS idx_mentor_responses_niche ON forge_mentor_responses(niche);
CREATE INDEX IF NOT EXISTS idx_feedback_user_id ON forge_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_roi_tracking_user_id ON forge_roi_tracking(user_id);
