# FeedIA API Reference

**Last Updated**: 2026-08-22 | **Base URL**: `https://web-production-fa7b5.up.railway.app` | **Status**: 59 endpoints live

## Quick Start

### Authentication

All requests require a bearer token in the Authorization header:

```bash
curl -H "Authorization: Bearer $API_KEY" \
  https://web-production-fa7b5.up.railway.app/api/billing/tier?userId=user_123
```

Tokens are obtained via:
1. **OAuth Login**: `POST /api/auth/login` → Instagram OAuth flow
2. **API Key**: Generated in dashboard → use as bearer token
3. **Session Cookie**: Set after OAuth callback (browser-only)

### Example Request

```bash
# Check user's current tier
curl -H "Authorization: Bearer sk_prod_abc123..." \
  https://web-production-fa7b5.up.railway.app/api/billing/tier?userId=user_123

# Response (200 OK)
{
  "success": true,
  "tier": "pro",
  "tier_name": "Pro",
  "campaigns_limit": 50,
  "campaigns_used_this_month": 12,
  "campaigns_remaining": 38,
  "supports": ["carousel", "video", "story"]
}
```

---

## Endpoint Catalog (59 Total)

### Authentication (5 endpoints)

#### POST /api/auth/login
Start Instagram OAuth flow.

```
Request: { ig_handle: "@myprofile" }
Response: { auth_url: "https://instagram.com/oauth/authorize?..." }
Status: 302 Redirect to auth_url
```

#### POST /api/auth/callback
OAuth return handler. Automatically called by Instagram.

```
Query: code=ABC123, state=XYZ789
Response: Redirect to dashboard with session cookie
Status: 302 Redirect to /dashboard
```

#### POST /api/oauth/token
Refresh access token.

```
Request: { refresh_token: "..." }
Response: { access_token: "...", expires_in: 3600 }
Status: 200 OK
```

#### GET /api/user/profile
Get current user info.

```
Response: {
  "user_id": "user_123",
  "email": "user@example.com",
  "tier": "pro",
  "ig_handle": "@myprofile"
}
Status: 200 OK
```

#### POST /api/logout
Clear session.

```
Response: { success: true }
Status: 200 OK
```

---

### Billing & Tier Management (8 endpoints)

#### GET /api/billing/tier
Get user's current tier.

```
Query: userId=user_123
Response: {
  "tier": "pro",
  "campaigns_limit": 50,
  "campaigns_used_this_month": 12,
  "monthly_reset": "2026-09-22T00:00:00Z"
}
Status: 200 OK
```

#### POST /api/billing/create-checkout-session
Create Stripe checkout session.

```
Request: {
  "product_id": "price_starter_monthly",  # or annual variant
  "user_id": "user_123"
}
Response: {
  "session_id": "cs_live_...",
  "checkout_url": "https://checkout.stripe.com/..."
}
Status: 200 OK
Error: 403 if user already subscribed to higher tier
```

#### POST /api/billing/webhook/stripe
Stripe webhook handler (Stripe → us).

```
Webhook Events:
- payment_intent.succeeded → Create subscription
- customer.subscription.deleted → Downgrade to free
- charge.failed → Send retry email

Authentication: X-Stripe-Signature header verification
Status: 200 OK (any event), 400 Bad Signature
```

#### POST /api/billing/save-tier
Signup for free tier.

```
Request: {
  "email": "user@example.com",
  "password_hash": "...",
  "ig_handle": "@myprofile"
}
Response: {
  "user_id": "user_123",
  "tier": "free"
}
Status: 201 Created
Error: 409 if email already exists
```

#### GET /api/pricing
Get tier comparison page (HTML).

```
Response: HTML with pricing table, feature matrix, CTA buttons
Status: 200 OK
Content-Type: text/html
```

#### GET /api/subscription/status
Check active subscription.

```
Query: userId=user_123
Response: {
  "active": true,
  "tier": "pro",
  "current_period_end": "2026-09-22T00:00:00Z",
  "cancel_at": null
}
Status: 200 OK
```

#### POST /api/subscription/cancel
Request churn / subscription cancellation.

