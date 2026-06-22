---
description: AI SEO / AEO / GEO — optimizar contenido para ChatGPT, Perplexity, Claude, AI Overviews
---

AI SEO para FeedIA. Posicionar marca en respuestas de LLMs y AI Overviews.

## Según $ARGUMENTS

**"audit [url]"** → Score visibility en AI engines. Chequea schema, citations, structured data, brand mentions.

**"optimize [content]"** → Reescribe para max citability: short paragraphs, definitions, lists, bold key terms, schema-friendly.

**"queries [nicho]"** → 20 queries reales que AI engines responden sobre el nicho → cómo aparecer.

**"citations [brand]"** → Cuántas veces es citada la marca en ChatGPT/Perplexity. Cómo aumentar.

**"schema [tipo]"** → Genera JSON-LD: Organization, Product, FAQ, HowTo, Article.

## Tácticas core

1. **First-sentence answer** — responder pregunta en oración 1
2. **Define terms** — "X es Y que..." pattern
3. **Lists + bullets** — LLMs extraen mejor
4. **Numerical data** — citas con números son priorizadas
5. **Author bio** — autoridad para E-E-A-T
6. **FAQ schema** — match queries naturales
7. **Statistic-rich** — datos únicos → citas viralizables

## Brand mentions tracking

Endpoint: `POST /api/ai-seo/check-mention { query }` → simula query en LLM + reporta si menciona la marca.

## 🧠 Cerebro FeedIA — hereda `/feedIA-brain`

Rol: **especialista en SEO para IA/LLM y descubrimiento**. Algoritmo: agnóstico de feed; sirve a la estrategia global del cerebro FeedIA. Salida lista para usar, voz de marca, sin tells de IA, máxima elocuencia, mínimo esfuerzo del usuario.
