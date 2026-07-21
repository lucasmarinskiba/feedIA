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

_Entrenamiento completo basado en: Capriotti "Branding Corporativo", Doppler "El paso a paso para construir marcas inolvidables", Hoyos "Branding: El arte de marcar corazones"._

### Vocabulario Obligatorio (Términos Técnicos Exactos)

**Símbolos identificadores** — componentes visuales de una marca:

| Término                    | Definición                                                          |
| -------------------------- | ------------------------------------------------------------------- |
| **Logosímbolo**            | Logo + símbolo en unidad (lo que la gente llama "logo" normalmente) |
| **Logotipo**               | Solo el nombre escrito con tipografía especial (solo texto)         |
| **Isotipo**                | Solo el símbolo/ícono, sin texto                                    |
| **Imagotipo**              | Texto + imagen que pueden usarse por separado                       |
| **Isologo**                | Texto + imagen fundidos, inseparables                               |
| **Fonotipo**               | Cómo suena fonéticamente el nombre de marca                         |
| **Eslogan/Lema**           | Frase corta que resume la promesa de marca (máx 7 palabras)         |
| **Odotipo**                | Aroma corporativo de la marca                                       |
| **Colores marcarios**      | Colores oficiales de la marca (con Pantone + CMYK + RGB + HEX)      |
| **Gama cromática**         | Paleta completa de colores corporativos                             |
| **Tipografía corporativa** | Fuente(s) tipográficas oficiales de la marca                        |
| **Área de protección**     | Espacio mínimo libre alrededor del logosímbolo                      |
| **Planimetría**            | Grid de construcción proporcional del logosímbolo                   |
| **Colorimetría**           | Especificación técnica de colores en TODOS los sistemas             |
| **Racional de marca**      | Justificación estratégica del concepto de diseño                    |
| **Manual de Identidad**    | Documento normativo completo de uso de la marca                     |
| **Brand Equity**           | Valor de la marca como activo (modelos Aaker/Keller)                |
| **Naming**                 | Proceso de asignar nombre a la marca                                |
| **Rebranding**             | Renovación de identidad de marca                                    |
| **Identidad Visual**       | Expresión VISUAL de la identidad (≠ Identidad Corporativa)          |
| **Identidad Corporativa**  | ADN completo de la organización (valores, cultura, filosofía)       |
| **Imagen Corporativa**     | Percepción que los públicos tienen (resultado externo)              |

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

---

## Biblioteca de Conocimiento — PDFs Incorporados

_4 libros incorporados al knowledge base de FeedIA (julio 2026). Skills completos en `.agents/skills/`._

---

### Marketing Strategy — Seth Godin "Esto es marketing"

**Skill file**: `.agents/skills/marketing-strategy/SKILL.md`

**Framework central:**

- Marketing = acto generoso de ayudar a cambiar personas (NO manipulación/interrupción)
- **Minimum Viable Market**: audiencia más pequeña que justifica el esfuerzo → "tiñe la piscina, no el océano"
- **Lock & Key**: encuentra el problema primero (cerradura), luego crea la solución (llave)
- **Psicografía > Demografía**: worldviews, creencias, miedos, deseos, pertenencia tribal
- **Status/Dominancia/Afiliación**: todas las decisiones humanas tienen componente de status
- **"People like us do things like this"**: identidad tribal como motor de decisión
- **Tensión y confianza**: crea incomodidad estratégica → alivia con solución; confianza es el activo más escaso
- **Permission marketing**: gana el derecho a comunicarte antes de comunicar
- **Precio como semiótica**: el precio es una historia sobre calidad/exclusividad/pertenencia
- **Sonder**: cada cliente tiene una vida interna tan compleja como la tuya → empatía profunda

**Anti-patrones Godin**: spam, interrupción sin valor, mass targeting, vergüenza como táctica, promesas vacías.

---

### Community Manager — "El gran libro del Community Manager"

**Skill file**: `.agents/skills/community-manager/SKILL.md`

**Framework central:**

- **CM = embajador de la marca en internet** — NOT un becario o junior sin formación
- **Paradigma bidireccional**: redes sociales = comunicación bidireccional (≠ mass media unidireccional)
- **7 valores del consumidor digital**: transparencia, interactividad, rapidez, cercanía, viralidad, compartir, beneficios
- **10 cualidades del CM**: cualificado, creativo, conoce competencia, conoce audiencia, capacidad escucha, capacidad reacción, open minded, empático, paciente, adaptable
- **8 requisitos pre-RRSS**: conocer plataformas, conocer usuarios, estrategia, escuchar, transparencia, largo plazo, contratar profesional, involucrar organización
- **5 claves de engagement**: escucha → pregunta → hazles sentir importantes → gana confianza → no bajes la guardia
- **Crisis 2.0**: responder rápido + transparencia + responsabilidad + alternativas + llevar a privado
- **Social Media Plan**: análisis → objetivos SMART → público → contenido → KPIs → plan crisis
- **Venta indirecta**: redes = construcción de confianza + ambassadors → ventas futuras (NO venta directa)

