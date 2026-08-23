# Tier Monetization & Billing System

Complete Stripe integration, usage-based billing, webhooks, and feature flags for FeedIA's 3-tier system.

## Architecture Overview

```
User Request → Tier Enforcer → Billing Manager → Feature Flags → Response
                    ↓
            Campaign Limits Check
            Usage Budget Check
            Feature Access Check
```

## Components

### 1. **Billing Manager** (`src/services/billing-manager.ts`)

Handles usage tracking, cost attribution, and budget enforcement.

**Key Functions:**

- `trackUsage(userId, service, metadata)` - Track API usage and costs
- `getMonthlyUsage(userId, monthKey)` - Get total usage cost for month
- `getBillingStatus(userId)` - Get current tier, budget, usage, % used
- `canProceed(userId, service)` - Check if user can proceed (budget available)
- `recordBillingTransaction(userId, type, amount, description)` - Record subscription/refund transactions

**Pricing by Tier:**

```javascript
{
  free: { budget: $10/mo, api: $0.001, generation: $0.05, upscale: $0.02, video: $0.15 },
  pro: { budget: $100/mo, api: $0.0005, generation: $0.03, upscale: $0.01, video: $0.1 },
  agency: { budget: $500/mo, api: $0.0002, generation: $0.01, upscale: $0.005, video: $0.05 }
}
```

### 2. **Webhook Service** (`src/services/webhook-service.ts`)

User-managed webhooks for campaign and billing events.

**Key Functions:**

- `registerWebhook(userId, url, events)` - Register webhook subscription
- `getUserWebhooks(userId)` - List user's webhooks
- `emitWebhookEvent(eventType, payload, userIds)` - Fire webhook events
- `processPendingWebhooks(maxAttempts)` - Process & retry failed deliveries

**Webhook Events:**

- `campaign_created` - New campaign started
- `campaign_completed` - Campaign finished
- `roi_calculated` - ROI metrics available
- `payment_succeeded` - Payment processed
- `subscription_updated` - Subscription changed
- `usage_alert` - Budget threshold alert

**Delivery Details:**

- HTTP POST with signature header (`X-Webhook-Signature: HMAC-SHA256`)
- Exponential backoff retry (1s → 2s → 4s → 8s → 16s max 5 min)
- Delivery logs for debugging

### 3. **Feature Flags** (`src/middleware/feature-flags.ts`)

Tier-based feature access control.

**Available Features:**

| Feature | Free | Pro | Agency |
|---------|------|-----|--------|
| `advanced_analytics` | ❌ | ✅ | ✅ |
| `custom_branding` | ❌ | ✅ | ✅ |
| `api_webhooks` | ❌ | ✅ | ✅ |
| `priority_support` | ❌ | ❌ | ✅ |
| `white_label` | ❌ | ❌ | ✅ |
| `bulk_operations` | ❌ | ✅ | ✅ |

**Usage:**

```typescript
// Check feature access
const result = await hasFeatureAccess(userId, 'api_webhooks');
if (!result.allowed) {
  res.status(403).json({ error: result.reason });
  return;
}

// Middleware protection
app.post('/api/advanced-analytics', requireFeature('advanced_analytics'), handler);

// Get user's features
const features = await getUserFeatures(userId);
```

### 4. **Tier Enforcer Middleware** (`src/middleware/tier-enforcer.ts`)

Campaign limit + usage budget validation (enhanced).

**New Function:**

```typescript
// Check both campaign limits AND billing budget
const result = await validateAccessWithBilling(
  userId,
  campaignCount = 1,
  service = 'api_call'
);

if (!result.allowed) {
  return res.status(402).json({
    error: result.reason,
    budgetRemaining: result.billingStatus?.budgetRemaining
  });
}
```

## API Endpoints

### Stripe Checkout

```bash
POST /api/billing/stripe/checkout
Content-Type: application/json

{
  "userId": "user_123",
  "tier": "pro",  // or "agency"
  "email": "user@example.com"
}

Response:
{
  "success": true,
  "sessionId": "cs_...",
  "clientSecret": "pi_...",
  "url": "https://checkout.stripe.com/..."
}
```

### Webhook Subscription

```bash
# Register webhook
POST /api/billing/webhooks/register
{
  "userId": "user_123",
  "url": "https://myapp.com/webhooks/feedia",
  "events": ["campaign_created", "roi_calculated", "payment_succeeded"]
}

# List webhooks
GET /api/billing/webhooks?userId=user_123

# Unregister webhook
DELETE /api/billing/webhooks/:subscriptionId?userId=user_123
```

### Billing Status

```bash
GET /api/billing/status?userId=user_123

Response:
{
  "success": true,
  "status": {
    "tier": "pro",
    "monthlyBudget": 100,
    "monthlyUsage": 37.50,
    "budgetRemaining": 62.50,
    "percentageUsed": 37.5
  }
}
```

### Feature Flags

```bash
# Check single feature
GET /api/features/check?userId=user_123&feature=api_webhooks

# Get all user features
GET /api/features/user?userId=user_123

# List all features
GET /api/features/list

# Get feature details
GET /api/features/details?feature=api_webhooks
```

## Database Schema

### `billing_usage`
Tracks API usage and costs per service type.

```sql
id | user_id | date | service | cost_usd | metadata
```

### `billing_transactions`
Subscription payments, refunds, manual charges.

```sql
id | user_id | transaction_type | amount_usd | description | timestamp
```

### `webhook_subscriptions`
User webhook endpoints and event subscriptions.

```sql
id | user_id | url | events[] | active | secret | created_at
```

### `webhook_events`
Event queue with retry tracking.

```sql
id | subscription_id | event_type | payload | status | attempts | next_retry
```

### `webhook_delivery_logs`
Delivery attempt history for debugging.

