# FeedIA Deployment — Closed-Loop Viral Optimization

## Pre-Deployment Checklist

### 1. Environment Variables (`.env` or Vercel Settings)

**Required for metrics polling:**
```bash
# Instagram Graph API (for metrics + comments)
META_ACCESS_TOKEN=<your-instagram-business-account-token>
META_IG_BUSINESS_ID=<your-ig-business-id>

# TikTok (optional)
TIKTOK_ACCESS_TOKEN=<your-tiktok-token>

# Redis (for BullMQ job queue)
REDIS_URL=redis://upstash.com/...

# Sentry (error tracking)
SENTRY_DSN=https://...

# Higgsfield (image/video generation)
HIGGSFIELD_API_KEY=<your-higgsfield-key>
```

### 2. Background Worker Setup (Choose One)

**Option A: Vercel Cron (Serverless)**
- Max 60s execution time
- Use for: quick polling only

**Option B: BullMQ + Redis (Recommended for Production)**
- Persistent job queue
- Already wired in src/workers/metricsPollingOrchestrator.ts
- Setup: `npm install bullmq redis ioredis`

**Option C: External Service**
- Hit `/api/polling/trigger-cycle?cycle=metrics|engagement|feedback`

### 3. Polling Scheduler

**Already wired in:** `src/server.ts` line 195
- 4h metrics cycle: reach/engagement/follows/saves
- 15-30m engagement cycle: comments + responses
- 7d feedback cycle: extract patterns + amplify

## Deployment Steps

### 1. Vercel Deploy

```bash
git push origin main
# Auto-deploys if connected
```

### 2. Local Test Before Deploy

```bash
npx tsx src/server.ts
# Expect: [MetricsPolling] Scheduler starting

# Run E2E test
npx tsx src/bin/run-e2e-test.ts
# Expect: ✓ All stages passed
```

### 3. Production Monitoring

**Dashboard endpoints:**
```bash
GET /api/sala/ejecutiva/dashboard
GET /api/sala/ejecutiva/growth-trajectory
GET /api/sala/ejecutiva/platform-comparison
```

**Polling status:**
```bash
GET /api/polling/stats
```

## Real Improvements Tracking

**Metrics updated every 4h after publish:**
- Reach (impressions)
- Engagement (likes + comments + shares)
- Follows gained
- Saves

**Trends (30-day):**
- Growth velocity (followers/week)
- Format performance ranking
- Closed-loop feedback patterns

## Cost

- Instagram API: Free tier
- Redis: ~$7/month
- Higgsfield: ~$0.01-0.20 per gen
- Example: 10 posts/day = ~$15/month