**Anti-patrones CM**: publicar y desaparecer, borrar comentarios negativos, mismo contenido en todas plataformas, confundir vanity metrics con resultados de negocio.

---

### Personal Branding — "ebook-marca-personal"

**Skill file**: `.agents/skills/personal-branding/SKILL.md`

**Framework central:**

- **Origen**: Tom Peters 1997, "The Brand Called You" — los profesionales son marcas
- **Digital tattoo**: todo lo publicado es permanente; egosurfing mensual obligatorio
- **Proceso 4 fases**: autoconocimiento → objetivos+nicho → estrategia → herramientas
- **Autoconocimiento**: ¿qué me apasiona? ¿qué habilidades tengo? ¿qué me diferencia? ¿dónde quiero estar en 5 años?
- **Nicho = Pasión × Habilidad × Demanda** — sin los 3, no es viable
- **Regla 80/20**: 80% contenido de valor + 20% promocional
- **Plataformas**: Blog (SEO/credibilidad), LinkedIn (B2B, 450M+ usuarios), Instagram (visual, creativos), TikTok (descubrimiento), YouTube (autoridad educativa), Twitter (opinión/tiempo real)
- **3 claves finales**: persistencia (6-12 meses mínimo), innovación permanente, networking presencial

**Anti-patrones marca personal**: querer llegar a todos, copiar referentes, cambiar de nicho cada 2 meses, publicar sin consistencia, ignorar egosurfing.

---

### Identidad, Imagen y Marca — Garrido Moreno "02-identidad-imagen-y-marca"

**Skill extension**: Incorporado en `.agents/skills/brandkit/SKILL.md` (sección "GARRIDO MORENO")

**Framework central:**

- **3 ejes de identidad corporativa**: vertical (historia — inmutable) + horizontal (proyecto actual — mutable) + transversal (cultura — semimutable)
- **Cultura en 3 capas**: comportamientos visibles → valores compartidos → supuestos básicos inconscientes (más profundo, más resistente al cambio)
- **Imagen corporativa tricotómica**: autoimagen + imagen proyectada + imagen percibida = suma acumulativa en la mente de los públicos
- **3 inputs de imagen**: comportamiento corporativo (funcional) + cultura corporativa (interna) + personalidad corporativa (intencional)
- **Evolución de la marca**: signo (antigüedad) → discurso (medieval) → sistema de memoria (industrial) → fenómeno complejo (hoy = objeto de deseo, sujeto de seguridad, fetiche, espejo idealizado)
- **Tipos de marca legal**: denominativa, figurativa, tridimensional, de posición, de patrón, de color, sonora, de movimiento, multimedia, holograma
- **Identidades dinámicas**: logos que adaptan atributos secundarios manteniendo el código de reconocimiento central — usados por TV, museos, eventos

**Distinción crítica Garrido**: Imagen proyectada ≠ imagen percibida → la brecha entre ambas ES el problema de comunicación corporativa.

---

### Agentes que usan este conocimiento ampliado

**Art Director** + **Carousel Designer Pro** + **Brand Kit tool** + **Content Strategist**:

```
"Apply full knowledge base:
MARKETING: Minimum Viable Market → find lock first, then make key.
  Status/tribal dynamics in copy. Permission before communication.
CM: 7 consumer values checklist. Bidirectional paradigm. 5 engagement keys.
PERSONAL BRAND: 4-phase framework. Platform-native content. Niche = P×H×D.
BRAND IDENTITY: 3-axis model (Garrido). Tricotomic image. Dynamic identity rules.
Anti-patterns from all 4 books apply to ALL content outputs."
```

---

### Behavioral Economics — Kahneman "Thinking, Fast and Slow"

**Skill file**: `.agents/skills/behavioral-economics/SKILL.md`

**Framework central:**

- **Sistema 1 vs Sistema 2**: Pensamiento rápido/automático/emocional vs lento/deliberado/racional. El 95% de decisiones de compra ocurren en Sistema 1.
- **Heurísticas clave**: Disponibilidad (lo recordable = lo probable), Anclaje (primer número ancla todo), Representatividad (juzgamos por semejanza al estereotipo), Afecto (si me gusta, evalúo positivo en todo)
- **Prospect Theory**: Aversión a pérdida — perder duele ~2x más que ganar satisface. "No pierdas X" > "Gana X"
- **Peak-End Rule**: El recuerdo de una experiencia = momento pico + final. La duración no importa.
- **Fluencia cognitiva**: Fácil de leer/entender = percibido como verdadero, de calidad, confiable
- **WYSIATI**: "What You See Is All There Is" — el cerebro construye historias coherentes solo con info disponible
- **Efecto Halo**: Primera impresión positiva contamina evaluación de todo lo demás
- **Framing**: La misma info en distinto encuadre produce distintas decisiones ("90% de grasa" vs "10% libre de grasa")

**Anti-patrones Kahneman**: argumentos racionales a audiencia fría, tipografía difícil, presentar precio barato primero, experiencia que termina sin impacto.

