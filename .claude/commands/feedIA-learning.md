---
description: Sistema de aprendizaje continuo — user signals + post performance + niche + cross-user
---

4 capas de aprendizaje. Brain se vuelve más inteligente con cada user + post + ciclo.

## Las 4 capas

| Capa                        | Módulo                       | Qué aprende                                                                                                 |
| --------------------------- | ---------------------------- | ----------------------------------------------------------------------------------------------------------- |
| **1. User Learning**        | `userLearningEngine.ts`      | Lexicon, styles, cultural signals, business profile, influence patterns DEL user específico                 |
| **2. Post Performance**     | `postPerformanceAnalyzer.ts` | Via Computer Use scrapea métricas reales de IG (propias, competencia, top brands) y extrae winning patterns |
| **3. Niche Brain**          | `nicheBrainExpander.ts`      | Conocimiento agregado del nicho: top brands, benchmarks, trends, taboos                                     |
| **4. Cross-User Knowledge** | `crossUserKnowledge.ts`      | Privacy-safe aggregation: patterns que funcionan across users del mismo nicho                               |

## Según $ARGUMENTS

**"signal [type] [payload]"** → registra signal del user (prompt/feedback/edit/publish/discard).

**"profile [userId]"** → consolida UserKnowledgeProfile desde signals.

**"scrape [@handle]"** → CU scrapea posts + métricas de la cuenta.

**"analyze own|competitor|niche-top"** → análisis completo + extracción de winning patterns.

**"expand-niche [niche]"** → construye NicheKnowledge completo (top brands + benchmarks + trends).

**"contribute [userId] [signal]"** → contribuye al pool cross-user (requiere consent).

**"consolidate-collective"** → procesa cross-user signals → patterns globales.

## Capa 1: User Learning

```
SIGNALS capturados:
- prompt        → léxico + estilo
- feedback 👍/👎 → preferencias
- edit          → diff revela voz real
- publish       → output aprobado
- discard       → output rechazado
- tag-change    → preferencias de hashtags
- rating        → score numérico

CONSOLIDATION (cada N signals o semanal):
signals[] → Claude → UserKnowledgeProfile {
  lexicon (preferred/avoided/signature/emojis/capitalization),
  styles (visualStyle, copyTone, contentLength, emojiUsage, ctaStyle, hookStyle),
  cultural (references, slang, regionMarkers, generationMarkers, trends),
  business (detectedType, pricePointHint, salesCycle, targetMarket),
  influence (citedAccounts, admiredBrands, contentInspirations),
  workstyle (activeHours, activeDays, revisionRate),
  topicAffinity[]
}

USO:
buildPromptEnrichment(userId) → inyecta perfil en próximos prompts
```

## Capa 2: Post Performance (Computer Use scraping)

```
scrapeAccountMetrics(brand, @handle, 12)
   ↓
runBrainAwareCu con instruction:
"Abrí @handle. Scrolleá. Para cada post: URL, format, caption, hashtags, likes, comments, saves, shares"
   ↓
Events → Claude parse → PostMetrics[]
   ↓
extractWinningPatterns(brand, posts)
   - Top 20% por engagement
   - Claude identifica patrones que distinguen winners
   - Output: WinningPattern[] con type, description, evidence, confidence
   ↓
Persiste en data/neural/post-performance/{brandId}-patterns.json
```

**3 scopes:**

- `own` — métricas propias del user
- `competitor` — métricas de competidores listados en brand.competitors
- `niche-top` — métricas de top brands mundiales del nicho

**Métricas captured:** likes, comments (positive/negative via sentiment), saves, shares, reach, impressions, video views, engagement rate.

## Capa 3: Niche Brain Expander

```
expandNicheBrain(brand, niche)
   ↓
1. discoverTopBrandsInNiche(niche, 15) → Claude lista top brands reales del nicho
2. (opt) scrape top brands → patterns
3. Claude sintetiza NicheKnowledge {
     topBrands[],
     benchmark { avgEngagementRate, topEngagementRate, avgPostsPerWeek, bestFormats, bestPostingTimes, topHashtags, commonHooks },
     emergingTrends[],
     dyingTrends[],            ← EVITAR estos
     taboos[],                 ← qué nunca hacer
     audienceLanguage { keywords, slang, influencers },
     monetizationModels[],
     contentCadenceSweetSpot { postsPerWeek, storiesPerWeek, reelsPerWeek }
   }
```

**Usado por:**

- `buildNicheEnrichment(niche)` → inyecta knowledge en prompts
- `getNicheTopPatterns(niche)` → patterns ordenados por confidence × engagement

