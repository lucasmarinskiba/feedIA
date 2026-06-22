---
description: Skill Carousel Pipeline — Render + publicación end-to-end (Camino A/B/C, fallback auto)
---

Skill end-to-end carrusel: prompt → imagen real → Instagram publicado.
Módulo: `src/capabilities/quickCarousel/carouselPipeline.ts`

## Comportamiento según $ARGUMENTS

**"capabilities"** → `checkCapabilities()` — qué caminos están disponibles según credenciales en env.

**"full [prompt]"** → `POST /api/carousel/full` — pipeline completo en 1 call (genera + renderiza + opcionalmente publica).

**"render [id]"** → `runCarouselPipeline(brand, pkg)` — renderiza paquete existente.

**"preview [id]"** → `generatePreviewHTML()` — HTML interactivo para revisión humana antes de publicar.

**"scheduled process"** → `processScheduled()` — procesa publicaciones programadas vencidas.

**"scheduled list"** → `listScheduled()` — publicaciones agendadas pendientes.

## Los 3 caminos disponibles

### Camino A — Native SVG/PNG (default si no hay otros)

```
Requiere: solo ANTHROPIC_API_KEY
Tecnología: render/rasterizer.ts (PNG bitmap font 5x7)
Costo: $0 extra
Velocidad: <5s por slide
Calidad: básica pero publicable
```

Genera SVG preview + PNG publicable. Diseño determinista, mismo branding de marca.

### Camino B — Canva

```
Requiere: CANVA_CLIENT_ID + CANVA_CLIENT_SECRET + canvaTemplateId
Setup: app en canva.com/developers + OAuth flow
Costo: cuota Canva Free/Pro
Velocidad: ~10s por slide
Calidad: profesional, editable después
```

Autofill template + export PNG. Permite intervención humana posterior en Canva.

### Camino C — fal.ai (imágenes IA fotorrealistas)

```
Requiere: FAL_KEY
Costo: ~$0.003-0.05 por imagen según modelo (flux/schnell barato, flux/pro caro)
Velocidad: 3-8s por slide
Calidad: fotorealista alta
```

Genera fondos/escenas con Stable Diffusion / Flux. Mejor para contenido visual impactante.

## Fallback automático

Si camino B o C falla → cae a A automáticamente. Errores registrados en `errors[]`.

## Selección automática

Si `path` no se pasa:

1. Si hay Canva creds → recomienda B
2. Si hay FAL_KEY → recomienda C
3. Sino → A (siempre disponible)

Override con `config.path = 'A-native' | 'B-canva' | 'C-fal-ai'`.

## Publicación

```ts
runCarouselPipeline(brand, pkg, {
  path: 'A-native',
  publishToInstagram: true, // requiere UPLOAD_POST_KEY
  publishToOtherPlatforms: ['tiktok', 'facebook'],
  scheduledFor: '2026-06-01T12:00:00Z', // opcional: programar
  dryRun: false, // true = simular, no publica real
});
```

Si `scheduledFor` se setea → guarda en queue → `processScheduled()` publica cuando llega la hora.

## Configuración completa por nivel

### Nivel 1 — Solo texto/briefs (sin imagen)

```
ANTHROPIC_API_KEY=sk-ant-xxx
```

### Nivel 2 — Imágenes nativas (PNG sin terceros)

```
ANTHROPIC_API_KEY=sk-ant-xxx
# camino A activo automáticamente
```

### Nivel 3 — Canva real

```
ANTHROPIC_API_KEY=sk-ant-xxx
CANVA_CLIENT_ID=xxx
CANVA_CLIENT_SECRET=xxx
# pasar canvaTemplateId en config
```

### Nivel 4 — Imágenes IA

```
ANTHROPIC_API_KEY=sk-ant-xxx
FAL_KEY=xxx
```

### Nivel 5 — Publicación auto + scheduler

```
ANTHROPIC_API_KEY=sk-ant-xxx
UPLOAD_POST_KEY=xxx               # API key de upload-post.com
DRY_RUN=false                     # true para testear sin publicar real
# correr processScheduled() cada N minutos via cron/scheduler
```

## Endpoints API

```
GET  /api/carousel/capabilities          → status de credenciales y caminos
POST /api/carousel/full                  → flujo completo 1-call
POST /api/carousel/render                → renderizar paquete existente
POST /api/carousel/preview               → HTML para revisión humana
POST /api/carousel/scheduled/process     → procesar publicaciones vencidas
GET  /api/carousel/scheduled             → lista de programadas pendientes
```

## Flujo recomendado

```bash
# 1. Verificar qué caminos hay disponibles
curl http://localhost:3000/api/carousel/capabilities

# 2. Crear carrusel + renderizar + (opcional) publicar en 1 call
curl -X POST http://localhost:3000/api/carousel/full \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "errores SEO en Instagram",
    "pipeline": {
      "publishToInstagram": true,
      "scheduledFor": "2026-06-01T18:00:00Z"
    }
  }'

# 3. Cada N minutos (cron) procesar agendadas
curl -X POST http://localhost:3000/api/carousel/scheduled/process
```

## 🧠 Cerebro FeedIA — hereda `/feedIA-brain`

Rol: **pipeline de carrusel IG (saves + dwell)**. Algoritmo: optimiza para sends/saves y alcance de Reels en frío (Instagram). Salida lista para usar, voz de marca, sin tells de IA, máxima elocuencia, mínimo esfuerzo del usuario.
