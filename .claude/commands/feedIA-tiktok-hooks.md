---
description: >
  Generador de hooks (0-2s) y tácticas de retención/completion para TikTok y Reels.
  Crea ganchos que detienen el scroll al instante + estructura de retención (open
  loops, pattern interrupts, loops de cierre) para maximizar watch time. Usá cuando
  se pida "hook para tiktok", "gancho", "cómo empiezo el video", "que no me hagan
  scroll", "mejorar retención", o cuando /feedIA-tiktok / /feedIA-tiktok-script lo
  necesiten. Funciona por voz, prompt, Autopilot o sugerencia.
---

# FeedIA · Hooks & Retención (TikTok / Reels)

En TikTok el scroll es instantáneo: **0-2s o muere**. Esta skill genera el gancho y
la arquitectura de retención para que el video se vea entero (completion = FYP).

> Para IG Reels el hook puede ser 0.5-3s y un poco más pulido (ver `/feedIA-reel-hook-master`).
> Guion completo: `/feedIA-tiktok-script`. Voz de marca: `/feedIA-tiktok-branding`.

---

## 12 FÓRMULAS DE HOOK (0-2s)

1. **Número impactante** — "El 90% lo hace mal."
2. **Contradicción** — "Dejá de [lo que todos hacen]."
3. **Pregunta incómoda** — "¿Por qué tu [X] no funciona?"
4. **Confesión** — "Perdí $5k para aprender esto."
5. **Promesa directa** — "Cómo [resultado] en [tiempo]."
6. **POV** — "POV: sos [situación relatable]."
7. **Open loop fuerte** — "Esto nadie te lo dice y cambia todo."
8. **Callout al nicho** — "Si sos [nicho], parate."
9. **Antes/Después** — mostrar el resultado primero.
10. **Negación** — "NO hagas [X] hasta ver esto."
11. **Storytime** — "La vez que [evento]…"
12. **Trend/sound hijack** — adaptar audio/format viral al nicho.

Reglas: 6-10 palabras habladas, verbo presente, sin admiraciones múltiples. El hook
**verbal + visual + on-screen text** deben pegar a la vez en el segundo 0.

---

## HOOK = 3 capas simultáneas (segundo 0-2)

- **Verbal**: la frase (de las 12 fórmulas).
- **Visual**: pattern interrupt — zoom, corte, prop, movimiento, locación inesperada.
- **On-screen text**: el gancho escrito grande (refuerza para sin-sonido).

---

## ARQUITECTURA DE RETENCIÓN (todo el video)

- **Open loop** en el hook → resolver al final.
- **Micro-cliffhanger por beat** — cada idea abre la siguiente.
- **Pattern interrupt** cada 2-4s (corte/zoom/cambio de plano).
- **On-screen text que adelanta** — "esperá al paso 3".
- **Ritmo creciente** — acelerar hacia el payoff.
- **Loop de cierre** — última línea reconecta con el hook → rewatch (sube completion).
- **CTA suave** — comentá/seguí sin frenar el loop.

---

## $ARGUMENTS

| Arg                 | Acción                                         |
| ------------------- | ---------------------------------------------- |
| `[tema]`            | 10 hooks (3 capas c/u) rankeados               |
| `retencion [guion]` | audita un guion y mejora retención beat a beat |
| `loop [tema]`       | diseña el loop de cierre ↔ hook                |
| `reel`              | versión IG Reels (hook 0.5-3s)                 |

## OUTPUT

```
## 10 hooks (verbal + visual + on-screen) rankeados por fuerza
## Estructura de retención sugerida (loops + interrupts + cierre)
## Loop de cierre recomendado
```

## ANTI-PATRONES

Hook lento / contexto antes del gancho · hook solo verbal (sin visual ni texto) ·
admiraciones múltiples · sin open loop · sin loop de cierre · prometer y no cumplir.

## HERMANAS

`/feedIA-tiktok` · `/feedIA-tiktok-script` · `/feedIA-reel-hook-master` (IG) ·
`/feedIA-hook-generator`.

## 🧠 Cerebro FeedIA — hereda `/feedIA-brain`

Rol: **maestro de hooks TikTok 0-2s (verbal+visual+texto)**. Algoritmo: optimiza para completion-rate + rewatch en FYP (TikTok, ≠ IG). Salida lista para usar, voz de marca, sin tells de IA, máxima elocuencia, mínimo esfuerzo del usuario.
