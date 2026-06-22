---
description: Backend evolution — 6 módulos: swarm agents, knowledge graph, automation, voice, hands-free, action log
---

6 módulos compactos, local-only, sin dependencias frágiles. Total brain modules: **47**.

## Los 6 nuevos

| Módulo                   | Archivo                  | Función                                                                             |
| ------------------------ | ------------------------ | ----------------------------------------------------------------------------------- |
| **Internal Agent Swarm** | `internalAgentSwarm.ts`  | 12 agentes IA internos especializados que reciben tasks, hacen bids y ejecutan      |
| **Knowledge Graph**      | `knowledgeGraph.ts`      | Nodes (brand, post, audience, competitor, trend...) + edges tipadas + queries grafo |
| **Automation Scheduler** | `automationScheduler.ts` | Cron + event-driven + one-shot jobs persistentes                                    |
| **Action Log**           | `actionLog.ts`           | Registro de cada acción con narración humana + voice script                         |
| **Voice Narrator**       | `voiceNarrator.ts`       | Convierte cualquier output en script TTS-optimizado con personas/tonos              |
| **Hands-Free Session**   | `handsFreeSession.ts`    | Sesión voz-only con wake-word + intent detection + narración progreso               |

## 1. Internal Agent Swarm — 12 agentes

| Rol               | Nombre | Bandwidth | Specialization                         |
| ----------------- | ------ | --------- | -------------------------------------- |
| strategist        | Nova   | 3         | Long-term planning + brand positioning |
| copywriter        | Lía    | 5         | Copy persuasivo + storytelling         |
| designer          | Gard   | 4         | Diseño visual + dirección de arte      |
| analyst           | Luca   | 3         | Data analysis + experiments            |
| community-manager | Mira   | 8         | Community engagement 24/7              |
| growth-hacker     | Ruvo   | 3         | Viral mechanics                        |
| media-buyer       | Kael   | 2         | Paid media                             |
| researcher        | Sayo   | 4         | Competitive intelligence               |
| editor            | Tova   | 3         | Video editing                          |
| producer          | Bren   | 6         | Workflow orchestration                 |
| crisis-handler    | Vael   | 2         | Crisis response                        |
| curator           | Tindra | 4         | Curation + monitoring                  |

```ts
submitTask(brandId, { type: 'write-copy', requiredSkills: ['hooks', 'aida'], priority: 'high', ... })
   ↓
Bidding (sin LLM): reputation × skillMatch × loadFactor
   ↓
Highest bidder asignado → task.assignedTo
   ↓
completeTask(brandId, taskId, { reward }) → update reputationScore
```

## 2. Knowledge Graph

10 NodeTypes × 14 EdgeTypes.

```ts
upsertNode(brandId, { id, type: 'post', label, attributes });
addEdge(brandId, { from, to, type: 'inspired-by', weight });

findNodes(brandId, { type: 'post', attributeKey: 'reward', attributeValue: 0.9 });
getNeighbors(brandId, nodeId, { direction: 'outgoing', edgeType: 'targets' });
traverseBFS(brandId, startNodeId, (maxDepth = 3));
computeNodeCentrality(brandId);
```

Permite queries como: "posts que comparten audience-segment con competitor X y tuvieron reward > 0.5".

## 3. Automation Scheduler

3 tipos de jobs: `cron`, `event`, `one-shot`.

```ts
createJob(brandId, {
  name: 'Daily metrics',
  kind: 'cron',
  action: 'analyze-metrics',
  schedule: { intervalMs: 24 * 60 * 60 * 1000 },
  enabled: true,
  maxConcurrent: 1,
});

tick(brandId, invokers); // llamar cada 60s
triggerEventJobs(brandId, 'trigger-fired', invokers);
```

Persistente. Sobrevive reinicios. `seedDefaultJobs(brandId)` instala 4 jobs base.

## 4. Action Log — narrativa humana

12 categorías × 5 niveles de importance.

```ts
recordAction({
  brandId,
  category: 'content-published',
  importance: 'high',
  technicalSummary: 'POST /api/me/carousel/full → status 200, pkg-1234',
  narrativeUser: 'Publiqué tu carrusel sobre "5 errores SEO" en Instagram.',
  module: 'quickCarousel',
  outcome: 'success',
})
   ↓
voiceScript auto-generado (sin markdown, URLs → "link", @ → "arroba", etc)
```

