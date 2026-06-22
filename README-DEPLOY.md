# Guía de deploy — FeedIA (Supabase + Redis + Vercel + GitHub Actions)

Esta guía asume que ya tenés Sprint 11 completo, `npm run verify` pasa sin errores y los tests corren con `npm test`.

## 1. Pre-requisitos

- Cuenta en [GitHub](https://github.com) (repo + Actions + Secrets)
- Cuenta en [Supabase](https://supabase.com) (dos proyectos: staging y production)
- Cuenta en [Upstash](https://upstash.com) (Redis TCP para cada ambiente)
- Cuenta en [Vercel](https://vercel.com) (proyecto vinculado)
- Cuenta en [Render](https://render.com), [Railway](https://railway.app) o [Fly.io](https://fly.io) (workers de proceso largo)
- [Supabase CLI](https://supabase.com/docs/guides/cli) instalado localmente
- [GitHub CLI](https://cli.github.com/) instalado localmente (opcional, para `scripts/setup-github-secrets.mjs`)

> **Guía paso a paso de configuración manual en GitHub:** ver [`docs/GITHUB_SETUP.md`](docs/GITHUB_SETUP.md).

## 2. Estructura de ambientes

- `main` branch → deploy automático a **staging** (Vercel preview + workers)
- Tag `v*` → deploy automático a **production** (Vercel prod + workers)
- Migraciones Supabase → workflow manual o automático antes de cada deploy

## 3. Crear proyectos Supabase

1. Crear dos proyectos en Supabase: `feedia-staging` y `feedia-production`.
2. En cada proyecto, ir al SQL Editor y ejecutar **en orden**:
   - `supabase/migrations/001_supabase_rls.sql`
   - `supabase/migrations/002_seed_owner.sql`
3. Guardar de cada proyecto:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (server-side only, nunca en el frontend)
   - `Project Ref` (aparece en Settings → General)
   - `Database password` (seteado al crear el proyecto)

> **Migraciones con Supabase CLI:**
>
> ```bash
> supabase login
> supabase link --project-ref <ref>
> supabase db push
> ```

## 4. Crear bases Redis en Upstash

1. Crear un índice/DB Redis en Upstash para cada ambiente.
2. Copiar el endpoint **TCP** (no REST).
3. Setear `REDIS_URL=rediss://default:PASSWORD@HOST:6379`.

## 5. Configurar GitHub Secrets

Ir a **Settings → Secrets and variables → Actions** del repo y agregar:

| Secret                         | Descripción                                                                |
| ------------------------------ | -------------------------------------------------------------------------- |
| `SUPABASE_ACCESS_TOKEN`        | Token personal de Supabase (https://supabase.com/dashboard/account/tokens) |
| `SUPABASE_PROJECT_REF_STAGING` | Ref del proyecto staging                                                   |
| `SUPABASE_PROJECT_REF_PROD`    | Ref del proyecto production                                                |
| `SUPABASE_DB_PASSWORD_STAGING` | Contraseña DB staging                                                      |
| `SUPABASE_DB_PASSWORD_PROD`    | Contraseña DB production                                                   |
| `VERCEL_TOKEN`                 | Token de Vercel                                                            |
| `VERCEL_ORG_ID`                | Org ID de Vercel                                                           |
| `VERCEL_PROJECT_ID`            | Project ID de Vercel                                                       |
| `RENDER_DEPLOY_HOOK_STAGING`   | Deploy hook de Render (staging)                                            |
| `RENDER_DEPLOY_HOOK_PROD`      | Deploy hook de Render (production)                                         |
| `OWNER_TEST_EMAIL`             | `lucasdmarin@gmail.com`                                                    |
| `OWNER_TEST_PASSWORD`          | Contraseña de test del owner                                               |
| `ANTHROPIC_API_KEY`            | Clave de Anthropic                                                         |
| `SENTRY_DSN`                   | DSN de Sentry (opcional)                                                   |
| `LOGTAIL_SOURCE_TOKEN`         | Token de Logtail (opcional)                                                |

Para Railway o Fly, usar `RAILWAY_TOKEN_STAGING`/`RAILWAY_TOKEN_PROD` o `FLY_API_TOKEN_STAGING`/`FLY_API_TOKEN_PROD` en lugar de los hooks de Render.

## 6. Configurar variables de entorno

Copiar y completar:

```bash
cp .env.staging.example .env.staging
cp .env.production.example .env.production
```

Mínimo requerido por ambiente:

```env
NODE_ENV=staging|production
PUBLIC_BASE_URL=https://...
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
REDIS_URL=
SESSION_SECRET=        # openssl rand -hex 32
ANTHROPIC_API_KEY=
```

Validar:

```bash
npm run validate:env -- --strict --env=staging
npm run validate:env -- --strict --env=production
npm run setup:redis
npm run setup:supabase
```

## 7. Deploy del frontend (Vercel)

1. Importar el repo en Vercel.
2. Framework preset: **Other**.
3. Build command: `node scripts/build-static.mjs`.
4. Output directory: `dist-static`.
5. En **Settings → Environment Variables** agregar las variables que usan las serverless functions (`api/*`):
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `REDIS_URL`
   - `SESSION_SECRET`
   - `ANTHROPIC_API_KEY`
6. El workflow `deploy-staging.yml` y `deploy-prod.yml` se encargan del deploy automático con `vercel --target=preview|prod`.

`vercel.json` ya incluye headers de seguridad (CSP, nosniff, referrer-policy, HSTS).

## 8. Deploy de workers (Render / Railway / Fly)

El workflow de CI buildea la imagen Docker y la publica en **GHCR**:

```
ghcr.io/<owner>/<repo>/workers:<sha>
ghcr.io/<owner>/<repo>/workers:latest
```

### Render

1. New → Blueprint → conectar repo.
2. Render lee `render.yaml` y crea el worker.
3. Setear los secretos en el dashboard.
4. El workflow llama al deploy hook configurado en GitHub Secrets.

### Railway

1. New project → Deploy from GitHub repo.
2. Railway usa `railway.json`.
3. Agregar variables en Variables tab.
4. Configurar `RAILWAY_TOKEN_*` en GitHub Secrets.

### Fly.io

```bash
fly launch --name feedia-workers --region mia
fly secrets set SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... REDIS_URL=... ANTHROPIC_API_KEY=...
fly deploy
```

Configurar `FLY_API_TOKEN_*` en GitHub Secrets.

## 9. CI/CD Workflows

| Workflow               | Trigger                       | Qué hace                                                                     |
| ---------------------- | ----------------------------- | ---------------------------------------------------------------------------- |
| `ci.yml`               | PR/push a `main`              | lint, typecheck, build, test, security audit, build + push Docker image      |
| `deploy-staging.yml`   | CI exitoso en `main` o manual | migra Supabase staging, deploya Vercel preview, deploya workers, smoke tests |
| `deploy-prod.yml`      | tag `v*` o manual             | migra Supabase prod, deploya Vercel prod, deploya workers, smoke tests       |
| `migrate-supabase.yml` | manual                        | aplica migraciones a staging o production                                    |

## 10. Proceso de release

### Staging

Cada push a `main` dispara deploy automático a staging.

### Production

```bash
# 1. Asegurarse que main esté verde
npm run verify

# 2. Crear tag
npm version patch   # o minor / major

# 3. Push del tag
git push origin main --tags
```

Esto dispara `deploy-prod.yml`.

### Rollback de workers

```bash
# Redeployar imagen anterior
# Render: usar dashboard o commit anterior
# Fly.io:
flyctl deploy --app feedia-workers --image ghcr.io/<owner>/<repo>/workers:<sha-anterior>
```

## 11. Verificar post-deploy

```bash
# Health check de la API pública
curl https://feedia.vercel.app/api/v1/health

# Smoke tests completos
node scripts/smoke-tests.mjs https://feedia.vercel.app
```

Acceder al dashboard de monitoreo owner-only:

```
https://feedia.vercel.app/api/admin/monitoring
```

Solo el owner `lucasdmarin@gmail.com` y colaboradores admin tienen acceso.

## 12. Migraciones futuras

Crear nueva migración:

```bash
supabase migration new add_user_preferences
```

Editar `supabase/migrations/YYYYMMDDHHMMSS_add_user_preferences.sql`.

Aplicar localmente:

```bash
supabase db reset   # borra y recrea DB local
supabase db push    # aplica en remoto vinculado
```

Aplicar en CI/CD:

- Automático: los workflows `deploy-staging.yml` y `deploy-prod.yml` ejecutan `supabase db push`.
- Manual: **Actions → Migrate Supabase → Run workflow**.

## 13. Checklist de seguridad

- [ ] `SUPABASE_SERVICE_ROLE_KEY` nunca en el frontend ni en `NEXT_PUBLIC_*`.
- [ ] `SESSION_SECRET` generado aleatoriamente y distinto en cada entorno.
- [ ] `REDIS_URL` usa TLS (`rediss://`).
- [ ] RLS habilitado en todas las tablas tenant.
- [ ] Owner seedeado (`lucasdmarin@gmail.com`).
- [ ] Rate limiting por créditos activo en producción.
- [ ] Webhooks de Meta/TikTok validan firma.
- [ ] Source maps deshabilitados en producción (`sourcemap: false`).
- [ ] GitHub Secrets configurados, ningún secret en código.
- [ ] `.env.production` y `.env.staging` nunca commiteados.

## 14. Troubleshooting

### Workers no se conectan a Redis

- Verificar que usás el endpoint TCP, no el REST.
- En Upstash, habilitar TLS.
- Correr `npm run setup:redis` localmente con la misma URL.

### Errores 401/403 en admin

- El owner debe existir en `auth.users` y en `public.users` con `role='owner'`.
- Revisar `supabase/migrations/002_seed_owner.sql`.

### Variables faltantes

```bash
npm run validate:env -- --strict --env=production
```

### CI falla en Docker build

- Verificar que `npm run build` funciona localmente.
- Revisar que `better-sqlite3` compile con las tools del Dockerfile.

### Migración falla

- Correr `supabase db push --dry-run` antes.
- Revisar logs del workflow.
- Restaurar desde backup de Supabase si es necesario.

## Archivos de deploy

- `supabase/config.toml`
- `supabase/migrations/001_supabase_rls.sql`
- `supabase/migrations/002_seed_owner.sql`
- `supabase/seed.sql`
- `scripts/validate-env.mjs`
- `scripts/setup-supabase.mjs`
- `scripts/setup-redis.mjs`
- `scripts/setup-all.mjs`
- `scripts/smoke-tests.mjs`
- `Dockerfile`
- `.dockerignore`
- `render.yaml`
- `railway.json`
- `fly.toml`
- `.github/workflows/ci.yml`
- `.github/workflows/deploy-staging.yml`
- `.github/workflows/deploy-prod.yml`
- `.github/workflows/migrate-supabase.yml`
- `.env.staging.example`
- `.env.production.example`
- `README-DEPLOY.md`
- `docs/RUNBOOK.md`

## 15. Operaciones enterprise y DevEx

Además del deploy, el proyecto incluye:

- **Docker Compose local:** `make supabase-up` levanta Postgres, Redis y Mailpit.
- **Security scanning:** Trivy (fs + image), TruffleHog, Dependabot, `npm audit`.
- **Backups:** `.github/workflows/backup-prod.yml` corre diariamente.
- **Uptime checks:** `.github/workflows/uptime.yml` cada 5 min.
- **Cleanup:** `.github/workflows/cleanup.yml` mensual para GHCR, Redis y Vercel previews.
- **Releases:** `.github/workflows/release.yml` genera GitHub Release con notas y SBOM.
- **DevEx:** Makefile, Prettier, lint-staged, Conventional Commits.
- **Documentación:** `CONTRIBUTING.md`, `docs/RUNBOOK.md`, `docs/DISASTER_RECOVERY.md`, `docs/SECURITY_RUNBOOK.md`, `docs/adr/`.
