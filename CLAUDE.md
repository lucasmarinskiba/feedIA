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

### Habit Design — Nir Eyal "Hooked"

**Skill file**: `.agents/skills/hooked/SKILL.md`

**Framework central:**

- **Hook Model (4 fases)**: Trigger → Action → Variable Reward → Investment. Cada ciclo refuerza el hábito.
- **Triggers**: External (notificación, email, icono) → Internal (emociones negativas: aburrimiento, soledad, ansiedad, FOMO). Objetivo: usuario crea asociación interna → llega sin ser llamado.
- **B = MAT**: Behavior = Motivation × Ability × Trigger. Reducir fricción supera aumentar motivación.
- **Variable Reward** (3 tipos): Tribe (validación social), Hunt (descubrimiento/recursos), Self (logro/maestría). La variabilidad genera dopamina anticipatoria. Recompensa predecible = sin hábito.
- **Investment Phase**: Usuario almacena valor (contenido, datos, seguidores, reputación) → switching cost alto → mejora próximo ciclo.
- **Habit Zone**: frecuencia × utilidad percibida. Sin frecuencia suficiente, ningún nivel de utilidad crea hábito automático.
- **Vitaminas → Analgésicos**: Comienzan nice-to-have, se convierten en must-have una vez formado el hábito. "Un hábito es cuando no hacer la acción causa un poco de dolor."

**Anti-patrones Eyal**: triggers externos sin ruta a trigger interno, recompensas predecibles, alta fricción en action phase, sin investment mechanic, frecuencia de uso demasiado baja.

---

### Expert Secrets — Russell Brunson "Expert Secrets"

**Skill file**: `.agents/skills/expert-secrets/SKILL.md`

**Framework central:**

- **Mass Movement (3 elementos)**: Líder carismático/attractive character + causa futura mayor que el líder + nueva oportunidad (nunca mejora de lo existente).
- **Nueva Oportunidad > Mejora**: Las mejoras obligan admitir error pasado → resistencia. Las oportunidades nuevas no tienen ese peso emocional.
- **Attractive Character**: Mostrar AMBOS lados: de dónde venías (backstory) + dónde estás ahora. Certeza absoluta en el resultado. "Un capítulo adelante" es suficiente autoridad.
- **Niche = Blue Ocean propio**: Core Market → Submarket → crear nicho nuevo (nunca entrar al blue ocean de otro). Validar: ¿emocionados? ¿apasionados irracionalmente? ¿willing AND able?
- **Big Domino**: Una creencia que, si cae, colapsa todas las objeciones. Cada presentación tiene UN domino.
- **Epiphany Bridge**: Historia que recrea la epifanía del experto en la mente del prospecto. Compran por emoción, justifican con lógica.
- **False Belief Patterns**: 3 categorías: vehicle (el método no funciona) + internal (yo no puedo) + external (no funcionará para mí). Crear historia para cada una.
- **The Stack**: Mostrar valor acumulado elemento por elemento → revelar precio que parece irresistible vs total.
- **1,000 True Fans**: No necesitas millones. 1,000 personas que compren todo lo que produces = negocio sostenible.

**Anti-patrones Brunson**: vender mejora en vez de nueva oportunidad, múltiples big dominos en una presentación, lógica antes que emoción, experto sin backstory visible, no abordar las 3 false belief patterns.

---

### Viral Content — Jonah Berger "Contagious"

**Skill file**: `.agents/skills/contagious/SKILL.md`

**Framework central:**

- **STEPPS**: Social Currency (compartimos lo que nos hace ver bien) + Triggers (cues ambientales frecuentes) + Emotion (alta activación: asombro/ira/excitación; nunca tristeza/contentamiento) + Public (behavioral residue + built to show) + Practical Value (info útil empaquetada para transmitir) + Stories (Trojan Horse donde producto es inseparable del relato).
- **WOM stats**: Word of mouth = 10x más efectivo que publicidad. Solo 7% del WOM ocurre online — 93% offline. Diseñar para conversación presencial, no solo social media.
- **Social Currency 3 mecanismos**: Inner Remarkability (sorprendente/inesperado) + Game Mechanics (status/progreso visible) + Exclusividad (acceso limitado).
- **Triggers**: Top of mind = tip of tongue. Vincular producto a cues de alta frecuencia diaria (café, commute, comidas).
- **Valuable Virality test**: ¿Puede alguien contar la historia sin mencionar el producto? Si sí → embeber más.
- **Mensajero < Mensaje**: Contenido inherentemente viral se propaga independiente de quién lo comparte.

