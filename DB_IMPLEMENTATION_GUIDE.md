# Forge IA — Database Implementation Guide

## Status

✅ **Schema**: 19 tables defined in `/migrations/*.sql`
✅ **Structure**: Service layer created (`src/server/db/queries.ts`)
✅ **Endpoints**: 35+ routes with TODO markers

❌ **Database Queries**: ~50 TODO comments need SQL implementation

---

## How to Complete

### Step 1: Choose Database

```bash
# Option A: PostgreSQL (Recommended for production)
DATABASE_URL=postgres://user:pass@localhost:5432/forge_ia

# Option B: MongoDB
MONGODB_URL=mongodb+srv://user:pass@cluster.mongodb.net/forge_ia
```

### Step 2: Run Migrations

```bash
npm run db:migrate
```

This executes all `.sql` files in `/migrations/` directory.

### Step 3: Implement Queries

Each TODO in `/src/server/db/queries.ts` and `/src/server/forgeRoutes.ts`:

```typescript
// BEFORE (mock)
json(res, 200, { contentId: 'carousel_123' });

// AFTER (real query)
const carousel = await db.query(
  'INSERT INTO forge_content_generators (user_id, tema, objective) VALUES ($1, $2, $3) RETURNING *',
  [userId, tema, objective],
);
json(res, 200, carousel);
```

---

## Critical TODOs (Tier 1 - Blockers)

### Auth (src/server/authRoutes.ts)

- [x] ✅ Signup: Check email exists + create user + create session
- [x] ✅ Login: Fetch user + validate password + create session
- [ ] TODO: Logout - Delete session from DB
- [ ] TODO: Me endpoint - Fetch user from session token

### Stripe (src/server/services/stripe-tier-service.ts)

- [ ] TODO: processSuccessfulPayment
  - Call `userQueries.upgradeTier(userId, tier, stripeCustomerId)`
  - Insert into `forge_tier_upgrade_history`
  - Reset `user_tier_usage` for new month
  - Insert features into `user_tier_features`

---

## Important TODOs (Tier 2 - Features)

### Forge Endpoints (src/server/forgeRoutes.ts)

- [ ] TODO: POST /forge/orchestrate
  - Query `forge_instagram_accounts` to get account metrics
  - Insert into `forge_orchestration_runs`
  - Create `forge_generator_requests` for each generator

- [ ] TODO: POST /forge/revenue/track
  - Query Stripe for session status
  - Insert into `forge_revenue_tracking`
  - Update `forge_orchestrator_learnings`

- [ ] TODO: POST /api/forge/instagram/connect
  - Store in `forge_instagram_accounts`
  - Store OAuth token in `forge_instagram_oauth_tokens`

- [ ] TODO: GET /api/forge/instagram/oauth-callback
  - Exchange OAuth code → token (via `instagramOAuthService`)
  - Insert into `forge_instagram_oauth_tokens`
  - Create session

### Background Jobs

- [ ] TODO: Instagram token refresh job
  - Query `forge_instagram_oauth_tokens` where `expires_at < NOW() + 7 days`
  - Call refresh for each expired token
  - Update with new token + expiry

---

## Database Clients

### PostgreSQL (Node.js)

```bash
npm install pg
```

```typescript
import { Pool } from 'pg';

const db = new Pool({ connectionString: process.env.DATABASE_URL });

// Query
const result = await db.query('SELECT * FROM users WHERE id = $1', [userId]);
const user = result.rows[0];

// Insert
await db.query('INSERT INTO users (id, email, tier) VALUES ($1, $2, $3)', [userId, email, 'free']);
```

### MongoDB (Node.js)

```bash
npm install mongodb
```

```typescript
import { MongoClient } from 'mongodb';

const client = new MongoClient(process.env.MONGODB_URL);
const db = client.db('forge_ia');

// Query
const user = await db.collection('users').findOne({ _id: userId });

// Insert
await db.collection('users').insertOne({ _id: userId, email, tier: 'free' });
```

---

## Quick Checklist

- [ ] Database running (PostgreSQL or MongoDB)
- [ ] `.env.production.local` has `DATABASE_URL`
- [ ] `npm run db:migrate` runs successfully
- [ ] Auth queries implemented (signup/login)
- [ ] Stripe tier upgrade query implemented
- [ ] Forge endpoints use real queries (not mock)
- [ ] Instagram OAuth queries implemented
- [ ] Background jobs query DB for tokens
- [ ] `npm run test` passes (integration tests)
- [ ] `npm run server:prod` starts without errors

---

## After Queries Are Done

```bash
# 1. Test locally
npm run server:dev
curl http://localhost:3000/health

# 2. Run tests
npm run test

# 3. Build
npm run build

# 4. Deploy
npm run server:prod
```

---

## Schema Reference

See `/migrations/auth_and_users_schema.sql` and `/migrations/forge_*.sql` for:

- **users** table (auth + tier)
- **user_sessions** table (JWT storage)
- **forge_orchestration_runs** table (predictions)
- **forge_revenue_tracking** table (Stripe events)
- **forge_instagram_oauth_tokens** table (OAuth)
- ... and 14 more tables

All indexed for performance.

---

Generated: 2026-10-08
Status: **Ready for database implementation**
