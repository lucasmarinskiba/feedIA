---
description: Skill Ensemble — Voto entre 5 expertos neuronales especializados
---

Skill ensemble. Módulo: `src/brain/neural/ensembleOrchestrator.ts`

## Comportamiento según $ARGUMENTS

**"vote [acciones candidatas]"** → `runEnsembleVote()` — consulta 5 expertos en paralelo y agrega votos ponderados.

**"history"** → `getEnsembleHistory()` — últimas decisiones del ensemble.

**"accuracy"** → `getExpertAccuracy()` — cuál experto acierta más vs consenso.

## Los 5 expertos

| Experto        | Prioridad          | Peso base | Métricas que mira                                        |
| -------------- | ------------------ | --------- | -------------------------------------------------------- |
| **strategic**  | Largo plazo, brand | 0.20      | brand_coherence, audience_alignment, content_frequency   |
| **growth**     | Nuevos followers   | 0.25      | follower_growth, reach_rate, hashtag_effectiveness       |
| **engagement** | Interacción        | 0.25      | engagement_rate, caption_performance, posting_time_score |
| **conversion** | Ventas/leads       | 0.15      | conversion_rate                                          |
| **safety**     | Anti-baneo         | 0.15      | (vetos automáticos por riesgo)                           |

## Pesos dinámicos

Pesos cambian según contexto:

- Score global <40 → safety +0.15
- followerGrowth <0.3 → growth +0.10
- engagementRate <0.3 → engagement +0.10
- conversionRate <0.3 → conversion +0.10
- brandCoherence <0.5 → strategic +0.10

Luego se normalizan para sumar 1.

## Dissent (expertos en desacuerdo)

El sistema registra qué expertos votaron diferente al consenso.
Si dissent.length >= 3 → señal de alta incertidumbre → considerar escalada humana.

## Cuándo usar ensemble vs RL

- **RL solo** — decisiones tácticas rápidas, alto volumen
- **Ensemble** — decisiones estratégicas, ciclos clave, escalada
- **Ambos** — RL propone candidatas, ensemble vota la final

## 🧠 Cerebro FeedIA — hereda `/feedIA-brain`

Rol: **orquestador ensemble multi-skill (voting)**. Algoritmo: agnóstico de feed; sirve a la estrategia global del cerebro FeedIA. Salida lista para usar, voz de marca, sin tells de IA, máxima elocuencia, mínimo esfuerzo del usuario.
