# Railway PostgreSQL Setup — Step-by-Step

## Goal
Connect PostgreSQL database to Railway web service so all Tiers 5-15 endpoints work.

---

## Step 1: Create PostgreSQL Database in Railway

1. Go to: https://railway.app/project/56f3ba0b-e6e0-4675-9645-e219b3629dab
2. Click **"New"** button (top right)
3. Select **"Database"** → **"PostgreSQL"**
4. Railway auto-creates `postgres_production` service
5. Wait ~30 seconds for startup

---

## Step 2: Get DATABASE_URL

1. Click on `postgres_production` service card
2. Go to **"Connect"** tab
3. Copy the **PostgreSQL Connection URL** (looks like: `postgresql://user:pass@host:5432/railway`)
4. Save it (you'll need it in Step 3)

---

## Step 3: Set Environment Variable in Railway

1. Go to your **`web`** service (the Express app)
2. Click **"Variables"** tab
3. Click **"New Variable"**
4. Name: `DATABASE_URL`
5. Value: (paste the URL from Step 2)
6. Click **"Add"**

---

## Step 4: Redeploy Web Service

1. Go back to **`web`** service
2. Click **"Deploy"** button (or it auto-redeploys)
3. Wait for status: **"✅ Online"**
4. Check logs: should show `[DB] Connected to PostgreSQL` and migrations running

---

## Step 5: Verify Connection & Migrations

Run these commands locally:

```bash
# Test 1: Check if DB is connected (should return OK)
curl https://web-production-fa7b5.up.railway.app/health

# Test 2: Try auth signup (should return 201, not 500)
curl -X POST https://web-production-fa7b5.up.railway.app/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@user.com","password":"TestPass123"}'

# Expected response: {"id":"...", "email":"test@user.com"}
# If error: {"error":"..."} → DB not connected yet
```

---

## Step 6: Test All Tiers 5-15 Endpoints

```bash
# Tier 5: Trending
curl https://web-production-fa7b5.up.railway.app/api/trends/detect?days=7

# Tier 6: Audience
curl -X POST https://web-production-fa7b5.up.railway.app/api/audience/segments \
  -H "Content-Type: application/json" \
  -d '{"campaignId":"cam1","name":"Tech Enthusiasts","segmentType":"interest","rules":{}}'

# Tier 14: Cost tracking
curl -X POST https://web-production-fa7b5.up.railway.app/api/cost/track \
  -H "Content-Type: application/json" \
  -d '{"provider":"anthropic","operation":"api-call","cost":0.50}'
```

Expected: JSON responses (not HTML 404 errors)

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Logs: `PostgreSQL connection failed` | DATABASE_URL not set or invalid. Copy fresh URL from postgres_production **Connect** tab |
| Logs: `ECONNREFUSED` | Postgres service not running. Check postgres_production status in Railway |
| Endpoint returns HTML 404 | No DATABASE_URL or wrong value. Check **web** service Variables |
| Migrations fail | Invalid SQL. Check `/db/migrations/001-init.sql` syntax (or run locally: `psql $DATABASE_URL < db/migrations/001-init.sql`) |

---

## What Happens After Setup

1. **Auto on app startup:**
   - DB connection pooling (max 10 connections)
   - Run pending migrations (idempotent)
   - Create 18 tables if not exist

2. **Endpoints now live:**
   - Auth: `/api/auth/{register, login, refresh, logout}`
   - Tiers 5-15: `/api/{trends, audience, abtest, roi, cost, sentiment, batch}/*`
   - Analytics: `/api/analytics/{events, summary, campaigns/:id}`
   - Billing: `/api/billing/*`

3. **Data persisted:**
   - Users, campaigns, content, analytics events all in PostgreSQL
   - No more "error" responses from DB queries

---

## Next: Redis (Cache & Rate Limiting)

After Postgres works, add Redis for:
- Session token cache (10x faster auth)
- Rate limiter (prevent abuse)
- Real-time leaderboards

→ See: `RAILWAY_REDIS_SETUP.md` (coming next)

---

## Questions?

- Railway docs: https://docs.railway.app/guides/postgresql
- Project: https://railway.app/project/56f3ba0b-e6e0-4675-9645-e219b3629dab
