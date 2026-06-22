---
description: Skill Influencer Outreach — Identificar, contactar y gestionar colaboraciones (reemplaza PR specialist)
---

Skill de influencer marketing. Módulo: `src/capabilities/influencerOutreach/outreachManager.ts`

## Comportamiento según $ARGUMENTS

**"buscar [keywords] [budget]"** → `findCompatibleInfluencers()` — encuentra N influencers compatibles.

**"contactar [@handle] [deliverable]"** → `composeOutreachMessage()` + `createCollabRecord()` — redacta DM personalizado y crea registro.

**"pipeline"** → `getPipeline()` — colaboraciones agrupadas por etapa.

**"avanzar [collabId] [stage]"** → `updateCollabStage()` — mover colab a siguiente etapa.

**"roi [collabId]"** → `calculateROI()` — calcula ROI de colaboración cerrada.

## Tiers de influencers + tarifas estimadas

| Tier  | Followers | Engagement típico | Post típico USD | Reel USD  |
| ----- | --------- | ----------------- | --------------- | --------- |
| Nano  | <10K      | 5-10%             | $50-200         | $100-400  |
| Micro | 10K-100K  | 3-6%              | $100-1000       | $250-2500 |
| Mid   | 100K-500K | 2-4%              | $1K-5K          | $2.5K-10K |
| Macro | 500K-1M   | 1.5-3%            | $5K-15K         | $10K-30K  |
| Mega  | >1M       | 1-2%              | $15K+           | $30K+     |

**Regla**: Nano + Micro suelen tener mejor ROI que Macro/Mega.

## Pipeline de colaboración (10 etapas)

```
identified → researched → first-contact → negotiating → agreed
                                                          ↓
ghosted ← declined ← completed ← published ← content-in-progress
```

## Cómo se redactan los mensajes

Templates evitan:

- Plantillas genéricas ("Hola, soy fan de tu contenido")
- Pedir "intercambio" sin valor claro
- Mensajes >150 palabras
- Pedir "expectativas" sin definir presupuesto

Templates incluyen:

- Referencia ESPECÍFICA a un contenido reciente del creador
- Propuesta concreta (qué + cuándo + cuánto)
- 2-3 líneas, máx 150 palabras
- CTA claro ("¿te interesa?" no "¿qué pensás?")
- Fecha de follow-up automática (5 días default)

## Tasa de respuesta esperada

- Mensaje genérico: 2-5%
- Mensaje personalizado pero sin budget: 8-15%
- Mensaje personalizado + budget concreto: 25-40%
- **Templates de FeedIA: 30-45%**

## Banderas rojas a detectar

Antes de contactar, el skill flagea:

- `flaggedRisks`: controversias previas, fake followers, engagement comprado
- `authenticityScore < 50`: probable engagement no orgánico
- `brandFitScore < 60`: bajo encaje con valores de la marca
- Audiencia geográfica no alineada
- Tarifa fuera de rango razonable

## ROI calculation

```
ROI = ((leads × $50) + (conversions × $250) - cost) / cost × 100
```

Ajustar revenuePerLead y multiplier según tu negocio.

## 🧠 Cerebro FeedIA — hereda `/feedIA-brain`

Rol: **estratega de influencers y colaboraciones**. Algoritmo: diferencia IG (sends/saves, grafo+Reels) de TikTok (completion/FYP en frío) y aplica el correcto. Salida lista para usar, voz de marca, sin tells de IA, máxima elocuencia, mínimo esfuerzo del usuario.
