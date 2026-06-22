# CapCut — Recetas operativas (vía Make / n8n / Zapier)

CapCut no expone API pública. FeedIA lo integra como **post-producción opcional**:
envía un video base + plan de edición a un webhook de automatización, y el flujo
retorna el MP4 refinado a `POST /api/webhook/capcut`.

## Variables de entorno

```bash
# Webhook de automatización (uno de los tres)
MAKE_WEBHOOK_URL=https://hook.make.com/...
N8N_WEBHOOK_URL=https://n8n.tudominio.com/webhook/...
ZAPIER_WEBHOOK_URL=https://hooks.zapier.com/hooks/catch/...

# URL pública de este servidor (para que Make/n8n sepa dónde devolver el asset)
SERVER_BASE_URL=https://feedia.vercel.app

# Opcional: webhook de retorno forzado (sobreescribe el calculado)
CAPCUT_WEBHOOK_RETURN_URL=https://feedia.vercel.app/api/webhook/capcut
```

## Recipes soportadas por el engine

| Recipe | Qué hace en CapCut | Cuándo usarla |
|--------|-------------------|---------------|
| `capcut-auto-captions` | Genera subtítulos automáticos sobre el video base. | Por defecto; accesibilidad + retención. |
| `capcut-beat-sync` | Sincroniza cortes con el beat de la música enviada. | Cuando hay audio/música con tempo claro. |
| `capcut-add-b-roll` | Agrega clips de stock entre las tomas del guion. | Videos narrados que necesitan variedad visual. |
| `capcut-color-grading` | Aplica LUT/ajuste de color consistente con la marca. | Para unificar look de varios clips. |
| `capcut-export-1080` | Solo re-exporta a 1080p 9:16 con settings óptimos. | Cuando el video base ya está editado pero falta render final. |

## Payload que envía FeedIA al webhook

```json
{
  "event": "capcut.enhance",
  "timestamp": "2026-06-10T14:59:57.640Z",
  "data": {
    "requestId": "uuid-v4",
    "videoUrl": "https://cdn.../video-base.mp4",
    "caption": "Marca — Idea del post",
    "captions": ["Texto slide 1", "Texto slide 2"],
    "recipe": "capcut-auto-captions",
    "webhookReturnUrl": "https://feedia.vercel.app/api/webhook/capcut"
  }
}
```

## Respuesta esperada del flujo de automatización

El flujo de Make/n8n debe hacer:
1. Descargar `videoUrl`.
2. Abrir CapCut Web / desktop (Computer Use o manual).
3. Aplicar la receta usando el plan de acción que viene implícito.
4. Subir el MP4 resultante a un bucket/cloud.
5. POST a `webhookReturnUrl`:

```json
{
  "requestId": "uuid-v4",
  "refinedUrl": "https://cdn.../video-refinado.mp4"
}
```

Si falla, enviar:

```json
{
  "requestId": "uuid-v4",
  "error": "Motivo del fallo"
}
```

## Comportamiento del engine

- Si CapCut devuelve el asset refinado → FeedIA lo usa para publicación.
- Si falla, expira (10 min) o no hay webhook configurado → **devuelve el video original sin bloquear**.
- En `DRY_RUN=true` simula un MP4 refinado sin llamar a ningún webhook.

## Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/webhook/capcut` | Retorno del asset refinado. |
| GET | `/api/webhook/capcut/health` | Health check del receptor. |

## Plantilla mínima de flujo n8n

1. **Webhook** → method POST, path `capcut-enqueue`.
2. **HTTP Request** → descargar `data.videoUrl`.
3. **Manual/Computer Use** → ejecutar edición en CapCut (por ahora paso humano o Playwright).
4. **Transfer** → subir MP4 a cloud (Cloudinary / S3 / Bytescale).
5. **HTTP Request** → POST a `data.webhookReturnUrl` con `requestId` y `refinedUrl`.

## Notas de seguridad

- No exponer `requestId` predecible: siempre UUID v4.
- Validar en el flujo que `webhookReturnUrl` pertenezca a tu dominio para evitar SSRF.
- No enviar credenciales de CapCut por el payload; el flujo de automatización las mantiene en secretos.
