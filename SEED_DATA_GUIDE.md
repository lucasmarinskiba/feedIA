# FeedIA Production Seed Data Guide

## Overview

The `seed-production-data.ts` script generates realistic test data for FeedIA's PostgreSQL database. This enables endpoints like `/api/trends/detect`, `/api/roi/calculate`, and `/api/abtest/:testId/results` to return meaningful data instead of empty errors.

## What Gets Seeded

- **10 test users** with varied tiers (4 free, 4 pro, 2 agency)
- **30 campaigns** across users (3 per user) on Instagram, TikTok, YouTube
- **500+ analytics events** with realistic engagement patterns:
  - 50% views, 25% likes, 10% shares, 10% saves, 5% clicks
- **Daily metrics aggregation** from event data
- **50 audience segments** with interests, locations, age ranges, engagement levels
- **20 A/B tests** with realistic statistical results (60-100% confidence)
- **30 ROI campaigns** with costs, conversions, and calculated metrics
- **3,600 trend metrics** across 30 days for all users and platforms

## Prerequisites

1. **PostgreSQL database online** with DATABASE_PRIVATE_URL set
2. **Migrations already run** (schemas: carousel-storage, video-storage, analytics)
3. **Environment variables configured**:
   ```bash
   export DATABASE_URL="postgresql://user:password@host:5432/feedia"
   # OR (for Railway):
   export DATABASE_PRIVATE_URL="postgresql://user:password@internal-host:5432/feedia"
   ```

## Step 1: Run Migrations (If Not Already Done)

```bash
npm run db:migrate
```

This creates the required tables:
- `users` — Test accounts with tier info
- `carousels` — Campaign metadata
- `carousel_analytics` — Event tracking (views, likes, shares, etc.)
- `carousel_metrics_daily` — Aggregated daily stats
- `audience_segments` — User segments (created by seed script)
- `ab_tests` — A/B test data (created by seed script)
- `campaign_roi` — ROI tracking (created by seed script)
- `trend_metrics` — Trend detection data (created by seed script)

## Step 2: Seed Production Data

```bash
npm run seed:prod
```

**Output:**
```
🌱 FeedIA Production Seed Data Generator
=========================================

✓ Connected to PostgreSQL
📝 Generating test users...
✓ Created 10 users
📊 Generating campaigns...
✓ Created 30 campaigns
📈 Generating analytics events...
✓ Created 750 analytics events
  Aggregating daily metrics...
  ✓ Daily metrics aggregated
👥 Generating audience segments...
✓ Created 50 audience segments
🧪 Generating A/B tests...
✓ Created 20 A/B tests
💰 Generating ROI and conversion data...
✓ Created ROI data for 30 campaigns
📊 Generating trend detection data...
✓ Created trend metrics for 10 users × 30 days

✅ Seed data generation completed successfully!

Summary:
  • Users: 10
  • Campaigns: 30
  • Analytics Events: 750
  • Audience Segments: 50
  • A/B Tests: 20
  • ROI Data: 30
  • Trend Metrics: 3,600 (users × days × metrics × platforms)
```

## Step 3: Verify Data

Run these queries in your PostgreSQL client to confirm seeding:

```sql
-- Check user count and tiers
SELECT plan, COUNT(*) as count FROM users GROUP BY plan;

-- Check campaigns by platform
SELECT platform, COUNT(*) as count FROM carousels GROUP BY platform;

-- Check analytics events
SELECT event_type, COUNT(*) as count FROM carousel_analytics GROUP BY event_type;

-- Check daily metrics
SELECT COUNT(*) as daily_metrics FROM carousel_metrics_daily;

-- Check audience segments
SELECT COUNT(*) as segments FROM audience_segments;

-- Check A/B tests
SELECT COUNT(*) as ab_tests FROM ab_tests;

-- Check ROI data
SELECT COUNT(*) as roi_entries, 
       ROUND(AVG(roi_percent::numeric), 2) as avg_roi_percent,
       ROUND(SUM(revenue_usd::numeric), 2) as total_revenue
FROM campaign_roi;

-- Check trend metrics
SELECT COUNT(*) as trend_points FROM trend_metrics;

-- View sample campaign performance
SELECT 
  c.title,
  c.platform,
  COUNT(ca.id) as total_events,
  COUNT(DISTINCT DATE(ca.created_at)) as days_active,
  ROUND(SUM(cmd.likes)::numeric, 0) as total_likes,
  ROUND(AVG(cmd.engagement_rate)::numeric, 2) as avg_engagement
FROM carousels c
LEFT JOIN carousel_analytics ca ON c.id = ca.carousel_id
LEFT JOIN carousel_metrics_daily cmd ON c.id = cmd.carousel_id
GROUP BY c.id, c.title, c.platform
LIMIT 10;
```

