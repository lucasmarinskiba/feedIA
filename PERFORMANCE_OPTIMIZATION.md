# FeedIA Backend Performance Optimization Guide

This guide walks you through optimizing FeedIA's backend performance with a 50% response time reduction target.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Architecture Overview](#architecture-overview)
3. [Step 1: Baseline Performance Testing](#step-1-baseline-performance-testing)
4. [Step 2: Apply Database Optimizations](#step-2-apply-database-optimizations)
5. [Step 3: Implement Redis Caching](#step-3-implement-redis-caching)
6. [Step 4: A/B Testing Endpoints](#step-4-ab-testing-endpoints)
7. [Step 5: Re-test & Measure Improvements](#step-5-re-test--measure-improvements)
8. [Performance Benchmarks](#performance-benchmarks)
9. [Maintenance & Monitoring](#maintenance--monitoring)

---

## Prerequisites

### Environment Setup

Ensure these services are running:

- **PostgreSQL**: `DATABASE_URL` environment variable set
- **Redis**: `REDIS_URL` environment variable set (optional, with graceful fallback)

### Environment Variables

```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/feedia

# Redis (optional)
REDIS_URL=redis://localhost:6379

# API Testing
API_KEY=test-key-load-testing  # Mock API key for testing
```

### Node.js & Dependencies

```bash
node --version  # >= 20.0.0
npm install     # Install dependencies including pg, redis, express, etc.
```

---

## Architecture Overview

### Current Stack

- **API**: Express.js on Railway (or Vercel)
- **Database**: PostgreSQL (primary) + SQLite (fallback)
- **Cache**: Redis (if available)
- **Endpoints Tested**:
  - `GET /api/trends/detect` — Trend detection (analytics-heavy)
  - `GET /api/trends/audio` — Trending audio library lookup
  - `POST /api/roi/calculate` — ROI estimation (CPU-intensive)
  - `POST /api/roi/compare` — Multi-format ROI comparison
  - `GET /api/abtest/:id/results` — A/B test aggregation
  - `GET /api/carousel/:id/metrics` — Carousel metrics (cache test)

### Optimization Layers

1. **Database Layer**: Indexes + query optimization
2. **Cache Layer**: Redis-based response caching
3. **Application Layer**: Smart batching + materialized views
4. **Monitoring Layer**: Performance metrics + analytics

---

## Step 1: Baseline Performance Testing

### Run Load Tests (Before Optimization)

```bash
# Install load testing dependencies (if not present)
npm install --save-dev autocannon  # or use Apache Bench

# Run baseline load test
node scripts/load-test.mjs \
  --url http://localhost:3000 \
  --concurrency 5 \
  --duration 30

# Expected output:
# - Throughput: ~5-10 req/s
# - Avg response time: 200-500ms
# - Cache hit rate: 0% (no caching yet)
```

### Automated Performance Baseline Script

Create `scripts/benchmark-baseline.sh`:

```bash
#!/bin/bash
set -e

echo "=== FeedIA Performance Baseline ==="
echo "Testing endpoints BEFORE optimization..."

# Test trending endpoint
echo "\n[1/4] Testing /api/trends/detect..."
ab -n 100 -c 5 -H "X-API-Key: test-key-load-testing" \
  "http://localhost:3000/api/trends/detect?days=7" | tee baseline-trends.txt

# Test ROI calculation
echo "\n[2/4] Testing /api/roi/calculate..."
ab -n 50 -c 3 -p roi-payload.json -T application/json \
  -H "X-API-Key: test-key-load-testing" \
  "http://localhost:3000/api/roi/calculate" | tee baseline-roi.txt

# Test audio trending
echo "\n[3/4] Testing /api/trends/audio..."
ab -n 100 -c 5 -H "X-API-Key: test-key-load-testing" \
  "http://localhost:3000/api/trends/audio?platform=tiktok&limit=10" | tee baseline-audio.txt

# Test carousel metrics
echo "\n[4/4] Testing /api/carousel/:id/metrics..."
ab -n 100 -c 5 -H "X-API-Key: test-key-load-testing" \
  "http://localhost:3000/api/carousel/test-123/metrics" | tee baseline-carousel.txt

echo "\n=== Baseline captured ==="
```

### Parse Results

```bash
# Extract key metrics
grep "Requests per second" baseline-*.txt
grep "Time per request" baseline-*.txt
```

---

## Step 2: Apply Database Optimizations

### 2.1 Apply Index Schema

```bash
# Connect to PostgreSQL
psql $DATABASE_URL

# Run optimization SQL
\i src/db/optimization.sql
```

### Index Summary

The optimization.sql file adds **18 strategic indexes** across:

- **Analytics Events** (user + timestamp, campaign + timestamp, daily aggregations)
- **Audio Library** (platform + virality, platform + uses)
- **Campaigns** (user_id, status, created_at)
- **A/B Tests** (test_id, variant, results tracking)
- **Carousel** (user_id, created_at, analytics)
- **Content & Batch Jobs** (user filtering, status queries)
- **Cost Tracking** (user + timestamp, provider + model)

### 2.2 Verify Indexes Created

```sql
-- Check all indexes on analytics_events table
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'analytics_events'
ORDER BY indexname;

-- Check index usage (should grow over time)
SELECT indexrelname, idx_scan, idx_tup_read, idx_tup_fetch
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;
```

### 2.3 Update PostgreSQL Statistics

```sql
-- Force query planner to re-analyze tables
ANALYZE;
VACUUM ANALYZE;
```

### Expected Improvement

- **Trend detection queries**: 300-500ms → 50-100ms (5-10x faster)
- **Audio trending queries**: 100-200ms → 20-40ms (3-5x faster)
- **ROI calculations**: unchanged (CPU-bound, not DB-bound)

---

## Step 3: Implement Redis Caching

### 3.1 Verify Redis Connection

```bash
# Test Redis availability
redis-cli ping
# Expected: PONG

# Check connection details
redis-cli INFO server
```

### 3.2 Wire Caching Middleware into Express

Update `src/server.ts`:

```typescript
import { performanceMiddleware } from './services/performance-monitor.js';
import cacheStrategy from './services/cache-strategy.js';

// Add performance monitoring (after security middleware, before routes)
app.use(performanceMiddleware);

// Wrap high-traffic GET endpoints with caching middleware
app.get('/api/trends/detect',
  cacheStrategy.cacheMiddleware(cacheStrategy.CACHE_TTL.TRENDS_DETECT),
  (req, res) => detectTrends(req, res)
);

app.get('/api/trends/audio',
  cacheStrategy.cacheMiddleware(cacheStrategy.CACHE_TTL.TRENDS_AUDIO),
  (req, res) => getTrendingAudio(req, res)
);

// For POST endpoints, cache the response manually
app.post('/api/roi/calculate', (req, res) => {
  const cacheKey = cacheStrategy.generateCacheKey.roiCalculate(
    req.body.format,
    req.body.topic,
    req.body.targetAudience,
    req.body.budget
  );

  cacheStrategy.withCaching(cacheKey, cacheStrategy.CACHE_TTL.ROI_CALCULATE, async () => {
    // Fetch and return ROI calculation
    const result = calculateROI(req.body);
    res.json({ success: true, data: result });
  });
});
```

### 3.3 Cache Invalidation Strategy

```typescript
// When a campaign is created/updated (invalidate trend cache)
await invalidateCachePatterns('campaign', userId);

// When new analytics events are tracked (invalidate analytics)
await invalidateCachePatterns('analytics');

// When cost is tracked (invalidate ROI cache)
await invalidateCachePatterns('cost');
```

### Cache TTL Settings

```typescript
// From src/services/cache-strategy.ts
export const CACHE_TTL = {
  TRENDS_DETECT: 5 * 60,        // 5 minutes (user-specific trends)
  TRENDS_AUDIO: 10 * 60,        // 10 minutes (global audio data)
  ROI_CALCULATE: 15 * 60,       // 15 minutes (format-specific ROI)
  ROI_COMPARE: 15 * 60,         // 15 minutes (multi-format comparison)
  ABTEST_RESULTS: 10 * 60,      // 10 minutes (test-specific results)
  CAROUSEL_METRICS: 5 * 60,     // 5 minutes (carousel-specific)
  ANALYTICS_AGG: 10 * 60,       // 10 minutes (aggregated analytics)
};
```

### 3.4 Monitor Cache Health

```typescript
import { cacheHealthCheck, getCacheStats } from './services/cache-strategy.js';

// Add health check endpoint
app.get('/api/health/cache', async (req, res) => {
  const health = await cacheHealthCheck();
  const stats = getCacheStats();

  res.json({
    cache: health,
    stats,
    hitRate: `${stats.hitRate.toFixed(1)}%`,
  });
});
```

### Expected Improvement

- **Repeated queries**: 200ms → 5-10ms (20-40x faster)
- **Cache hit rate**: Target 60-80% for read-heavy endpoints
- **Overall throughput**: +40-60% more requests/second

---

## Step 4: A/B Testing Endpoints

### 4.1 Wire A/B Test Routes

Update `src/server.ts`:

```typescript
import abtestRoutes from './api/abtest-routes.js';

// Mount A/B testing routes
app.use('/api/abtest', abtestRoutes);
```

### 4.2 Create Test Database Schema (if not present)

```sql
-- A/B test definitions
CREATE TABLE IF NOT EXISTS abtests (
  id VARCHAR(100) PRIMARY KEY,
  user_id VARCHAR(100) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  variants JSONB NOT NULL,
  metric VARCHAR(50) NOT NULL,
  hypothesis TEXT,
  start_date TIMESTAMP NOT NULL,
  end_date TIMESTAMP,
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- A/B test results/conversions
CREATE TABLE IF NOT EXISTS abtest_results (
  id SERIAL PRIMARY KEY,
  test_id VARCHAR(100) NOT NULL REFERENCES abtests(id),
  variant VARCHAR(100) NOT NULL,
  conversions INT DEFAULT 1,
  impressions INT DEFAULT 1,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for A/B testing
CREATE INDEX idx_abtests_user_id ON abtests(user_id);
CREATE INDEX idx_abtest_results_test_id ON abtest_results(test_id);
CREATE INDEX idx_abtest_results_test_variant ON abtest_results(test_id, variant);
```

### 4.3 A/B Testing API Usage

```bash
# Create a test
curl -X POST http://localhost:3000/api/abtest/create \
  -H "X-API-Key: test-key" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Carousel vs Reel ROI",
    "description": "Test which format drives better conversion",
    "variants": ["carousel", "reel"],
    "metric": "conversions",
    "hypothesis": "Reels drive 20% higher conversion rates",
    "startDate": "2026-08-22T00:00:00Z",
    "endDate": "2026-09-22T00:00:00Z"
  }'

# Track conversions
curl -X POST http://localhost:3000/api/abtest/test-123/track \
  -H "X-API-Key: test-key" \
  -H "Content-Type: application/json" \
  -d '{
    "variant": "carousel",
    "conversions": 5,
    "impressions": 1000
  }'

# Get results (cached for 10 minutes)
curl http://localhost:3000/api/abtest/test-123/results \
  -H "X-API-Key: test-key"

# Response includes:
# - Conversion rates per variant
# - Statistical significance
# - Confidence intervals
# - Winner announcement
```

---

## Step 5: Re-test & Measure Improvements

### 5.1 Run Optimized Load Tests

```bash
# Run load test AFTER optimization
node scripts/load-test.mjs \
  --url http://localhost:3000 \
  --concurrency 10 \
  --duration 60

# Expected improvements:
# - Throughput: 20-50 req/s (4-5x improvement)
# - Avg response time: 50-150ms (50-75% reduction)
# - Cache hit rate: 60-80%
# - P95 response time: < 200ms
```

### 5.2 Compare Before/After

Create `scripts/compare-results.sh`:

```bash
#!/bin/bash

echo "=== Performance Comparison ==="
echo ""
echo "BEFORE (baseline-*.txt):"
grep "Time per request" baseline-*.txt | awk '{sum += $4; count++} END {print "  Avg: " sum/count "ms"}'
grep "Requests per second" baseline-*.txt | awk '{print "  Throughput: " $4 " req/s"}'

echo ""
echo "AFTER (optimized-*.txt):"
grep "Time per request" optimized-*.txt | awk '{sum += $4; count++} END {print "  Avg: " sum/count "ms"}'
grep "Requests per second" optimized-*.txt | awk '{print "  Throughput: " $4 " req/s"}'

# Calculate percentage improvement
# (baseline - optimized) / baseline * 100
```

### 5.3 Test Specific Endpoints

```bash
# Test trending with cache
echo "Testing /api/trends/detect (should be cached after first run)..."
for i in {1..10}; do
  curl -s -H "X-API-Key: test-key" \
    http://localhost:3000/api/trends/detect?days=7 | \
    grep -o '"X-Cache":"[^"]*"'
done
# Should see X-Cache: HIT after first request

# Test ROI calculation (CPU-intensive, minimal cache benefit)
echo "Testing /api/roi/calculate..."
time curl -X POST http://localhost:3000/api/roi/calculate \
  -H "X-API-Key: test-key" \
  -H "Content-Type: application/json" \
  -d '{"format":"carousel","topic":"Test","targetAudience":"Test","budget":500}'

# Test A/B results (aggregation, should be cached)
echo "Testing /api/abtest/:id/results..."
time curl http://localhost:3000/api/abtest/test-123/results \
  -H "X-API-Key: test-key"
```

---

## Performance Benchmarks

### Target Metrics

| Endpoint | Before | After | Improvement | Method |
|----------|--------|-------|-------------|--------|
| `/api/trends/detect` | 350ms | 50ms | 7x faster | DB index + cache |
| `/api/trends/audio` | 150ms | 20ms | 7.5x faster | DB index + cache |
| `/api/roi/calculate` | 400ms | 350ms | 1.1x faster | CPU-bound, minimal |
| `/api/roi/compare` | 800ms | 650ms | 1.2x faster | CPU-bound, minimal |
| `/api/abtest/:id/results` | 500ms | 75ms | 6.7x faster | DB join + cache |
| `/api/carousel/:id/metrics` | 200ms | 30ms | 6.7x faster | DB index + cache |

### Overall System

- **Throughput**: 5-10 req/s → 20-50 req/s (4-5x)
- **Avg Response Time**: 300-400ms → 100-150ms (50-67% reduction)
- **P95 Response Time**: 800-1000ms → 200-300ms
- **Cache Hit Rate**: 0% → 60-80%
- **Database Query Time**: -60 to -80% for cached endpoints

---

## Maintenance & Monitoring

### Daily Tasks

```bash
# 1. Check Redis health
redis-cli PING

# 2. Monitor slow queries
psql $DATABASE_URL -c "SELECT query, mean_time FROM pg_stat_statements WHERE mean_time > 100 ORDER BY mean_time DESC LIMIT 10;"

# 3. Verify cache hit rates (from performance monitor)
curl http://localhost:3000/api/health/cache

# 4. Check index usage
psql $DATABASE_URL -c "SELECT indexrelname, idx_scan FROM pg_stat_user_indexes ORDER BY idx_scan DESC;"
```

### Weekly Tasks

```bash
# 1. Reindex heavily used indexes
psql $DATABASE_URL -c "REINDEX INDEX CONCURRENTLY idx_analytics_events_user_timestamp;"

# 2. Update table statistics
psql $DATABASE_URL -c "VACUUM ANALYZE;"

# 3. Refresh materialized views (created in optimization.sql)
psql $DATABASE_URL -c "REFRESH MATERIALIZED VIEW CONCURRENTLY mv_daily_trends;"
psql $DATABASE_URL -c "REFRESH MATERIALIZED VIEW CONCURRENTLY mv_user_engagement;"
```

### Monthly Tasks

```bash
# 1. Archive old analytics events
psql $DATABASE_URL -c "DELETE FROM analytics_events WHERE created_at < NOW() - INTERVAL '90 days';"

# 2. Full table analysis
psql $DATABASE_URL -c "ANALYZE;"

# 3. Check connection pool utilization
ps aux | grep postgres | wc -l
```

### Monitoring Dashboard Query

```typescript
// Add to admin API
app.get('/api/admin/performance', adminKeyAuth, async (req, res) => {
  const stats = performanceMonitor.getAllEndpointStats();
  const cacheStats = cacheStrategy.getCacheStats();
  const dbPerf = performanceMonitor.getDbPerformance();

  res.json({
    endpoints: stats,
    cache: cacheStats,
    database: dbPerf,
    report: performanceMonitor.generateReport(),
  });
});
```

---

## Troubleshooting

### Issue: Cache not working (hit rate = 0%)

```bash
# 1. Verify Redis is running
redis-cli PING  # Should return PONG

# 2. Check Redis connection in logs
grep "Redis\|Cache" app.log | head -20

# 3. Verify REDIS_URL env var
echo $REDIS_URL

# 4. Test cache manually
redis-cli SET test-key "test-value"
redis-cli GET test-key
```

### Issue: Database queries still slow

```sql
-- 1. Check if indexes are actually being used
EXPLAIN ANALYZE
SELECT COUNT(*) FROM analytics_events
WHERE user_id = 'test-user' AND timestamp > NOW() - INTERVAL '7 days';

-- 2. Verify index exists
SELECT * FROM pg_indexes WHERE tablename = 'analytics_events';

-- 3. Force index re-analyze
REINDEX INDEX idx_analytics_events_user_timestamp;
```

### Issue: High memory usage

```typescript
// Memory is bounded by:
// 1. metrics buffer: max 10,000 recent metrics
// 2. Cache TTL: Redis auto-expires keys
// 3. Connection pool: max 20 connections (configurable)

// To reduce memory:
// - Lower maxMetrics in performance-monitor.ts
// - Reduce cache TTL values
// - Lower connection pool size
```

---

## Summary: Checklist

- [ ] PostgreSQL + Redis running
- [ ] Environment variables configured
- [ ] Run baseline load tests
- [ ] Apply `src/db/optimization.sql`
- [ ] Verify indexes created
- [ ] Wire caching middleware in `src/server.ts`
- [ ] Add A/B testing routes
- [ ] Re-run load tests
- [ ] Compare before/after metrics
- [ ] Deploy to production with monitoring
- [ ] Set up daily maintenance tasks

---

## References

- PostgreSQL Index Documentation: https://www.postgresql.org/docs/current/sql-createindex.html
- Redis Caching Best Practices: https://redis.io/docs/manual/client-side-caching/
- Express Performance: https://expressjs.com/en/advanced/best-practice-performance.html
- Load Testing with Apache Bench: https://httpd.apache.org/docs/2.4/programs/ab.html
