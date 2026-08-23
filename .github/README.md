# GitHub Administration & CI/CD

This directory contains GitHub-specific configurations for FeedIA:

- **Workflows** — GitHub Actions CI/CD pipelines
- **Documentation** — Setup guides and runbooks

## Quick Navigation

### For Developers

- **[CI/CD Setup Guide](./CI_CD_SETUP.md)** — Configure the system (5 min)
- **[Branch Protection Rules](./BRANCH_PROTECTION.md)** — Understand PR requirements

### For DevOps/Maintainers

- **[Deployment Runbook](./DEPLOYMENT.md)** — How to deploy and troubleshoot
- **[Workflow Directory](./workflows/)** — All GitHub Actions configurations

### Workflows

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| **ci-enhanced.yml** | Every push/PR | Lint, type-check, build, test, security |
| **deploy-staging.yml** | After CI passes on main | Auto-deploy to staging |
| **deploy-production-enhanced.yml** | Tag push or manual | Deploy to production with health checks |
| **notify-slack.yml** | Workflow completion | Send Slack notifications |

---

## System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Development Flow                          │
└─────────────────────────────────────────────────────────────┘
                             │
                             ↓
                  Create feature branch
                    Commit & Push
                             │
                             ↓
┌─────────────────────────────────────────────────────────────┐
│                   CI Pipeline (PR)                           │
│  • Lint (ESLint)                                             │
│  • Format Check (Prettier)                                   │
│  • TypeScript Compile                                        │
│  • Build & Test (Vitest)                                     │
│  • Code Coverage (Codecov)                                   │
│  • Security Audit (npm audit)                                │
│  • Trivy Scan (SAST)                                         │
│  • Docker Build                                              │
└─────────────────────────────────────────────────────────────┘
                             │
                    ✅ All Checks Pass?
                   /              \
                  ✅               ❌
                  │                │
                  ↓                ↓
          Reviewable         Fix Issues
         by Maintainers      Recommit
                  │                │
                  └─────────┬───────┘
                            │
                            ↓
                 Review & Approve (1+)
                            │
                            ↓
┌─────────────────────────────────────────────────────────────┐
│           Merge to main + Auto Deploy to Staging             │
│  • Database Migrations Run                                   │
│  • Frontend deploys to Vercel                                │
│  • Workers deploy to Railway                                 │
│  • Health Checks Verify (10 retries)                         │
│  • Smoke Tests Confirm                                       │
│  • Slack Notification Sent                                   │
└─────────────────────────────────────────────────────────────┘
                             │
                             ↓
                  ✅ Staging Ready for QA
                             │
                             ↓
                        Tag Release
                    (git tag v1.2.3)
                             │
                             ↓
┌─────────────────────────────────────────────────────────────┐
│         Production Deployment + Verification                 │
│  • Pre-deployment checks                                      │
│  • Database Migrations                                        │
│  • Deploy API & Workers                                       │
│  • Health Checks (10 retries, 60 sec timeout)                 │
│  • Smoke Tests (critical paths)                               │
│  • Auto-Rollback (if any step fails)                          │
│  • Slack Alerts + Details                                     │
└─────────────────────────────────────────────────────────────┘
                             │
                    ✅ Production Live!
