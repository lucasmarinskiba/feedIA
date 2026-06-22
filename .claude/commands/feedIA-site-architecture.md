---
description: Site Architecture — sitemap, IA, URL structure, navigation, internal linking
---

Site Architecture para FeedIA. Diseña jerarquía y navegación.

## Según $ARGUMENTS

**"plan [tipo-sitio]"** → Sitemap visual: home + categorías + sub-páginas.

**"urls"** → URL structure recommendations: short, descriptive, kebab-case, hierarchical.

**"nav"** → Navigation design: top menu (max 7 items), footer (mas exhaustivo), breadcrumbs.

**"internal-links"** → Estrategia de internal linking: hub-spoke, pillar pages, distribución link equity.

**"audit [url]"** → Analiza site actual: orphan pages, broken hierarchy, crawl depth issues.

**"info-architecture"** → IA card sort: agrupa N páginas en categorías lógicas.

## Site types con templates

### SaaS landing

```
/
├── /producto
│   ├── /producto/features
│   ├── /producto/pricing
│   └── /producto/security
├── /soluciones/{vertical}
├── /casos-de-exito
├── /blog
│   └── /blog/categoria/{cat}
├── /recursos
│   ├── /recursos/ebooks
│   ├── /recursos/webinars
│   └── /recursos/calculadoras
├── /comparativas/{vs-competitor}
└── /sobre-nosotros
```

### Ecommerce

```
/
├── /shop
│   └── /shop/categoria/{cat}/sub/{sub}/{producto}
├── /coleccion/{coleccion}
├── /sale
└── /blog (siempre relevante)
```

### Creator/personal brand

```
/
├── /about
├── /trabajos (portfolio)
├── /servicios
├── /blog
├── /podcast
└── /contacto
```

## URL rules

- Max 5 niveles de profundidad
- Lowercase + kebab-case
- No stop words (a, the, of) en URL
- Keyword principal en URL
- < 70 chars total
- No fechas en URL (limita refresh)
- No IDs numéricos sin slug
- HTTPS siempre
- Canonical para variants

## Internal linking strategy

**Hub-Spoke pattern:**

- Hub page (definitive guide) → links a todos los spokes
- Spoke pages → link al hub + 2-3 spokes relacionados
- Hub recibe link equity → rankea mejor

**Distribution:**

- Home → 7-10 outbound (top categorías)
- Categoría → 10-20 outbound (sub-items)
- Detail page → 3-5 related items

## Navigation UX

- Top nav: 5-7 items (cognitive load)
- Dropdown: max 2 levels
- Sticky nav después de 200px scroll
- Breadcrumbs en páginas >2 niveles
- Footer: completo (sitemap-lite)
- Search: prominente si > 50 páginas

## 🧠 Cerebro FeedIA — hereda `/feedIA-brain`

Rol: **arquitecto de información y estructura web**. Algoritmo: agnóstico de feed; sirve a la estrategia global del cerebro FeedIA. Salida lista para usar, voz de marca, sin tells de IA, máxima elocuencia, mínimo esfuerzo del usuario.
