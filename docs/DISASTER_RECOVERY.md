# Disaster Recovery — FeedIA

## Objetivos

- **RTO (Recovery Time Objective):** 4 horas para restaurar servicio completo.
- **RPO (Recovery Point Objective):** 24 horas (backups diarios automáticos).

## Backups automáticos

- El workflow `.github/workflows/backup-prod.yml` corre todos los días a las 06:00 UTC.
- Genera un dump SQL de Supabase production.
- Lo guarda como artifact de GitHub Actions (30 días) y opcionalmente en S3-compatible storage.
- Metadata del backup: `backups/feedia-production-<timestamp>.sql.json`.

## Restauración desde backup

### 1. Identificar el backup correcto

Descargar el artifact más reciente o el archivo desde S3.

### 2. Pausar deploys

- Activar maintenance mode en Vercel (opcional).
- Pausar workers en Render/Railway/Fly.

### 3. Restaurar en Supabase

```bash
# Crear base temporal para verificar
psql <DATABASE_URL> -c 'DROP DATABASE IF EXISTS feedia_restore; CREATE DATABASE feedia_restore;'

# Restaurar backup
psql <DATABASE_URL> -f backups/feedia-production-<timestamp>.sql
```

O usar Supabase Dashboard → Database → Backups → Restore.

### 4. Verificar integridad

```bash
node scripts/verify-backup.mjs backups/feedia-production-<timestamp>.sql
```

### 5. Reanudar servicios

- Verificar `/api/v1/health`.
- Reanudar workers.
- Correr smoke tests: `node scripts/smoke-tests.mjs <PUBLIC_BASE_URL>`.

## Rollback de migración

Si una migración reciente rompe la app:

1. No hacer rollback destructivo sin backup.
2. Restaurar desde backup o crear migración correctora:
   ```bash
   supabase migration new fix_broken_migration
   supabase db push
   ```

## Contactos de escalación

- Owner: `lucasdmarin@gmail.com`
- Canal de alertas: `ADMIN_WEBHOOK_URL`
