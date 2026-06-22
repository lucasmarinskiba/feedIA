# FeedIA — Hardening: Seguridad, Escalabilidad y Monitoreo

Este documento resume los cambios de hardening aplicados y cómo configurarlos en producción.

---

## 1. Frontend blindado

### Source maps OFF

- El build (`scripts/build-static.mjs`) minifica con esbuild y fuerza `sourcemap: false`.
- Se eliminan `console.*` y `debugger` en producción.
- Identificadores ofuscados por minificación.

### CSP + headers de seguridad

- `vercel.json` inyecta:
  - `Content-Security-Policy`
  - `X-Frame-Options: DENY`
  - `X-Content-Type-Options: nosniff`
  - `Referrer-Policy`
  - `Permissions-Policy`
  - `Strict-Transport-Security`
- El CSP también se inyecta como meta tag en `index.html` durante el build.

### Variables de entorno

```bash
FRONTEND_CSP=default-src 'self'; script-src 'self' 'unsafe-inline'; ...
MINIFY=true
```

---

## 2. Base de datos con RLS (Supabase Postgres)

### Migración

Ejecutar en Supabase SQL Editor:

```bash
migrations/001_supabase_rls.sql
```

Esto crea:

- Tablas tenant (`accounts`, `posts`, `content_pieces`, etc.)
- Tablas de autenticación (`profiles`, `account_members`, `api_keys`)
- RLS habilitado en todas las tablas
- Políticas que limitan cada usuario a sus propios datos
- Columnas cifradas listas para tokens OAuth (`oauth_tokens.encrypted_token`)
- Feature flags (`feature_flags`)
- Funciones helper (`current_user_id`, `user_account_ids`, `is_platform_admin`)

### Configuración

```bash
SUPABASE_URL=https://<proyecto>.supabase.co
SUPABASE_ANON_KEY=<anon>
SUPABASE_SERVICE_ROLE_KEY=<service_role>  # nunca en el frontend
```

### Seed de owner

Descomentar y ejecutar el bloque final de `001_supabase_rls.sql` para asignar `role='owner'` a `lucasdmarin@gmail.com`.

### Cifrado de tokens OAuth

Los tokens se almacenan en `oauth_tokens.encrypted_token`. El valor se debe cifrar en el servidor antes de guardar (recomendado: AES-256-GCM con clave en `OAUTH_ENCRYPTION_KEY`).

---

## 3. Control de versiones / Feature flags

### Endpoints

- `GET /api/features` — flags visibles para el usuario autenticado.
- `GET /api/features/:key` — estado de una flag.
- `GET /api/admin/releases` — lista completa (owner/admin).
- `POST /api/admin/releases` — crear/actualizar flag (owner/admin).

### Body de ejemplo

```json
{
  "key": "canary_v2_dashboard",
  "enabled": true,
  "allowed_plans": ["pro", "premium", "business", "enterprise", "owner", "admin"],
  "rollout_percent": 10,
  "description": "Nuevo dashboard v2"
}
```

### Lógica

- Owner/admin ven siempre todas las flags.
- `enabled=false` oculta la funcionalidad a usuarios normales.
- `rollout_percent` distribuye usuarios por hash de `userId`.

---

## 4. Rate limiting y protección de saldo

### Rate limit por IP / user

- `api/_rateLimit.js` token bucket sobre Upstash Redis.
- Bypass para owner.
- Headers `x-ratelimit-*` y `retry-after`.

### Cost-based rate limiting

- Cada acción costosa consume créditos:
  - `llm_basic`: 1
  - `llm_advanced`: 3
  - `image_generate`: 5
  - `video_generate`: 15
  - `computer_use`: 8
  - `social_publish`: 4
  - `social_sync`: 2
  - `audit_full`: 6
- Los créditos se recargan cada hora según el plan.
- Headers `x-credits-remaining` y `x-credits-cost`.

### Planes y créditos horarios

| Plan       | Créditos/hora |
| ---------- | ------------- |
| free       | 100           |
| starter    | 300           |
| premium    | 800           |
| gold       | 600           |
| pro        | 1000          |
| business   | 2500          |
| enterprise | 5000          |
| owner      | ilimitado     |

---

## 5. Caché (Redis/Upstash)

### Helper

- `api/_cache.js` con `withCache(key, factory, ttlSec)`.

### Ejemplos de uso

```js
const data = await cache.withCache('plans:features-matrix', buildMatrix, 600);
```

### Invalidación

```js
await cache.invalidateTag('plans');
```

---

## 6. Monitoreo

### Dashboard owner-only

- `GET /api/admin/monitoring`
- Métricas: hits, errores, créditos consumidos, rate limits, errores recientes.