`composeDailyBriefing(brandId)` genera resumen 24h en texto + voz.

## 5. Voice Narrator — TTS-ready

5 personas: profesional-cercano / amigo-experto / asistente-discreto / entrenador-energico / analista-frio.

6 contexts: briefing / action-announcement / response / alert / celebration / warning.

```ts
composeVoiceScript(brandId, {
  text: '...',
  context: 'briefing',
  persona: 'amigo-experto',
  emotionalTone: 'positive',
  maxDurationSec: 60,
  includeSSML: true,
})
   ↓
{ voiceText, ssmlMarkup, estimatedDurationSec, ... }
```

Helpers especializados:

- `composeActionAnnouncement` (urgente, corto)
- `composeAlert` (severity-based tone)
- `composeCelebration` (energético)
- `composeResponseToUser` (al chatear)

Sanitización TTS: markdown removed, URLs → "link", `@user` → "arroba user", `#tag` → "numeral tag", `15%` → "15 por ciento", `$50` → "50 dólares", `IG` → "Instagram", `DM` → "mensaje directo".

## 6. Hands-Free Session — voice-only

Wake words: "che FeedIA", "hola FeedIA", "FeedIA", "oye FeedIA", "eh FeedIA".

9 intents detectados localmente con regex (sin LLM call):

- create-content / analyze / publish / check-status / cancel / help / navigate / small-talk / unknown

```ts
startSession({ brandId, userId, persona: 'amigo-experto' })
   ↓
[user habla] → audio → transcript
   ↓
detectWakeWord(transcript) → si match, activar
detectIntent(transcript) → { intent, confidence, extractedParams }
   ↓
[brain ejecuta]
   ↓
composeProgressNarration(action, step, totalSteps) → "Voy 60 por ciento. Generando slides."
   ↓
recordTurn(sessionId, { userTranscript, systemResponse, voiceScriptId, actionsTriggered })
```

`composeIntentConfirmation` devuelve respuesta de voz inmediata: "Voy a crear carrusel sobre X. Empiezo."

## Loop completo

```
[user dice] "che FeedIA, hacéme un carrusel sobre nutrición"
   ↓
detectWakeWord ✓ → sessionState = 'listening'
   ↓
detectIntent → { intent: 'create-content', topic: 'nutrición', format: 'carrusel' }
   ↓
composeIntentConfirmation → voiceNarrator → "Voy a crear carrusel sobre nutrición. Empiezo."
   ↓
[brain trabajando]
   ↓ cada 5s narra progreso:
composeProgressNarration → "Voy 30 por ciento. Diseñando slides."
   ↓
[carrusel listo]
   ↓
recordAction({ category: 'content-created', narrativeUser: '...', outcome: 'success' })
   ↓
composeResponseToUser → "Listo, tu carrusel sobre nutrición está hecho. ¿Lo publico?"
   ↓
recordTurn → sessionState = 'listening' (espera próxima orden)
```

## Files creados (~2050 LOC)

- `src/brain/neural/internalAgentSwarm.ts` (~270 LOC)
- `src/brain/neural/knowledgeGraph.ts` (~220 LOC)
- `src/brain/neural/automationScheduler.ts` (~270 LOC)
- `src/brain/neural/actionLog.ts` (~160 LOC)
- `src/brain/neural/voiceNarrator.ts` (~180 LOC)
- `src/brain/neural/handsFreeSession.ts` (~250 LOC)

## Brain modules total: **47**

12 capas neurales + 2 skill orchestration + 4 learning + 12 super-genius + 6 autonomy v2 + 5 autonomy v3 + 6 backend evolution (esta iteración).

## Wins

- 0 tokens cost (sin LLM calls)
- Deterministic — mismo input = mismo output
- Persistente — sobrevive reinicios
- Test-friendly — funciones puras
- Composable — cualquier módulo invoca cualquier otro
- TTS-ready — voiceScript listo para Eleven Labs / OpenAI TTS / Web Speech API

Lint: 0 errores en código nuevo. 5 pre-existentes ajenos (`RobotModeRouter.ts`, `scheduler/jobs.ts`).
