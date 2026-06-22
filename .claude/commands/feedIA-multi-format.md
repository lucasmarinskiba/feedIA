---
description: Skill Multi-Format Adapter — 1 contenido → N formatos en paralelo (repurposing automático)
---

Skill de repurposing masivo. Módulo: `src/capabilities/multiFormatAdapter/formatAdapter.ts`

## Comportamiento según $ARGUMENTS

**"todos [tema]"** → Adapta a TODOS los formatos de Instagram en paralelo.

**"adapt [formato] [contenido]"** → Adapta a 1 formato específico.

**"cross [tema]"** → `adaptCrossPlatform()` — adapta a YouTube Shorts + TikTok + Twitter + LinkedIn + Newsletter.

**"repurpose [reel_id]"** → Toma un Reel existente y lo convierte en 6 formatos distintos.

## Formatos disponibles

### Instagram

- `carousel` — 7-10 slides con design notes
- `reel` — 30s con timing por escena
- `story-series` — 5 stories interactivas (polls, quiz, questions)
- `static-post` — caption AIDA + imageDirection
- `highlight` — para guardar permanente
- `dm-script` — 3 variantes (cold/warm/hot)

### Cross-platform

- `youtube-short` — 60s con title optimizado
- `tiktok` — con sugerencia de trending sound
- `twitter-thread` — 6-10 tweets de <280 chars
- `linkedin-post` — formato profesional 300-500 palabras
- `newsletter` — sección para email

## Tiempo ahorrado estimado

Cada formato manual = ~1.5h de trabajo

- Adaptar a 6 formatos manual = 9h
- Con FeedIA = <5min
- **Ahorro: ~8.5h por contenido**

## Uso recomendado

1. Crear UN contenido "tier 1" (Reel largo, blog post, transcript de podcast)
2. Pasarlo al adapter con TODOS los formatos
3. Programar publicación distribuida en 1-2 semanas
4. Track performance por formato (qué versión convirtió mejor)
5. Doblar apuesta al formato ganador

## Ejemplo de flujo

```
Input: "Transcript de podcast de 45 min sobre productividad"
↓
Multi-Format Adapter
↓
Outputs:
- 1 carrusel de 10 slides (resumen visual)
- 1 reel de 30s (hook + 3 puntos clave)
- 5 stories interactivas (1 por punto)
- 1 post estático (quote del podcast)
- 1 thread de Twitter (12 tweets)
- 1 post LinkedIn (versión profesional)
- 1 newsletter (con audio + transcript)
```

## 🧠 Cerebro FeedIA — hereda `/feedIA-brain`

Rol: **reempaquetador multi-formato de una idea**. Algoritmo: diferencia IG (sends/saves, grafo+Reels) de TikTok (completion/FYP en frío) y aplica el correcto. Salida lista para usar, voz de marca, sin tells de IA, máxima elocuencia, mínimo esfuerzo del usuario.
