---
description: Catálogo completo de formatos — caminos, niveles, aspect ratios, batch
---

Sistema soporta los 3 formatos principales con caminos paralelos y customización.

## Paridad entre formatos

| Formato      | Caminos     | Cantidad config   | Duración config                              | Aspect ratios    | Batch       |
| ------------ | ----------- | ----------------- | -------------------------------------------- | ---------------- | ----------- |
| **Carrusel** | A/B/C (3)   | `slideCount` 3-20 | N/A                                          | 1:1, 4:5, 1.91:1 | ✅ hasta 10 |
| **Story**    | A/B/C (3)   | `frameCount` 1-10 | `durationSec` por frame 5-15                 | 9:16 (fixed)     | ✅ hasta 10 |
| **Reel**     | A/B/C/D (4) | 1 reel            | `duration` 15/30/60/90 + `customDurationSec` | 9:16, 1:1, 4:5   | ✅ hasta 5  |

## Caminos detallados

### Carrusel

- **A** Native SVG/PNG (default, sin API extra)
- **B** Canva (CANVA_CLIENT_ID + CLIENT_SECRET + canvaTemplateId)
- **C** fal.ai imágenes IA (FAL_KEY)

### Story

- **A** Native PNG 1080x1920 (default)
- **B** fal.ai backgrounds IA (FAL_KEY)
- **C** Canva templates (CANVA\_\*)

### Reel

- **A** Script-only (siempre, sin video real)
- **B** HeyGen avatar (HEYGEN_API_KEY + AVATAR_ID + VOICE_ID)
- **C** Runway text-to-video (RUNWAY_API_KEY)
- **D** fal.ai video — Minimax/Kling (FAL_KEY)

## 5 niveles aplicables a TODOS los formatos

| Nivel                  | Qué                        | Aplica a                 |
| ---------------------- | -------------------------- | ------------------------ |
| **1** Brief/script     | Solo texto + instrucciones | C/S/R                    |
| **2** Render nativo    | PNG/SVG sin API extra      | C/S (R = solo script)    |
| **3** Canva real       | Templates editables        | C/S                      |
| **4** Imágenes IA      | fal.ai backgrounds         | C/S (R con video models) |
| **5** Publicación auto | uploadToSocial + scheduler | C/S/R                    |

## Aspect Ratios soportados

### Carrusel

- `1:1` — 1080x1080 (cuadrado clásico)
- `4:5` — 1080x1350 (vertical, mejor para feed mobile, **default**)
- `1.91:1` — 1080x566 (horizontal, link previews)

### Story

- `9:16` — 1080x1920 (único soporte IG Story)

### Reel

- `9:16` — 1080x1920 (**default reel nativo**)
- `1:1` — para reels que también van al feed
- `4:5` — reel feed-optimized

## Cantidad configurable

### Carrusel

```json
{ "prompt": "...", "slideCount": 10 } // 3-20 slides (límite IG)
```

### Story

```json
{ "prompt": "...", "frameCount": 7 } // 1-10 frames
```

### Reel

```json
{ "prompt": "...", "duration": 60 }                 // preset
{ "prompt": "...", "customDurationSec": 45 }        // custom (se ajusta al preset más cercano)
```

## Endpoints individuales

```
POST /api/me/carousel/full     { prompt, slideCount, aspectRatio, formula, goal, publish, path, scheduledFor }
POST /api/me/story/full        { prompt, frameCount, goal, includeInteractive, publish, path }
POST /api/me/reel/full         { prompt, duration, customDurationSec, aspectRatio, style, publish, path }
```

## Endpoints BATCH (múltiples piezas en 1 call)

```
POST /api/me/batch/carousel    { prompts: ["...", "..."], slideCount, aspectRatio, publish, scheduledFor: [] }
POST /api/me/batch/story       { prompts: [...], frameCount, publish, path }
POST /api/me/batch/reel        { prompts: [...], duration, aspectRatio, publish, path }
```

Límites batch:

- Carrusel: 10 por call
- Story: 10 por call
- Reel: 5 por call (videos pesan más)

Cada batch:

- Chequea quota total ANTES de gastar tokens
- Ejecuta en paralelo (`Promise.all`)
- Devuelve array de resultados (`ok` + `status` por item)

## Endpoints capabilities (qué APIs hay)

```
GET /api/me/system/capabilities         → carrusel + global
GET /api/me/story/capabilities          → caminos story disponibles
GET /api/me/reel/capabilities           → caminos reel disponibles
```

## Ejemplos uso

### Carrusel batch 5 con aspect ratio custom

```bash
curl -b cookies.txt -X POST http://localhost:3000/api/me/batch/carousel \
  -H "Content-Type: application/json" \
  -d '{
    "prompts": [
      "errores SEO Instagram",
      "5 tips de nutrición",
      "cómo dormir mejor",
      "rutina de skincare",
      "10 hábitos de millonarios"
    ],
    "slideCount": 8,
    "aspectRatio": "4:5",
    "publish": true,
    "scheduledFor": [
      "2026-06-01T18:00:00Z",
      "2026-06-02T18:00:00Z",
      "2026-06-03T18:00:00Z",
      "2026-06-04T18:00:00Z",
      "2026-06-05T18:00:00Z"
    ]
  }'
```

### Reel custom 45s en 9:16 con HeyGen

```bash
curl -b cookies.txt -X POST http://localhost:3000/api/me/reel/full \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "transformación rutina mañana",
    "customDurationSec": 45,
    "aspectRatio": "9:16",
    "style": "transformation",
    "path": "B-heygen",
    "publish": true
  }'
```

### Batch 3 stories con Canva

```bash
curl -b cookies.txt -X POST http://localhost:3000/api/me/batch/story \
  -H "Content-Type: application/json" \
  -d '{
    "prompts": ["lanzamiento producto", "behind the scenes", "FAQ del día"],
    "frameCount": 4,
    "path": "C-canva",
    "canvaTemplateId": "tmpl-xyz",
    "publish": true
  }'
```

## Validación auto-detección

Si el usuario no pasa `path` o `aspectRatio`, sistema:

- `path`: usa `recommended` de `checkXCapabilities()` según env disponibles
- `aspectRatio`: default según formato (carrusel 4:5, story 9:16, reel 9:16)
- Si camino preferido falla → fallback automático al camino A

## Tabla final

| Formato  | Caminos     | Niveles | Cantidad max | Aspect ratios | Batch max | API key min para auto   |
| -------- | ----------- | ------- | ------------ | ------------- | --------- | ----------------------- |
| Carrusel | 3 (A/B/C)   | 5       | 20 slides    | 3 ratios      | 10        | ANTHROPIC + UPLOAD_POST |
| Story    | 3 (A/B/C)   | 5       | 10 frames    | 1 (9:16)      | 10        | ANTHROPIC + UPLOAD_POST |
| Reel     | 4 (A/B/C/D) | 5       | 90s          | 3 ratios      | 5         | + HEYGEN o RUNWAY o FAL |

## 🧠 Cerebro FeedIA — hereda `/feedIA-brain`

Rol: **selector de formato según objetivo y algoritmo**. Algoritmo: diferencia IG (sends/saves, grafo+Reels) de TikTok (completion/FYP en frío) y aplica el correcto. Salida lista para usar, voz de marca, sin tells de IA, máxima elocuencia, mínimo esfuerzo del usuario.
