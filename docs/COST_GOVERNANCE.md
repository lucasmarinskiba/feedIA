# Cost Governance — FeedIA

## Principios

1. **Todo recurso cloud debe tener owner y propósito.**
2. **Los ambientes de staging deben ser más baratos que producción.**
3. **Los artefactos viejos se limpian automáticamente.**
4. **Las alertas de budget se envían antes de que el gasto sea un problema.**

## Budgets por ambiente (mensual)

| Servicio                   | Staging           | Producción      |
| -------------------------- | ----------------- | --------------- |
| Vercel                     | Hobby/Pro         | Pro/Business    |
| Supabase                   | Free/Tier inicial | Pro             |
| Upstash Redis              | Free/Tier inicial | Pay-as-you-go   |
| Render/Railway/Fly workers | Starter           | Standard        |
| Anthropic API              | Hard limit $50    | Hard limit $500 |

## Controles implementados

### LLM budget

- `LLM_DAILY_BUDGET_USD` limita el gasto diario de Anthropic.
- `src/agent/budget.ts` registra uso y lanza `BudgetExceededError` cuando se agota.
- Alerta al 80 % vía `ADMIN_WEBHOOK_URL`.

### CI/CD cleanup

- `.github/workflows/cleanup.yml` corre mensualmente:
  - Borra imágenes GHCR antiguas (mantiene últimas 20 + tags semver).
  - Limpia deployments preview antiguos de Vercel.
  - Elimina jobs fallidos y caché expirado de Redis.

## Etiquetado

- Imágenes Docker: incluyen `version`, `commit`, `branch`.
- Recursos de Supabase: usar nombres descriptivos (`feedia-staging`, `feedia-production`).

## Revisión

- Revisión mensual de costos en el primer lunes de cada mes.
- Acción correctiva si staging supera el 30 % del presupuesto de producción.
