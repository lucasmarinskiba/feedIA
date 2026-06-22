---
description: Skill End-to-End Publish — Sistema crea carruseles + los sube solo
---

Sistema completo: prompt → carrusel → Instagram, sin intervención humana.

## Flujo end-to-end

```
USUARIO (autenticado)
  ↓ POST /api/me/carousel/full { prompt: "..." , publish: true }
  ↓
  ├─ Lee BrandProfile del user.activeBrandId
  ├─ createQuickCarousel() → slides+caption+hashtags (Claude)
  ├─ runCarouselPipeline() → renderiza PNGs (Camino A/B/C auto)
  └─ uploadToSocial() → publica en Instagram
SCHEDULER LOOP (cada 2 min)
  ↓
  └─ processScheduled() → publica los carruseles cuyo scheduledFor venció
```

## Endpoints auth-aware

| Endpoint                            | Función                                                       |
| ----------------------------------- | ------------------------------------------------------------- |
| `POST /api/me/carousel/full`        | Crear + renderizar + (opt) publicar en cuenta activa del user |
| `GET  /api/me/carousel/status?id=X` | Estado de un paquete específico                               |
| `GET  /api/me/carousel/status`      | Lista últimos 10 paquetes                                     |
| `GET  /api/me/system/capabilities`  | Qué APIs están configuradas + hint si falta algo              |
| `GET  /api/scheduler/status`        | Estado del scheduler + pendientes                             |

## Setup mínimo para que el sistema PUBLIQUE solo

### Variables de entorno obligatorias

```bash
# .env
ANTHROPIC_API_KEY=sk-ant-xxx       # OBLIGATORIO — genera todo el texto
UPLOAD_POST_KEY=xxx                # OBLIGATORIO para publicar real
DRY_RUN=false                      # true = simula, no publica
```

### Variables opcionales (mejor calidad)

```bash
FAL_KEY=xxx                        # imágenes IA fotorrealistas (camino C)
CANVA_CLIENT_ID=xxx                # diseños editables Canva (camino B)
CANVA_CLIENT_SECRET=xxx
```

## Caminos de render (auto-detección)

| Si tenés...            | Camino activo       | Costo extra      |
| ---------------------- | ------------------- | ---------------- |
| Solo ANTHROPIC_API_KEY | A (Native SVG/PNG)  | $0               |
| + CANVA\_\*            | B (Canva templates) | cuota Canva      |
| + FAL_KEY              | C (fal.ai IA)       | ~$0.003-0.05/img |

Si camino B/C falla → fallback automático a A.

## Ejemplo de uso end-to-end

```bash
# 1. Registrar user
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"yo@email.com","password":"miPass123","displayName":"Yo","plan":"pro"}'

# 2. Login (set cookie)
curl -c cookies.txt -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"yo@email.com","password":"miPass123"}'

# 3. Agregar cuenta IG
curl -b cookies.txt -X POST http://localhost:3000/api/users/brands/add \
  -H "Content-Type: application/json" \
  -d '{
    "brandId": "mi-marca",
    "profile": {
      "name": "Mi Marca",
      "handle": "mimarca",
      "niche": "fitness"
    }
  }'

# 4. Verificar capacidades
curl -b cookies.txt http://localhost:3000/api/me/system/capabilities
# Devuelve qué APIs hay + si puede publicar real

# 5. Crear + publicar carrusel en 1 call
curl -b cookies.txt -X POST http://localhost:3000/api/me/carousel/full \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "errores comunes al hacer ejercicio en casa",
    "publish": true
  }'

# O programar para más tarde:
curl -b cookies.txt -X POST http://localhost:3000/api/me/carousel/full \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "5 tips de nutrición",
    "publish": true,
    "scheduledFor": "2026-06-01T18:00:00Z"
  }'

# 6. Ver scheduler status
curl http://localhost:3000/api/scheduler/status
```

## Scheduler automático

Al arrancar el server (`npm start`):

- Se arranca `startSchedulerLoop()` automáticamente
- Cada **2 minutos** procesa publicaciones programadas
- No bloquea: si una falla, sigue al próximo tick
- Persiste estado en `data/quick-carousel/scheduled.json`

## Validación de capacidades

```bash
curl http://localhost:3000/api/me/system/capabilities
```

Respuesta ejemplo:

```json
{
  "hasAnthropic": true,
  "hasFalAi": false,
  "hasCanva": false,
  "hasUploadPost": true,
  "availablePaths": ["A-native"],
  "recommendedPath": "A-native",
  "canPublish": true,
  "publishHint": "OK — sistema puede publicar automáticamente",
  "userPlan": "pro",
  "planLimits": { "maxBrands": 5, "maxPostsPerMonth": 300 }
}
```

## Qué falta para publicar REAL en Instagram

| Pieza                     | Estado                    | Cómo conseguir                                         |
| ------------------------- | ------------------------- | ------------------------------------------------------ |
| Anthropic API             | OBLIGATORIO               | https://console.anthropic.com                          |
| Upload-Post API           | OBLIGATORIO para publicar | https://upload-post.com (proxy a Meta)                 |
| Cuenta Instagram Business | OBLIGATORIO               | Convertir cuenta a Business + conectar a Facebook Page |
| Facebook Page             | OBLIGATORIO               | crear página de FB y conectarla                        |
| Permisos Meta Developer   | OBLIGATORIO               | crear app en developers.facebook.com con scopes IG     |

Alternativa sin Meta API: `browserOperators/instagram/` automatiza browser real (más frágil, no oficial).

## Plan de costos estimados

| Acción                 | Camino A             | Camino B           | Camino C        |
| ---------------------- | -------------------- | ------------------ | --------------- |
| Generar texto (Claude) | $0.05-0.20           | $0.05-0.20         | $0.05-0.20      |
| Render imágenes        | $0                   | cuota Canva        | $0.02-0.50      |
| Upload Instagram       | $0.001 (Upload-Post) | igual              | igual           |
| **Total por carrusel** | **~$0.05**           | **~$0.05 + Canva** | **~$0.10-0.70** |

## Comandos del skill

`/feedIA-publish [prompt]` — crea+publica directo
`/feedIA-publish status` — ver scheduler
`/feedIA-publish capabilities` — qué APIs hay configuradas
`/feedIA-publish history` — últimos 10 paquetes del user

## 🧠 Cerebro FeedIA — hereda `/feedIA-brain`

Rol: **publicador con timing y formato óptimo**. Algoritmo: diferencia IG (sends/saves, grafo+Reels) de TikTok (completion/FYP en frío) y aplica el correcto. Salida lista para usar, voz de marca, sin tells de IA, máxima elocuencia, mínimo esfuerzo del usuario.
