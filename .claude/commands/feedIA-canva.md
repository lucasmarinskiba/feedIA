---
description: >
  Generador de carruseles / stories / reels de Instagram con IA. Transforma cualquier
  input (URL YouTube, URL artículo, idea en texto, nota de voz, PDF, estudio, o una
  publicación de IG analizada) en contenido listo para publicar: estrategia + copy
  slide a slide + prompts de imagen (gpt-image-2 / nano-banana-2) + generación REAL
  de PNG 1080x1350. También puede DISEÑAR EN CANVA vía Computer Use (auto / asistente)
  con conocimiento de diseñadores y especialistas. Usá esta skill SIEMPRE que el
  usuario pida "carrusel", "hazme un carrusel", "carrusel de Instagram", "slides para
  Instagram", "convierte este vídeo en carrusel", "hazme contenido visual de este
  artículo/vídeo/idea", mencione una URL de YouTube o artículo con intención de
  publicar, diga "hazme un carrusel sobre X", "saca redes de esto", "content de este
  vídeo", "pasame esto a reel/story", o similar. Funciona por voz, por prompt en
  FeedIA, automático por Autopilot, o sugerido por el sistema.
---

# FeedIA · Generador de Carruseles / Stories / Reels con IA

Skill maestra de creación visual de FeedIA. Convierte **cualquier fuente** en contenido
de Instagram listo para publicar. Dos caminos de producción de imagen, ambos válidos:

1. **Camino IA-render** — genera los PNG reales con `gpt-image-2` / `nano-banana-2`.
2. **Camino Canva-CU** — opera Canva.com vía Computer Use (cuando el usuario activó
   Auto-pilot o Asistente), con conocimiento de diseñadores/branding/publicistas.

Módulos backend: `src/capabilities/canvaSkill/canvaDesignSkill.ts`,
`src/capabilities/quickCarousel/`, `src/capabilities/reelStudio/`,
`src/capabilities/computerUse/brainAwareCu.ts`.
Scripts de render: `src/skills/carrusel-instagram/scripts/`.

> ⚠️ **Branding primero.** NUNCA hardcodear "IA Masters Academy". Cargá la identidad
> real de la cuenta (nombre, paleta, voz, tono, prohibidos) ANTES de producir. Fuentes,
> en orden: `/api/moodboard` (Brand Board) → perfil de marca → `/feedIA-canvas-design`.
> Si no hay marca configurada, preguntá el nombre + nicho una vez y seguí.

---

## CUÁNDO Y CÓMO SE DISPARA

| Disparo                                                                     | Origen                                                        |
| --------------------------------------------------------------------------- | ------------------------------------------------------------- |
| "carrusel", "slides", "hazme un carrusel sobre X"                           | voz / chat / prompt                                           |
| URL YouTube o artículo + intención publicar                                 | voz / chat / pegar URL                                        |
| "convierte este vídeo en carrusel", "saca redes de esto", "content de esto" | voz / chat                                                    |
| "pasá esto a reel" / "story de esto"                                        | delega a `/feedIA-reel-generator` o `/feedIA-story-generator` |
| Autopilot programó pieza de contenido                                       | `autonomyCore` → `dispatchSkill`                              |
| FeedIA sugiere (Sala Ejecutiva → Propuestas)                                | botón "Aprobar y agendar"                                     |

Siempre consultá el cerebro de diseño `/feedIA-canvas-design` para reglas visuales,
y el cerebro CU `/feedIA-cu-brain` cuando el camino sea Canva.

---

## FLUJO COMPLETO

### Paso 0 — Cargar branding (obligatorio)

Traé identidad real de la cuenta. Si Brand Board tiene paleta/voz, usalas. Si la cuenta
es "Paithon Labs", el contenido habla como Paithon Labs, no como genérico.

### Paso 1 — Obtener el contenido fuente

Detectá tipo de input y traé el contenido:

**URL de YouTube** (`youtube.com` / `youtu.be`):

```bash
pip install -q youtube-transcript-api --break-system-packages
python src/skills/carrusel-instagram/scripts/get_transcript.py "<URL>"
```

**URL de artículo** (cualquier otra URL):

```bash
python src/skills/carrusel-instagram/scripts/fetch_article.py "<URL>"
```

Si devuelve HTML vacío (client-rendered), usá Claude in Chrome:
`mcp__Claude_in_Chrome__navigate` → `mcp__Claude_in_Chrome__get_page_text`.

**PDF / estudio:** leé el archivo con el tool `Read` y usá el texto.

**Publicación de IG analizada:** traé el análisis de `/api/executive/posts-analysis`
o de la vista Vision/Analytics; usá el top-performer como base de ángulo.

**Texto / idea / nota de voz:** usá directo.

### Paso 2 — Análisis y producción

Aplicá el sistema completo (VOZ, OBJETIVO, TIPOS, ESTRUCTURA, HOOKS, ESTILO de
`/feedIA-canvas-design`). Si faltan datos, preguntá MÁX 3: (a) tipo/objetivo,
(b) CTA, (c) dato a confirmar. **Nunca inventes cifras.**

### Paso 3 — PARAR y pedir 2 confirmaciones

Tras mostrar la estrategia:

> "¿Cambiás algo en estrategia o copy antes de producir?
> ¿Cómo lo producimos?
>
> - **IA-render** (gpt-image-2 / nano-banana-2) — genero los PNG ya.
> - **Canva (Computer Use)** — el equipo opera Canva: Nova diseña, Lía copy, Gard
>   valida, Luca publica. Requiere CUA en Auto o Asistente."