```
Request: { user_id: "user_123", reason: "too expensive" }
Response: { success: true, cancel_at: "2026-09-22T00:00:00Z" }
Status: 200 OK
```

#### GET /api/cost-guardian/summary
Get spend metrics.

```
Query: userId=user_123
Response: {
  "tier": "pro",
  "ceiling_monthly": 100,
  "spent_this_month": 45.50,
  "remaining_budget": 54.50,
  "percentage_used": 45.5
}
Status: 200 OK
```

---

### Content Generation (15 endpoints)

#### POST /api/generate/carousel
Generate carousel design.

```
Request: {
  "topic": "How to grow Instagram followers",
  "style": "Pinterest-inspired",
  "color_palette": "warm-organic",
  "slides": 10
}
Response: {
  "job_id": "job_abc123",
  "status": "queued",
  "estimated_duration_seconds": 30,
  "polling_url": "/api/jobs/job_abc123"
}
Status: 202 Accepted
Auth: Requires Tier 1+
```

#### POST /api/generate/reel
Generate video reel.

```
Request: {
  "topic": "Coffee brewing tutorial",
  "duration_seconds": 30,
  "format": "vertical"  # 9:16
}
Response: { job_id: "job_xyz789", status: "queued", ... }
Status: 202 Accepted
Auth: Requires Tier 3+
```

#### POST /api/generate/story
Generate Instagram story.

```
Request: { topic: "...", background: "gradient" }
Response: { job_id: "job_...", status: "queued", ... }
Status: 202 Accepted
Auth: Requires Tier 2+
```

#### POST /api/image/parameterized
Match user image to prompts and generate variations.

```
Request: {
  "user_image_url": "https://example.com/photo.jpg",
  "batch": "batch_88"  # Product photography
}
Response: {
  "job_id": "job_...",
  "matched_prompts": [
    { "id": "p1", "prompt": "...", "similarity": 0.95 }
  ]
}
Status: 202 Accepted
```

#### POST /api/video/batch-90
Parameterized video batch (FACS + narrative).

```
Request: {
  "batch": 90,
  "user_image": "url_or_base64",
  "emotion": "joy",
  "duration": 15
}
Response: { job_id: "...", status: "queued" }
Status: 202 Accepted
```

#### POST /api/video/batch-92
15-sec vertical engagement (TikTok/Reels).

```
Request: {
  "engagement_type": "hook",  # hook, trend, challenge, dance, reaction
  "topic": "makeup tutorial",
  "music_style": "upbeat"
}
Response: { job_id: "...", status: "queued" }
Status: 202 Accepted
```

#### POST /api/video/batch-93
Reference pattern video (documentary, travel, macro).

```
Request: {
  "pattern": "documentary",  # documentary, travel, macro, luxury-food, etc
  "topic": "coffee farm production"
}
Response: { job_id: "...", status: "queued" }
Status: 202 Accepted
```

#### POST /api/video/batch-94
FIFA sports celebration (50 sports × 195+ nations).

```
Request: {
  "sport": "football",
  "team": "Argentina",
  "moment": "goal-celebration",
  "player_image": "url_or_base64"  # Optional: use user image as face
}
Response: { job_id: "...", status: "queued" }
Status: 202 Accepted
```

#### POST /api/video/batch-95
UGC + location video (character-locked).

```
Request: {
  "category": "daily-life",  # daily-life, transformation, action
  "location": "beach",
  "character_consistency": true
}
Response: { job_id: "...", status: "queued" }
Status: 202 Accepted
```

#### POST /api/video/batch-96
Soft-sell marketing video (no direct CTA).

```
Request: {
  "product": "coffee subscription",
  "emotion": "cozy",
  "audience": "lifestyle-conscious"
}
Response: { job_id: "...", status: "queued" }
Status: 202 Accepted
```

#### POST /api/football-meme/generate
Generate @433-style football meme.

```
Request: {
  "meme_type": "post-goal",  # post-goal, rivalry, comparison, iconic, underdog
  "player_name": "Cristiano Ronaldo",
  "team": "Real Madrid",
  "moment_description": "hat trick celebration"
}
Response: { job_id: "...", status: "queued" }
Status: 202 Accepted
```

