# Quick Start: Tier Monetization

5-minute integration guide for developers.

## What Was Added

```
src/
├── services/
│   ├── billing-manager.ts       ← Usage tracking & budgets
│   └── webhook-service.ts       ← User webhooks & events
├── middleware/
│   ├── feature-flags.ts         ← Tier-based access control
│   └── tier-enforcer.ts         ← UPDATED: +billing checks
├── api/
│   ├── billing-routes.ts        ← UPDATED: +Stripe, usage, webhooks
│   └── feature-flags-routes.ts  ← Feature flag API endpoints

db/migrations/
└── 003-billing-webhooks.sql     ← Database tables

docs/
├── TIER_MONETIZATION.md         ← Full documentation
├── DEPLOYMENT_CHECKLIST.md      ← Production deployment
└── QUICK_START_BILLING.md       ← This file
```

## 3 Tiers

```
FREE      PRO       AGENCY
$0        $79/mo    $499/mo
├─────────────────────────────────
5 campaigns/mo
50 campaigns/mo
500 campaigns/mo
├─────────────────────────────────
Basic analytics
Advanced analytics ✓
Advanced analytics ✓
├─────────────────────────────────
Community support
Email support ✓
24h priority ✓
├─────────────────────────────────
No webhooks
API webhooks ✓
API webhooks ✓
├─────────────────────────────────
No custom branding
Custom branding ✓
Custom branding + white-label ✓
```

## Usage-Based Billing

Users get a monthly budget based on tier:

```
FREE:   $10/month
PRO:    $100/month
AGENCY: $500/month
```

Costs per service:

```
         API Call  Generation  Image   Video
FREE:    $0.001   $0.05        $0.02   $0.15
PRO:     $0.0005  $0.03        $0.01   $0.10
AGENCY:  $0.0002  $0.01        $0.005  $0.05
```

## Common Operations

### Check User's Billing Status

```typescript
import { getBillingStatus } from './src/services/billing-manager';

const status = await getBillingStatus('user_123');
// {
//   tier: 'pro',
//   monthlyBudget: 100,
//   monthlyUsage: 37.50,
//   budgetRemaining: 62.50,
//   percentageUsed: 37.5
// }
```

### Track API Usage

```typescript
import { trackUsage } from './src/services/billing-manager';

const result = await trackUsage('user_123', 'api_call', {
  endpoint: '/api/generate',
  campaignId: 'camp_123'
});

// result.success = true/false
// result.cost = actual cost in USD
// result.error = reason if failed
```

### Protect an Endpoint with Feature Flags

```typescript
import { requireFeature } from './src/middleware/feature-flags';

app.post('/api/analytics/advanced', requireFeature('advanced_analytics'), async (req, res) => {
  // Only pro+ tier reaches here
  const userId = req.body.userId;
  const analytics = await getAdvancedAnalytics(userId);
  res.json({ success: true, analytics });
});
```

### Register Webhook

```typescript
import { registerWebhook } from './src/services/webhook-service';

const subscription = await registerWebhook(
  'user_123',
  'https://myapp.com/webhooks/feedia',
  ['campaign_created', 'roi_calculated', 'payment_succeeded']
);

console.log('Webhook Secret:', subscription.secret); // Save this!
```

### Emit Webhook Event

```typescript
import { emitWebhookEvent } from './src/services/webhook-service';

await emitWebhookEvent('campaign_created', {
  campaignId: 'camp_123',
  userId: 'user_123',
  status: 'created',
  timestamp: new Date()
}, ['user_123']); // Deliver to this user's webhooks
```

### Check Feature Access

```typescript
import { hasFeatureAccess } from './src/middleware/feature-flags';

const { allowed, reason } = await hasFeatureAccess('user_123', 'api_webhooks');

if (!allowed) {
  return res.status(403).json({
    error: 'Feature not available',
    reason // "Feature 'api_webhooks' not available for free tier..."
  });
}
```

## API Endpoints

### Create Stripe Checkout Session

```bash
POST /api/billing/stripe/checkout
Content-Type: application/json

{
  "userId": "user_123",
  "tier": "pro",
  "email": "user@example.com"
}

→ Returns: { sessionId, clientSecret, url }
```