---

### StoryBrand — Donald Miller "Building a StoryBrand"

**Skill file**: `.agents/skills/storybrand/SKILL.md`

**Framework central:**

- **Mantra**: "Si confundes, pierdes." El cliente es el héroe, la marca es el guía.
- **SB7 Framework** (7 elementos): Personaje (cliente héroe) → Problema (3 niveles: externo/interno/filosófico) → Guía (empatía + autoridad) → Plan (proceso + acuerdo) → CTA (directo + transición) → Evitar fracaso → Éxito
- **Test del Gruñido**: ¿Puede un hombre de las cavernas entender en 5 segundos qué ofreces, cómo mejora su vida, y cómo comprar?
- **Problema interno > externo**: Los clientes compran soluciones a problemas internos (frustración, vergüenza, miedo) aunque piensen que compran por el externo
- **Dos tipos de CTA**: Directo (compra) + Transición (lead magnet) — siempre ambos presentes
- **Apple como caso**: "Think Different" = 2 palabras vs 9 páginas de specs. El cliente como creativo genial, Apple como herramienta.

**Anti-patrones StoryBrand**: marca como héroe, CTA ambiguo, historia de la empresa en About, solo problema externo, promesas sin plan concreto.

---

### Persuasión — Cialdini "Influence"

**Skill file**: `.agents/skills/persuasion/SKILL.md`

**Framework central — 6 Armas de Influencia:**

1. **Reciprocidad**: Dar primero genera obligación de devolver. Lead magnets de valor real crean deuda de reciprocidad.
2. **Compromiso y Consistencia**: Micro-compromisos escalan a grandes compromisos. Pie en la puerta → challenges → conversión.
3. **Prueba Social**: "Gente como yo hace/compra X". Testimonios de personas idénticas al buyer persona. Números concretos.
4. **Simpatía**: Compramos a quienes nos gustan. Similitud + atractivo + elogios + familiaridad + asociación.
5. **Autoridad**: "As Seen In", títulos, credenciales, case studies con números. La autoridad de terceros > la autoafirmada.
6. **Escasez**: Amenaza de perder acceso → reactancia → deseo aumentado. Escasez real con razón comunicada.

- **Click-Whirr**: Respuestas automáticas activadas por señales específicas (como pavo ante "pío-pío")
- **Principio de contraste**: Mostrar premium primero → todo lo que sigue parece más barato

**Anti-patrones Cialdini**: escasez falsa, reviews fabricados, autoridad inflada, reciprocidad con regalos de valor cero.

---

### Copywriting Avanzado — Eugene Schwartz "Breakthrough Advertising"

**Skill file**: `.agents/skills/copywriting-advanced/SKILL.md`

**Framework central:**

- **Principio fundamental**: "El copy no crea deseo. Solo canaliza deseo ya existente." Identificar qué ya quiere el mercado → conectar producto a ese deseo.
- **5 niveles de conciencia**: Unaware → Problem-aware → Solution-aware → Product-aware → Most Aware. Cada nivel requiere estrategia diferente.
- **5 niveles de sofisticación**: A mayor sofisticación, mayor necesidad de mecanismo único (no solo promesa).
- **El headline**: No vende el producto. Vende la lectura del siguiente párrafo. Completa pensamiento ya formado en la mente del lector.
- **Unique Mechanism**: El método/proceso/ingrediente específico que hace funcionar tu solución. Hace irrelevante la competencia.
- **Especificidad = credibilidad**: "4,723 clientes en 47 países" > "muchos clientes". Números específicos activan confianza automática.
- **One-on-one**: Copy masivo debe sentirse como carta personal. Escribir para UNA persona específica.

**Anti-patrones Schwartz**: promesa genérica en mercado sofisticado, nivel de conciencia incorrecto, crear deseo en vez de canalizar el existente, vaguedad donde deberían ir números.

---

### Agentes que usan la biblioteca completa (8 libros)

**All Agents** — activación completa:

```
"Apply complete 8-book knowledge base:
PSYCHOLOGY: Sistema 1 = design for automatic. Loss aversion framing. Peak-end rule. Cognitive ease.
STORY: Customer as hero. SB7 Framework. 'If you confuse, you lose.' 3-level problem.
PERSUASION: Stack 6 Cialdini principles. Reciprocity first. Real scarcity only.
COPY: Channel existing desire. Match awareness level. Unique mechanism. Specificity = trust.
MARKETING (Godin): Minimum Viable Market. Lock then key. Status + tribal signals.
CM: Bidirectional paradigm. 5 engagement keys. Social listening before publishing.
PERSONAL BRAND: Niche = P×H×D. 80/20 content. Platform-native format.
BRAND IDENTITY: 3-axis model + tricotomic image + colorimetría 4 systems.
CROSS-PRINCIPLE: Loss aversion + scarcity + social proof = maximum urgency stack.
Anti-patterns from ALL 8 books apply to ALL content outputs."
```