### Alertas

Configurar:

```bash
ALERT_WEBHOOK_URL=https://hooks.slack.com/services/...   # o cualquier webhook
ALERT_EMAIL=lucasdmarin@gmail.com
```

Se alerta ante:

- Errores críticos (`out of memory`, `fatal`, `crash`).
- Picos de rate limit.

### Sentry (recomendado)

```bash
SENTRY_DSN=https://...@sentry.io/...
SENTRY_AUTH_TOKEN=...  # solo para subir source maps de release
```

Instalar en producción:

```bash
npm install @sentry/node @sentry/browser
```

### Logtail / Better Stack (recomendado)

```bash
LOGTAIL_SOURCE_TOKEN=...
```

---

## 7. Escalabilidad

### Arquitectura recomendada

```
Usuario → Vercel Edge (frontend estático + API serverless)
              ↓
        Upstash Redis (rate limit + caché + colas)
              ↓
        Supabase Postgres (RLS + datos)
              ↓
        Worker Render/Railway/Fly (tareas pesadas: generación de video, batch, scheduler)
```

### Workers de background

FeedIA usa **BullMQ** sobre Redis TCP para ejecutar tareas pesadas fuera del request HTTP:

| Cola          | Descripción                                |
| ------------- | ------------------------------------------ |
| videoGenerate | Generación de reels/videos                 |
| socialPublish | Publicación en Instagram/TikTok            |
| batchAudit    | Audits completos de contenido/marca        |
| contentForge  | Tareas complejas de IA (strategists, etc.) |

### Endpoints de queue (API v1)

- `POST /api/v1/queue/jobs` — encolar job.
- `GET /api/v1/queue/jobs/{name}/{id}` — estado del job.

### Cómo correr el worker

```bash
# Desarrollo
npm run workers:dev

# Producción (después de npm run build)
npm run workers
```

El worker se ejecuta en un host de proceso largo (Render/Railway/Fly/VPS), **no en Vercel Functions**.

### Documentación OpenAPI

- YAML: `docs/openapi.yaml`
- JSON: `GET /api/v1/openapi.json`
- YAML: `GET /api/v1/openapi.yaml`

### Próximos pasos para escalar a 1.000 usuarios concurrentes

1. ✅ Instalar `bullmq` y Redis para worker queues.
2. ✅ Mover generación de contenido, publicaciones y análisis batch a workers.
3. Usar Supabase Connection Pooler.
4. Habilitar CDN para assets estáticos.
5. Read replicas de Postgres si el volumen de lecturas lo requiere.

---

## 8. Checklist de seguridad

- [ ] Variables de entorno sin secretos en el frontend.
- [ ] `SUPABASE_SERVICE_ROLE_KEY` nunca expuesta al cliente.
- [ ] RLS aplicado y testeado en Supabase.
- [ ] Owner seedeado con `role='owner'`.
- [ ] Rate limiting activado (`RATE_LIMIT_ENABLED=true`).
- [ ] CSP configurado y probado.
- [ ] Webhook de alertas configurado.
- [ ] Backups automáticos de Supabase activados.
- [ ] GitHub/GitLab con branch protection y code review.

---

## 9. Contacto / acceso

- **Owner principal:** `lucasdmarin@gmail.com`
- **Monitoreo:** `/api/admin/monitoring` (solo owner/admin)
- **Control de versiones:** `/api/admin/releases` (solo owner/admin)

---

## 10. Security scanning en CI/CD

Cada pull request y push a `main` ejecuta los siguientes controles de seguridad:

| Control              | Herramienta | Qué detecta                                                                  |
| -------------------- | ----------- | ---------------------------------------------------------------------------- |
| Vulnerability audit  | `npm audit` | Dependencias npm con vulnerabilidades conocidas.                             |
| Filesystem scan      | Trivy       | Vulnerabilidades, secretos expuestos y configuraciones inseguras en el repo. |
| Container image scan | Trivy       | Vulnerabilidades en la imagen Docker de workers.                             |
| Secret scanning      | TruffleHog  | Claves, tokens y credenciales accidentalmente commiteadas.                   |
| Dependency updates   | Dependabot  | PRs automáticos para actualizar dependencias y GitHub Actions.               |
| SBOM                 | Syft        | Bill of materials de cada imagen publicada.                                  |
| Artifact attestation | GitHub      | Firma criptográfica de la imagen Docker en GHCR.                             |

Los resultados de Trivy se suben a la pestaña **Security → Code scanning** del repositorio.

Para reportar vulnerabilidades, ver [`SECURITY.md`](SECURITY.md).