```

---

## Key Features

### Continuous Integration

✅ **Code Quality**
- ESLint (style & error detection)
- Prettier (formatting)
- TypeScript strict mode
- Vitest (unit & integration tests)

✅ **Security**
- npm audit (dependency vulnerabilities)
- Trivy filesystem scan (secrets, misconfigs)
- Docker image scan
- SBOM generation

✅ **Build & Deploy**
- Multi-stage Docker builds
- Push to GitHub Container Registry
- Deploy staging automatically
- Production with approval gates

### Automated Checks

All PRs require:
1. ✅ Lint passes
2. ✅ Type check passes
3. ✅ Tests pass
4. ✅ Security scan passes (warnings OK)
5. ✅ Build succeeds
6. ✅ One approval from reviewer

### Deployment Stages

| Stage | Trigger | Approval | Rollback |
|-------|---------|----------|----------|
| **Staging** | After CI passes on main | None | Manual |
| **Production** | Tag push or manual | Environment approval | Automatic |

### Health Checks

Post-deployment verification:

- `/api/systems/health` — System status
- `/api/health` — API health
- `/api/carousel/metrics` — Feature health
- Database connectivity
- External service integration

### Rollback Strategy

**Automatic rollback if:**
- Health checks fail (10 retries exhausted)
- Smoke tests detect errors
- Any deployment step fails

**Manual rollback:**
```bash
# Deploy previous version
git tag v1.2.0-rollback
git push origin v1.2.0-rollback
```

---

## Setup Checklist

- [ ] **Verify secrets configured** — See [CI/CD Setup Guide](./CI_CD_SETUP.md)
  - [ ] `GITHUB_TOKEN` (automatic)
  - [ ] `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`
  - [ ] `RAILWAY_TOKEN_PROD`
  - [ ] `SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_REF_PROD`
  - [ ] `SLACK_WEBHOOK_URL`
  - [ ] Test credentials for smoke tests

- [ ] **Configure branch protection** — See [Branch Protection Rules](./BRANCH_PROTECTION.md)
  - [ ] Require CI to pass
  - [ ] Require 1 approval
  - [ ] Restrict push access

- [ ] **Setup GitHub Environments**
  - [ ] `staging` — No approvals required
  - [ ] `production` — Require 1 approval

- [ ] **Test the pipeline**
  - [ ] Push to test branch, verify CI runs
  - [ ] Create PR, verify all checks
  - [ ] Merge & verify staging deploys
  - [ ] Create tag & verify production flow

---

## Common Tasks

### Run a PR Locally

```bash
git fetch origin pull/<PR_NUMBER>/head:pr-<PR_NUMBER>
git checkout pr-<PR_NUMBER>
npm ci && npm run verify
```

### Deploy to Staging (Manual)

```bash
# Auto-deploys after CI passes on main
# Or manually:
gh workflow run deploy-staging.yml --ref main
```

### Deploy to Production

```bash
# Via tag (recommended)
git tag -a v1.2.3 -m "Release v1.2.3"
git push origin v1.2.3

# Or manual dispatch
gh workflow run deploy-production-enhanced.yml \
  -f image_tag=latest \
  -f dry_run=false
```

### Check Deployment Status

```bash
gh run list --workflow=deploy-production-enhanced.yml --limit=5
gh run watch <RUN_ID>
gh run view <RUN_ID> --log
```

### Debug a Failing Workflow

```bash
# View run details
gh run view <RUN_ID> --log

# Re-run failed job
gh run rerun <RUN_ID> --failed
```

---

## Monitoring

### GitHub Dashboard
- **Actions** tab — All workflow runs
- **Deployments** — Deployment history per environment
- **Security** — Vulnerability alerts

### Slack (if configured)
- `#deployments` channel — CI/deploy notifications
- Real-time alerts on failures
- Links to logs & deployment details

### Tools
- **Codecov** — Code coverage trends
- **Trivy** — Security scan results in GitHub Security tab
- **Railway Dashboard** — Infrastructure & logs
- **Vercel Dashboard** — Frontend deployments

---

## Troubleshooting

### Workflow Won't Run

```bash
# Check if workflow is enabled
gh workflow list

# Enable it
gh workflow enable ci-enhanced.yml

# Manually trigger
gh workflow run ci-enhanced.yml --ref main
```

### Secret Not Working

```bash
# List secrets (shows names only, not values)
gh secret list

# Update a secret
gh secret set MY_SECRET -b "new value"

# Remove a secret
gh secret delete MY_SECRET
```

### CI Failure Messages

See [CI/CD Setup Guide](./CI_CD_SETUP.md#troubleshooting-setup) for common issues:
- Lint/format errors
- Type errors
- Test failures
- Security warnings
- Docker build issues

### Deployment Troubleshooting

See [Deployment Runbook](./DEPLOYMENT.md#troubleshooting-deployments) for:
- Health check failures
- Rollback procedures
- Manual recovery steps

---

## References

### GitHub Actions
- [GitHub Actions Docs](https://docs.github.com/en/actions)
- [Workflow Syntax](https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions)

### Deployment Platforms
- [Railway Docs](https://docs.railway.app)
- [Vercel Docs](https://vercel.com/docs)
- [Supabase Docs](https://supabase.com/docs)

### Security
- [Trivy Security Scanner](https://github.com/aquasecurity/trivy)
- [npm audit](https://docs.npmjs.com/cli/v10/commands/npm-audit)
- [GitHub Code Scanning](https://docs.github.com/en/code-security/code-scanning)

---

## Support

### Questions?
1. Check the relevant guide: [CI/CD Setup](./CI_CD_SETUP.md), [Deployment](./DEPLOYMENT.md), [Branch Protection](./BRANCH_PROTECTION.md)
2. View workflow logs: `gh run view <RUN_ID> --log`
3. Check GitHub Status page for platform issues

### Issues?
- Open an issue in GitHub with workflow error logs
- Include the run ID and failed step
- Provide context (what changed, when it started failing)

### Improvements?
- Suggest additions to documentation
- Propose workflow enhancements
- Share what worked for you in the team Slack
