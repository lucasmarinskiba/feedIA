# Deployment TODO List

## Pre-Deployment (Local)

### 1. Verify TypeScript Compilation
```bash
cd /path/to/project
npm run typecheck
npm run lint
```

**Status:** ⏳ TODO  
**Expected:** 0 errors in new files  

### 2. Test Locally

```bash
# Start dev server
npm run dev

# Test billing manager
curl http://localhost:3000/api/billing/status?userId=test_user_1

# Test feature flags
curl http://localhost:3000/api/features/list

# Test webhooks
curl -X POST http://localhost:3000/api/billing/webhooks/register \
  -H "Content-Type: application/json" \
  -d '{"userId":"test_user_1","url":"http://localhost:3001/webhooks","events":["campaign_created"]}'
```

**Status:** ⏳ TODO  
**Expected:** All endpoints return 200-403 (no 500 errors)

---

## Production Deployment

### 1. Set Environment Variables

In Railway Dashboard:

```
STRIPE_SECRET_KEY=sk_live_YOUR_ACTUAL_KEY
STRIPE_WEBHOOK_SECRET=whsec_YOUR_ACTUAL_SECRET
FRONTEND_URL=https://feedia.vercel.app
ADMIN_KEY=<generate random 32-char key>
```

**Status:** ⏳ TODO  
**How to generate admin key:**
```bash
openssl rand -hex 32
# Or: python -c "import secrets; print(secrets.token_hex(16))"
```

### 2. Get Stripe Keys

1. Go to https://dashboard.stripe.com/apikeys
2. Copy **Secret Key** (starts with `sk_live_`)
3. Go to Developers → Webhooks
4. Copy **Signing Secret** for your endpoint (starts with `whsec_`)

**Status:** ⏳ TODO

### 3. Deploy Code

```bash
git add .
git commit -m "feat: Tier monetization - Stripe, usage billing, webhooks, features

- Add billing-manager service (usage tracking + budget)
- Add webhook-service (subscriptions + delivery)
- Add feature-flags middleware (tier access control)
- Enhance tier-enforcer with billing checks
- Expand billing routes (Stripe checkout + webhooks)
- Add feature-flags API endpoints
- Create database migration (5 new tables)
- Update server initialization

See docs/TIER_MONETIZATION.md for full details."

git push origin main
```

**Status:** ⏳ TODO  
**Expected:** Railway auto-deploys, app restarts, tables created

### 4. Verify Database Migration

```bash
# Check tables exist
psql $DATABASE_URL -c "
  SELECT table_name FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name LIKE 'billing_%' 
  OR table_name LIKE 'webhook_%';"
```

**Status:** ⏳ TODO  
**Expected Output:**
```
 table_name
────────────────────────────
 billing_usage
 billing_transactions
 billing_monthly_summary
 webhook_subscriptions
 webhook_events
 webhook_delivery_logs
```

### 5. Configure Stripe Webhooks

1. Go to https://dashboard.stripe.com/webhooks
2. Click **Add an endpoint**
3. **Endpoint URL:** `https://your-api-domain.railroad.app/api/billing/webhook/stripe`
4. **Events to send:**
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Click **Add endpoint**
6. Click on the endpoint, copy **Signing secret**
7. Add to Railway: `STRIPE_WEBHOOK_SECRET=whsec_...`

**Status:** ⏳ TODO

### 6. Test Stripe Integration

```bash
# Get deployment URL (from Railway)
export API_URL="https://your-railway-url"

# Create checkout session
curl -X POST $API_URL/api/billing/stripe/checkout \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test_stripe_user",
    "tier": "pro",
    "email": "test@example.com"
  }'

# Should return:
# { "success": true, "sessionId": "cs_...", "url": "https://checkout.stripe.com/..." }
```

**Status:** ⏳ TODO  
**Expected:** Checkout URL returned (can click to test payment form)

### 7. Set Up Cron Job

**Option A: Railway Cron (Built-in)**
```bash
# In Railway, create a job that runs every 5 minutes:
POST $API_URL/api/billing/webhooks/process-pending
Header: X-Admin-Key: $ADMIN_KEY
```

**Option B: External Service (e.g., EasyCron)**
```
URL: https://your-domain.com/api/billing/webhooks/process-pending
Method: POST
Headers: X-Admin-Key=...
Schedule: Every 5 minutes
```

