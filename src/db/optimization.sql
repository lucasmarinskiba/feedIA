-- FeedIA Performance Optimization
-- Adds indexes and optimizes queries for high-traffic endpoints
-- Applied: August 2026

-- ============================================================================
-- 1. ANALYTICS & EVENTS INDEXES (for /api/trends/detect)
-- ============================================================================

-- Primary index for user + timestamp lookups
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_timestamp
  ON analytics_events(user_id, timestamp DESC);

-- For trend detection by campaign
CREATE INDEX IF NOT EXISTS idx_analytics_events_campaign_timestamp
  ON analytics_events(campaign_id, timestamp DESC);

-- Composite index for daily aggregations
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_date_campaign
  ON analytics_events(user_id, DATE(timestamp), campaign_id);

-- Event type filtering
CREATE INDEX IF NOT EXISTS idx_analytics_events_event_type
  ON analytics_events(event_type);

-- For fast user event counts in time windows
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_created
  ON analytics_events(user_id, created_at DESC);

-- ============================================================================
-- 2. AUDIO LIBRARY INDEXES (for /api/trends/audio)
-- ============================================================================

-- Platform + virality for trending audio
CREATE INDEX IF NOT EXISTS idx_audio_library_platform_virality
  ON audio_library(platform, virality_score DESC);

-- Platform + uses for popularity
CREATE INDEX IF NOT EXISTS idx_audio_library_platform_uses
  ON audio_library(platform, uses DESC);

-- Trend status filtering
CREATE INDEX IF NOT EXISTS idx_audio_library_trend_status
  ON audio_library(trend_status);

-- ============================================================================
-- 3. CAMPAIGN INDEXES (for /api/roi/calculate and related)
-- ============================================================================

-- User campaigns
CREATE INDEX IF NOT EXISTS idx_campaigns_user_id
  ON campaigns(user_id);

-- Campaign lookups by status
CREATE INDEX IF NOT EXISTS idx_campaigns_user_status
  ON campaigns(user_id, status);

-- Chronological queries
CREATE INDEX IF NOT EXISTS idx_campaigns_user_created
  ON campaigns(user_id, created_at DESC);

-- Budget/ROI calculations
CREATE INDEX IF NOT EXISTS idx_campaigns_user_budget
  ON campaigns(user_id, budget);

-- ============================================================================
-- 4. ABTEST INDEXES (for /api/abtest/:id/results)
-- ============================================================================

-- A/B test results by test ID
CREATE INDEX IF NOT EXISTS idx_abtests_id
  ON abtests(id);

-- User's A/B tests
CREATE INDEX IF NOT EXISTS idx_abtests_user_id
  ON abtests(user_id);

-- A/B test metrics/results lookup
CREATE INDEX IF NOT EXISTS idx_abtest_results_test_id
  ON abtest_results(test_id);

-- Fast aggregation of test results
CREATE INDEX IF NOT EXISTS idx_abtest_results_test_variant
  ON abtest_results(test_id, variant);

-- Event timing for A/B tests
CREATE INDEX IF NOT EXISTS idx_abtest_results_created
  ON abtest_results(test_id, created_at DESC);

-- ============================================================================
-- 5. CAROUSEL INDEXES (for /api/carousel/:id/metrics)
-- ============================================================================

-- User's carousels
CREATE INDEX IF NOT EXISTS idx_carousels_user_id
  ON carousels(user_id);

-- Fast lookup by carousel ID
CREATE INDEX IF NOT EXISTS idx_carousels_user_id_created
  ON carousels(user_id, created_at DESC);

-- Carousel analytics by carousel
CREATE INDEX IF NOT EXISTS idx_carousel_analytics_carousel_created
  ON carousel_analytics(carousel_id, created_at DESC);

-- User carousel analytics
CREATE INDEX IF NOT EXISTS idx_carousel_analytics_user_carousel
  ON carousel_analytics(user_id, carousel_id);

-- Daily metrics lookups
CREATE INDEX IF NOT EXISTS idx_carousel_metrics_daily_user_date
  ON carousel_metrics_daily(user_id, date DESC);