#### POST /api/master-generate/multi
Multi-format pipeline (carousel + reel + story from one brief).

```
Request: {
  "topic": "productivity tips",
  "formats": ["carousel", "reel", "story"]
}
Response: {
  "jobs": {
    "carousel": { job_id: "job1", status: "queued" },
    "reel": { job_id: "job2", status: "queued" },
    "story": { job_id: "job3", status: "queued" }
  }
}
Status: 202 Accepted
```

#### POST /api/quality-feedback/rate
Rate generated content (⭐ 1-5).

```
Request: {
  "content_id": "carousel_abc123",
  "rating": 5,
  "feedback": "Great design!"
}
Response: { success: true, quality_score_updated: true }
Status: 200 OK
```

#### GET /api/quality-feedback/recommendations
Get top-rated prompts.

```
Query: category=carousel, limit=10
Response: [
  { rank: 1, prompt: "...", avg_rating: 4.8, uses: 523 },
  { rank: 2, prompt: "...", avg_rating: 4.7, uses: 489 }
]
Status: 200 OK
```

---

### Orchestration & Analytics (8 endpoints)

#### POST /api/orchestrator/plan
2-phase reasoning: Plan → Execute.

```
Request: {
  "user_goal": "Grow followers 10% in 30 days",
  "current_metrics": { followers: 10000, engagement_rate: 3.2 }
}
Response: {
  "plan": "Post 3x daily mix of educational + entertaining + behind-the-scenes content. Focus on Reels.",
  "actions": [
    { action: "create_carousel", count: 20 },
    { action: "create_reel", count: 30 }
  ]
}
Status: 200 OK
```

#### GET /api/metrics/campaigns
Get campaign KPIs.

```
Query: userId=user_123, limit=10
Response: [
  {
    "campaign_id": "camp_abc",
    "posted_at": "2026-08-20T10:00:00Z",
    "impressions": 5420,
    "engagement_rate": 8.3,
    "shares": 45,
    "saves": 120
  }
]
Status: 200 OK
```

#### GET /api/trending/content
Top-performing prompts.

```
Query: category=carousel, period=30-days
Response: [
  { rank: 1, prompt: "...", avg_impressions: 8500 },
  { rank: 2, prompt: "...", avg_impressions: 7200 }
]
Status: 200 OK
```

#### GET /api/health
System health check (automated, 60s interval).

```
Response: {
  "status": "ok",
  "components": {
    "api": "ok",
    "postgres": "ok",
    "redis": "ok"
  },
  "metrics": {
    "error_rate_percent": 0.8,
    "p99_latency_ms": 950
  }
}
Status: 200 OK
```

---

## Polling Jobs

When you submit a generation request, you get back `job_id` and a `polling_url`. Poll this endpoint to check status:

```bash
curl https://web-production-fa7b5.up.railway.app/api/jobs/job_abc123

# Response (still processing)
{
  "job_id": "job_abc123",
  "status": "processing",
  "progress_percent": 45,
  "estimated_remaining_seconds": 15
}

# Response (complete)
{
  "job_id": "job_abc123",
  "status": "completed",
  "result": {
    "carousel_url": "https://...",
    "download_url": "https://...",
    "created_at": "2026-08-22T15:30:45Z"
  }
}

# Response (failed)
{
  "job_id": "job_abc123",
  "status": "failed",
  "error": "Prompt too long (500 chars). Max 350.",
  "error_code": "VALIDATION_ERROR"
}
```

**Polling Strategy**: 
- Initial poll: 2 seconds
- Then poll every 3-5 seconds
- Max retries: 60 (5 minute timeout)

---

## Error Codes & Troubleshooting

