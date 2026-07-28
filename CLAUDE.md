# CLAUDE.md — FeedIA Convenciones de Proyecto

## TypeScript Estricto

- Usar siempre TypeScript con modo estricto habilitado (`"strict": true` en `tsconfig.json`).
- No usar `any` salvo que sea absolutamente inevitable; en ese caso, documentar el motivo.
- Tipar explícitamente los parámetros de función y los valores de retorno.
- Preferir `unknown` sobre `any` cuando el tipo es incierto.

## Estilo de Código

- Preferir **funciones flecha** sobre declaraciones de función tradicionales.
  ```ts
  // Correcto
  const saludar = (nombre: string): string => `Hola, ${nombre}`;

  // Evitar
  function saludar(nombre: string): string {
    return `Hola, ${nombre}`;
  }
  ```
- Usar `const` por defecto; `let` solo cuando la reasignación sea necesaria.

## Flujo de Commits

- **Antes de cada commit**, ejecutar el linter y asegurarse de que pase sin errores:
  ```bash
  npm run lint
  ```
- No realizar commits con errores de linting pendientes.
- Si el proyecto usa un pre-commit hook (por ejemplo con Husky), no omitirlo con `--no-verify`.

---

## Pinterest Design Patterns

Documentación de patrones visuales extraídos de Pinterest para aplicación sistemática en generación de carruseles. Usado por Art Director, Carousel Designer Pro, y Visual QA agents.

### Typography (Tipografía)

**Headlines (Títulos principales):**
- Tamaño: 28-36px, Bold weight (700-900)
- Máximo 8 palabras, máximo 2 líneas
- Color: Contraste alto con fondo (blanco sobre oscuro, oscuro sobre claro)
- Ejemplo: "Cómo hacer carruseles más divertidos" (7 palabras, 2 líneas)

