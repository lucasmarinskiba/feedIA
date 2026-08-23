# FeedIA Backend Performance Optimization — Implementation Checklist

## Pre-Deployment Phase

### Environment Validation
- [ ] PostgreSQL running and accessible
- [ ] Redis running (optional but recommended)
- [ ] Node.js >= 20 installed
- [ ] npm/pnpm dependencies installed
- [ ] API key for testing configured

### Backup & Safety
- [ ] Production database backed up
- [ ] Current server version tagged in git
- [ ] Rollback procedure documented
- [ ] Team notified of upcoming optimization

---

## Database Optimization Phase (5 minutes)

### Step 1: Apply Index Schema
- [ ] Run: `psql $DATABASE_URL < src/db/optimization.sql`
- [ ] Verify: `psql $DATABASE_URL -c "SELECT COUNT(*) FROM pg_indexes WHERE indexname LIKE 'idx_%';"`
- [ ] Expected: 18+ indexes

### Step 2: Update Statistics
- [ ] Run: `psql $DATABASE_URL -c "ANALYZE;"`
- [ ] Verify completion

### Step 3: Verify Materialized Views
- [ ] Check: `psql $DATABASE_URL -c "SELECT COUNT(*) FROM pg_views WHERE table_name LIKE 'mv_%';"`
- [ ] Expected: 2 views

---

## Code Integration Phase (10 minutes)

### Step 1: Copy Service Files
- [ ] `src/services/cache-strategy.ts`
- [ ] `src/services/performance-monitor.ts`
- [ ] `src/api/abtest-routes.ts`

### Step 2: Update src/server.ts

Add imports:
```typescript
import cacheStrategy from './services/cache-strategy.js';
import { performanceMiddleware } from './services/performance-monitor.js';
import abtestRoutes from './api/abtest-routes.js';
```

Add middleware:
```typescript
app.use(performanceMiddleware);
```

Wrap cache endpoints:
```typescript
app.get('/api/trends/detect',
  cacheStrategy.cacheMiddleware(cacheStrategy.CACHE_TTL.TRENDS_DETECT),
  detectTrends
);
```

Mount A/B testing:
```typescript
app.use('/api/abtest', abtestRoutes);
```

- [ ] Updates complete
- [ ] No syntax errors
- [ ] File saved

### Step 3: Build & Test
- [ ] Run: `npm run build`
- [ ] Verify: no errors in output
- [ ] Start: `npm start`
- [ ] Health check: `curl http://localhost:3000/api/health`

---

## Performance Testing Phase (30 minutes)

### Step 1: Baseline (Optional)
- [ ] Run: `node scripts/load-test.mjs --url http://localhost:3000 --concurrency 5 --duration 30`
- [ ] Note throughput: _____ req/s
- [ ] Note avg response: _____ ms
- [ ] Note cache hits: 0% (expected)

### Step 2: Verify Caching
- [ ] Check: `curl http://localhost:3000/api/health/cache`
- [ ] Expected: healthy status

### Step 3: Test Endpoints
- [ ] Trends: `curl http://localhost:3000/api/trends/detect?days=7`
- [ ] Audio: `curl http://localhost:3000/api/trends/audio`
- [ ] A/B create: Test POST endpoint
- [ ] A/B results: Test GET endpoint

### Step 4: Load Test Optimized
- [ ] Run: `node scripts/load-test.mjs --url http://localhost:3000 --concurrency 10 --duration 60`
- [ ] Note throughput: _____ req/s (target: 20-50)
- [ ] Note avg response: _____ ms (target: 100-150)
- [ ] Note cache hits: _____ % (target: 60-80)

### Step 5: Compare Results
- [ ] Throughput improvement: _____ x
- [ ] Response time reduction: _____ %

---

## Production Deployment (10 minutes)

### Pre-Production
- [ ] All tests passing locally
- [ ] Cache working correctly
- [ ] A/B testing functional
- [ ] Performance targets met

### Deploy
- [ ] Commit code
- [ ] Push to repository
- [ ] Trigger deployment
- [ ] Wait for build completion

### Post-Deployment
- [ ] Health check responding
- [ ] Cache health check working
- [ ] Endpoints responding normally
- [ ] No errors in logs

---

## Monitoring & Verification

### Day 1
- [ ] Error logs normal
- [ ] Cache hit rates > 50%
- [ ] Response times show improvement
- [ ] No customer issues

### Week 1
- [ ] Run load tests again
- [ ] Compare with baseline
- [ ] Verify all endpoints functioning
- [ ] Adjust cache parameters if needed

### Ongoing (Monthly)
- [ ] Run ANALYZE on database
- [ ] Check index usage stats
- [ ] Monitor slow queries
- [ ] Refresh materialized views

---

## Rollback Procedure (if needed)

- [ ] Disable caching in server.ts
- [ ] Set REDIS_URL to empty
- [ ] Restart server
- [ ] Verify health check passing

---

## Performance Metrics

| Metric | Before | After | Target |
|--------|--------|-------|--------|
| Throughput | _____ req/s | _____ req/s | 20-50 |
| Avg Response | _____ ms | _____ ms | 100-150 |
| P95 Response | _____ ms | _____ ms | < 300 |
| Cache Hit Rate | 0% | _____ % | 60-80% |

---

**Status**: Ready for deployment  
**Date Deployed**: __________  
**Deployed By**: __________
