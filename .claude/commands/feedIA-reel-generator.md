---
description: >
  Generador de Reels de Instagram con IA desde multi-fuente. Convierte URL de YouTube,
  artículo, idea, nota de voz, PDF, prompt o una publicación de IG analizada en un Reel
  listo: guion beat a beat + hook 0.3s + texto en pantalla + b-roll + audio sugerido +
  cover frame + caption + hashtags. Puede producir el cover/visuales con IA-render o via
  Canva (Computer Use auto/asistente). Usá esta skill cuando el usuario diga "reel",
  "hazme un reel", "pasá esto a reel", "guion de reel", "convertí este vídeo en reel",
  "video corto para IG", o cuando /feedIA-canva delegue formato reel. Funciona por voz,
  prompt, Autopilot o sugerencia del sistema.
---

# FeedIA · Generador de Reels con IA

Hermana de `/feedIA-canva` para video corto. Consulta SIEMPRE `/feedIA-canvas-design`
(reglas de cover/estilo) y respeta el branding de la cuenta (Brand Board).
Módulo backend: `src/capabilities/reelStudio/reelScriptwriter.ts`.

## FLUJO

### Paso 0 — Branding

Cargá voz/paleta/nicho de la marca. El guion habla como la cuenta.

### Paso 1 — Fuente

Mismo multi-input que `/feedIA-canva`:

- YouTube → `src/skills/carrusel-instagram/scripts/get_transcript.py`
- Artículo → `fetch_article.py` (o Claude in Chrome si client-rendered)
- PDF/estudio → `Read`
- IG post analizado → `/api/executive/posts-analysis` (top performer = base de hook)
- Idea/nota/prompt → directo

### Paso 2 — Guion (beat a beat)

Para duración elegida (15/20/30/45/60s), generá beats:

- **Hook 0–3s** — detiene scroll. Pregunta/contradicción/número. Texto grande arriba.
- **Desarrollo** — 1 idea por beat, texto en pantalla + b-roll sugerido + voz en off.
- **Clímax/valor** — el insight principal.
- **CTA** — guardá/seguí/comentá. Loop si aplica.
  Por beat declarar: `tipo`, `duracionSegundos`, `vozEnOff`, `textoEnPantalla`, `bRoll`, `transicion`.

### Paso 3 — Cover frame

Portada 1080×1920 que detiene scroll en 0.3s. Texto grande, contraste de marca.
Producir cover por **IA-render** (`generate_image.py`, aspect 9:16) o **Canva-CU**.

### Paso 4 — Caption + hashtags + audio

Caption voz de marca + CTA. Hashtags pirámide (`/feedIA-hashtag-science`).
Audio sugerido (trending o original) según nicho.

### Paso 5 — Producción visual / publicar

- **IA-render:** cover PNG ya. Guion en `.md` para grabar/editar.
- **Canva-CU:** disparar `launchCanvaBrain({ format: 'reel' })` — equipo opera Canva.
- Publicar con `/feedIA-publish` o programar en Calendario.

## $ARGUMENTS

| Arg                   | Acción                                         |
| --------------------- | ---------------------------------------------- |
| `[URL/idea/texto]`    | fuente → reel completo                         |
| `15\|20\|30\|45\|60`  | fuerza duración                                |
| `hook [tema]`         | solo hooks (delega `/feedIA-reel-hook-master`) |
| `serie [tema]`        | N episodios conectados                         |
| `canva` / `ia-render` | fuerza camino visual                           |

## REGLAS

- Hook en 0.3s o se pierde el scroll. Primeros 3s = todo.
- Retención: 1 idea/beat, cortes rápidos, texto legible móvil.
- Cover 9:16, texto arriba, branding visible.
- Cifras reales o preguntar. Voz de marca. Sin guru.

## HERMANAS

`/feedIA-canvas-design` (estilo) · `/feedIA-reel-hook-master` (hooks) ·
`/feedIA-reel-studio` (backend guion) · `/feedIA-cu-brain` (Canva) ·
`/feedIA-video` (producción IA de video) · `/feedIA-publish`.

## 🧠 Cerebro FeedIA — hereda `/feedIA-brain`

Rol: **generador de Reels (hook + retención + loop)**. Algoritmo: optimiza para sends/saves y alcance de Reels en frío (Instagram). Salida lista para usar, voz de marca, sin tells de IA, máxima elocuencia, mínimo esfuerzo del usuario.
