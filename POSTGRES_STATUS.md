# PostgreSQL Status Check

## Current State

```
❌ PostgreSQL NOT configured in Railway
```

### Details:
- **Web Service:** ✅ Online
- **Postgres DB:** ❌ Does not exist
- **Postgres Service:** ❌ Not found in Railway
- **DATABASE_URL:** ⚠️ Set to MongoDB (old)
- **Migrations:** ❌ Haven't run (waiting for Postgres)
- **Endpoints:** 🔴 Crash when hitting DB (no Postgres)

---

## What's Needed

### Option A: Create via Dashboard (Easiest — 2 min)

1. Go: https://railway.app/project/56f3ba0b-e6e0-4675-9645-e219b3629dab

2. Click: **"New"** button (top right)

3. Click: **"Database"**

4. Click: **"PostgreSQL"**

5. **WAIT** until status = `✅ Online` (~60 seconds)

6. When done, copy this URL exactly:
   - Click: `postgres_production` service
   - Click: **"Connect"** tab
   - Copy: **PostgreSQL connection string**

7. Set the variable:
   ```bash
   railway variable DATABASE_URL "postgresql://user:pass@host:5432/railway"
   ```

8. Deploy:
   ```bash
   railway deploy
   ```

9. Wait: ~30 seconds for `✅ Online`

### Option B: Auto Script (if Postgres exists)

```bash
./auto-postgres-setup.sh
```

---

## Verify It Works

After Postgres is created + DATABASE_URL is set:

```bash
# Test 1: Health
curl https://web-production-fa7b5.up.railway.app/health
# Expected: {"status":"ok",...}

# Test 2: Register user (tests DB write)
curl -X POST https://web-production-fa7b5.up.railway.app/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"Test123"}'
# Expected: {"id":"...", "email":"test@test.com"}

# Test 3: Run verification script
./test-postgres-setup.sh
# Expected: All tests pass ✅
```

---

## Logs (if something breaks)

```bash
# Watch logs in real-time
railway logs --follow

# Look for:
✅ "Connected to PostgreSQL"
✅ "Running migrations..."
✅ "Migration 001-init.sql completed"

# If you see error:
❌ "PostgreSQL connection failed"
→ DATABASE_URL not set or wrong
→ Postgres service not running
```

---

## Status Summary

| Item | Status | Action |
|------|--------|--------|
| Web Service | ✅ Online | None |
| Code (59 endpoints) | ✅ Ready | None |
| Postgres DB | ❌ Missing | Create via Dashboard |
| DATABASE_URL | ⚠️ MongoDB | Replace with Postgres URL |
| Migrations | ⏳ Blocked | Will run after Postgres setup |
| Tiers 5-15 | ✅ Code ready | Will work once DB is live |

---

## Next Steps

1. **Go to Railway dashboard**
2. **New → Database → PostgreSQL**
3. **Wait for Online**
4. **Copy Postgres URL**
5. **Set DATABASE_URL variable**
6. **Deploy**
7. **Run: ./test-postgres-setup.sh**

---

**ETA:** 5 minutes total
