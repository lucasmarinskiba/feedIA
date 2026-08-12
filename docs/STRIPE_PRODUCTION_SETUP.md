# Stripe Production Setup — FeedIA TIER 8

## 1. Create Stripe Account

1. Go to https://stripe.com/es-ar (or your region)
2. Sign up with business email
3. Complete KYC verification (business details, bank account)
4. Dashboard: https://dashboard.stripe.com

## 2. Get API Keys

**Location**: Dashboard → [Developers](https://dashboard.stripe.com/developers) → API Keys

Copy **both**:

```
STRIPE_PUBLIC_KEY=pk_live_...  (frontend, public safe)
STRIPE_SECRET_KEY=sk_live_...  (backend, KEEP SECRET)
```

Add to `.env` (dev) and **Railway/Vercel secrets** (prod):

```bash
# .env (local — gitignore)
STRIPE_PUBLIC_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
```

```bash
# Railway secrets (via CLI or UI)
railway variables set STRIPE_PUBLIC_KEY=pk_live_...
railway variables set STRIPE_SECRET_KEY=sk_live_...
```

## 3. Create Stripe Products + Prices

**Location**: Dashboard → Products

### Pro Tier
```
Name: FeedIA Pro
Price: $79/month
Billing: Recurring
Recurrence: Monthly
Price ID: price_1A1234...  (copy this)
```

### Agency Tier
```
Name: FeedIA Agency
Price: $499/month
Billing: Recurring
Recurrence: Monthly
Price ID: price_1A5678...  (copy this)
```

Update `.env`:
```
STRIPE_PRICE_PRO=price_1A1234...
STRIPE_PRICE_AGENCY=price_1A5678...
```

Update `src/api/billing/create-checkout-session.ts`:
```typescript
const tierConfig = {
  pro: { price: process.env.STRIPE_PRICE_PRO || 'price_test_...', campaigns: 50 },
  agency: { price: process.env.STRIPE_PRICE_AGENCY || 'price_test_...', campaigns: 500 },
};
```

## 4. Webhook Endpoint

**Location**: Dashboard → Developers → Webhooks

### Create Endpoint

```
Endpoint URL: https://your-domain.com/api/billing/webhook/stripe
Events to receive: 
  ✓ customer.subscription.created
  ✓ customer.subscription.updated
  ✓ customer.subscription.deleted
  ✓ invoice.payment_failed
```

Copy **Signing Secret**:
```
STRIPE_WEBHOOK_SECRET=whsec_live_...
```

Add to `.env` + Railway/Vercel:
```bash
railway variables set STRIPE_WEBHOOK_SECRET=whsec_live_...
```

## 5. Deploy & Test

### Staging (Stripe Test Mode)
```bash
git push origin main
# Railway auto-deploys
# Verify: POST /api/billing/create-checkout-session with tier=pro
# Should redirect to Stripe test checkout
```

### Production (Stripe Live Mode)
```bash
# Switch API keys in Railway secrets
railway variables set STRIPE_SECRET_KEY=sk_live_...
railway variables set STRIPE_PUBLIC_KEY=pk_live_...
```

Test with **real test card**:
- Number: `4242 4242 4242 4242`
- Expiry: Any future (e.g., 12/25)
- CVC: Any 3 digits (e.g., 123)

## 6. Monitor Webhooks

**Location**: Dashboard → Developers → Webhooks → [your endpoint]

View recent deliveries. If any fail:
1. Check `src/api/billing/stripe-webhook.ts` logs
2. Verify `STRIPE_WEBHOOK_SECRET` matches
3. Retry failed webhooks from dashboard

## 7. Test Tier Enforcement

```bash
# Create free tier user
curl -X POST http://localhost:3000/api/billing/save-tier \
  -H "Content-Type: application/json" \
  -d '{"userId":"test-free","email":"test@example.com","tier":"free"}'

# Try to create campaign (should fail: 5/mo limit)
curl -X POST http://localhost:3000/api/agency/campaign/create \
  -H "X-Account-ID: test-free" \
  -H "Content-Type: application/json" \
  -d '{
    "brief":"test",
    "targetAudience":"creators",
    "goals":["engagement"]
  }' \
  # Repeat 6 times → 6th should return 403

# Create pro tier user
curl -X POST http://localhost:3000/api/billing/save-tier \
  -H "Content-Type: application/json" \
  -d '{"userId":"test-pro","email":"pro@example.com","tier":"pro"}'

# Same campaign request with pro account → should succeed
```

## 8. Production Checklist

- [ ] STRIPE_SECRET_KEY set in Railway secrets (sk_live_...)
- [ ] STRIPE_PUBLIC_KEY set in Railway secrets (pk_live_...)
- [ ] STRIPE_WEBHOOK_SECRET set in Railway secrets (whsec_live_...)
- [ ] STRIPE_PRICE_PRO = correct price ID (price_1A1234...)
- [ ] STRIPE_PRICE_AGENCY = correct price ID (price_1A5678...)
- [ ] Webhook endpoint registered in Stripe dashboard
- [ ] Test payment with real card (4242...) → succeeds → DB tier updated
- [ ] Test campaign creation with pro tier → works
- [ ] Test campaign creation with free tier (6th) → 403 Forbidden

## 9. Support

- Stripe Docs: https://stripe.com/docs
- Webhooks: https://stripe.com/docs/webhooks
- Test Cards: https://stripe.com/docs/testing