-- Carousel-specific metrics
CREATE INDEX IF NOT EXISTS idx_carousel_metrics_daily_carousel_date
  ON carousel_metrics_daily(carousel_id, date DESC);

-- ============================================================================
-- 6. CONTENT & GENERATION INDEXES
-- ============================================================================

-- User content lookups
CREATE INDEX IF NOT EXISTS idx_content_user_id
  ON content(user_id);

-- Status filtering for generation
CREATE INDEX IF NOT EXISTS idx_content_user_status
  ON content(user_id, status);

-- Batch job tracking
CREATE INDEX IF NOT EXISTS idx_batch_jobs_user_id
  ON batch_jobs(user_id);

-- Job status queries
CREATE INDEX IF NOT EXISTS idx_batch_jobs_user_status
  ON batch_jobs(user_id, status);

-- ============================================================================
-- 7. COST TRACKING INDEXES (for /api/cost/track invalidations)
-- ============================================================================

-- User costs
CREATE INDEX IF NOT EXISTS idx_api_costs_user_id
  ON api_costs(user_id);

-- Time-based cost aggregations
CREATE INDEX IF NOT EXISTS idx_api_costs_user_timestamp
  ON api_costs(user_id, timestamp DESC);

-- Provider/model cost tracking
CREATE INDEX IF NOT EXISTS idx_api_costs_provider_model
  ON api_costs(provider, model);

-- ============================================================================
-- 8. USER & TIER INDEXES
-- ============================================================================

-- User lookups
CREATE INDEX IF NOT EXISTS idx_users_email
  ON users(email);

-- User tier information
CREATE INDEX IF NOT EXISTS idx_user_tiers_user_id
  ON user_tiers(user_id);

-- Tier-based queries
CREATE INDEX IF NOT EXISTS idx_user_tiers_tier
  ON user_tiers(tier);

-- ============================================================================
-- 9. QUERY OPTIMIZATION: MATERIALIZED VIEWS for expensive aggregations
-- ============================================================================

-- Daily trend summary (rebuilt hourly)
DROP MATERIALIZED VIEW IF EXISTS mv_daily_trends CASCADE;
CREATE MATERIALIZED VIEW mv_daily_trends AS
  SELECT
    user_id,
    DATE(timestamp) as trend_date,
    campaign_id,
    COUNT(*) as event_count,
    COUNT(DISTINCT event_type) as event_variety,
    MAX(timestamp) as latest_event
  FROM analytics_events
  WHERE timestamp > NOW() - INTERVAL '30 days'
  GROUP BY user_id, DATE(timestamp), campaign_id;

CREATE INDEX idx_mv_daily_trends_user_date
  ON mv_daily_trends(user_id, trend_date DESC);

-- User engagement summary (rebuilt every 30 minutes)
DROP MATERIALIZED VIEW IF EXISTS mv_user_engagement CASCADE;
CREATE MATERIALIZED VIEW mv_user_engagement AS
  SELECT
    u.id as user_id,
    COUNT(DISTINCT c.id) as campaign_count,
    COUNT(DISTINCT ae.id) as total_events,
    COALESCE(AVG(
      CASE
        WHEN ae.event_type IN ('like', 'share', 'save') THEN 1
        ELSE 0
      END
    ), 0) as avg_engagement_rate,
    MAX(ae.timestamp) as last_activity
  FROM users u
  LEFT JOIN campaigns c ON u.id = c.user_id
  LEFT JOIN analytics_events ae ON c.id = ae.campaign_id
  WHERE u.created_at > NOW() - INTERVAL '1 year'
  GROUP BY u.id;

CREATE INDEX idx_mv_user_engagement_user_id
  ON mv_user_engagement(user_id);

-- ============================================================================
-- 10. PARTITIONING (for very large analytics tables) — Optional
-- ============================================================================

-- For analytics_events table: partition by month for faster deletion/archiving
-- Note: Only if analytics_events grows beyond 100M rows
-- ALTER TABLE analytics_events
--   PARTITION BY RANGE (DATE_TRUNC('month', timestamp)) (
--     PARTITION p_2026_01 VALUES LESS THAN ('2026-02-01'),
--     PARTITION p_2026_02 VALUES LESS THAN ('2026-03-01'),
--     ...
--     PARTITION p_default VALUES LESS THAN (MAXVALUE)
--   );

