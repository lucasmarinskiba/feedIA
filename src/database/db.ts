import Database from 'better-sqlite3';
import { resolve } from 'node:path';

const DB_PATH = resolve(process.cwd(), 'data', 'runtime', 'agent.db');

let _db: Database.Database | null = null;

export const getDb = (): Database.Database => {
  if (!_db) {
    _db = new Database(DB_PATH);
    _db.pragma('journal_mode = WAL');
    _db.pragma('foreign_keys = ON');
    initSchema(_db);
  }
  return _db;
};

export const closeDb = (): void => {
  _db?.close();
  _db = null;
};

function initSchema(db: Database.Database): void {
  // Multi-tenant accounts
  db.exec(`
    CREATE TABLE IF NOT EXISTS accounts (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      niche TEXT,
      type TEXT,
      meta_ig_business_id TEXT,
      meta_page_id TEXT,
      brand_json TEXT,
      strategy_json TEXT,
      onboarding_json TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
  `);

  // Posts published (or scheduled)
  db.exec(`
    CREATE TABLE IF NOT EXISTS posts (
      id TEXT PRIMARY KEY,
      account_id TEXT NOT NULL REFERENCES accounts(id),
      format TEXT NOT NULL,
      caption TEXT,
      media_urls TEXT,
      first_comment TEXT,
      status TEXT DEFAULT 'draft',
      meta_post_id TEXT,
      scheduled_at TEXT,
      published_at TEXT,
      error_log TEXT,
      attempts INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
  `);
  // Migración incremental para tablas creadas antes de calendarQueue
  try {
    db.exec(`ALTER TABLE accounts ADD COLUMN onboarding_json TEXT;`);
  } catch {
    /* ya existe */
  }
  try {
    db.exec(`ALTER TABLE posts ADD COLUMN error_log TEXT;`);
  } catch {
    /* ya existe */
  }
  try {
    db.exec(`ALTER TABLE posts ADD COLUMN attempts INTEGER DEFAULT 0;`);
  } catch {
    /* ya existe */
  }

  // Content pipeline pieces
  db.exec(`
    CREATE TABLE IF NOT EXISTS content_pieces (
      id TEXT PRIMARY KEY,
      account_id TEXT NOT NULL REFERENCES accounts(id),
      stage TEXT NOT NULL,
      format TEXT,
      title TEXT,
      script TEXT,
      hooks TEXT,
      captions TEXT,
      hashtags TEXT,
      media_urls TEXT,
      scheduled_date TEXT,
      publish_time TEXT,
      score INTEGER,
      metadata TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
  `);

  // Inbound messages (comments, mentions, DMs)
  db.exec(`
    CREATE TABLE IF NOT EXISTS inbound_messages (
      id TEXT PRIMARY KEY,
      account_id TEXT NOT NULL REFERENCES accounts(id),
      type TEXT NOT NULL,
      sender TEXT NOT NULL,
      text TEXT,
      meta_comment_id TEXT,
      meta_post_id TEXT,
      replied INTEGER DEFAULT 0,
      reply_text TEXT,
      received_at TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  // Analytics snapshots
  db.exec(`
    CREATE TABLE IF NOT EXISTS analytics_snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      account_id TEXT NOT NULL REFERENCES accounts(id),
      snapshot_date TEXT NOT NULL,
      followers INTEGER,
      reach INTEGER,
      impressions INTEGER,
      profile_views INTEGER,
      website_clicks INTEGER,
      posts_count INTEGER,
      data_json TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  // Post-level metrics
  db.exec(`
    CREATE TABLE IF NOT EXISTS post_metrics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      post_id TEXT NOT NULL REFERENCES posts(id),
      snapshot_date TEXT NOT NULL,
      impressions INTEGER,
      reach INTEGER,
      likes INTEGER,
      comments INTEGER,
      saves INTEGER,
      shares INTEGER,
      watch_time REAL,
      completion_rate REAL,
      profile_visits INTEGER,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  // Competitor tracking
  db.exec(`
    CREATE TABLE IF NOT EXISTS competitor_snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      account_id TEXT NOT NULL REFERENCES accounts(id),
      competitor_handle TEXT NOT NULL,
      snapshot_date TEXT NOT NULL,
      followers INTEGER,
      posts_count INTEGER,
      avg_likes REAL,
      avg_comments REAL,
      top_hashtags TEXT,
      data_json TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  // Trend snapshots
  db.exec(`
    CREATE TABLE IF NOT EXISTS trend_snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      account_id TEXT NOT NULL REFERENCES accounts(id),
      source TEXT NOT NULL,
      keyword TEXT,
      volume INTEGER,
      growth REAL,
      data_json TEXT,
      snapshot_date TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  // A/B tests
  db.exec(`
    CREATE TABLE IF NOT EXISTS ab_tests (
      id TEXT PRIMARY KEY,
      account_id TEXT NOT NULL REFERENCES accounts(id),
      name TEXT NOT NULL,
      hypothesis TEXT,
      status TEXT DEFAULT 'draft',
      variants TEXT,
      winner TEXT,
      confidence REAL,
      started_at TEXT,
      ended_at TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
  `);

  // Audit log (compliance)
  db.exec(`
    CREATE TABLE IF NOT EXISTS audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      actor TEXT NOT NULL,
      action TEXT NOT NULL,
      target TEXT,
      result TEXT,
      reason TEXT,
      metadata TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  // Email notifications queue
  db.exec(`
    CREATE TABLE IF NOT EXISTS email_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      to_address TEXT NOT NULL,
      subject TEXT NOT NULL,
      body TEXT NOT NULL,
      sent INTEGER DEFAULT 0,
      error TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      sent_at TEXT
    );
  `);

  // Event queue for trigger system (durable event bus)
  db.exec(`
    CREATE TABLE IF NOT EXISTS event_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_type TEXT NOT NULL,
      payload TEXT NOT NULL,
      brand_id TEXT,
      processed INTEGER DEFAULT 0,
      processed_at TEXT,
      handler_result TEXT,
      error TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  // Custom playbook executions log
  db.exec(`
    CREATE TABLE IF NOT EXISTS playbook_runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      playbook_id TEXT NOT NULL,
      playbook_type TEXT DEFAULT 'custom',
      brand_id TEXT,
      status TEXT DEFAULT 'running',
      results TEXT,
      started_at TEXT DEFAULT (datetime('now')),
      ended_at TEXT
    );
  `);

  // Indexes
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_posts_account ON posts(account_id);
    CREATE INDEX IF NOT EXISTS idx_posts_status ON posts(status);
    CREATE INDEX IF NOT EXISTS idx_content_account ON content_pieces(account_id);
    CREATE INDEX IF NOT EXISTS idx_inbound_account ON inbound_messages(account_id);
    CREATE INDEX IF NOT EXISTS idx_analytics_account_date ON analytics_snapshots(account_id, snapshot_date);
    CREATE INDEX IF NOT EXISTS idx_post_metrics_post ON post_metrics(post_id);
    CREATE INDEX IF NOT EXISTS idx_competitor_account ON competitor_snapshots(account_id, competitor_handle);
    CREATE INDEX IF NOT EXISTS idx_trend_account ON trend_snapshots(account_id, source);
    CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_log(action, created_at);
    CREATE INDEX IF NOT EXISTS idx_event_queue_unprocessed ON event_queue(processed, created_at);
    CREATE INDEX IF NOT EXISTS idx_event_queue_type ON event_queue(event_type, created_at);
    CREATE INDEX IF NOT EXISTS idx_playbook_runs_playbook ON playbook_runs(playbook_id, started_at);
    CREATE INDEX IF NOT EXISTS idx_playbook_runs_brand ON playbook_runs(brand_id, status);
  `);
}
