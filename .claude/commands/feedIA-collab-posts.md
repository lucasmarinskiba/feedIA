---
description: Collab Posts — IG Collaborator feature para 2x alcance + dual-feed
---

Collab Posts (IG Collaborator) = 1 post aparece en 2 cuentas, sumando audiences. Alcance promedio 2-3x.

## Según $ARGUMENTS

**"find-collabs [nicho]"** → Identifica 10 cuentas para colab. API: integra `influencerOutreach.findCompatibleInfluencers`.

**"propose [@handle]"** → Outreach DM proponiendo colab. API: `composeOutreachMessage`.

**"types"** → 6 tipos de collab posts y cuándo usar cada uno.

**"split-content"** → Cómo dividir contenido para que aporte valor a ambas audiencias.

**"track [post-id]"** → Métricas dual-feed: reach por cuenta, engagement split, conversions.

**"playbook"** → Workflow completo proponer → ejecutar → trackear.

## 6 tipos de Collab Posts ganadores

### 1. Carrusel dual-perspective

Cuenta A escribe slides 1-5 (su perspectiva), Cuenta B slides 6-10 (su perspectiva). Tema compartido.

### 2. Reel duet

Reel grabado por ambos con cortes alternados. Pregunta-respuesta o transformación.

### 3. Joint announcement

Lanzamiento conjunto (producto, evento, podcast). 1 post + 2 audiences notificadas.

### 4. Case study collab

Cuenta A presenta el problema/data, Cuenta B la solución.

### 5. Behind-the-scenes meeting

Foto/video reunión real → genera curiosidad → "¿qué planean?"

### 6. Giveaway collab

Sorteo conjunto. Genera follows masivos a ambas cuentas (regla 1: "seguir a @A y @B").

## Cómo elegir collab partner

✅ **Audience overlap 20-40%** — sweet spot (algunos comunes + muchos nuevos)
❌ Overlap >70% — no agregás audiencia nueva
❌ Overlap <10% — audiences muy distintas, conversion baja

✅ **Engagement rate similar** (±30%)
✅ **Nicho complementario** (no competencia directa)
✅ **Tamaño similar o uno 2-3x más grande** (no 10x diferencia)

## Outreach script (DM)

```
Hola @[handle], te sigo hace tiempo y me encanta lo que hacés con [específico, no genérico].

Tengo una idea de Collab Post que creo que funcionaría:
[tema] — vos aportás [perspectiva], yo aporto [otra perspectiva].

Te lleva 30 min máximo. ¿Te suma?
```

Tasa de respuesta promedio: 35-45% (si DM personalizado).

## Métricas a trackear

| Métrica               | Solo tu post | Collab Post |
| --------------------- | ------------ | ----------- |
| Reach total           | 100%         | 250-300%    |
| New followers/account | 1x           | 1.5-2x      |
| Saves                 | 1x           | 1.3x        |
| Profile visits        | 1x           | 2.2x        |
| DMs generated         | 1x           | 1.8x        |

## Anti-patterns

- ❌ Collab con cuenta de nicho totalmente distinto → audience irrelevante
- ❌ 1 sola colab al mes → no construye relación
- ❌ Solo proponer, nunca aceptar invitaciones
- ❌ No compartir métricas con el partner post-collab

## Integración

`POST /api/me/collab/propose { handle, contentIdea, format }` → genera DM + tracking.
Conecta con `influencerOutreach.ts` para pipeline de colabs.

## 🧠 Cerebro FeedIA — hereda `/feedIA-brain`

Rol: **estratega de collab posts y alcance cruzado**. Algoritmo: optimiza para sends/saves y alcance de Reels en frío (Instagram). Salida lista para usar, voz de marca, sin tells de IA, máxima elocuencia, mínimo esfuerzo del usuario.