| Code | Status | Meaning | Fix |
|------|--------|---------|-----|
| TIER_LIMIT_EXCEEDED | 403 | Campaign limit hit for this month | Upgrade tier or wait for reset |
| RATE_LIMIT_EXCEEDED | 429 | Too many requests | Retry after 60 seconds |
| UNAUTHORIZED | 401 | Invalid API key or expired session | Check Authorization header |
| NOT_FOUND | 404 | Resource doesn't exist | Check job_id or user_id parameter |
| VALIDATION_ERROR | 400 | Invalid request payload | Check required fields, data types |
| STRIPE_ERROR | 402 | Payment failed | Check card, retry or use different card |
| DB_ERROR | 503 | Database temporarily unavailable | Retry in 30 seconds |
| EXTERNAL_API_ERROR | 502 | Claude API or other external service down | Check Sentry, retry later |

### Example Error Response

```json
{
  "success": false,
  "error": "Tier limit exceeded",
  "error_code": "TIER_LIMIT_EXCEEDED",
  "details": {
    "campaigns_limit": 50,
    "campaigns_used": 50,
    "monthly_reset": "2026-09-22T00:00:00Z"
  },
  "status": 403
}
```

---

## Rate Limiting

**Per-User Limits**:
- Auth endpoints: 10 req/min
- Generation endpoints: 100 req/min
- Analytics endpoints: 500 req/min

**Global Limits**:
- API overall: 10,000 req/min (across all users)

**Response Headers**:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 87
X-RateLimit-Reset: 1724335200
```

When rate limited (429 response):
```bash
sleep 60  # Wait until X-RateLimit-Reset
# Then retry
```

---

## Pagination

List endpoints (metrics, content, etc.) support pagination:

```bash
curl "https://web-production-fa7b5.up.railway.app/api/metrics/campaigns?userId=user_123&limit=25&offset=0"

# Response
{
  "data": [...],
  "pagination": {
    "total": 150,
    "limit": 25,
    "offset": 0,
    "has_more": true,
    "next_offset": 25
  }
}
```

---

## Webhooks (Inbound)

FeedIA sends webhooks to your configured endpoint for key events:

**Setup**:
1. Go to dashboard → Settings → Webhooks
2. Enter your endpoint URL
3. Copy webhook secret

**Event Types**:
- `job.completed` — Content generation finished
- `payment.succeeded` — Subscription payment processed
- `tier.upgraded` — User upgraded their plan

**Verification** (check X-Webhook-Signature header):

```bash
# Compute HMAC-SHA256(body, webhook_secret)
# Compare to X-Webhook-Signature header
# If match: signature is valid
```

---

## SDKs & Libraries

### JavaScript/TypeScript

```bash
npm install @feedia/sdk
```

```typescript
import { FeedIA } from '@feedia/sdk';

const client = new FeedIA({
  apiKey: 'sk_prod_...',
  baseUrl: 'https://web-production-fa7b5.up.railway.app'
});

// Generate carousel
const job = await client.content.generateCarousel({
  topic: 'How to start a blog',
  slides: 10
});

// Poll for result
const result = await job.waitForCompletion(30000); // 30s timeout
console.log(result.carousel_url);
```

### Python

```bash
pip install feedia
```

```python
from feedia import FeedIA

client = FeedIA(api_key='sk_prod_...')

job = client.content.generate_carousel(
    topic='How to start a blog',
    slides=10
)

result = job.wait_for_completion(timeout=30)
print(result.carousel_url)
```

### cURL

```bash
# Generate
curl -X POST https://web-production-fa7b5.up.railway.app/api/generate/carousel \
  -H "Authorization: Bearer sk_prod_..." \
  -H "Content-Type: application/json" \
  -d '{"topic": "...", "slides": 10}'

# Poll
curl https://web-production-fa7b5.up.railway.app/api/jobs/job_abc123 \
  -H "Authorization: Bearer sk_prod_..."
```

---

## Changelog & Versioning

### API Versioning
Current version: `v1` (in URL paths like `/api/v1/...`)

**Deprecated** (will be removed 2026-12-31):
- `/api/v1/prompts` — Use `/api/generate/*` instead
- `/api/v1/carousel` — Use `/api/generate/carousel` instead
- `/api/studio/*` — Use dashboard instead

**Next** (planned Q4 2026):
- `/api/v2/*` — GraphQL-based API with streaming responses
- Deprecation policy: 6-month migration window

---

**Support**: support@feedia.io | [Status Page](https://status.feedia.io) | [Docs](https://docs.feedia.io)
