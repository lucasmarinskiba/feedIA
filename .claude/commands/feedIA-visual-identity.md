---
description: Skill Visual Identity — Sistema visual completo de marca (reemplaza al diseñador gráfico)
---

Skill de construcción de identidad visual. Módulo: `src/capabilities/visualIdentity/identityBuilder.ts`

## Comportamiento según $ARGUMENTS

**"crear"** → `buildVisualIdentity(brand, context)` — sistema visual completo: colores, tipografía, logo, mood board, guidelines.

**"ver"** → `getIdentity(brandId)` — muestra identidad guardada.

**"exportar"** → `exportGuidelines(identity)` — markdown completo descargable.

**"paletas alternativas"** → `generatePaletteVariations()` — 3 paletas alternativas para A/B.

**"audit"** → Compara identidad actual vs mejores prácticas del nicho.

## Qué genera el sistema visual

### 1. Color System

- **Primary** + psicología del color (qué transmite)
- **Secondary** + uso recomendado
- **Accent** + uso (CTAs, highlights)
- **Neutrals** (3-5 grises/blancos/negros)
- **Semantic** (success/warning/error/info)
- **Gradients** con ángulo

### 2. Typography System

- **Display** font (titulares grandes)
- **Heading** font (h1-h3)
- **Body** font (texto largo)
- **Scale** (tamaños + line-height + weights)
- **Pairing** strategy (clásico, moderno, editorial)

### 3. Logo System

- **Principal** (horizontal completo)
- **Isotipo** (sin texto, para favicons)
- **Monograma** (espacios muy pequeños)
- **Variaciones** (clara, oscura, mono)
- **Clear space** + tamaño mínimo
- **Prohibiciones** (qué NO hacer con el logo)

### 4. Mood Board

- Conceptos clave (3-5 palabras)
- Referencias visuales por categoría
- Texturas
- Estilo fotográfico
- Estilo de ilustración
- Tipo de composición

### 5. Design Principles

5-7 reglas para guiar TODA decisión de diseño.

### 6. Do & Don't

Lista accionable de qué hacer / qué evitar.

### 7. Aplicaciones en Instagram

Ejemplos concretos para: feed post, story, reel cover, highlight cover, profile pic.

## Industrias con presets

Si la marca pertenece a estos nichos, hay paletas pre-optimizadas:

- gastronomía, fitness, educación, finanzas, psicología, inmobiliaria, modelaje

Para otras industrias, el skill genera paleta custom desde personalidad de marca.

## 🧠 Cerebro FeedIA — hereda `/feedIA-brain`

Rol: **diseñador de identidad visual (paleta, tipo, sistema)**. Algoritmo: diferencia IG (sends/saves, grafo+Reels) de TikTok (completion/FYP en frío) y aplica el correcto. Salida lista para usar, voz de marca, sin tells de IA, máxima elocuencia, mínimo esfuerzo del usuario.
