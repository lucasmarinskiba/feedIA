# Contributing to FeedIA

## Setup local

### Opción A: Docker Compose (recomendado)

```bash
cp .env.local.example .env.local
make supabase-up
make dev
```

Esto levanta Postgres, Redis y Mailpit. La app corre en `http://localhost:7321`.

### Opción B: Node local

```bash
npm install
cp .env.example .env
# completar variables
npm run dev
```

## Scripts útiles

| Comando              | Descripción                      |
| -------------------- | -------------------------------- |
| `make dev`           | Levanta el daemon local.         |
| `make test`          | Corre tests unitarios.           |
| `make test-coverage` | Corre tests con cobertura.       |
| `make verify`        | Lint + typecheck + build + test. |
| `make format`        | Formatea con Prettier.           |
| `make lint-fix`      | Arregla errores de ESLint.       |
| `make workers`       | Levanta workers localmente.      |
| `make backup`        | Backup de Supabase production.   |

## Convenciones

- TypeScript estricto, ES modules.
- Commits con [Conventional Commits](https://www.conventionalcommits.org/):
  - `feat:` nueva funcionalidad
  - `fix:` corrección de bug
  - `docs:` documentación
  - `chore:` tareas de mantenimiento
  - `security:` seguridad
  - `ops:` CI/CD, infraestructura
- `npm run verify` debe pasar antes de pushear.
- Agregar tests para nueva lógica crítica.

## Agregar una migración de Supabase

```bash
supabase migration new descripcion_corta
# editar supabase/migrations/YYYYMMDDHHMMSS_descripcion_corta.sql
supabase db push
```

## Pull Requests

Usar el template de PR y asegurarse de que:

- [ ] `npm run verify` pasa.
- [ ] Se actualizó `CHANGELOG.md` si aplica.
- [ ] Las migraciones son reversibles o están documentadas.
- [ ] No se commitearon secrets.
