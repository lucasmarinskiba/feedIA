# Production Deployment Runbook

This guide covers FeedIA production deployments: staging flows, production releases, and emergency procedures.

## Deployment Architecture

```
Local commit
    ↓
Push to GitHub (main or tag)
    ↓
CI Workflow (lint, test, build, security scan)
    ↓
Docker image built & pushed to GHCR
    ↓
[STAGING] Auto-deployed after CI passes
    ↓
[PRODUCTION] Manual trigger via tag push or workflow dispatch
    ↓
Health checks → Smoke tests → Monitoring
    ↓
[ROLLBACK] Auto-rollback on health check failure
```

---

## Staging Deployments

### Automatic (After CI Passes)

Staging deploys automatically when:
1. Push to `main` branch
2. All CI checks pass (lint, test, build, security)
3. `deploy-staging.yml` workflow triggers

**No manual action required.** Staging is always current with `main`.

### Check Staging Status

```bash
# View staging environment
https://staging.feedia.com  # (if configured)

# OR check via Railway
railway status --environment staging

# OR view GitHub Actions
gh run list --workflow=deploy-staging.yml --limit=5
```

### Smoke Test Staging

```bash
# Run smoke tests against staging
PUBLIC_BASE_URL="https://staging.feedia.com" npm run test:smoke

# Or view test results in Actions log
gh run view <RUN_ID> --log
```

---

## Production Deployments

### Via Git Tag (Recommended)

1. **Create a release locally:**
   ```bash
   # Pull latest from main
   git checkout main
   git pull

   # Create & push a version tag
   git tag -a v1.2.3 -m "Release: version 1.2.3"
   git push origin v1.2.3
   ```

   This automatically triggers `deploy-production-enhanced.yml`.

2. **GitHub auto-deploys:**
   - Tag push detected
   - Pre-deployment checks run
   - Database migrations applied
   - All services deployed
   - Health checks verify
   - Smoke tests run
   - If all pass: deployment marked successful
   - If any fail: automatic rollback triggered

3. **Monitor deployment:**
   ```bash
   # View the running deployment
   gh deployment status <DEPLOYMENT_ID> -e production

   # Or watch Actions in real-time
   gh run watch
   ```

### Via Manual Dispatch

1. Go to **Actions** → **Deploy Production Enhanced**
2. Click **Run workflow**
3. Enter parameters:
   - `image_tag`: Docker image tag (default: `latest`)
   - `dry_run`: Set to `true` to test without deploying

4. Click **Run workflow**
5. Monitor progress in the workflow logs

### Parameters

| Parameter | Value | Purpose |
|-----------|-------|---------|
| `image_tag` | `latest` (default) | Which Docker image to deploy |
| `image_tag` | `v1.2.3` | Deploy specific version |
| `dry_run` | `false` (default) | Actually deploy changes |
| `dry_run` | `true` | Simulate deployment without applying |

---

## Deployment Stages

### 1. Pre-Deployment Checks

Verifies system readiness before deployment:

```
✅ Verify image exists in container registry
✅ Check current production state
✅ Create GitHub deployment record
```

**If fails:** Deployment stops. Fix the issue and retry.

### 2. Database Migrations

Applies pending database migrations:

```
✅ Link to Supabase project
✅ Validate migrations
✅ Push migrations to production DB
```

**If fails:** Deployment stops. Rollback manually. Check migration syntax.

### 3. Service Deployment

Deploys code to all platforms:

```
✅ Deploy API to Vercel (production)
✅ Deploy workers to Railway (production)
```

**If fails:** Stops before health checks (safe state).

### 4. Health Checks (10 retries, 60 sec timeout)

Verifies all services are healthy:

```
GET /api/systems/health → HTTP 200
GET /api/health → HTTP 200
GET /api/carousel/metrics → HTTP 200
Database connection verified
```

**If fails after 10 retries:** Automatic rollback triggered.

### 5. Smoke Tests

Runs automated tests against production:

```
✅ Auth flow (login/logout)
✅ API endpoints respond correctly
✅ Database reads/writes work
✅ Critical features functional
```

**If fails:** Deployment marked as failed. Manual review required.

### 6. Deployment Status

Final status recorded:

- ✅ **Success:** Deployment live, monitoring active
- ❌ **Failure:** Rollback initiated, Slack alert sent

---

## Health Checks & Monitoring

### Built-in Health Endpoints

The deployment workflow checks these automatically:

```bash
# System health (14 rational systems)
curl https://api.feedia.com/api/systems/health

# API health
curl https://api.feedia.com/api/health

# Carousel metrics
curl https://api.feedia.com/api/carousel/metrics
```

All must return HTTP 200 within the timeout.

### Manual Health Check

```bash
# Quick health check script
curl -v https://api.feedia.com/api/systems/health | jq .

# Check database
npm run db:health

# Check Redis/cache
npm run cache:health
```

### Monitoring During Deployment

**GitHub Actions:**
```bash
gh run watch  # Real-time deployment logs
gh run view <RUN_ID> --log  # View completed run
```

**Slack** (if configured):
- Deployment started notification
- Health check status updates
- Final success/failure alert with details

---

