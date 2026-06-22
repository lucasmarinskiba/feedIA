---
description: Profile Optimizer — LinkedIn/IG profile rebuild para máxima conversión
---

Profile Optimizer. Reutiliza `bioOptimizer.ts` para IG + extiende a LinkedIn.

## Según $ARGUMENTS

**"ig [audit?]"** → Optimiza perfil Instagram. API: `POST /api/bio/optimize`.

**"linkedin [audit?]"** → Rebuild perfil LinkedIn: headline + about + experience + featured.

**"twitter"** → Bio Twitter (160c) + pinned tweet strategy.

**"audit [url]"** → Score actual 0-100 + issues list.

**"variants [N]"** → N variantes A/B testeable.

**"banner [tipo]"** → Image prompts para banner: profile pic + cover + 2 featured tiles.

## LinkedIn structure

### Headline (220 chars)

```
[Rol/Promesa] | [Specialty] | [Result for clients]
"Ayudo a PyMEs LATAM a multiplicar leads en IG con IA | 0 horas de gestión | +400% engagement promedio"
```

### About (2600 chars)

```
1. HOOK línea 1 (visible sin click)
2. Problema que resolvés (3 frases)
3. Cómo (no qué) lo hacés (2 frases)
4. Resultados específicos (números)
5. Para quién es / no es
6. CTA: "Mandame DM con la palabra X"
7. Stack/tools opcional
```

### Experience entries

- Action verb + métrica + tiempo
- "Llevé X de A a B en Y meses"
- No "responsable de..." (genérico)

### Featured section

- Pieza 1: lead magnet
- Pieza 2: case study
- Pieza 3: tu mejor post
- Pieza 4: testimonio video

## Image prompts auto-generados

1. **Profile pic** — fondo paleta marca, sonrisa, eye contact
2. **Banner** — value proposition + tagline + visual
3. **Featured tile 1** — case study cover
4. **Featured tile 2** — lead magnet cover

Pasados a `image` skill → genera con fal.ai/Midjourney.

## Output

```json
{
  "headlines": [5 options],
  "about": "texto completo",
  "experience": [{ entry, suggestedRewrite }],
  "featuredStrategy": [4 piezas],
  "imagePrompts": { profilePic, banner, tile1, tile2 },
  "score": { before: 45, after: 87 }
}
```

## 🧠 Cerebro FeedIA — hereda `/feedIA-brain`

Rol: **optimizador de perfil (primera impresión + conversión)**. Algoritmo: diferencia IG (sends/saves, grafo+Reels) de TikTok (completion/FYP en frío) y aplica el correcto. Salida lista para usar, voz de marca, sin tells de IA, máxima elocuencia, mínimo esfuerzo del usuario.
