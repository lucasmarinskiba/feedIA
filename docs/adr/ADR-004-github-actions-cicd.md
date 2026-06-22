# ADR-004: GitHub Actions para CI/CD

## Status

Accepted

## Context

Necesitamos CI/CD automático, seguro y auditable.

## Decision

Usar GitHub Actions con workflows modulares:

- `ci.yml` para verificación y Docker build.
- `deploy-staging.yml` y `deploy-prod.yml` para deploys.
- `migrate-supabase.yml` para migraciones manuales.
- `backup-prod.yml` para backups.
- `cleanup.yml` para mantenimiento.

## Consequences

- Todo el pipeline está en el repo (gitops).
- Secrets centralizados en GitHub.
- Fácil rollback y auditoría.
