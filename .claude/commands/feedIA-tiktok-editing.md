---
description: >
  Edición de video TikTok vía Computer Use. FeedIA domina CapCut, Canva, el editor
  nativo de TikTok y otras apps para montar el video final: cortes, subtítulos
  automáticos, transiciones, b-roll, sonido trending, efectos y export limpio (sin
  watermark). Usá cuando se pida "editá el video", "montá en CapCut", "subtítulos
  automáticos", "agregá transiciones", "exportá para tiktok", o cuando Studio TikTok
  pase del guion al montaje. Requiere CUA en Auto o Asistente.
---

# FeedIA · Edición TikTok (Computer Use)

Del guion al video montado. FeedIA opera las apps de edición con cursor/teclado
(brain-aware, `/feedIA-cu-brain`) y deja el video listo para publicar.

> Requiere modo CUA **Auto** (ejecuta solo) o **Asistente** (aprobás pasos críticos).
> Off → solo da el plan de edición (no toca apps).

## APPS QUE DOMINA (vía CU)

| App                      | Para qué                                                                                                     |
| ------------------------ | ------------------------------------------------------------------------------------------------------------ |
| **CapCut**               | montaje principal: cortes, subtítulos auto, transiciones, efectos, beat-sync, export 1080×1920 sin watermark |
| **Canva**                | cover/thumbnail, intros/outros de marca, gráficos overlay (`/feedIA-canva`)                                  |
| **Editor nativo TikTok** | publicar + sonido trending + stickers + texto en-app (señales nativas = más alcance)                         |
| **Photopea/otros**       | retoque de frames si hace falta                                                                              |

## PIPELINE DE EDICIÓN (orden)

1. **Importar** clips/b-roll + guion (de `/feedIA-tiktok-script`).
2. **Cortar al ritmo** — pattern interrupt cada 2-4s, sin tiempos muertos.
3. **Hook reforzado 0-2s** — zoom/corte + on-screen text grande.
4. **Subtítulos automáticos** (CapCut auto-caption) — estilo de marca (`/feedIA-tiktok-branding`).
5. **Sonido trending** + beat-sync de cortes al audio.
6. **Transiciones** nativas (no sobreproducir — TikTok premia lo crudo).
7. **Loop de cierre** — último frame conecta con el primero (rewatch).
8. **Export limpio** 1080×1920, sin watermark de CapCut (penaliza FYP).
9. **Publicar** en editor nativo TikTok: sonido en-app + caption corto + hashtags.

## REGLAS

- **Sin watermark** de otras apps (CapCut deja marca → exportar limpio o quitarla).
- Sonido agregado **dentro de TikTok** cuando se pueda (señal nativa).
- Subtítulos siempre (mucho consumo sin sonido).
- No sobreproducir: ritmo nativo > estética perfecta.
- Mantener el loop y el hook del guion.

## $ARGUMENTS

| Arg              | Acción                                                |
| ---------------- | ----------------------------------------------------- |
| `montar [guion]` | plan + ejecución CU del montaje en CapCut             |
| `subtitulos`     | auto-caption con estilo de marca                      |
| `cover`          | thumbnail/cover en Canva                              |
| `export`         | export limpio 1080×1920 sin watermark                 |
| `publicar`       | abre TikTok y publica con sonido + caption + hashtags |

## HERMANAS

`/feedIA-tiktok-script` · `/feedIA-tiktok` · `/feedIA-cu-brain` · `/feedIA-cu` ·
`/feedIA-canva` (cover) · `/feedIA-video` (generación IA de clips) · `/feedIA-publish`.

## 🧠 Cerebro FeedIA — hereda `/feedIA-brain`

Rol: **editor TikTok (cortes, beat-sync, subtítulos, loop)**. Algoritmo: optimiza para completion-rate + rewatch en FYP (TikTok, ≠ IG). Salida lista para usar, voz de marca, sin tells de IA, máxima elocuencia, mínimo esfuerzo del usuario.
