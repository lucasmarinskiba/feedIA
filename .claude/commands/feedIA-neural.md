---
description: Skill del Cerebro Neural — Ciclos autónomos, pesos, RL, MLOps y safety
---

Skill de acceso al cerebro neural autónomo de FeedIA.
Módulos: `src/brain/neural/` (todos)

## Comportamiento según $ARGUMENTS

**"ciclo"** → Ejecuta `POST /api/neural/cycle` con métricas actuales. Devuelve: acción recomendada + justificación + score.

**"status"** → `GET /api/neural/status` — estado completo del cerebro (último ciclo, recompensa promedio, pesos).

**"último"** → `GET /api/neural/last-cycle` — muestra el último ciclo ejecutado sin correr uno nuevo.

**"historial"** → `GET /api/neural/history` — últimos 20 ciclos con evolución de pesos.

**"pesos"** → `GET /api/neural/weights` — pesos actuales de la red (feedbackWeight, reinforcementWeight, safetyWeight...).

**"reset pesos"** → `POST /api/neural/weights/reset` — restaura pesos a valores por defecto.

**"feedback"** → `GET /api/neural/feedback/latest` — última evaluación de feedback loop (10 métricas ponderadas).

**"safety"** → `GET /api/neural/safety/status` — circuit breakers, rate limits, excepciones.

**"retrain"** → `POST /api/neural/mlops/retrain` — fuerza reentrenamiento de la política RL.

**"refinar rl"** → `POST /api/neural/rl/refine` — Claude analiza episodios recientes y recomienda ajustes.

## Arquitectura del cerebro (referencia rápida)

```
INPUT LAYER       neuralKnowledgeBase.ts  → estado normalizado del mundo
HIDDEN L1         feedbackLoop.ts         → evaluación de 10 métricas (score 0-100)
HIDDEN L2         reinforcementEngine.ts  → Q-learning epsilon-greedy (Bellman)
HIDDEN L3         mlopsOrchestrator.ts    → ingest → retrain → deploy
SAFETY GATE       safetyController.ts     → circuit breakers + contingencias
OUTPUT LAYER      autonomyCore.ts         → decisión + backpropagación
```

## Interpretación de métricas clave

| Score global | Estado       | Acción                           |
| ------------ | ------------ | -------------------------------- |
| 75-100       | 🟢 Excelente | Mantener + escalar exitoso       |
| 50-74        | 🟡 Bueno     | Optimizar cuellos de botella     |
| 25-49        | 🟠 Alerta    | Correcciones autónomas activadas |
| 0-24         | 🔴 Crítico   | Escalada a humano requerida      |

## Reward function (referencia)

```
reward = engagement×0.35 + reach×0.20 + conversion×0.15 + brandCoherence×0.15 + safety×0.10 + novelty×0.05
```

## 🧠 Cerebro FeedIA — hereda `/feedIA-brain`

Rol: **capa neural de decisión del cerebro autónomo**. Algoritmo: agnóstico de feed; sirve a la estrategia global del cerebro FeedIA. Salida lista para usar, voz de marca, sin tells de IA, máxima elocuencia, mínimo esfuerzo del usuario.
