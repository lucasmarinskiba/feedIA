---
description: Super-Genius Brain v2 — 6 nuevos módulos (network, sentiment, vision, cultural, lifecycle, cross-platform)
---

6 módulos super-genius adicionales. Total brain modules: 29.

## Los 6 nuevos

| Módulo                          | Archivo                        | Función                                                                                |
| ------------------------------- | ------------------------------ | -------------------------------------------------------------------------------------- |
| **Network Effect Mapper**       | `networkEffectMapper.ts`       | Grafo social, super-connectors, viral paths, clusters                                  |
| **Sentiment Tracker**           | `sentimentTracker.ts`          | Mood continuo, crisis temprana, polarizing topics                                      |
| **Visual Brain Vision**         | `visualBrainVision.ts`         | Análisis profundo imágenes (composition, color, focal point, scroll-stop)              |
| **Cultural Calendar**           | `culturalCalendar.ts`          | Holidays + awareness days + events por geo + newsjacking                               |
| **Content Lifecycle Optimizer** | `contentLifecycleOptimizer.ts` | Next-best-action por post en cada fase (launch/momentum/consolidation/decay/evergreen) |
| **Cross-Platform Synergy**      | `crossPlatformSynergy.ts`      | IG + TikTok + YT + LinkedIn + Twitter compounding flows                                |

## Network Effect Mapper

```ts
buildNetworkMap(brand, { niche, seedAccounts, depth })
   ↓
identifica nodes + edges + clusters
   ↓
extrae super-connectors (top bridging × influence)
   ↓
computeViralPath(brandId, targetAudience)
   ↓
ranked paths con expected reach + probability + cost
```

## Sentiment Tracker

7 labels: love / positive / neutral / concern / negative / hostile / sarcasm

```ts
generateSentimentSnapshot(brand, comments, windowDays=7)
   ↓
distribution + overall score + trend vs último window
   ↓
moodKeywords positive/negative
   ↓
crisisRiskScore (0-1) — alertas tempranas
```

## Visual Brain Vision (Claude multimodal)

```ts
analyzeImage({ imageUrl o imageBase64, imageId })
   ↓
composition (rule of thirds, focal point, balance)
+ color (palette, harmony, mood, contrast)
+ subject (faces, products, text overlay)
+ emotion (arousal, valence)
+ scrollStopFactors (probability, reasons, weak spots)
+ igBestPractices + suggestions
```

`rankImagesByStopPotential(images)` → rankea N imágenes por probabilidad de detener scroll.

## Cultural Calendar

12 categorías de events. 5 niveles de relevance. Por región específica.

```ts
buildCulturalCalendar(brand, { regions, horizonDays })
   ↓
20-35 events identificados
   ↓
upcomingPriorities (próximos 30 días + relevance high/critical)
   ↓
weeklyDigest agrupado por semana
```

`getActionableEvents(brandId, lookAheadDays)` → eventos que requieren acción ahora.

Cada event tiene:

- contentAngles + hashtagSuggestions + toneRecommended
- taboosToAvoid + preparationLeadDays
- audienceInterestScore

## Content Lifecycle Optimizer

7 phases: pre-publish / launch / momentum / consolidation / decay / evergreen / archived

10 next-actions: optimize-pre-publish / boost-now / reply-comments-fast / share-to-stories / pin-to-profile / cross-post / repurpose / archive / delete / do-nothing

```ts
decideNextActions(brand, postState)
   ↓
- Determina phase basado en age + performance vs baseline + velocity
- Genera nextActions priorizadas (critical → high → medium → low)
- shouldBoostAds + shouldRepurpose + shouldArchive
- recommendedRepurposeFormats por format origen
```

`identifyRepurposeCandidates(brand, posts, limit)` → top posts evergreen para extender vida útil.

## Cross-Platform Synergy

12 plataformas mapeadas con affordances:

- instagram, tiktok, youtube, youtube-shorts, linkedin, twitter, pinterest, threads, whatsapp, email, blog, podcast

Cada platform tiene strengths/weaknesses/demographics/optimal-formats/algorithm-factors.

