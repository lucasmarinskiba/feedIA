# Carousel Infrastructure Testing Guide

## Status

✅ **All code complete, committed to GitHub, and compiling successfully**
⏳ **Awaiting Railway backend URL to run tests**

---

## Find Your Railway Backend URL

### Option 1: Railway Dashboard (Recommended)
1. Go to https://railway.app
2. Sign in with your account (lucasmarinskiba-7650s)
3. Select project: **feedIA**
4. Click the deployment/environment
5. Copy the public domain URL (looks like `https://feedia-production-xxxx.railway.app`)

### Option 2: Railway CLI
```bash
# Install Railway CLI
curl -sSL https://railway.app/install.sh | bash

# Login
railway login

# List projects
railway projects

# Select project and show URL
railway projects:select feedIA
railway domains
```

### Option 3: Git Remote
Check if Railway is configured as a git remote:
```bash
git remote -v
# Look for railway/production or similar
```

---

## Running Tests

Once you have the Railway backend URL, run one of the test suites:

### Python Test Runner (Recommended - Cross-platform)
```bash
python3 test_carousel_endpoints.py https://your-railway-url.railway.app
```

Example output:
```
=== SECTION 1: CAROUSEL CREATION (3 tests) ===

✓ POST /api/carousels/create: 201
  → Created carousel: carousel-1722790200123
  Response: {"success": true, "carousel": {...}, "validation": {...}}...

✓ POST /api/carousels/batch-create: 207
  Response: {"total": 1, "succeeded": 1, "failed": 0...}...
```

### Bash Test Runner
```bash
./test-carousel-endpoints.sh https://your-railway-url.railway.app
```

---

## Test Coverage

### 26 Endpoints Tested Across 5 Domains

**Creation (3 tests)**
- `POST /api/carousels/create` — Single creation with validation
- `POST /api/carousels/batch-create` — Batch creation
- `GET /api/carousels/user/:userId` — List user carousels

**Quality Validation (4 tests)**
- `POST /api/carousels/quality/validate` — Validate content
- `POST /api/carousels/quality/batch/validate` — Batch validate
- `GET /api/carousels/quality/:id` — Get quality report
- `POST /api/carousels/quality/:id/approve` — Approve quality

**Metrics & Engagement (6 tests)**
- `POST /api/carousels/:id/events` — Track events
- `GET /api/carousels/:id/metrics` — Current metrics
- `GET /api/carousels/:id/metrics/history` — 30-day history
- `GET /api/carousels/:id/metrics/breakdown` — Event breakdown
- And user-level endpoints

**Analytics (6 tests)**
- `GET /api/analytics/carousel/:id` — Carousel analytics
- `GET /api/analytics/user/:id` — User analytics
- `GET /api/analytics/carousel/:id/timeseries` — Trends
- `GET /api/analytics/carousel/:id/breakdown` — Event breakdown
- `POST /api/analytics/compare` — Compare carousels
- `GET /api/analytics/user/:id/top` — Top performers

**Storage CRUD (5 tests)**
- `GET /api/carousels/:id` — Get carousel
- `PUT /api/carousels/:id` — Update carousel
- `POST /api/carousels/:id/publish` — Publish
- `POST /api/carousels/:id/metrics` — Update metrics
- `DELETE /api/carousels/:id` — Delete (optional)

---

## Expected Results

### Success (All Tests Pass)
```
============================================================
TEST SUMMARY
============================================================
Passed: 26 ✓
Failed: 0 ✗
Total:  26
============================================================

✓ All tests passed! Carousel infrastructure operational.
```

### Partial Success (Some Tests Fail)
- **404 errors**: Carousel not found (expected if no data persisted)
- **201 vs 200**: Both indicate success (creation vs update)
- **Analytics empty**: Normal if no metrics tracked yet

### Failure (Many Tests Fail)
- Check Railway deployment status
- Verify backend URL is correct and responding
- Check Railway logs for build/runtime errors
- Verify database migrations ran (`carousel_storage_schema.sql`, `carousel_metrics_schema.sql`)

---

## Testing Workflow

