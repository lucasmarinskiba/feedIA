---
description: Competitor Profiling — research deep desde URLs, dossier markdown
---

Competitor profiling para FeedIA. Wrapper de `competitorAdaptation.ts` + nuevo crawler.

## Según $ARGUMENTS

**"analyze [@handles]"** → 4-6 competidores + 5-8 insights. API: `POST /api/competitors/analyze`.

**"dossier [@handle]"** → Markdown profile: positioning, USP, weaknesses, content mix, posting cadence, voice.

**"strategies"** → Extrae winning strategies replicables. API: `POST /api/competitors/strategies`.

**"gaps"** → Genera ideas de contenido desde gaps detectados. API: `POST /api/competitors/content-from-gaps`.

**"compare [metrics]"** → Posición vs competidores: followers percentile, engagement percentile.

**"track"** → Cron: re-analiza competidores semanal, detecta cambios estratégicos.

## Estructura del dossier

```
1. HANDLE + estimated followers + engagement rate
2. CONTENT MIX (% carrusel/reel/story/post)
3. POSTING CADENCE (días + horas)
4. WINNING FORMULA (top 3 patrones que funcionan)
5. WEAKNESSES (gaps explotables)
6. VOICE (tono, frases característica)
7. VISUAL IDENTITY (paleta dominante, estilo)
8. CTAs USADAS (cuáles convierten)
9. INSIGHTS (gap-de-contenido / formato-no-explotado / angulo-unico)
10. RECOMMENDED ACTIONS para superar
```

## Output JSON

```json
{
  "report": CompetitorAnalysisReport,
  "comparison": { followersPercentile, engagementPercentile, position, areasToImprove },
  "actionableIdeas": ContentIdeaFromGap[]
}
```

## 🧠 Cerebro FeedIA — hereda `/feedIA-brain`

Rol: **analista competitivo y de referentes**. Algoritmo: diferencia IG (sends/saves, grafo+Reels) de TikTok (completion/FYP en frío) y aplica el correcto. Salida lista para usar, voz de marca, sin tells de IA, máxima elocuencia, mínimo esfuerzo del usuario.