## Expected Results After Seeding

### Users
- 10 total users across 3 tiers
- Free tier: 4 users with 30-day analytics retention
- Pro tier: 4 users with 90-day analytics retention
- Agency (premium): 2 users with 365-day analytics retention

### Campaigns
- 30 campaigns total (3 per user)
- Distributed across Instagram (40%), TikTok (35%), YouTube (25%)
- Mix of carousel, reel, and story formats
- Realistic metadata with budget, goals, and impressions targets

### Analytics
- 750 raw events (25 per campaign)
- Realistic event distribution (50% views → 5% clicks)
- Spread across campaign lifespan
- Daily aggregated metrics with calculated engagement rates

### Audience Segments
- 50 segments with rich criteria (interests, locations, age, engagement)
- Size range: 1,000 - 50,000 people each
- Distributed across all users

### A/B Tests
- 20 tests (2 per user where campaigns exist)
- Statistical confidence scores (60-100%)
- Variant results with realistic engagement metrics
- Winner determination based on engagement rate

### ROI Data
- 30 campaigns with cost/revenue tracking
- ROI range: typically -50% to +200%
- Customer acquisition cost (CAC) calculated per campaign
- Lifetime value (LTV) per conversion

### Trends
- 3,600 daily trend metrics
- 30-day historical data
- 4 metrics tracked per platform per day
- All user accounts have trend data

## API Verification

After seeding, these endpoints should return data:

```bash
# Get campaign trends
curl https://your-app.com/api/trends/detect?userId=<user-id>

# Calculate ROI for campaign
curl https://your-app.com/api/roi/calculate?campaignId=<campaign-id>

# Get A/B test results
curl https://your-app.com/api/abtest/<test-id>/results

# Analytics dashboard
curl https://your-app.com/api/analytics/summary?userId=<user-id>

# Audience insights
curl https://your-app.com/api/audience/segments?userId=<user-id>
```

## Customization

To modify seed parameters, edit `src/scripts/seed-production-data.ts`:

```typescript
const config: SeedConfig = {
  databaseUrl: process.env.DATABASE_URL || process.env.DATABASE_PRIVATE_URL || '',
  users: 10,                          // Number of test users
  campaignsPerUser: 3,                // Campaigns per user
  analyticsEventsPerCampaign: 25,     // Events per campaign
  audienceSegments: 50,               // Total segments
  abTestsPerUser: 2,                  // Tests per user
};
```

Then re-run `npm run seed:prod`.

## Troubleshooting

### Error: "Failed to connect to database"
- Verify DATABASE_PRIVATE_URL is set correctly
- Check PostgreSQL is online and accessible
- Confirm credentials are valid

### Error: "Migrations have not been run"
- Run `npm run db:migrate` first
- Check that all three schema files created tables successfully

### Error: "ON CONFLICT" clause not recognized
- Ensure PostgreSQL version 9.5+ (upsert syntax added in 9.5)
- Check that tables exist before seeding

### Missing tables after seeding
- Check that migration schema files ran without errors
- Verify SQL syntax is compatible with your PostgreSQL version
- Manually create missing tables using the SQL in schema files

## Performance Notes

- Seeding 750 analytics events takes ~5-10 seconds
- Daily metric aggregation adds ~2-3 seconds
- Total runtime: 15-30 seconds depending on network latency
- Database connection uses SSL with `rejectUnauthorized: false`

## Data Reset

To clear seed data and start fresh:

```sql
-- Delete in dependency order
DELETE FROM campaign_roi WHERE id IS NOT NULL;
DELETE FROM ab_tests WHERE id IS NOT NULL;
DELETE FROM trend_metrics WHERE id IS NOT NULL;
DELETE FROM audience_segments WHERE id IS NOT NULL;
DELETE FROM carousel_metrics_daily WHERE id IS NOT NULL;
DELETE FROM carousel_analytics WHERE id IS NOT NULL;
DELETE FROM videos WHERE id IS NOT NULL;
DELETE FROM carousels WHERE id IS NOT NULL;
DELETE FROM users WHERE id IS NOT NULL;
```

Then re-run `npm run seed:prod`.

## Production Safety

⚠️ **This script is designed for development/staging only.**

For production:
1. Never run against production databases without backup
2. Use transaction rollback if something goes wrong
3. Add `BEGIN;` and `ROLLBACK;` guards in production mode
4. Test in staging first
5. Use proper credentials (never hardcode in scripts)

## Next Steps

After seeding:
1. Verify endpoints return data (see API Verification above)
2. Test analytics aggregation queries
3. Run end-to-end tests with real campaign data
4. Build dashboard with seeded metrics
5. Validate ROI calculations and trend detection
