---
description: SEO Audit — auditoría técnica + on-page + Core Web Vitals
---

SEO Audit para FeedIA. Diagnostica issues técnicos y on-page.

## Según $ARGUMENTS

**"full [url]"** → Audit completo 30 puntos: technical + on-page + content + links.

**"technical [url]"** → Robots, sitemap, indexability, crawl errors, structured data.

**"on-page [url]"** → Title, meta, headings, keyword density, internal links, alt texts.

**"cwv [url]"** → Core Web Vitals: LCP, FID/INP, CLS + recommendations.

**"why-not-ranking [keyword]"** → Diagnóstico específico: por qué no aparece esta keyword.

**"competitors [keyword]"** → Quiénes rankean + qué hacen mejor + gap.

**"traffic-drop"** → Análisis de caída de tráfico: algo update? cambios técnicos? lost links?

## Checklist técnico

| Check                      | Severidad | Tool                       |
| -------------------------- | --------- | -------------------------- |
| robots.txt válido          | 🔴        | fetch /robots.txt          |
| sitemap.xml exists + valid | 🔴        | fetch /sitemap.xml         |
| HTTPS                      | 🔴        | url scheme                 |
| Mobile-friendly            | 🔴        | viewport meta              |
| Canonical tags             | 🟡        | parse <link rel=canonical> |
| Hreflang (multi-lang)      | 🟡        | <link rel=alternate>       |
| Schema.org                 | 🟢        | JSON-LD parse              |
| Duplicate content          | 🟡        | hash comparison            |
| 404s / broken links        | 🔴        | crawl                      |
| Redirects (max 1 hop)      | 🟡        | follow redirect chain      |
| Page speed <3s             | 🟡        | Lighthouse                 |

## Checklist on-page

- Title 30-60 chars, keyword al principio
- Meta description 120-160 chars con CTA
- H1 único + keyword principal
- H2-H6 jerárquicos + keywords secundarias
- Alt text en todas las imágenes
- Internal links a 3-5 páginas relevantes
- 1500+ palabras para artículos competitivos
- Keyword density 0.5-2% (no keyword stuffing)
- Outbound links a autoridad

## Output

```json
{
  "score": 73,
  "criticalIssues": [...],
  "warnings": [...],
  "suggestions": [...],
  "comparedToCompetitors": { betterThan: 3, worseThan: 2 },
  "actionPlan": [
    { priority: 'critical', action: '...', estimatedImpact: '...' }
  ]
}
```

## Integración

Output va a `programmatic-seo` para fix automation + `ai-seo` para optimizar para LLMs.

## 🧠 Cerebro FeedIA — hereda `/feedIA-brain`

Rol: **auditor SEO técnico y de contenido**. Algoritmo: agnóstico de feed; sirve a la estrategia global del cerebro FeedIA. Salida lista para usar, voz de marca, sin tells de IA, máxima elocuencia, mínimo esfuerzo del usuario.
