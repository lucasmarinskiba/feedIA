# Database Query Type Safety Migration Guide

## Problem

Database queries return `unknown[]` from `pool.query()`, causing TypeScript errors throughout the codebase. Estimate: 70+ files with unsafe row typing.

## Solution

Use type-safe wrappers in `src/db/typed-queries.ts` instead of raw pool.query calls.

---

## Quick Start: 3-Step Fix

### Step 1: Import typed helpers

```typescript
import { queryAs, queryOneAs, executeMutation } from '../db/typed-queries.js';
import { UserRow, CarouselRow, etc. } from '../db/typed-queries.js';
```

### Step 2: Replace pool.query with typed wrappers

```typescript
// BEFORE (unsafe)
const result = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
const user = result.rows[0] as Record<string, unknown> | undefined;

// AFTER (type-safe)
const user = await queryOneAs<UserRow>('SELECT * FROM users WHERE id = $1', [userId]);
```

### Step 3: Use proper types in return statements

```typescript
// BEFORE (unsafe)
async getUserData(): Promise<any[]> {
  const result = await pool.query('SELECT * FROM users');
  return result.rows;
}

// AFTER (type-safe)
async getUserData(): Promise<UserRow[]> {
  return queryAs<UserRow>('SELECT * FROM users');
}
```

---

## Available Type-Safe Helpers

### `queryAs<T>(sql, params): Promise<T[]>`

Query multiple rows with type safety.

```typescript
const users = await queryAs<UserRow>('SELECT * FROM users WHERE tier = $1', ['pro']);
// users is UserRow[], no casting needed
```

### `queryOneAs<T>(sql, params): Promise<T | null>`

Query single row, returns null if not found.

```typescript
const user = await queryOneAs<UserRow>('SELECT * FROM users WHERE id = $1', [userId]);
if (!user) throw new Error('User not found');
```

### `executeMutation(sql, params): Promise<number>`

Execute INSERT/UPDATE/DELETE, returns affected row count.

```typescript
const updated = await executeMutation('UPDATE users SET tier = $1 WHERE id = $2', ['pro', userId]);
console.log(`Updated ${updated} rows`);
```

### `countAs(sql, params): Promise<number>`

Count rows safely.

```typescript
const totalUsers = await countAs('SELECT COUNT(*) FROM users WHERE status = $1', ['active']);
```

---

## Pre-Defined Row Types

All common table types are exported from `typed-queries.ts`:

| Type                      | Table                  | Notes                               |
| ------------------------- | ---------------------- | ----------------------------------- |
| `UserRow`                 | users                  | Includes tier, storage, auth fields |
| `CarouselRow`             | carousels              | Slides stored as JSON string        |
| `VideoStorageRow`         | video_storage          | File metadata, processing status    |
| `WebhookRow`              | webhooks               | Stripe, MercadoPago events          |
| `PaymentTokenRow`         | payment_tokens         | Credit card, payment method data    |
| `ContentStorageRow`       | user_generated_content | Posts, images, videos               |
| `AnalyticsEventRow`       | carousel_analytics     | Events: view, share, save, like     |
| `CarouselMetricsDailyRow` | carousel_metrics_daily | Aggregated daily engagement         |
| `SubscriptionRow`         | subscriptions          | Tier, period, payment method        |
| `AuditLogRow`             | audit_logs             | User actions, resource changes      |
| `TwoFactorSessionRow`     | two_factor_sessions    | 2FA secrets, backup codes           |
| `FeedbackRow`             | feedback               | User ratings and comments           |
| `PromptRow`               | prompts                | Template library records            |
| `CampaignRow`             | campaigns              | Instagram campaigns                 |
| `UserGeneratedContentRow` | user_generated_content | Campaign content                    |
| `SocialCredentialRow`     | social_credentials     | OAuth tokens, platform accounts     |

### Custom Types

If your query uses a SELECT with custom columns, define a custom interface:

```typescript
interface CustomStats {
  carousel_id: string;
  total_views: number;
  avg_engagement: number;
}

const stats = await queryAs<CustomStats>(
  'SELECT carousel_id, SUM(views) as total_views, AVG(engagement_rate) as avg_engagement FROM carousel_metrics_daily GROUP BY carousel_id',
);
```

---

## Migration Checklist: Top Files (By Error Count)

### Priority 1: Services (10-14 queries each)

- [ ] `src/services/metrics-aggregation-service.ts` (10 queries) — **DONE**
- [ ] `src/services/video-storage.ts` (9 queries)
- [ ] `src/services/audit-logger.ts` (7 queries)
- [ ] `src/services/2fa-service.ts` (5 queries)
- [ ] `src/services/feedback-service.ts` (3 queries)
- [ ] `src/services/prompt-loader-new.ts` (3 queries)

### Priority 2: API Routes (6-14 queries each)

- [ ] `src/api/content-storage-routes.ts` (12 queries)
- [ ] `src/api/admin-ops-routes.ts` (11 queries)
- [ ] `src/api/user-routes.ts` (9 queries)
- [ ] `src/api/video-storage-routes.ts` (4 queries)
- [ ] `src/api/social-automation-complete.ts` (5 queries)
- [ ] `src/api/social-intelligence-agents.ts` (3 queries)