### Get Billing Status

```bash
GET /api/billing/status?userId=user_123
→ Returns: { tier, monthlyBudget, monthlyUsage, budgetRemaining, percentageUsed }
```

### Track Usage

```bash
POST /api/billing/track-usage
{ "userId": "user_123", "service": "api_call" }
→ Returns: { success, cost } or 402 if over budget
```

### List Feature Flags

```bash
GET /api/features/list
→ Returns: all 6 features with tier requirements
```

### Register Webhook

```bash
POST /api/billing/webhooks/register
{ "userId": "user_123", "url": "...", "events": [...] }
→ Returns: { subscription } with secret
```

### Process Pending Webhooks (Cron Job)

```bash
POST /api/billing/webhooks/process-pending
-H "X-Admin-Key: $ADMIN_KEY"
→ Returns: { processed: N }
```

## Webhook Events

Your webhook receives POST requests when:

```
campaign_created     → New campaign started
campaign_completed   → Campaign finished
roi_calculated       → ROI metrics ready
payment_succeeded    → Subscription paid
subscription_updated → Tier changed
usage_alert          → Budget threshold exceeded
```

### Webhook Payload

```json
{
  "id": "wh_123...",
  "eventType": "campaign_created",
  "timestamp": "2026-08-22T14:30:00Z",
  "payload": {
    "campaignId": "camp_123",
    "userId": "user_123",
    "status": "created"
  }
}
```

### Webhook Headers

```
POST /your-webhook-url
X-Webhook-ID: wh_123...
X-Event-Type: campaign_created
X-Webhook-Signature: hmac-sha256(payload, secret)
Content-Type: application/json
```

**Verify signature in your backend:**

```typescript
const crypto = require('crypto');

const signature = req.headers['x-webhook-signature'];
const body = req.rawBody; // Request body as string
const secret = process.env.FEEDIA_WEBHOOK_SECRET; // From registration

const expected = crypto
  .createHmac('sha256', secret)
  .update(body)
  .digest('hex');

if (signature !== expected) {
  return res.status(401).json({ error: 'Invalid signature' });
}

// Valid webhook!
const payload = JSON.parse(body);
```

## Implementation Checklist

Before deploying to production:

- [ ] Set Stripe keys: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
- [ ] Set admin key: `ADMIN_KEY=...` (random 32-char string)
- [ ] Run database migration (auto on app start)
- [ ] Test checkout flow with Stripe test keys
- [ ] Verify Stripe webhooks are being received
- [ ] Register test webhooks and verify delivery
- [ ] Load test budget enforcement (create campaigns until budget exhausted)
- [ ] Test tier upgrade via Stripe
- [ ] Verify feature flags are enforced
- [ ] Set up cron job for webhook processing
- [ ] Add monitoring/alerting for failed webhooks

## Troubleshooting

**"Stripe not configured"**
→ Set `STRIPE_SECRET_KEY` environment variable

**Budget check always passes**
→ Ensure user exists in `user_tiers` table: `GET /api/billing/tier?userId=...`

**Webhooks not delivering**
→ Check webhook URL is HTTPS and accessible
→ Check webhook secret was saved
→ Run `POST /api/billing/webhooks/process-pending` to retry

**Feature flags returning forbidden**
→ Verify user's tier with: `GET /api/billing/tier?userId=...`
→ Check feature requirement in `feature-flags.ts`

**Database errors on startup**
→ Clear cookies/cache
→ Check `DATABASE_URL` is set
→ Verify PostgreSQL is running

## Next Steps

1. **Set environment variables** in Railway/deployment platform
2. **Deploy to production** (automatic via git push)
3. **Configure Stripe webhooks** in Stripe Dashboard
4. **Set up cron job** for webhook processing
5. **Test checkout flow** with real test cards
6. **Monitor** dashboard for budget alerts

---

**Questions?** See `TIER_MONETIZATION.md` for full reference  
**Production ready?** See `DEPLOYMENT_CHECKLIST.md` for verification steps