**Anti-patrones Berger**: emociones baja activación (tristeza), producto invisible sin behavioral residue, historia sin producto incrustado, trigger infrecuente o sin contexto correcto, diseñar solo para social media ignorando 93% WOM offline.

---

### Pre-Suasión — Cialdini "Pre-Suasión"

**Skill file**: `.agents/skills/presuasion/SKILL.md`

**Framework central:**

- **Core**: Los mejores persuasores preparan el terreno psicológico ANTES del mensaje. Pre-suasión = manipular atención y contexto para crear receptividad antes de la propuesta principal.
- **Lo focal es causal**: Lo que recibe atención parece importante y causal. Dirigir atención al atributo más fuerte PRIMERO.
- **Anchoring/Priming**: Primer número/concepto/imagen ancla toda evaluación posterior. Música alemana → 73% compra vino alemán. Mostrar precio alto primero → todo lo demás parece barato.
- **Jim el vendedor**: Creó asociación de confianza ANTES del pitch — nunca afirmó ser confiable, logró que el prospecto concluyera solo.
- **Atractores (automáticos)**: Sexo, amenaza, novedad — cerebro no puede ignorarlos. Usar en primeros segundos.
- **Imanes (elegidos)**: Relevancia personal, incompletud (Zeigarnik), misterio — atención sostenida.
- **Geografías persuasivas**: El entorno activa marcos mentales. Contexto de lujo → mayor disposición a pagar.
- **Unidad (7° Principio)**: Identidad compartida (familia/lugar/tribu) + Actuar juntos (sincronía, co-creación, pedir consejo) = estado pre-suasivo más poderoso.
- **Post-suasión**: Compromisos escritos + planes Si/Cuando→Entonces multiplican cumplimiento de intenciones.

**Anti-patrones Pre-Suasión**: presentar mensaje sin preparar terreno, mostrar precio bajo primero, preguntas que activan marcos mentales opuestos al objetivo, no obtener compromiso específico después del sí.

---

### Online Writing — Nicolas Cole

**Skill file**: `.agents/skills/online-writing/SKILL.md`

**Framework central:**

- **Platform First (no blog)**: Empezar en plataformas con distribución incorporada (Quora, LinkedIn, Medium, Twitter). Blogs propios carecen de mecanismo de descubrimiento — la distribución precede al contenido.
- **The 1**: 1 pieza de contenido diario, 365 días. Cole: 1 respuesta/día en Quora → 3M views año 1. Ambos resultados ganan: práctica O audiencia.
- **Universal > Nicho**: El expertise de nicho = credencial. El framing = lección de vida universal. Contenido sobre transformación personal llega a 1M+ views; contenido de nicho no.
- **Headlines**: Elemento más importante. Las personas deciden leer basadas solo en el headline. Formatos: lista numerada / promesa de revelación / historia de transformación / contra-intuitivo / pregunta cargada.
- **5 Forms of Proven Writing**: Actionable Guide / Curated List / Opinion / Story+Lesson / Data+Research. Rotar las 5 para variedad.
- **Pillar Pieces**: 3-5 artículos ancla definitivos → tráfico compuesto durante años.
- **Monetización**: Views → Autoridad → Consultoría ($100-500/hr) → Ghostwriting ($500-2,000/artículo) → Agencia ($5K-50K/cliente/mes). Cole: Digital Press $1M ARR en 10 meses.

**Anti-patrones Cole**: empezar con blog propio, escribir solo con inspiración (sin consistencia), framing de nicho sin lección universal, headline vago, bloques de texto sin escaneo, perfeccionar en vez de publicar.

---

### Win Friends — Dale Carnegie "How to Win Friends and Influence People"

**Skill file**: `.agents/skills/win-friends/SKILL.md`

**Framework central:**

