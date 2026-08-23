# FeedIA Tier 5-15 Endpoints — Fix Guide

**Status:** 15 endpoints failing (71% failure rate)  
**Root Cause:** Missing userId extraction + potential database connectivity  
**Effort:** 2-4 hours to fix and test  

---

## Issue #1: Missing userId Extraction (BLOCKER)

### Impact
- **Affects:** 13 endpoints (61% of failures)
- **Severity:** CRITICAL
- **Blocks:** All database operations in Tiers 5-15

### Root Cause Analysis

Current code flow:

```typescript
// In tiers5-15-bundled.ts (line 9)
export const createAudienceSegment = async (req: Request, res: Response): Promise<void> => {
  const userId = (req as unknown as { userId: string }).userId;  // <- UNDEFINED
  // ...
  await query(
    `INSERT INTO audience_segments (id, user_id, ...)
     VALUES ($1, $2, ...);`,
    [segmentId, userId, ...]  // <- userId is undefined = SQL error
  );
};
```

**Why userId is undefined:**
1. Request arrives with X-Account-ID header: `X-Account-ID: test-account-123`
2. requestContextMiddleware extracts only: `accountId` (from X-Account-ID)
3. **Missing:** userId is never attached to request object
4. Endpoint tries to access `req.userId` → undefined → database error

### The Fix

**File:** `src/middleware/request-context.ts`

**Change:**
```typescript
export const requestContextMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  // Extract IDs from headers
  req.requestId = getOrGenerateRequestId(req);
  req.accountId = req.get('X-Account-ID') || null;
  req.traceParent = req.get('traceparent') || null;
  
  // ADD THIS BLOCK: Extract userId
  const userId = req.get('User-ID') || req.accountId || `user-${Date.now()}`;
  (req as unknown as Record<string, unknown>).userId = userId;
  
  // Propagate request ID in response headers
  res.setHeader('X-Request-ID', req.requestId);
  if (req.accountId) {
    res.setHeader('X-Account-ID', req.accountId);
  }
  
  // Add to response locals for logging/metrics
  res.locals.requestId = req.requestId;
  res.locals.accountId = req.accountId;
  res.locals.userId = userId;  // ADD THIS
  
  next();
};
```

**Also update Express type declarations:**
```typescript
declare global {
  namespace Express {
    interface Request {
      requestId: string;
      accountId: string | null;
      traceParent: string | null;
      userId?: string;  // ADD THIS
    }
  }
}
```

**How to test the fix:**
```bash
# Before fix: returns 500
curl -X POST https://web-production-fa7b5.up.railway.app/api/audience/segments \
  -H "X-API-Key: sk_prod_test" \
  -H "X-Account-ID: account-123" \
  -H "User-ID: user-123" \
  -H "Content-Type: application/json" \
  -d '{"campaignId":"camp-1","name":"Test","segmentType":"demo","rules":{}}'

# After fix: returns 201
# Response: {"id":"...","name":"Test","segmentType":"demo"}
```

---

## Issue #2: Database Schema Missing

### Impact
- **Affects:** Tier 5, 6, 7, 11, 14 endpoints
- **Severity:** HIGH
- **Symptom:** Even with userId fix, queries still fail if tables don't exist

### Check Database Status

```bash
# Connect to Railway PostgreSQL
psql $DATABASE_URL

# List tables
\dt

# Check if required tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema='public' 
ORDER BY table_name;
```

### Required Tables

Create all tables if missing:

```sql
-- 1. Audience Segments Table (Tier 6)
CREATE TABLE IF NOT EXISTS audience_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL,
  campaign_id VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  segment_type VARCHAR(50),
  rules JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  INDEX idx_user_campaign (user_id, campaign_id)
);

-- 2. A/B Tests Table (Tier 7)
CREATE TABLE IF NOT EXISTS ab_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id VARCHAR(255) NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  variant_a_id VARCHAR(255) NOT NULL,
  variant_b_id VARCHAR(255) NOT NULL,
  status VARCHAR(50) DEFAULT 'running',
  created_at TIMESTAMP DEFAULT NOW(),
  INDEX idx_user_campaign (user_id, campaign_id)
);

-- 3. Analytics Events Table (Used by Trend, ROI, A/B)
CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255),
  content_id VARCHAR(255),
  event_type VARCHAR(50),
  campaign_id VARCHAR(255),
  metadata JSONB DEFAULT '{}',
  timestamp TIMESTAMP DEFAULT NOW(),
  INDEX idx_user_timestamp (user_id, timestamp),
  INDEX idx_event_type (event_type)
);

-- 4. API Costs Table (Tier 14)
CREATE TABLE IF NOT EXISTS api_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL,
  provider VARCHAR(100) NOT NULL,
  operation VARCHAR(255) NOT NULL,
  cost DECIMAL(10, 4) NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  INDEX idx_user_provider (user_id, provider)
);

-- 5. Audio Library Table (Tier 5: Trends)
CREATE TABLE IF NOT EXISTS audio_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform VARCHAR(50) NOT NULL,
  audio_name VARCHAR(255) NOT NULL,
  artist VARCHAR(255),
  virality_score DECIMAL(5, 2) DEFAULT 0.0,
  uses INTEGER DEFAULT 0,
  trend_status VARCHAR(50) DEFAULT 'emerging',
  updated_at TIMESTAMP DEFAULT NOW(),
  INDEX idx_platform_virality (platform, virality_score DESC)
);

-- 6. Create indexes for performance
CREATE INDEX idx_segments_user ON audience_segments(user_id);
CREATE INDEX idx_abtest_user ON ab_tests(user_id);
CREATE INDEX idx_events_user ON analytics_events(user_id, timestamp);
CREATE INDEX idx_costs_user ON api_costs(user_id, created_at);
```