-- ============================================================================
-- 11. STATISTICS & QUERY PLANNING
-- ============================================================================

-- Force PostgreSQL to analyze tables for optimal query planning
ANALYZE analytics_events;
ANALYZE campaigns;
ANALYZE carousel_analytics;
ANALYZE carousel_metrics_daily;
ANALYZE abtests;
ANALYZE abtest_results;
ANALYZE audio_library;
ANALYZE content;
ANALYZE batch_jobs;
ANALYZE api_costs;
ANALYZE users;
ANALYZE user_tiers;

-- ============================================================================
-- 12. QUERY OPTIMIZATION RECOMMENDATIONS
-- ============================================================================

-- Replace N+1 queries: Use JOINs instead of looping
-- BEFORE (N+1):
-- SELECT c.* FROM campaigns WHERE user_id = $1;
-- FOR EACH campaign:
--   SELECT COUNT(*) FROM analytics_events WHERE campaign_id = $2;

-- AFTER (optimized):
-- SELECT
--   c.id, c.name, COUNT(ae.id) as event_count
-- FROM campaigns c
-- LEFT JOIN analytics_events ae ON c.id = ae.campaign_id
-- WHERE c.user_id = $1
-- GROUP BY c.id, c.name;

-- Use batch inserts for analytics events
-- BEFORE: INSERT INTO analytics_events (...) VALUES (...) [repeated]
-- AFTER: INSERT INTO analytics_events (...) VALUES (...), (...), (...) [batch]

-- Use LIMIT + OFFSET carefully; prefer keyset pagination for large result sets
-- BEFORE: SELECT * FROM campaigns WHERE user_id = $1 LIMIT 50 OFFSET 1000;
-- AFTER: SELECT * FROM campaigns WHERE user_id = $1 AND created_at < $2 LIMIT 50;

-- ============================================================================
-- 13. CONNECTION POOL TUNING (in PostgreSQL config)
-- ============================================================================

-- Recommended pg pool settings in code:
-- const pool = new Pool({
--   host: 'localhost',
--   port: 5432,
--   database: 'feedia',
--   user: 'feedia_user',
--   password: process.env.DB_PASSWORD,
--   max: 20,                        -- Max connections
--   idleTimeoutMillis: 30000,       -- 30s idle timeout
--   connectionTimeoutMillis: 2000,  -- 2s connection timeout
--   statement_timeout: 30000,       -- 30s query timeout
--   keepAlives: true,
--   keepalivesIdleTimeout: 60000,   -- 60s keepalive
-- });

-- ============================================================================
-- MAINTENANCE SCHEDULE (Suggested)
-- ============================================================================

-- Daily (5 AM UTC):
--   REINDEX INDEX CONCURRENTLY idx_analytics_events_user_timestamp;
--   VACUUM ANALYZE analytics_events;

-- Weekly (Sunday midnight UTC):
--   REFRESH MATERIALIZED VIEW CONCURRENTLY mv_daily_trends;
--   REFRESH MATERIALIZED VIEW CONCURRENTLY mv_user_engagement;

-- Monthly:
--   Full table REINDEX
--   Archive analytics_events older than retention period
--   Analyze all tables

-- ============================================================================
-- PERFORMANCE MONITORING QUERIES
-- ============================================================================

-- Check index usage (add to monitoring dashboard)
-- SELECT
--   schemaname,
--   tablename,
--   indexname,
--   idx_scan,
--   idx_tup_read,
--   idx_tup_fetch
-- FROM pg_stat_user_indexes
-- ORDER BY idx_scan DESC;

-- Check slow queries (enable slow_query_log)
-- SELECT
--   query,
--   calls,
--   mean_time,
--   max_time
-- FROM pg_stat_statements
-- WHERE mean_time > 100  -- > 100ms
-- ORDER BY mean_time DESC;

-- Cache hit ratio (should be > 99%)
-- SELECT
--   sum(heap_blks_read) / (sum(heap_blks_read) + sum(heap_blks_hit)) * 100
-- FROM pg_statio_user_tables;
