# FeedIA Tier 5-15 Endpoints Test Report

**Date:** 2026-08-22  
**Backend:** web-production-fa7b5.up.railway.app  
**Total Endpoints Tested:** 21  
**Pass Rate:** 27% (6/21)  
**Total Duration:** 14 seconds  

---

## Executive Summary

The Tier 5-15 endpoint test suite reveals **15 failed endpoints** returning `500 Internal Server Error`, primarily affecting database-dependent operations. This is caused by **missing userId extraction middleware** — endpoints expect `userId` on the request object, but it's never populated by the authentication/context middleware.

**Root Cause:** Request context middleware extracts `requestId` and `accountId` from headers but does not extract `userId`. Endpoints attempt to access `(req as unknown as { userId: string }).userId`, which is `undefined`, causing database queries to fail.

---

## Test Results by Category

### ✅ PASSING ENDPOINTS (6/21)

#### Sentiment Analysis (Tier 9)
- ✅ `POST /api/sentiment/analyze` (200 OK) — 928ms
  - Positive sentiment: Returns expected JSON structure
  - Neutral sentiment: Returns same structure
  - **Status:** Working — does NOT depend on userId/database

#### Batch Operations (Tier 12)
- ✅ `POST /api/batch/optimize` (200 OK) — 712ms
  - 7 items optimized to 10 batches (71% savings)
  - 2 items optimized to 5 batches (50% savings)
  - **Status:** Working — pure logic, no database dependency

#### Health Checks (Public)
- ✅ `GET /health` (200 OK)
  - Response includes service name and timestamp
  - **Status:** Working

#### Error Handling
- ✅ `GET /api/nonexistent/endpoint` (404 Not Found)
  - **Status:** Working — properly returns 404 for undefined routes

---

## Failing Endpoints (15/21)

### Tier 5: Trends Detection (0/4 passing)
- ❌ `GET /api/trends/detect?days=7` (500)
- ❌ `GET /api/trends/detect?days=30` (500)
- ❌ `GET /api/trends/audio?platform=tiktok` (500)
- ❌ `GET /api/trends/audio?platform=instagram` (500)
- **Root Cause:** userId undefined, database query fails

### Tier 6: Audience Targeting (0/2 passing)
- ❌ `POST /api/audience/segments` (500)
- ❌ `GET /api/audience/segments` (500)
- **Root Cause:** userId undefined, database INSERT/SELECT fails

### Tier 7: A/B Testing (0/2 passing)
- ❌ `POST /api/abtest/create` (500)
- ❌ `GET /api/abtest/:testId/results` (500)
- **Root Cause:** userId undefined, database operations fail

### Tier 11: ROI Calculation (0/1 passing)
- ❌ `GET /api/roi/calculate` (500)
- **Root Cause:** userId undefined, SUM(cost) query fails

### Tier 14: Cost Tracking (0/4 passing)
- ❌ `POST /api/cost/track` (500) — OpenAI
- ❌ `POST /api/cost/track` (500) — DeepSeek
- ❌ `POST /api/cost/track` (500) — FAL
- ❌ `GET /api/cost/summary` (500)
- **Root Cause:** userId undefined, INSERT/GROUP BY fails

### Other Issues (1/2 passing)
- ❌ `GET /health/ready` (404) — Endpoint not implemented
- ❌ Missing API key returns 500 instead of 401

---

## Critical Issue: Missing userId Extraction

**Severity:** BLOCKER  
**Affected:** 13 endpoints (62% of database-dependent endpoints)

### The Problem

In `tiers5-15-bundled.ts`, all endpoints try to extract userId:

```typescript
const userId = (req as unknown as { userId: string }).userId;
// This is UNDEFINED because it's never set by middleware
```

But the `request-context.ts` middleware only extracts:
```typescript
req.requestId = getOrGenerateRequestId(req);
req.accountId = req.get('X-Account-ID') || null;
// Missing: userId extraction!
```

### The Solution

Update `request-context.ts` middleware to extract userId:

```typescript
export const requestContextMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  req.requestId = getOrGenerateRequestId(req);
  req.accountId = req.get('X-Account-ID') || null;
  req.traceParent = req.get('traceparent') || null;
  
  // ADD: Extract userId from headers
  const userId = req.get('User-ID') || req.accountId || 'default-user';
  (req as unknown as Record<string, unknown>).userId = userId;
  
  res.setHeader('X-Request-ID', req.requestId);
  if (req.accountId) {
    res.setHeader('X-Account-ID', req.accountId);
  }
  
  res.locals.requestId = req.requestId;
  res.locals.accountId = req.accountId;
  
  next();
};
```

---

## Performance Metrics

### Response Times (Successful Endpoints)
| Endpoint | Duration | Notes |
|----------|----------|-------|
| Health | <50ms | Excellent |
| Batch optimize (7 items) | 712ms | Slow for logic-only |
| Batch optimize (2 items) | 1,284ms | Very slow |
| Sentiment analysis | ~950ms | Slow for simple regex |

**Analysis:** Even simple endpoints are slow (700-1000ms). Possible causes:
1. Cold start overhead (Railway ephemeral containers)
2. Missing connection pooling
3. External API latency

---

## Database Schema Requirements

The failing endpoints require these tables to be created:

