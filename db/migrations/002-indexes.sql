-- FeedIA Indexes v1
-- Performance optimization for core queries

-- User lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at DESC);

-- Session lookups
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_refresh_token ON user_sessions(refresh_token);

-- Campaign queries (most common: list by user, filter by status/platform)
CREATE INDEX IF NOT EXISTS idx_campaigns_user_id ON campaigns(user_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_user_status ON campaigns(user_id, status);
CREATE INDEX IF NOT EXISTS idx_campaigns_platform ON campaigns(platform);
CREATE INDEX IF NOT EXISTS idx_campaigns_created_at ON campaigns(user_id, created_at DESC);

-- Content queries (by campaign, by user, by status)
CREATE INDEX IF NOT EXISTS idx_content_campaign_id ON content(campaign_id);
CREATE INDEX IF NOT EXISTS idx_content_user_id ON content(user_id);
CREATE INDEX IF NOT EXISTS idx_content_status ON content(status);
CREATE INDEX IF NOT EXISTS idx_content_published_at ON content(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_content_type_status ON content(type, status);

-- Analytics queries (common: get events for campaign, time-range queries)
CREATE INDEX IF NOT EXISTS idx_analytics_campaign_id ON analytics_events(campaign_id);
CREATE INDEX IF NOT EXISTS idx_analytics_content_id ON analytics_events(content_id);
CREATE INDEX IF NOT EXISTS idx_analytics_user_id ON analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_timestamp ON analytics_events(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_event_type ON analytics_events(event_type);

-- Audience segments (by user, by campaign)
CREATE INDEX IF NOT EXISTS idx_audience_segments_user_id ON audience_segments(user_id);
CREATE INDEX IF NOT EXISTS idx_audience_segments_campaign_id ON audience_segments(campaign_id);

-- A/B Test queries
CREATE INDEX IF NOT EXISTS idx_ab_tests_campaign_id ON ab_tests(campaign_id);
CREATE INDEX IF NOT EXISTS idx_ab_tests_status ON ab_tests(status);

-- Forecast queries (by content, lookups)
CREATE INDEX IF NOT EXISTS idx_forecasts_content_id ON engagement_forecasts(content_id);
CREATE INDEX IF NOT EXISTS idx_forecasts_forecast_date ON engagement_forecasts(forecast_date);

-- Compliance checks
CREATE INDEX IF NOT EXISTS idx_compliance_content_id ON compliance_checks(content_id);
CREATE INDEX IF NOT EXISTS idx_compliance_status ON compliance_checks(status);

-- Batch job queries
CREATE INDEX IF NOT EXISTS idx_batch_jobs_user_id ON batch_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_batch_jobs_status ON batch_jobs(status);
CREATE INDEX IF NOT EXISTS idx_batch_jobs_created_at ON batch_jobs(created_at DESC);

-- Audio library queries (platform, niche, trending)
CREATE INDEX IF NOT EXISTS idx_audio_platform_niche ON audio_library(platform, niche);
CREATE INDEX IF NOT EXISTS idx_audio_trend_status ON audio_library(trend_status);
CREATE INDEX IF NOT EXISTS idx_audio_virality ON audio_library(virality_score DESC);

-- Webhook queries
CREATE INDEX IF NOT EXISTS idx_webhooks_user_id ON webhooks(user_id);
CREATE INDEX IF NOT EXISTS idx_webhooks_active ON webhooks(is_active);

-- Webhook delivery queries (for retries)
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_webhook_id ON webhook_deliveries(webhook_id);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_status ON webhook_deliveries(status);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_retry_count ON webhook_deliveries(status, retry_count);

-- Cost tracking queries
CREATE INDEX IF NOT EXISTS idx_api_costs_user_id ON api_costs(user_id);
CREATE INDEX IF NOT EXISTS idx_api_costs_provider ON api_costs(provider);
CREATE INDEX IF NOT EXISTS idx_api_costs_created_at ON api_costs(user_id, created_at DESC);

-- Audit log queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
