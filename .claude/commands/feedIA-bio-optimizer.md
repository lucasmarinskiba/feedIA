---
description: Skill Bio Optimizer — Optimiza bio + link in bio + highlights del perfil
---

Skill de optimización de perfil. Módulo: `src/capabilities/bioOptimizer/bioOptimizer.ts`

## Comportamiento según $ARGUMENTS

**"optimizar"** → `optimizeProfile()` — 5 bio variants + highlights system + link in bio + search keywords.

**"auditar [bio actual] [nameField] [linkUrl] [highlightCount]"** → `auditCurrentProfile()` — score 0-100 + issues + recomendaciones.

**"ver"** → `getOptimization(brandId)` — última optimización guardada.

**"ab test"** → Compara performance de variantes de bio.

## Anatomía de una bio que convierte

```
Línea 1: HOOK (qué problema resolvés / a quién ayudás)
Línea 2: PROPOSITION (qué ofrecés concretamente)
Línea 3: SOCIAL PROOF (métrica / premio / certificación)
Línea 4: CTA (qué hacer)
Línea 5: LINK (texto antes del link "👇" o "🔗")
```

Límite: 150 caracteres total. Cada caracter cuenta.

## 5 estrategias de bio que genera el skill

1. **Maximizar autoridad** — credenciales, métricas, prensa
2. **Maximizar conexión emocional** — historia personal, valores
3. **Maximizar conversión directa** — beneficio claro + CTA fuerte
4. **Maximizar curiosidad/intriga** — abrir loop, prometer revelación
5. **Maximizar prueba social** — testimonios, clientes, comunidad

## Highlights system (8-12 highlights)

Categorías estratégicas con icon design:

| Categoría    | Ejemplos                  | Prioridad |
| ------------ | ------------------------- | --------- |
| about        | "Nosotros", "Mi Historia" | Alta      |
| products     | "Catálogo", "Servicios"   | Alta      |
| testimonials | "Clientes", "Reviews"     | Alta      |
| process      | "Cómo trabajo", "Behind"  | Media     |
| team         | "Equipo"                  | Media     |
| media        | "Prensa", "Podcasts"      | Media     |
| contact      | "Contacto", "FAQ"         | Alta      |
| sales        | "Promos", "Lanzamientos"  | Variable  |

Orden: priorizar por relevancia al objetivo principal de la marca.

## Link in bio strategy

Opciones de layout:

- `minimal` — 1-3 links destacados (ecommerce, lanzamientos)
- `cards` — links con preview visual (portfolio, productos)
- `list` — links en lista (Linktree style)
- `grid` — grid 2x2 o 3x3 (variedad de servicios)
- `thumbnail` — con imagen por link (visual brands)

Componentes ideales:

- 1 link PRIMARIO (oferta del momento)
- 4-6 links secundarios (categorías)
- Botón CTA grande
- Icons de redes sociales (WhatsApp, TikTok, YouTube)

## Name field optimization (búsqueda interna IG)

El campo "Nombre" es DISTINTO al @handle e indexable.

**Estrategia:**

```
[Nombre Marca] | [Keyword principal del nicho]
```

Ejemplo:

- ❌ "Cafetería Luna"
- ✅ "Luna | Café de Especialidad Palermo"

## Score de optimización (0-100)

Penalizaciones automáticas:

- Bio vacía: −30
- Bio <50 chars: −15
- Sin saltos de línea: −5
- Sin link en bio: −20
- <4 highlights: −10
- Sin keywords en campo Nombre: −8
- Sin método de contacto: −10

## 🧠 Cerebro FeedIA — hereda `/feedIA-brain`

Rol: **optimizador de bio IG (claridad + propuesta + CTA)**. Algoritmo: optimiza para sends/saves y alcance de Reels en frío (Instagram). Salida lista para usar, voz de marca, sin tells de IA, máxima elocuencia, mínimo esfuerzo del usuario.