## Troubleshooting Deployments

### Deployment Stuck or Timing Out

```bash
# Check which step is hanging
gh run view <RUN_ID> --log | grep -A 20 "Health Check"

# Common causes:
# - Railway service slow to restart (wait 60+ sec)
# - Health endpoint not responding (check API logs)
# - Network connectivity issue (verify publicly accessible)
```

**Fix:** Manually restart the deployment:
```bash
gh workflow run deploy-production-enhanced.yml --ref main \
  -f dry_run=false -f image_tag=latest
```

### Health Checks Failed

```bash
# Check API logs
railway logs --service feedia-workers

# Test health endpoint manually
curl https://api.feedia.com/api/systems/health -v

# Database connection failed?
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "SELECT 1"
```

**Fix:** 
1. If API crashed, restart service:
   ```bash
   railway restart --service feedia-workers --environment production
   ```
2. If database issue, check migrations succeeded:
   ```bash
   npm run db:migrate --environment production
   ```

### Smoke Tests Failed

```bash
# View test failures
gh run view <RUN_ID> --log | grep -A 50 "Smoke Tests"

# Run tests locally against production (if safe)
PUBLIC_BASE_URL=https://api.feedia.com npm run test:smoke
```

**Fix:** Check specific endpoint that failed and debug:
```bash
curl https://api.feedia.com/api/carousel/generate -X POST \
  -H "Content-Type: application/json" \
  -d '{"prompt": "test"}'
```

### Need to Rollback

If deployment causes production issues:

**Option 1: Automatic Rollback (if health check caught it)**
- Already triggered during deployment
- Slack notification sent
- Monitor for stability

**Option 2: Manual Rollback**
```bash
# Deploy the previous known-good version
git tag v1.2.2  # Assume v1.2.2 was stable
git push origin v1.2.2

# This triggers deployment of v1.2.2
```

**Option 3: Emergency Restart**
```bash
# Just restart current service (might fix transient issues)
railway restart --service feedia-workers --environment production

# Wait 60 sec and verify
sleep 60
curl https://api.feedia.com/api/systems/health
```

---

## Pre-Release Checklist

Before deploying to production, verify:

- [ ] Code reviewed and approved (1+ approval)
- [ ] All CI checks passing (lint, test, type, security)
- [ ] Staging deployed and smoke tests passing
- [ ] Database migrations tested in staging
- [ ] Feature flags configured (if needed)
- [ ] Secrets/env vars updated in production
- [ ] On-call engineer available for monitoring
- [ ] Release notes prepared (what changed?)
- [ ] Rollback plan documented (how to revert?)

---

## Release Naming Convention

Use semantic versioning for tags:

```
v{MAJOR}.{MINOR}.{PATCH}[-{PRERELEASE}]

v1.0.0      # Major version (breaking changes)
v1.1.0      # Minor version (new features)
v1.1.1      # Patch version (bug fixes)
v1.1.1-rc1  # Release candidate
v1.1.1-beta # Beta release
```

Example deployments:

```bash
# Standard release
git tag -a v1.2.0 -m "Release: carousel v2, new hooks"

# Hotfix for production bug
git tag -a v1.2.1 -m "Fix: carousel metrics race condition"

# Beta feature
git tag -a v2.0.0-beta -m "Preview: new AI pipeline (beta)"
```

---

## Monitoring Post-Deployment

### First 5 Minutes

- Health dashboard: **Dashboard URL** (if configured)
- API logs: `railway logs --follow`
- Error tracking: Sentry dashboard

### First Hour

- Monitor error rate (should be <1%)
- Check database query performance
- Verify no unexpected data loss
- Monitor API response times

### Full Day

- Smoke test suite results
- User-facing feature validation
- Performance metrics (CPU, memory, DB)
- Error/exception aggregation

---

## Emergency Procedures

### Production Down (Not Responding)

1. Check if service crashed:
   ```bash
   railway status --service feedia-workers
   ```

2. Restart service:
   ```bash
   railway restart --service feedia-workers --environment production
   ```

3. If restart doesn't work, rollback to previous version:
   ```bash
   git tag v1.2.0-rollback -m "Emergency rollback to v1.2.0"
   git push origin v1.2.0-rollback
   ```

### High Error Rate (>5%)

1. Check logs for recurring error:
   ```bash
   railway logs --service feedia-workers | grep ERROR | head -20
   ```

2. If deployment-caused, rollback:
   - Check which version introduced errors
   - Deploy stable previous version via tag

3. If infra-caused:
   - Scale up resources
   - Restart services
   - Check database connection pool

### Database Issues

1. Check database connectivity:
   ```bash
   psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "SELECT 1"
   ```

2. Check for locked tables:
   ```bash
   psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "SELECT * FROM pg_locks"
   ```

3. Restart database connection:
   ```bash
   npm run db:reconnect --environment production
   ```

---

## See Also

- [Branch Protection Rules](./BRANCH_PROTECTION.md) — PR requirements before merge
- [CI/CD Workflows](./) — GitHub Actions configuration
- [Railway Documentation](https://docs.railway.app) — Platform docs
- [Vercel Documentation](https://vercel.com/docs) — Frontend deployment
