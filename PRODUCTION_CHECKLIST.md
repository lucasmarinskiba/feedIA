# 🚀 Checklist de Producción — Agente IA Especialista Instagram

> Documento vivo. Actualizar cada vez que se agregue/modifique una integración crítica.

---

## Fase 0: Pre-requisitos (antes de tocar nada)

- [ ] Node.js ≥ 20 instalado (`node -v`)
- [ ] `npm install` ejecutado sin errores
- [ ] `npm run build` pasa limpio
- [ ] `data/brand.json` completado (copiar de `data/brand.example.json`)
- [ ] `data/brands/default.json` existe (multi-cuenta activada)
- [ ] `.env` copiado de `.env.example`

---

## Fase 1: Meta Graph API (PUBLICAR EN INSTAGRAM)

**Sin esto no se publica nada.**

1. Ir a [Meta Developers](https://developers.facebook.com/apps)
2. Crear app tipo **Business**
3. Agregar producto **Instagram Graph API**
4. Conectar cuenta de Instagram Business:
   - Ir a "Roles" → "Instagram Testers"
   - Agregar usuario de Instagram
   - Aceptar invitación desde Instagram → Configuración → Aplicaciones y sitios web → Invitaciones de tester
5. Generar **User Access Token** con permisos:
   - `instagram_basic`
   - `instagram_content_publish`
   - `instagram_manage_comments`
   - `pages_read_engagement`
   - `read_insights`
6. Obtener **IG Business ID**:
   ```bash
   curl "https://graph.facebook.com/v18.0/me/accounts?access_token=TU_TOKEN"
   ```
   Buscar `instagram_business_account.id`
7. Completar en `.env`:
   ```env
   META_ACCESS_TOKEN=tu_token_aqui
   META_IG_BUSINESS_ID=tu_ig_id_aqui
   META_PAGE_ID=tu_page_id_aqui
   ```
8. **Verificar** con preflight:
   ```bash
   npm run dev preflight
   ```

---

## Fase 2: Compliance (SEGURIDAD ANTES DE PUBLICAR)

- [ ] Leer `TERMS_OF_SERVICE.md` completo
- [ ] Setear `COMPLIANCE_ACCEPTED_TERMS=true` en `.env`
- [ ] Verificar `COMPLIANCE_STRICT_MODE=true` (recomendado)
- [ ] Ajustar rate limits si es necesario:
  - `COMPLIANCE_MAX_DAILY_PUBLISH=15`
  - `COMPLIANCE_MAX_DAILY_DM=100`
  - `COMPLIANCE_MAX_DAILY_COMMENTS=200`
- [ ] Ejecutar:
  ```bash
  npm run dev preflight
  npm run dev health-check
  ```

---

## Fase 3: Email (Notificaciones)

**Opcional pero recomendado para alertas.**

| Provider | Variable                                           | Link                                       |
| -------- | -------------------------------------------------- | ------------------------------------------ |
| Resend   | `RESEND_API_KEY`                                   | https://resend.com/api-keys                |
| SendGrid | `SENDGRID_API_KEY`                                 | https://app.sendgrid.com/settings/api_keys |
| SMTP     | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` | Tu proveedor de hosting                    |

Configurar en `.env`:

```env
EMAIL_PROVIDER=resend
EMAIL_FROM_ADDRESS=agent@tuempresa.com
EMAIL_FROM_NAME=Tu Empresa Agent
RESEND_API_KEY=re_xxxxxxxx
```

---

## Fase 4: Video (Generación de Reels)

**Opcional.** Si no se configura, los reels se planifican como scripts sin video.

| Provider    | Requisito                        | Nota                                                                                                  |
| ----------- | -------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Replicate   | `REPLICATE_API_TOKEN`            | Usa `black-forest-labs/flux-schnell` para imágenes + `stability-ai/stable-video-diffusion` para video |
| FFmpeg      | `ffmpeg` instalado               | Slideshow desde imágenes. Instalar: `choco install ffmpeg` (Windows) o `brew install ffmpeg` (Mac)    |
| API externa | `VIDEO_API_URL`, `VIDEO_API_KEY` | Webhook propio                                                                                        |

Configurar en `.env`:

```env
VIDEO_PROVIDER=replicate
REPLICATE_API_TOKEN=tu_token
REPLICATE_VIDEO_MODEL=stability-ai/stable-video-diffusion
```

---

## Fase 5: Inteligencia de Mercado

### Tendencias

| Fuente                  | Variable               | Link                                              |
| ----------------------- | ---------------------- | ------------------------------------------------- |
| Google Trends (SerpAPI) | `SERPAPI_KEY`          | https://serpapi.com/manage-api-key                |
| Twitter/X               | `TWITTER_BEARER_TOKEN` | https://developer.twitter.com/en/portal/dashboard |
| Reddit                  | Ninguna                | Funciona sin API key                              |

### Competidores

| Fuente                     | Variable                 | Link                                           | Costo aprox.            |
| -------------------------- | ------------------------ | ---------------------------------------------- | ----------------------- |
| RapidAPI Instagram Scraper | `RAPIDAPI_KEY`           | https://rapidapi.com/developer/dashboard       | Gratis tier / $5-20/mes |
| Apify                      | `APIFY_API_TOKEN`        | https://console.apify.com/account/integrations | $49/mes                 |
| Webhook propio             | `COMPETITOR_WEBHOOK_URL` | Tu infraestructura                             | Variable                |

---

## Fase 6: Activar Producción

### Paso a paso seguro:

1. **Verificar estado actual (simulación):**

   ```bash
   node scripts/validate-setup.js
   ```

2. **Ejecutar preflight:**

   ```bash
   npm run dev preflight
   ```

   Debe decir `PASS` o `WARNING`. Nunca `FAIL`.

3. **Hacer una publicación de prueba en DRY_RUN:**

   ```bash
   npm run dev brief --idea="Test de producción" --formato=imagen
   ```

   Verificar que no hay errores.

4. **Cambiar a producción:**

   ```bash
   # Editar .env
   DRY_RUN=false
   ```

   O ejecutar el setup interactivo:

   ```bash
   node scripts/setup-production.js
   ```

5. **Primera publicación real (manual):**

   ```bash
   npm run dev brief --idea="Primer post real" --formato=imagen
   ```

   Verificar en Instagram que se publicó.

6. **Monitorear:**
   ```bash
   npm run dev health-check
   npm run dev daemon  # arranca scheduler + dashboard
   ```

---

## Fase 7: Monitoreo Continuo

### Comandos diarios recomendados:

```bash
# Verificar salud del sistema
npm run dev health-check

# Verificar rate limits
npm run dev compliance-rate-limits

# Revisar audit log
npm run dev compliance-audit --limit=20
```

### Alertas automáticas:

- Si `health-check` retorna `critical` → revisar inmediatamente
- Si rate limits > 80% → pausar publicaciones automáticas
- Si crisis detectada → ejecutar `npm run dev crisis-estado`

---

## Rollback (Emergencia)

Si algo sale mal:

```bash
# Parada de emergencia
npm run dev emergency-stop --razon="Rollback por incidente"

# Volver a DRY_RUN
# Editar .env: DRY_RUN=true

# Reanudar cuando esté resuelto
npm run dev emergency-resume --resolucion="Incidente resuelto"
```

---

## Troubleshooting Rápido

| Síntoma                    | Causa probable                         | Solución                                  |
| -------------------------- | -------------------------------------- | ----------------------------------------- |
| `Token inválido (401)`     | Token expirado                         | Renovar en Meta Developers                |
| `No container ID received` | URL de imagen no pública               | Usar URLs públicamente accesibles         |
| `Reel processing failed`   | Video no cumple specs                  | Máx 60s, 1080x1920, MP4                   |
| `Email queued`             | Email provider no configurado          | Configurar Resend/SendGrid                |
| `SQLite locked`            | Múltiples procesos                     | Usar WAL mode (ya configurado)            |
| `Preflight FAIL`           | Términos no aceptados o Meta API caída | Leer TERMS_OF_SERVICE.md, verificar token |

---

## Verificación Final

Antes de considerar el sistema "en producción":

- [ ] `npm run dev preflight` → PASS
- [ ] `npm run dev health-check` → healthy
- [ ] Meta API conectada y respondiendo
- [ ] Al menos 1 post publicado manualmente con éxito
- [ ] Email configurado (para recibir alertas)
- [ ] DRY_RUN=false
- [ ] COMPLIANCE_ACCEPTED_TERMS=true
- [ ] Scheduler corriendo (`npm run dev daemon`)
- [ ] Backup de `data/` configurado

---

_Última actualización: 2026-05-18_