### Seed Test Data

```sql
-- Insert test data for trending audio
INSERT INTO audio_library (platform, audio_name, artist, virality_score, uses, trend_status)
VALUES 
  ('tiktok', 'Boom Clap', 'Charli XCX', 95.5, 2500, 'trending'),
  ('tiktok', 'Blinding Lights', 'The Weeknd', 92.3, 2100, 'trending'),
  ('tiktok', 'Levitating', 'Dua Lipa', 89.1, 1850, 'hot'),
  ('instagram', 'Good 4 U', 'Olivia Rodrigo', 88.5, 1750, 'trending'),
  ('instagram', 'As It Was', 'Harry Styles', 87.2, 1620, 'hot');

-- Insert test analytics events
INSERT INTO analytics_events (user_id, content_id, event_type, campaign_id)
VALUES 
  ('user-123', 'content-1', 'view', 'campaign-1'),
  ('user-123', 'content-1', 'like', 'campaign-1'),
  ('user-123', 'content-1', 'conversion', 'campaign-1');
```

---

## Issue #3: Readiness Probe Missing

### Impact
- **Affects:** Kubernetes health checks, deployment monitoring
- **Severity:** HIGH (blocks zero-downtime deployments)
- **Endpoint:** `GET /health/ready`

### Fix

**File:** `src/api/health-check-routes.ts`

```typescript
export const healthCheckRoutes = Router();

// Existing: liveness probe
healthCheckRoutes.get('/', (req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'feedIA-server', timestamp: new Date().toISOString() });
});

// ADD: readiness probe
healthCheckRoutes.get('/ready', async (req: Request, res: Response) => {
  try {
    // Check database connectivity
    const dbResult = await query('SELECT 1');
    if (!dbResult) throw new Error('Database check failed');
    
    // Check Redis connectivity (if using cache)
    // const cacheOk = await redis.ping();
    
    res.json({
      status: 'ready',
      timestamp: new Date().toISOString(),
      checks: {
        database: 'ok',
        // cache: cacheOk ? 'ok' : 'degraded'
      }
    });
  } catch (err) {
    res.status(503).json({
      status: 'not_ready',
      error: String(err),
      timestamp: new Date().toISOString()
    });
  }
});
```

---

## Issue #4: Improve Error Messages

### Current (Generic)
```json
{"error":"Segment creation failed"}
```

### Improved (Helps Debugging)
```json
{
  "error": "Segment creation failed",
  "code": "SEGMENT_CREATE_ERROR",
  "details": {
    "userId": "user-123",
    "campaignId": "camp-1",
    "dbError": "23505: duplicate key value violates unique constraint",
    "timestamp": "2026-08-22T22:10:00.000Z"
  }
}
```

### Fix

Update all endpoints in `tiers5-15-bundled.ts`:

```typescript
export const createAudienceSegment = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as unknown as { userId: string }).userId;
    if (!userId) {
      res.status(400).json({ 
        error: 'Missing userId',
        code: 'MISSING_USER_ID'
      });
      return;
    }
    
    const { campaignId, name, segmentType, rules } = req.body as { 
      campaignId: string; 
      name: string; 
      segmentType: string; 
      rules: unknown 
    };
    
    if (!campaignId || !name) {
      res.status(400).json({
        error: 'Missing required fields',
        code: 'INVALID_INPUT',
        required: ['campaignId', 'name']
      });
      return;
    }

    const segmentId = crypto.randomUUID();
    await query(
      `INSERT INTO audience_segments (id, user_id, campaign_id, name, segment_type, rules, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())`,
      [segmentId, userId, campaignId, name, segmentType, JSON.stringify(rules)]
    );

    res.status(201).json({ id: segmentId, name, segmentType });
  } catch (err) {
    console.error('[segments] Creation error:', err);
    res.status(500).json({ 
      error: 'Segment creation failed',
      code: 'SEGMENT_CREATE_ERROR',
      details: {
        message: (err as Error).message,
        timestamp: new Date().toISOString()
      }
    });
  }
};
```

---

## Step-by-Step Fix Implementation

