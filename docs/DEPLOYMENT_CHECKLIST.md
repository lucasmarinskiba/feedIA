# Tier Monetization Deployment Checklist

Step-by-step guide to deploy Stripe billing, usage-based costs, webhooks, and feature flags.

## Pre-Deployment (Development)

- [x] **Billing Manager** (`src/services/billing-manager.ts`)
  - Tracks usage by service type (api_call, content_generation, image_upscale, video_generation)
  - Enforces monthly budget per tier
  - Returns cost and budget checks
  
- [x] **Webhook Service** (`src/services/webhook-service.ts`)
  - User webhook subscriptions with HMAC signing
  - Event queue with exponential backoff retry
  - Delivery logging for debugging

- [x] **Feature Flags** (`src/middleware/feature-flags.ts`)
  - Tier-based feature access (6 features)
  - Middleware protection for endpoints
  - Per-user feature list retrieval

- [x] **Tier Enforcer Enhancement** (`src/middleware/tier-enforcer.ts`)
  - Added billing budget check alongside campaign limits
  - Combined validation: `validateAccessWithBilling()`

- [x] **API Routes**
  - `/api/billing/*` - Stripe, usage tracking, webhooks
  - `/api/features/*` - Feature flag queries

- [x] **Database Migration** (`db/migrations/003-billing-webhooks.sql`)
  - `billing_usage` - Usage tracking per service
  - `billing_transactions` - Payment/refund history
  - `webhook_subscriptions` - User webhook endpoints
  - `webhook_events` - Event queue
  - `webhook_delivery_logs` - Delivery history

## Pre-Deployment (Local Testing)

### 1. Test Imports & Compilation

```bash
cd /c/Users/Usuario/Pictures/"Somos paithon labs"/"Agente IA - Especialista Instagram"
npm run typecheck  # Verify TypeScript
npm run lint       # Check ESLint
```

### 2. Test Billing Manager

```typescript
// In a test file or REPL
import { 
  trackUsage, 
  getBillingStatus, 
  canProceed 
} from './src/services/billing-manager';
import { getUserTier, upsertUserTier } from './src/db/user-tiers';

// Setup
await upsertUserTier('test_user_1', 'test@example.com', 'pro');

// Track usage
const result = await trackUsage('test_user_1', 'api_call');
console.log('Tracked:', result); // { success: true, cost: 0.0005 }

// Check budget
const status = await getBillingStatus('test_user_1');
console.log('Status:', status); // { tier: 'pro', monthlyUsage: 0.0005, ... }

// Can proceed?
const canProc = await canProceed('test_user_1', 'api_call');
console.log('Can proceed:', canProc); // { allowed: true, budgetRemaining: 99.9995 }
```

### 3. Test Webhook Service

```typescript
import {
  registerWebhook,
  getUserWebhooks,
  emitWebhookEvent,
  processPendingWebhooks
} from './src/services/webhook-service';

// Register webhook
const sub = await registerWebhook(
  'test_user_1',
  'http://localhost:3001/webhooks',
  ['campaign_created', 'roi_calculated']
);
console.log('Webhook ID:', sub.id);

// List user's webhooks
const webhooks = await getUserWebhooks('test_user_1');
console.log('Webhooks:', webhooks);

// Emit event
await emitWebhookEvent('campaign_created', {
  campaignId: 'camp_test_123',
  timestamp: new Date()
}, ['test_user_1']);

// Process pending (local webhook receiver required)
const processed = await processPendingWebhooks();
console.log('Processed:', processed); // count of delivered events
```

### 4. Test Feature Flags