```ts
designCrossPlatformFlow(brand, { centralIdea, primaryPlatform, targetPlatforms })
   ↓
Flow ordenado: 5-9 piezas con
- platform + format + timing + adaptation + expectedAmplification
- audienceOverlap entre platforms (evitar canibalizar)
- cannibalizationRisk score
```

`prioritizePlatforms(brand, audienceSize?)` → ranking de plataformas a invertir tiempo según brand fit.

## Endpoints (a agregar a /api/genius/\*)

```
POST /api/genius/network/build              { niche?, seedAccounts? }
POST /api/genius/network/viral-path         { targetAudience }

POST /api/genius/sentiment/snapshot         { comments[] }
GET  /api/genius/sentiment/latest
GET  /api/genius/sentiment/trend?days=30

POST /api/genius/vision/analyze             { imageUrl o imageBase64, imageId }
POST /api/genius/vision/rank                { images[] }

POST /api/genius/cultural/build             { regions?[], horizonDays? }
GET  /api/genius/cultural/actionable?days=14

POST /api/genius/lifecycle/decide           { postState }
POST /api/genius/lifecycle/repurpose-candidates { posts[] }

POST /api/genius/cross-platform/flow        { centralIdea, primaryPlatform?, targetPlatforms? }
POST /api/genius/cross-platform/prioritize  { audienceSize? }
```

## Brain expansion total

**Antes (6 super-genius modules):** algorithmDecoder, viralMechanics, audiencePsychology, trendForecaster, autoExperimentBrain, storytellingArchitect

**Ahora (12 super-genius modules):** los 6 anteriores + networkEffectMapper, sentimentTracker, visualBrainVision, culturalCalendar, contentLifecycleOptimizer, crossPlatformSynergy

## Brain modules totales: 29

Capas neurales (12):

1. neuralKnowledgeBase, feedbackLoop, reinforcementEngine, mlopsOrchestrator, safetyController, autonomyCore
2. memoryNeurons, attentionMechanism, ensembleOrchestrator, convolutionalLayer, recurrentNeuron, dropoutLayer

Skill orchestration (2):

- skillRegistry, skillIntegrator

Learning (4):

- userLearningEngine, postPerformanceAnalyzer, nicheBrainExpander, crossUserKnowledge

Super-Genius v1 (6):

- algorithmDecoder, viralMechanics, audiencePsychology, trendForecaster, autoExperimentBrain, storytellingArchitect

Super-Genius v2 (6 — esta iteración):

- networkEffectMapper, sentimentTracker, visualBrainVision, culturalCalendar, contentLifecycleOptimizer, crossPlatformSynergy

## Capas de enrichment de prompts (ahora 9)

Cada generación de contenido puede recibir:

```
[CONTEXTO USUARIO]            buildPromptEnrichment(userId)
[CONOCIMIENTO DEL NICHO]      buildNicheEnrichment(niche)
[INTELIGENCIA COLECTIVA]      buildCrossUserEnrichment(niche)
[CONTEXTO NEURAL]             memory.recallMemories
[WINNING PATTERNS]            getTopPatterns(brandId)
[TRENDS A MONTAR]             buildTrendEnrichment(brandId)
[TRIGGERS PSICOLÓGICOS]       buildPsychEnrichment(brand)
[NETWORK MAP]                 buildNetworkEnrichment(brandId)
[SENTIMENT AUDIENCIA]         buildSentimentEnrichment(brandId)
[CALENDARIO CULTURAL]         buildCulturalEnrichment(brandId)
[CONTEXTO NARRATIVO]          buildNarrativeEnrichment(brandId)
```

Cada generación de contenido lleva **11 capas de contexto** auto-inyectadas. Esto es lo que hace que el cerebro funcione como un equipo de super-geniuses.

## 🧠 Cerebro FeedIA — hereda `/feedIA-brain`

Rol: **razonamiento de élite multi-paso v2**. Algoritmo: agnóstico de feed; sirve a la estrategia global del cerebro FeedIA. Salida lista para usar, voz de marca, sin tells de IA, máxima elocuencia, mínimo esfuerzo del usuario.
