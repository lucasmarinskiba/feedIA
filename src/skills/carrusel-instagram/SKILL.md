---
name: carrusel-instagram
description: >
  Generador de carruseles de Instagram para IA Masters Academy. Transforma inputs
  (URL de YouTube, URL de artículo, idea en texto, nota, estudio) en carrusel listo
  para publicar: estrategia + copy slide a slide + prompts de imagen (gpt-image-2 o
  nano-banana-2) + generación real de las imágenes PNG 1080x1350. Usa esta skill
  SIEMPRE que el usuario pida "carrusel", "hazme un carrusel", "carrusel de Instagram",
  "slides para Instagram", "convierte este vídeo en carrusel", "hazme contenido visual
  de este artículo/vídeo/idea", mencione una URL de YouTube o artículo para Instagram,
  o diga "hazme un carrusel sobre X". Activar también si dice "saca redes de esto",
  "content de este vídeo" o similar con intención de publicar en Instagram.
---

# Generador de Carruseles · IA Masters Academy

Transformas inputs (transcripción YouTube, artículo, idea, nota de voz, estudio)
en carrusel de Instagram listo para publicar.

Marca oficial: **IA Masters Academy** (con espacios). NUNCA "iAmasters".

---

## FLUJO COMPLETO

### Paso 1 — Obtener el contenido fuente

Detecta el tipo de input y obtén el contenido:

**URL de YouTube** (youtube.com / youtu.be):

```bash
pip install -q youtube-transcript-api --break-system-packages
python <skill_dir>/scripts/get_transcript.py "<URL>"
```

**URL de artículo** (cualquier otra URL):
Usa `mcp__workspace__web_fetch`. Si devuelve HTML vacío o sin contenido real
(página client-rendered), usa Claude in Chrome:
`mcp__Claude_in_Chrome__navigate` → `mcp__Claude_in_Chrome__get_page_text`

**Texto / idea suelto:** úsalo directamente.

---

### Paso 2 — Análisis y producción del carrusel (sigue el sistema completo)

Con el contenido listo, aplica el sistema de producción completo definido abajo
(secciones VOZ, OBJETIVO, TIPOS, ESTRUCTURA, HOOKS, ESTILO VISUAL, etc.).

Si faltan datos, pregunta MÁXIMO 3 cosas: (a) tipo preferido, (b) CTA,
(c) datos a confirmar. No inventes cifras nunca.

Produce el output en el **FORMATO DE SALIDA OBLIGATORIO** (sección 11 abajo).

---

### Paso 3 — PARAR y pedir dos confirmaciones

Después de mostrar la estrategia completa, PARA y pregunta:

> "¿Quieres cambiar algo en la estrategia o el copy antes de generar las imágenes?
>
> Y dime: ¿con qué modelo generamos?
>
> - **gpt-image-2** — mayor calidad, renderiza el texto en la imagen directamente
> - **nano-banana-2** — más rápido, también renderiza el texto nativamente
>
> Cuando confirmes, generamos los [N] slides."

No generes ninguna imagen hasta recibir confirmación explícita con el modelo elegido.

---

### Paso 4 — Generar las imágenes

Instala dependencias:

```bash
pip install -q fal-client pillow requests --break-system-packages
```

Carga la FAL_KEY desde el .env de la skill:

```bash
export FAL_KEY=$(grep FAL_KEY <skill_dir>/.env | cut -d= -f2)
```

Para cada slide, ejecuta el script y captura su salida stdout (2 líneas: URL y path):

```bash
output=$(python <skill_dir>/scripts/generate_image.py \
  --slide-num N \
  --total TOTAL \
  --title "TEXTO EXACTO DEL HEADLINE" \
  --body "TEXTO EXACTO DEL SUBTÍTULO" \
  --prompt "PROMPT COMPLETO [ESCENA]+[ELEMENTOS]+[ESTILO]+[CONSTRAINTS]" \
  --model gpt-image-2 \
  --output-dir "<OUTPUT_DIR>/slides/" 2>/dev/null)
fal_url=$(echo "$output" | head -1)
file_path=$(echo "$output" | tail -1)
```

`<OUTPUT_DIR>` por defecto: `~/Desktop/carruseles/<slug>/`

Tras cada slide generado:

1. Muestra en el chat: `Slide N/TOTAL ✓ — [URL fal.ai](<fal_url>)`
2. Usa el tool `Read` sobre `<file_path>` para mostrar la previsualización inline en el chat.

---

### Paso 5 — Crear archivos de texto y presentar resultados

Guarda en la carpeta de salida:

- `strategy.md` — resumen + estrategia + copy completo + prompts
- `caption.md` — caption listo para copiar/pegar
- `hashtags.md` — hashtags organizados

Presenta la carpeta como enlace `computer://` al usuario.

---

## 1 · VOZ

Cercana sin perder autoridad. Auto-confesional. Concreta con números. Anti-humo.
Energética pero pausada.

- Trato de tú. "Equipo"/"familia" solo en CTA o cierre afectivo.
- Frases cortas. Una idea por línea.
- Datos / cifras / porcentajes SIEMPRE reales. Si no los tienes confirmados, pregunta.
  NUNCA inventes.
- Vocabulario Angel: TOP, brutal, una pasada, sin humo, método, paso a paso, sistema,
  cuello de botella, casos reales.
- Vocabulario prohibido: "no solo X sino también Y", "esto no es X es Y",
  "en definitiva", "pivotal", "vibrante", "dinámico",
  "soluciones de alto valor añadido", "ecosistema disruptivo", "se trata de",
  "consiste en".
- Sin guru. Sin coach motivacional. Sin promesas exageradas sin número.
- Em-dash con espacios ( — ) prohibido. Punto y aparte.

---

## 2 · OBJETIVO DEL CARRUSEL

Cada carrusel persigue UNO: AUTORIDAD / EDUCATIVO / SAVES / SHARES / CTA.
Pregúntalo si no es claro.

---

## 3 · TIPOS DE CARRUSEL (elige uno)

1. **LISTICLE** — "5 errores con X". 7-9 slides.
2. **FRAMEWORK / MÉTODO** — "Método X en 5 pasos". 8-10 slides.
3. **MITO VS REALIDAD** — pares mito/realidad. 6-8 slides.
4. **ERROR COSTOSO / DATO IMPACTANTE** — pérdida + por qué + consecuencia + solución.
   6-8 slides.
5. **CASO REAL CON CIFRAS** — "Cómo pasé de X a Y". 8-10 slides.

Transcripciones largas suelen pedir LISTICLE o FRAMEWORK.

---

## 4 · ESTRUCTURA (10 slides FIJOS, formato 4:5, magazine infographic denso)

Cada slide tiene **6 zonas obligatorias** (S1 y S10 son especiales):

```
┌──────────────────────────────────────────┐
│ X/10 ──                                  │  ← PROGRESS top-left
│                                          │
│ HEADLINE   MEGA   BICOLOR                │  ← Mezcla blanco + morado
│ [palabras-en-morado]                     │     en la MISMA frase
│ Subtítulo con palabra-highlight.         │  ← 1 línea, ≥1 palabra morada
│ ──                                       │
│ ● 1. LABEL UPPER  ┃ Descripción 1-2 ln  │  ← Icono en círculo morado relleno
│ ● 2. LABEL UPPER  ┃ Descripción 1-2 ln  │
│ ● 3. LABEL UPPER  ┃ Descripción 1-2 ln  │
│ ● 4. LABEL UPPER  ┃ Descripción 1-2 ln  │
│                                          │
│ ┌────────────────────────────────────┐  │
│ │ 💡 TIP PRO: detalle accionable.    │  │  ← Box lila pastel #EDE9FE
│ └────────────────────────────────────┘  │
└──────────────────────────────────────────┘
```

Elementos opcionales pero **muy recomendados**:

- **Callout top-right**: card oscuro pequeño con icono (ticket/calendar/pin/clock) + título morado + 1 línea descripción.
- **Hero photo realista** integrada como columna derecha o fondo full bleed con overlay 60%.

Slides especiales:

| Slide | Función        | Anatomía                                                                                                      |
| ----- | -------------- | ------------------------------------------------------------------------------------------------------------- |
| 1     | PORTADA        | Hero photo full bleed + título mega bicolor + subtítulo + icono pequeño. SIN sub-puntos ni TIP PRO.           |
| 2     | VISIÓN GENERAL | Mapa o esquema con 3-5 puntos clave conectados + box "La clave" al pie.                                       |
| 3-8   | DESARROLLO     | Anatomía completa: headline bicolor + subtítulo + 4-5 sub-puntos + TIP PRO + callout.                         |
| 9     | SÍNTESIS       | 3 cards verticales lado a lado: icono + título + imagen pequeña + 3 bullets check + tip.                      |
| 10    | CTA            | Hero photo + 3 sub-puntos acción (GUARDA / COMPARTE / COMENTA) + quote box + bubble autor "Sígueme para más". |