- **85% of success = human engineering, 15% = technical knowledge** — Interpersonal skill vs product knowledge.
- **3 Fundamental Techniques**: (1) Don't criticize/condemn/complain, (2) Give genuine appreciation (specific, not flattery), (3) Awaken eager desire in the other (talk about THEIR wants, not yours).
- **6 Ways to Like People**: Genuine interest + Smile + Remember names + Listen + Talk their interests + Make them feel important.
- **12 Persuasion Principles**: Never say "you're wrong" → defensive. Let them talk. Admit YOUR mistakes first. Socratic questions build yes-momentum. Let idea be "theirs." Appeal to nobler motives. Dramatize ideas.
- **9 Leadership Rules**: Begin with praise + indirect error feedback + own mistakes first + questions not orders + let them save face + praise improvement + give good reputation to live up to + make defect seem easy to fix + frame as privilege not obligation.

**Anti-patrones Carnegie**: Criticize publicly. Generic praise. Talk your needs first. Try to win arguments. "You're wrong" framing. Fake interest.

---

### Obviously Awesome — April Dunford "Obviously Awesome: How to Nail Product Positioning"

**Skill file**: `.agents/skills/obviously-awesome/SKILL.md`

**Framework central:**

- **Positioning = context setting**. Same product, wrong context = fails. Right context = obvious (Joshua Bell subway $32 vs Carnegie Hall $300).
- **2 Traps**: (1) Product evolved, positioning didn't. (2) Market evolved, positioning didn't.
- **5 Components**: Competitive Alternatives (what they'd use if you don't exist) → Unique Attributes (features alternatives lack) → Value Themes (why differences matter) → Target Market (who cares MOST) → Market Category (frame of reference).
- **10-Step Process**: Understand loving customers → Form team → Align vocabulary → List true alternatives → Isolate attributes → Map to value → Determine who cares → Find market frame → Layer trend → Capture positioning.
- **Weak positioning signals**: Customers love, prospects confused. Long sales cycles. High churn. Constant price pressure.

**Anti-patrones Dunford**: Default positioning. Target "everyone". Features without value translation. Competitor list from internal perspective.

---

### Lean Startup — Eric Ries "The Lean Startup"

**Skill file**: `.agents/skills/lean-startup/SKILL.md`

**Framework central:**

- **5 Principles**: Entrepreneurs everywhere (anyone under uncertainty). Entrepreneurship is management. Validated Learning (data over assumptions). Build-Measure-Learn loop. Innovation Accounting (learning metrics, not execution metrics).
- **MVP** = minimum experiment (not mini-product). Types: Landing page → Concierge → Wizard of Oz → Minimum feature → Smoke test.
- **Vanity vs Actionable Metrics**: Vanity (total users, downloads) always improve. Actionable (cohort retention, conversion funnels, NPS) inform decisions.
- **Pivot or Persevere**: 10 types of pivot (zoom-in, zoom-out, customer segment, customer need, platform, business architecture, value capture, engine, channel, technology). Pivot when metrics don't respond to experiments.
- **3 Growth Engines**: Sticky (retention: churn < acquisition). Viral (k-factor > 1). Paid (LTV/CAC > 3).
- **5 Whys**: Trace systemic root cause, not surface quick-fix.

**Anti-patrones Ries**: Rocket-ship planning. Vanity metrics. Building in secret. Scaling before product-market fit.

---

### Positioning — Al Ries & Jack Trout "Positioning: The Battle for Your Mind"

**Skill file**: `.agents/skills/positioning/SKILL.md`

**Framework central:**

- **Battle = mind, not market** (6 inches of gray matter). Overcommunicated society: mind rejects most messages. Solution: BETTER positioning, not more communication.
- **Mental Ladders**: Mind organizes products by category. Positions 1-2 remembered, 3+ not. Can't add rungs, only position against what exists.
- **First > Better**: First in category captures mind-leadership (Hertz, Coca-Cola, Harvard).
- **4 Strategies**: (1) Be leader (anchor position). (2) Follower (position against leader: Avis "We try harder"). (3) Reposition competitor (Tylenol: aspirina irritates stomach). (4) Find creneau (hole in mind: VW "Think Small" when all cars large).
- **Name = most important decision**. Powerful names: memorable, evoke position, protegible. Traps: initials-only (invisible for new brands), generic descriptors.
- **Line Extension Trap**: Using successful name for new products dilutes original position. Mental ladder can't hold multiple positions = name loses value.
- **Outside-In > Inside-Out**: Start from prospect's perception (mind), not product specs. Customer perception = reality.

