---
description: >
  Investigación de competencia y referentes en TikTok. Analiza cuentas top del nicho,
  videos virales, formatos/sounds/hooks que funcionan, ritmo de publicación y ángulos
  ganadores; destila patrones accionables para tu cuenta. Usá cuando se pida "analizar
  competencia tiktok", "qué hacen los referentes", "por qué se hace viral X", "qué
  formato usa [cuenta]", "research tiktok", o cuando Studio TikTok necesite insumos.
  Funciona por voz, prompt, Autopilot o sugerencia. Backend: research vía web/Chrome.
---

# FeedIA · Research Competencia & Referentes TikTok

Convierte cuentas/videos de referencia en **patrones replicables** para tu marca
(sin copiar — adaptar al branding propio, `/feedIA-tiktok-branding`).

## FUENTES (backend)

- URL de perfil TikTok / video → `mcp__Claude_in_Chrome__navigate` + `get_page_text`
  para extraer caption, sonido, hashtags, métricas visibles.
- Búsqueda de nicho: hashtags + sonidos en alza.
- Publicaciones propias analizadas (`/api/executive/posts-analysis`) como baseline.

## QUÉ EXTRAER POR REFERENTE

- **Hooks** (primeros 0-2s): patrón verbal + visual.
- **Formato** (talking-head / POV / tutorial / trend / green-screen).
- **Sonido** (trending? original?).
- **Estructura** (cómo retienen, dónde está el payoff, loop).
- **Ritmo de posteo** (frecuencia, horarios).
- **On-screen text** style.
- **Ángulos** que repiten (qué temas/dolores explotan).
- **Métricas** (views/likes ratio → qué revienta).

## OUTPUT (dossier)

```
## Referentes analizados (N)
- @cuenta · nicho · followers · ritmo
## Patrones de hook ganadores (top 5)
## Formatos dominantes + por qué funcionan
## Sounds/trends en alza para el nicho
## Ángulos/temas con mejor performance
## Gaps (qué NADIE está haciendo = oportunidad)
## Plan: 5 ideas adaptadas a TU marca (con hook + formato + sonido)
```

## REGLA

Adaptar, no clonar. Extraer el PORQUÉ funciona y reescribirlo con tu voz/branding.
Nunca inventar métricas — si no las ves, decilo.

## $ARGUMENTS

| Arg                 | Acción                                    |
| ------------------- | ----------------------------------------- |
| `[@cuenta o URL]`   | dossier de un referente                   |
| `nicho [tema]`      | top cuentas + patrones del nicho          |
| `viral [URL video]` | desarma por qué se hizo viral             |
| `gaps`              | oportunidades que la competencia no cubre |

## HERMANAS

`/feedIA-tiktok-algorithm` · `/feedIA-tiktok` · `/feedIA-competitor-profiling` ·
`/feedIA-curador` (trends) · `/feedIA-tiktok-script`.

## 🧠 Cerebro FeedIA — hereda `/feedIA-brain`

Rol: **investigador de tendencias/sonidos/referentes TikTok**. Algoritmo: optimiza para completion-rate + rewatch en FYP (TikTok, ≠ IG). Salida lista para usar, voz de marca, sin tells de IA, máxima elocuencia, mínimo esfuerzo del usuario.
