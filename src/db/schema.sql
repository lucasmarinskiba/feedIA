-- FeedIA Database Schema
-- SQLite. Supports: prompt storage + variations + image indexing + analytics

-- Prompt Library (base templates)
CREATE TABLE IF NOT EXISTS prompts (
  id TEXT PRIMARY KEY,
  batch_id TEXT NOT NULL,
  category TEXT NOT NULL,
  base_template TEXT NOT NULL,
  placeholders TEXT NOT NULL, -- JSON: ["[PRODUCT]", "[PERSONA]", ...]
  required_params TEXT NOT NULL, -- JSON: ["product", "persona"]
  optional_params TEXT, -- JSON: ["tone", "specs"]
  specs TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX batch_category (batch_id, category)
);

-- Prompt Variations (LLM-expanded from base)
CREATE TABLE IF NOT EXISTS prompt_variations (
  id TEXT PRIMARY KEY,
  prompt_id TEXT NOT NULL,
  variation_text TEXT NOT NULL,
  tone TEXT, -- emotional, entertaining, polemic, education, humor, debate, soft-sell, etc.
  emotional_arc TEXT,
  duration INTEGER, -- seconds
  version INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (prompt_id) REFERENCES prompts(id),
  INDEX prompt_variations (prompt_id, tone)
);

-- User Uploaded Images (anchor for parameterization)
CREATE TABLE IF NOT EXISTS user_images (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  image_path TEXT NOT NULL,
  image_hash TEXT, -- MD5 for dedup
  features_json TEXT NOT NULL, -- JSON: {person: {age, gender, ethnicity}, pet: {type, color}, scene: {indoor/outdoor}, emotion: {primary, secondary}, palette: {dominant_colors: [hex]}}
  embedding_vector TEXT, -- Stored as JSON array (CLIP embeddings, 512D)
  upload_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX user_images_user (user_id),
  INDEX user_images_hash (image_hash)
);

-- Prompt-Image Matches (similarity search results)
CREATE TABLE IF NOT EXISTS prompt_matches (
  id TEXT PRIMARY KEY,
  user_image_id TEXT NOT NULL,
  prompt_id TEXT NOT NULL,
  prompt_variation_id TEXT,
  similarity_score REAL, -- 0-1 cosine similarity
  match_reasons TEXT, -- JSON: ["person_match", "emotion_match", "scene_match", ...]
  ranked_position INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_image_id) REFERENCES user_images(id),
  FOREIGN KEY (prompt_id) REFERENCES prompts(id),
  FOREIGN KEY (prompt_variation_id) REFERENCES prompt_variations(id),
  INDEX user_image_matches (user_image_id, ranked_position),
  INDEX prompt_popularity (prompt_id, created_at)
);

-- Generated Content (videos/reels created from prompts)
CREATE TABLE IF NOT EXISTS generated_content (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  prompt_variation_id TEXT NOT NULL,
  content_type TEXT, -- video, reel, story, post
  content_url TEXT,
  content_status TEXT, -- queued, generating, completed, failed
  duration INTEGER,
  format TEXT, -- 9:16, 16:9, 1:1
  metadata TEXT, -- JSON: {platform: "tiktok", dimensions: "1080x1920", ...}
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  FOREIGN KEY (prompt_variation_id) REFERENCES prompt_variations(id),
  INDEX user_content (user_id, created_at),
  INDEX status_tracking (content_status)
);

-- Analytics (performance tracking for prompt optimization)
CREATE TABLE IF NOT EXISTS analytics (
  id TEXT PRIMARY KEY,
  generated_content_id TEXT NOT NULL,
  platform TEXT, -- tiktok, instagram, youtube
  views INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  saves INTEGER DEFAULT 0,
  engagement_rate REAL,
  sentiment_average REAL, -- -1 to 1 (negative to positive)
  conversion_metric TEXT, -- depends on campaign goal
  tracked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (generated_content_id) REFERENCES generated_content(id),
  INDEX analytics_performance (engagement_rate DESC, tracked_at)
);

-- Batch Metadata (track library versions)
CREATE TABLE IF NOT EXISTS batch_metadata (
  batch_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  total_prompts INTEGER,
  version INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Brand Profiles (for parameterization context)
CREATE TABLE IF NOT EXISTS brand_profiles (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  brand_name TEXT NOT NULL,
  brand_type TEXT, -- product, service, ngo, personal, etc.
  voice_tone TEXT, -- JSON: ["professional", "casual", "creative", ...]
  values TEXT, -- JSON: ["sustainability", "innovation", ...]
  target_audience TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX brand_user (user_id)
);

-- Favorite Prompts (user-specific prompt bookmarks)
CREATE TABLE IF NOT EXISTS favorite_prompts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  prompt_id TEXT NOT NULL,
  favorited_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (prompt_id) REFERENCES prompts(id),
  INDEX user_favorites (user_id)
);

-- Indexes for search performance
CREATE INDEX IF NOT EXISTS idx_prompts_batch ON prompts(batch_id);
CREATE INDEX IF NOT EXISTS idx_prompts_category ON prompts(category);
CREATE INDEX IF NOT EXISTS idx_variations_prompt ON prompt_variations(prompt_id);
CREATE INDEX IF NOT EXISTS idx_images_user ON user_images(user_id);
CREATE INDEX IF NOT EXISTS idx_matches_image ON prompt_matches(user_image_id);
CREATE INDEX IF NOT EXISTS idx_content_user ON generated_content(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_content ON analytics(generated_content_id);
