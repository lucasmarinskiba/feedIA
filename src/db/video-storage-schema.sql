-- Week 6: Video Storage Schema
-- Add video support to carousel system

-- Add video columns to carousels table
ALTER TABLE carousels ADD COLUMN IF NOT EXISTS video_url TEXT;
ALTER TABLE carousels ADD COLUMN IF NOT EXISTS video_size_mb INT DEFAULT 0;
ALTER TABLE carousels ADD COLUMN IF NOT EXISTS video_duration_sec INT;
ALTER TABLE carousels ADD COLUMN IF NOT EXISTS video_model VARCHAR(50) DEFAULT 'veo-3.1';

-- Create videos table for tracking individual video uploads
CREATE TABLE IF NOT EXISTS videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  carousel_id UUID NOT NULL REFERENCES carousels(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  video_url TEXT NOT NULL,
  file_size_mb INT NOT NULL,
  duration_sec INT,
  model VARCHAR(50) DEFAULT 'veo-3.1',
  status VARCHAR(20) DEFAULT 'processing', -- processing, ready, failed, deleted
  encoding_status VARCHAR(20) DEFAULT 'queued', -- queued, encoding, complete, error
  instagram_url TEXT, -- 1080x1920 encoded version
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Inline `INDEX name (cols)` inside CREATE TABLE is MySQL syntax, not valid
-- PostgreSQL — migrate.ts runs the whole file as one pool.query(sql) call,
-- so this table never actually got created against real Postgres.
CREATE INDEX IF NOT EXISTS idx_videos_carousel_id ON videos(carousel_id);
CREATE INDEX IF NOT EXISTS idx_videos_user_id ON videos(user_id);
CREATE INDEX IF NOT EXISTS idx_videos_status ON videos(status);
CREATE INDEX IF NOT EXISTS idx_videos_encoding_status ON videos(encoding_status);

-- Add video storage quotas to pricing plans
ALTER TABLE pricing_plans ADD COLUMN IF NOT EXISTS video_storage_gb INT DEFAULT 0;

-- Update existing pricing plans with video storage quotas
-- Free: 0GB (no video support)
-- Pro: 10GB (video support, no encoding)
-- Premium: 1000GB (unlimited, with encoding)
UPDATE pricing_plans SET video_storage_gb = 0 WHERE plan_name = 'free';
UPDATE pricing_plans SET video_storage_gb = 10 WHERE plan_name = 'pro';
UPDATE pricing_plans SET video_storage_gb = 1000 WHERE plan_name = 'premium';

-- Create index for video storage tracking
CREATE INDEX IF NOT EXISTS idx_videos_user_status ON videos(user_id, status);
CREATE INDEX IF NOT EXISTS idx_videos_carousel_created ON videos(carousel_id, created_at DESC);

-- Trigger: Update carousel updated_at when video changes
CREATE OR REPLACE FUNCTION update_carousel_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE carousels SET updated_at = NOW() WHERE id = NEW.carousel_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_video_update_carousel ON videos;
CREATE TRIGGER trigger_video_update_carousel
AFTER INSERT OR UPDATE ON videos
FOR EACH ROW
EXECUTE FUNCTION update_carousel_timestamp();

-- Trigger: Update user storage when video is deleted
CREATE OR REPLACE FUNCTION update_user_storage_on_video_delete()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'deleted' AND OLD.status != 'deleted' THEN
    UPDATE users
    SET storage_used_gb = GREATEST(0, storage_used_gb - (OLD.file_size_mb / 1024.0))
    WHERE id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_video_delete_storage ON videos;
CREATE TRIGGER trigger_video_delete_storage
AFTER UPDATE ON videos
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION update_user_storage_on_video_delete();