### Priority 3: Database/Utility (3-5 queries each)

- [ ] `src/db/index.ts` (5 queries)
- [ ] `src/db/feedback-schema.ts` (5 queries)
- [ ] `src/db/auth-queries.ts` (3 queries)
- [ ] `src/db/migration-runner.ts` (4 queries)
- [ ] `src/db/campaign-queries.ts` (Not scanned yet)

### Priority 4: Scripts (14 queries)

- [ ] `src/scripts/seed-production-data.ts` (14 queries)
- [ ] `src/api/seed-endpoint.ts` (6 queries)

---

## Pattern: FROM → TO

### Pattern 1: Simple SELECT

```typescript
// FROM
const result = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
const user = result.rows[0] as Record<string, unknown> | undefined;

// TO
const user = await queryOneAs<UserRow>('SELECT * FROM users WHERE id = $1', [userId]);
```

### Pattern 2: Multiple rows

```typescript
// FROM
const result = await pool.query('SELECT * FROM carousels WHERE user_id = $1', [userId]);
return result.rows as Carousel[];

// TO
return queryAs<CarouselRow>('SELECT * FROM carousels WHERE user_id = $1', [userId]);
```

### Pattern 3: Mutation (INSERT/UPDATE/DELETE)

```typescript
// FROM
await pool.query('UPDATE users SET tier = $1 WHERE id = $2', [tier, userId]);

// TO
await executeMutation('UPDATE users SET tier = $1 WHERE id = $2', [tier, userId]);
```

### Pattern 4: Count

```typescript
// FROM
const result = await pool.query('SELECT COUNT(*) as total FROM users WHERE status = $1', [status]);
const count = parseInt(result.rows[0].total);

// TO
const count = await countAs('SELECT COUNT(*) FROM users WHERE status = $1', [status]);
```

### Pattern 5: Aggregation/Complex SELECT

```typescript
// FROM
const result = await pool.query(
  `
  SELECT carousel_id, SUM(views) as total_views
  FROM carousel_metrics_daily
  GROUP BY carousel_id
  LIMIT $1
`,
  [limit],
);
return result.rows as any[];

// TO
interface CarouselStats {
  carousel_id: string;
  total_views: number;
}
return queryAs<CarouselStats>(
  `
  SELECT carousel_id, SUM(views) as total_views
  FROM carousel_metrics_daily
  GROUP BY carousel_id
  LIMIT $1
`,
  [limit],
);
```

---

## Error Handling

### Unsafe: Uncaught errors propagate

```typescript
const user = await queryOneAs<UserRow>(...);
// Error throws to caller — propagates up
```

### Better: Handle missing data

```typescript
const user = await queryOneAs<UserRow>(...);
if (!user) {
  throw new Error('User not found');
  // or return default
}
```

### Best: Distinguish error types

```typescript
try {
  const user = await queryOneAs<UserRow>(...);
  if (!user) throw new Error('NotFound');
} catch (err) {
  if (err.message === 'NotFound') {
    // handle missing user
  } else {
    // handle database error
    log.error('Database error:', err);
    throw err;
  }
}
```

---

## Testing Your Migration

### Test 1: TypeScript compilation

```bash
npm run lint
```

Should show fewer TypeScript errors.

### Test 2: Query execution

Run your service/route to verify queries still work:

```bash
# Example: fetch user
curl http://localhost:3000/api/users/me
# Should still work, just type-safe now
```

### Test 3: Type safety

Your IDE should now provide autocomplete for row properties:

```typescript
const user = await queryOneAs<UserRow>(...);
user.email;  // ← autocomplete works
user.tier;   // ← autocomplete works
user.unknown; // ← TypeScript error (property doesn't exist)
```

---

## FAQ

**Q: Do I need to define my own interface for every query?**
A: Only if your query returns custom columns. Use pre-defined types for standard table queries.

**Q: What if my query returns a JOIN with columns from multiple tables?**
A: Define a custom interface combining the fields you need:

```typescript
interface CarouselWithUser extends CarouselRow {
  user_email?: string;
  user_name?: string;
}
```

**Q: Can I use queryAs for mutations?**
A: No — use `executeMutation` for INSERT/UPDATE/DELETE. queryAs is for SELECT only.

**Q: What if I forget to import the type wrapper?**
A: TypeScript will error at compile time. The error message will point you to this guide.

**Q: Do I need to update all files at once?**
A: No — migrate in priority order. Each file is independent.

---

## Estimate: Time per File

- Service: 15-30 min (9-14 queries)
- API route: 20-45 min (6-14 queries, more complex parsing)
- Utility: 10-20 min (3-5 queries)

**Total estimate: 8-12 hours for all files** (134 queries ÷ 15 queries/hour = ~9 hours)

## Priority: Aim for 150 total errors

Current: ~70 errors
After top 3 services: ~50 errors
After top 3 API routes: ~25 errors
After remaining: ~0-10 errors (edge cases, custom types)

---

## Contact/Questions

If TypeScript errors remain after migration, check:

1. Typo in interface field names
2. Missing type import (should import from `typed-queries.ts`)
3. Custom interface not matching actual query columns
