---
description: >
  Cerebro de diseño de FeedIA. Reglas visuales compartidas que consultan
  /feedIA-canva, /feedIA-reel-generator y /feedIA-story-generator antes de producir.
  Conocimiento de diseñadores, directores de arte, publicistas y comunicadores:
  estructura de slides, hooks, paleta, tipografía, esqueleto de prompts de imagen,
  anti-patrones. Brand-aware: se adapta a la paleta/voz de la cuenta. Invocala cuando
  necesites las reglas de diseño o cuando otra skill visual deba alinear estética.
---

# FeedIA · Cerebro de Diseño (canvas-design)

Conocimiento visual central. NO produce nada por sí solo: es la **fuente de verdad**
de reglas que consultan las skills de carrusel / reel / story. Adapta todo a la marca
real cargada desde Brand Board (`/api/moodboard`); los valores de color de abajo son
DEFAULT — sobreescribilos con la paleta de la cuenta.

---

## 0 · BRAND BINDING (siempre primero)

Cargá de la cuenta: `name`, `palette[]`, `voiceTone[]`, `forbidden[]`, `typography[]`,
`niche`. Si Brand Board tiene paleta → esa manda. Si no hay marca → DEFAULT abajo +
preguntar nombre/nicho una vez. El "morado #5B21B6" del default es solo placeholder:
si la marca es azul, todo el sistema usa azul.

---

## 1 · VOZ

Cercana sin perder autoridad. Concreta con números. Anti-humo. Frases cortas, una idea
por línea. Trato de tú. Cifras SIEMPRE reales o preguntar. Sin guru, sin coach vacío.
Vocabulario prohibido: "no solo X sino también Y", "esto no es X es Y", "en definitiva",
"pivotal", "vibrante", "dinámico", "ecosistema disruptivo", "se trata de", "consiste en".
Em-dash con espacios prohibido. → Override con `voiceTone`/`forbidden` de la marca.

## 2 · OBJETIVO

Cada pieza persigue UNO: AUTORIDAD / EDUCATIVO / SAVES / SHARES / CTA. Preguntar si no claro.

## 3 · TIPOS DE CARRUSEL

1. **LISTICLE** — "5 errores con X". 7-9 slides.
2. **FRAMEWORK/MÉTODO** — "Método X en 5 pasos". 8-10 slides.
3. **MITO VS REALIDAD** — pares. 6-8 slides.
4. **ERROR COSTOSO/DATO IMPACTANTE** — pérdida + por qué + consecuencia + solución. 6-8.
5. **CASO REAL CON CIFRAS** — "Cómo pasé de X a Y". 8-10 slides.
   Transcripciones largas → LISTICLE o FRAMEWORK.

## 4 · ESTRUCTURA (10 slides, 4:5, magazine infographic denso)

6 zonas por slide (S1/S10 especiales):

- PROGRESS `X/10` top-left
- HEADLINE mega BICOLOR (blanco + color de marca en misma frase)
- SUBTÍTULO 1 línea con ≥1 palabra highlighted
- 4-5 SUB-PUNTOS: icono en círculo relleno (color marca) + LABEL UPPERCASE + descripción
- TIP PRO box (fondo claro de marca) en S2-S9
- CALLOUT top-right opcional + HERO PHOTO realista

| Slide | Función                                                                         |
| ----- | ------------------------------------------------------------------------------- |
| 1     | PORTADA — hero full bleed + título mega bicolor + subtítulo. Sin subpuntos/TIP. |
| 2     | VISIÓN GENERAL — mapa/esquema 3-5 puntos + box "La clave".                      |
| 3-8   | DESARROLLO — anatomía completa + TIP PRO + callout.                             |
| 9     | SÍNTESIS — 3 cards verticales con check bullets.                                |
| 10    | CTA — hero + GUARDA/COMPARTE/COMENTA + quote + bubble autor.                    |

Densidad 80-150 palabras S2-S9 (gana saves). Headline siempre bicolor. TIP PRO + progress
en todos. Hero photo en S1/S3-S8/S10.

## 5 · HOOKS (portada, 6-10 palabras, presente)

1. NÚMERO IMPACTANTE · 2. CONTRADICCIÓN · 3. PREGUNTA INCÓMODA · 4. CONFESIÓN · 5. PROMESA DIRECTA.

## 6 · ESTILO VISUAL (default — override con marca)

Magazine infographic premium (Visual Capitalist / Insider). Fotos realistas integradas +
jerarquía editorial + cards/boxes. NO minimalismo plano.
**Paleta DEFAULT:** primario #5B21B6, secundario #7C3AED, claro #EDE9FE, fondo #0F0F12,
blanco #FFFFFF, gris #9CA3AF. → Reemplazar con `palette[]` de la marca.
Tipografía geometric sans bold (Inter/Geist/Satoshi). Iconos blancos en círculos rellenos
del color primario. Cards esquinas 16-24px.

## 7 · TÉCNICO

1080×1350 (4:5). Padding 60px. Coherencia entre slides (paleta, tipo, posición progress/TIP).
Texto en imagen literal entre comillas con posición+tamaño+peso+color.

## 8 · ESQUELETO DE PROMPT DE IMAGEN

Declarar TODAS las zonas (no omitir en S2-S9):
`[LAYOUT]` `[HERO PHOTO]` `[PROGRESS INDICATOR]` `[HEADLINE BICOLOR]` `[SUBTÍTULO]`
`[SUB-PUNTOS]` `[CALLOUT TOP-RIGHT]` `[TIP PRO BOX]` `[DECORATIVOS]` `[ESTILO]` `[CONSTRAINTS]`.
Texto entre comillas exactas. Indicar qué palabras van en cada color del headline bicolor.
NEGATIVE: no random letters, no watermarks, no neon gradients, no cartoon clipart,
no emojis-as-images, no AI typography artifacts, no iconos sueltos sin círculo.

## 9 · ESTÁNDARES POR FORMATO

- **Carrusel:** 1080×1350 (4:5), 10 slides. Este doc.
- **Story:** 1080×1920 (9:16). Máx 3 elementos por frame. Sticker interactivo (poll/quiz/slider)
  cada 2-3 frames. Ver `/feedIA-story-generator`.
- **Reel cover:** 1080×1920. Detener scroll en 0.3s. Texto grande arriba. Ver `/feedIA-reel-generator`.

## 10 · ANTI-PATRONES

Sin CTA final · S1 que resuelve · densidad <80 palabras S2-S9 · ratio ≠ 4:5 · texto pegado
a bordes · datos inventados · vocabulario corporativo · mezclar 2 tipos · <10 slides ·
emojis dibujados · texto en inglés con audiencia hispana · iconos sueltos sin círculo ·
headlines monocolor · sin TIP PRO S2-S9 · sin progress · sin foto realista · composición
poster plana minimalista (queremos infographic denso) · ignorar la paleta real de la marca.

## 11 · QUIÉN CONSULTA ESTE CEREBRO

`/feedIA-canva` (carruseles) · `/feedIA-reel-generator` · `/feedIA-story-generator` ·
camino Canva-CU vía `/feedIA-cu-brain`. Toda pieza visual de FeedIA pasa por estas reglas.

## 🧠 Cerebro FeedIA — hereda `/feedIA-brain`

Rol: **diseñador visual (jerarquía, contraste, legibilidad mobile)**. Algoritmo: diferencia IG (sends/saves, grafo+Reels) de TikTok (completion/FYP en frío) y aplica el correcto. Salida lista para usar, voz de marca, sin tells de IA, máxima elocuencia, mínimo esfuerzo del usuario.