```typescript
import {
  hasFeatureAccess,
  getUserFeatures,
  listAllFeatures
} from './src/middleware/feature-flags';

// Check feature for free tier user
let result = await hasFeatureAccess('test_user_free', 'api_webhooks');
console.log('Free tier:', result); // { allowed: false, reason: "..." }

// Check feature for pro tier
result = await hasFeatureAccess('test_user_1', 'api_webhooks');
console.log('Pro tier:', result); // { allowed: true }

// Get all features
const features = await getUserFeatures('test_user_1');
console.log('Pro features:', features); // ['advanced_analytics', 'api_webhooks', 'custom_branding', 'bulk_operations']

// List all available
const all = listAllFeatures();
console.log('All features:', all.length); // 6
```

### 5. Test Tier Enforcer Integration

```typescript
import { validateAccessWithBilling } from './src/middleware/tier-enforcer';

// Over budget
const overBudget = await validateAccessWithBilling(
  'test_user_1',
  1,
  'video_generation' // expensive operation ($0.1 for pro)
);

console.log('Budget check:', overBudget);
// { allowed: true/false, budgetRemaining: XX, reason?: "..." }
```

## Deployment Steps (Railway/Production)

### 1. Environment Setup

```bash
# Set in Railway environment variables:
STRIPE_SECRET_KEY=sk_live_YOUR_KEY
STRIPE_WEBHOOK_SECRET=whsec_YOUR_SECRET
FRONTEND_URL=https://feedia.vercel.app
ADMIN_KEY=$(openssl rand -hex 32)  # Generate random key
```

### 2. Database Migration

Migration runs automatically on app startup via `runMigrationsIfNeeded()`.

Verify migration:
```sql
SELECT name FROM schema_migrations WHERE name LIKE '%billing%';
```

### 3. Deploy Code

```bash
git add -A
git commit -m "feat: add Tier monetization (Stripe, usage billing, webhooks, features)"
git push origin main
# Railway auto-deploys
```

### 4. Verify Deployment

```bash
# Check tables exist
curl https://your-api.railroad.app/api/health
# Should show: database connected

# Check feature flags endpoint
curl https://your-api.railroad.app/api/features/list
# Should show: 6 features

# Check billing status (requires valid userId)
curl https://your-api.railroad.app/api/billing/status?userId=test_user_1
# Should show: billing status
```

### 5. Stripe Webhook Configuration

In Stripe Dashboard:

1. Go to **Developers** → **Webhooks**
2. Click **Add endpoint**
3. URL: `https://your-api.railroad.app/api/billing/webhook/stripe`
4. Events to listen:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Copy webhook secret → `STRIPE_WEBHOOK_SECRET` in Railway

### 6. Test Stripe Integration

```bash
# Create test checkout session
curl -X POST https://your-api.railroad.app/api/billing/stripe/checkout \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test_user_1",
    "tier": "pro",
    "email": "test@example.com"
  }'

# Response should include Stripe checkout URL
```

### 7. Set Up Cron Job for Webhook Processing

Configure in Railway or external cron service:

```bash
# Every 5 minutes, process pending webhooks
*/5 * * * * curl -X POST https://your-api.railroad.app/api/billing/webhooks/process-pending \
  -H "X-Admin-Key: $ADMIN_KEY" \
  -H "Content-Type: application/json"
```

### 8. Monitor and Alert

Set up monitoring for:

```sql
-- Pending webhooks (should be processed within 5 min)
SELECT COUNT(*) FROM webhook_events WHERE status = 'pending';

-- Failed webhooks (should be investigated)
SELECT COUNT(*) FROM webhook_events WHERE status = 'failed';

-- Over-budget users (may indicate abuse or high usage)
SELECT user_id, SUM(cost_usd) as total_cost FROM billing_usage
WHERE date >= NOW() - INTERVAL '1 month'
GROUP BY user_id
HAVING SUM(cost_usd) > 100;
```

## Post-Deployment Verification

### 1. Smoke Tests

