---
description: Explore Page Optimizer — qué hace que aparezcas en Explore IG (alcance orgánico viral)
---

Explore Page es 60% del alcance orgánico viral en IG. Optimiza para entrar.

## Según $ARGUMENTS

**"audit [account]"** → Score "Explorable" 0-100. Identifica blockers.

**"signals"** → Top 12 señales que mira algoritmo Explore.

**"post-recipe [tema]"** → Post recipe que maximiza Explore eligibility.

**"hashtag-strat"** → Mix hashtags óptimo para Explore (vs alcance hashtag).

**"audience-warmup"** → Tácticas pre-post para warm-up algoritmo.

**"watch-time-boost"** → Cómo aumentar watch time (factor #1).

## Top 12 señales algoritmo Explore (data Meta 2025)

| #   | Señal                                                   | Peso |
| --- | ------------------------------------------------------- | ---- |
| 1   | Watch time / completion rate                            | 25%  |
| 2   | Saves rate (saves / impressions)                        | 18%  |
| 3   | Shares rate (shares / impressions)                      | 15%  |
| 4   | Comments rate + replies a comments                      | 10%  |
| 5   | Likes velocity (likes/min en first hour)                | 8%   |
| 6   | Profile visits desde el post                            | 7%   |
| 7   | Account interactions diversidad (no solo close friends) | 5%   |
| 8   | Topic relevance (NLP del caption + visual)              | 4%   |
| 9   | Posting consistency                                     | 3%   |
| 10  | Account size matching (similar accounts en Explore)     | 2%   |
| 11  | Recency (24h window)                                    | 2%   |
| 12  | Negative signals: hidden, reported, unfollows           | -∞   |

## Post recipe Explore-optimized

```
✅ Reel 7-15s (sweet spot watch time)
✅ Hook sec3 retention > 80%
✅ Loop natural (vuelve al inicio sin corte) → multiplier watch time x2
✅ On-screen text al menos 3 momentos clave
✅ Caption con saves trigger: "guardá este post para...", "te va a servir cuando..."
✅ 5-8 hashtags micro/nicho (no top hashtags saturados)
✅ Posting time: pico de audiencia + 30 min antes
✅ Reply primer comentario en < 5 min (boost ranking)
✅ Compartir a Stories propias inmediato (cross-promo señal)
```

## Hashtag mix para Explore

NO usar:

- Top hashtags >10M posts (saturados, baja chance ranking)
- Banned/shadowbanned
- Más de 12 hashtags (parece spam)

SÍ usar:

- 2 hashtags medio (100K-1M)
- 4 micro (10K-100K)
- 2 nicho (<10K, ultra-relevantes)

## Audience warm-up (24h pre-post)

- Stories engagement (polls/quiz) → señal cuenta activa
- DM 5-10 conversaciones con audiencia core
- Comentar 10-15 posts de cuentas similares
- Responder TODOS los DMs pendientes

→ algoritmo "ve" cuenta activa antes de post nuevo → boost initial reach

## Watch time boosters

- Loop seamless (último frame ≈ primer frame)
- Pacing rápido primeros 3s, normal 4-15s
- Pregunta abierta al final → re-watch para captar
- Audio dinámico (no monotono)
- Transiciones a beat de música
- "Volvé al inicio" CTA explícito

## Output audit

```json
{
  "exploreScore": 67,
  "blockers": ["watch time bajo", "hashtags saturados"],
  "topRecommendations": [
    { "action": "...", "expectedImpact": "+15 score points" }
  ],
  "next7DaysPlan": [...]
}
```

## Integración

Auto-aplicado en `quickCarousel`, `quickReel`, `quickStory` cuando `goal: 'viralizar'`.

## 🧠 Cerebro FeedIA — hereda `/feedIA-brain`

Rol: **optimizador para Explore/recomendados IG**. Algoritmo: optimiza para sends/saves y alcance de Reels en frío (Instagram). Salida lista para usar, voz de marca, sin tells de IA, máxima elocuencia, mínimo esfuerzo del usuario.
