# Runbook operativo — FeedIA

Guía rápida para diagnosticar y resolver incidentes comunes en producción.

---

## 1. Página en rojo / 500 en Vercel

### Síntomas

- `https://feedia.vercel.app` devuelve 500.
- `/api/v1/health` no responde 200.

### Pasos

1. Revisar logs de Vercel:

   ```bash
   npx vercel logs feedia.vercel.app --token=<TOKEN>
   ```

2. Verificar que las serverless functions no fallen por variables faltantes:

   ```bash
   curl https://feedia.vercel.app/api/v1/health
   ```

3. Si el error es de Supabase, revisar:
   - `SUPABASE_SERVICE_ROLE_KEY` vigente.
   - Proyecto Supabase no en pausa.
   - RLS no bloquea queries admin.

4. Rollback:
   - Vercel → Deployments → Promote previous deployment.

---

## 2. Workers no consumen jobs

### Síntomas

- Colas crecen en `/api/admin/monitoring`.
- Ningún worker procesa jobs.

### Pasos

1. Verificar que el servicio de workers esté corriendo:
   - Render/Railway/Fly dashboard.

2. Revisar logs de workers:

   ```bash
   # Render
   render logs feedia-workers

   # Fly
   flyctl logs --app feedia-workers
   ```

3. Verificar conexión Redis:

   ```bash
   npm run setup:redis
   ```

4. Reiniciar workers:
   - Trigger deploy hook manualmente.
   - O redeployar imagen anterior.

---

## 3. Rate limits 429

### Síntomas

- Usuarios reciben 429.
- Dashboard de monitoreo muestra créditos agotados.

### Pasos

1. Identificar si es por plan o por acción costosa:

   ```bash
   curl https://feedia.vercel.app/api/admin/stats
   ```

2. Si es legítimo:
   - El usuario debe esperar al reset diario.
   - O comprar credit pack.

3. Si es falso positivo:
   - Revisar `ACTION_COSTS` en `api/_rateLimit.js`.
   - Considerar aumentar `PLAN_CREDITS`.

---

## 4. Rollback de migración

### Síntomas

- Migración aplicada rompe la app.

### Pasos

1. **No hacer rollback destructivo** sin backup.
2. Restaurar desde backup automático de Supabase:
   - Supabase → Database → Backups → Restore.
3. Si la migración tiene errores menores, crear migración correctora:
   ```bash
   supabase migration new fix_broken_migration
   ```
4. Aplicar corrección:
   ```bash
   supabase db push
   ```

---

## 5. Webhook de Meta no funciona

### Síntomas

- No llegan eventos de Instagram/TikTok.
- Meta muestra error al registrar webhook.

### Pasos

1. Verificar `META_VERIFY_TOKEN` y `META_APP_SECRET`.
2. Revisar que la URL del webhook sea pública:
   ```bash
   curl https://feedia.vercel.app/api/webhook/meta
   ```
3. Revisar firma de los payloads.
4. Verificar logs de Vercel.

---

## 6. Sentry reporta errores

### Pasos

1. Ir a Sentry dashboard.
2. Filtrar por release/tag.
3. Si el error es nuevo en un release:
   - Rollback de Vercel/workers.
   - Crear hotfix en `main` y taggear patch.

---

## 7. Smoke tests fallan post-deploy

### Pasos

1. Correr manualmente:

   ```bash
   node scripts/smoke-tests.mjs https://feedia.vercel.app
   ```

2. Identificar cuál de los checks falla:
   - `/api/v1/health` → revisar Vercel functions.
   - `x-feedia-version` → revisar build de frontend.
   - Security headers → revisar `vercel.json`.
   - `/api/admin/monitoring` protegido → revisar auth.

---

## 8. Contacto y escalación

- Owner: `lucasdmarin@gmail.com`
- Canal de alertas: webhook configurado en `ADMIN_WEBHOOK_URL`.
- Repositorio: ver GitHub Actions para estado de CI/CD.