```bash
# Feature flags
curl https://your-api.railroad.app/api/features/list

# Billing status
curl "https://your-api.railroad.app/api/billing/status?userId=test_user"

# Stripe checkout (should work if keys configured)
curl -X POST https://your-api.railroad.app/api/billing/stripe/checkout \
  -H "Content-Type: application/json" \
  -d '{"userId":"test","tier":"pro","email":"test@test.com"}'

# Webhook registration (should require pro tier)
curl -X POST https://your-api.railroad.app/api/billing/webhooks/register \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "free_tier_user",
    "url": "https://example.com/webhooks",
    "events": ["campaign_created"]
  }'
# Should return 403 Forbidden
```

### 2. End-to-End Flow

1. Create free tier user: `POST /api/billing/save-tier`
2. Verify tier: `GET /api/billing/tier?userId=new_user`
3. Check features: `GET /api/features/user?userId=new_user` → should show `[]`
4. Attempt webhook register: `POST /api/billing/webhooks/register` → should get 403
5. Track usage: `POST /api/billing/track-usage`
6. Upgrade to pro via Stripe
7. Verify tier updated: `GET /api/billing/tier?userId=new_user` → should show 'pro'
8. Check features: `GET /api/features/user?userId=new_user` → should show `['api_webhooks', 'custom_branding', ...]`
9. Register webhook: `POST /api/billing/webhooks/register` → should succeed

## Rollback Plan

If issues arise:

### Option 1: Disable New Features (Quick)
```bash
# In feature-flags.ts, clear all tiers:
const featureFlags = {}; // Disable all features

# Redeploy
```

### Option 2: Revert Database Tables
```sql
-- Drop billing tables if corrupted
DROP TABLE IF EXISTS webhook_delivery_logs;
DROP TABLE IF EXISTS webhook_events;
DROP TABLE IF EXISTS webhook_subscriptions;
DROP TABLE IF EXISTS billing_monthly_summary;
DROP TABLE IF EXISTS billing_transactions;
DROP TABLE IF EXISTS billing_usage;

-- Re-run migration 003
```

### Option 3: Full Revert
```bash
git revert <commit-hash>
git push origin main
# Railway auto-deploys previous version
```

## Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| "Stripe not configured" | Missing keys | Set `STRIPE_SECRET_KEY` in Railway |
| Webhooks not delivered | Wrong URL | Verify user webhook URL is HTTPS + accessible |
| Budget check failing | DB not migrated | Run `npm run db:migrate` or restart app |
| Feature flags not working | Tier not found | Ensure user exists in `user_tiers` table |
| 402 Payment Required | Budget exhausted | User needs tier upgrade or monthly reset |

## Performance Considerations

- **Usage tracking**: ~1ms per call (INSERT to `billing_usage`)
- **Budget check**: ~5ms per request (SELECT + SUM calculation)
- **Feature flags**: ~2ms per request (cached in-process)
- **Webhook processing**: Async background job (doesn't block requests)

For high-volume, consider:
1. Cache billing status in Redis (5-min TTL)
2. Batch usage writes (queue then flush per minute)
3. Pre-calculate monthly budgets on cron

## Security Checklist

- [x] Stripe webhooks signed + verified
- [x] Admin endpoints require `X-Admin-Key`
- [x] Webhook secrets never logged
- [x] Budget checks prevent overspend
- [x] Feature flags prevent unauthorized access
- [x] Rate limiting on billing endpoints
- [x] Input sanitization on webhook URLs

## Success Criteria

After deployment:

1. ✅ Stripe checkout creates sessions
2. ✅ Stripe webhooks update user tier
3. ✅ Usage tracked to `billing_usage` table
4. ✅ Budget enforced (402 when exhausted)
5. ✅ Feature flags return correct access
6. ✅ Webhooks registered only for pro+ tiers
7. ✅ Webhook events queued and delivered
8. ✅ Webhook retries work (exponential backoff)
9. ✅ Monthly reset clears usage
10. ✅ No production errors in logs

---

**Timeline:** ~2 hours deployment + verification  
**Risk Level:** Low (feature-flagged, backward-compatible)  
**Rollback Time:** ~5 minutes