Reglas:

- **Densidad**: 80-150 palabras por slide (S2-S9). Es lo que gana saves.
- Headline siempre BICOLOR (palabras blancas + palabras moradas en la misma frase).
- Subtítulo siempre con ≥1 palabra highlighted en morado.
- Sub-puntos: número + LABEL UPPERCASE bold + descripción regular.
- TIP PRO box presente en S2-S9 sin excepción.
- Progress indicator X/10 en TODOS los slides.

---

## 5 · HOOKS · 5 FÓRMULAS PARA PORTADA

1. **NÚMERO IMPACTANTE**: "El 87% lo hace mal." / "3 errores que te cuestan miles."
2. **CONTRADICCIÓN**: "Todo lo que crees sobre X es mentina."
3. **PREGUNTA INCÓMODA**: "¿Por qué tu IA no genera dinero?"
4. **CONFESIÓN**: "Vendí mi primera por 600 EUR. La siguiente por 10.000 EUR."
5. **PROMESA DIRECTA**: "Cómo crear 5 carruseles en 1 hora."

6-10 palabras máx. Verbos en presente. Sin admiraciones múltiples.

---

## 6 · ESTILO VISUAL (default)

**Estilo macro**: magazine infographic premium estilo Visual Capitalist / Insider Stories / National Geographic. Fotografías realistas integradas + jerarquía editorial + cards y boxes para densidad informativa. NO minimalismo plano.

**Paleta**:

- Morado primario #5B21B6: rellenos de iconos circulares, callouts, highlights
- Morado secundario #7C3AED: acentos, underlines, palabras destacadas
- Lila pastel #EDE9FE: fondo del TIP PRO box, highlights claros
- Negro/grafito #0F0F12: fondo principal
- Blanco #FFFFFF: texto principal
- Gris claro #9CA3AF: descripciones secundarias bajo labels

**Tipografía**: geometric sans-serif bold (Inter, Geist, Satoshi, Söhne). Headlines 90-130px. Labels uppercase bold. Descripciones regular ~22px.

**Iconos**: blancos en líneas de 2-3px, SIEMPRE dentro de **círculos rellenos morados** #5B21B6 de ~80px de diámetro. **Nunca iconos en línea sueltos sobre fondo plano.**

**Fotografías**: realistas, alta resolución, de la temática real (templo, calle, plato, persona). Integradas como columna derecha, fondo full bleed con overlay oscuro 60%, o dentro de cards con esquinas redondeadas 20px. Son obligatorias en S1, S3-S8 y S10.

**Cards y boxes**: esquinas redondeadas 16-24px. Cards interiores en gris oscuro #1A1A2E o overlay semitransparente. TIP PRO box siempre en lila pastel #EDE9FE.

**Elementos decorativos** (con moderación, para personalidad): pétalos de sakura, avión de papel hand-drawn, flechas curvas dibujadas, líneas punteadas conectoras, badges numerados ("01", "02") en cards.

**Composición**: densidad alta pero ordenada. Zonas marcadas. Jerarquía clara: progress → headline mega → subtítulo → lista de sub-puntos → TIP PRO box. Nada de aire infinito.

---

## 7 · ASPECTO TÉCNICO

- Formato **1080×1350 px, ratio 4:5 portrait**. Nunca 1:1 ni 3:4.
- Safe zone: **60px de padding** los 4 bordes (más denso que el editorial minimalista).
- Coherencia entre slides: paleta, tipografía, posición del progress indicator (top-left) y del TIP PRO box (bottom) iguales en todas las slides.
- Texto en imagen: literal entre comillas en el prompt, indicando posición + tamaño + peso + color.
- Progress indicator "X/10" obligatorio en TODOS los slides (top-left, número en blanco + " /10" en gris, underline morado corto).

---

## 8 · PROMPTS DE IMAGEN · ESQUELETO OBLIGATORIO

Cada prompt debe declarar TODAS las zonas. NO omitir ninguna en S2-S9.

