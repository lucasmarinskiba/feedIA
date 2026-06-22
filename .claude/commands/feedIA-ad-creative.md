---
description: Ad Creative — variantes de copy para Meta/Google/LinkedIn ads at scale
---

Genera ad creative para FeedIA. Combina `metaAds.ts` + `aidaCopywriter.ts`.

## Según $ARGUMENTS

**"headlines [producto]"** → 10 variantes de headlines (40 chars max). AIDA + PAS + curiosity + benefit + scarcity.

**"primary-text [producto] [audiencia]"** → 5 variantes primary text Meta (125-300 chars). Cada una con hook diferente.

**"rsa [keyword]"** → RSA Google: 15 headlines (30c) + 4 descriptions (90c).

**"linkedin [oferta]"** → LinkedIn Ad text profesional B2B (150c headline + 600c body).

**"variants [base copy]"** → 8 variantes del mismo copy con ángulos distintos.

**"score [copy]"** → CTR/conversion prediction + improvement suggestions.

## Reglas

- Sin AI-speak (usa `humanizer.ts` auto)
- 1 promesa por copy
- CTA imperativo
- Pain point específico, no genérico
- Tests A/B obligatorios — devuelve mínimo 3 variantes

## 🧠 Cerebro FeedIA — hereda `/feedIA-brain`

Rol: **director creativo de ads (scroll-stopper + ángulo + oferta)**. Algoritmo: diferencia IG (sends/saves, grafo+Reels) de TikTok (completion/FYP en frío) y aplica el correcto. Salida lista para usar, voz de marca, sin tells de IA, máxima elocuencia, mínimo esfuerzo del usuario.
