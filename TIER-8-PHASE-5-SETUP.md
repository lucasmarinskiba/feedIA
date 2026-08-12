# TIER 8 Phase 5: Real PostgreSQL Setup

## Objective
Enable real PostgreSQL persistence for agency campaigns (currently using mock fallback).

## Prerequisites
- Railway account with PostgreSQL service OR external PostgreSQL database
- ACCESS to Railway project secrets/environment variables

## Steps

### 1. Create PostgreSQL Database

#### Option A: Railway PostgreSQL Service (Recommended)
```bash
# In Railway dashboard:
1. Go to your FeedIA project
2. Click "Create New Service" → Select "PostgreSQL"
3. Wait for service to deploy
4. Go to PostgreSQL service → Variables tab
5. Copy CONNECTION_STRING or DATABASE_URL value
```

#### Option B: External PostgreSQL
- Use Supabase, Render, Neon, or AWS RDS
- Get connection string: `postgresql://user:password@host:port/database`

### 2. Set Environment Variable in Railway

```bash
# In Railway dashboard → FeedIA project → Variables tab:
Add new variable:
  KEY: DATABASE_URL
  VALUE: postgresql://user:password@host:port/database

# Save and redeploy service
```

### 3. Verify Real Database Connection

After Railway redeploys, test:
```bash
curl https://web-production-fa7b5.up.railway.app/api/agency/health
```

Expected response (Phase 5 + real DB):
```json
{
  "status": "healthy",
  "service": "agency-orchestration",
  "version": "TIER 8 Phase 4",
  "metrics": { "..." },
  "database": "real PostgreSQL",
  "timestamp": "..."
}
```

### 4. Create Campaign (Test Persistence)

```bash
curl -X POST https://web-production-fa7b5.up.railway.app/api/agency/campaign/create \
  -H "X-Account-ID: test-phase5" \
  -H "Content-Type: application/json" \
  -d '{
    "brief": "Phase 5 test",
    "targetAudience": "Engineers",
    "goals": ["persistence"]
  }'
```

Response: Campaign with `campaignId` (e.g., `camp_1786499478403_3zchbk`)

### 5. Retrieve Campaign (Verify Persistence)

```bash
curl https://web-production-fa7b5.up.railway.app/api/agency/campaign/camp_1786499478403_3zchbk
```

Expected: Returns campaign data (previously returned 404 on mock)

### 6. List Campaigns (Verify Pagination)

```bash
curl "https://web-production-fa7b5.up.railway.app/api/agency/campaigns?limit=10&offset=0" \
  -H "X-Account-ID: test-phase5"
```

Expected: Returns array with campaign(s) just created

## Code Changes (Phase 5)

**New File:** `src/db/postgres-real.ts`
- Real pg pool with connection pooling
- Fallback to mock pool if DATABASE_URL missing
- Auto-initialization with pool config

**Updated:** `src/agents/agency-persistence.ts`
- Switch from `carouselDB.pool.query()` → `getPool().query()`
- Add database status logging
- No logic changes (same SQL)

**Updated:** `src/api/agency-simple-routes.ts` (ready for Phase 6)
- GET /health endpoint reports db status
- POST endpoints log to console

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "DATABASE_URL not set" | Add to Railway Variables, redeploy |
| "Connection timeout" | Verify connection string, check firewall |
| "Table creation fails" | Ensure database user has CREATE TABLE permission |
| Persistence still not working | Check if real DB actually connected: `curl /api/agency/health` should show "real PostgreSQL" |

## Commit

- Commit: TBD (pending real DB setup)
- Files: postgres-real.ts, agency-persistence.ts (updated), TIER-8-PHASE-5-SETUP.md

## Next Phase

Phase 6: Real LLM Integration
- Set ANTHROPIC_API_KEY in Railway secrets
- Remove mock fallback (or keep for resilience)
- Token tracking + cost metering live
