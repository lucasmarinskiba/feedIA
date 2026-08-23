# CI/CD Setup Guide

This guide walks through configuring FeedIA's production-grade CI/CD system.

## Quick Start (5 minutes)

### 1. Verify Workflows Are Active

```bash
# Check if workflows are enabled
gh workflow list

# Enable if needed
gh workflow enable ci-enhanced.yml
gh workflow enable deploy-production-enhanced.yml
gh workflow enable deploy-staging.yml
gh workflow enable notify-slack.yml
```

### 2. Configure Required Secrets

**GitHub Settings** → **Settings** → **Secrets and variables** → **Actions**

Add these secrets:

#### Docker Registry (GitHub Container Registry)
- `GITHUB_TOKEN` — Already provided by GitHub (no action needed)

#### Deployment Platforms

**Vercel:**
- `VERCEL_TOKEN` — [Get token](https://vercel.com/account/tokens)
- `VERCEL_ORG_ID` — Your org ID
- `VERCEL_PROJECT_ID` — Frontend project ID

**Railway:**
- `RAILWAY_TOKEN_PROD` — [Create token](https://railway.app/account/tokens)
- `RAILWAY_TOKEN_STAGING` — Staging token (optional)

**Supabase:**
- `SUPABASE_ACCESS_TOKEN` — [Create token](https://app.supabase.com/account/tokens)
- `SUPABASE_PROJECT_REF_PROD` — Production project ref
- `SUPABASE_PROJECT_REF_STAGING` — Staging project ref (optional)
- `SUPABASE_DB_PASSWORD_PROD` — Database password
- `SUPABASE_DB_PASSWORD_STAGING` — Staging DB password (optional)

**Environment URLs:**
- `PUBLIC_BASE_URL_PROD` — `https://api.feedia.com`
- `PUBLIC_BASE_URL_STAGING` — `https://staging-api.feedia.com`

#### Smoke Tests
- `OWNER_TEST_EMAIL` — Test account email
- `OWNER_TEST_PASSWORD` — Test account password
- `ANTHROPIC_API_KEY` — API key for tests

#### Slack Notifications
- `SLACK_WEBHOOK_URL` — [Create webhook](https://api.slack.com/apps) → Incoming Webhooks

#### Security & Monitoring
- `CODECOV_TOKEN` — [Get token from Codecov](https://codecov.io)
- (Optional) `SENTRY_DSN` — Error tracking

### 3. Configure Branch Protection

See [BRANCH_PROTECTION.md](./BRANCH_PROTECTION.md) for detailed setup.

Quick version:
1. Go to **Settings** → **Branches**
2. Click **Add rule**
3. Pattern: `main`
4. ✅ Require PR before merge
5. ✅ Require 1 approval
6. ✅ Require status checks (select `ci-enhanced / ci-status`)
7. ✅ Restrict push access (admins only)
8. Click **Create**

### 4. Test the Setup

```bash
# Create a test PR
git checkout -b test/ci-setup
echo "# CI/CD Test" >> README.md
git add README.md
git commit -m "test: verify CI/CD pipeline"
git push origin test/ci-setup

# Create PR and verify:
# - Lint check runs
# - Type check runs
# - Build & test runs
# - Security audit runs
# - All checks pass (or fail with clear messages)
```

---

## Detailed Configuration

### Environment Variables vs Secrets

**Secrets** (sensitive, encrypted):
- API keys, tokens, passwords
- Stored in GitHub → **Settings** → **Secrets**
- Never logged or visible in workflow output

**Environment Variables** (public):
- URLs, IDs, configuration
- Stored in GitHub → **Settings** → **Variables**
- Visible in workflow logs

**In Workflow Files:**
```yaml
env:
  NODE_VERSION: '20'  # Public variable

steps:
  - run: echo $NODE_VERSION  # Safe to log
  - run: echo $SLACK_WEBHOOK_URL  # Would expose secret!
    env:
      SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}  # Masked automatically
```

### Adding Organization Secrets (Team Use)

For team-wide access, use organization-level secrets:

1. Go to **Organization** → **Settings** → **Secrets and variables** → **Actions**
2. Add secret (visible to selected repos)
3. In repo: Use same `${{ secrets.SECRET_NAME }}`

**This is recommended for:**
- `SLACK_WEBHOOK_URL` (team notifications)
- `ANTHROPIC_API_KEY` (shared API key)
- `CODECOV_TOKEN` (coverage reports)

### Environments in GitHub

**GitHub Deployments** separates staging & production:

1. Go to **Settings** → **Environments**
2. Create `staging` environment
   - No required reviewers
   - No restrictions
3. Create `production` environment
   - Require at least 1 approver before deployment
   - Restrict to specific branches: `main` only
   - Add production secrets here (if different from staging)

Usage in workflow:
```yaml
jobs:
  deploy-prod:
    environment: production  # Requires approval from Settings
    steps:
      - run: echo "Deploying..."
```

---

## Workflow Explanations

### CI Enhanced (`ci-enhanced.yml`)

Runs on every **push to main/develop** and **every PR**.

**Jobs:**
1. **Lint** — ESLint checks
2. **TypeScript** — `tsc --noEmit`
3. **Build & Test** — `npm run build && npm test`
4. **Security Audit** — npm audit, Trivy
5. **Trivy FS** — Filesystem vulnerability scan
6. **Docker** — (main only) Build & push image
7. **CI Status** — Summary check

**PR Integration:**
- Auto-comments on failures with fixes
- Blocks merge if any step fails
- Uploads build artifacts & coverage

### Deploy Staging (`deploy-staging.yml`)

Runs automatically after CI passes on `main`.

**Flow:**
1. Checkout main
2. Run Supabase migrations
3. Deploy to Vercel (preview)
4. Deploy workers to Railway/Render
5. Wait for restart
6. Run smoke tests

**No manual action needed** — staging is always current.

### Deploy Production Enhanced (`deploy-production-enhanced.yml`)

Triggered by:
- Git tag push (`git push origin v1.2.3`)
- Manual dispatch from Actions tab

**Flow:**
1. **Pre-checks** — Verify image exists, create deployment record
2. **Migrations** — Run DB migrations
3. **Deploy** — Deploy to Vercel & workers
4. **Health checks** — Verify all endpoints (10 retries)
5. **Smoke tests** — Run integration tests
6. **Rollback** — (if any step fails) Automatic rollback initiated

**Health Check Logic:**
```
1st attempt  → Immediate
2nd-10th     → 10 second wait between retries
Timeout      → 5 seconds per request
Total time   → ~100 seconds max
```

### Slack Notifications (`notify-slack.yml`)

Listens for workflow completions and sends notifications:

- CI failed → @channel notification + logs link
- CI passed → Status update + staging deployed
- Staging deployed → Success/failure notification
- Production starting → Alert + ETA
- Production succeeded → Celebration + links
- Production failed → 🚨 Alert + rollback status

**Requires:** `SLACK_WEBHOOK_URL` secret configured.

---

## Common Workflows

### Deploying a New Feature

```bash
# 1. Feature branch (local)
git checkout -b feature/new-carousel
# ... make changes ...
git commit -m "feat: new carousel v2"
git push origin feature/new-carousel

# 2. Create PR on GitHub
# → CI runs automatically
# → Review & approve
# → Merge

# 3. Staging auto-deploys
# → Health checks pass
# → Smoke tests pass
# → Ready for testing

# 4. Release to production
git tag -a v1.2.0 -m "Release: carousel v2"
git push origin v1.2.0

# → Production deployment workflow starts
# → Health checks verify
# → Smoke tests confirm
# → Live! 🎉
```

### Hotfix for Production Bug

```bash
# 1. Fix the bug
git checkout main
git pull
git checkout -b hotfix/carousel-crash
# ... fix bug ...
git commit -m "fix: carousel metrics race condition"
git push origin hotfix/carousel-crash

# 2. Fast-track merge (1 approval, no long review)
gh pr create --title "Hotfix: carousel crash" --body "..."
# → Approve
# → Merge

# 3. Release immediately
git tag -a v1.2.1 -m "Hotfix: carousel race condition"
git push origin v1.2.1

# → Production deployment (expedited)
```

### Emergency Rollback

```bash
# If production is broken:
git tag -a v1.2.0-rollback -m "Rollback to v1.2.0"
git push origin v1.2.0-rollback

# This deploys the v1.2.0 image (if tagged and available)
# OR manually:
gh workflow run deploy-production-enhanced.yml \
  -f image_tag=v1.2.0 -f dry_run=false
```

### Dry Run (Test Deployment)

```bash
# Simulate deployment without actually deploying
gh workflow run deploy-production-enhanced.yml \
  -f image_tag=latest \
  -f dry_run=true

# This runs all pre-checks but stops before:
# - Vercel deploy
# - Worker deployment
# - Health checks (not running)
# - Smoke tests (not running)
```

---

## Troubleshooting Setup

### Secret Not Found Error

```
Error: Secrets are not available on workflow runs for pull requests from forked repositories
```

**Fix:** Use a personal access token (PAT) with repo access for PRs from forks.

### Workflow Not Triggering

```bash
# Check if workflow is enabled
gh workflow list

# Enable it
gh workflow enable ci-enhanced.yml

# Check recent runs
gh run list --workflow=ci-enhanced.yml --limit=5
```

### Docker Image Push Fails

```
Error: unauthorized: authentication required
```

**Fix:**
1. Verify `GITHUB_TOKEN` has `packages: write` permission
2. Check if workflow has permission:
   ```yaml
   permissions:
     packages: write
   ```

### Slack Webhook Not Working

```
Error: Invalid webhook URL
```

**Fix:**
1. Verify webhook URL is correct: `https://hooks.slack.com/services/...`
2. Check if webhook is active in Slack app settings
3. Verify secret is set: `gh secret list | grep SLACK`

### Health Check Timeout

```
Error: API health check failed after 10 attempts
```

**Causes:**
- Service taking >60 seconds to restart
- Health endpoint not responding
- Network connectivity issue

**Fix:**
1. Check Railway logs: `railway logs --follow`
2. Verify health endpoint: `curl https://api.feedia.com/api/systems/health`
3. Increase retry timeout in workflow (currently 60 sec)

---

## Best Practices

### Commit Messages

Use conventional commits for automatic versioning:

```
feat: add new carousel hooks           → v1.1.0 (minor)
fix: race condition in metrics         → v1.0.1 (patch)
BREAKING CHANGE: new API contract     → v2.0.0 (major)
```

### Release Cadence

**Recommended:**
- **Patch (v1.0.1)**: Hotfixes, bug fixes → deploy same day
- **Minor (v1.1.0)**: New features → deploy weekly
- **Major (v2.0.0)**: Breaking changes → deploy monthly with planning

### Monitoring Post-Deployment

After production deploy:

```bash
# Check health
curl https://api.feedia.com/api/systems/health | jq .

# Watch logs for errors
railway logs --follow --service feedia-workers

# Monitor error rate (Sentry, if configured)
```

### Rollback Readiness

Always keep previous version available:

```bash
# Tag stable releases
git tag -a v1.1.0 -m "Stable: carousel v2"

# Keep v1.0.5 image in registry (for quick rollback)
docker pull ghcr.io/lucasdmarin/feedIA/workers:v1.0.5
```

---

## Security Considerations

### Principle of Least Privilege

1. **Secrets scope:**
   - Use repo secrets for repo-specific (API keys)
   - Use org secrets for shared (Slack webhook)

2. **Deployment environment:**
   - Require approval for production (GitHub Environments)
   - Restrict production secrets visibility

3. **GitHub Actions permissions:**
   - Explicitly declare `permissions:` in workflows
   - Use `$GITHUB_TOKEN` scoped to job requirements

### Credential Rotation

1. **Monthly rotation:**
   - Rotate Vercel tokens
   - Rotate Railway tokens
   - Rotate API keys

2. **Immediate rotation (if leaked):**
   - GitHub secret exposed in logs → Invalidate immediately
   - Update all references

### Audit Trail

All deployments are logged:
- GitHub Actions run history
- Slack notifications (if enabled)
- GitHub Deployments API
- Railway deployment records

---

## Monitoring & Alerts

### GitHub Actions Monitoring

```bash
# Recent workflow runs
gh run list --workflow=deploy-production-enhanced.yml --limit=10

# Watch live run
gh run watch <RUN_ID>

# View detailed logs
gh run view <RUN_ID> --log
```

### Slack Channel Setup (Recommended)

1. Create `#deployments` channel in Slack
2. Add webhook to channel
3. Store URL in `SLACK_WEBHOOK_URL` secret
4. All CI/deploy events post to channel

### Metrics to Monitor

Post-deployment (first hour):
- Error rate < 1%
- Response times normal
- Database queries responsive
- Memory usage stable

---

## See Also

- [Branch Protection Rules](./BRANCH_PROTECTION.md)
- [Deployment Runbook](./DEPLOYMENT.md)
- [GitHub Actions Docs](https://docs.github.com/en/actions)
- [Railway Docs](https://docs.railway.app)
- [Vercel Docs](https://vercel.com/docs)
