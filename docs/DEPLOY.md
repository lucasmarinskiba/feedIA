# FeedIA Deployment Guide

## Pre-Deployment Checklist

- All code committed to main branch
- CI pipeline passed (lint, type-check, tests)
- Database migrations tested
- Environment variables set on Railway
- Team notified in Slack

## Standard Deployment Flow

### 1. Create Release Tag

```bash
git tag -a v1.0.5 -m "Fix: Performance optimization"
git push origin v1.0.5
```

### 2. GitHub Actions Deploy Workflow Runs

- Runs: lint → type-check → build → test → security
- Builds and deploys to production on Railway
- Runs health checks (10 retries, 1s interval)
- Auto-rollback if health checks fail

### 3. Monitor Deployment

Watch GitHub Actions workflow or Railway dashboard

### 4. Verify in Production

```bash
curl https://web-production-fa7b5.up.railway.app/health | jq
curl https://web-production-fa7b5.up.railway.app/metrics | head -20
```

## Rollback Procedure

```bash
git tag | grep "^v" | sort -V | tail -5
git tag -a v1.0.4-rollback -m "Rollback from 1.0.5 to 1.0.4"
git push origin v1.0.4-rollback
# Auto-deploys v1.0.4-rollback
```

## Database Migrations During Deployment

1. Test migrations locally: `npm run db:migrate`
2. Commit migration file to git
3. Migrations run automatically on server startup
4. Check logs: `railway logs | grep "Migration"`

## Zero-Downtime Deployment

- Old service stays alive until new one is healthy
- Health checks verify before switching traffic
- Downtime: < 5 seconds (network reconnect only)

## Environment Variables

```bash
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
STRIPE_SECRET_KEY=sk_live_...
FEEDIA_ADMIN_KEY=<random-32-char-key>
FRONTEND_URL=https://feedia.vercel.app
```

## Post-Deployment Tasks

- Verify /health endpoint returns 200
- Check admin dashboard shows zero errors
- Test critical endpoints
- Monitor error rate for 15 min (target: < 1%)
- Notify team deployment complete

---

**Deployment SLA**: 95% success. Target: < 5 min total time.