No generes nada hasta confirmación explícita con camino + modelo.

### Paso 4A — Camino IA-render

```bash
pip install -q fal-client pillow requests --break-system-packages
export FAL_KEY=$(grep FAL_KEY src/skills/carrusel-instagram/.env | cut -d= -f2)
```

Por slide:

```bash
output=$(python src/skills/carrusel-instagram/scripts/generate_image.py \
  --slide-num N --total TOTAL \
  --title "HEADLINE EXACTO" --body "SUBTITULO EXACTO" \
  --prompt "PROMPT [LAYOUT]+[HERO]+[PROGRESS]+[HEADLINE]+[SUBPUNTOS]+[TIP]+[ESTILO]+[CONSTRAINTS]" \
  --model gpt-image-2 \
  --output-dir "<OUTPUT_DIR>/slides/" 2>/dev/null)
```

Tras cada slide: mostrar `Slide N/TOTAL ✓ — [URL]` + `Read` del PNG para preview inline.

### Paso 4B — Camino Canva (Computer Use)

Disparar el Cerebro CU: frontend `lib/canvaBrain.js` (`launchCanvaBrain`) o backend
`/api/cu/canva/to-instagram`. El equipo de especialistas opera Canva:

- 🎨 **Brand Strategist** — carga marca del Brand Board
- 🖼️ **Visual Designer (Nova)** — template + layout + paleta
- ✍️ **Communicator (Lía)** — titulares + bullets + CTA con voz de marca
- 📣 **Publicist (Luca)** — hook + caption + hashtags Explore-friendly
- 🎭 **Art Director (Pixel)** — mood + contraste + consistencia con el feed
- 🛡️ **Compliance (Gard)** — tono + shadowban + políticas IG
- 🚀 **Publisher (CUA)** — cursor abre Canva → diseña → exporta → publica IG

Respetar modo CUA: **Auto** = sin aprobaciones; **Asistente/Supervisado** = aprobar
cada paso crítico (designer + publisher). Usar `/feedIA-cu-brain` para que CU lea
memoria de sesiones previas (qué diseños funcionaron).

### Paso 5 — Guardar y presentar

Guardá en `<OUTPUT_DIR>`: `strategy.md`, `caption.md`, `hashtags.md` + los PNG.
Presentá la carpeta y ofrecé: programar en Calendario, publicar ya, o A/B variants.

---

## $ARGUMENTS

| Arg                   | Acción                                         |
| --------------------- | ---------------------------------------------- |
| `[URL YouTube]`       | transcript → carrusel                          |
| `[URL artículo]`      | fetch → carrusel                               |
| `[idea/texto libre]`  | idea → carrusel                                |
| `carrusel [tema]`     | fuerza formato carrusel                        |
| `story [tema/fuente]` | delega a `/feedIA-story-generator`             |
| `reel [tema/fuente]`  | delega a `/feedIA-reel-generator`              |
| `canva [tema]`        | fuerza camino Canva-CU                         |
| `ia-render [tema]`    | fuerza camino IA-render                        |
| `batch`               | genera la semana desde el calendario editorial |
| `variants [tema]`     | 3 carruseles A/B del mismo input               |

---

## REGLAS DE PRODUCCIÓN (resumen — detalle completo en `/feedIA-canvas-design`)

- Formato carrusel **1080×1350 (4:5)**, 10 slides, magazine infographic denso.
- Headlines **bicolor** (blanco + color de marca en misma frase). Subtítulo con highlight.
- 80-150 palabras por slide (S2-S9). Densidad = saves.
- TIP PRO box + progress `X/10` en todos los slides. Hero photo realista S1/S3-S8/S10.
- Paleta y tipografía SIEMPRE de la marca cargada (no las del template demo).
- Voz de marca de Brand Board. Cifras reales o preguntá. Sin vocabulario corporativo vacío.

---

## ANTI-PATRONES

- Hardcodear marca demo en vez de cargar la real.
- Generar imágenes sin las 2 confirmaciones del Paso 3.
- Inventar datos / cifras.
- Camino Canva con CUA en Off (avisá que hay que activar Auto/Asistente).
- Carrusel < 10 slides o ratio ≠ 4:5.
- Texto en inglés con audiencia hispanohablante.
- Ignorar `/feedIA-canvas-design` y `/feedIA-cu-brain`.

---

## SKILLS HERMANAS (orquestación)

- `/feedIA-canvas-design` — cerebro de diseño (reglas visuales compartidas). **Consultar siempre.**
- `/feedIA-reel-generator` — reels desde multi-fuente.
- `/feedIA-story-generator` — stories desde multi-fuente.
- `/feedIA-cu-brain` — Computer Use brain-aware para operar Canva.
- `/feedIA-quick-carousel` — atajo 1-prompt (pipeline backend rápido).
- `/feedIA-hook-generator`, `/feedIA-copywriting`, `/feedIA-hashtag-science` — refuerzo de copy.
- `/feedIA-publish` — publicar el resultado.

## 🧠 Cerebro FeedIA — hereda `/feedIA-brain`

Rol: **operador experto de Canva vía Computer Use/API**. Algoritmo: diferencia IG (sends/saves, grafo+Reels) de TikTok (completion/FYP en frío) y aplica el correcto. Salida lista para usar, voz de marca, sin tells de IA, máxima elocuencia, mínimo esfuerzo del usuario.
