---
description: Super-Genius Brain — 6 módulos que entienden dinámicas avanzadas IG (algoritmo, viralidad, psicología, trends, experimentos, storytelling)
---

6 super-genius brains que conocen IG a nivel experto mundial.

## Los 6 expertos

| Módulo                    | Expert                 | Función                                                                                    |
| ------------------------- | ---------------------- | ------------------------------------------------------------------------------------------ |
| **algorithmDecoder**      | "Algorithm Whisperer"  | Predice distribución por surface (Feed/Reels/Explore/Stories) antes de publicar            |
| **viralMechanics**        | "Viral Scientist"      | K-factor + viral coefficient + cascade prediction + tier classification                    |
| **audiencePsychology**    | "Behavioral Economist" | Maslow + Cialdini + biases + emotions por audience segment                                 |
| **trendForecaster**       | "Trend Oracle"         | Predice trends 7-30d antes que sean obvias, identifica window of opportunity               |
| **autoExperimentBrain**   | "A/B Testing PhD"      | Diseña + corre + analiza experiments con statistical significance, auto-ships winners      |
| **storytellingArchitect** | "Story Engineer"       | Diseña arcos narrativos multi-post coherentes (Hero's Journey + Foreshadowing + Callbacks) |

## Según $ARGUMENTS

### Algorithm Decoder

**"algo predict [contentId]"** → `predictAlgorithmReach()` — distribución por 7 surfaces.
**"algo estimate [draft]"** → `estimateSignalsFromDraft()` — signals antes publish.

### Viral Mechanics

**"viral predict [draft]"** → `predictViralPotential()` con K-factor + tier (micro/mid/high/mega/super).
**"viral track [contentId]"** → trackea cascade real post-publish.
**"viral math [shares] [viewers]"** → K-factor + doubling time + projected reach.

### Audience Psychology

**"psych build"** → `buildPsychProfile()` — segmenta audiencia por Maslow + Cialdini.
**"psych triggers [contentType] [segmentId]"** → triggers específicos a aplicar.

### Trend Forecaster

**"trends forecast [niche]"** → 8-12 trends en distintas phases (germination→extinct).
**"trends latest"** → último forecast.
**"trends top-opportunities"** → top 5 trends a montar AHORA.

### Auto-Experiment Brain

**"exp design [type] [hypothesis]"** → diseña experiment con variantes.
**"exp analyze [id]"** → analiza con z-test + recommendation.
**"exp auto-ship"** → ships todos los winners significativos.
**"exp propose"** → sugiere próximos experimentos.

### Storytelling Architect

**"story design [arcType]"** → arco narrativo multi-week.
**"story next"** → próximo contenido según arcos activos.
**"story advance [arcId]"** → avanza beat actual.
**"story calendar"** → multi-arc calendar próximas weeks.

## 1. Algorithm Decoder

Modela el algoritmo IG real. 7 surfaces con weights distintos:

| Surface | Top signals weight                                            |
| ------- | ------------------------------------------------------------- |
| Feed    | close-friends 0.25, past-interaction 0.20, like-velocity 0.15 |
| Reels   | watchTime 0.30, shares 0.20, saves 0.15                       |
| Explore | saves 0.25, shares 0.20, topic-relevance 0.20                 |
| Stories | close-friends 0.40, past-interaction 0.30                     |
| Search  | topic-relevance 0.35, saves 0.15                              |
| Profile | past-interaction 0.50, close-friends 0.30                     |
| Shop    | saves 0.40, topic-relevance 0.30                              |

Output: `AlgorithmPrediction` con primary surface, expected reach 1h/24h/7d, virality score, blockers, amplifiers.

## 2. Viral Mechanics

Matemáticas:

```
K-factor = shares / viewers
viralCoefficient = K × shareToFollowConversion
doublingTimeHours = (cycleTime × ln(2)) / ln(1 + viralCoef)
projectCascadeReach = base × (1 - K^(n+1)) / (1 - K)
```

Viral tiers:

- **super**: reach ratio >100x base
- **mega**: >50x
- **high**: >20x
- **mid**: >5x
- **micro**: <5x

STEPPS framework aplicado (Berger):

- Social currency × Triggers × Emotion × Public × Practical value × Stories

Output: `ViralPrediction` con K-factor estimado, peak hour, tier, revenue potential, seed strategy, fatigue risk.

## 3. Audience Psychology

**5 niveles Maslow** mapeados a triggers:

- Fisiológica → miedo + loss-aversion
- Seguridad → miedo + default-effect
- Pertenencia → orgullo + bandwagon
- Estima → admiración + anchoring
- Autorrealización → curiosidad + framing

**6 Cialdini principles** con ejemplos pre-cargados:

- Reciprocidad, Escasez, Autoridad, Consistencia, Social-proof, Sympathy

**9 behavioral biases**:

- loss-aversion, anchoring, framing, default-effect, bandwagon, sunk-cost, recency, priming, fomo

**14 emotions wheel** con arousal level.

Output: `PsychProfile` con segmentos + triggers específicos por contentType.

## 4. Trend Forecaster

8 tipos de trends: hashtag, sound, format, topic, aesthetic, meme, challenge, narrative.

6 phases:

- **germination** → early signal, high risk/upside
- **emerging** → window of opportunity claro
- **rising** → still time to ride
- **peak** → cuidado saturación
- **declining** → evitar
- **extinct** → bloquear

Recommended actions: ride-now / prepare / wait / avoid.

Output: `TrendForecastReport` con topOpportunities + riskyTrends + window of opportunity days.

## 5. Auto-Experiment Brain

9 tipos: hook, caption-length, posting-time, hashtag-set, format, cta-framing, visual-style, audio, first-comment.

Statistical test: z-test for two proportions con p-value.

- p < 0.05 → significant
- lift > 10% → ship winner
- lift < 5% → continue testing
- |lift| < 2% → reset

Min sample size: 500 impressions/variant.

Traffic split: even (2-3 vars), multi-armed-bandit (4+ vars).

Output: `ExperimentResults` con winner, lift%, p-value, recommendation.

## 6. Storytelling Architect

8 arc types: hero-journey, transformation, mystery, rebellion, rags-to-riches, mentorship, rivalry, rebirth.

16 beats (Joseph Campbell + 3-act):

- call-to-adventure, refusal, meeting-mentor, crossing-threshold
- tests-allies-enemies, approach-cave, ordeal, reward
- road-back, resurrection, return-elixir
- inciting-incident, rising-action, climax, falling-action, denouement

Protagonist options: brand, founder, customer, audience-self.

Features:

- Foreshadowing — establecer hints en beats tempranos para payoff futuro
- Callbacks — referencias a beats anteriores
- Theme words — palabras-tema recurrentes para coherencia
- Cliffhangers entre beats
- Multi-arc calendar — corre N arcos en paralelo sin canibalizarse

Coherence score 0-100 mide cuán conectados están los posts.

## Endpoints (15)

```
# Algorithm
POST /api/genius/algorithm/predict      { contentId, signals OR draft, audienceSize }

# Viral
POST /api/genius/viral/predict          { draft, audienceSize }
POST /api/genius/viral/track            { contentId, metrics }

# Psychology
POST /api/genius/psychology/build       { hints? }
POST /api/genius/psychology/triggers    { contentType, segmentId? }

# Trends
POST /api/genius/trends/forecast        { niche?, horizon? }
GET  /api/genius/trends/latest

# Experiments
POST /api/genius/experiment/design      { type, hypothesis, variants }
POST /api/genius/experiment/analyze     { experimentId }
POST /api/genius/experiment/auto-ship
GET  /api/genius/experiment/active
POST /api/genius/experiment/propose     { count? }

# Storytelling
POST /api/genius/story/design-arc       { arcType?, durationWeeks?, theme? }
GET  /api/genius/story/next
POST /api/genius/story/advance          { arcId }
GET  /api/genius/story/calendar
```

## Integración con autonomyCore

Cada ciclo del cerebro autónomo ahora consulta los 6 super-geniuses:

```
runAutonomousCycle()
  ↓
  [Steps 1-11]
  ↓
  [12. SKILL INTEGRATION]
       ↓
  Para cada skill candidate:
    - Algorithm Decoder predice surface + reach
    - Viral Mechanics evalúa K-factor potencial
    - Audience Psychology aplica triggers correctos
    - Trend Forecaster checkea trend alignment
    - Auto-Experiment registra si es variante
    - Storytelling Architect verifica beat narrativo
  ↓
  Solo skills que pasan todos los gates se ejecutan
```

## Enrichment de prompts (final stack)

Cada generación de contenido ahora recibe **9 capas de contexto**:

```
1. [CONTEXTO USUARIO]              buildPromptEnrichment(userId)
2. [CONOCIMIENTO DEL NICHO]        buildNicheEnrichment(niche)
3. [INTELIGENCIA COLECTIVA]        buildCrossUserEnrichment(niche)
4. [CONTEXTO NEURAL]               memory.recallMemories
5. [WINNING PATTERNS]              getTopPatterns(brandId)
6. [TRENDS A MONTAR]               buildTrendEnrichment(brandId)
7. [TRIGGERS PSICOLÓGICOS]         buildPsychEnrichment(brand, type)
8. [CONTEXTO NARRATIVO]            buildNarrativeEnrichment(brandId)
9. [PROMPT ORIGINAL]
```

= cada output es generado con conocimiento de **algoritmo + psicología + trends + memory + niche + colectivo + narrativa**.

## Resultado: super-genius effect

Como tener:

- **Director del algoritmo** que predice surface antes publicar
- **Científico de viralidad** con matemáticas reales (K, viral coef, cascadas)
- **Psicólogo del consumidor** aplicando Maslow + Cialdini + biases
- **Oráculo de trends** que ve trends 7-30d antes
- **PhD A/B testing** corriendo experimentos auto con significance real
- **Story engineer** diseñando arcos narrativos multi-week con callbacks

Todos trabajando en paralelo, alimentados por la memoria y el aprendizaje continuo.

## 🧠 Cerebro FeedIA — hereda `/feedIA-brain`

Rol: **razonamiento de élite multi-paso**. Algoritmo: agnóstico de feed; sirve a la estrategia global del cerebro FeedIA. Salida lista para usar, voz de marca, sin tells de IA, máxima elocuencia, mínimo esfuerzo del usuario.