### Step 1: Extract userId (30 min)
1. Open `src/middleware/request-context.ts`
2. Add userId extraction code (shown above)
3. Update Express type declarations
4. Commit: `fix: add userId extraction to request context`

### Step 2: Verify Database (30 min)
1. Connect to Railway PostgreSQL: `psql $DATABASE_URL`
2. Check existing tables: `\dt`
3. Run CREATE TABLE statements (provided above)
4. Seed test data
5. Verify: `SELECT COUNT(*) FROM audio_library;`

### Step 3: Add Readiness Probe (15 min)
1. Open `src/api/health-check-routes.ts`
2. Add `/health/ready` endpoint
3. Test: `curl https://web-production-fa7b5.up.railway.app/health/ready`

### Step 4: Improve Error Handling (45 min)
1. Update all 13 database-dependent endpoints
2. Add input validation
3. Add detailed error messages
4. Add logging with request context

### Step 5: Re-run Tests (15 min)
1. Run test suite: `bash test-endpoints.sh`
2. Verify: 20/21 tests passing (95%+)
3. Log results for documentation

---

## Testing the Fixes

### Test 1: userId Extraction
```bash
curl -X GET \
  -H "X-API-Key: sk_prod_test" \
  -H "X-Account-ID: account-123" \
  -H "User-ID: user-456" \
  "https://web-production-fa7b5.up.railway.app/api/trends/detect?days=7"

# Expected: 200 OK with trends data (not 500 error)
```

### Test 2: Database Schema
```bash
curl -X POST \
  -H "X-API-Key: sk_prod_test" \
  -H "X-Account-ID: account-123" \
  -H "User-ID: user-456" \
  -H "Content-Type: application/json" \
  -d '{
    "campaignId": "campaign-test",
    "name": "VIP Users",
    "segmentType": "demographic",
    "rules": {"age": {"min": 25, "max": 45}}
  }' \
  "https://web-production-fa7b5.up.railway.app/api/audience/segments"

# Expected: 201 Created with segment ID
```

### Test 3: Readiness Probe
```bash
curl -s https://web-production-fa7b5.up.railway.app/health/ready | jq .

# Expected: {"status":"ready","checks":{"database":"ok"},...}
```

---

## Expected Results After Fixes

| Endpoint | Current | Expected | Status |
|----------|---------|----------|--------|
| POST /api/audience/segments | 500 | 201 | 🔄 Will fix |
| GET /api/audience/segments | 500 | 200 | 🔄 Will fix |
| POST /api/abtest/create | 500 | 201 | 🔄 Will fix |
| GET /api/abtest/:testId/results | 500 | 200 | 🔄 Will fix |
| GET /api/trends/detect | 500 | 200 | 🔄 Will fix |
| GET /api/trends/audio | 500 | 200 | 🔄 Will fix |
| GET /api/roi/calculate | 500 | 200 | 🔄 Will fix |
| POST /api/cost/track | 500 | 201 | 🔄 Will fix |
| GET /api/cost/summary | 500 | 200 | 🔄 Will fix |
| POST /api/sentiment/analyze | 200 | 200 | ✅ Already works |
| POST /api/batch/optimize | 200 | 200 | ✅ Already works |
| GET /health | 200 | 200 | ✅ Already works |
| GET /health/ready | 404 | 200 | 🔄 Will fix |

**Final Expected Results:** 20/21 passing (95%)

---

## Post-Fix Verification Checklist

- [ ] All database tables created and verified
- [ ] userId extracted and available in all endpoints
- [ ] Readiness probe implemented and responding 200
- [ ] Error messages include request context and error details
- [ ] All 13 database-dependent endpoints return 200/201
- [ ] Test suite runs and shows 20/21 passing
- [ ] No 500 errors on valid requests
- [ ] Logs show structured error information
- [ ] Performance acceptable (<1s for database queries)
- [ ] Production deployment ready

---

## Files to Modify

1. `src/middleware/request-context.ts` — Add userId extraction
2. `src/api/health-check-routes.ts` — Add readiness probe
3. `src/api/tiers5-15-bundled.ts` — Improve error handling (13 endpoints)
4. `src/database/auto-migrations.ts` — Create missing tables (if using migrations)

---

## Deployment Instructions

```bash
# 1. Test locally
npm run lint
npm run test

# 2. Create feature branch
git checkout -b fix/tier-5-15-endpoints

# 3. Make changes and commit
git add -A
git commit -m "fix: add userId extraction, readiness probe, improve error handling"

# 4. Push and create PR
git push origin fix/tier-5-15-endpoints

# 5. Deploy to staging
# (automatic via CI/CD)

# 6. Test in staging
bash test-endpoints.sh

# 7. Deploy to production
# (automatic on merge to main)

# 8. Verify in production
curl https://web-production-fa7b5.up.railway.app/health/ready
```

---

**Document Version:** 1.0  
**Last Updated:** 2026-08-22  
**Status:** Ready for implementation
