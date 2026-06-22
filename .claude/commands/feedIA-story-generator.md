---
description: >
  Generador de Stories de Instagram con IA desde multi-fuente. Convierte URL de YouTube,
  artículo, idea, nota de voz, PDF, prompt o publicación de IG analizada en una secuencia
  de Stories lista: frames 1080x1920 + copy por frame + stickers interactivos
  (poll/quiz/slider/pregunta) + CTA + link sugerido. Produce visuales con IA-render o via
  Canva (Computer Use auto/asistente). Usá esta skill cuando el usuario diga "story",
  "stories", "hazme stories", "pasá esto a story", "secuencia de stories", "historia de
  IG", o cuando /feedIA-canva delegue formato story. Funciona por voz, prompt, Autopilot
  o sugerencia del sistema.
---

# FeedIA · Generador de Stories con IA

Hermana de `/feedIA-canva` para Stories 9:16. Consulta SIEMPRE `/feedIA-canvas-design`
y respeta el branding de la cuenta. Backend: `src/capabilities/storyStudio/` /
`/api/studio/stories`. Refuerzo de engagement: `/feedIA-story-engagement-stacker`.

## FLUJO

### Paso 0 — Branding

Voz/paleta/nicho de la marca. Stories hablan como la cuenta.

### Paso 1 — Fuente

Multi-input igual que `/feedIA-canva` (YouTube, artículo, PDF, IG post analizado, idea/nota).

### Paso 2 — Secuencia de frames (3/5/7)

Por objetivo (engagement/tráfico/ventas/comunidad/educación), generá frames:

- **Frame 1 — gancho** — para el tap-out. Texto grande, branding.
- **Frames medios** — 1 idea/frame. Máx 3 elementos visuales por frame.
- **Sticker interactivo** cada 2-3 frames: poll / quiz / slider / pregunta / cuenta regresiva.
- **Frame final — CTA** — desliza al link / DM / siguiente post.
  Por frame declarar: `tipo`, `textoPrincipal`, `textoSecundario`, `sticker`, `cta`, `fondoSugerido`.

### Paso 3 — Producción visual

- **IA-render:** `generate_image.py` con aspect 9:16 (1080×1920) por frame.
- **Canva-CU:** `launchCanvaBrain({ format: 'historia' })` — equipo opera Canva.

### Paso 4 — Estrategia + link + horario

Link en bio/sticker sugerido. Mejor horario por objetivo. Secuencia para retención
(no más de 5-7 frames salvo serie). Stickers para algoritmo (interacción = más alcance).

### Paso 5 — Publicar

`/feedIA-publish` o programar. Stories caducan 24h → ideal para series diarias.

## $ARGUMENTS

| Arg                                                 | Acción                                                             |
| --------------------------------------------------- | ------------------------------------------------------------------ |
| `[URL/idea/texto]`                                  | fuente → secuencia stories                                         |
| `3\|5\|7`                                           | fuerza cantidad de frames                                          |
| `engagement\|trafico\|ventas\|comunidad\|educacion` | objetivo                                                           |
| `stickers`                                          | maximizar interactivos (delega `/feedIA-story-engagement-stacker`) |
| `canva` / `ia-render`                               | fuerza camino visual                                               |

## REGLAS

- 1080×1920 (9:16). Máx 3 elementos por frame. Texto legible a pulgar.
- Sticker interactivo cada 2-3 frames (poll/quiz/slider) = más alcance algorítmico.
- Gancho en frame 1 o tap-out. CTA claro al final.
- Branding visible. Voz de marca. Cifras reales o preguntar.

## HERMANAS

`/feedIA-canvas-design` (estilo) · `/feedIA-story-engagement-stacker` (stickers) ·
`/feedIA-cu-brain` (Canva) · `/feedIA-publish` · `/feedIA-broadcast-channels`.

## 🧠 Cerebro FeedIA — hereda `/feedIA-brain`

Rol: **generador de Stories (relación + completion)**. Algoritmo: optimiza para sends/saves y alcance de Reels en frío (Instagram). Salida lista para usar, voz de marca, sin tells de IA, máxima elocuencia, mínimo esfuerzo del usuario.