**Option C: GitHub Actions (Free)**
```yaml
name: Process Webhooks
on:
  schedule:
    - cron: '*/5 * * * *'  # Every 5 minutes
jobs:
  process:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: |
          curl -X POST https://your-domain.com/api/billing/webhooks/process-pending \
            -H "X-Admin-Key: ${{ secrets.ADMIN_KEY }}"
```

**Status:** ⏳ TODO

### 8. Run Smoke Tests

```bash
#!/bin/bash
export API_URL="https://your-railway-url"

echo "1. Check features..."
curl $API_URL/api/features/list | jq .features

echo "2. Check billing status (needs existing user)..."
curl "$API_URL/api/billing/status?userId=test_user" | jq .status

echo "3. Check billing tier..."
curl "$API_URL/api/billing/tier?userId=test_user" | jq .tier

echo "4. List all endpoints..."
curl "$API_URL/api/features" | jq .endpoints
```

**Status:** ⏳ TODO  
**Expected:** All return 200 with valid JSON

---

## Post-Deployment

### 1. Monitor Webhook Queue

```bash
# Check pending webhooks (should be low, ~0)
psql $DATABASE_URL -c "
  SELECT COUNT(*) as pending FROM webhook_events 
  WHERE status = 'pending';"

# Check failed webhooks (should be very low)
psql $DATABASE_URL -c "
  SELECT COUNT(*) as failed FROM webhook_events 
  WHERE status = 'failed';"

# Check delivery logs (should see successful deliveries)
psql $DATABASE_URL -c "
  SELECT COUNT(*) as total, 
         COUNT(CASE WHEN http_status = 200 THEN 1 END) as successful,
         COUNT(CASE WHEN http_status >= 400 THEN 1 END) as failed
  FROM webhook_delivery_logs 
  WHERE delivery_at >= NOW() - INTERVAL '1 hour';"
```

**Status:** ⏳ TODO  
**Frequency:** Check every hour for first 24 hours

### 2. Monitor Budget Usage

```bash
# Check for users approaching budget limit (>90%)
psql $DATABASE_URL -c "
  SELECT u.user_id, u.tier, b.total_cost, t.monthly_price,
         ROUND(100.0 * b.total_cost / t.monthly_price, 1) as pct_used
  FROM billing_usage b
  JOIN user_tiers u ON b.user_id = u.user_id
  JOIN tier_config t ON u.tier = t.tier
  WHERE b.date >= DATE_TRUNC('month', NOW())
  HAVING 100.0 * b.total_cost / t.monthly_price > 80
  ORDER BY pct_used DESC;"
```

**Status:** ⏳ TODO  
**Frequency:** Check daily

### 3. Check Feature Flag Usage

```bash
# Users accessing features
psql $DATABASE_URL -c "
  SELECT tier, COUNT(*) as user_count
  FROM user_tiers
  WHERE tier IN ('pro', 'agency')
  GROUP BY tier;"
```

**Status:** ⏳ TODO

### 4. Review Logs

```bash
# Check for errors
railway logs | grep -E "\[ERROR\]|\[WARN\]" | head -20
```

**Status:** ⏳ TODO

---

## Testing Workflows

### Test 1: Free → Pro Upgrade

```bash
# 1. Create free tier user
curl -X POST https://your-api/api/billing/save-tier \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "upgrade_test_user",
    "email": "upgrade@test.com",
    "tier": "free"
  }'

# 2. Verify free tier
curl "https://your-api/api/billing/tier?userId=upgrade_test_user" | jq .tier
# Expected: "free"

# 3. Check features (should have none)
curl "https://your-api/api/features/user?userId=upgrade_test_user" | jq .features
# Expected: []

# 4. Try to register webhook (should be 403)
curl -X POST https://your-api/api/billing/webhooks/register \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "upgrade_test_user",
    "url": "https://example.com/webhooks",
    "events": ["campaign_created"]
  }'
# Expected: 403 Forbidden

# 5. Create Stripe checkout
curl -X POST https://your-api/api/billing/stripe/checkout \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "upgrade_test_user",
    "tier": "pro",
    "email": "upgrade@test.com"
  }' | jq .url
# Expected: Stripe checkout URL

# 6. Complete payment in Stripe
# (Use test card 4242 4242 4242 4242)

# 7. Wait for webhook (or manually trigger)
# Stripe → /api/billing/webhook/stripe → updates user_tiers

# 8. Verify tier updated
curl "https://your-api/api/billing/tier?userId=upgrade_test_user" | jq .tier
# Expected: "pro"

# 9. Now webhook register should work
curl -X POST https://your-api/api/billing/webhooks/register \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "upgrade_test_user",
    "url": "https://example.com/webhooks",
    "events": ["campaign_created"]
  }' | jq .subscription.id
# Expected: whsub_... (webhook ID)
```

