---
description: Sistema completo — crea + publica Carruseles, Reels y Stories en Instagram
---

Sistema end-to-end para los 3 formatos principales de Instagram.

## Estado de cada formato

| Formato      | Texto    | Render                | Publica auto | APIs necesarias                                   |
| ------------ | -------- | --------------------- | ------------ | ------------------------------------------------- |
| **Carrusel** | ✅       | ✅ A/B/C              | ✅           | ANTHROPIC + UPLOAD_POST (min)                     |
| **Story**    | ✅       | ✅ A/B                | ✅           | ANTHROPIC + UPLOAD_POST (min)                     |
| **Reel**     | ✅ guion | ⚠️ requiere API video | ⚠️ depende   | ANTHROPIC + (HEYGEN o RUNWAY o FAL) + UPLOAD_POST |

## Endpoints auth-aware

| Endpoint                                         | Función                   |
| ------------------------------------------------ | ------------------------- |
| `POST /api/me/carousel/full { prompt, publish }` | Carrusel end-to-end       |
| `POST /api/me/story/full { prompt, publish }`    | Story end-to-end          |
| `POST /api/me/reel/full { prompt, publish }`     | Reel end-to-end           |
| `GET  /api/me/reel/capabilities`                 | Caminos video disponibles |
| `GET  /api/me/system/capabilities`               | Setup status completo     |

## Caminos por formato

### Carruseles (`POST /api/me/carousel/full`)

- **A** Native SVG/PNG (default, sin API extra)
- **B** Canva (CANVA_CLIENT_ID + CLIENT_SECRET + canvaTemplateId)
- **C** fal.ai imágenes IA (FAL_KEY)

### Stories (`POST /api/me/story/full`)

- **A** Native PNG vertical 1080x1920 (default)
- **B** fal.ai con backgrounds IA (FAL_KEY)
- 1 PNG por frame, upload secuencial como Story series

### Reels (`POST /api/me/reel/full`)

- **A** Solo guion + cover (sin API video) — devuelve markdown para grabar manual
- **B** HeyGen avatar (HEYGEN_API_KEY + AVATAR_ID + VOICE_ID)
- **C** Runway text-to-video (RUNWAY_API_KEY)
- **D** fal.ai video models — Minimax/Kling (FAL_KEY)

Si `path` no se pasa → auto-detecta API más capaz disponible.

## Setup mínimo para publicar TODO automático

```bash
# .env
ANTHROPIC_API_KEY=sk-ant-xxx       # texto (obligatorio todos)
UPLOAD_POST_KEY=xxx                # publicar real (obligatorio)
DRY_RUN=false

# Para reels reales (elegir UNO):
HEYGEN_API_KEY=xxx                 # avatar parlante
HEYGEN_DEFAULT_AVATAR_ID=xxx
HEYGEN_DEFAULT_VOICE_ID=xxx
# o
RUNWAY_API_KEY=xxx                 # text-to-video cinematográfico
# o
FAL_KEY=xxx                        # Minimax/Kling/Flux
```

## Ejemplos

```bash
# Carrusel
curl -b cookies.txt -X POST http://localhost:3000/api/me/carousel/full \
  -H "Content-Type: application/json" \
  -d '{"prompt":"errores SEO Instagram","publish":true}'

# Story interactiva
curl -b cookies.txt -X POST http://localhost:3000/api/me/story/full \
  -H "Content-Type: application/json" \
  -d '{"prompt":"5 tips nutrición","frameCount":5,"goal":"engagement","includeInteractive":true,"publish":true}'

# Reel
curl -b cookies.txt -X POST http://localhost:3000/api/me/reel/full \
  -H "Content-Type: application/json" \
  -d '{"prompt":"transformación rutina mañana","style":"transformation","duration":30,"publish":true,"path":"B-heygen"}'
```

## Comportamiento sin APIs de video (Reels)

Si no hay HEYGEN/RUNWAY/FAL configurados:

- Reel devuelve `status: 'script-only'` + `needsManualRecording: true`
- Output: guion markdown completo + cover SVG/PNG + caption + hashtags
- User graba siguiendo el guion, sube manual

Esto es honesto: el sistema NO inventa video sin video API.

## Output unificado

Todos los endpoints devuelven:

```ts
{
  package | script: { id, slides|frames|scenes, caption, hashtags },
  pipeline: { status, videoPath?, slidePaths?, publishedUrl?, errors[] },
  quota: { current, max, remaining, percentUsed }
}
```

## Notificaciones automáticas

Por cada publicación:

- ✅ `carousel-published` (success) — publicó OK
- 📅 scheduled (info) — programado para más tarde
- ❌ `carousel-failed` (critical) — falló pipeline
- ⚠️ Para reels sin API video: warning con sugerencia de configurar

## Estado neto del sistema

✅ **Carruseles:** 100% end-to-end automatizado
✅ **Stories:** 100% end-to-end automatizado
⚠️ **Reels:** texto/guion siempre OK; video real solo con HEYGEN/RUNWAY/FAL

Para que reels también sean 100% automáticos → setear UNA de las 3 APIs de video.

## 🧠 Cerebro FeedIA — hereda `/feedIA-brain`

Rol: **publicador multi-plataforma coordinado**. Algoritmo: diferencia IG (sends/saves, grafo+Reels) de TikTok (completion/FYP en frío) y aplica el correcto. Salida lista para usar, voz de marca, sin tells de IA, máxima elocuencia, mínimo esfuerzo del usuario.