## Capa 4: Cross-User Collective Knowledge

**Privacy-first:**

- `userId` → SHA-256 hash (no PII)
- brand → generalizado (`empresa-pequena` vs `creator-mid`)
- Solo agrega cuando ≥5 contribuidores únicos por pattern
- Opt-in explícito (`setUserConsent(userId, true)`)
- Salt configurable via `CROSS_USER_SALT` env

```
contributeSignal(userId, brand, { type, payload, outcome, rewardScore })
   ↓ (cada user opted-in contribuye)
SIGNALS anonimizados acumulan
   ↓
consolidateCrossUserPatterns()
   - Agrupa por niche
   - Filtra niches con ≥5 contributors
   - Claude extrae CrossUserPattern[] con successRate, contraindications
   - Merge inteligente: si pattern ya existe, refuerza confidence
   ↓
buildCrossUserEnrichment(niche) → inyecta inteligencia colectiva en prompts
```

**Resultado:** cuanto más users usan FeedIA, más inteligente se vuelve para TODOS.

## Endpoints

```
# Capa 1: User Learning
POST /api/learning/signal         { userId, brandId, type, payload, weight }
POST /api/learning/consolidate    { userId }
GET  /api/learning/profile/:userId

# Capa 2: Post Performance
POST /api/performance/scrape      { handle, maxPosts? }
POST /api/performance/analyze     { scope: 'own'|'competitor'|'niche-top', handles?[] }
GET  /api/performance/patterns

# Capa 3: Niche Brain
POST /api/niche/expand            { niche?, scrapeTopBrands? }
GET  /api/niche/knowledge/:niche

# Capa 4: Cross-User
POST /api/cross-user/contribute   { userId, brand, signal }
POST /api/cross-user/consolidate
GET  /api/cross-user/state
POST /api/cross-user/consent      { userId, optedIn }
```

## Integración con prompts auto-enriquecidos

Cuando QuickCarousel/QuickReel/QuickStory generan contenido, inyectan automáticamente:

```
[CONTEXTO USUARIO]   ← buildPromptEnrichment(userId)
+
[CONOCIMIENTO DEL NICHO]   ← buildNicheEnrichment(niche)
+
[INTELIGENCIA COLECTIVA]   ← buildCrossUserEnrichment(niche)
+
[CONTEXTO NEURAL]   ← memory.recallMemories
+
prompt original
```

= **5 capas de contexto** alimentando cada generación.

## Loop de mejora continua

```
Ciclo 1 (user nuevo):
  - Sin profile → genera con defaults
  - User edita → recordEdit
  - User publica → recordPublish + scheduler trackea engagement real

Ciclo N (N=20 signals):
  - consolidateUserProfile → primera versión del perfil
  - Próximos prompts usan enrichment

Ciclo M (M=50 publicaciones):
  - runFullAnalysis(scope: 'own') → extrae winning patterns propios
  - Brain prioriza formatos que funcionaron

Ciclo K (cuenta growth + competidores):
  - runFullAnalysis(scope: 'competitor')
  - Adapta tácticas que funcionan en competencia

Ciclo Trimestral:
  - expandNicheBrain → refresh del nicho completo
  - Detecta emerging vs dying trends

Diariamente (background):
  - consolidateCrossUserPatterns → patterns colectivos
  - Cada user opted-in se beneficia del aprendizaje global
```

## Persistencia

```
data/neural/
  user-learning/
    {userId}-signals.json          (2000 últimos)
    {userId}-profile.json
  post-performance/
    {brandId}-{scope}.json         (posts crudos)
    {brandId}-patterns.json        (winning patterns, 200 últimos)
  niche-brain/
    {niche}-knowledge.json
  cross-user/
    anonymized-signals.json        (100K cap)
    cross-user-patterns.json       (500 cap)
    state.json
```

## Privacy guarantees

- **PII never persisted** en cross-user (solo hashes salted)
- **Opt-in required** para contribuir
- **Min contributors threshold** (5) — sin agregación no se genera pattern
- **Brand generalizada** (no name, solo type+tier)
- **Sanitización** en cada signal capture
- **Opt-out endpoint** disponible siempre

## 🧠 Cerebro FeedIA — hereda `/feedIA-brain`

Rol: **motor de aprendizaje continuo del cerebro**. Algoritmo: agnóstico de feed; sirve a la estrategia global del cerebro FeedIA. Salida lista para usar, voz de marca, sin tells de IA, máxima elocuencia, mínimo esfuerzo del usuario.
