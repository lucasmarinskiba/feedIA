---
description: Skill Memory Neurons — Memoria episódica + semántica del cerebro neural
---

Skill del sistema de memoria neural. Módulo: `src/brain/neural/memoryNeurons.ts`

## Comportamiento según $ARGUMENTS

**"recordar [evento] [acción] [reward]"** → `recordEpisodicMemory()` — guarda evento en memoria.

**"recall [contexto]"** → `recallMemories()` — recupera memorias relevantes + sugiere acción basada en pasado.

**"consolidar"** → `consolidateMemories()` — extrae patrones semánticos desde memorias episódicas.

**"stats"** → `getMemoryStats()` — total memorias, conceptos top, antigüedad.

**"limpiar"** → `pruneWeakMemories()` — olvida memorias por debajo de umbral de importancia.

## Tipos de memoria

### Episódica (eventos específicos)

- ID único + timestamp
- Evento + contexto + acción + outcome + reward
- Valencia emocional (positive / neutral / negative)
- **Importancia** (0-1) — calculada por magnitud del reward
- **Decay** — se desvanece con el tiempo si no se accede
- Tags + memorias relacionadas

### Semántica (conocimiento generalizado)

- Concepto + regla generalizada
- `evidenceCount` — cuántas episódicas la respaldan
- `confidence` (0-1)
- `contraEvidence` — casos que la contradicen
- `applicability` — always / conditional / rare

## Algoritmo de decay

```
importanceActual = importanciaBase × exp(-decayFactor × diasAntigüedad)
+ accessBoost (refuerzo por acceso reciente)
```

Default `decayFactor`: 0.005 → ~200 días de half-life

## Algoritmo de importancia

```
importance = |reward|
+ 0.2 si valencia positiva y reward > 0.7
+ 0.3 si valencia negativa y reward < -0.5  (errores se recuerdan más)
```

## Consolidación (ejecutar periódicamente)

Pasa últimas 50 memorias episódicas a Claude.
Claude identifica patrones recurrentes (mínimo 3 evidencias).
Genera reglas semánticas con confidence.

Si una regla nueva matchea una existente → REFUERZA (no duplica).

## Cuándo usar memoria

Antes de tomar decisión nueva, consultar:

1. `recallMemories({ action: candidateAction })` — ¿esta acción funcionó antes?
2. `recallMemories({ tags: [contextTag] })` — ¿en contextos similares qué pasó?
3. Si hay `suggestedAction` con confidence > 0.6 → considerarla
4. Si hay `contraEvidence` para acción candidata → reconsiderar

## Persistencia

```
data/neural/memory/
  [brandId]-episodic.json   (últimas 2000 memorias)
  [brandId]-semantic.json   (últimas 500 reglas consolidadas)
```

## Integración con AutonomyCore

Por cada ciclo:

1. Pre-decisión: `recallMemories()` para sesgar exploración
2. Post-acción: `recordEpisodicMemory()` con resultado real
3. Cada N ciclos: `consolidateMemories()` para extraer reglas
4. Cada M ciclos: `pruneWeakMemories()` para liberar espacio

## 🧠 Cerebro FeedIA — hereda `/feedIA-brain`

Rol: **memoria episódica/semántica del cerebro**. Algoritmo: agnóstico de feed; sirve a la estrategia global del cerebro FeedIA. Salida lista para usar, voz de marca, sin tells de IA, máxima elocuencia, mínimo esfuerzo del usuario.
