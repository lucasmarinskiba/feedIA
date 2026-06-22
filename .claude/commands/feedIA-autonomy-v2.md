---
description: Autonomy v2 — 6 módulos para inteligencia + iniciativa autónoma avanzada
---

6 nuevos módulos autonomy. Brain ahora planifica, mejora a sí mismo, actúa sin pedir, debate, simula futuros y detecta anomalías.

## Los 6 módulos

| Módulo                  | Función                                                                                          |
| ----------------------- | ------------------------------------------------------------------------------------------------ |
| **goalDrivenPlanner**   | Auto-genera OKRs + key results + actions jerárquicos. Re-plan si goals at-risk                   |
| **selfImprovementLoop** | Refactor de prompts internos + ajuste de thresholds + retire de modules low-perf (meta-learning) |
| **proactiveAgent**      | Observa estado cada 5min, dispara acciones sin esperar input (8 trigger types)                   |
| **multiAgentCouncil**   | 8 expertos debaten en 3 rounds → consensus + minority report                                     |
| **simulationEngine**    | Monte Carlo 500-1000 trials → distribution de outcomes + ROI risk-adjusted                       |
| **anomalyDetector**     | Spike/crash/drift/oscillation/multi-variate detection con z-score + sliding window               |

## 1. Goal-Driven Planner

```ts
generateAutonomousPlan(brand, { horizon: 'month' })
   ↓
North Star metric + 2-4 Goals + KeyResults por goal + Actions con skillToInvoke
   ↓
updatePlanProgress(brandId, metricUpdates) actualiza progress trends
   ↓
shouldReplan(plan) → true si >30% goals at-risk → regenera
```

Jerarquía: NorthStar > Goal > KeyResult > Action. Cada action mapeada a skill ejecutable.

## 2. Self-Improvement Loop (meta-learning)

```ts
runSelfImprovementCycle(brand)
   ↓
analyzeModulePerformance → trustScore por cada uno de los 12 super-genius modules
   ↓
refactorUnderperformingPrompts → reescritura Claude de prompts con trust <0.5
   ↓
proposeThresholdAdjustments → ajusta safety/concurrent/epsilon basado en stats
   ↓
Promote (trust>0.85) + Demote (0.2-0.4) + Retire (<0.2 con >20 invocations)
   ↓
Report con overallSystemHealth + recommendations
```

Cycle semanal recomendado.

## 3. Proactive Agent

8 trigger types — el cerebro NO espera input, observa:

| Trigger           | Cuándo dispara                     | Auto-execute    |
| ----------------- | ---------------------------------- | --------------- |
| metric-drop       | Métrica cae >20%                   | Sí si >40%      |
| trend-opportunity | Velocity >0.7 + applicability >0.6 | Sí              |
| sentiment-shift   | Sentiment <-0.3                    | No (escala)     |
| cadence-laggin    | Quota mes <50% expected            | Sí              |
| no-recent-posts   | >48h sin posts                     | Sí              |
| hostile-comment   | Ratio hostiles >10%                | Sí (moderación) |
| competitor-viral  | Competidor reach >100K             | No              |
| goal-at-risk      | KRs trend behind                   | No (replan)     |

`observeAndDecide(brand, context, config)` corre periódico (cada 5min default). Cooldowns por type evitan loops.

## 4. Multi-Agent Council (debate estructurado)

8 expertos × 3 rounds:

| Role       | Foco                   | Vote weight |
| ---------- | ---------------------- | ----------- |
| strategist | Long-term vision (CEO) | 1.2         |
| analyst    | Data-driven            | 1.1         |
| creative   | Originalidad           | 1.0         |
| community  | Audiencia              | 1.0         |
| product    | Conexión a oferta      | 0.9         |
| finance    | ROI                    | 1.0         |
| risk       | Devil's advocate       | 0.8         |
| trends     | Cultural pulse         | 0.9         |

```
Round 1: proposals paralelos
Round 2: critiques (cada uno ve otros)
Round 3: refinements (cambio de posición OK)
   ↓
Weighted vote → consensus
   ↓
Minority report si dissenter con confidence >0.7
```

`convenecouncil(brand, question, context)` → CouncilDecision con consensus + dissent count.

