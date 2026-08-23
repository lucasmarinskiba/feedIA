# CI/CD Quick Start Checklist

Complete this checklist to activate production-grade CI/CD for FeedIA.

---

## 1. Repository Setup (5 minutes)

- [ ] Clone repo: `git clone https://github.com/lucasdmarin/feedIA.git`
- [ ] Verify workflows directory: `ls -la .github/workflows/`
- [ ] Check workflows are detected: `gh workflow list`

---

## 2. GitHub Secrets Configuration (10 minutes)

Go to **Settings** → **Secrets and variables** → **Actions**

### Docker Registry (Auto-provided)
- ✅ `GITHUB_TOKEN` — Already available

### Vercel (Frontend Deployment)
- [ ] Create token: https://vercel.com/account/tokens
- [ ] Add secret `VERCEL_TOKEN` with the token
- [ ] Add variable `VERCEL_ORG_ID` with your org ID
- [ ] Add variable `VERCEL_PROJECT_ID` with frontend project ID

### Railway (Worker Deployment)
- [ ] Create token: https://railway.app/account/tokens
- [ ] Add secret `RAILWAY_TOKEN_PROD` with token

### Supabase (Database)
- [ ] Create token: https://app.supabase.com/account/tokens
- [ ] Add secret `SUPABASE_ACCESS_TOKEN` with token
- [ ] Add variable `SUPABASE_PROJECT_REF_PROD` with project ref
- [ ] Add secret `SUPABASE_DB_PASSWORD_PROD` with password

### Environment URLs
- [ ] Add variable `PUBLIC_BASE_URL_PROD` = `https://api.feedia.com`
- [ ] Add variable `PUBLIC_BASE_URL_STAGING` = `https://staging-api.feedia.com`

### Smoke Tests (Integration Testing)
- [ ] Add secret `OWNER_TEST_EMAIL` = test account email
- [ ] Add secret `OWNER_TEST_PASSWORD` = test account password
- [ ] Add secret `ANTHROPIC_API_KEY` = API key for tests

### Slack Notifications (Optional)
- [ ] Create Slack app: https://api.slack.com/apps
- [ ] Enable Incoming Webhooks
- [ ] Add secret `SLACK_WEBHOOK_URL` with webhook URL

### Code Quality (Optional)
- [ ] Create Codecov account: https://codecov.io
- [ ] Add secret `CODECOV_TOKEN` with token

---

## 3. Branch Protection Configuration (5 minutes)

Go to **Settings** → **Branches** → **Add rule**

- [ ] Pattern: `main`
- [ ] ✅ Require a pull request before merging
- [ ] ✅ Required approving reviews: `1`
- [ ] ✅ Dismiss stale pull request approvals
- [ ] ✅ Require status checks to pass before merging
- [ ] ✅ Require branches to be up to date
- [ ] ✅ Restrict who can push to matching branches (Admins only)
- [ ] Click **Create**

### Select Required Status Checks

Choose these checks (run CI workflow to see actual names):
- `CI Enhanced / ci-status` (summary check)
- Or individual checks:
  - `CI Enhanced / Lint & Format Check`
  - `CI Enhanced / TypeScript Type Check`
  - `CI Enhanced / Build & Test`

---

## 4. GitHub Environments (3 minutes)

Go to **Settings** → **Environments**

### Staging Environment
- [ ] Click **New environment**
- [ ] Name: `staging`
- [ ] No required reviewers
- [ ] No restrictions
- [ ] Click **Save**

### Production Environment
- [ ] Click **New environment**
- [ ] Name: `production`
- [ ] **✅ Require reviewers:** Add your team
- [ ] **✅ Restrict to branches:** Select `main` only
- [ ] Click **Save**

---

## 5. Test the Setup (10 minutes)

### Test CI Workflow

```bash
# Create a test branch
git checkout -b test/ci-setup
echo "# CI Test" >> README.md
git add README.md
git commit -m "test: verify CI runs"
git push origin test/ci-setup

# Create PR
gh pr create --title "Test CI Setup" --body "Verify CI workflow runs"
```

Check GitHub Actions:
- [ ] CI Enhanced workflow starts automatically
- [ ] All checks run (lint, type, build, test, security)
- [ ] Results appear on PR status

If all pass: ✅ CI is working!

### Test Branch Protection

```bash
# Try to merge without approval (should fail)
gh pr merge --auto --squash

# Should see: "Pull request cannot be merged: required status checks"
```

Good! Protection is enforced.

### Clean Up Test PR

```bash
gh pr close <PR_NUMBER>
git checkout main
git branch -D test/ci-setup
git push origin --delete test/ci-setup
```

---

## 6. Deploy to Staging (5 minutes)

Staging should auto-deploy after CI passes on main.

### Verify Staging Auto-Deploy

```bash
# Check deploy-staging workflow
gh workflow list | grep "Deploy Staging"

# View recent staging deployments
gh run list --workflow=deploy-staging.yml --limit=3
```

