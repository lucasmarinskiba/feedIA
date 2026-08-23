# FeedIA Seed Data — Quick Start

## TL;DR (30 seconds)

```bash
# 1. Set environment variable
export DATABASE_PRIVATE_URL="postgresql://user:pass@host:5432/feedia"

# 2. Run migrations (one-time)
npm run db:migrate

# 3. Seed production data
npm run seed:prod

# 4. Verify
psql $DATABASE_PRIVATE_URL -c "SELECT COUNT(*) FROM users;"
```

**Expected output:** 4,590 rows across 8 tables with realistic production data.

---

## What You Get

| Resource | Count | Details |
|----------|-------|---------|
| **Test Users** | 10 | 4 free, 4 pro, 2 agency |
| **Campaigns** | 30 | 3 per user across Instagram/TikTok/YouTube |
| **Analytics Events** | 750 | Realistic engagement patterns (50% views → 5% clicks) |
| **Daily Metrics** | ~90 | Aggregated from raw events |
| **Audience Segments** | 50 | Rich targeting criteria (interests, location, age) |
| **A/B Tests** | 20 | With 60-100% confidence scores |
| **ROI Data** | 30 | Cost, revenue, conversions, CAC, LTV |
| **Trend Metrics** | 3,600 | 30-day history across platforms |

---

## Prerequisites

✅ PostgreSQL online (Railway or similar)
✅ Environment variables set (DATABASE_URL or DATABASE_PRIVATE_URL)
✅ Node.js 20+ and pnpm
✅ Migrations already run

---

## Step-by-Step

### 1️⃣ Verify Connection
```bash
psql $DATABASE_PRIVATE_URL -c "SELECT version();"
# Should print PostgreSQL version
```

### 2️⃣ Run Migrations (if not done)
```bash
npm run db:migrate
# Creates carousel-storage, video-storage, analytics schemas
```

### 3️⃣ Seed Data
```bash
npm run seed:prod
```

**What it does:**
1. Creates 10 test users (4 free, 4 pro, 2 agency)
2. Creates 30 campaigns (Instagram/TikTok/YouTube)
3. Generates 750 analytics events with realistic patterns
4. Aggregates into daily metrics
5. Creates 50 audience segments with rich criteria
6. Generates 20 A/B tests with statistical results
7. Seeds 30 ROI campaigns with full financial data
8. Creates 3,600 trend data points (30-day history)

**Runtime:** 15-30 seconds

### 4️⃣ Verify Success
```bash
# Quick check
npm run seed:prod && echo "✅ Success!"

# Full verification
psql $DATABASE_PRIVATE_URL << EOF
SELECT 'users' as table_name, COUNT(*) as rows FROM users
UNION ALL
SELECT 'carousels', COUNT(*) FROM carousels
UNION ALL
SELECT 'carousel_analytics', COUNT(*) FROM carousel_analytics
UNION ALL
SELECT 'carousel_metrics_daily', COUNT(*) FROM carousel_metrics_daily
UNION ALL
SELECT 'audience_segments', COUNT(*) FROM audience_segments
UNION ALL
SELECT 'ab_tests', COUNT(*) FROM ab_tests
UNION ALL
SELECT 'campaign_roi', COUNT(*) FROM campaign_roi
UNION ALL
SELECT 'trend_metrics', COUNT(*) FROM trend_metrics;
EOF
```

---

## Expected Output

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

---

## Common Issues

### ❌ "DATABASE_PRIVATE_URL not set"
```bash
export DATABASE_PRIVATE_URL="postgresql://..."
npm run seed:prod
```

### ❌ "Failed to connect to database"
- Check PostgreSQL is online
- Verify credentials in DATABASE_PRIVATE_URL
- Test with `psql` command

### ❌ "Migrations have not been run"
```bash
npm run db:migrate
npm run seed:prod
```

### ❌ "Table does not exist"
- Some tables (audience_segments, ab_tests, etc.) are created by seed script
- Normal behavior — they'll be created on first run

---

## Test the APIs

After seeding, these endpoints should return real data:

```bash
# Get a sample user ID
USER_ID=$(psql $DATABASE_PRIVATE_URL -t -c "SELECT id FROM users LIMIT 1;")

# Test trend detection
curl "http://localhost:3000/api/trends/detect?userId=$USER_ID"

# Test ROI calculation
CAMPAIGN_ID=$(psql $DATABASE_PRIVATE_URL -t -c "SELECT id FROM carousels LIMIT 1;")
curl "http://localhost:3000/api/roi/calculate?campaignId=$CAMPAIGN_ID"

# Test analytics
curl "http://localhost:3000/api/analytics/summary?userId=$USER_ID&days=30"

# Test audience segments
curl "http://localhost:3000/api/audience/segments?userId=$USER_ID"
```

---

## Reset & Reseed

```bash
# Clear all seed data
psql $DATABASE_PRIVATE_URL << EOF
DELETE FROM campaign_roi;
DELETE FROM ab_tests;
DELETE FROM trend_metrics;
DELETE FROM audience_segments;
DELETE FROM carousel_metrics_daily;
DELETE FROM carousel_analytics;
DELETE FROM carousels;
DELETE FROM users;
EOF

# Re-seed
npm run seed:prod
```

---

## Performance Notes

- **Connection pooling:** Auto-managed, 10 connections default
- **Batch inserts:** ~750 events in single query
- **Aggregation:** Computed once during seeding
- **Indexes:** Created by migrations for fast queries
- **SSL:** Enabled with `rejectUnauthorized: false`

**Expected times:**
- Connection: 1-2 seconds
- Users: <1 second
- Campaigns: 1 second
- Events: 5-10 seconds (includes aggregation)
- Segments: 2 seconds
- Tests: 1 second
- ROI: 1 second
- Trends: 3-5 seconds
- **Total: 15-30 seconds**

---

## Full Documentation

- **SEED_DATA_GUIDE.md** — Complete user guide with troubleshooting
- **SEED_DATA_IMPLEMENTATION.md** — Technical architecture and patterns
- **src/scripts/seed-production-data.ts** — Source code (723 lines, fully documented)

---

## Next Steps

1. ✅ Run `npm run seed:prod`
2. ✅ Verify data with `psql` queries
3. ✅ Test API endpoints
4. ✅ Build dashboards with seeded metrics
5. ✅ Validate ROI calculations
6. ✅ Run end-to-end tests
7. ✅ Load test with 10x data (modify config)
8. ✅ Archive seed data before production push

---

## Support

Need help? Check:
- **Connection issues?** → SEED_DATA_GUIDE.md (Troubleshooting section)
- **How does it work?** → SEED_DATA_IMPLEMENTATION.md (Architecture section)
- **Want to modify data?** → src/scripts/seed-production-data.ts (Edit `config` object)
- **Need more data?** → SEED_DATA_IMPLEMENTATION.md (Scaling section)