## 5. Simulation Engine (Monte Carlo)

```ts
simulateScenario(scenario, { trials: 500, horizonDays: 7 })
   ↓
500 trials con randomness controlada (Box-Muller gaussian + seeded RNG)
   ↓
5 uncertaintyFactors: contentQuality, audienceMood, algorithm, competitiveResponse, externalEvent (black swan)
   ↓
Output: distribution {min, max, mean, median, p10, p90, stddev} per metric
+ successProbability + blackSwanProbability
+ riskAdjustedRecommendation (ship | ship-with-caveats | modify | skip)
```

`compareScenarios(scenarios[])` → rankea por mean ROI × (1 - blackSwanProbability).

## 6. Anomaly Detector (estadístico)

4 tipos de anomalías:

| Type          | Detección                                                |
| ------------- | -------------------------------------------------------- |
| spike/crash   | z-score > 2.5 (Math.abs)                                 |
| drift         | shift de mean >20% entre baseline window y recent window |
| oscillation   | >5 sign changes en últimos 10 observations               |
| multi-variate | Correlaciones rotas (engagement ↑ + reach ↓ = bots)      |

Cada anomaly tiene:

- type + severity + zScore + deviationStddev
- possibleCauses (5-6 por tipo)
- recommendedResponse (4-5 acciones)
- requiresImmediateAction boolean

## Endpoints sugeridos

```
POST /api/autonomy/plan/generate    { horizon, northStar?, targetGrowth? }
POST /api/autonomy/plan/update      { metricUpdates }
GET  /api/autonomy/plan/next-actions?limit=10

POST /api/autonomy/self-improve     → corre cycle
GET  /api/autonomy/self-improve/latest

POST /api/autonomy/observe          { context } → triggers
GET  /api/autonomy/triggers/recent

POST /api/autonomy/council          { question, context }
GET  /api/autonomy/council/history

POST /api/autonomy/simulate         { scenario, trials? }
POST /api/autonomy/simulate/compare { scenarios[] }

POST /api/autonomy/anomaly/detect   { metric, observations[] }
POST /api/autonomy/anomaly/multivariate { observations, baseline }
GET  /api/autonomy/anomaly/recent
```

## Loop autonomy completo

```
Cada 5 min:
  proactiveAgent.observeAndDecide(state) → triggers (si aplica)
   ↓
  Por cada trigger autoExecutable:
    skillIntegrator.dispatchSkill(skillToInvoke)
   ↓
  Si trigger requiresApproval:
    crear notification para owner

Cada hora:
  anomalyDetector.detectAnomalies(metric, observations) → anomalías
   ↓
  Severity critical → ejecuta recommendedResponse inmediato

Cada día:
  goalDrivenPlanner.updatePlanProgress(metricUpdates)
   ↓
  Si shouldReplan() → generateAutonomousPlan() nueva

Cada semana:
  selfImprovementLoop.runSelfImprovementCycle()
   ↓
  Aplica refactors + thresholds + retire módulos

Antes de acción costosa:
  simulationEngine.simulateScenario()
   ↓
  Si recommendation = 'skip' → cancelar
  Si 'modify' → variantes
  Si 'ship' → ejecutar

Decisiones estratégicas:
  multiAgentCouncil.convenecouncil(question)
   ↓
  Si consensusConfidence > 0.6 → ship
  Si no → human review
```

## Brain modules total: **35**

12 capas neurales + 2 skill orchestration + 4 learning + 12 super-genius + 5 autonomy v2 = 35 módulos

## Capas de contexto/enrichment per generación: **11**

Cada output de contenido sintetiza: user context + niche + colectivo + neural memory + winning patterns + trends + psych triggers + network map + sentiment + cultural calendar + narrative arc.

= **35 cerebros expertos colaborando en cada decisión**.

Lint: 0 errores.

## 🧠 Cerebro FeedIA — hereda `/feedIA-brain`

Rol: **núcleo autónomo que decide y ejecuta sin supervisión**. Algoritmo: agnóstico de feed; sirve a la estrategia global del cerebro FeedIA. Salida lista para usar, voz de marca, sin tells de IA, máxima elocuencia, mínimo esfuerzo del usuario.