Expected: "Deploy Staging" triggers automatically after "CI Enhanced" succeeds on main.

If not: Manually trigger:
```bash
gh workflow run deploy-staging.yml --ref main
```

Monitor:
```bash
gh run watch  # Real-time logs
```

---

## 7. Configure Production Deployment (3 minutes)

### Option A: Tag-Based Deployment (Recommended)

```bash
# Create version tag
git tag -a v1.0.0 -m "Release: v1.0.0"
git push origin v1.0.0
```

This triggers `deploy-production-enhanced.yml` automatically.

### Option B: Manual Dispatch

Go to **Actions** → **Deploy Production Enhanced** → **Run workflow**

Enter:
- `image_tag`: latest (or specific version)
- `dry_run`: false

Click **Run workflow**

---

## 8. Verify Production Deployment (5 minutes)

```bash
# Watch deployment
gh run watch

# Or check status
gh run list --workflow=deploy-production-enhanced.yml --limit=1

# View logs if needed
gh run view <RUN_ID> --log
```

Deployment includes:
- Pre-deployment checks
- Database migrations
- Service deployment
- Health checks (10 retries)
- Smoke tests
- Slack notification (if configured)

Expected result: ✅ Deployment successful or 🔄 Auto-rollback triggered

---

## 9. Monitor Production (Ongoing)

### Daily Checks

```bash
# Check health
curl https://api.feedia.com/api/systems/health | jq .

# View recent deployments
gh run list --workflow=deploy-production-enhanced.yml --limit=10

# Watch logs
railway logs --follow --service feedia-workers
```

### Slack Monitoring (if enabled)

- Join `#deployments` channel
- Receive notifications on:
  - CI failures
  - Staging deployments
  - Production deployments
  - Rollbacks

### GitHub Dashboard

- **Actions** tab: All workflow runs
- **Deployments**: Deployment history
- **Security**: Vulnerability alerts

---

## 10. Team Communication (2 minutes)

- [ ] Share [README.md](./README.md) with team
- [ ] Share [DEPLOYMENT.md](./DEPLOYMENT.md) with maintainers
- [ ] Share [BRANCH_PROTECTION.md](./BRANCH_PROTECTION.md) with developers
- [ ] Post in team chat: "CI/CD now live! See .github/README.md"

---

## Quick Reference Commands

### View Workflows
```bash
gh workflow list
gh workflow view ci-enhanced.yml
```

### Run Workflows
```bash
gh workflow run ci-enhanced.yml --ref main
gh workflow run deploy-staging.yml --ref main
gh workflow run deploy-production-enhanced.yml -f dry_run=true
```

### Check Status
```bash
gh run list --limit=10
gh run watch  # Real-time watch
gh run view <RUN_ID>
```

### Manage Secrets
```bash
gh secret list
gh secret set MY_SECRET -b "value"
gh secret delete MY_SECRET
```

### Manage Branches
```bash
gh api repos/{owner}/{repo}/branches/main/protection
```

---

## Troubleshooting Quick Fixes

| Issue | Fix |
|-------|-----|
| Workflow not running | `gh workflow enable <workflow_name>` |
| Secret not found | Verify name matches exactly (case-sensitive) |
| Health check timeout | Wait 60+ seconds or check `railway logs` |
| CI failing on PR | Run `npm run verify` locally to debug |
| Can't merge PR | Check branch protection status in PR |
| Deployment stuck | Check `gh run watch` logs or `railway logs` |

---

## Success Criteria

- [ ] ✅ All workflows appear in GitHub Actions
- [ ] ✅ CI runs on every PR
- [ ] ✅ Branch protection blocks merges without approval
- [ ] ✅ Staging auto-deploys after CI passes
- [ ] ✅ Production deploys on tag push
- [ ] ✅ Health checks verify deployment success
- [ ] ✅ Slack notifications work (optional but recommended)
- [ ] ✅ Team can deploy safely with automated checks

---

## What's Next?

1. **Run your first deployment:**
   ```bash
   git tag -a v1.0.0 -m "Initial production release"
   git push origin v1.0.0
   ```

2. **Monitor the deployment:**
   ```bash
   gh run watch
   ```

3. **Verify production:**
   ```bash
   curl https://api.feedia.com/api/systems/health
   ```

4. **Celebrate! 🎉**
   Your production-grade CI/CD is live.

---

## Documentation

- **[CI/CD Setup Guide](./CI_CD_SETUP.md)** — Detailed configuration
- **[Deployment Runbook](./DEPLOYMENT.md)** — How to deploy & troubleshoot
- **[Branch Protection Rules](./BRANCH_PROTECTION.md)** — PR requirements
- **[README](./README.md)** — System overview

---

## Questions?

- Check the relevant documentation
- View workflow logs: `gh run view <RUN_ID> --log`
- Post in team Slack
- Open GitHub issue with error details
