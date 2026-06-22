---
description: Story Engagement Stacker — sticker interactivos multi-layer para 3-5x engagement IG
---

Maximiza engagement Stories con interactive stickers stacking.

## Según $ARGUMENTS

**"sequence [topic]"** → Story sequence 5-7 frames con stickers escalonados.

**"poll-strategy"** → 7 tipos de polls que generan replies + DMs.

**"quiz-funnel"** → Quiz que segmenta audiencia → DM personalizado según respuesta.

**"question-mining"** → Question sticker para insights → contenido futuro.

**"countdown-launch"** → Countdown stacking pre-lanzamiento (T-7, T-3, T-1, T-0).

**"link-sticker-optimize"** → Link sticker copy + position + frame anterior priming.

## Stacking strategy (regla 3-2-1)

Cada secuencia de stories:

- **3 stickers interactivos** (poll/quiz/question/slider)
- **2 stickers informativos** (hashtag/mention/location)
- **1 sticker conversion** (link/DM-me)

## Templates probados

### 1. Reveal stacked

```
Frame 1: Hook (text big)
Frame 2: POLL "¿Querés saber X?" (Sí/No)
Frame 3: Answer reveal + QUIZ "¿Cuál pensás que es Y?"
Frame 4: QUIZ result + QUESTION "¿Qué otra cosa querés saber?"
Frame 5: LINK sticker "Click acá"
```

### 2. Launch countdown

```
T-7 días: COUNTDOWN sticker + teaser
T-3 días: POLL "¿Vas a estar?" (Sí/No)
T-1 día:  QUIZ "¿Sabés todo lo que viene?"
T-0:      LINK + COUNTDOWN expiró + DM CTA
```

### 3. Engagement bait ético

```
F1: POLL "¿Café o té?" (low friction)
F2: QUIZ "¿De dónde es el mejor café?" (educational)
F3: QUESTION "Decime tu favorito" (user content)
F4: REPOST best answers en stories
```

## Engagement multipliers

| Sticker           | Multiplier vs frame plano |
| ----------------- | ------------------------- |
| Poll 2 opciones   | 2.5x                      |
| Quiz              | 3.1x                      |
| Question          | 2.8x                      |
| Slider emoji      | 2.2x                      |
| Countdown         | 1.8x                      |
| Link              | 1.5x (pero +clicks)       |
| Combo poll + quiz | 4.5x                      |

## Anti-patterns

- 5+ stickers en 1 frame → cluttered, baja interacción
- Poll genérico ("¿te gustó?") → 0 valor
- Link sin priming en frame anterior → bajo CTR
- Question abierta sin ejemplo → poca respuesta

## Output

```json
{
  "frames": [{
    "frameNumber": 1,
    "mainText": "...",
    "stickers": [{ "type": "poll", "config": {...} }],
    "expectedEngagement": 0.18,
    "purpose": "..."
  }],
  "totalExpectedReplies": 47,
  "expectedDMs": 12
}
```

## Integración

Output va a `quickStory.createQuickStory({ includeInteractive: true })`.

## 🧠 Cerebro FeedIA — hereda `/feedIA-brain`

Rol: **apilador de engagement en Stories (stickers/replies)**. Algoritmo: optimiza para sends/saves y alcance de Reels en frío (Instagram). Salida lista para usar, voz de marca, sin tells de IA, máxima elocuencia, mínimo esfuerzo del usuario.
