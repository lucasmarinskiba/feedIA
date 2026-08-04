-- Carousels table schema
CREATE TABLE IF NOT EXISTS carousels (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  format TEXT NOT NULL CHECK(format IN ('carousel', 'reel', 'story')),
  slides TEXT NOT NULL,
  source_category TEXT,
  platform TEXT NOT NULL CHECK(platform IN ('instagram', 'tiktok', 'linkedin')),
  metadata TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  created_index TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for user carousels queries
CREATE INDEX IF NOT EXISTS idx_carousels_user_id ON carousels(user_id);

-- Index for platform queries
CREATE INDEX IF NOT EXISTS idx_carousels_platform ON carousels(platform);

-- Index for status queries (status is in metadata JSON)
CREATE INDEX IF NOT EXISTS idx_carousels_updated_at ON carousels(updated_at);
