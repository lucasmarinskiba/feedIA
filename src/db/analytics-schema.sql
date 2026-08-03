-- Week 6-7: Analytics Dashboard Schema
-- Real-time carousel engagement tracking and metrics aggregation

-- Create carousel_analytics table for raw event tracking
CREATE TABLE IF NOT EXISTS carousel_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  carousel_id UUID NOT NULL REFERENCES carousels(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  event_type VARCHAR(20) NOT NULL, -- view, share, save, like, click
  source VARCHAR(50), -- instagram, tiktok, direct, etc
  user_agent VARCHAR(500),
  referrer VARCHAR(500),
  created_at TIMESTAMP DEFAULT NOW(),
  INDEX idx_carousel_id (carousel_id),
  INDEX idx_user_id (user_id),
  INDEX idx_created_at (created_at),
  INDEX idx_event_type (event_type),
  INDEX idx_carousel_event (carousel_id, event_type)
);

-- Create carousel_metrics_daily table for aggregated metrics
CREATE TABLE IF NOT EXISTS carousel_metrics_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  carousel_id UUID NOT NULL REFERENCES carousels(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  date DATE NOT NULL,
  views INT DEFAULT 0,
  views_unique INT DEFAULT 0,
  shares INT DEFAULT 0,
  saves INT DEFAULT 0,
  likes INT DEFAULT 0,
  clicks INT DEFAULT 0,
  engagement_rate DECIMAL(5, 2),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (carousel_id, date),
  INDEX idx_user_id_date (user_id, date),
  INDEX idx_carousel_date (carousel_id, date)
);

-- Add tier-based retention to users table (if not exists)
ALTER TABLE users ADD COLUMN IF NOT EXISTS analytics_retention_days INT DEFAULT 90;

-- Update retention by tier:
-- Free: 30 days, Pro: 90 days, Premium: 365 days
UPDATE users SET analytics_retention_days = 30 WHERE plan = 'free';
UPDATE users SET analytics_retention_days = 90 WHERE plan = 'pro';
UPDATE users SET analytics_retention_days = 365 WHERE plan = 'premium';

-- Trigger: Update carousel updated_at when metrics arrive
CREATE OR REPLACE FUNCTION update_carousel_timestamp_on_metrics()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE carousels SET updated_at = NOW() WHERE id = NEW.carousel_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_metrics_update_carousel ON carousel_metrics_daily;
CREATE TRIGGER trigger_metrics_update_carousel
AFTER INSERT OR UPDATE ON carousel_metrics_daily
FOR EACH ROW
EXECUTE FUNCTION update_carousel_timestamp_on_metrics();

-- Trigger: Clean up old analytics based on retention policy
CREATE OR REPLACE FUNCTION cleanup_old_analytics()
RETURNS void AS $$
BEGIN
  DELETE FROM carousel_analytics ca
  WHERE ca.created_at < NOW() - INTERVAL '1 day' * (
    SELECT COALESCE(analytics_retention_days, 90)
    FROM users u WHERE u.id = (SELECT user_id FROM carousels c WHERE c.id = ca.carousel_id)
  );
END;
$$ LANGUAGE plpgsql;