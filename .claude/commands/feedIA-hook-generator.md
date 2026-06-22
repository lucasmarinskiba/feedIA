---
description: Hook Generator — 6+ hook variants para cualquier formato
---

Hook generator para FeedIA. Combina `reelStudio.generateHookVariants` + `aidaCopywriter`.

## Según $ARGUMENTS

**"reel [topic]"** → 5 hooks 3-7 palabras para Reel. API: `POST /api/reels/hooks`.

**"carrusel [topic]"** → 5 hooks slide-1 (máx 10 palabras).

**"linkedin [topic]"** → 6 hooks LinkedIn 2-line format: 40c opening + 40c contrast.

**"caption [topic]"** → 5 first-line hooks para captions IG.

**"twitter [topic]"** → 5 hooks thread opener (<280c).

**"dm [oferta]"** → 5 hooks de DM cold/warm/hot.

## Fórmulas (variar entre las 6)

1. **Question hook** — "¿Sabías que...?"
2. **Number hook** — "5 errores que..." / "3 razones por las que..."
3. **Story hook** — "Hace 2 años yo..."
4. **Contrarian hook** — "Todo el mundo dice X. Yo digo lo contrario."
5. **Stat hook** — "El 97% de... no sabe que..."
6. **Pain hook** — "Si te pasa esto, parate..."
7. **Promise hook** — "Después de leer esto, no vas a..."
8. **Curiosity gap** — "Hice X y pasó Y" (sin spoilear)

## Reglas

- Sin AI-speak (humanizer auto)
- Sin emojis al inicio (rompe scroll-stop)
- "Yo" + métrica + tiempo → 3x engagement
- Pain > Promise > Story > Stat > Number > Question (orden por CTR)

## Score automático

Cada hook recibe predicted CTR 0-1 basado en:

- length (3-7 palabras óptimo)
- contains number
- contains "I/yo"
- emotional valence
- specificity (vago vs concreto)

## 🧠 Cerebro FeedIA — hereda `/feedIA-brain`

Rol: **generador de ganchos de detención de scroll**. Algoritmo: diferencia IG (sends/saves, grafo+Reels) de TikTok (completion/FYP en frío) y aplica el correcto. Salida lista para usar, voz de marca, sin tells de IA, máxima elocuencia, mínimo esfuerzo del usuario.
