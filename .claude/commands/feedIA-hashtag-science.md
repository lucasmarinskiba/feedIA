---
description: Skill Hashtag Scientist — Investigación profunda + pirámide estratégica + anti-shadowban
---

Skill de hashtag research. Módulo: `src/capabilities/hashtagScientist/deepResearch.ts`

## Comportamiento según $ARGUMENTS

**"investigar [tema]"** → `researchHashtags()` — pirámide completa de 25-30 hashtags + 3 sets alternativos.

**"ver"** → `getResearch(brandId)` — última investigación.

**"rotación"** → `getNextRotation()` — siguiente set de rotación para evitar shadowban.

**"risk"** → `detectShadowbanRisk()` — detecta hashtags baneados/oscurecidos en el set actual.

**"performance [setId] [reach] [engagement]"** → `recordSetPerformance()` — registra cómo performó un set.

## Estructura piramidal estratégica

```
MEGA (>10M posts)        : 1-2 hashtags    [exposición masiva, alta competencia]
MACRO (1M-10M)           : 3-5 hashtags    [alcance amplio, competencia media]
MEDIO (100K-1M)          : 5-10 hashtags   [sweet spot — visibilidad real]
MICRO (10K-100K)         : 5-10 hashtags   [audiencia comprometida]
NICHO (<10K)             : 3-5 hashtags    [conversión alta, hyper-targeted]
```

## Reglas anti-shadowban

1. **Rotar sets** — no usar los mismos 30 hashtags en cada post
2. **Detectar baneados** — la lib mantiene lista de hashtags conocidos como baneados/oscurecidos
3. **Variar mix** — no abusar de mega-tags (algoritmo lo penaliza)
4. **Geo-targeting** — incluir hashtags locales relevantes (mayor engagement local)
5. **Relevancia** — cada hashtag debe tener relación REAL con el contenido

## Hashtags baneados conocidos (lista parcial)

asia, beautyblogger, curvygirls, date, desk, dm, easter, eggplant, instagood, kickoff, master, mirror, overnight, parties, petite, pushups, singlelife, snap, snapchat, streetphoto, sunbathing, tag4like, tagsforlikes, undies, workflow, youngmodel

(Lista completa actualizable en el módulo)

## Métricas por hashtag

Cada hashtag investigado incluye:

- `estimatedPosts` — volumen de posts existentes
- `difficulty` (0-100) — qué tan difícil rankear
- `relevanceScore` (0-100) — relevancia para la marca
- `competitorUsage` — cuántos competidores lo usan
- `trendDirection` — rising / stable / declining
- `isBanned` / `isShadowbanned`
- `bestForFormats` — qué formatos lo aprovechan mejor

## Estrategia por objetivo

**Crecimiento de followers:** 60% MEDIO + 30% MICRO + 10% MACRO
**Engagement alto:** 50% NICHO + 30% MICRO + 20% MEDIO
**Viralización:** 30% MEGA + 40% MACRO + 30% MEDIO
**Conversión:** 70% NICHO + 30% MICRO (audiencia hyper-targeted)

## 🧠 Cerebro FeedIA — hereda `/feedIA-brain`

Rol: **científico de hashtags (tema/contexto, no magia)**. Algoritmo: diferencia IG (sends/saves, grafo+Reels) de TikTok (completion/FYP en frío) y aplica el correcto. Salida lista para usar, voz de marca, sin tells de IA, máxima elocuencia, mínimo esfuerzo del usuario.