**Anti-patrones Ries & Trout**: Line extension dilution. Try to out-advertise leader. Generic names. Inside-out thinking.

---

### Get Together — Bailey Richardson et al. "Get Together: How to Build Community"

**Skill file**: `.agents/skills/get-together/SKILL.md`

**Framework central:**

- **"Build community WITH people, not FOR them"** — Community = audience that ACTS together (not just receives).
- **Social Capital (Putnam)**: Reciprocal relationships = asset (like physical/human capital). Communities = social capital machines.
- **3 Stages (9 Steps)**:
  - **Spark**: (1) Pinpoint your people (WHO + WHY shared purpose) → (2) Do something together (activity = condition community exists) → (3) Get people talking (horizontal conversation, not just vertical to leader).
  - **Stoke**: (4) Attract new folks (don't conjure motivation, attract already-passionate) → (5) Cultivate identity (name, rituals, values, history = "I am part of X") → (6) Pay attention who keeps showing up (future leaders).
  - **Pass**: (7) Create more leaders (question every challenge: "WITH not FOR?") → (8) Supercharge (tools + training + visibility + autonomy) → (9) Celebrate (individual + collective = identity consolidation).
- **Bonding vs Bridging**: Similar people (risk: homogeneity) vs Different people (diversity). Most communities do both.

**Anti-patrones Richardson**: Build FOR (audience). No shared purpose. Leader only node. No identity cultivation. Wait for scale.

---

### Business of Belonging — David Spinks "The Business of Belonging"

**Skill file**: `.agents/skills/business-of-belonging/SKILL.md`

**Framework central:**

- **Core**: Community = members ACT together (not just audience). Business value = SPACES outcomes (Support/Product/Acquisition/Contribution/Engagement/Success).
- **4 Sense of Community Factors**: Membership (boundaries + emotional safety) + Influence (bidirectional) + Integration (fulfills needs) + Shared Emotional Connection (history + crisis bonds).
- **SPACES Model**: Support (members → members), Product (innovation/feedback), Acquisition (WOM/SEO), Contribution (UGC), Engagement (retention/loyalty), Success (education/growth).
- **3 Etapas + 9 Steps**: Spark (pinpoint + do + talk) → Stoke (attract + identity + observe) → Pass (leaders + supercharge + celebrate).
- **Build WITH not FOR**: Autonomy vs top-down. Distribute control to edges. Social capital = reciprocal relationships.
- **Bonding vs Bridging**: Similar people (risk: homogeneity) vs different (diversity). Both required.

**Anti-patrones Spinks**: No shared action first, generic identity, CM as only node, vanity metrics (followers), underinvestment, build FOR not WITH.

---

### Priceless — William Poundstone "Priceless: The Myth of Fair Value"

**Skill file**: `.agents/skills/priceless/SKILL.md`

**Framework central:**

- **Coherent Arbitrariness**: Prices constructed in minds, not found in markets. Valuations relative/stable; amounts absolute/arbitrary (context-dependent).
- **Psychophysics Laws**: Weber's Law (perceive % change not $), Stevens Power Law (4x stimulus = 2x subjective), Adaptation Level (senses adapt to baseline).
- **Anchoring & Adjustment**: Random number (10 vs 65) → 2x difference in estimates. First anchor insufficient mental adjustment → bias persists.
- **Loss Aversion**: Perder $X = 2x más painful than ganar. Frame: "No pierdes" > "Ganas".
- **Pricing Illusions**: 99¢ effect ($9.99 ≠ $10 perceptually = bargain signal), Decoy Pricing (3rd option makes mid-tier obvious), Prestige Pricing (8.7x price ≠ 1.5x quality).
- **High Anchor First**: Price high → everything else = bargain. Invisible increases: shrink quantity not price.

**Anti-patrones Poundstone**: Rational logic pricing, no high anchor first, low price early, matching competitors, forget 99-cent psychology.

---

### Action — Robert McKee & Bassim El-Wakil "Action: The Hero's Journey in the Art of Creative Writing"

**Skill file**: `.agents/skills/action-mckee/SKILL.md`

**Framework central:**

- **Core Triad**: Hero = Altruism (sacrifices self for innocent) + Villain = Narcissism (indifferent to humanity) + Victim = Helplessness (can't save self).
- **Core Value**: Life/Death binary drives tension.
- **Mercy Scene** (Core Event): Hero helpless under villain → villain delays kill (gloating/torture/plan reveal) → hero outsmarts OR overpowers (no coincidence).
- **4 Action Subgenres**: Adventure (natural forces), Epic (vs tyranny), Duel (hero vs villain 1-on-1), Thriller (vs psychopathic villain).
- **5 Excitement Sources**: Rebellion vs Authority + Exploring Unknown + Coping with Frustration + Conquering Limitations + Breaking Taboos.
- **10 Principal Genres + Action**: Crime/War/Epic/Horror/Political/Love/Enterprise/Social/Domestic (each with action-value intersection).

**Anti-patrones McKee**: Absent villain (henchmen mercy scenes), obvious Achilles heel, clichéd distractions, coincidence saves, deus ex machina, villain less interesting than hero.

---

### Dialogue — Robert McKee "Dialogue: The Art of Verbal Action for Page, Stage, and Screen"

**Skill file**: `.agents/skills/dialogue-mckee/SKILL.md`

**Framework central:**

- **Core**: "Dialogue is what characters do to each other." Words perform actions. Character speaks to want/change/defend/attack/seduce.
- **3 Concentric Spheres**: Said (words spoken surface) → Unsaid (consciously withheld thoughts) → Unsayable (subconscious urges, only expressed through actions).
- **Text vs Subtext**: Text = surface behavior (talking, greeting, complimenting). Subtext = TRUE ACTION under words (consoling? seducing? insulting?).
- **3 Tracks**: Dramatized (characters to each other) + Narratized (to self/audience: soliloquy, VO) + Indirect (paraphrase previous scene).
- **3 Functions**: Exposition (pass info without stopping momentum, exposition as ammunition) + Characterization (unique voice: vocab/syntax/tone/accent) + Action (dialogue carries character doing something, subtext=gerund).
- **Medium Differences**: Theatre (heightened language OK) vs Film (naturalistic, image favored) vs Prose (full spectrum).

**Anti-patrones McKee**: On-the-nose (character explains self), exposition lecture, redundancy (text = subtext no gap), purple prose without character voice, no distinction between inner/outer.

---

### Character — Robert McKee "Character: The Art of Building Dramatic Character for Page, Stage, and Screen"

**Skill file**: `.agents/skills/character-mckee/SKILL.md`

**Framework central:**

- **Character ≠ Person**: People experience more than express. Characters express everything they experience (MORE complex than humans). Character = finished art (exists between curtain up/down).
- **Characterization vs True Character**: Characterization = outer mask (age/dress/speech/job). True Character = inner nature revealed through RISK-FILLED choices under max stakes.
- **Principle of Choice**: Character expresses true self through risky decisions under maximum stakes. No stakes = choice meaningless. Max stakes = most revealing.
- **10 Writer Faculties**: Taste + Knowledge + Originality + Showmanship + Audience Awareness + Form Mastery + Hatred of Clichés + Moral Imagination + Ideal Self + Self-Knowledge.
- **Dimensions = Contradiction**: Flat (one trait) vs Dimensional (opposing traits) vs Complex (2+ dimensions reveal layers). Example: Walter White = teacher vs kingpin.
- **4 Research Methods**: Personal (emotional transformation) + Imaginative (360° observation) + Book-Bound (psychology/history validation) + Grounded (locate in reality, witness).
- **6 Archetypes**: Protagonist, Antagonist, Mentor, Ally, Trickster, Guardian.

**Anti-patrones McKee**: Cardboard roles, no dimensions, psychological clichés, melodrama, author mouthpiece (character explains author's beliefs), no research, vague characterization.

---

### Agentes que usan la biblioteca completa (23 libros)

**All Agents** — activación completa:

```
"Apply complete 23-book knowledge base:
INTERPERSONAL (Carnegie): No criticize = no change. Genuine appreciation specific. Their desires first. Make feel important. Socratic yes-momentum. Leadership = create more leaders.
PSYCHOLOGY: Sistema 1 = design for automatic. Loss aversion framing. Peak-end rule. Cognitive ease.
STORY: Customer as hero. SB7 Framework. 'If you confuse, you lose.' 3-level problem.
POSITIONING CONTEXT (Dunford): Context = everything. 5 components (alternatives, attributes, value, target, category). Start with TRUE alternatives, not sales list. 2 traps: product evolved / market evolved.
PERSUASION: Stack 6 Cialdini principles. Reciprocity first. Real scarcity only.
PRE-SUASION: Prime BEFORE message. Focal=causal. Anchor high first. Unity (7th principle). Post-suasion commitment.
COPY: Channel existing desire. Match awareness level. Unique mechanism. Specificity = trust.
LEAN STARTUP: Build-Measure-Learn loop. MVP = experiment not product. Validated learning over vanity metrics. 3 growth engines (Sticky/Viral/Paid). Pivot when metrics don't respond.
MENTAL LADDERS (Ries & Trout): First > Better. Positions 1-2 remembered. Can't add rungs. Leader strategy vs follower. Reposition competitor. Find creneau. Outside-in not inside-out.
COMMUNITY (Richardson+Spinks): Build WITH not FOR (do together first, then attract). 3 stages + 9 steps. SPACES outcomes. Distributed control = sustainability. Social capital creation.
MARKETING (Godin): Minimum Viable Market. Lock then key. Status + tribal signals.
CM: Bidirectional paradigm. 5 engagement keys. Social listening before publishing.
PERSONAL BRAND: Niche = P×H×D. 80/20 content. Platform-native format.
BRAND IDENTITY: 3-axis model + tricotomic image + colorimetría 4 systems.
HABIT DESIGN: Hook Model (Trigger→Action→VarReward→Investment). B=MAT reduce friction. Vitamins→painkillers.
EXPERT SECRETS: Mass movement 3 elements. New opportunity (never improvement). Big Domino. Epiphany Bridge. 1,000 True Fans.
VIRAL (Berger): STEPPS audit every piece. 93% WOM offline. Trojan Horse stories. High-arousal emotion only. Behavioral residue.
ONLINE WRITING: Platform first (not blog). Daily consistency. Universal > niche. Headline is the product. 5 Forms rotation.
PRICING PSYCHOLOGY (Poundstone): Coherent arbitrariness. Anchor high first (everything else = bargain). Weber's Law (perceive % not $). 99¢ illusion. Loss aversion framing. Prestige pricing hierarchy.
NARRATIVE CRAFT (McKee Action+Dialogue+Character): Hero=altruism/Villain=narcissism/Victim=helplessness. Mercy scene core event. Dialogue=verbal action. Text vs subtext. Character=finished art (MORE complex than people). Risk-filled choices reveal true self.
CROSS-PRINCIPLE: Loss aversion + scarcity + social proof = maximum urgency stack.
HABIT+PERSUASION: Investment phase (Eyal) + commitment consistency (Cialdini) = compounding lock-in.
CARNEGIE+COMMUNITY: Genuine appreciation (Carnegie) + Build WITH (Richardson/Spinks) = deep trust + leader creation + distributed autonomy.
DUNFORD+LEAN: Context positioning (Dunford) + MVP testing (Ries) = validate positioning with real market.
POSITIONING+MENTAL LADDERS: Market category (Dunford) activates ladder (Ries/Trout) → messaging lands in mind already primed.
EXPERT+STORY: Attractive character (Brunson) + guide positioning (Miller) = trust architecture.
PRICING+PSYCHOLOGY: Anchoring (Poundstone) + Prospect Theory (Kahneman) + prestige signal (Cialdini) = 3-axis price architecture.
PRE-SUASION+VIRAL: Prime with STEPPS trigger first (Poundstone anchor) → message lands in primed mind = 2x effectiveness.
WRITING+PERSONAL BRAND: Platform-native daily writing (Cole) + Niche P×H×D (Personal Brand) = authority flywheel.
NARRATIVE+DIALOGUE+CHARACTER: McKee craft applies to ALL copy: Subtext (what's REALLY happening) > text (surface words). Hero/Villain/Victim arcs in customer journey.
COMMUNITY+PRICING: SPACES outcomes (Spinks) drives perceived value. Social proof (support members) anchors price psychology (Poundstone). Belonging justifies premium.
Anti-patterns from ALL 23 books apply to ALL content outputs."
```