```
[LAYOUT] Magazine infographic premium estilo Visual Capitalist / Insider Stories.
Composición 4:5 vertical densa con zonas: PROGRESS top-left, HEADLINE mega bicolor zona superior,
SUBTÍTULO debajo, LISTA de sub-puntos numerados con iconos circulares morados,
TIP PRO BOX al pie en lila pastel, CALLOUT top-right opcional, HERO PHOTO realista integrada.

[HERO PHOTO] fotografía realista de [DESCRIPCIÓN ESPECÍFICA: ej. "tori de Meiji Jingu
entre cerezos al amanecer" / "cuenco de ramen con huevo y chashu vista cenital"].
Integrada como columna derecha del slide (40-50% del ancho) o fondo full bleed con overlay
oscuro 60%. Alta resolución, look editorial, no stock obvio.

[PROGRESS INDICATOR] esquina superior izquierda, padding 60px:
"X" en blanco bold 32px + "/10" en gris #9CA3AF 24px,
underline horizontal corto morado #7C3AED de 40px debajo.

[HEADLINE BICOLOR] zona superior, 90-130px geometric sans-serif bold:
mezcla blanco y morado #7C3AED en la MISMA frase.
Ej (entre comillas literales): "No pierdas (palabras blancas) tiempo: (palabras moradas)"
Indicar qué palabras van en cada color.

[SUBTÍTULO] debajo del headline, 36-40px regular,
blanco con UNA palabra clave en morado #7C3AED.

[SUB-PUNTOS] lista vertical de 3-5 ítems. Cada ítem:
- Círculo relleno morado #5B21B6 de ~80px con icono blanco en línea dentro (clock, money,
  camera, train, fork, bookmark, share, message, etc.)
- A la derecha: "N." + LABEL UPPERCASE bold blanco (alguna palabra clave en morado)
- Debajo del label: 1-2 líneas de descripción en gris claro #9CA3AF, ~22px regular

[CALLOUT TOP-RIGHT] (opcional pero recomendado en S2-S9):
card oscuro #1A1A2E rectangular esquinas redondeadas 20px,
icono morado pequeño (ticket/calendar/pin/clock) arriba,
título en morado #7C3AED uppercase bold + 1 línea de descripción en blanco regular.

[TIP PRO BOX] al pie del slide (excepto S1, S10):
fondo lila pastel #EDE9FE esquinas redondeadas 20px, padding interior 24px,
círculo morado #5B21B6 con icono bombilla blanco,
"TIP PRO:" en morado #5B21B6 bold + descripción en grafito #0F0F12 regular.

[DECORATIVOS] (opcionales, con moderación):
pétalos de sakura, avión de papel hand-drawn, flecha curva dibujada,
líneas punteadas conectoras. En morado o lila claro.

[ESTILO] Magazine infographic premium, denso pero ordenado, jerarquía editorial clara.
Paleta: fondo #0F0F12 + morado #5B21B6/#7C3AED + lila pastel #EDE9FE + blanco + gris #9CA3AF.
Tipografía geometric sans-serif bold (Inter/Geist/Satoshi). Iconos SIEMPRE en círculos rellenos
morados. Cards con esquinas redondeadas. Fotografía realista obligatoria.

[CONSTRAINTS]
- 1080x1350 (4:5 portrait), padding 60px en bordes
- Texto en español, ortografía correcta, sin caracteres random
- Fotografía realista obligatoria (NO evitar)
- NEGATIVE: no random letters, no watermarks, no neon gradients,
  no cartoon clipart, no emojis rendered as images, no AI typography artifacts,
  no iconos en línea sueltos sin círculo de fondo
```

Texto entre comillas exactas en cada zona. Indica qué palabras van en blanco y cuáles en morado para los headlines bicolor.

---

## 9 · DIFERENCIACIÓN POR SLIDE

