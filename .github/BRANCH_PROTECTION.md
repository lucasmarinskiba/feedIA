# Branch Protection Rules Setup

This guide configures GitHub branch protection to enforce production-quality standards before merging to `main`.

## Overview

Branch protection enforces:
- ✅ All CI checks must pass (lint, type check, tests, security)
- ✅ Require 1 approval from code reviewers
- ✅ Dismiss stale pull request approvals when new commits pushed
- ✅ Require status checks to be up to date before merging
- ✅ Restrict who can push to main (admins only)

## Setup Instructions

### Step 1: Access Branch Protection Settings

1. Go to GitHub repository: `lucasdmarin/feedIA`
2. Navigate to **Settings** → **Branches**
3. Under "Branch protection rules", click **Add rule**

### Step 2: Configure Protection for `main`

Enter the following settings:

#### Basic Settings
- **Branch name pattern:** `main`
- ☑️ **Require a pull request before merging**
  - Required approving reviews: `1`
  - ☑️ Dismiss stale pull request approvals when new commits are pushed
  - ☑️ Require approval of the most recent reviewable push
  - ☑️ Require code owner reviews
- ☑️ **Require status checks to pass before merging**
  - ☑️ Require branches to be up to date before merging

#### Required Status Checks

Select the following checks that must pass before merge:

- `CI Enhanced / Lint & Format Check`
- `CI Enhanced / TypeScript Type Check`
- `CI Enhanced / Build & Test`
- `CI Enhanced / Security Audit`
- `CI Enhanced / Trivy Filesystem Scan`
- `CI Enhanced / CI Status`

OR (if using existing CI):

- `CI / verify`
- `CI / docker`
- `CI / security-audit`

#### Push Restrictions
- ☑️ **Restrict who can push to matching branches**
  - Select: Administrators can always push to this branch

#### Additional Settings
- ☑️ **Include administrators** (optional: uncheck if admins should bypass)
- ☑️ **Require branches to be up to date before merging**
- ☑️ **Allow auto-merge** (optional, for convenience)

### Step 3: Save Rule

Click **Create** to save the branch protection rule.

## For `develop` Branch (Optional)

Create a similar rule for `develop` but with less strict requirements:

- Require 1 approval ✅
- Require passing CI ✅
- Do NOT require status checks to be up-to-date (faster iteration)
- Do NOT restrict push access (teams can directly push fixes)

---

## GitHub Actions Status Checks Reference

### CI Enhanced Workflow (`ci-enhanced.yml`)

This workflow runs on every PR and push to `main`:

| Check Name | Runs On | Failure Behavior |
|-----------|---------|-----------------|
| `Lint & Format Check` | All PRs | Blocks merge + PR comment |
| `TypeScript Type Check` | All PRs | Blocks merge + PR comment |
| `Build & Test` | All PRs | Blocks merge + artifacts uploaded |
| `Security Audit` | All PRs | Warns (non-blocking) |
| `Trivy Filesystem Scan` | All PRs | Warns (non-blocking) |
| `CI Status` | All PRs | Summary check, blocks if others failed |

### Deploy Workflows

- **Deploy Staging:** Runs automatically after CI passes on `main`
- **Deploy Production:** Triggered by tag push (`v*`) or manual dispatch
  - Includes health checks & smoke tests
  - Can rollback on failure

---

## How to Enforce Locally

Before pushing, run:

```bash
# Lint & format
npm run lint:fix
npm run format

# Type check
npm run typecheck

# Tests
npm test

# Full verification (as in CI)
npm run verify
```

Or use git hooks (already configured with Husky):

```bash
# Install pre-commit hook
npm install  # Runs `prepare` script which sets up hooks
```

---

## Bypassing Branch Protection (Emergency Only)

If you need to bypass branch protection (e.g., critical production hotfix):

1. **Only admins** can push to `main` directly
2. Create a short-lived exception:
   - Go to **Settings** → **Branches** → Edit rule
   - Temporarily disable the rule
   - Push the emergency fix
   - Re-enable the rule immediately

3. **Document the reason** in a GitHub issue

---

## Reviewing PRs

### For Reviewers

When reviewing a PR:

1. ✅ Verify all checks in the PR status are passing
2. ✅ Review code for logic, security, style
3. ✅ Test locally if needed:
   ```bash
   git fetch origin pull/NUMBER/head:pr-review
   git checkout pr-review
   npm install && npm run verify
   ```
4. ✅ Approve when confident

### For PR Authors

1. Ensure all CI checks pass before asking for review
2. Respond to review feedback promptly
3. Don't force-push after reviewers have approved (creates stale approval if rule set)
4. Use "Squash and merge" for cleaner main branch history

---

## Monitoring

### View Branch Protection Status

```bash
# Via GitHub CLI
gh api repos/{owner}/{repo}/branches/main/protection

# Via REST API
curl -H "Authorization: token YOUR_TOKEN" \
  https://api.github.com/repos/lucasdmarin/feedIA/branches/main/protection
```

### Recent Deployments

- Dashboard: **Actions** → **Deploy Production** tab
- Rollback history: **Deployments** → Production environment

---

## Troubleshooting

### "Required status checks failed"

This means one of the CI workflows is failing. Click the check details to see why:

- **Lint errors:** Run `npm run lint:fix`
- **Type errors:** Check `npm run typecheck` output
- **Test failures:** Run `npm test` locally to debug
- **Security warnings:** Review Trivy scan results

### "Waiting for status checks"

This typically means:
- GitHub Actions runners are busy
- A status check is still running (check Actions tab)
- A required check hasn't reported yet (5-10 min typical)

### "This branch has 1 behind by 5 commits"

The PR branch is out of date with `main`. Click "Update branch" button on the PR to sync.

---

## See Also

- [GitHub Branch Protection Docs](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches)
- [DEPLOYMENT.md](./DEPLOYMENT.md) — Production deployment runbook
- [CI/CD Workflows](./) — Workflow definitions
