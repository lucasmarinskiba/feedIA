---
description: Skill Attention Mechanism — Multi-head attention sobre features
---

Skill attention. Módulo: `src/brain/neural/attentionMechanism.ts`

## Comportamiento según $ARGUMENTS

**"focus [features]"** → `runMultiHeadAttention()` — qué features la red "mira" más.

**"top [N]"** → `getTopAttendedFeatures()` — top N features con mayor peso de atención.

**"stack [N capas]"** → `stackAttentionLayers()` — múltiples capas de atención en cascada.

**"anomalías"** → `detectAnomalousFeatures()` — features con atención fuera de rango normal (z-score >2).

## Cómo funciona

Implementa scaled dot-product attention:

```
Attention(Q, K, V) = softmax(QK^T / sqrt(d_k)) × V
```

Multi-head (default 4):

- Cada head usa proyección distinta (Q, K, V matrices)
- Captura distintos aspectos del input
- Outputs agregados (mean across heads)

## Output

- `aggregatedOutput` — vector post-atención
- `focusedFeatures` — ranking de features por peso de atención
- `heads[]` — desglose por head con sus pesos individuales

## Casos de uso en FeedIA

1. **Decidir qué métrica está dominando** la salud de la cuenta
2. **Identificar feature anómalo** que está fuera de patrón normal
3. **Capas en cascada** para análisis jerárquico (feature → patrón → estrategia)
4. **Explainability** — por qué la red prefiere acción X (qué features pesaron más)

## Ejemplo

Input: 8 features (engagement, growth, reach, coherence, frequency, peak_hours, demo_alignment, trend_alignment)

Output puede revelar que esta semana la atención se concentra en:

1. trend_alignment (0.42) — la red detecta oportunidad de newsjacking
2. engagement (0.28) — segundo factor más crítico
3. peak_hours (0.15) — relevante pero no dominante

## 🧠 Cerebro FeedIA — hereda `/feedIA-brain`

Rol: **arquitecto de atención y retención (hook → dwell → loop)**. Algoritmo: diferencia IG (sends/saves, grafo+Reels) de TikTok (completion/FYP en frío) y aplica el correcto. Salida lista para usar, voz de marca, sin tells de IA, máxima elocuencia, mínimo esfuerzo del usuario.