**Body Text (Texto corporal):**
- Tamaño: 14-18px, Regular weight (400-500)
- Color: Light gray (#999, #AAA) on bright, dark gray (#333, #444) on light
- Interlineado: 1.4-1.6 para legibilidad
- Máx 80 caracteres por línea

**Decorative/Accent Text (Texto decorativo):**
- Tamaño: 12-16px, script o thin fonts (300 weight)
- Usado SOLO para énfasis, nunca para contenido principal
- Ejemplo: "✦ Tip Pro ✦" o "→ descubre →"

**Anti-pattern:** Tipografía centrada como única opción; usar left-aligned, right-aligned, o staggered alignment.

### Color Palettes (Paletas de color)

**Warm Organic (Cálido orgánico):**
- Primary: Terracotta (#C65911), Warm Gold (#D4AF37)
- Secondary: Sage Green (#6B8E71), Cream (#F5EEE0)
- Tertiary: Warm Gray (#8B7355)
- Use case: Lifestyle, wellness, natural products

**Bold Playful (Audaz y lúdico):**
- Primary: Hot Magenta (#E91E8C), Electric Blue (#00D9FF)
- Secondary: Lime (#7FFF00), Cream (#FFF8DC)
- Tertiary: Deep Purple (#4B0082)
- Use case: Entertainment, comedy, viral content, youth-targeted

**Dark Premium (Oscuro premium):**
- Primary: Dark Gray (#1A1A1A), Soft Gold (#E6D5B8)
- Secondary: Charcoal (#36454F), White (#FFFFFF)
- Tertiary: Deep Navy (#001F3F)
- Use case: Luxury, education, professional services

**Clean Editorial (Limpio editorial):**
- Primary: Navy (#001F3F), White (#FFFFFF)
- Secondary: Soft Gray (#E8E8E8), Black (#000000)
- Tertiary: Minimal accent: Single saturated color (one of the above)
- Use case: News, tutorials, how-to content

**Color Usage Rules:**
- Max 4 colors per slide (primary, secondary, 1-2 accents)
- Avoid pure gray (#808080) — use warm or cool grays with undertone
- Contrast ratio minimum 4.5:1 for text (WCAG AA)

### Layout Patterns (Patrones de composición)

**Left-Aligned Text + Right Image (40/60 split):**
- Text on left 40%, image on right 60%
- Text positioning: Vertical center or top-aligned
- Image: Cropped square or aspect 2:3
- Use case: Product features, tips, before-after

**Full-Bleed Image + Centered Text Overlay:**
- Image fills entire slide (4:5 carousel)
- Text centered, semi-transparent dark background behind text (rgba 0,0,0,0.5)
- Text max width: 70% of slide width
- Use case: Inspirational quotes, calls-to-action, teasers

**Grid Layout (3x3 or 2x2 with repeated elements):**
- 3x3: Icons, tips (9 small items), each ~100x100px with padding
- 2x2: Larger graphics, each ~200x250px
- Spacing: 16-20px between items
- Use case: Checklists, lists of benefits, comparison matrices

**Asymmetrical Balance with Whitespace:**
- Main element (image/icon) on one side (top-left, bottom-right, etc)
- Text on opposite corner
- Minimum 20% whitespace on slide
- Creates visual breathing room
- Use case: Modern, sophisticated designs (premium aesthetic)

### Visual Elements (Elementos visuales)

**Rounded Corners:**
- Icon containers: 8px border-radius
- Image corners: 12-16px border-radius
- Container cards: 12px border-radius
- Never square corners on modern designs (adds dated look)

**Shadows & Elevation:**
- Subtle shadows (NOT drop-shadow): `box-shadow: 0 2px 8px rgba(0,0,0,0.15)`
- Avoid harsh shadows (> 10px blur)
- Use elevation effect: Multiple light shadows for depth, not single dark shadow

**Icons & Geometric Shapes:**
- Icon style: Outline (2-3px stroke), not filled
- Icon size: 24-32px standard, 40-48px for hero icons
- Geometric shapes: Circles, squares, triangles, hexagons
- Color: Match primary or secondary palette

**Illustrated Siluetas vs Photos:**
- Siluetas: Custom illustrations of people, hands, objects (consistent style across carousel)
- Photos: Use only if add context (avoid generic stock photos)
- Mix both: Silueta for first 3 slides (hook), photos for proof/testimonials (slides 5-8)

### Motion Patterns (Patrones de animación)

**Slide Transitions:**
- Fade (opacity 0→1 over 400ms): Default, safe choice
- Slide Left (translateX 100%→0 over 400-500ms): Modern, directional feel
- Slide Up (translateY 100%→0 over 400-500ms): Emphasis on upward energy
- Zoom (scale 0.8→1 over 400ms): Attention-grabbing, use sparingly
- Rotate (rotate 5deg→0deg over 400ms): Playful, not for professional designs

**Text Entrance Animations:**
- Pop-in (scale 0→1, opacity 0→1 over 300ms): Instant engagement
- Typewriter (width 0→100% over 1000ms): Slow reveal, suspenseful
- Fade + Slide (opacity 0→1, translateY 20px→0 over 600ms): Elegant, balanced
- Stagger timing: First element at 100ms, then +100ms each (creates sequential feel)

**Element Motion Details:**
- Subtle rotation/tilt: 2-3 degrees max (avoid dizziness)
- Staggered animations: Elements enter sequentially (100ms apart) for visual rhythm
- Total animation duration per slide: 2-3 seconds max (keep engagement high)
- Easing function: Use `ease-out` for entrances, `ease-in-out` for transitions

**Anti-pattern Motion:**
- Animation loops > 2 seconds (feels slow, viewer loses attention)
- Too many simultaneous animations (visual chaos)
- Animation without purpose (gratuitous motion)

### Anti-Patterns (Qué NO hacer)

**Visual:**
- ❌ Busy backgrounds (patterns, gradients, textures) behind text
- ❌ Too many colors (>5 on a slide); feels chaotic
- ❌ Corporate fonts: Helvetica, Arial, Times New Roman (use sans-serif: Inter, Poppins, Montserrat)
- ❌ Stock photos without context: Generic people, office, handshakes (feels inauthentic)
- ❌ Poor readability: Text too small, insufficient contrast, complex layouts

**Copy:**
- ❌ Centered text layout ONLY (breaks up readability, feels dated)
- ❌ ALL CAPS (screaming, hard to read)
- ❌ Overly long body text (>50 words per slide)

**Motion:**
- ❌ Animation loops > 2 seconds (engagement loss)
- ❌ Simultaneous animations on all elements (visual overload)
- ❌ Easing: Linear animations (feel robotic); always use ease-in/out variants

---

## Implementación en Agents

Los agents deben referenciar estas patterns al generar carruseles:

**Art Director:** 
```
"Apply [PALETTE_NAME] color palette from CLAUDE.md.
Typography: [HEADLINE_SIZE]px bold headline, [BODY_SIZE]px body.
Layout: [LAYOUT_PATTERN].
Elements: Rounded [RADIUS]px, subtle elevation shadows.
Motion: [SLIDE_TRANSITION] transition, [TEXT_ANIMATION] text entrance.
Zero corporate, maximum innovative."
```

**Carousel Designer Pro:**
```
"Generate 10-slide carousel matching Pinterest aesthetic:
- Slides 1-3: Hook (strong typography, minimal text, [ANIMATION_STYLE])
- Slides 4-7: Value (mixed layouts, images with siluetas)
- Slides 8-10: CTA (visual hierarchy, strong colors, motion emphasis)
Palette: [SELECTED_PALETTE]. No corporate. Avoid anti-patterns."
```

**Visual QA:**
```
"Validate carousel against Pinterest standards:
✓ Typography: Headlines 28-36px bold, body 14-18px
✓ Colors: Max 4 per slide, 4.5:1 contrast ratio
✓ Layout: One of: left-right split, full-bleed overlay, grid, asymmetrical
✓ Elements: Rounded corners (8-16px), subtle shadows, icons/siluetas
✓ Motion: Fade/slide/pop transitions, <2.5s per slide
✗ Anti-patterns: Busy bg, too many colors, corporate fonts, poor contrast"
```

---

## Recursos (Ejemplos reales de usuario)

- Carruseles virales: pinterest.com/pin/7dELNXJS0, /pin/25Vmi0KYi, /pin/2stdzY1Jt (Bold Playful)
- Tutoriales con tips: pinterest.com/pin/2eXJeP7ii, /pin/4zSaoXvPl (Clean Editorial)
- Diseño con movimiento: pinterest.com/pin/3qbnKxArZ (Staggered, multi-element motion)
- Prompts para carruseles: Combinar con Claude para idea generation antes de diseño

---

## Brand Kit Training — Identidad de Marca

*Entrenamiento completo basado en: Capriotti "Branding Corporativo", Doppler "El paso a paso para construir marcas inolvidables", Hoyos "Branding: El arte de marcar corazones".*

### Vocabulario Obligatorio (Términos Técnicos Exactos)

**Símbolos identificadores** — componentes visuales de una marca:

| Término | Definición |
|---|---|
| **Logosímbolo** | Logo + símbolo en unidad (lo que la gente llama "logo" normalmente) |
| **Logotipo** | Solo el nombre escrito con tipografía especial (solo texto) |
| **Isotipo** | Solo el símbolo/ícono, sin texto |
| **Imagotipo** | Texto + imagen que pueden usarse por separado |
| **Isologo** | Texto + imagen fundidos, inseparables |
| **Fonotipo** | Cómo suena fonéticamente el nombre de marca |
| **Eslogan/Lema** | Frase corta que resume la promesa de marca (máx 7 palabras) |
| **Odotipo** | Aroma corporativo de la marca |
| **Colores marcarios** | Colores oficiales de la marca (con Pantone + CMYK + RGB + HEX) |
| **Gama cromática** | Paleta completa de colores corporativos |
| **Tipografía corporativa** | Fuente(s) tipográficas oficiales de la marca |
| **Área de protección** | Espacio mínimo libre alrededor del logosímbolo |
| **Planimetría** | Grid de construcción proporcional del logosímbolo |
| **Colorimetría** | Especificación técnica de colores en TODOS los sistemas |
| **Racional de marca** | Justificación estratégica del concepto de diseño |
| **Manual de Identidad** | Documento normativo completo de uso de la marca |
| **Brand Equity** | Valor de la marca como activo (modelos Aaker/Keller) |
| **Naming** | Proceso de asignar nombre a la marca |
| **Rebranding** | Renovación de identidad de marca |
| **Identidad Visual** | Expresión VISUAL de la identidad (≠ Identidad Corporativa) |
| **Identidad Corporativa** | ADN completo de la organización (valores, cultura, filosofía) |
| **Imagen Corporativa** | Percepción que los públicos tienen (resultado externo) |

**Distinción crítica**: Identidad Corporativa (qué ES) → Identidad Visual (cómo SE VE) → Imagen Corporativa (cómo LA VEN).

### Colorimetría — Reglas Técnicas

- **4 sistemas siempre obligatorios**: Pantone (impresión premium) + CMYK (offset/digital) + RGB (pantallas) + HEX (web/código)
- **Máximo 4 colores** en sistema primario
- **95% de marcas** usan 1-2 colores — no sobrecomplicar
- **Contraste mínimo** WCAG AA: 4.5:1 para texto sobre fondo de color
- Siempre incluir versión **negro puro** y **blanco puro** del logo
- Nunca gris neutro puro (#808080) — usar warm gray o cool gray con subtono
- Gradientes NO son un color marcario (no son reproducibles en Pantone)

**Psicología cromática básica**:
- Azul → confianza, tecnología, profesional
- Rojo → energía, urgencia, apetito
- Verde → naturaleza, salud, crecimiento
- Negro → lujo, poder, exclusividad
- Amarillo/Dorado → optimismo, calidez, lujo accesible

### Tipografía Corporativa — Reglas

**Jerarquía mínima**:
1. **Primaria** (titulares): Bold/Black (700-900), 32-72px
2. **Secundaria** (cuerpo): Regular/Medium (400-500), 14-18px, interlineado 1.4-1.6
3. **Acento** (opcional): Script o Thin, SOLO para énfasis

**Anti-patrones tipográficos**:
- ❌ Arial, Helvetica, Times New Roman — genéricas, sin personalidad de marca
- ❌ Más de 2-3 familias tipográficas
- ❌ Script como tipografía principal
- ❌ ALL CAPS para cuerpo de texto
- ❌ No especificar peso exacto (bold=700, black=900)

### Tipos de Nombre de Marca (Naming)

- **Descriptivo**: describe la actividad (YouTube, Aerolíneas Argentinas)
- **Neologismo**: combina dos conceptos (Facebook = face+book)
- **Abstracto**: palabra inexistente (Lego, Kodak)
- **Sugerente**: sugiere el beneficio (Slack, SocialTools)
- **Evocativo**: parte de raíz conocida (Amazon, Doppler)
- **Asociativo**: describe un concepto relacionado (Lander = landing pages)

### Checklist Brand Kit Completo

Elementos obligatorios en cualquier identidad de marca:
- [ ] Logosímbolo principal (color)
- [ ] Variaciones (horizontal, vertical, isotipo solo, logotipo solo)
- [ ] Versiones monocromáticas (negro, blanco)
- [ ] Planimetría / grid de construcción
- [ ] Área de protección definida
- [ ] Tamaños mínimos (print y digital)
- [ ] Colores marcarios: Pantone + CMYK + RGB + HEX de CADA color
- [ ] Tipografía primaria y secundaria con pesos y tamaños
- [ ] Usos correctos (sobre fondos claro, oscuro, fotográfico)
- [ ] Usos incorrectos (mínimo 6 prohibiciones)
- [ ] Eslogan (máx 7 palabras, conexión emocional)
- [ ] Racional de marca (justificación conceptual)

### Anti-patrones Globales de Brand Kit

- ❌ Diseñar logo antes de definir estrategia de marca
- ❌ Confundir Identidad Visual con Identidad Corporativa
- ❌ Manual solo con PNG del logo y HEX — NO es un Manual de Identidad
- ❌ Logo que no funciona en blanco y negro
- ❌ Logo no vectorizado (no escalable)
- ❌ Colores sin Pantone/CMYK (solo HEX)
- ❌ Área de protección no definida
- ❌ Eslogan genérico (podría aplicarse a cualquier marca)
- ❌ Nombre que limita el crecimiento futuro

### Agentes que usan este conocimiento

**Brand Kit tool** + **Art Director** + **Visual QA**:
```
"Apply brand identity knowledge:
- Use exact terminology (logosímbolo, colores marcarios, tipografía corporativa)
- Specify ALL 4 color systems (Pantone + CMYK + RGB + HEX)
- Typography: primary bold + secondary regular, NO Arial/Helvetica
- Logo: test B&W, define protection area, specify minimum sizes
- Validate against Brand Kit Checklist before output"
```
