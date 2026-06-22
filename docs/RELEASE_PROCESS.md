# Release Process — FeedIA

## Flujo normal

1. **Desarrollo en `main`.**
   - Cada push a `main` deploya automáticamente a **staging**.

2. **Crear release candidate.**

   ```bash
   npm version prerelease --preid=rc
   git push origin main --tags
   ```

   Esto deploya a staging con tag `vX.Y.Z-rc.N`.

3. **Promover a producción.**
   ```bash
   npm version patch   # o minor / major
   git push origin main --tags
   ```
   El tag `vX.Y.Z` dispara `deploy-prod.yml` y `release.yml`.

## Hotfix

1. Crear branch desde el tag actual:
   ```bash
   git checkout -b hotfix/descripcion vX.Y.Z
   ```
2. Aplicar fix y versionar:
   ```bash
   npm version patch
   git push origin hotfix/descripcion --tags
   ```
3. Mergear a `main` después.

## Rollback

### Frontend (Vercel)

- Ir a Vercel Dashboard → Deployments → seleccionar deployment anterior → Promote.

### Workers

**Render:**

- Dashboard → Manual Deploy → deploy commit anterior.

**Fly.io:**

```bash
flyctl deploy --app feedia-workers --image ghcr.io/<owner>/<repo>/workers:<sha-anterior>
```

**Railway:**

- Dashboard → Deployments → seleccionar commit anterior.

### Base de datos

Ver [`DISASTER_RECOVERY.md`](DISASTER_RECOVERY.md).

## Checklist antes de release

- [ ] `npm run verify` pasa localmente.
- [ ] Staging smoke tests pasan.
- [ ] Migraciones de Supabase aplicadas en staging sin errores.
- [ ] `CHANGELOG.md` actualizado.
- [ ] Security scanning sin nuevas vulnerabilidades críticas.
