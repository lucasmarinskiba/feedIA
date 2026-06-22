---
description: >
  Branding especialista para TikTok. Aplica la identidad de la marca al lenguaje,
  ritmo y estética NATIVOS de TikTok (distinto a Instagram). Define voz, persona,
  estilo visual vertical, on-screen text, naming de series y consistencia de creador.
  Complementa /feedIA-canvas-design (reglas visuales) y /feedIA-tiktok. Usá cuando se
  pida branding/identidad para TikTok, "cómo me veo en tiktok", "tono para tiktok", o
  cuando el switcher esté en TikTok y haya que alinear estética.
---

# FeedIA · Branding TikTok

Misma marca, plataforma distinta. El branding en TikTok es **más crudo, más persona,
más nativo** que en Instagram. Esta skill traduce la identidad de la cuenta al código
de TikTok sin perder coherencia con IG.

> Base de marca: Brand Board (`/api/moodboard`) + `/feedIA-canvas-design`.
> Branding IG aspiracional/pulido ≠ branding TikTok cercano/nativo. Mantené el núcleo
> (valores, paleta, promesa) y adaptá la EJECUCIÓN.

---

## NÚCLEO COMPARTIDO (IG + TikTok)

Valores, misión, promesa, paleta base, audiencia. NO cambian entre redes. El "quién
sos" es uno solo.

## EJECUCIÓN POR RED (lo que SÍ cambia)

| Elemento          | Instagram                      | TikTok                                                              |
| ----------------- | ------------------------------ | ------------------------------------------------------------------- |
| Voz               | pulida, autoridad cálida       | conversacional, directa, "te hablo a vos"                           |
| Persona           | marca/creador curado           | **creador-persona** visible, imperfecto, real                       |
| Estética          | grid coherente, alto contraste | nativa, vertical, dinámica, menos "diseño"                          |
| Texto en pantalla | mínimo / caption               | **on-screen captions** parte de la identidad (fuente/posición fija) |
| Ritmo             | reposado                       | rápido, cortes, energía                                             |
| Recurrencia       | feed temático                  | **formats/series** reconocibles (mismo intro/outro/frase)           |
| Sonido            | secundario                     | identidad sonora (jingle/frase/sonido recurrente)                   |

---

## SISTEMA DE IDENTIDAD TIKTOK (definir)

1. **Creador-persona**: quién aparece, energía, arquetipo (el experto cercano, el
   rebelde, el mentor, el cómplice).
2. **Frase/intro recurrente**: gancho de marca repetible ("Bienvenido a…", saludo propio).
3. **On-screen text style**: fuente, color (de paleta), posición fija, tamaño. Consistente = reconocible.
4. **Formats/series**: 2-4 formatos repetibles con nombre (ej "Mitos del lunes", "3 en 30").
5. **Identidad sonora**: sonido/jingle/frase que la audiencia asocia.
6. **Outro/CTA recurrente**: cierre de marca consistente para follows.
7. **Paleta + look vertical**: misma paleta de Brand Board aplicada a 9:16 nativo.

## VOZ TIKTOK (reglas)

- Trato de tú, frases cortas, energía.
- Hablado > escrito. Suena como persona, no como folleto.
- Humor/relatabilidad permitido (según marca).
- Mantener prohibidos de la marca (Brand Board `forbidden`).
- Coherente con la voz IG pero más suelta.

---

## $ARGUMENTS

| Arg          | Acción                                                     |
| ------------ | ---------------------------------------------------------- |
| `definir`    | construye el sistema de identidad TikTok completo          |
| `voz`        | guía de voz/tono TikTok                                    |
| `series`     | propone 2-4 formats recurrentes con nombre                 |
| `on-screen`  | define estilo de texto en pantalla (fuente/color/posición) |
| `coherencia` | chequea consistencia IG ↔ TikTok                           |

## OUTPUT

```
## Núcleo (compartido IG+TikTok)
## Creador-persona + arquetipo
## Voz TikTok (do / don't)
## On-screen text style (fuente, color de paleta, posición)
## Formats/series recurrentes (nombre + estructura)
## Identidad sonora + intro/outro
## Checklist de coherencia con IG
```

## HERMANAS

`/feedIA-tiktok` · `/feedIA-tiktok-script` · `/feedIA-canvas-design` ·
`/feedIA-brand-guidelines` · `/feedIA-visual-identity` · `/feedIA-voice-builder`.

## 🧠 Cerebro FeedIA — hereda `/feedIA-brain`

Rol: **guardián de voz de marca nativa TikTok**. Algoritmo: optimiza para completion-rate + rewatch en FYP (TikTok, ≠ IG). Salida lista para usar, voz de marca, sin tells de IA, máxima elocuencia, mínimo esfuerzo del usuario.
