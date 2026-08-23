# FeedIA Performance Optimization — Quick Start (5 Minutes)

## 1. Prerequisites Check

```bash
# Verify PostgreSQL
psql $DATABASE_URL -c "SELECT 1;"
# Expected: (1 row)

# Verify Redis (optional but recommended)
redis-cli PING
# Expected: PONG
```

## 2. Apply Database Optimization (2 minutes)

```bash
# Run the optimization SQL
psql $DATABASE_URL < src/db/optimization.sql

# Verify indexes created
psql $DATABASE_URL -c "SELECT COUNT(*) FROM pg_indexes WHERE indexname LIKE 'idx_%';"
# Expected: 18+ indexes

# Update statistics
psql $DATABASE_URL -c "ANALYZE;"
```

## 3. Test Before & After (30 seconds setup, 2 minutes tests)

### Before Tests (Optional but Recommended)

```bash
# In one terminal, start server (if not already running)
npm start

# In another terminal, run baseline tests
node scripts/load-test.mjs \
  --url http://localhost:3000 \
  --concurrency 5 \
  --duration 30

# Save results
# Look for:
# - Throughput: ~5-10 req/s
# - Avg Response Time: 200-400ms
# - Cache Hit Rate: 0%
```

## 4. Integration (5 minutes)

Add to `src/server.ts`:

```typescript
// After imports
import cacheStrategy from './services/cache-strategy.js';
import { performanceMiddleware } from './services/performance-monitor.js';
import abtestRoutes from './api/abtest-routes.js';

// After security middleware, before routes
app.use(performanceMiddleware);

// Wrap trending endpoints (example)
app.get('/api/trends/detect',
  cacheStrategy.cacheMiddleware(cacheStrategy.CACHE_TTL.TRENDS_DETECT),
  (req, res) => detectTrends(req, res)
);

// Mount A/B testing
app.use('/api/abtest', abtestRoutes);
```

## 5. Deploy & Test After (2 minutes)

```bash
# Rebuild and restart
npm run build
npm start

# Run optimized load tests
node scripts/load-test.mjs \
  --url http://localhost:3000 \
  --concurrency 10 \
  --duration 60

# Expected improvements:
# - Throughput: 20-50 req/s (4-5x)
# - Avg Response Time: 100-150ms (50% reduction)
# - Cache Hit Rate: 60-80%
```

## 6. Verify Cache Health

```bash
# Quick check
curl http://localhost:3000/api/health/cache

# Should show:
# {
#   "status": "healthy",
#   "latencyMs": 2,
#   "message": "Cache responding normally..."
# }
```

## 7. Test A/B Testing (Optional)

```bash
# Create test
curl -X POST http://localhost:3000/api/abtest/create \
  -H "X-API-Key: test-key" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Format Test",
    "variants": ["carousel", "reel"],
    "metric": "conversions",
    "startDate": "2026-08-22T00:00:00Z"
  }'

# Should return test ID in response
```

---

## Expected Results

| Metric | Before | After |
|--------|--------|-------|
| Avg Response | 300ms | 100ms |
| Throughput | 5-10 | 20-50 |
| P95 Response | 800ms | 200ms |
| Cache Hit Rate | 0% | 60-80% |

---

## Files to Review

| File | Purpose |
|------|---------|
| `PERFORMANCE_OPTIMIZATION.md` | Full 50-page guide |
| `OPTIMIZATION_SUMMARY.md` | Executive summary |
| `src/services/cache-strategy.ts` | Caching implementation |
| `src/db/optimization.sql` | Database indexes |
| `scripts/load-test.mjs` | Load testing tool |

---

## Troubleshooting

**Cache not working?**
```bash
redis-cli ping
echo $REDIS_URL
```

**Database still slow?**
```sql
psql $DATABASE_URL
SELECT * FROM pg_stat_user_indexes ORDER BY idx_scan DESC;
```

**Need full guide?**
```bash
cat PERFORMANCE_OPTIMIZATION.md
```

---

**Total time**: ~5 minutes setup + 2-3 minutes testing = 7-8 minutes to production deployment

**Questions?** See `PERFORMANCE_OPTIMIZATION.md` for step-by-step details.