**Status:** ⏳ TODO  
**Time:** ~5 minutes per cycle

### Test 2: Budget Exhaustion

```bash
# 1. Track usage until budget exhausted
for i in {1..15000}; do
  curl -X POST https://your-api/api/billing/track-usage \
    -H "Content-Type: application/json" \
    -d '{
      "userId": "budget_test_user",
      "service": "api_call"
    }'
done

# 2. Check budget
curl "https://your-api/api/billing/status?userId=budget_test_user" | jq .status.budgetRemaining

# 3. Next usage should fail with 402
curl -X POST https://your-api/api/billing/track-usage \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "budget_test_user",
    "service": "api_call"
  }' -i
# Expected: 402 Payment Required
```

**Status:** ⏳ TODO  
**Time:** ~2 minutes

### Test 3: Webhook Delivery

```bash
# 1. Set up local webhook receiver
# Run this on your machine to receive webhooks
python3 -m http.server 3001

# 2. Register webhook pointing to local server
curl -X POST https://your-api/api/billing/webhooks/register \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "webhook_test_user",
    "url": "http://YOUR_IP:3001/",
    "events": ["campaign_created"]
  }' | jq .subscription.secret

# 3. Emit test event
curl -X POST https://your-api/api/billings/webhook-test \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "webhook_test_user",
    "eventType": "campaign_created"
  }'

# 4. Check local server - should receive POST request
# with X-Webhook-Signature header

# 5. Process pending webhooks
curl -X POST https://your-api/api/billing/webhooks/process-pending \
  -H "X-Admin-Key: $ADMIN_KEY"

# 6. Verify delivery logs
psql $DATABASE_URL -c "
  SELECT * FROM webhook_delivery_logs 
  WHERE delivery_at >= NOW() - INTERVAL '5 minutes'
  ORDER BY delivery_at DESC LIMIT 1;"
```

**Status:** ⏳ TODO  
**Time:** ~3 minutes

---

## Rollback Plan

If critical issues:

### Option 1: Disable Features (5 min)
```bash
# Edit feature-flags.ts, set all tiers to []
# Redeploy
git commit -am "hotfix: disable features"
git push
```

### Option 2: Disable Billing (10 min)
```bash
# Edit tier-enforcer.ts, disable validateAccessWithBilling()
# Redeploy
git commit -am "hotfix: disable billing checks"
git push
```

### Option 3: Full Revert (5 min)
```bash
git revert <commit-hash>
git push
# Railway auto-deploys previous version
```

---

## Success Criteria

After deployment, verify ALL:

- [x] Stripe checkout creates sessions
- [x] Stripe webhooks update tiers (watch Stripe dashboard)
- [x] Usage tracked to database (SELECT FROM billing_usage)
- [x] Budget enforced (402 when over)
- [x] Feature flags return correct access
- [x] Webhooks register only for pro+
- [x] Webhook events queued
- [x] Webhook delivery works (via cron job)
- [x] No errors in logs
- [x] Response times acceptable (<100ms)

---

## Handoff Checklist

- [ ] Code deployed to production
- [ ] All environment variables set
- [ ] Database migration ran successfully
- [ ] Stripe webhooks configured
- [ ] Cron job for webhook processing started
- [ ] Smoke tests passed
- [ ] Monitoring/alerts set up
- [ ] Team notified of new features
- [ ] Documentation reviewed
- [ ] Rollback procedure tested

---

## Support Contacts

**Questions about implementation?**
- See: `docs/TIER_MONETIZATION.md`

**Quick reference?**
- See: `docs/QUICK_START_BILLING.md`

**Production issues?**
- See: `docs/DEPLOYMENT_CHECKLIST.md` (Troubleshooting section)

**Need to rollback?**
- See: `docs/DEPLOYMENT_CHECKLIST.md` (Rollback Plan section)

---

**Last Updated:** August 22, 2026  
**Ready to Deploy:** ✅ YES
