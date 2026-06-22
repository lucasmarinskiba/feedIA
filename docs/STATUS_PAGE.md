# Status Page — FeedIA

## Opciones recomendadas

### 1. Better Stack Uptime (recomendado)

- Gratuito para monitoreo básico.
- Soporta checks sintéticos, heartbeat y páginas de estado públicas.
- Integración con Slack, Discord y webhooks.

Pasos:

1. Crear cuenta en https://betterstack.com.
2. Agregar monitor con URL `https://feedia.vercel.app/api/health`.
3. Configurar alertas para enviar a `ADMIN_WEBHOOK_URL`.
4. Publicar status page en `https://status.feedia.vercel.app` o dominio propio.

### 2. Upptime (self-hosted, gratis)

- Repo de GitHub Actions que genera status page estática.
- Usa issues de GitHub para incidentes.
- Ideal si querés mantener todo en GitHub.

Repositorio base: https://github.com/upptime/upptime

### 3. UptimeRobot

- Plan gratuito con 50 monitores y 5 minutos de intervalo.
- Fácil de configurar, pero menos flexible para checks complejos.

## Checks mínimos recomendados

| Endpoint                    | Frecuencia | Importante                                      |
| --------------------------- | ---------- | ----------------------------------------------- |
| `GET /api/health`           | 5 min      | Estado de Redis, Supabase y versión.            |
| `GET /`                     | 5 min      | Frontend accesible.                             |
| `GET /api/admin/monitoring` | 15 min     | Endpoint protegido responde (esperado 401/403). |

## Heartbeat desde workers

Los workers pueden enviar un heartbeat periódico a Better Stack o al webhook configurado en `ADMIN_WEBHOOK_URL` para confirmar que están consumiendo jobs.

Ver `src/observability/logger.ts` para enviar logs estructurados.
