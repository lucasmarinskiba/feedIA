---
description: Brain-Aware Computer Use — CU consulta y alimenta cerebro neural (memory + safety + RL)
---

CU integrado al cerebro. Módulo: `src/capabilities/computerUse/brainAwareCu.ts`.

## Antes (CU aislado)

```
caller → runAnthropicComputerUse(instruction, emit) → events
```

CU recibía instrucción string. Sin contexto previo. Outcomes no llegaban a memoria. RL nunca aprendía de sesiones CU. Safety solo aplicaba a actions post-hoc.

## Ahora (CU brain-aware)

```
caller → runBrainAwareCu(brand, input)
         │
         ├── 1. checkActionSafety(brandId, rlAction) — circuit breakers + rate limits
         │       └── si falla y abortOnSafetyFail → SKIP, NO ejecuta
         │
         ├── 2. recallMemories({ brandId, action, minImportance: 0.2 })
         │       └── extrae positive/negative lessons + semantic rules
         │
         ├── 3. enriquece instruction con [CONTEXTO NEURAL]
         │       "Lo que funcionó antes: ✓..."
         │       "Lo que NO funcionó: ✗..."
         │       "Reglas aprendidas: 📖..."
         │
         ├── 4. runAnthropicComputerUse(enrichedInstruction)
         │       └── usa cuOptimizer + cuWatchdog (compression, cache, retry, cancel)
         │
         ├── 5. calculateReward(events) → outcome + reward
         │
         ├── 6. recordEpisodicMemory(brand, { event, action, outcome, reward })
         │       └── alimenta memory → future sessions usan este aprendizaje
         │
         ├── 7. recordSuccess/recordFailure(brandId, 'content-publishing')
         │       └── actualiza circuit breakers + safety state
         │
         └── 8. createNotification(owner, outcome) — opcional
```

## Beneficios

| Antes                        | Ahora                                           |
| ---------------------------- | ----------------------------------------------- |
| CU empieza ciego cada sesión | CU lee qué funcionó en sesiones similares       |
| Errores se repiten           | Errores van a memoria → próxima sesión evita    |
| Safety post-hoc              | Safety pre-check aborta antes de gastar tokens  |
| RL no aprende de CU          | Cada CU session genera episodic memory + reward |
| No notificación de outcomes  | User notificado success/failure/partial         |
| Sesiones aisladas            | Cerebro consolida patrones (memory semántica)   |

## Según $ARGUMENTS

**"run [instruction]"** → `runBrainAwareCu(brand, { instruction })`.

**"summary [sessionId]"** → Telemetry de sesión: outcome, reward, actions, errors, memory hits.

**"recall [rlAction]"** → Memorias de sesiones CU pasadas para esta acción.

**"register-as-skill"** → Confirma que CU está en skillRegistry con id `feedIA-cu-brain-aware`.

## Endpoints

```
POST /api/cu/brain-aware/run
  { instruction, baseUrl?, rlAction?, tags?, notifyUser?, abortOnSafetyFail? }
  → { result, summary }

POST /api/cu/brain-aware/summary/:sessionId
  → { summary, screenshots }
```

## Integration con autonomyCore

CU ahora es skill ejecutable. autonomyCore puede invocarlo via integrator:

```ts
// En autonomyCore step #12
const plan = buildIntegrationPlan(brand, state, evaluation, action, cycleId);
// Si action = 'post-carousel-educational' y bottleneck reach_rate:
//   plan incluye feedIA-cu-brain-aware con
//   { instruction: 'Operar IG para...', rlAction: 'post-carousel-educational' }
const results = await executeIntegrationPlan(plan, brand);
```

## Reward calculation

```
sessionEnd.completed = false        → -0.3 a -0.5  (failure)
sessionEnd.ok = 0                   → -0.2
actionRatio < 0.5                   → 0.1 - errorPenalty (partial)
actionRatio < 0.9                   → 0.5 - errorPenalty (partial)
actionRatio >= 0.9                  → 1.0 - errorPenalty (success)

errorPenalty = min(0.5, errors × 0.1)
```

## Outcome → memory

Cada outcome se registra como `EpisodicMemory`:

- `event`: "CU session: {instruction}"
- `action`: el rlAction asociado
- `outcome`: success / partial / failure / skipped / aborted
- `reward`: -1 a 1
- `emotionalValence`: positive / neutral / negative (auto desde reward)
- `importance`: |reward| + bonus si extremo
- `tags`: ['computer-use', outcome, ...input.tags]
- `decayFactor`: 0.005 (~200 días half-life)

Después de N sesiones → `consolidateMemories()` extrae reglas semánticas:

- "Carruseles educativos los martes producen reward >0.7"
- "Operaciones DM después de 22h producen failures"

Esas reglas se inyectan en próximas instructions automáticamente.

## Cuándo abortar antes de ejecutar

`abortOnSafetyFail: true` (default) → si safety falla:

- Circuit breaker open
- Rate limit alcanzado
- Acción requiere aprobación humana (modo supervised pendiente)

Devuelve `outcome: 'skipped'` con reason. No gasta tokens Anthropic ni Playwright.

## Telemetry por sesión

```json
{
  "outcome": "success",
  "reward": 0.85,
  "durationSec": 87,
  "actionsExecuted": 12,
  "screenshotsCaptured": 14,
  "errorsEncountered": 1,
  "memoryHits": 4 // ← cuántas memorias pasadas se consultaron
}
```

## Flujo end-to-end con cerebro

```
[autonomyCore.runAutonomousCycle]
   ↓
[1-11: Input, Feedback, RL, Safety, Forward Pass, Decisión...]
   ↓
[12: SkillIntegration]
   ├── buildIntegrationPlan → plan incluye feedIA-cu-brain-aware
   └── executeIntegrationPlan
        └── dispatchSkill('feedIA-cu-brain-aware', brand)
             └── runBrainAwareCu(brand, { instruction, rlAction })
                  ├── recall memory
                  ├── enrich instruction
                  ├── run CU (con watchdog/optimizer)
                  ├── record memory (alimenta próximos ciclos)
                  └── notify user
```

CU ahora es **parte del cerebro**, no herramienta externa.

## 🧠 Cerebro FeedIA — hereda `/feedIA-brain`

Rol: **cerebro de Computer Use (planifica y opera apps)**. Algoritmo: agnóstico de feed; sirve a la estrategia global del cerebro FeedIA. Salida lista para usar, voz de marca, sin tells de IA, máxima elocuencia, mínimo esfuerzo del usuario.