```sql
-- Audience Segments Table
CREATE TABLE IF NOT EXISTS audience_segments (
  id UUID PRIMARY KEY,
  user_id VARCHAR NOT NULL,
  campaign_id VARCHAR NOT NULL,
  name VARCHAR NOT NULL,
  segment_type VARCHAR,
  rules JSONB,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- A/B Tests Table
CREATE TABLE IF NOT EXISTS ab_tests (
  id UUID PRIMARY KEY,
  campaign_id VARCHAR NOT NULL,
  user_id VARCHAR NOT NULL,
  name VARCHAR NOT NULL,
  variant_a_id VARCHAR NOT NULL,
  variant_b_id VARCHAR NOT NULL,
  status VARCHAR DEFAULT 'running',
  created_at TIMESTAMP
);

-- Analytics Events Table
CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID PRIMARY KEY,
  user_id VARCHAR,
  content_id VARCHAR,
  event_type VARCHAR,
  campaign_id VARCHAR,
  timestamp TIMESTAMP DEFAULT NOW()
);

-- API Costs Table
CREATE TABLE IF NOT EXISTS api_costs (
  id UUID PRIMARY KEY,
  user_id VARCHAR NOT NULL,
  provider VARCHAR NOT NULL,
  operation VARCHAR NOT NULL,
  cost DECIMAL(10, 4),
  metadata JSONB,
  created_at TIMESTAMP
);

-- Audio Library Table (for trends)
CREATE TABLE IF NOT EXISTS audio_library (
  id UUID PRIMARY KEY,
  platform VARCHAR NOT NULL,
  audio_name VARCHAR NOT NULL,
  artist VARCHAR,
  virality_score DECIMAL(5, 2),
  uses INTEGER DEFAULT 0,
  trend_status VARCHAR
);
```

---

## Recommendations

### 🔴 Critical (Unblock All Database Endpoints)
1. **Implement userId extraction in request-context middleware**
   - Extract from X-Account-ID or User-ID header
   - Attach to request before route handlers
   - **Unblocks:** 13 endpoints

2. **Verify PostgreSQL connection**
   - Check DATABASE_URL environment variable
   - Verify all required tables exist
   - Seed test data

3. **Add detailed error logging**
   - Log actual database errors (not generic "failed" message)
   - Include userId, campaignId, and SQL query in logs
   - Use structured logging with request context

### 🟡 High Priority
4. **Implement /health/ready endpoint**
   - Returns 200 when ready for traffic
   - Checks database connection
   - Required for Kubernetes probes

5. **Fix API key validation error handling**
   - Should return 401 (Unauthorized)
   - Currently returns 500 when key is missing

6. **Add request validation**
   - Validate UUID format (campaignId, testId, segmentId)
   - Validate email/domain format
   - Return 400 Bad Request for invalid input

### 🟠 Medium Priority
7. **Improve sentiment analysis**
   - Current: text.length > 100 ? 'positive' : 'neutral'
   - Too simplistic — implement real NLP
   - Options: natural, compromise, sentiment

8. **Enhance A/B test statistics**
   - Add chi-square significance test
   - Add confidence intervals
   - Calculate minimum sample size needed

9. **Add pagination to list endpoints**
   - Example: `?page=1&limit=20`
   - Return total count, current page, has_more

10. **Cache trending data**
    - Redis key: `trends:audio:{platform}:7d`
    - TTL: 1 hour (refresh in background)

---

## Test Execution Details

### Test Suite Specification

**File:** `test-endpoints.sh`  
**Authentication:** X-API-Key + X-Account-ID headers  
**Coverage:** 21 tests across 7 tiers  

### Test Endpoints Covered

1. POST /api/audience/segments
2. GET /api/audience/segments
3. POST /api/abtest/create
4. GET /api/abtest/:testId/results
5. POST /api/sentiment/analyze
6. GET /api/trends/detect
7. GET /api/trends/audio
8. GET /api/roi/calculate
9. POST /api/cost/track
10. GET /api/cost/summary
11. POST /api/batch/optimize
12. GET /health (public)
13. GET /health/ready (public)
14. Missing API key rejection test
15. Invalid endpoint test

### Running the Tests

```bash
#!/bin/bash
# Make script executable
chmod +x test-endpoints.sh

# Run tests
./test-endpoints.sh

# Results saved to /tmp/feedia-test-results-*.txt
cat /tmp/feedia-test-results-*.txt
```

---

## Summary of Findings

| Metric | Value |
|--------|-------|
| Total Tests | 21 |
| Passed | 6 (28.6%) |
| Failed | 15 (71.4%) |
| Blocked by userId issue | 13 (61.9%) |
| Blocked by missing endpoint | 1 (4.8%) |
| Blocked by other issues | 1 (4.8%) |
| Total Duration | 14,008 ms |
| Average per endpoint | 667 ms |

---

## Production Readiness Checklist

- [ ] userId extraction middleware implemented
- [ ] All database tables created and schema verified
- [ ] Database connection tested and pooled
- [ ] All 15 failing endpoints tested and passing
- [ ] Readiness probe (/health/ready) implemented
- [ ] Error logging includes request context
- [ ] Load test run (100+ concurrent requests)
- [ ] Integration tests pass in staging
- [ ] Monitoring/alerting configured
- [ ] Rate limiting tested and working

---

**Report Generated:** 2026-08-22 22:06:35 UTC  
**Next Review:** After implementing fixes
