---
description: Programmatic SEO — pages at scale desde templates + data
---

Programmatic SEO. Genera N páginas SEO desde 1 template + dataset.

## Según $ARGUMENTS

**"plan [keyword-base]"** → Estructura de keywords: head + body + long-tail combos.

**"template [tipo]"** → Genera template: location-pages | comparison-pages | alternative-pages | integration-pages | directory.

**"generate [template] [csv]"** → Crea N páginas desde data: 1 página por row.

**"sitemap [pages]"** → XML sitemap + internal linking strategy.

**"refresh [old-pages]"** → Updatea páginas viejas con data fresca + nuevos features.

## Templates comunes para FeedIA

### 1. Location pages

```
/cm-ia-{ciudad}
"Community Manager IA en {ciudad}: precios, planes y resultados"
```

Genera 1 página por ciudad principal LATAM (~200 páginas).

### 2. Comparison pages

```
/feedia-vs-{competitor}
"FeedIA vs Hootsuite: ¿cuál es mejor para Instagram?"
```

1 por competidor (~30 páginas).

### 3. Alternative pages

```
/alternativa-a-{competitor}
"Alternativa a Buffer: por qué FeedIA es mejor en 2026"
```

1 por competidor (~30 páginas).

### 4. Use case pages

```
/cm-ia-para-{nicho}
"FeedIA para {nicho}: cómo automatizar tu Instagram"
```

1 por NichePack (~21 páginas — ya tenemos data).

### 5. Feature deep-dives

```
/funciones/{feature}
"Detalle: cómo FeedIA hace {feature}"
```

1 por capability (~70 páginas).

## Data sources

- `data/niches/*.json` — para nicho pages
- `data/cities.json` — para location pages (crear)
- `data/competitors/*.json` — para vs/alternative pages
- `src/capabilities/*/index.ts` — para feature pages (auto-scan)

## Quality > Quantity

Cada página debe:

- Header único (no template visible)
- 1500+ palabras útiles
- Schema markup (LocalBusiness, Product, FAQ)
- Internal links a 3-5 páginas relacionadas
- CTA específico
- Imagen única (via `image` skill)

Páginas debajo de threshold quality → no publicar (Google penaliza thin content).

## Output

```
/output/pseo/
  ├── location-cm-ia-{ciudad}.md (×N)
  ├── vs-{competitor}.md (×N)
  ├── nicho-{nicho}.md (×N)
  └── sitemap.xml
```

## 🧠 Cerebro FeedIA — hereda `/feedIA-brain`

Rol: **arquitecto de SEO programático a escala**. Algoritmo: agnóstico de feed; sirve a la estrategia global del cerebro FeedIA. Salida lista para usar, voz de marca, sin tells de IA, máxima elocuencia, mínimo esfuerzo del usuario.
