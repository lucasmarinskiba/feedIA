# FeedIA Database

Production-ready database layer supporting PostgreSQL + SQLite fallback.

## Architecture

- **Production**: PostgreSQL (Railway/Vercel)
- **Development**: SQLite (file-based)
- **Fallback**: In-memory if DB unavailable (graceful degradation)

## Schema

Located in `/db/migrations/`:

- `001-init.sql` - Core tables (users, campaigns, content, analytics, etc.)
- `002-indexes.sql` - Performance indexes (50+ indexes for common queries)

## Tables

### Authentication
- `users` - User accounts
- `user_sessions` - JWT refresh tokens + expiry

### Billing (System 8)
- `user_tiers` - Subscription tiers (free/pro/agency)

### Content (Systems 1, 12)
- `campaigns` - Campaign metadata
- `content` - Individual posts/reels/carousels
- `batch_jobs` - Async job tracking

### Analytics (Systems 3, 11, 13)
- `analytics_events` - View/engagement/conversion events
- `engagement_forecasts` - ML predictions
- `ab_tests` - A/B test results

### Audience (System 2)
- `audience_segments` - User segments + targeting rules

### Compliance (System 8)
- `compliance_checks` - FTC/GDPR/platform rule validations

### Audio Intelligence (System 15)
- `audio_library` - Trending audio tracks + metadata

### Webhooks & Deliveries
- `webhooks` - User webhook subscriptions
- `webhook_deliveries` - Delivery tracking + retries

### Operations
- `api_costs` - LLM/provider usage tracking
- `audit_logs` - User actions for compliance

## Usage

### Initialization

App calls `initDb()` on startup:

```typescript
import { initDb } from './src/db/client.js';

// In server startup
await initDb();
```

This:
1. Connects to PostgreSQL (or falls back to SQLite)
2. Creates `schema_migrations` table
3. Runs pending migrations in order

### Querying

```typescript
import { getUserByEmail, createCampaign, query } from './src/db/client.js';

// Use typed queries
const user = await getUserByEmail('user@example.com');
const campaign = await createCampaign(user.id, 'My Campaign', {
  platform: 'tiktok',
  niche: 'skincare',
});

// Raw queries (when typed query unavailable)
const result = await query(
  'SELECT * FROM campaigns WHERE user_id = $1 LIMIT 10',
  [userId]
);
```

### Transactions

```typescript
import { transaction } from './src/db/client.js';

await transaction(async (client) => {
  // Multiple operations in one transaction
  await client.query('INSERT INTO users...');
  await client.query('INSERT INTO user_tiers...');
  // Auto-rollback if any query fails
});
```

## Indexes

50+ performance indexes on:
- User lookups (email, created_at)
- Campaign queries (user_id, status, platform)
- Content queries (campaign_id, user_id, type, status)
- Analytics aggregations (timestamp, event_type, campaign_id)
- Webhook delivery retries (status, retry_count)
- Cost tracking (provider, created_at)

Run `/db/migrations/002-indexes.sql` manually if missing:

```bash
psql $DATABASE_URL < db/migrations/002-indexes.sql
```

## Migration System

### How it works

1. Migration files in `/db/migrations/` numbered sequentially (001-, 002-, etc.)
2. `schema_migrations` table tracks which have run
3. On app startup, pending migrations execute in order
4. Each migration is idempotent (CREATE TABLE IF NOT EXISTS, etc.)

### Creating a migration

Create file `/db/migrations/003-new-feature.sql`:

```sql
-- Descriptive comment
CREATE TABLE IF NOT EXISTS new_table (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  data JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_new_table_user_id ON new_table(user_id);
```

## Connection Pool

PostgreSQL connection pooling via `pg` library:
- Default pool size: 5 connections
- Configurable via `DATABASE_URL` query parameters

SQLite uses file-based storage:
- Single file: `feedia-data.json`
- No concurrent write safety (fine for dev/fallback)

## Environment Variables

```bash
# PostgreSQL (production)
DATABASE_URL=postgresql://user:password@host:5432/feedia

# Or explicit config
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=xxx
DB_NAME=feedia

# Force provider
DB_PROVIDER=postgres  # or "sqlite" or "auto" (default)
```

## Testing

Test migrations locally:

```bash
# Start PostgreSQL
docker run -e POSTGRES_DB=feedia_test -p 5432:5432 postgres

# Run migrations
npm run db:migrate

# Check status
npm run db:status
```

## Production Considerations

- Backups: Enable Railway/Vercel automated backups
- Migrations: Test locally before deploying
- Connection pooling: Adjust pool size based on traffic
- Indexes: Monitor slow queries with `EXPLAIN ANALYZE`
- Monitoring: Track query performance + error rates

## Troubleshooting

**"Connection refused"**
- Check `DATABASE_URL` is set
- Verify PostgreSQL is running
- Falls back to SQLite automatically

**"Relation does not exist"**
- Migration didn't run
- Check `schema_migrations` table
- Run migrations: `npm run db:migrate`

**"Too many connections"**
- Increase pool size in `DATABASE_URL`
- Or scale Railway/Vercel instance

**Slow queries**
- Check indexes are created (`SELECT * FROM pg_indexes`)
- Run `EXPLAIN ANALYZE <query>` to profile
- Add missing indexes to `002-indexes.sql`
