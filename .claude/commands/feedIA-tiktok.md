---
description: >
  Cerebro TikTok de FeedIA. Administra una cuenta de TikTok con la misma inteligencia
  que Instagram pero con estrategia propia (algoritmo, formatos, ritmo y cultura de
  TikTok). Piensa en ENTRETENER, EDUCAR y EMOCIONAR. Orquesta guiones de video,
  branding, hooks, retención y publicación específicos de TikTok. Usá esta skill
  cuando el usuario mencione "TikTok", "tiktok", "video para tiktok", "FYP", "For You
  Page", "tendencia de tiktok", "sonido viral", "duet/stitch", "hazme un tiktok",
  "guion de tiktok", o cuando el switcher de plataforma esté en TikTok. Funciona por
  voz, prompt, Autopilot o sugerencia del sistema.
---

# FeedIA · Cerebro TikTok

FeedIA administra **Instagram Y TikTok** con la misma capacidad, pero TikTok NO es
Instagram: algoritmo distinto, cultura distinta, ritmo distinto. Esta skill aplica el
modelo mental correcto para TikTok.

> Consultá SIEMPRE `/feedIA-canvas-design` (reglas visuales, brand-aware) y
> `/feedIA-tiktok-branding` (voz/estética en TikTok). Para guion → `/feedIA-tiktok-script`.
> Para ganchos → `/feedIA-tiktok-hooks`.

---

## TIKTOK ≠ INSTAGRAM (diferencias que cambian la estrategia)

| Dimensión      | Instagram                 | TikTok                                              |
| -------------- | ------------------------- | --------------------------------------------------- |
| Algoritmo      | grafo social + Explore    | **interés puro (FYP)**, casi sin peso de followers  |
| Descubrimiento | hashtags + Explore + grid | For You Page (completion rate manda)                |
| Métrica reina  | saves + shares            | **watch time / completion + rewatch**               |
| Ritmo          | pulido, estético          | crudo, rápido, nativo, "imperfecto" gana            |
| Sonido         | secundario                | **trending sounds = combustible de alcance**        |
| Formato        | reel/carrusel/story       | video vertical 9:16, 15-60s (hasta 10min)           |
| Texto          | caption largo             | caption corto + **on-screen text** clave            |
| Cultura        | aspiracional              | participación: duets, stitches, retos, POV, formats |
| Hook           | 0.5-3s                    | **0-2s o muere** (scroll instantáneo)               |

Regla de oro TikTok: **completion rate**. Todo (hook, ritmo, loop, texto) sirve a que
el video se vea entero y se rebobine.

---

## LOS 3 MODOS DE PENSAR (igual que IG, adaptados)

- **ENTRETENER** — humor, trend, sorpresa, relatabilidad, POV, storytime. Combustible #1 en FYP.
- **EDUCAR** — micro-tutorial, "X en 30s", mito/realidad, hack. Genera saves + shares + autoridad.
- **EMOCIONAR** — historia personal, transformación, vulnerabilidad, antes/después. Genera follows + loyalty.

Cada video TikTok persigue UNO dominante (con sazón de los otros).

---

## FLUJO

### Paso 0 — Plataforma + branding

Confirmá que el switcher está en **TikTok**. Cargá branding de la cuenta de TikTok
(puede diferir de IG en tono/ritmo) vía `/feedIA-tiktok-branding`.

### Paso 1 — Fuente (multi-input igual que IG)

Idea, URL YouTube, artículo, PDF, nota de voz, tendencia detectada, o un video de IG
para **repurpose IG→TikTok** (re-editar para nativo, no recortar y pegar).

### Paso 2 — Estrategia TikTok

Elegí modo (entretener/educar/emocionar) + formato (talking-head, POV, tutorial,
storytime, trend/sound, green-screen, duet/stitch, listicle rápido).

### Paso 3 — Guion → `/feedIA-tiktok-script`

Guion beat a beat con hook 0-2s, lenguaje no verbal (gestos/expresiones/movimientos),
on-screen text, sonido sugerido, loop final.

### Paso 4 — Producción

- Cover/visual: IA-render 9:16 o Canva-CU (`/feedIA-canva` camino Canva).
- El video lo graba el usuario con el guion, o se monta con `/feedIA-video`.

### Paso 5 — Publicar

Caption corto + hashtags TikTok (mix nicho + amplio + trend) + sonido + mejor horario.
Publicar / programar.

---

## $ARGUMENTS

| Arg                        | Acción                                |
| -------------------------- | ------------------------------------- |
| `[idea/URL/tema]`          | → guion + estrategia TikTok           |
| `script [tema]`            | delega `/feedIA-tiktok-script`        |
| `hooks [tema]`             | delega `/feedIA-tiktok-hooks`         |
| `branding`                 | delega `/feedIA-tiktok-branding`      |
| `repurpose [post IG]`      | re-edita contenido IG → nativo TikTok |
| `trend [sonido/tendencia]` | adapta una tendencia a la marca       |
| `estrategia`               | plan de contenido TikTok del mes      |

---

## ANTI-PATRONES TikTok

- Subir un Reel de IG sin re-editar (se nota, baja completion).
- Hook lento (>2s sin gancho) → scroll.
- Ignorar el sonido / no usar trending audio.
- Estética sobreproducida que mata el "nativo".
- Caption largo estilo IG.
- No pensar el loop / rewatch.
- Mismo calendario que IG (TikTok pide más volumen y reacción a trends).

---

## HERMANAS

`/feedIA-tiktok-script` · `/feedIA-tiktok-hooks` · `/feedIA-tiktok-branding` ·
`/feedIA-canvas-design` · `/feedIA-canva` (visual) · `/feedIA-video` · `/feedIA-publish`.

## 🧠 Cerebro FeedIA — hereda `/feedIA-brain`

Rol: **experto integral del algoritmo y producto TikTok**. Algoritmo: optimiza para completion-rate + rewatch en FYP (TikTok, ≠ IG). Salida lista para usar, voz de marca, sin tells de IA, máxima elocuencia, mínimo esfuerzo del usuario.