- **S1 (Portada)**: hero photo full bleed con overlay oscuro 40-60%, título mega bicolor ~50% del lienzo, subtítulo 1 línea, icono pequeño (bandera/emoji-como-shape) como acento. SIN sub-puntos, SIN TIP PRO. Progress "1/10" en top-left.
- **S2 (Visión general)**: mapa o esquema con 3-5 puntos clave conectados (pins, markers, líneas). Box destacado al pie tipo "La clave: ..." Sin TIP PRO típico — el box hace ese rol.
- **S3-S8 (Desarrollo)**: anatomía completa con headline bicolor + subtítulo + 4-5 sub-puntos numerados + TIP PRO box + callout top-right opcional + hero photo lateral derecha o full bleed.
- **S9 (Síntesis)**: 3 cards verticales lado a lado, cada una con: badge "01/02/03" + icono + título + imagen pequeña dentro + 3 bullets con check + mini-tip. Box final "Con esto..." al pie.
- **S10 (CTA)**: hero photo lateral, 3 sub-puntos de acción (GUARDA / COMPARTE / COMENTA con sus iconos), quote box motivacional "Tokio no se ve. Se vive.", bubble del autor con foto pequeña circular y "Sígueme para más".

---

## 10 · PROCESO

1. Lee el input completo.
2. Identifica big idea + avatar + emoción dominante.
3. Pregunta MÁX 3 cosas si faltan: (a) CTA específico, (b) datos a confirmar, (c) hero subject preferido si aplica.
4. **EXTRACCIÓN DENSA**: para CADA slide del 3 al 9, extrae 4-5 puntos accionables con etiqueta corta + descripción. NO te limites a parafrasear literalmente la transcripción/input — **complementa con info de dominio útil** cuando un slide tenga huecos. Los carruseles ganadores son mini-guías densas, no posters minimalistas. Si la transcripción solo menciona "tarjeta IC", expándelo a 4 pasos: cómprala / cárgala / úsala / devuélvela. El objetivo es valor por slide, no fidelidad al input.
5. Desarrolla en el formato obligatorio (sección 11).

---

## 11 · FORMATO DE SALIDA OBLIGATORIO

```
## 1. Resumen
- Big idea / Avatar / Emoción / Objetivo / Tipo / 10 slides

## 2. Estrategia
[3-4 líneas: ángulo elegido + por qué funcionará en saves/shares]

## 3. Copy

### Slide N (función)
- Headline bicolor: "[BLANCO] [MORADO] [BLANCO]"  ← indica qué palabras van en cada color
- Subtítulo (con highlight): "...[palabra-morada]..."
- Sub-puntos (3-5):
  1. LABEL UPPERCASE — descripción 1-2 líneas.
  2. LABEL UPPERCASE — descripción 1-2 líneas.
  3. LABEL UPPERCASE — descripción 1-2 líneas.
  4. LABEL UPPERCASE — descripción 1-2 líneas.
- Callout top-right: [icono] [TÍTULO MORADO] / [descripción 1 línea]
- TIP PRO: [contenido del box]
- Hero photo: [descripción específica de la fotografía a generar]
- Decorativos: [pétalos / avión / flecha / dotted line — si los hay]

[repetir para los 10 slides, S1 y S10 sin sub-puntos/TIP PRO]

## 4. Prompts de imagen (uno por slide)

### Prompt slide N
[LAYOUT] / [HERO PHOTO] / [PROGRESS] / [HEADLINE BICOLOR] / [SUBTÍTULO] /
[SUB-PUNTOS] / [CALLOUT] / [TIP PRO BOX] / [DECORATIVOS] / [ESTILO] / [CONSTRAINTS]

## 5. Caption Instagram
100-150 palabras voz Angel, 1 CTA, emojis contenidos.

## 6. Hashtags
5-10, mezcla nicho + intent.
```

---

## 12 · ANTI-PATRONES

- Sin CTA en última slide.
- Slide 1 que resuelve.
- **Densidad baja**: menos de 80 palabras por slide en S2-S9 (es el error #1).
- Aspect ratio distinto de 4:5.
- Texto pegado a bordes.
- Datos inventados.
- Vocabulario corporativo.
- Mezclar 2 tipos de carrusel.
- Carruseles de menos de 10 slides.
- Emojis dibujados en la imagen.
- Texto en inglés con audiencia hispanohablante.
- **Iconos en línea sueltos** sin círculo morado relleno detrás.
- **Headlines monocolor**: deben ser bicolor blanco+morado dentro de la misma frase.
- Sin TIP PRO box en S2-S9.
- Sin progress indicator X/10 en algún slide.
- Sin fotografía realista integrada en S1, S3-S8, S10.
- Composición "editorial plana" tipo poster minimalista (queremos magazine infographic denso).
