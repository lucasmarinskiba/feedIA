# Deployment Checklist — MercadoPago + Webhooks

## Vercel Frontend (feedia.vercel.app)

**Required Environment Variables:**
- [ ] `REACT_APP_API_URL=https://web-production-fa7b5.up.railway.app`
- [ ] `REACT_APP_STRIPE_KEY=pk_live_...` (if Stripe fallback enabled)
- [ ] `REACT_APP_MERCADOPAGO_PUBLIC_KEY=APP_USR-...` (public key only)

**Config Checks:**
- [ ] `tsconfig.json` has `"strict": true`
- [ ] `.env.local` NOT committed to git
- [ ] `next.config.js` or `vite.config.ts` configured
- [ ] Build passes: `npm run build`
- [ ] No console errors in prod build

**Deploy Steps:**
```bash
git push origin main
# Vercel auto-deploys from GitHub push
# Check: https://vercel.com/dashboard
```

---

## Railway Backend (web-production-fa7b5.up.railway.app)

**Required Environment Variables (Railway dashboard):**
```
DATABASE_URL=postgresql://...
REDIS_URL=https://...
MERCADOPAGO_ACCESS_TOKEN=APP_USR-4433316402603271-081320-ae55e6e1ac81a869f8627a45417f3b58-1283145837
MERCADOPAGO_WEBHOOK_SECRET=<regenerate-in-mercadopago-dashboard>
CSRF_SECRET=<32+ random chars>
CSRF_REQUIRED=true
OWNER_EMAIL=<prod-email>
PUBLIC_BASE_URL=https://web-production-fa7b5.up.railway.app
NODE_ENV=production
```

**Critical Security Checks:**
- [ ] MERCADOPAGO_ACCESS_TOKEN is rotated in production dashboard
- [ ] MERCADOPAGO_WEBHOOK_SECRET is strong (>32 chars)
- [ ] CSRF_SECRET is cryptographically random
- [ ] DATABASE_URL points to production Postgres
- [ ] REDIS_URL is from Upstash (production)
- [ ] PUBLIC_BASE_URL matches Railway deployment URL

**Deploy Steps:**
```bash
# Option 1: Direct Railway CLI
railway link <project-id>
railway up

# Option 2: GitHub push (if Railway connected)
git push origin main
```

---

## Webhook Configuration — MercadoPago Dashboard

**URL Setup:**
1. Go to MercadoPago Dev Dashboard → Account → Webhooks
2. **Notification URL**: `https://web-production-fa7b5.up.railway.app/api/billing/webhooks/mercadopago`
3. **Events to subscribe**:
   - [ ] payment.created
   - [ ] payment.updated
   - [ ] subscription.created
   - [ ] subscription.updated
   - [ ] invoice.payment_failed

**Secret Setup:**
1. Generate new webhook secret (32+ chars)
2. Set in Railway env var: `MERCADOPAGO_WEBHOOK_SECRET`
3. Copy to code: `src/api/billing/mercado-pago-webhook.ts`

**Test Webhook:**
```bash
curl -X POST https://web-production-fa7b5.up.railway.app/api/billing/webhooks/mercadopago \
  -H "Content-Type: application/json" \
  -H "x-signature: <test-sig>" \
  -d '{"action":"payment.updated","data":{"id":"test"}}'
```

---

## Production Verification Checklist

### API Health
- [ ] `GET /api/health` returns 200
- [ ] `GET /api/admin/database-status` shows connected
- [ ] Database migrations ran: `POST /api/admin/migrate` → success

### MercadoPago Flow
- [ ] `POST /api/billing/checkout` creates preference
- [ ] Webhook receives payment.updated event
- [ ] User tier upgraded after payment
- [ ] Subscription record created in DB

### Security Validation
- [ ] Webhook signature validation working (fail-closed)
- [ ] CSRF tokens required on state-changing endpoints
- [ ] Rate limiting active (100 req/hour/IP)
- [ ] No secrets in error responses
- [ ] Sentry monitoring active

### Performance
- [ ] API response time < 500ms (median)
- [ ] Database queries optimized
- [ ] No N+1 query issues
- [ ] Redis cache working

---

## Rollback Plan

If deployment fails:

```bash
# Railway: Switch to previous version
railway rollback <commit-hash>

# Vercel: Revert to last working deployment
# (via Vercel dashboard → Deployments → Rollback)

# Git: If needed, revert commit
git revert <bad-commit>
git push origin main
```

---

## Sign-Off

- [ ] Frontend build passes
- [ ] Backend build passes
- [ ] All env vars configured in both platforms
- [ ] Webhook URL set in MercadoPago dashboard
- [ ] Test payment processed successfully
- [ ] User tier upgraded after payment
- [ ] No errors in Sentry
- [ ] Ready for production traffic

**Deployed by**: _________________  
**Date**: _________________  
**Commit hash**: _________________
