# FeedIA Deployment — MVP Mode (No Token Required)

## MVP Deployment (Test Mode)

**Start here. No API tokens needed. Polling works with mock metrics.**

### 1. Deploy to Vercel

```bash
git push origin main
# Auto-deploys (if connected)
```

### 2. Test Locally

```bash
npx tsx src/server.ts
# Expect: [MetricsPolling] Scheduler starting

npx tsx src/bin/run-e2e-test.ts
# Expect: ✓ All stages passed
```

### 3. MVP Features (Live Now)

- ✓ Cron polling (4h/15-30m/7d cycles)
- ✓ Closed-loop optimization (generate → publish → measure → extract → bias)
- ✓ Provider routing (Higgsfield → Replicate fallback)
- ✓ Sala Ejecutiva dashboard
- ✓ Metrics recording (mock 0 reach until token added)

### 4. Monitor

```bash
# Polling queue
curl https://your-vercel-url.com/api/polling/stats

# Dashboard (shows mock metrics)
curl https://your-vercel-url.com/api/sala/ejecutiva/dashboard
```

## Add Real Metrics Later (Path 2: OAuth)

When ready to show real reach/engagement:

1. Build Instagram OAuth route (src/server/instagramOAuthRoutes.ts)
   ```bash
   POST /oauth/instagram/connect
   # User clicks → Instagram login → token auto-saved
   ```

2. Set `META_ACCESS_TOKEN` in Vercel env
   ```
   VERCEL SETTINGS → ENV VARS →
   META_ACCESS_TOKEN=<token>
   ```

3. Next polling cycle (4h) fetches real metrics
   - Reach (impressions)
   - Engagement (likes + comments + shares)
   - Follows gained

## Optional Environment Variables

```bash
# Add later when ready:
HIGGSFIELD_API_KEY          (image/video generation, optional)
REDIS_URL                   (for production job queue, optional)
SENTRY_DSN                  (error tracking, optional)
```

## Cost

- MVP: $0/month
- +Real metrics: Instagram API (free) + Redis ($7/month)
- +Image gen: Higgsfield ($0.01-0.20 per gen)