```sql
id | event_id | http_status | response_body | error_message | duration_ms
```

## Integration Examples

### 1. Campaign Creation with Billing

```typescript
// Check if user can create campaign
const validation = await validateAccessWithBilling(
  userId,
  1, // 1 campaign
  'content_generation'
);

if (!validation.allowed) {
  return res.status(402).json({
    error: validation.reason,
    budgetRemaining: validation.billingStatus?.budgetRemaining
  });
}

// Create campaign
const campaign = await createCampaign(userId, data);

// Track usage (already checked, safe to consume)
await trackUsage(userId, 'content_generation', { campaignId: campaign.id });

// Fire webhook event
await emitWebhookEvent('campaign_created', {
  campaignId: campaign.id,
  userId,
  tier: userTier
}, [userId]);
```

### 2. Feature-Gated API Access

```typescript
// Protect endpoint with feature flag
app.post('/api/advanced-analytics', requireFeature('advanced_analytics'), async (req, res) => {
  const { userId } = req.body;
  
  // Only reachable if user has advanced_analytics feature
  const analytics = await getAdvancedAnalytics(userId);
  res.json({ success: true, analytics });
});
```

### 3. Handling Stripe Webhooks

```typescript
// Stripe → POST /api/billing/webhook/stripe
// Payload: subscription.created, customer.subscription.updated, customer.subscription.deleted
// Auto-updates user tier in database
// Fires webhook_event: 'subscription_updated' or 'payment_succeeded'
```

### 4. Processing Webhooks

```bash
# Run via cron job (e.g., every 5 minutes)
POST /api/billing/webhooks/process-pending \
  -H "X-Admin-Key: $ADMIN_KEY"

# Processes up to 100 pending events
# Retries failed deliveries with exponential backoff
# Updates event status to 'delivered' or 'failed'
```

## Configuration

### Environment Variables

```bash
# Stripe (optional - falls back to mock mode)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Frontend URL (for Stripe success/cancel redirects)
FRONTEND_URL=https://feedia.vercel.app

# Admin key (for cron jobs)
ADMIN_KEY=your-secret-admin-key
```

### Tier Pricing (Update in `billing-manager.ts`)

Modify `tierBudgets` object to adjust:
- Monthly budget per tier
- Cost per API call
- Cost per content generation
- Cost per image upscale
- Cost per video generation

### Feature Availability (Update in `feature-flags.ts`)

Modify `featureFlags` object to:
- Add new features
- Change tier requirements
- Disable features temporarily

## Monitoring & Operations

### Monthly Reset

Automatically triggered on 1st of month by cron job:

```bash
POST /api/billing/webhooks/process-pending?action=reset-monthly \
  -H "X-Admin-Key: $ADMIN_KEY"
```

### Check Webhook Queue

```bash
# See pending webhooks
SELECT * FROM webhook_events WHERE status = 'pending' ORDER BY next_retry;

# See failed webhooks
SELECT * FROM webhook_events WHERE status = 'failed' ORDER BY updated_at DESC;

# See delivery logs
SELECT * FROM webhook_delivery_logs WHERE http_status NOT IN (200, 204);
```

### Debug User Billing

```bash
# Get user's billing status
GET /api/billing/status?userId=user_123

# Get user's monthly usage
GET /api/billing/monthly-usage?userId=user_123

# Get user's tier
GET /api/billing/tier?userId=user_123

# Get user's features
GET /api/features/user?userId=user_123
```

## Error Codes

| Code | Meaning | Solution |
|------|---------|----------|
| 402 | Budget exceeded | Upgrade tier or wait for monthly reset |
| 403 | Feature not available | Upgrade to required tier |
| 404 | Webhook not found | Create new webhook subscription |
| 500 | Database error | Check logs, retry request |

## Security Considerations

1. **Webhook Signatures**: All webhooks signed with HMAC-SHA256 using user's secret key
2. **Rate Limiting**: API calls rate-limited via Redis (10 reqs/min per user)
3. **Authentication**: Stripe webhooks verified against webhook secret
4. **Data**: Webhook payloads stored as JSONB in database (queryable)
5. **Secrets**: Webhook secrets never logged or displayed after creation

## Testing

### Mock Mode (No Stripe Keys)

```bash
# Stripe checkout returns mock session ID
curl -X POST http://localhost:3000/api/billing/stripe/checkout \
  -H "Content-Type: application/json" \
  -d '{"userId":"test","tier":"pro","email":"test@test.com"}'

# Returns: error "Stripe not configured" (503)
# Falls back to Mercado Pago if configured
```

### Local Testing

```typescript
import { trackUsage, getBillingStatus } from './services/billing-manager';
import { registerWebhook, emitWebhookEvent } from './services/webhook-service';

// Track usage
await trackUsage('user_123', 'api_call');

// Check status
const status = await getBillingStatus('user_123');
console.log(status); // { tier: 'pro', monthlyUsage: 0.001, ... }

// Register webhook
const sub = await registerWebhook(
  'user_123',
  'http://localhost:3001/webhooks',
  ['campaign_created']
);

// Emit event
await emitWebhookEvent('campaign_created', {
  campaignId: 'camp_123',
  status: 'created'
}, ['user_123']);
```

## Roadmap

- [ ] Metered billing (track per-request costs via OpenTelemetry)
- [ ] Usage-based pricing adjustments (volume discounts)
- [ ] Webhook replay interface (UI for failed deliveries)
- [ ] Advanced analytics dashboard (usage trends, cost forecasting)
- [ ] Custom tier creation (white-label support)
- [ ] Payment method management (saved cards, bank transfers)
- [ ] Invoice generation (PDF export)
- [ ] Multi-currency support

---

**Last Updated:** 2026-08-22  
**Status:** ✅ Production Ready
