/**
 * Migration: Billing & Webhooks Infrastructure
 * - Usage tracking tables
 * - Billing transactions
 * - Monthly summaries
 * - Webhook subscriptions
 * - Webhook events & delivery logs
 */

-- ========== BILLING USAGE ==========
CREATE TABLE IF NOT EXISTS billing_usage (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  date TIMESTAMP DEFAULT NOW(),
  service TEXT NOT NULL CHECK (service IN ('api_call', 'content_generation', 'image_upscale', 'video_generation')),
  cost_usd DECIMAL(10,6) NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  INDEX idx_user_id (user_id),
  INDEX idx_date (date),
  INDEX idx_service (service)
);

-- ========== BILLING TRANSACTIONS ==========
CREATE TABLE IF NOT EXISTS billing_transactions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('api_call', 'content_generation', 'subscription', 'refund')),
  amount_usd DECIMAL(10,2) NOT NULL,
  description TEXT,
  timestamp TIMESTAMP DEFAULT NOW(),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  INDEX idx_user_id (user_id),
  INDEX idx_timestamp (timestamp),
  INDEX idx_type (transaction_type)
);

-- ========== BILLING MONTHLY SUMMARY ==========
CREATE TABLE IF NOT EXISTS billing_monthly_summary (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  month_year TEXT NOT NULL,
  total_usage_cost DECIMAL(10,2) DEFAULT 0,
  budget_allocated DECIMAL(10,2) NOT NULL,
  overage_amount DECIMAL(10,2) DEFAULT 0,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  INDEX idx_user_id (user_id),
  INDEX idx_month_year (month_year)
);

-- ========== WEBHOOK SUBSCRIPTIONS ==========
CREATE TABLE IF NOT EXISTS webhook_subscriptions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  url TEXT NOT NULL,
  events TEXT[] NOT NULL,
  active BOOLEAN DEFAULT true,
  secret TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  INDEX idx_user_id (user_id),
  INDEX idx_active (active),
  UNIQUE(user_id, url)
);

-- ========== WEBHOOK EVENTS ==========
CREATE TABLE IF NOT EXISTS webhook_events (
  id TEXT PRIMARY KEY,
  subscription_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  timestamp TIMESTAMP DEFAULT NOW(),
  attempts INTEGER DEFAULT 0,
  next_retry TIMESTAMP,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'delivered', 'failed')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (subscription_id) REFERENCES webhook_subscriptions(id) ON DELETE CASCADE,
  INDEX idx_subscription_id (subscription_id),
  INDEX idx_status (status),
  INDEX idx_next_retry (next_retry)
);

-- ========== WEBHOOK DELIVERY LOGS ==========
CREATE TABLE IF NOT EXISTS webhook_delivery_logs (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL,
  subscription_id TEXT NOT NULL,
  http_status INTEGER,
  response_body TEXT,
  error_message TEXT,
  delivery_at TIMESTAMP DEFAULT NOW(),
  duration_ms INTEGER,
  FOREIGN KEY (event_id) REFERENCES webhook_events(id) ON DELETE CASCADE,
  INDEX idx_event_id (event_id),
  INDEX idx_subscription_id (subscription_id)
);
