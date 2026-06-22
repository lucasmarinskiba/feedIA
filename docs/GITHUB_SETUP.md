# GitHub Setup Guide — FeedIA

This guide covers the manual steps required on GitHub and external services after the code is in place.

---

## 1. Repository basics

1. Create a private repository on GitHub.
2. Push the code:
   ```bash
   git init
   git add .
   git commit -m "chore: initial feedia setup"
   git branch -M main
   git remote add origin https://github.com/<owner>/<repo>.git
   git push -u origin main
   ```

## 2. GitHub Secrets (automated with script)

### Prepare environment files

```bash
cp .env.staging.example .env.staging
cp .env.production.example .env.production
cp .env.repo-secrets.example .env.repo-secrets
```

Fill in the real values in all three files.

### Set secrets via GitHub CLI

```bash
gh auth login
node scripts/setup-github-secrets.mjs
```

This creates:

- Environment `staging` with secrets from `.env.staging`
- Environment `production` with secrets from `.env.production`
- Repository-level secrets from `.env.repo-secrets`

### Manual fallback

If you don't have `gh` installed, go to:

- **Settings → Secrets and variables → Actions → Environments**
- Create `staging` and `production` environments.
- Add secrets manually for each environment.

Required secrets per environment:

| Secret                                                         | Staging | Production |
| -------------------------------------------------------------- | ------- | ---------- |
| `SUPABASE_URL`                                                 | ✅      | ✅         |
| `SUPABASE_ANON_KEY`                                            | ✅      | ✅         |
| `SUPABASE_SERVICE_ROLE_KEY`                                    | ✅      | ✅         |
| `SUPABASE_PROJECT_REF_*`                                       | ✅      | ✅         |
| `SUPABASE_DB_PASSWORD_*`                                       | ✅      | ✅         |
| `REDIS_URL`                                                    | ✅      | ✅         |
| `SESSION_SECRET`                                               | ✅      | ✅         |
| `ANTHROPIC_API_KEY`                                            | ✅      | ✅         |
| `PUBLIC_BASE_URL_*`                                            | ✅      | ✅         |
| `RENDER_DEPLOY_HOOK_*` / `RAILWAY_TOKEN_*` / `FLY_API_TOKEN_*` | one of  | one of     |
| `OWNER_TEST_EMAIL`                                             | ✅      | ✅         |
| `OWNER_TEST_PASSWORD`                                          | ✅      | ✅         |

Repository-level secrets:

- `SUPABASE_ACCESS_TOKEN`
- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`
- `ADMIN_WEBHOOK_URL` (optional)
- `BACKUP_S3_*` (optional)

## 3. Enable Dependabot

1. Go to **Settings → Code security and analysis**.
2. Enable:
   - **Dependabot alerts**
   - **Dependabot security updates**
   - **Dependabot version updates**

The `.github/dependabot.yml` file is already in the repo.

## 4. Enable secret scanning

1. Go to **Settings → Code security and analysis**.
2. Enable:
   - **Secret scanning**
   - **Push protection**

The `.github/workflows/secret-scan.yml` workflow will also run TruffleHog on each PR.

## 5. Configure environments

Create two environments:

- `staging`
- `production`

For `production`, enable **Required reviewers** so deploys need manual approval.

## 6. Branch protection

For `main`:

1. Go to **Settings → Branches**.
2. Add rule for `main`:
   - **Require a pull request before merging**
   - **Require status checks to pass before merging**
     - Select `CI / Lint, Typecheck, Build & Test`
   - **Restrict pushes that create files larger than 100 MB**

## 7. Vercel project

1. Import the repo on https://vercel.com.
2. Framework preset: **Other**.
3. Build command: `node scripts/build-static.mjs`.
4. Output directory: `dist-static`.
5. Add environment variables (same as GitHub `production` env):
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `REDIS_URL`
   - `SESSION_SECRET`
   - `ANTHROPIC_API_KEY`
6. Copy `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`, and create a token for `VERCEL_TOKEN`.

## 8. Workers host

### Render

1. Create Blueprint from repo.
2. Set environment variables from GitHub `production` env.
3. Copy deploy hook URL to `RENDER_DEPLOY_HOOK_PROD`.

### Railway

1. Create project from repo.
2. Set variables in Railway dashboard.
3. Create token and set `RAILWAY_TOKEN_PROD`.

### Fly.io

```bash
fly launch --name feedia-workers
fly secrets set SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... REDIS_URL=... ANTHROPIC_API_KEY=...
fly deploy
```

Create token and set `FLY_API_TOKEN_PROD`.

## 9. Status page (Upptime)

```bash
node scripts/setup-status-page.mjs <owner/repo>
```

Then:

1. Create a new repo from https://github.com/upptime/upptime.
2. Copy `.github/status-page/upptime.yml` to `.upptimerc.yml` in the new repo.
3. Enable GitHub Actions in the status repo.
4. Configure GitHub Pages for the status repo.

## 10. First deploy

```bash
# Deploy staging (every push to main)
git add . && git commit -m "chore: complete setup"
git push origin main

# After staging is green, deploy production
git tag v0.1.0
git push origin v0.1.0
```

## 11. Verify

```bash
curl https://<staging>.vercel.app/api/health
curl https://<production>.vercel.app/api/health
```

Check GitHub Actions for all workflows passing.