### 1. Pre-Test Checklist
- [ ] Railway backend URL obtained
- [ ] Backend is responding (test with `curl https://url/health`)
- [ ] Database migrations applied
- [ ] All 8 carousel commits deployed

### 2. Run Tests
- [ ] Execute test runner: `python3 test_carousel_endpoints.py <url>`
- [ ] All 26 tests should pass (or return 404 for missing data)
- [ ] Verify carousel creation logs "Created carousel: carousel-xxxx"
- [ ] Check metrics tracking works (events endpoint responds 200)

### 3. Manual Spot Checks (Optional)
```bash
# Test carousel creation directly
curl -X POST https://your-url/api/carousels/create \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "manual-test",
    "title": "Manual Test Carousel",
    "format": "carousel",
    "slides": [
      {"slideNumber": 1, "headline": "Test", "body": "Content", "cta": "Go"}
    ],
    "platform": "instagram"
  }'

# Test analytics
curl https://your-url/api/analytics/carousel/carousel-xxxx

# Test metrics
curl https://your-url/api/carousels/carousel-xxxx/metrics
```

### 4. Verify Success Criteria
- ✓ Carousel created with score > 75
- ✓ Quality validation rejects bad data
- ✓ Metrics tracked on event
- ✓ Analytics calculated correctly
- ✓ User can list/get carousels
- ✓ Batch operations work with error continuity

---

## Troubleshooting

### "Connection refused" or "No response"
- Railway backend not running
- Check deployment status in Railway dashboard
- Verify URL is correct
- Wait 2-3 minutes for build to complete

### "404 Not Found" on all endpoints
- URL points to frontend (feedia.vercel.app is frontend-only)
- Use actual Railway backend URL
- Test with `curl https://url/api/carousels` first

### "Carousel not found" on analytics
- Normal if this is first test (no existing data)
- Test runner creates carousel and uses its ID
- If ID not captured, manually test with known ID

### Database errors
- Migrations may not have run
- Check Railway logs: `railway logs`
- Or: manually run migrations via psql/sqlite3

### "Invalid carousel structure" validation errors
- Test runner may need carousel structure adjustment
- Check CAROUSEL_INFRASTRUCTURE_COMPLETE.md for schema
- Verify all required fields present

---

## What Each Test Validates

| Test | Validates |
|------|-----------|
| Create carousel | Persistence, validation gate, score calculation |
| Batch create | Batch operations, error continuity, stats |
| List user carousels | Indexing, query by user_id |
| Validate content | 30+ validation rules, error detection |
| Track event | Event persistence, event type handling |
| Get metrics | Aggregation query, daily metrics |
| Get timeseries | 30-day trend data availability |
| Analytics carousel | Performance calculations, trend detection |
| Analytics user | User aggregation, platform distribution |
| Compare carousels | Ranking algorithm, multi-carousel queries |
| Update carousel | PUT operation, metadata updates |
| Publish carousel | Status updates, platform tracking |

---

## Performance Targets

Expected response times (after deployment):
- **Create carousel**: < 150ms (validation + DB write)
- **Get metrics**: < 50ms (indexed query)
- **Analytics**: < 200ms (aggregation queries)
- **List carousels**: < 100ms (limit 50)
- **Batch create**: ~500ms for 10 carousels

---

## Next Steps After Testing

Once all tests pass:

1. **Generate Integration** — Wire generation pipeline to create actual carousels
2. **Frontend Dashboard** — Build metrics visualization UI
3. **Automation** — Auto-post based on optimal times
4. **Optimization** — A/B testing, engagement recommendations

---

## Test Files

- `test_carousel_endpoints.py` — Python test runner (cross-platform, recommended)
- `test-carousel-endpoints.sh` — Bash test runner (Linux/Mac)
- `TEST_CAROUSEL_ENDPOINTS.md` — Manual curl test cases
- `CAROUSEL_INFRASTRUCTURE_COMPLETE.md` — Full API documentation

---

## Questions?

Refer to:
- **CAROUSEL_INFRASTRUCTURE_COMPLETE.md** — API reference
- **TEST_CAROUSEL_ENDPOINTS.md** — Manual test cases
- **GitHub commits** — Implementation details (8 commits)
