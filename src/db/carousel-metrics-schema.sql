-- Carousel Analytics Events
CREATE TABLE IF NOT EXISTS carousel_events (
  id TEXT PRIMARY KEY,
  carousel_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK(event_type IN ('view', 'share', 'save', 'like', 'click')),
  source TEXT,
  user_agent TEXT,
  referrer TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(carousel_id) REFERENCES carousels(id) ON DELETE CASCADE
);

-- Daily Metrics Snapshot
CREATE TABLE IF NOT EXISTS carousel_metrics_daily (
  id TEXT PRIMARY KEY,
  carousel_id TEXT NOT NULL,
  date TEXT NOT NULL,
  views INTEGER DEFAULT 0,
  views_unique INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  saves INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  engagement_rate REAL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(carousel_id) REFERENCES carousels(id) ON DELETE CASCADE,
  UNIQUE(carousel_id, date)
);

-- Indexes for query performance
CREATE INDEX IF NOT EXISTS idx_carousel_events_carousel_id ON carousel_events(carousel_id);
CREATE INDEX IF NOT EXISTS idx_carousel_events_user_id ON carousel_events(user_id);
CREATE INDEX IF NOT EXISTS idx_carousel_events_event_type ON carousel_events(event_type);
CREATE INDEX IF NOT EXISTS idx_carousel_events_created_at ON carousel_events(created_at);

CREATE INDEX IF NOT EXISTS idx_carousel_metrics_daily_carousel_id ON carousel_metrics_daily(carousel_id);
CREATE INDEX IF NOT EXISTS idx_carousel_metrics_daily_date ON carousel_metrics_daily(date);
CREATE INDEX IF NOT EXISTS idx_carousel_metrics_daily_carousel_date ON carousel_metrics_daily(carousel_id, date);
