# TIER 1 FEATURES BUILD PLAN

Critical features blocking production users. 5-phase build.

## Phase 1: Real Authentication (JWT + Session)

**Files:**
- `api/_auth-real.js` — Login, signup, JWT tokens, refresh
- `src/middleware/auth-session.ts` — Session management, rate limit by user
- `src/db/users.ts` — User table schema + queries
- `__tests__/auth.test.ts` — Auth flow tests

**Endpoints:**
```
POST   /api/auth/signup          (email, password, name)
POST   /api/auth/login           (email, password)
POST   /api/auth/refresh         (refresh_token)
POST   /api/auth/logout          (invalidate session)
GET    /api/auth/me              (current user)
PUT    /api/auth/password        (change password)
POST   /api/auth/reset-password  (forgot password flow)
```

**Database:**
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR UNIQUE NOT NULL,
  password_hash VARCHAR NOT NULL,
  name VARCHAR,
  tier VARCHAR DEFAULT 'free',
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

CREATE TABLE sessions (
  id VARCHAR PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  refresh_token VARCHAR UNIQUE,
  expires_at TIMESTAMP,
  created_at TIMESTAMP
);
```

---

## Phase 2: Stripe Billing (Payment Flow)

**Files:**
- `api/_billing-real.js` — Stripe checkout, webhooks, subscriptions
- `src/db/billing.ts` — Billing records
- `__tests__/billing.test.ts` — Payment flow tests

**Endpoints:**
```
GET    /api/billing/plans              (list plans)
POST   /api/billing/checkout           (create session)
GET    /api/billing/checkout/:id       (session status)
POST   /api/billing/cancel             (cancel subscription)
POST   /api/billing/webhook            (Stripe webhook)
GET    /api/billing/invoice/:id        (get invoice)
GET    /api/billing/usage              (current usage/credits)
```

**Stripe Setup:**
- Products: free, starter, premium (tier-based)
- Webhooks: payment_intent.succeeded, subscription.updated
- Tax: VAT/sales tax calculation
- Invoicing: auto-generate on payment

**Database:**
```sql
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  stripe_subscription_id VARCHAR,
  plan_id VARCHAR,
  status VARCHAR,
  current_period_start TIMESTAMP,
  current_period_end TIMESTAMP,
  created_at TIMESTAMP
);

CREATE TABLE billing_records (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  amount DECIMAL,
  currency VARCHAR,
  description VARCHAR,
  stripe_charge_id VARCHAR,
  created_at TIMESTAMP
);
```

---

## Phase 3: Email Notifications (SendGrid)

**Files:**
- `api/_email.js` — SendGrid integration
- `src/services/email-templates.ts` — Email templates (Handlebars)
- `__tests__/email.test.ts` — Email sending tests

**Endpoints:**
```
POST   /api/email/send              (internal only)
GET    /api/email/templates         (list templates)
POST   /api/email/test              (send test email)
```

**Email Types:**
1. Welcome: Signup confirmation
2. Invite: Team invitation
3. Alert: Publish success/failure
4. Billing: Invoice, payment failed
5. Password: Reset link
6. Report: Weekly analytics

**Setup:**
- SendGrid API key + domain verification
- Email templates (Handlebars)
- Unsubscribe management
- Bounce/complaint handling

---

## Phase 4: S3 Storage (Video/Image Uploads)

**Files:**
- `api/_storage.js` — S3 upload, CDN URLs
- `src/services/s3-manager.ts` — S3 client wrapper
- `__tests__/storage.test.ts` — Upload tests

**Endpoints:**
```
POST   /api/storage/upload           (get signed URL)
GET    /api/storage/url/:key         (get CDN URL)
DELETE /api/storage/delete           (delete object)
GET    /api/storage/usage            (usage stats)
```

**S3 Config:**
- Bucket: feedia-{env}-media
- Lifecycle: Delete old uploads (30 days)
- CloudFront CDN: distribution for fast delivery
- CORS: Allow uploads from frontend
- Signed URLs: 15-min expiry

**Upload Flow:**
1. Client requests signed URL from `/api/storage/upload`
2. Client uploads directly to S3 (multipart)
3. S3 triggers Lambda → compress/transcode
4. Store URL in database
5. Deliver via CloudFront CDN

---

## Phase 5: Admin Dashboard (Backend)

**Files:**
- `api/_admin.js` — Admin endpoints (auth-gated)
- `src/db/admin.ts` — Admin queries
- `__tests__/admin.test.ts` — Admin tests

**Endpoints:**
```
GET    /api/admin/users                  (list users, search, filter)
GET    /api/admin/users/:id              (user details)
PUT    /api/admin/users/:id/tier         (change tier)
POST   /api/admin/users/:id/reset-password (force reset)
DELETE /api/admin/users/:id              (delete user)

GET    /api/admin/billing                (revenue, MRR, churn)
GET    /api/admin/billing/invoices       (all invoices)
GET    /api/admin/billing/disputes       (chargebacks)

GET    /api/admin/content                (all content)
DELETE /api/admin/content/:id            (remove content)

GET    /api/admin/logs                   (audit logs)
GET    /api/admin/health                 (system health)
POST   /api/admin/feature-flag/:name     (toggle feature)
```

**Auth Gate:**
- Only OWNER_EMAIL has access
- All actions logged + audit trail
- No bulk operations (manual only)

---

## Implementation Order

1. **Day 1:** Auth (JWT + sessions)
2. **Day 2:** Stripe (checkout + webhooks)
3. **Day 3:** Email (SendGrid integration)
4. **Day 4:** S3 (upload + CDN)
5. **Day 5:** Admin dashboard

---

## Testing Strategy

- Unit tests: Auth, billing, email, storage
- Integration tests: Full signup → payment → email flow
- E2E tests: User signup → create team → upload video → publish

---

## Security Checklist

- [x] JWT: HS256 + RS256 (sign/verify)
- [x] Password: bcrypt + salt (12 rounds)
- [x] Rate limit: Login attempts (5/10min)
- [x] Stripe: Webhook signature verification
- [x] Email: Unsubscribe link mandatory
- [x] S3: Signed URLs, CORS, bucket policy
- [x] Admin: Owner-only gate + audit logging

