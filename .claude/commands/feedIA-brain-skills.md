---
description: Brain-Skill Integration — cerebro autónomo invoca skills basado en estado
---

Integración cerebro neural + skills. Módulos: `skillRegistry.ts` + `skillIntegrator.ts`.

## Según $ARGUMENTS

**"registry"** → Lista catálogo completo de skills + metadata.

**"plan"** → Genera IntegrationPlan basado en estado actual.

**"execute [plan-id]"** → Ejecuta plan completo (cada skill con timeout + cost cap).

**"by-metric [metric]"** → Skills que mueven una métrica específica.

**"by-category [cat]"** → Skills filtradas: content-generation / engagement / strategy / etc.

**"audit"** → Cuáles skills falta wirear al integrator.

## Cómo funciona

```
autonomyCore.runAutonomousCycle()
   ↓
[1. Input → 2. Feedback → 3. RL → 4. Safety → 5. Forward Pass → 6. Decisión → 7. RL Episode → 8. Backprop → 9. MLOps → 10. RL Refine → 11. Human Review check]
   ↓
[12. SKILL INTEGRATION] ← NUEVO
   ├── buildIntegrationPlan()
   │    ├── findSkillsForAction(recommendedAction)
   │    ├── findSkillsForMetric(bottleneck) por cada bottleneck
   │    └── findSkillsByTrigger('event', contextEvents)
   ├── Orden por prioridad: critical / high / medium / low
   └── executeIntegrationPlan()
        ├── chunks paralelos (maxConcurrent: 3)
        ├── cost cap (maxSkillCostUsd: 2.0 default)
        ├── dispatchSkill() con import dinámico
        └── tracking por skill (success / duration / cost / output)
```

## Catálogo de skills wired (TS modules)

| Skill ID                    | Categoría          | Módulo               | Métricas que mueve           |
| --------------------------- | ------------------ | -------------------- | ---------------------------- |
| feedIA-quick-carousel       | content-generation | quickCarousel        | engagement, reach, growth    |
| feedIA-reel-studio          | content-generation | quickReel            | reach, engagement            |
| feedIA-quick-story          | content-generation | quickStory           | engagement, alignment        |
| feedIA-buyer-persona        | audience-analysis  | buyerPersona         | audience_alignment           |
| feedIA-hashtag-science      | optimization       | hashtagScientist     | hashtag_effectiveness, reach |
| feedIA-bio-optimizer        | optimization       | bioOptimizer         | alignment, conversion        |
| feedIA-humanizer            | optimization       | humanizer            | caption_performance          |
| feedIA-faq                  | engagement         | faqAgent             | engagement                   |
| feedIA-competitor-profiling | audience-analysis  | competitorAdaptation | reach                        |
| feedIA-calendar             | strategy           | editorialCalendar    | frequency, coherence         |
| feedIA-meta-ads             | monetization       | metaAds              | reach, conversion            |

## Trigger conditions

```ts
// 1. metric-low: métrica debajo de threshold
{ type: 'metric-low', metric: 'engagement_rate', threshold: 0.3 }

// 2. bottleneck: aparece en evaluation.bottlenecks
{ type: 'bottleneck', metric: 'reach_rate' }

// 3. event: contexto detectado
{ type: 'event', event: 'trend-opportunity' | 'crisis-trigger' | 'pre-publish' }

// 4. time: cadencia
{ type: 'time', event: 'monthly' | 'weekly' | 'daily' }

// 5. manual: solo por API explícita
{ type: 'manual' }
```

## Selección inteligente

Para cada bottleneck del feedback loop, el integrator pregunta:

- ¿Hay skills que muevan esta métrica? → `findSkillsForMetric()`
- ¿Hay skills que mappean a la acción RL recomendada? → `findSkillsForAction()`
- ¿Hay eventos contextuales? → `findSkillsByTrigger('event')`

Output: array ordenado por prioridad (critical → high → medium → low).

## Endpoints

```
GET  /api/skills/registry              → todas las skills + metadata
GET  /api/skills/by-category?category=X
GET  /api/skills/by-metric?metric=X
POST /api/skills/plan { state, evaluation, action } → IntegrationPlan
POST /api/skills/execute { plan, dryRun?, maxCost? } → SkillExecutionResult[]
```

## Config en autonomyCore

```ts
{
  enableSkillIntegration: true,   // default ON
  skillDryRun: false,              // si true, plan sin ejecutar
  maxSkillCostUsd: 2.0,            // cap por ciclo
}
```

## Skip skill integration

El integrator NO ejecuta si:

- `humanReviewRequired` es true (espera intervención humana)
- Plan vacío (no hay skills aplicables)
- `dryRun` activo (solo planifica)
- Cost cap excedido durante ejecución (skip restantes)

## Mejoras vs versión anterior

- Cerebro tenía acción RL pero no ejecutaba skill concreta
- Ahora: mapeo automático action → skill → invocación
- Cost cap por ciclo (no runaway)
- Paralelización segura (max 3 concurrent)
- Dispatch dinámico (import por modulePath)
- Tracking por skill (success rate, duration, cost)
- Total integrado al AutonomousCycleResult

## Próximos pasos

1. Loop de feedback: outputs de skills → memoria episódica → consolidación semántica
2. Reward tuning basado en skill success rates
3. Auto-discovery de skills nuevas (escanea `.claude/commands/`)
4. Voting ensemble para selección de skills (cuando hay solapamiento)

## 🧠 Cerebro FeedIA — hereda `/feedIA-brain`

Rol: **integrador técnico cerebro↔skills por métrica/evento**. Algoritmo: agnóstico de feed; sirve a la estrategia global del cerebro FeedIA. Salida lista para usar, voz de marca, sin tells de IA, máxima elocuencia, mínimo esfuerzo del usuario.
